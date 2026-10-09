// UI: ressurslinjer, bunnmeny, Innsikter/Milepæler-panel, kontroller og Ragnarok-dialog.
// Leser tilstand via visningsmodellen i insights.js; endrer den kun via callbacks.
import { icon } from './icons.js';
import { RESOURCES } from '../data/gui.js';
import { PresentationCoordinator } from './presentation.js';
import { selectInsights, selectResources, selectDivine, currentEpoch, reachedMilestones, fmtAmount, fmtRate, selectRealm, realmVisible } from './insights.js';

const TITLES = { insights: 'Innsikter', milestones: 'Milepæler', realm: 'Rike' };
const EMPTY_TEXT = 'Ingen innsikter ennå. Rør ved treet eller steinen — verden svarer.';

export function createHud({ onBuy, onSpeed, onView, onZoom, onRagnarok }) {
  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'), res: $('resources'), divine: $('divine'), drawer: $('drawer'), title: $('drawer-title'), sub: $('drawer-sub'),
    tabs: $('drawer-tabs'), list: $('insight-list'), empty: $('insight-empty'), ms: $('milestone-list'), realm: $('realm-panel'),
    nav: $('nav'), hint: $('hint'), toasts: $('toasts'), controls: $('controls'), dialog: $('dialog'), summary: $('ragnarok-summary'),
  };
  const navBtn = (id) => els.nav.querySelector(`[data-nav="${id}"]`);
  const badge = navBtn('insights').querySelector('.badge');

  for (const el of document.querySelectorAll('#hud [data-icon]')) el.innerHTML = icon(el.dataset.icon);
  $('drawer-close').innerHTML = icon('close');

  let mode = null;          // null | 'insights' | 'milestones'
  let tab = 'all';
  let tabSig = '';
  let msSig = '';
  let realmSig = '';
  let lastState = null;
  let autoOpened = false;
  let dialogReturn = null;
  const seen = new Set();   // innsikter spilleren har sett i panelet (styrer «NY»)
  const cards = new Map();  // id → element
  const presentations = new PresentationCoordinator();

  // ---------- Panel ----------
  function markSeen() {
    for (const [id, el] of cards) if (!el.hidden) seen.add(id);
  }

  function setMode(next, { focus = true } = {}) {
    const prev = mode;
    mode = next;
    const open = mode != null;
    if (prev === 'insights' && mode !== 'insights') markSeen();
    els.drawer.classList.toggle('open', open);
    els.drawer.inert = !open;
    els.hud.classList.toggle('drawer-open', open);
    for (const id of ['insights', 'milestones', 'realm']) navBtn(id).setAttribute('aria-expanded', String(mode === id));
    if (open) {
      els.title.textContent = TITLES[mode];
      els.list.hidden = mode !== 'insights';
      els.tabs.hidden = true;
      els.empty.hidden = true;
      els.ms.hidden = mode !== 'milestones';
      els.realm.hidden = mode !== 'realm';
      if (lastState) render(lastState);
      if (focus) els.title.focus({ preventScroll: true });
    } else if (focus && prev) {
      navBtn(prev).focus({ preventScroll: true });
    }
  }

  els.nav.addEventListener('click', (e) => {
    const b = e.target.closest('.nav-btn');
    if (!b) return;
    const id = b.dataset.nav;
    if (id === 'ragnarok') onRagnarok('preview');
    else setMode(mode === id ? null : id);
  });
  $('drawer-close').addEventListener('click', () => setMode(null));

  els.tabs.addEventListener('click', (e) => {
    const b = e.target.closest('.tab');
    if (!b || b.dataset.tab === tab) return;
    tab = b.dataset.tab;
    tabSig = '';
    if (lastState) render(lastState);
  });

  els.list.addEventListener('click', (e) => {
    const b = e.target.closest('button.btn');
    if (!b || b.disabled) return;
    const id = b.closest('.card').dataset.id;
    const r = onBuy(id);
    if (r && r.ok) {
      present([{ type: 'selected', id, at: Date.now() }]);
    }
  });

  // ---------- Kort ----------
  function createCard(c) {
    const el = document.createElement('article');
    el.className = 'card enter';
    el.dataset.id = c.id;
    el.setAttribute('aria-labelledby', `card-${c.id}-t`);
    el.innerHTML = `<div class="card-icon">${icon(c.icon)}</div>
      <div class="card-main">
        <div class="card-head"><h3 id="card-${c.id}-t">${c.name}</h3><span class="chip-new" hidden>NY</span><span class="level" hidden></span></div>
        <p class="card-desc">${c.effect}</p>
        <p class="card-world"><span class="sr">I verden: </span>${c.world}</p>
      </div>
      <div class="card-foot"><ul class="cost" aria-label="Kostnad"></ul><button type="button" class="btn" aria-describedby="card-${c.id}-s"></button></div>
      <p class="status-line" id="card-${c.id}-s" hidden></p>
      <div class="meter" aria-hidden="true" hidden><i></i></div>`;
    el.addEventListener('animationend', () => el.classList.remove('enter'), { once: true });
    return el;
  }

  function updateCard(el, c) {
    for (const s of ['available', 'unaffordable', 'building', 'locked']) el.classList.toggle('is-' + s, c.status === s);
    el.querySelector('.chip-new').hidden = seen.has(c.id);
    const level = el.querySelector('.level');
    level.hidden = !c.level;
    if (c.level) level.textContent = `${c.level.count} av ${c.level.max}`;

    const costSig = c.status === 'building' ? '' : c.cost.map((k) => `${k.res}:${k.need}:${k.ok}:${k.missing}`).join('|');
    const costEl = el.querySelector('.cost');
    if (costEl.dataset.sig !== costSig) {
      costEl.dataset.sig = costSig;
      costEl.innerHTML = c.status === 'building' ? '' : c.cost.map((k) =>
        `<li class="${k.ok ? 'ok' : 'short'}">${icon(RESOURCES[k.res].icon)}<span>${k.need}</span><span class="sr"> ${RESOURCES[k.res].unit}${k.ok ? '' : `, mangler ${k.missing}`}</span></li>`).join('');
    }

    const btn = el.querySelector('.btn');
    const label = { available: c.verb, unaffordable: 'Mangler ressurser', locked: 'Ikke tilgjengelig', building: 'Bygges' }[c.status];
    if (btn.textContent !== label) btn.textContent = label;
    btn.disabled = c.status !== 'available';
    el.querySelector('.card-foot').hidden = c.status === 'building'; // kostnaden er betalt; fremdriften vises under
    btn.classList.toggle('btn-gold', c.status === 'available');

    const line = el.querySelector('.status-line');
    let text = '';
    if (c.status === 'unaffordable') text = c.missingText;
    else if (c.status === 'locked') text = c.requireText;
    else if (c.status === 'building') text = `Menneskene bygger · ${Math.round((c.buildProgress || 0) * 100)} %`;
    line.hidden = !text;
    if (line.textContent !== text) line.textContent = text;
    line.classList.toggle('building', c.status === 'building');

    const meter = el.querySelector('.meter');
    const value = c.status === 'building' ? c.buildProgress || 0 : c.status === 'unaffordable' ? c.progress : null;
    meter.hidden = value == null;
    if (value != null) meter.firstElementChild.style.width = `${Math.round(value * 100)}%`;
  }

  function renderTabs(model) {
    if (!model.showTabs) { tab = 'all'; els.tabs.hidden = true; tabSig = ''; return; }
    if (tab !== 'all' && !model.categories.some((c) => c.id === tab)) tab = 'all';
    const sig = tab + '|' + model.categories.map((c) => c.id).join();
    els.tabs.hidden = false;
    if (sig === tabSig) return;
    tabSig = sig;
    const all = { id: 'all', name: 'Alle', icon: 'insight' };
    els.tabs.innerHTML = [all, ...model.categories].map((c) =>
      `<button type="button" class="tab" role="tab" data-tab="${c.id}" aria-selected="${c.id === tab}">${icon(c.icon)}<span>${c.name}</span></button>`).join('');
  }

  function renderInsights(model) {
    renderTabs(model);
    const ids = new Set(model.cards.map((c) => c.id));
    for (const [id, el] of cards) {
      if (ids.has(id)) continue;
      cards.delete(id);
      if (el.contains(document.activeElement)) els.title.focus({ preventScroll: true });
      el.classList.add('leave');
      setTimeout(() => el.remove(), 220);
    }
    let prev = null;
    for (const c of model.cards) {
      let el = cards.get(c.id);
      if (!el) { el = createCard(c); cards.set(c.id, el); }
      const want = prev ? prev.nextElementSibling : els.list.firstElementChild;
      if (want !== el) els.list.insertBefore(el, want);
      el.hidden = tab !== 'all' && c.category !== tab;
      updateCard(el, c);
      prev = el;
    }
    els.empty.hidden = model.cards.length > 0;
    if (!model.cards.length) els.empty.textContent = EMPTY_TEXT;
  }

  function renderMilestones(state) {
    const list = reachedMilestones(state);
    const sig = list.map((m) => m.id).join();
    if (sig === msSig) return;
    msSig = sig;
    els.ms.innerHTML = list.map((m) =>
      `<li>${icon('flag')}<div><h3>${m.title}</h3><p>${m.text}</p>${m.opens ? `<p class="opens">${m.opens}</p>` : ''}</div></li>`).join('');
  }

  // ---------- Rike ----------
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const checklist = (items) => `<ul class="checks">${items.map((c) => `<li class="${c.ok ? 'ok' : 'miss'}"><span class="dot"></span><span>${esc(c.label)}</span>${c.need != null ? `<span class="num">${Math.min(c.have, 9999)}/${c.need}</span>` : ''}</li>`).join('')}</ul>`;
  function renderRealm(state) {
    const m = selectRealm(state);
    const sig = JSON.stringify(m, (k, v) => (typeof v === 'number' ? Math.floor(v * 10) / 10 : v));
    if (sig === realmSig) return;
    realmSig = sig;
    const cityMissing = m.city ? m.city.filter((c) => !c.ok) : [];
    const parts = [];
    parts.push(`<section><h3>Sivilisasjonen</h3><p class="big">${esc(m.stage)}</p>${m.next ? `<p class="muted">Neste: ${esc(m.next)}</p>` : ''}</section>`);
    if (state.totals.knowledge > 0) parts.push(`<section><h3>Kunnskap</h3><p>${fmtAmount(m.knowledge.value)} <span class="muted">${fmtRate(m.knowledge.rate)} · ${m.knowledge.techs} fremskritt</span></p></section>`);
    parts.push(`<section><h3>Bosettinger (${m.settlements.length})</h3><ul class="rows">${m.settlements.map((s) => `<li><strong>${esc(s.name)}</strong><span>${esc(s.founding ? 'Grunnlegges' : s.stage)}${s.role && !s.founding ? ' · ' + esc(s.role) : ''}</span><span class="num">${s.people}/${s.housing || '–'} folk</span></li>`).join('')}</ul></section>`);
    if (cityMissing.length) parts.push(`<section><h3>Veien til by</h3>${checklist(m.city)}</section>`);
    if (m.expansion) parts.push(`<section><h3>Nye bosettinger</h3>${checklist(m.expansion)}</section>`);
    if (m.network.deliveries > 0 || m.network.routes > 0) parts.push(`<section><h3>Forbindelser</h3><p>${m.network.routes} ${m.network.routes === 1 ? 'etablert rute' : 'etablerte ruter'} · ${m.network.deliveries} ${m.network.deliveries === 1 ? 'leveranse' : 'leveranser'}${m.network.caravans ? ` · ${m.network.caravans} ${m.network.caravans === 1 ? 'karavane' : 'karavaner'}` : ''}</p></section>`);
    if (m.world.unlocked || m.world.regions.length) {
      const mis = m.world.mission ? `<p class="muted">${m.world.mission.kind === 'outpost' ? 'Nybyggere' : 'Ekspedisjon'} på vei mot ${esc(m.world.mission.region)}${m.world.mission.phase === 'away' ? ' — borte' : ''}.</p>` : '';
      parts.push(`<section><h3>Verden</h3>${mis}<ul class="rows">${m.world.regions.map((r) => `<li><strong>${esc(r.name)}</strong><span>${esc(r.biome)} · ${esc(r.state)}</span><span class="num">${r.pop ? r.pop + ' folk' : ''}</span></li>`).join('')}</ul><p class="muted">${m.world.unknown} land ukjent${m.world.reachable ? ` · ${m.world.reachable} innen rekkevidde` : ''}</p></section>`);
    }
    els.realm.innerHTML = parts.join('');
  }

  // ---------- Ressurser ----------
  function renderRes(container, items) {
    const keep = new Set(items.map((i) => i.id));
    container.dataset.dense = items.length >= 6 ? '1' : '';
    for (const el of [...container.children]) if (!keep.has(el.dataset.res)) el.remove();
    for (const item of items) {
      let el = container.querySelector(`[data-res="${item.id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'res' + (container.dataset.ready ? ' enter' : '');
        el.dataset.res = item.id;
        el.title = RESOURCES[item.id].name;
        el.innerHTML = `${icon(RESOURCES[item.id].icon)}<div><span class="lbl">${RESOURCES[item.id].name}</span><div class="line"><span class="val"></span><span class="rate" hidden></span></div></div>`;
        container.appendChild(el);
      }
      const val = fmtAmount(item.value);
      const v = el.querySelector('.val');
      if (v.textContent !== val) v.textContent = val;
      const r = el.querySelector('.rate');
      r.hidden = item.rate == null;
      if (item.rate != null) {
        const t = fmtRate(item.rate);
        if (r.textContent !== t) r.textContent = t;
        r.classList.toggle('zero', item.rate < 0.05);
      }
    }
    container.dataset.ready = '1';
  }

  // ---------- Kontroller ----------
  els.controls.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.speed != null) onSpeed(Number(b.dataset.speed));
    if (b.dataset.view) onView(b.dataset.view);
    if (b.dataset.zoom) onZoom(b.dataset.zoom === 'in' ? 1 / 1.25 : 1.25);
  });

  // ---------- Ragnarok ----------
  const closeDialog = (cancelled = true) => {
    if (cancelled && !els.dialog.hidden) onRagnarok('cancel');
    els.dialog.hidden = true;
    if (dialogReturn) dialogReturn.focus({ preventScroll: true });
    dialogReturn = null;
  };
  $('ragnarok-cancel').addEventListener('click', closeDialog);
  $('ragnarok-confirm').addEventListener('click', () => { closeDialog(false); onRagnarok('confirm'); });
  els.summary.addEventListener('click', (e) => { const b = e.target.closest('[data-echo]'); if (b && !b.disabled) onRagnarok('buy', b.dataset.echo); });
  els.dialog.addEventListener('click', (e) => { if (e.target === els.dialog) closeDialog(); });

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!els.dialog.hidden) closeDialog();
    else if (mode) setMode(null);
  });

  function showNotice({ icon: ic, kicker, title, text, kind = 'minor' }) {
    const d = document.createElement('div');
    d.className = `toast ${kind} panel`;
    d.innerHTML = `${ic ? icon(ic) : ''}<div><div class="t"><span class="k">${kicker}</span>${title}</div>${text ? `<div class="s">${text}</div>` : ''}</div>`;
    els.toasts.appendChild(d);
    setTimeout(() => { d.remove(); showNext(); }, kind === 'minor' ? 3800 : kind === 'major' ? 5800 : 4800);
  }
  function showNext() {
    const item = presentations.dismiss();
    if (item) showNotice(item);
  }
  function present(events) {
    const item = presentations.push(events);
    if (item) showNotice(item);
  }

  function render(state) {
    const model = selectInsights(state);
    const epoch = currentEpoch(state);
    if (document.documentElement.dataset.epoch !== epoch.id) document.documentElement.dataset.epoch = epoch.id;
    if (els.sub.textContent !== epoch.stage) els.sub.textContent = epoch.stage;

    renderRes(els.res, selectResources(state));
    const divine = selectDivine(state);
    if (divine && els.divine.hidden) els.divine.classList.add('enter');
    els.divine.hidden = !divine;
    if (divine) renderRes(els.divine, [divine]);

    badge.hidden = model.availableCount === 0;
    badge.textContent = model.availableCount;
    navBtn('insights').setAttribute('aria-label', model.availableCount ? `Innsikter, ${model.availableCount} kan velges` : 'Innsikter');
    const msBtn = navBtn('milestones');
    const hasMs = Object.keys(state.milestones).length > 0;
    if (msBtn.hidden && hasMs) msBtn.classList.add('enter');
    msBtn.hidden = !hasMs;
    if (!hasMs && mode === 'milestones') setMode(null, { focus: false });

    if (model.availableCount > 0 && !autoOpened) {
      autoOpened = true;
      if (!mode) setMode('insights', { focus: false });
    }
    if (mode === 'insights') renderInsights(model);
    if (mode === 'milestones') renderMilestones(state);
    const realmBtn = navBtn('realm'), showRealm = realmVisible(state);
    if (realmBtn.hidden && showRealm) realmBtn.classList.add('enter');
    realmBtn.hidden = !showRealm;
    if (mode === 'realm') { if (showRealm) renderRealm(state); else setMode(null, { focus: false }); }
    const worldBtn = els.controls.querySelector('[data-view="world"]');
    if (worldBtn) worldBtn.hidden = !state.unlocks.worldView;
  }

  return {
    update(state, { speed, view, areaUnlocked, scale }) {
      lastState = state;
      render(state);
      // Hvilken skala spilleren ser på (vises når mer enn nærbildet finnes).
      const chip = $('scale');
      const showChip = !!scale && areaUnlocked;
      chip.hidden = !showChip;
      if (showChip) { const html = `Utsnitt: <b>${scale}</b>`; if (chip.innerHTML !== html) chip.innerHTML = html; }
      for (const b of els.controls.querySelectorAll('button[data-speed]')) {
        const on = Number(b.dataset.speed) === speed;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      }
      for (const b of els.controls.querySelectorAll('button[data-view]')) {
        b.classList.toggle('on', b.dataset.view === view);
        if (b.dataset.view === 'area') {
          b.disabled = !areaUnlocked;
          b.title = areaUnlocked ? 'Område: hele boplassen og landskapet rundt' : 'Låses opp ved milepælen Sammenhengende bosetting';
        }
      }
    },
    toast(title, text) { present([{ type: 'milestone', id: `message-${title}`, title, text }]); },
    present,
    hint(text) {
      if (!text) { els.hint.classList.add('hide'); return; }
      if (els.hint.textContent !== text) els.hint.textContent = text;
      els.hint.classList.remove('hide');
    },
    showRagnarok(summary, { keepFocus = null } = {}) {
      const shop = summary.shop.map((b) => `<li class="echo${b.level >= b.max ? ' maxed' : ''}">
          <div><h4>${b.name}${b.level ? ` <span class="lvl">${b.level}/${b.max}</span>` : ''}</h4><p>${b.effect}</p><p class="w">${b.world}</p></div>
          <button type="button" class="btn${b.affordable ? ' btn-gold' : ''}" data-echo="${b.id}" ${b.affordable ? '' : 'disabled'}>${b.level >= b.max ? 'Fullt' : `${b.cost} PrP`}</button></li>`).join('');
      els.summary.innerHTML = `<dl>
        <dt>Går tapt</dt><dd>${summary.lost}</dd>
        <dt>Beholdes</dt><dd>${summary.kept}</dd>
        <dt>Tildeles</dt><dd>${summary.prp} Prestige Points (PrP)${summary.bank ? ` · ${summary.bank} spart fra før` : ''}</dd>
        <dt>Varig avtrykk</dt><dd>${summary.legacy}</dd>
      </dl>
      <section class="echoes" aria-label="Ekko fra tidligere sykluser">
        <h3>Ekko inn i neste syklus <span class="budget">${summary.budget} PrP å bruke</span></h3>
        <p class="note">Valgfritt. Ekkoene gjør starten litt lettere, men treet, steinen og det første lyet må fortsatt skapes. Valgene gjelder først når du bekrefter.</p>
        <ul>${shop}</ul>
      </section>`;
      const wasOpen = !els.dialog.hidden;
      if (!wasOpen) dialogReturn = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      els.dialog.hidden = false;
      const keep = keepFocus && els.summary.querySelector(`[data-echo="${keepFocus}"]`);
      if (keep && !keep.disabled) keep.focus({ preventScroll: true });
      else if (!wasOpen || keepFocus) $('ragnarok-cancel').focus({ preventScroll: true });
    },
    get panel() { return mode; },
    openPanel(m) { setMode(m, { focus: false }); },
    reset() {
      seen.clear();
      cards.clear();
      presentations.reset();
      els.toasts.replaceChildren();
      els.list.innerHTML = '';
      els.res.innerHTML = '';
      els.divine.innerHTML = '';
      delete els.res.dataset.ready;
      delete els.divine.dataset.ready;
      tab = 'all'; tabSig = ''; msSig = ''; realmSig = ''; autoOpened = false; lastState = null;
      setMode(null, { focus: false });
    },
  };
}
