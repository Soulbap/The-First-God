// UI: ressurslinjer, bunnmeny, Innsikter/Milepæler-panel, kontroller og Ragnarok-dialog.
// Leser tilstand via visningsmodellen i insights.js; endrer den kun via callbacks.
import { icon } from './icons.js';
import { RESOURCES } from '../data/gui.js';
import { upgradeById } from '../data/upgrades.js';
import { selectInsights, selectResources, selectDivine, currentEpoch, reachedMilestones, fmtAmount, fmtRate } from './insights.js';

const TITLES = { insights: 'Innsikter', milestones: 'Milepæler' };
const EMPTY_TEXT = 'Ingen innsikter ennå. Rør ved treet eller steinen — verden svarer.';

export function createHud({ onBuy, onSpeed, onView, onZoom, onRagnarok }) {
  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'), res: $('resources'), divine: $('divine'), drawer: $('drawer'), title: $('drawer-title'), sub: $('drawer-sub'),
    tabs: $('drawer-tabs'), list: $('insight-list'), empty: $('insight-empty'), ms: $('milestone-list'),
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
  let lastState = null;
  let autoOpened = false;
  let dialogReturn = null;
  const seen = new Set();   // innsikter spilleren har sett i panelet (styrer «NY»)
  const cards = new Map();  // id → element

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
    for (const id of ['insights', 'milestones']) navBtn(id).setAttribute('aria-expanded', String(mode === id));
    if (open) {
      els.title.textContent = TITLES[mode];
      els.list.hidden = mode !== 'insights';
      els.tabs.hidden = true;
      els.empty.hidden = true;
      els.ms.hidden = mode !== 'milestones';
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
      const def = upgradeById(id);
      notice({ icon: def.icon, kicker: 'Valgt', title: def.name, text: def.world });
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

  // ---------- Ressurser ----------
  function renderRes(container, items) {
    const keep = new Set(items.map((i) => i.id));
    for (const el of [...container.children]) if (!keep.has(el.dataset.res)) el.remove();
    for (const item of items) {
      let el = container.querySelector(`[data-res="${item.id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'res' + (container.dataset.ready ? ' enter' : '');
        el.dataset.res = item.id;
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
  const closeDialog = () => {
    els.dialog.hidden = true;
    if (dialogReturn) dialogReturn.focus({ preventScroll: true });
    dialogReturn = null;
  };
  $('ragnarok-cancel').addEventListener('click', closeDialog);
  $('ragnarok-confirm').addEventListener('click', () => { closeDialog(); onRagnarok('confirm'); });
  els.dialog.addEventListener('click', (e) => { if (e.target === els.dialog) closeDialog(); });

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!els.dialog.hidden) closeDialog();
    else if (mode) setMode(null);
  });

  function notice({ icon: ic, kicker, title, text }) {
    const d = document.createElement('div');
    d.className = 'toast minor panel';
    d.innerHTML = `${ic ? icon(ic) : ''}<div><div class="t"><span class="k">${kicker}</span>${title}</div>${text ? `<div class="s">${text}</div>` : ''}</div>`;
    els.toasts.appendChild(d);
    setTimeout(() => d.remove(), 4200);
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
  }

  return {
    update(state, { speed, view, areaUnlocked }) {
      lastState = state;
      render(state);
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
    toast(title, text) {
      const d = document.createElement('div');
      d.className = 'toast panel';
      d.innerHTML = `<div class="t">${title}</div><div class="s">${text}</div>`;
      els.toasts.appendChild(d);
      setTimeout(() => d.remove(), 6200);
    },
    discovered(id) {
      const def = upgradeById(id);
      if (def) notice({ icon: def.icon, kicker: 'Ny innsikt', title: def.name });
    },
    hint(text) {
      if (!text) { els.hint.classList.add('hide'); return; }
      if (els.hint.textContent !== text) els.hint.textContent = text;
      els.hint.classList.remove('hide');
    },
    showRagnarok(summary) {
      els.summary.innerHTML = `<dl>
        <dt>Går tapt</dt><dd>${summary.lost}</dd>
        <dt>Beholdes</dt><dd>${summary.kept}</dd>
        <dt>Tildeles</dt><dd>${summary.prp} Prestige Points (PrP)</dd>
        <dt>Varig avtrykk</dt><dd>${summary.legacy}</dd>
      </dl><p class="note">Prototype: permanente bonuser er ennå ikke kjøpbare. Valget er frivillig og kan avbrytes.</p>`;
      dialogReturn = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      els.dialog.hidden = false;
      $('ragnarok-cancel').focus({ preventScroll: true });
    },
    get panel() { return mode; },
    openPanel(m) { setMode(m, { focus: false }); },
    reset() {
      seen.clear();
      cards.clear();
      els.list.innerHTML = '';
      els.res.innerHTML = '';
      els.divine.innerHTML = '';
      delete els.res.dataset.ready;
      delete els.divine.dataset.ready;
      tab = 'all'; tabSig = ''; msSig = ''; autoOpened = false; lastState = null;
      setMode(null, { focus: false });
    },
  };
}
