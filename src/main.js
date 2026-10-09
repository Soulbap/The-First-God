// Oppstart, hovedløkke og input. Kobler simulering, kamera, renderer og UI sammen.
import { createGame, step, drainEvents, clickNode, advance, DT } from './sim/game.js';
import { purchase } from './sim/economy.js';
import { createCamera, clampCamera, setZoomLimits, zoomAt, panBy, glideTo, updateCamera, VIEW } from './view/camera.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { overviewLayout, regionAt } from './view/overview.js';

const SEED = 20261009; // samme grunnverden i hver syklus
const MAX_STEPS_PER_FRAME = 240;

const canvas = document.getElementById('world');
const renderer = createRenderer(canvas);
let state, cam;
let speed = 1, savedSpeed = 1, acc = 0, renderTime = 0, last = performance.now();
let hoverId = null, hudTimer = 0, wearTimer = 0, pendingGlide = null;
let overview = false, hoverRegion = null; // verdensoversikt: samme simulering, ett høyere meningsnivå
const meta = { prestige: 0, cycles: 0 };

const hud = createHud({
  onBuy(id) {
    const r = purchase(state, id);
    if (!r.ok && r.reason === 'noSite') hud.toast('Ingen ledig plass', 'Menneskene fant ikke et egnet sted å bygge akkurat nå.');
    hudTimer = 0; // oppdater menyen straks etter kjøp
    return r;
  },
  onSpeed(s) { speed = s; if (s > 0) savedSpeed = s; },
  onView(v) { goView(v); },
  onZoom(f) { zoomAt(cam, cam.screenW / 2, cam.screenH / 2, f); },
  onRagnarok(phase) {
    if (phase === 'preview') hud.showRagnarok(ragnarokSummary());
    else {
      const s = ragnarokSummary();
      meta.prestige += s.prp;
      meta.cycles++;
      newCycle();
      hud.toast('Ragnarok', `En ny syklus begynner i den samme verdenen. Du bærer med deg ${meta.prestige} PrP.`);
    }
  },
});

function ragnarokSummary() {
  const homes = state.buildings.filter((b) => b.complete && (b.type === 'shelter' || b.type === 'hut')).length;
  // Provisorisk formel — balanseres når permanente bonuser finnes.
  const prp = Math.floor(Math.sqrt(state.totals.wood + state.totals.stone) / 4) + homes + Math.floor(state.totals.pp / 10);
  return {
    prp,
    lost: `${Math.floor(state.resources.wood)} trevirke, ${Math.floor(state.resources.stone)} stein, ${state.humans.length} mennesker og ${state.buildings.length} bygg`,
    kept: 'Den samme startverdenen (samme tre, stein og landskap) og alle Prestige Points',
    legacy: 'Plassholder: et varig tegn ved det første treet kommer i en senere iterasjon',
  };
}

function resize() {
  if (!cam) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  cam.screenW = window.innerWidth;
  cam.screenH = window.innerHeight;
  cam.dpr = dpr;
  clampCamera(cam, state.world.width, state.world.height);
}

function newCycle() {
  state = createGame(SEED);
  renderer.reset(state);
  const C = state.settlement.center;
  cam = createCamera(C.x - 10, C.y - 30);
  setZoomLimits(cam, false);
  acc = 0;
  pendingGlide = null;
  overview = false; hoverRegion = null;
  hud.reset();
  resize();
}

const currentView = () => (overview ? 'world' : cam.w >= VIEW.semanticAreaW ? 'area' : 'near');

function setOverview(on) {
  if (on && !state.unlocks.worldView) return;
  overview = on; hoverRegion = null; down = null;
  canvas.classList.remove('dragging', 'can-gather');
  hudTimer = 0;
}

function goView(v, duration) {
  if (v === 'world') { setOverview(true); return; }
  if (overview) setOverview(false);
  const C = state.settlement.center;
  if (v === 'area' && state.unlocks.zoomArea) {
    const S = state.settlements?.find((s) => s.id === 'second');
    if (state.unlocks.regionView && S) glideTo(cam, (C.x + S.x) / 2, (C.y + S.y) / 2, VIEW.region.w, duration || 2.4);
    else glideTo(cam, C.x, C.y - 40, VIEW.area.w, duration || 2.4);
  }
  if (v === 'near') glideTo(cam, C.x - 10, C.y - 30, VIEW.near.w, 2.0);
}

function updateHint() {
  const s = state;
  const shelter = s.buildings.find((b) => b.type === 'shelter');
  let text = '';
  if (s.totals.manualClicks < 3 && !shelter) text = 'Klikk på treet og steinen for å samle trevirke og stein.';
  else if (!shelter) text = s.resources.wood >= 10 && s.resources.stone >= 5 ? 'Velg «Første ly» under Innsikter.' : 'Samle 10 trevirke og 5 stein til det første lyet.';
  else if (!shelter.complete) text = 'Lyet reises …';
  else if (!s.upgrades.awakening) text = s.resources.wood >= 12 && s.resources.stone >= 6 ? 'Lyet står. Velg «Vekkelse» for å vekke de første menneskene.' : 'Lyet står. Samle til «Vekkelse» — 12 trevirke og 6 stein.';
  else if (s.time - (s.stats.autoStart ?? 0) < 14) text = 'Menneskene sanker nå selv. Du kan slippe musen og se verden leve.';
  hud.hint(text);
}

function handleEvents(events) {
  hud.present(events.filter((e) => e.type === 'discovered' || e.type === 'milestone'));
  for (const e of events) {
    if (e.type !== 'milestone') continue;
    if (e.unlock === 'zoomArea') {
      setZoomLimits(cam, true);
      pendingGlide = 1.4; // kort pause så spilleren rekker å lese meldingen
    }
    if (e.unlock === 'villageView') {
      setZoomLimits(cam, true);
      pendingGlide = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1.4;
    }
    if (e.unlock === 'regionView') { setZoomLimits(cam, true); pendingGlide = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1.4; }
  }
}

function frame(now) {
  const realDt = Math.min(0.1, (now - last) / 1000);
  last = now;
  tick(realDt);
  requestAnimationFrame(frame);
}

function tick(realDt) {
  renderTime += realDt;

  acc += realDt * speed;
  let steps = 0;
  while (acc >= DT && steps < MAX_STEPS_PER_FRAME) { step(state); acc -= DT; steps++; }
  if (steps >= MAX_STEPS_PER_FRAME) acc = 0; // tregt bilde: dropp etterslep i stedet for å spiral-akselerere

  const events = drainEvents(state);
  handleEvents(events);
  renderer.handleEvents(state, events, cam);
  renderer.update(state, realDt, realDt * speed, renderTime);

  if (pendingGlide != null) {
    pendingGlide -= realDt;
    if (pendingGlide <= 0) {
      pendingGlide = null;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      goView('area', reduced ? 0.01 : 4.5);
    }
  }
  updateCamera(cam, realDt);
  clampCamera(cam, state.world.width, state.world.height);

  wearTimer -= realDt;
  if (wearTimer <= 0) { wearTimer = 0.5; renderer.updateWear(state); }

  if (overview) renderer.renderOverview(state, cam, renderTime, hoverRegion);
  else renderer.render(state, cam, renderTime, hoverId);

  hudTimer -= realDt;
  if (hudTimer <= 0) {
    hudTimer = 0.15;
    hud.update(state, { speed, view: currentView(), areaUnlocked: state.unlocks.zoomArea });
    updateHint();
  }
}

// ---------- Input ----------
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  if (overview) return;
  down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, button: e.button };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (overview) { const r = regionAt(overviewLayout(state, cam.screenW, cam.screenH), state, e.clientX, e.clientY); hoverRegion = r ? r.id : null; return; }
  if (down) {
    if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down.moved = true; canvas.classList.add('dragging'); }
    if (down.moved) panBy(cam, e.clientX - down.lx, e.clientY - down.ly);
    down.lx = e.clientX;
    down.ly = e.clientY;
    return;
  }
  const n = renderer.pick(state, cam, e.clientX, e.clientY);
  hoverId = n ? n.id : null;
  canvas.classList.toggle('can-gather', !!n);
});
canvas.addEventListener('pointerup', (e) => {
  if (down && !down.moved && down.button === 0) {
    const n = renderer.pick(state, cam, e.clientX, e.clientY);
    if (n) { clickNode(state, n.id); hudTimer = 0; }
  }
  down = null;
  canvas.classList.remove('dragging');
});
canvas.addEventListener('pointerleave', () => { hoverId = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  // Å zoome forbi områdevisningen åpner oversikten; å zoome inn igjen går tilbake til landskapet.
  if (overview) { if (e.deltaY < 0) goView('area', 1.2); return; }
  if (e.deltaY > 0 && state.unlocks.worldView && cam.w >= cam.maxW * 0.97) { setOverview(true); return; }
  zoomAt(cam, e.clientX, e.clientY, Math.exp(e.deltaY * 0.0012));
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  if (e.code === 'Space' && e.target.closest && e.target.closest('button')) return; // mellomrom aktiverer knappen
  if (e.code === 'Space') { e.preventDefault(); speed = speed === 0 ? savedSpeed : 0; }
  if ((e.key === 'v' || e.key === 'V') && state.unlocks.worldView) { if (overview) goView('area', 1.2); else setOverview(true); }
  if (e.key === '1') speed = savedSpeed = 1;
  if (e.key === '2') speed = savedSpeed = 2;
  if (e.key === '3') speed = savedSpeed = 4;
});
window.addEventListener('resize', resize);

// ---------- Start ----------
setTimeout(() => {
  newCycle();
  document.getElementById('loading').hidden = true;
  requestAnimationFrame((t) => { last = t; frame(t); });
  if (new URLSearchParams(location.search).has('debug')) {
    // Feilsøkings- og skjermbildekroker. Ikke en del av spilleropplevelsen.
    window.TFG = {
      get state() { return state; },
      get cam() { return cam; },
      advance: (s) => advance(state, s),
      give: (w, st) => { state.resources.wood += w; state.resources.stone += st; },
      buy: (id) => purchase(state, id),
      click: (id) => clickNode(state, id),
      view: (x, y, w) => { cam.x = x; cam.y = y; cam.w = w; cam.tween = null; },
      setSpeed: (s) => { speed = s; },
      overview: (on) => { setOverview(on); return overview; },
      cancelGlide: () => { pendingGlide = null; },
      get isOverview() { return overview; },
      hud,
      renderStats: renderer.stats,
      renderer,
      tick: (seconds, fps = 30) => { for (let i = 0; i < seconds * fps; i++) tick(1 / fps); },
    };
  }
}, 30);
