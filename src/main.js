// Oppstart, hovedløkke og input. Kobler simulering, kamera, renderer og UI sammen.
import { createGame, step, drainEvents, clickNode, advance, DT } from './sim/game.js';
import { purchase } from './sim/economy.js';
import { createCamera, clampCamera, setZoomLimits, zoomAt, panBy, glideTo, updateCamera, VIEW } from './view/camera.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { overviewLayout, regionAt } from './view/overview.js';
import { createPlanet, toLatLon, fromLatLon, angle } from './sim/planet.js';
import { GLOBE, globeFrame, globeFromWorldCam, worldCamFromGlobe, heightForSpan, globeGlide, updateGlobeCamera, clampGlobe, dragGlobe, scaleOf } from './view/globe.js';
import { createGlobeRenderer, planetView, drawGlobeOverlay, pickGlobe, sunDir } from './render/globe.js';
import { bakePlanet } from './render/planetTexture.js';
import { serialize, deserialize } from './sim/save.js';
import { ragnarokAward, cycleMemory, buyPrestige, emptyMeta } from './sim/legacy.js';
import { PRESTIGE, prestigeCost } from './data/prestige.js';
import { createAmbience } from './audio/ambience.js';
import { icon } from './ui/icons.js';
import { dayPhase } from './view/daylight.js';
import { audioScene } from './audio/scene.js';
import { visitRegion, regionById } from './sim/worldmap.js';
import { projectRegionScene } from './sim/regionScene.js';

const SEED = 20261009; // samme grunnverden i hver syklus
const MAX_STEPS_PER_FRAME = 240;

const canvas = document.getElementById('world');
const globeCanvas = document.getElementById('globe');
const renderer = createRenderer(canvas);
let state, cam;
let speed = 1, savedSpeed = 1, acc = 0, renderTime = 0, last = performance.now();
let hoverId = null, hoverHumanId = null, hudTimer = 0, wearTimer = 0, pendingGlide = null;
// Planetvisningen (OPUS-01): samme simulering, sett fra økende høyde. Reserve uten WebGL: den gamle kartoversikten.
let overview = false, hoverRegion = null; // reserveoversikt (bare uten WebGL)
let regionScene = null; // detaljvisning av ett oppdaget, fjernt land; autoritativ sim blir i `state`.
let globeMode = false, gcam = null, exitAfterGlide = null, snapTimer = 0;
let pendingReveal = null, revealStage = 0; // planetavsløringen ved milepælen som låser opp planetvisningen
let planet = null, baked = null;
const globeR = createGlobeRenderer(globeCanvas);
// Lagring: syklusen og metaprogresjonen (PrP) i nettleseren. Ingen tid går mens spillet er lukket.
// ?debug lagrer/laster aldri av seg selv (skjermbilder og røykprøver skal starte rent); ?fresh hopper over lasting.
const params = new URLSearchParams(location.search);
const PERSIST = !params.has('debug') || params.has('persist');
const SAVE_KEY = 'tfg.save', META_KEY = 'tfg.meta';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ingen lagring */ } },
};
const meta = (() => { try { return { ...emptyMeta(), ...(PERSIST ? JSON.parse(store.get(META_KEY) || '{}') : {}) }; } catch { return emptyMeta(); } })();
let saveTimer = 20;
// Lyd: prosedyrisk stemning, starter ved første klikk/tast. Valget (på/av) huskes.
const ambience = createAmbience({ muted: store.get('tfg.audio') === 'off' || params.has('debug') });
const soundBtn = document.getElementById('sound-btn');
function refreshSoundBtn() {
  soundBtn.innerHTML = icon(ambience.muted ? 'mute' : 'sound');
  soundBtn.setAttribute('aria-pressed', String(!ambience.muted));
  soundBtn.setAttribute('aria-label', ambience.muted ? 'Slå på lyd (M)' : 'Slå av lyd (M)');
}
function toggleSound() { ambience.setMuted(!ambience.muted); store.set('tfg.audio', ambience.muted ? 'off' : 'on'); refreshSoundBtn(); }
soundBtn.addEventListener('click', toggleSound);
refreshSoundBtn();
const wake = () => { if (!ambience.muted) ambience.start(); };
window.addEventListener('pointerdown', wake, { once: true });
window.addEventListener('keydown', wake, { once: true });
function saveNow() { if (!PERSIST || !state) return; store.set(SAVE_KEY, serialize(state)); store.set(META_KEY, JSON.stringify(meta)); }
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Planetens overflate males én gang per side (verdenen er den samme i hver syklus) — i bakgrunnen når det går.
let planetReady;
function startPlanetBake(regions) {
  const plain = regions.map((r) => ({ id: r.id, col: r.col, row: r.row, biome: r.biome, home: r.home }));
  planetReady = new Promise((resolve) => {
    const done = (out) => { baked = out; if (globeR) globeR.setSurface(out); resolve(true); };
    // Utviklerkrok (?debug&planet=/snap/planet-<frø>.bin, laget av tools/bakeplanet.mjs): last ferdig bakte flater i stedet for å bake.
    const pre = params.has('debug') && params.get('planet');
    if (pre) {
      fetch(pre).then((r) => r.arrayBuffer()).then((buf) => {
        const v = new DataView(buf), gw = v.getUint32(0, true), gh = v.getUint32(4, true), lw = v.getUint32(8, true), span = v.getFloat32(12, true);
        const g = new Uint8ClampedArray(buf.slice(20, 20 + gw * gh * 4)), l = new Uint8ClampedArray(buf.slice(20 + gw * gh * 4, 20 + gw * gh * 4 + lw * lw * 4));
        done({ global: { w: gw, h: gh, data: g }, local: { w: lw, h: lw, span, data: l } });
      }).catch(() => done(bakePlanet(SEED, plain)));
      return;
    }
    try {
      const worker = new Worker(new URL('./render/planetWorker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => { done(e.data); worker.terminate(); };
      worker.onerror = () => { done(bakePlanet(SEED, plain)); };
      worker.postMessage({ seed: SEED, regions: plain });
    } catch { done(bakePlanet(SEED, plain)); }
  });
}

const hud = createHud({
  onBuy(id) {
    const r = purchase(state, id);
    if (!r.ok && r.reason === 'noSite') hud.toast('Ingen ledig plass', 'Menneskene fant ikke et egnet sted å bygge akkurat nå.');
    hudTimer = 0; // oppdater menyen straks etter kjøp
    return r;
  },
  onSpeed(s) { speed = s; if (s > 0) savedSpeed = s; },
  onView(v) { goView(v); },
  // Kronikken: gå til stedet der noe skjedde (nærbilde).
  onFocus(x, y) {
    if (globeMode) exitGlobe('near');
    if (overview) setOverview(false);
    glideTo(cam, x, y, Math.min(cam.maxW, 700), reducedMotion() ? 0.01 : 1.8);
  },
  onZoom(f) {
    if (globeMode) { globeZoom(f); return; }
    if (f > 1 && (state.unlocks.mapView || state.unlocks.worldView) && cam.w >= maxWorldW() * 0.97) { goView('world'); return; }
    zoomAt(cam, cam.screenW / 2, cam.screenH / 2, f);
  },
  onRagnarok(phase, id) {
    if (phase === 'preview') { draft = { bonuses: { ...meta.bonuses }, spent: 0 }; hud.showRagnarok(ragnarokSummary()); }
    else if (phase === 'buy') {
      // Ekko velges i dialogen og gjelder først i neste syklus; avbryt forkaster valgene.
      const s = ragnarokSummary(), budget = meta.prestige + s.prp - draft.spent;
      const tmp = { prestige: budget, bonuses: draft.bonuses };
      draft.spent += buyPrestige(tmp, id, budget);
      hud.showRagnarok(ragnarokSummary(), { keepFocus: id });
    } else if (phase === 'cancel') draft = null;
    else {
      const s = ragnarokSummary();
      meta.prestige += s.prp - (draft?.spent || 0);
      if (draft) meta.bonuses = draft.bonuses;
      meta.cycles++;
      meta.legacy.push(cycleMemory(state, meta.cycles));
      draft = null;
      newCycle();
      saveNow();
      hud.toast('Ragnarok', `En ny syklus begynner i den samme verdenen. En minnestein står ved tjernet. ${meta.prestige} PrP er spart til senere.`);
    }
  },
});

let draft = null; // ekko valgt i Ragnarok-dialogen, før bekreftelse
function ragnarokSummary() {
  const prp = ragnarokAward(state);
  const outposts = state.globe.regions.filter((r) => r.state === 'utpost' || r.state === 'etablert').length;
  const extra = [];
  if (state.settlements.length > 1) extra.push(`${state.settlements.length} bosettinger`);
  if (state.resources.planks >= 1 || state.resources.cutstone >= 1) extra.push(`${Math.floor(state.resources.planks)} planker og ${Math.floor(state.resources.cutstone)} tilhugget stein`);
  if (state.totals.knowledge > 0) extra.push(`${Math.floor(state.resources.knowledge)} kunnskap og alle fremskritt`);
  if (outposts || state.globe.stats.discovered) extra.push(`${state.globe.stats.discovered} oppdagede land og ${outposts} utposter`);
  const d = draft || { bonuses: { ...meta.bonuses }, spent: 0 };
  const budget = meta.prestige + prp - d.spent;
  const shop = PRESTIGE.map((def) => {
    const level = d.bonuses[def.id] || 0, cost = prestigeCost(def, level);
    return { id: def.id, name: def.name, effect: def.effect, world: def.world, level, max: def.max, cost, affordable: level < def.max && budget >= cost };
  });
  const memory = cycleMemory(state, meta.cycles + 1);
  return {
    prp, bank: meta.prestige, budget, shop,
    lost: `${Math.floor(state.resources.wood)} trevirke, ${Math.floor(state.resources.stone)} stein, ${state.humans.length} mennesker og ${state.buildings.length} bygg${extra.length ? ', samt ' + extra.join(', ') : ''}`,
    kept: 'Den samme startverdenen (samme tre, stein og landskap), sparte Prestige Points og ekkoene du velger nedenfor',
    legacy: `En minnestein ved tjernet: «Syklus ${memory.n} — ${memory.stage}» (${memory.people} mennesker, ${memory.settlements} ${memory.settlements === 1 ? 'bosetting' : 'bosettinger'}).`,
  };
}

function resize() {
  if (!cam) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  globeCanvas.width = canvas.width;
  globeCanvas.height = canvas.height;
  cam.screenW = window.innerWidth;
  cam.screenH = window.innerHeight;
  cam.dpr = dpr;
  clampCamera(cam, state.world.width, state.world.height);
}

function newCycle(loaded = null) {
  state = loaded || createGame(SEED, meta);
  renderer.reset(state);
  renderer.updateWear(state); renderer.stepWear(1e6); // første bilde skal ha bakken ferdig (lastet verden har allerede spor)
  if (!planet) planet = createPlanet(SEED, state.globe.regions); // geografien er den samme i hver syklus
  if (!planetReady) startPlanetBake(state.globe.regions);
  const C = state.settlement.center;
  cam = createCamera(C.x - 10, C.y - 30);
  setZoomLimits(cam, false);
  acc = 0;
  pendingGlide = null;
  overview = false; hoverRegion = null;
  regionScene = null;
  leaveGlobeNow();
  hud.reset();
  resize();
}

function leaveRegionScene() {
  if (!regionScene) return;
  regionScene = null;
  renderer.reset(state);
  const C = state.settlement.center;
  cam.x = C.x; cam.y = C.y; cam.w = Math.min(cam.maxW, VIEW.area.w);
  clampCamera(cam, state.world.width, state.world.height);
}

function enterRegionScene(id) {
  if (!visitRegion(state, id)) return false;
  const scene = projectRegionScene(state, id);
  if (!scene) return false;
  regionScene = scene; overview = false; leaveGlobeNow();
  renderer.reset(scene);
  const C = scene.settlement.center;
  cam.x = C.x; cam.y = C.y; cam.w = VIEW.area.w; cam.tween = null;
  clampCamera(cam, scene.world.width, scene.world.height);
  const r = regionById(state, id);
  hud.toast(r.name, r.state === 'oppdaget' ? 'Ekspedisjonens land — ingen bosetting ennå.' : `Utposten har ${r.pop} folk.`);
  return true;
}

// ---------- Skala: Nær → Område → Region → Kontinent → Planet ----------
// Største synlige bredde i den detaljerte verdenen for denne skjermen (samme regel som clampCamera).
const maxWorldW = () => Math.min(cam.maxW, state.world.width, state.world.height * (cam.screenW / cam.screenH));
// Laveste planethøyde = akkurat den detaljerte verdenens største utsnitt. Under den overtar 2D-verdenen igjen.
const minGlobeH = () => heightForSpan((maxWorldW() / state.world.width) * planet.patch.w, cam.screenW, cam.screenH);

function currentView() {
  if (globeMode) return scaleOf(gcam.h).id === 'region' ? 'region' : scaleOf(gcam.h).id;
  if (overview) return 'world';
  return cam.w >= VIEW.semanticAreaW ? 'area' : 'near';
}
const SCALE_NAMES = { near: 'Nær', area: 'Område', region: 'Region', continent: 'Kontinent', planet: 'Planet', world: 'Verden' };

function refreshPatch() {
  if (!globeR) return;
  globeR.setPatch(renderer.snapshot(state, renderTime));
  snapTimer = 1.2;
}

function enterGlobe({ glide = true } = {}) {
  leaveRegionScene();
  if (!state.unlocks.worldView) return;
  if (!globeR) { setOverview(true); return; } // reserve: kartoversikten
  if (!baked) { baked = bakePlanet(SEED, state.globe.regions); globeR.setSurface(baked); } // sjelden: arbeideren er ikke ferdig ennå
  clampCamera(cam, state.world.width, state.world.height);
  cam.tween = null; pendingGlide = null;
  refreshPatch();
  gcam = globeFromWorldCam(planet, { ...cam, w: Math.min(cam.w, maxWorldW()) }, state.world);
  globeMode = true; exitAfterGlide = null; hoverRegion = null; down = null;
  globeCanvas.hidden = false;
  canvas.classList.add('globe-mode');
  canvas.classList.remove('dragging', 'can-gather');
  if (glide) globeGlide(gcam, gcam.lat, gcam.lon, GLOBE.continentH, reducedMotion() ? 0.01 : 3.2);
  hudTimer = 0;
}

function leaveGlobeNow() {
  globeMode = false; exitAfterGlide = null;
  globeCanvas.hidden = true;
  canvas.classList.remove('globe-mode');
}

// Tilbake til den detaljerte verdenen. Når kameraet står over hjemmet i laveste høyde, er overgangen sømløs;
// ellers glir planeten først hjem og ned (ingen hopp).
function exitGlobe(then = 'area') {
  if (!globeMode) return;
  const homeLL = toLatLon(planet.home.dir), hMin = minGlobeH();
  const focus = fromLatLon(gcam.lat, gcam.lon);
  const overHome = angle(focus, planet.home.dir) < planet.patch.h * 0.45;
  if (overHome && gcam.h <= hMin * 1.06) {
    const w = worldCamFromGlobe(planet, gcam, state.world, cam.screenW, cam.screenH);
    cam.x = w.x; cam.y = w.y; cam.w = Math.min(maxWorldW(), w.w); cam.tween = null;
    clampCamera(cam, state.world.width, state.world.height);
    leaveGlobeNow();
    if (then === 'near') goView('near');
    hudTimer = 0;
    return;
  }
  const C = state.settlement.center, target = toLatLon(planet.worldToDir(C.x, C.y - 30));
  globeGlide(gcam, target.lat ?? homeLL.lat, target.lon, hMin, reducedMotion() ? 0.01 : 2.4);
  exitAfterGlide = then;
}

function globeZoom(factor) {
  const hMin = minGlobeH();
  const next = gcam.h * factor;
  if (factor < 1 && next < hMin) { exitGlobe('area'); return; }
  gcam.h = Math.max(hMin, Math.min(GLOBE.maxH, next));
  gcam.tween = null;
}

function setOverview(on) {
  if (on && !state.unlocks.mapView && !state.unlocks.worldView) return;
  overview = on; hoverRegion = null; down = null;
  canvas.classList.remove('dragging', 'can-gather');
  hudTimer = 0;
}

function goView(v, duration) {
  revealStage = 0; pendingReveal = null;
  if (v === 'world') {
    leaveRegionScene();
    // Verdenskartet kommer før planeten; den komplette kulevisningen krever senere luftmåling.
    if (!state.unlocks.worldView) { setOverview(true); return; }
    if (!globeR) { setOverview(true); return; }
    if (globeMode) { const L = toLatLon(planet.home.dir); globeGlide(gcam, L.lat, L.lon, gcam.h < GLOBE.continentH * 1.5 ? GLOBE.maxH * 0.92 : GLOBE.continentH, reducedMotion() ? 0.01 : 2.6); }
    else enterGlobe();
    return;
  }
  if (regionScene) { leaveRegionScene(); if (v === 'near') { const C = state.settlement.center; glideTo(cam, C.x, C.y, VIEW.near.w, duration || 1.2); } return; }
  if (globeMode) { exitGlobe(v); return; }
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
  else if (globeMode && gcam.h < GLOBE.continentH * 1.4) text = 'Rull ut for å se hele planeten. Dra for å snu den. Klikk på hjemlandet eller rull inn for å vende hjem.';
  hud.hint(text);
}

function handleEvents(events) {
  hud.present(events.filter((e) => e.type === 'discovered' || e.type === 'milestone' || e.type === 'chronicle'));
  for (const e of events) {
    if (e.type !== 'milestone') continue;
    if (e.unlock === 'zoomArea') {
      setZoomLimits(cam, true);
      pendingGlide = 1.4; // kort pause så spilleren rekker å lese meldingen
    }
    if (e.unlock === 'villageView') {
      setZoomLimits(cam, true);
      pendingGlide = reducedMotion() ? 0 : 1.4;
    }
    if (e.unlock === 'regionView') { setZoomLimits(cam, true); pendingGlide = reducedMotion() ? 0 : 1.4; }
    // Planetavsløringen: kameraet løfter seg selv fra byen til kontinentet og videre til hele kloden — én gang.
    if ((e.unlock === 'worldView' || e.id === 'first_world_civilization') && globeR) { pendingReveal = reducedMotion() ? 0.5 : 3.2; pendingGlide = null; }
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
  // Regionbildet er en lesende projeksjon. Hjemmerenderens effekter, slitasje og økonomiske hendelser
  // oppdateres aldri med den som aktiv visning.
  if (!regionScene) {
    renderer.handleEvents(state, events, cam);
    renderer.update(state, realDt, realDt * speed, renderTime);
  }

  if (pendingReveal != null) {
    pendingReveal -= realDt;
    if (pendingReveal <= 0) {
      pendingReveal = null;
      if (!globeMode) { const C = state.settlement.center; cam.x = C.x; cam.y = C.y; cam.w = maxWorldW(); enterGlobe({ glide: false }); }
      const L = toLatLon(planet.home.dir);
      globeGlide(gcam, L.lat, L.lon, GLOBE.continentH, reducedMotion() ? 0.01 : 4.5);
      revealStage = 1;
    }
  }
  if (revealStage === 1 && globeMode && !gcam.tween) {
    revealStage = 2;
    const L = toLatLon(planet.home.dir);
    globeGlide(gcam, L.lat - 0.05, L.lon, GLOBE.maxH * 0.9, reducedMotion() ? 0.01 : 6);
  } else if (revealStage && (!globeMode || (revealStage === 2 && !gcam.tween))) revealStage = 0;
  if (pendingGlide != null && !globeMode) {
    pendingGlide -= realDt;
    if (pendingGlide <= 0) {
      pendingGlide = null;
      goView('area', reducedMotion() ? 0.01 : 4.5);
    }
  }
  // Zoomgrensen følger tilstanden (ikke bare milepælshendelsen), så en lastet eller avansert verden er riktig.
  if (state.unlocks.zoomArea && cam.maxW < VIEW.area.maxW) setZoomLimits(cam, true);
  updateCamera(cam, realDt);
  clampCamera(cam, state.world.width, state.world.height);

  if (!regionScene) {
    wearTimer -= realDt;
    if (wearTimer <= 0) { wearTimer = 0.5; renderer.updateWear(state); }
    renderer.stepWear(3); // pikselpasset fordeles over flere bilder (ingen enkeltstående pause)
  }
  saveTimer -= realDt;
  if (saveTimer <= 0) { saveTimer = 20; saveNow(); }

  if (globeMode) renderGlobe(realDt);
  else if (overview) renderer.renderOverview(state, cam, renderTime, hoverRegion);
  else renderer.render(regionScene || state, cam, renderTime, regionScene ? null : hoverId, { humanId: regionScene ? null : hoverHumanId });

  hudTimer -= realDt;
  if (hudTimer <= 0) {
    hudTimer = 0.15;
    const view = currentView();
    hud.update(state, { speed, view: globeMode ? 'world' : view, areaUnlocked: state.unlocks.zoomArea, scale: SCALE_NAMES[view] });
    updateHint();
    ambience.update({ ...audioScene(state, cam, renderer.dayOverride ?? dayPhase(state.time), { globe: globeMode || overview }), globe: globeMode ? 1 : 0, active: speed > 0 ? 1 : 0.25 });
  }
}

function renderGlobe(realDt) {
  const moving = updateGlobeCamera(gcam, realDt);
  const hMin = minGlobeH();
  if (!moving && exitAfterGlide) { const then = exitAfterGlide; exitAfterGlide = null; gcam.h = hMin; exitGlobe(then); if (!globeMode) { renderer.render(state, cam, renderTime, hoverId); return; } }
  clampGlobe(gcam, hMin);
  snapTimer -= realDt;
  if (snapTimer <= 0 && gcam.h < 0.9) refreshPatch();
  const t0 = performance.now();
  const view = planetView(state, planet);
  const sun = sunDir(planet, renderer.dayOverride ?? dayPhase(state.time));
  const dayBlend = 1 - Math.min(1, Math.max(0, (gcam.h - hMin * 1.4) / (0.32 - hMin * 1.4)));
  globeR.draw({
    frame: globeFrame(gcam, cam.screenW, cam.screenH), planet, regions: view.regions, lights: view.lights, sun, dayBlend, time: renderTime, h: gcam.h,
    patchOn: 1 - Math.min(1, Math.max(0, (gcam.h - 1.2) / 0.8)), fogOn: true,
  });
  drawGlobeOverlay(canvas.getContext('2d'), state, planet, gcam, { sw: cam.screenW, sh: cam.screenH, dpr: cam.dpr || 1, time: renderTime, hoverId: hoverRegion });
  renderer.stats.globeMs = (renderer.stats.globeMs || 0) + (performance.now() - t0 - (renderer.stats.globeMs || 0)) * 0.1;
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
    if (down.moved) {
      revealStage = 0; pendingReveal = null;
      if (globeMode) { dragGlobe(gcam, e.clientX - down.lx, e.clientY - down.ly, cam.screenW, cam.screenH); exitAfterGlide = null; }
      else panBy(cam, e.clientX - down.lx, e.clientY - down.ly);
    }
    down.lx = e.clientX;
    down.ly = e.clientY;
    return;
  }
  if (globeMode) { const p = pickGlobe(state, planet, gcam, cam.screenW, cam.screenH, e.clientX, e.clientY); hoverRegion = p && p.id !== 'home' ? p.id : null; canvas.classList.toggle('can-gather', !!p); return; }
  const n = renderer.pick(state, cam, e.clientX, e.clientY);
  hoverId = n ? n.id : null;
  hoverHumanId = n ? null : renderer.pickHuman(state, cam, e.clientX, e.clientY);
  canvas.classList.toggle('can-gather', !!n);
});
canvas.addEventListener('pointerup', (e) => {
  if (overview && e.button === 0) {
    const r = regionAt(overviewLayout(state, cam.screenW, cam.screenH), state, e.clientX, e.clientY);
    if (r && !r.home) enterRegionScene(r.id);
    return;
  }
  if (down && !down.moved && down.button === 0) {
    if (globeMode) {
      // Klikk på hjemlandet: vend hjem. Klikk på et land: se nærmere på det.
      const p = pickGlobe(state, planet, gcam, cam.screenW, cam.screenH, e.clientX, e.clientY);
      if (p?.id === 'home') exitGlobe('area');
      else if (p?.region) { const L = toLatLon(planet.sites.get(p.id).dir); globeGlide(gcam, L.lat, L.lon, Math.min(gcam.h, 0.3), reducedMotion() ? 0.01 : 1.6); exitAfterGlide = null; }
    } else {
      const n = renderer.pick(state, cam, e.clientX, e.clientY);
      if (n && !regionScene) { clickNode(state, n.id); hudTimer = 0; }
    }
  }
  down = null;
  canvas.classList.remove('dragging');
});
canvas.addEventListener('pointerleave', () => { hoverId = null; hoverHumanId = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  revealStage = 0; pendingReveal = null; // spilleren tar over kameraet
  if (globeMode) { exitAfterGlide = null; globeZoom(Math.exp(e.deltaY * 0.0022)); return; }
  // Reserve: kartoversikten åpnes/lukkes som før.
  if (overview) { if (e.deltaY < 0) goView('area', 1.2); return; }
  // Å zoome ut forbi områdevisningen løfter kameraet opp fra den samme verdenen mot planeten.
  if (e.deltaY > 0 && (state.unlocks.mapView || state.unlocks.worldView) && cam.w >= maxWorldW() * 0.97) { goView('world'); return; }
  zoomAt(cam, e.clientX, e.clientY, Math.exp(e.deltaY * 0.0012));
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  if (e.code === 'Space' && e.target.closest && e.target.closest('button')) return; // mellomrom aktiverer knappen
  if (e.code === 'Space') { e.preventDefault(); speed = speed === 0 ? savedSpeed : 0; }
  if ((e.key === 'v' || e.key === 'V') && (state.unlocks.mapView || state.unlocks.worldView)) {
    if (globeMode) exitGlobe('area');
    else if (overview) goView('area', 1.2);
    else if (globeR) enterGlobe();
    else setOverview(true);
  }
  if (e.key === 'm' || e.key === 'M') toggleSound();
  if (e.key === '1') speed = savedSpeed = 1;
  if (e.key === '2') speed = savedSpeed = 2;
  if (e.key === '3') speed = savedSpeed = 4;
});
window.addEventListener('resize', resize);
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

// ---------- Start ----------
setTimeout(() => {
  const saved = PERSIST && !params.has('fresh') ? deserialize(store.get(SAVE_KEY) || '', { seed: SEED }) : null;
  newCycle(saved);
  if (saved && saved.time > 5) hud.toast('Verden venter', 'Menneskene fortsetter der du forlot dem. Ingen tid har gått mens du var borte.');
  document.getElementById('loading').hidden = true;
  requestAnimationFrame((t) => { last = t; frame(t); });
  if (new URLSearchParams(location.search).has('debug')) {
    // Feilsøkings- og skjermbildekroker. Ikke en del av spilleropplevelsen.
    window.TFG = {
      get state() { return state; },
      get cam() { return cam; },
      get globe() { return gcam; },
      get planet() { return planet; },
      advance: (s) => advance(state, s),
      give: (w, st) => { state.resources.wood += w; state.resources.stone += st; },
      buy: (id) => purchase(state, id),
      click: (id) => clickNode(state, id),
      view: (x, y, w) => { if (globeMode) leaveGlobeNow(); cam.x = x; cam.y = y; cam.w = w; cam.tween = null; },
      // Planet: overview(true) åpner planetvisningen uten glid (skjermbilder); globeView setter kameraet direkte.
      overview: (on) => { if (on) { if (globeR) { enterGlobe({ glide: false }); gcam.h = GLOBE.continentH; } else setOverview(true); } else { if (globeMode) { gcam.h = minGlobeH(); const L = toLatLon(planet.worldToDir(cam.x, cam.y)); gcam.lat = L.lat; gcam.lon = L.lon; gcam.tween = null; exitGlobe('area'); } setOverview(false); } return globeMode || overview; },
      globeView: (lat, lon, h) => { if (!globeMode) enterGlobe({ glide: false }); gcam.lat = lat; gcam.lon = lon; gcam.h = h; gcam.tween = null; },
      enterGlobe: (glide = true) => enterGlobe({ glide }),
      visitRegion: (id) => enterRegionScene(id),
      leaveRegion: () => { leaveRegionScene(); return true; },
      get regionScene() { return regionScene?.regionProjection || null; },
      planetReady: () => planetReady,
      setSpeed: (s) => { speed = s; },
      // Lagring i feilsøking: eksplisitt, under egne nøkler (rører aldri spillerens lagring).
      // Fast døgnfase (0–1) for skjermbilder: 0,5 middag · 0,25 soloppgang · 0,75 solnedgang · 0 midnatt. null = følg klokka.
      setDay: (p) => { renderer.dayOverride = p; },
      saveAs: (key) => { localStorage.setItem('tfg.dev.' + key, serialize(state)); return true; },
      loadFrom: (key) => { const st = deserialize(localStorage.getItem('tfg.dev.' + key) || '', { seed: SEED }); if (!st) return false; newCycle(st); return true; },
      cancelGlide: () => { pendingGlide = null; pendingReveal = null; revealStage = 0; },
      get isOverview() { return globeMode || overview; },
      get isGlobe() { return globeMode; },
      get hasWebGL() { return !!globeR; },
      ambience,
      hud,
      renderStats: renderer.stats,
      renderer,
      tick: (seconds, fps = 30) => { for (let i = 0; i < seconds * fps; i++) tick(1 / fps); },
    };
  }
}, 30);
