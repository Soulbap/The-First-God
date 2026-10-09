// UI: ressurser, innsikter (oppgraderinger), milepæler, fart og utsnitt. Leser tilstand; endrer den kun via callbacks.
import { UPGRADES } from '../data/upgrades.js';
import { upgradeStatus, currentCost } from '../sim/economy.js';
import { productionRate } from '../sim/stats.js';

export const ICONS = {
  wood: '<svg viewBox="0 0 20 20"><rect x="2" y="7" width="14" height="7" rx="3.5" fill="#7a5a3c"/><ellipse cx="15.5" cy="10.5" rx="2.6" ry="3.5" fill="#d2b083"/><ellipse cx="15.5" cy="10.5" rx="1.1" ry="1.6" fill="#9a7650"/></svg>',
  stone: '<svg viewBox="0 0 20 20"><path d="M3 14c0-4 3-8 7-8s7 3 7 7c0 2-2 3-7 3s-7-.5-7-2z" fill="#8f8a7e"/><path d="M6 9c1.5-2 4-3 6-2" stroke="#c9c3b4" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>',
  people: '<svg viewBox="0 0 20 20"><circle cx="7" cy="5" r="2.2" fill="#c49a7c"/><path d="M4 18l1-8h4l1 8z" fill="#8a7d66"/><circle cx="13.5" cy="6" r="2" fill="#a8795a"/><path d="M11 18l.8-7h3.4l.8 7z" fill="#6b5139"/></svg>',
  pp: '<svg viewBox="0 0 20 20"><defs><radialGradient id="g"><stop offset="0" stop-color="#ffe6a8"/><stop offset="1" stop-color="#ffc870" stop-opacity="0"/></radialGradient></defs><circle cx="10" cy="10" r="9" fill="url(#g)"/><circle cx="10" cy="10" r="2.6" fill="#fff1cc"/></svg>',
};

const STATUS_TEXT = { locked: 'Låst', unaffordable: 'For dyrt ennå', available: 'Tilgjengelig', building: 'Bygges', done: 'Fullført' };
const fmt = (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.floor(v)));

export function createHud({ onBuy, onSpeed, onView, onRagnarok }) {
  const $ = (id) => document.getElementById(id);
  const els = {
    res: $('resources'), list: $('upgrade-list'), drawer: $('drawer'), toggle: $('drawer-toggle'),
    badge: document.querySelector('#drawer-toggle .badge'), hint: $('hint'), toasts: $('toasts'),
    controls: $('controls'), dialog: $('dialog'), summary: $('ragnarok-summary'),
  };
  let lastListSig = '', lastResSig = '', autoOpened = false;

  const openDrawer = (open) => {
    els.drawer.hidden = !open;
    els.toggle.hidden = open;
  };
  els.toggle.addEventListener('click', () => openDrawer(true));
  $('drawer-close').addEventListener('click', () => openDrawer(false));
  els.list.addEventListener('click', (e) => {
    const card = e.target.closest('.card.available');
    if (card) onBuy(card.dataset.id);
  });
  els.controls.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.speed != null) onSpeed(Number(b.dataset.speed));
    if (b.dataset.view) onView(b.dataset.view);
  });
  $('ragnarok-btn').addEventListener('click', () => onRagnarok('preview'));
  $('ragnarok-cancel').addEventListener('click', () => { els.dialog.hidden = true; });
  $('ragnarok-confirm').addEventListener('click', () => { els.dialog.hidden = true; onRagnarok('confirm'); });

  function renderResources(state) {
    const rate = productionRate(state);
    const showRate = state.humans.length > 0;
    const showPP = state.buildings.some((b) => b.type === 'fire' && b.complete) || state.resources.pp > 0;
    const sig = [fmt(state.resources.wood), fmt(state.resources.stone), state.humans.length, Math.floor(state.resources.pp), rate.wood.toFixed(1), rate.stone.toFixed(1), showRate, showPP].join('|');
    if (sig === lastResSig) return;
    lastResSig = sig;
    const item = (icon, label, val, r) => `<div class="res">${icon}<div class="stack"><span class="val">${val}</span><span class="lbl">${label}${r != null ? ` · <span class="rate">+${r}/s</span>` : ''}</span></div></div>`;
    let html = item(ICONS.wood, 'Trevirke', fmt(state.resources.wood), showRate ? rate.wood.toFixed(1) : null);
    html += item(ICONS.stone, 'Stein', fmt(state.resources.stone), showRate ? rate.stone.toFixed(1) : null);
    if (state.humans.length) html += item(ICONS.people, 'Mennesker', state.humans.length);
    if (showPP) html += item(ICONS.pp, 'Bønn (PP)', Math.floor(state.resources.pp));
    els.res.innerHTML = html;
  }

  function renderUpgrades(state) {
    const rows = UPGRADES.map((def) => {
      const status = upgradeStatus(state, def);
      const cost = currentCost(state, def);
      const afford = Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, state.resources[k] >= v]));
      return { def, status, cost, afford, count: state.upgrades[def.id] || 0 };
    });
    const available = rows.filter((r) => r.status === 'available').length;
    els.badge.hidden = available === 0;
    els.badge.textContent = available;
    els.toggle.classList.toggle('pulse', available > 0);
    if (available > 0 && !autoOpened) { autoOpened = true; openDrawer(true); }
    const sig = rows.map((r) => `${r.def.id}:${r.status}:${r.count}:${Object.values(r.afford).join()}`).join('|');
    if (sig === lastListSig) return;
    lastListSig = sig;
    // Sorter: kjøpbare først, deretter på vei, deretter låst, fullførte sist.
    const order = { available: 0, unaffordable: 1, building: 2, locked: 3, done: 4 };
    rows.sort((a, b) => order[a.status] - order[b.status]);
    els.list.innerHTML = rows.map(({ def, status, cost, afford, count }) => {
      const repeat = def.max > 1 ? ` <span class="status">${count}/${def.max}</span>` : '';
      const costHtml = status === 'done' ? '' : `<div class="cost">${Object.entries(cost).map(([k, v]) => `<span class="${afford[k] ? 'ok' : 'no'}">${ICONS[k]}${v}</span>`).join('')}</div>`;
      const req = status === 'locked' && def.requireText ? `<p class="req">${def.requireText}</p>` : '';
      return `<div class="card ${status}" data-id="${def.id}" role="button" tabindex="${status === 'available' ? 0 : -1}">
        <div class="top"><h3>${def.name}${repeat}</h3><span class="status">${STATUS_TEXT[status]}</span></div>
        ${costHtml}
        <p><b>Effekt</b>${def.effect}</p>
        <p><b>I verden</b>${def.world}</p>
        ${req}
      </div>`;
    }).join('');
  }

  return {
    update(state, { speed, view, areaUnlocked }) {
      renderResources(state);
      renderUpgrades(state);
      for (const b of els.controls.querySelectorAll('button[data-speed]')) b.classList.toggle('on', Number(b.dataset.speed) === speed);
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
      els.dialog.hidden = false;
    },
    reset() { lastListSig = ''; lastResSig = ''; autoOpened = false; openDrawer(false); },
  };
}
