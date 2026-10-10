// Verdenspresentasjon: oversetter spilltilstand til et levende, dybdesortert bilde.
// Leser tilstanden, men eier ingen spilleregler.
import { makeCanvas, drawSprite, clamp, smooth, taper, dab, makeNoise, fbm, mulberry, rgba } from './paint.js';
import { buildTerrain, buildEcologyOverlay, buildGrain, GRAIN_UNITS, TERRAIN_SCALE, ECOLOGY_SCALE } from './terrain.js';
import { buildEnvironment } from './environment.js';
import { generateDecor, decorSprites, SWAY_STEPS } from './decor.js';
import { treeSprite, growthLevels, treeHeight, lookVariant } from './trees.js';
import { rockSprite, visibleBoulders } from './rocks.js';
import { buildingSprite, woodPileSprite, stonePileSprite, materialSprite, pileCount } from './buildings.js';
import { drawHuman, drawHumanShadow } from './people.js';
import { createFx, emit, flyToPile, popup, shake, updateFx, shakeAngle, drawParticles, drawArcs, drawFireGlow, drawFlames, drawEmbers } from './fx.js';
import { zoomOf, viewH, screenToWorld, worldToScreen, VIEW } from '../view/camera.js';
import { gatherInterval } from '../sim/humans.js';
import { treeCapacity } from '../sim/nature.js';
import { routeKey } from '../sim/regional.js';
import { plankPileSprite, blockPileSprite } from './city.js';
import { drawOverview } from './overview.js';
import { stageRank } from '../sim/settlements.js';
import { buildStreets } from './streets.js';

export const wind = (x, t) => 0.6 * Math.sin(t * 0.9 + x * 0.003) + 0.4 * Math.sin(t * 2.1 + x * 0.009 + 1.3);

// Myk, rund skyggeflekk som skaleres og roteres til skygger (lys fra øvre venstre).
const SOFT = (() => {
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(14,12,6,0.5)');
  grad.addColorStop(0.35, 'rgba(14,12,6,0.4)');
  grad.addColorStop(0.65, 'rgba(14,12,6,0.18)');
  grad.addColorStop(1, 'rgba(14,12,6,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
})();

const WOOD_PILE_OFFSET = { x: -13, y: 0 }, STONE_PILE_OFFSET = { x: 15, y: 2 };
const WS = 3; // slitasjekartets oppløsning (piksler per slitasjecelle)
const SHADOW_ROT = 0;

const lowerBound = (arr, y) => {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].y < y) lo = m + 1; else hi = m; }
  return lo;
};

export function createRenderer(canvas) {
  const mainCtx = canvas.getContext('2d');
  let ctx = mainCtx; // byttes midlertidig når hjemmeregionen males til planetens øyeblikksbilde
  const R = { tiers: new Map(), ctx, weather: { rain: 0, wind: 0 }, view: null, terrain: null, decor: null, env: null, ecologyOverlay: null, ecologyRevision: -1, grain: null, wearCanvas: null, wearImg: null, exposure: null, wearBox: null, fx: createFx(), emitTimers: new Map(), stats: { frameMs: 0, ecologyRefreshMs: 0 } };
  const litterCache = new Map();

  R.reset = (state) => {
    R.tiers.clear();
    R.env = buildEnvironment(state);
    R.terrain = buildTerrain(state, R.env);
    R.ecologyOverlay = buildEcologyOverlay(state, R.env);
    R.ecologyRevision = state.ecology.revision;
    // Nedskalerte kopier (mip) så utzoomet visning ikke må minifisere hele det store bildet hvert bilde.
    R.terrainMips = [{ s: TERRAIN_SCALE, c: R.terrain }];
    for (const sc of [1, 0.5]) {
      const c = makeCanvas(state.world.width * sc, state.world.height * sc);
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(R.terrain, 0, 0, c.width, c.height);
      R.terrainMips.push({ s: sc, c });
    }
    R.decor = generateDecor(state, R.env);
    R.grain = ctx.createPattern(buildGrain(state.seed), 'repeat');
    R.grain.setTransform(new DOMMatrix().scale(GRAIN_UNITS / 768));
    decorSprites();
    const { cols, rows } = state.wear;
    R.wearCanvas = makeCanvas(cols * WS, rows * WS);
    R.wearImg = R.wearCanvas.getContext('2d').createImageData(cols * WS, rows * WS);
    R.exposure = new Float32Array(cols * rows);
    R.pave = new Float32Array(cols * rows); // brolagt torg i byen (presentasjon)
    R.lane = new Float32Array(cols * rows); // grusgater i tidlige byer (presentasjon)
    R.streetSig = ''; R.streets = [];
    R.wearBox = null;
    // Fast kornmønster som gir slitt jord en ujevn kant (deterministisk fra seed).
    const nz = makeNoise(state.seed + 313), rnd = mulberry(state.seed + 317);
    R.wearNoise = new Float32Array(cols * WS * rows * WS);
    for (let j = 0; j < rows * WS; j++) for (let i = 0; i < cols * WS; i++) {
      R.wearNoise[j * cols * WS + i] = 0.62 * fbm(nz, i / 9, j / 9, 3) + 0.38 * rnd();
    }
    litterCache.clear();
    R.fx = createFx();
  };

  // ---------- Hendelser fra simuleringen → visuelle reaksjoner ----------
  R.handleEvents = (state, events, cam) => {
    const fx = R.fx;
    const detailed = cam.w < VIEW.semanticAreaW;
    for (const e of events) {
      if (e.type === 'hit') {
        shake(fx, e.nodeId);
        const n = state.nodes.find((x) => x.id === e.nodeId);
        if (e.res === 'wood') {
          emit(fx, 'chip', e.x, e.y - 1, e.by === 'player' ? 6 : 3, { spread: 3, z: 6 });
          if (n && Math.random() < 0.7) emit(fx, 'leaf', e.x, e.y, 2, { spread: 22, z: treeHeight(n.species, n.growth) * 0.65 });
        } else {
          emit(fx, 'dust', e.x, e.y, e.by === 'player' ? 4 : 2, { spread: 10, z: 3 });
          emit(fx, 'chip', e.x, e.y, 3, { spread: 8, z: 6 });
          fx.parts.slice(-3).forEach((p) => { p.color = '#8d887c'; });
        }
      } else if (e.type === 'gain') {
        const sp = state.buildings.find((b) => b.type === 'storage' && b.complete) || state.stockpile;
        const off = e.res === 'wood' ? WOOD_PILE_OFFSET : STONE_PILE_OFFSET;
        if (e.manual) {
          flyToPile(fx, e.res, { x: e.x, y: e.y - 10 }, { x: sp.x + off.x, y: sp.y + off.y - 6 });
          if (detailed) popup(fx, e.x, e.y - 18, `+${e.amount}`, e.res);
        } else if (detailed) {
          popup(fx, sp.x + off.x, sp.y - 16, `+${e.amount}`, e.res);
        }
      } else if (e.type === 'treeFelled') {
        fx.falls.push({ ...e, dir: e.x % 2 > 1 ? 1 : -1, t: 0, dusted: false });
      } else if (e.type === 'sprout') {
        emit(fx, 'sprout', e.x, e.y, 6, { spread: 4, z: 2 });
      } else if (e.type === 'prayer') {
        emit(fx, 'mote', e.x, e.y, e.festival ? 9 : 4, { spread: e.festival ? 8 : 3, z: 12 });
      } else if (e.type === 'constructionComplete') {
        emit(fx, 'dust', e.x, e.y, 10, { spread: 40, spreadY: 14, z: 2 });
        emit(fx, 'mote', e.x, e.y, 10, { spread: 30, spreadY: 10, z: 16 });
      } else if (e.type === 'constructionStarted') {
        emit(fx, 'dust', e.x, e.y, 6, { spread: 30, spreadY: 10, z: 2 });
      } else if (e.type === 'tooYoung') {
        shake(fx, e.nodeId);
      } else if (e.type === 'blessing') {
        // Velsignelser (PP): et synlig svar i verden, deretter den varige virkningen.
        const C = state.settlement.center;
        emit(fx, 'mote', C.x, C.y - 20, 40, { spread: 360, spreadY: 220, z: 30 });
        if (e.kind === 'rain') { R.weather.rain = 11; for (const n of state.nodes) if (n.kind === 'tree' && n.state === 'alive' && n.growth < 0.9) emit(fx, 'sprout', n.x, n.y, 3, { spread: 4, z: 2 }); }
        else if (e.kind === 'stone') { for (const n of state.nodes) if (n.kind === 'rock') { emit(fx, 'mote', n.x, n.y - n.radius * 0.4, 8, { spread: n.radius * 1.6, spreadY: 8, z: 10 }); emit(fx, 'dust', n.x, n.y, 6, { spread: n.radius * 1.4, spreadY: 6, z: 2 }); } }
        else if (e.kind === 'wind') R.weather.wind = 8;
        else if (e.kind === 'light') { for (const b of state.buildings) if (b.complete && ['hall', 'workshop', 'sawmill', 'mason'].includes(b.type)) emit(fx, 'mote', b.x, b.y - 20, 16, { spread: 50, spreadY: 14, z: 18 }); }
      } else if (e.type === 'festival') {
        emit(fx, 'mote', e.x, e.y - 6, 26, { spread: 70, spreadY: 26, z: 14 });
        emit(fx, 'spark', e.x, e.y - 4, 12, { spread: 8 });
      }
    }
  };

  const every = (key, interval, dt) => {
    const t = (R.emitTimers.get(key) || 0) + dt;
    if (t >= interval) { R.emitTimers.set(key, t % interval); return true; }
    R.emitTimers.set(key, t);
    return false;
  };

  // Kontinuerlig liv: røyk, gnister, byggestøv og guddommelig byggelys.
  R.update = (state, dt, simDt, renderTime) => {
    const fx = R.fx;
    // Vær fra velsignelser: kort regnskur og medvind som bærer løv gjennom bildet (kun presentasjon).
    R.weather.rain = Math.max(0, R.weather.rain - dt);
    R.weather.wind = Math.max(0, R.weather.wind - dt);
    if (R.weather.wind > 0 && R.view && every('windleaf', 0.04, dt)) {
      const v = R.view, x = v.x0 + Math.random() * (v.x1 - v.x0) * 0.4, y = v.y0 + Math.random() * (v.y1 - v.y0);
      emit(fx, 'leaf', x, y, 1, { z: 18 + Math.random() * 20 });
      const p = fx.parts[fx.parts.length - 1]; p.vx = 60 + Math.random() * 50; p.max = 3.5;
    }
    // Sjelden, avgrenset oppdatering av et lavoppløst overlay. Baseterrenget,
    // dekor og mips beholdes; ingen helverdens-rebake skjer i hovedløkka.
    if (R.ecologyRevision !== state.ecology.revision) {
      const t0 = performance.now();
      R.env = buildEnvironment(state);
      R.ecologyOverlay = buildEcologyOverlay(state, R.env);
      R.ecologyRevision = state.ecology.revision;
      R.stats.ecologyRefreshMs = performance.now() - t0;
    }
    updateFx(fx, dt);
    for (const f of fx.falls) {
      if (!f.dusted && f.t > 1.3) {
        f.dusted = true;
        const len = treeHeight(f.species, f.growth) * 0.7;
        emit(fx, 'dust', f.x + f.dir * len * 0.6, f.y + 2, 10, { spread: len * 0.7, spreadY: 6, z: 2 });
      }
    }
    const w = wind(0, renderTime);
    for (const b of state.buildings) {
      if ((b.type === 'fire' || b.type === 'hearth') && b.complete) {
        if (every('smoke' + b.id, 0.22, dt)) emit(fx, 'smoke', b.x + (Math.random() - 0.5) * 2, b.y - 8, 1, { spread: 2, wind: w, z: 2, alpha: 0.2 });
        if (every('spark' + b.id, 0.9, dt)) emit(fx, 'spark', b.x, b.y - 4, 1, { spread: 3 });
      } else if (b.complete && simDt > 0 && !['field', 'market', 'mason', 'sawmill', 'hall', 'well', 'warehouse', 'sanctuary'].includes(b.type)) {
        if (every('chimney' + b.id, 1.4, dt)) emit(fx, 'smoke', b.x, b.y - 40, 1, { spread: 1.5, wind: w, light: true, alpha: 0.13 });
      } else if (!b.complete && b.divine) {
        if (every('divine' + b.id, 0.1, dt)) emit(fx, 'mote', b.x, b.y, 1, { spread: 40, spreadY: 14, z: 4 });
      } else if (!b.complete && simDt > 0 && b.builders.length) {
        if (every('build' + b.id, 0.6, dt)) emit(fx, 'dust', b.x, b.y, 2, { spread: 30, spreadY: 10, z: 3 });
      }
      if (b.complete && b.active && simDt > 0) {
        if (b.type === 'sawmill' && every('saw' + b.id, 0.28, dt)) emit(fx, 'chip', b.x - 9, b.y - 3, 2, { spread: 8, z: 5 });
        if (b.type === 'mason' && every('mason' + b.id, 0.4, dt)) { emit(fx, 'dust', b.x + 14, b.y, 1, { spread: 8, z: 4 }); emit(fx, 'chip', b.x + 14, b.y - 2, 1, { spread: 6, z: 5 }); fx.parts[fx.parts.length - 1].color = '#a7a396'; }
        if (b.type === 'hall' && every('hall' + b.id, 0.8, dt)) emit(fx, 'mote', b.x, b.y - 18, 1, { spread: 30, spreadY: 6, z: 14 });
      }
    }
  };

  // Bosettingen preger bakken: slitasje fra gange (simuleringen) pluss bar jord rundt bygg, bål og lager.
  // Alt leses fra spilltilstanden; ingenting her påvirker regler.  De faste merkene
  // starter svakt ved bygging og blir tydelige først når leiren faktisk brukes.
  const stamp = (state, x, y, r0, r1, v) => {
    const { cols, rows, cell } = state.wear;
    const i0 = Math.max(0, Math.floor((x - r1) / cell)), i1 = Math.min(cols - 1, Math.ceil((x + r1) / cell));
    const j0 = Math.max(0, Math.floor((y - r1) / cell)), j1 = Math.min(rows - 1, Math.ceil((y + r1) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot((i + 0.5) * cell - x, ((j + 0.5) * cell - y) * 1.5);
      const a = v * (1 - smooth(r0, r1, d));
      if (a > R.exposure[j * cols + i]) R.exposure[j * cols + i] = a;
    }
  };
  R.worn = (state, x, y) => {
    const w = state.wear, cx = Math.floor(x / w.cell), cy = Math.floor(y / w.cell);
    if (cx < 0 || cy < 0 || cx >= w.cols || cy >= w.rows) return 0;
    return Math.max(w.data[cy * w.cols + cx], R.exposure[cy * w.cols + cx]);
  };

  R.updateWear = (state) => {
    const { cols, rows, data, cell } = state.wear;
    const store = state.buildings.find((b) => b.type === 'storage' && b.complete) || state.stockpile;
    R.exposure.fill(0);
    const activity = clamp(state.humans.length * 0.16 + (state.totals.wood + state.totals.stone) / 130, 0, 1);
    const trackTo = (from, to, strength) => {
      // En kort rekke ujevne avtrykk kobler virkelige samlingspunkter. Den
      // kompletterer, men erstatter aldri, sporene som mennesker faktisk går.
      const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy);
      if (len < 8 || strength < 0.04) return;
      const steps = Math.min(7, Math.max(2, Math.round(len / 22)));
      for (let n = 1; n < steps; n++) {
        const t = n / steps;
        const wobble = Math.sin((from.x * 0.031 + from.y * 0.017 + n * 4.31)) * 5;
        const x = from.x + dx * t - dy / len * wobble;
        const y = from.y + dy * t + dx / len * wobble * 0.45;
        stamp(state, x, y, 3, 11 + (n % 2) * 3, strength * (0.55 + 0.45 * Math.sin(t * Math.PI)));
      }
    };
    const rk = new Map(state.settlements.map((s) => [s.id, stageRank(s.stage)]));
    for (const b of state.buildings) {
      const p = b.complete ? 1 : Math.max(0.15, b.progress);
      // I byer legger gater og gårdsplasser seg over jorda: mindre bar jord rundt hvert hus.
      const town = (rk.get(b.settlementId || 'first') ?? 0) >= 5 ? 0.55 : 1;
      const occupation = (b.complete ? 0.18 + activity * 0.82 : 0.12 + b.progress * 0.32) * (b.type === 'fire' || b.type === 'hearth' ? 1 : town);
      if (b.type === 'fire' || b.type === 'hearth') {
        stamp(state, b.x, b.y, 8, 30 + activity * 10, occupation * p);
        trackTo(b, store, activity * 0.42);
      } else {
        // Kort, avbrutt jord ved inngangen er mindre mekanisk enn en brun ring.
        stamp(state, b.x, b.y, b.radius * 0.65, b.radius * (1.1 + occupation * 0.42), occupation * p);
        const toward = store;
        const dx = toward.x - b.x, dy = toward.y - b.y, d = Math.hypot(dx, dy) || 1;
        stamp(state, b.x + dx / d * (b.radius * 0.8), b.y + dy / d * (b.radius * 0.5), 3, 12, occupation * 0.72);
        trackTo(b, toward, activity * 0.28);
      }
    }
    const storage = state.buildings.find((b) => b.type === 'storage' && b.complete);
    const sp = storage || state.stockpile;
    stamp(state, sp.x, sp.y, 9, 28, 0.22 + activity * 0.54);
    // Ingen UI-forbindelse: den regionale stien forsterkes bare når reelle
    // leveringer har fullført. Små avvik holder den som et brukt terrengspor.
    for (const other of state.settlements) {
      if (other.id === 'first') continue;
      const trips = state.network.routes[routeKey('first', other.id)]?.trips || 0;
      if (!trips) continue;
      trackTo(state.settlement.center, other, Math.min(0.62, 0.16 + trips * 0.05));
      stamp(state, other.x, other.y, 18, 58, Math.min(0.76, 0.18 + (other.projectsDone || 0) * 0.16));
    }
    // Byen legger stein: rundt torg, hall og ildsted i en bosetting som har blitt By/Storby.
    R.pave.fill(0);
    for (const S of state.settlements) {
      if (!['By', 'Storby'].includes(S.stage)) continue;
      for (const b of state.buildings) {
        if (!b.complete || (b.settlementId || 'first') !== S.id || !['market', 'hall', 'hearth'].includes(b.type)) continue;
        const r1 = b.type === 'market' ? 50 : b.type === 'hall' ? 40 : 30;
        const i0 = Math.max(0, Math.floor((b.x - r1) / cell)), i1 = Math.min(cols - 1, Math.ceil((b.x + r1) / cell));
        const j0 = Math.max(0, Math.floor((b.y - r1) / cell)), j1 = Math.min(rows - 1, Math.ceil((b.y + r1) / cell));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const jit = (((i * 73856093) ^ (j * 19349663)) >>> 0) % 1000 / 1000;
          const d = Math.hypot((i + 0.5) * cell - b.x, ((j + 0.5) * cell - b.y) * 1.45) * (0.8 + jit * 0.4);
          const v = 1 - smooth(r1 * 0.45, r1, d);
          if (v > R.pave[j * cols + i]) R.pave[j * cols + i] = v;
        }
      }
      // Gatene i storbyens kjerne: de mest brukte stiene får stein i stedet for grus.
      if (S.stage !== 'Storby') continue;
      const coreR = 120;
      const ci0 = Math.max(0, Math.floor((S.x - coreR) / cell)), ci1 = Math.min(cols - 1, Math.ceil((S.x + coreR) / cell));
      const cj0 = Math.max(0, Math.floor((S.y - coreR) / cell)), cj1 = Math.min(rows - 1, Math.ceil((S.y + coreR) / cell));
      for (let j = cj0; j <= cj1; j++) for (let i = ci0; i <= ci1; i++) {
        const k = j * cols + i, d = Math.hypot((i + 0.5) * cell - S.x, ((j + 0.5) * cell - S.y) * 1.3);
        const v = smooth(0.78, 0.97, data[k]) * (1 - smooth(coreR * 0.32, coreR * 0.58, d));
        if (v > R.pave[k]) R.pave[k] = v;
      }
    }
    // Gatenett (OPUS-02): grus i tidlige byer, stein i kjernen av byer og overalt i storbyer. Beregnes bare på nytt når bygg eller trinn endres.
    const sig = state.settlements.map((S) => S.stage).join(',') + '|' + state.buildings.reduce((n, b) => n + (b.complete ? 1 : 0), 0);
    if (sig !== R.streetSig) { R.streetSig = sig; R.streets = buildStreets(state); }
    R.lane.fill(0);
    const lay = (arr, x, y, r, v) => {
      const i0 = Math.max(0, Math.floor((x - r) / cell)), i1 = Math.min(cols - 1, Math.ceil((x + r) / cell));
      const j0 = Math.max(0, Math.floor((y - r) / cell)), j1 = Math.min(rows - 1, Math.ceil((y + r) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const a = v * (1 - smooth(r * 0.55, r, Math.hypot((i + 0.5) * cell - x, (j + 0.5) * cell - y)));
        if (a > arr[j * cols + i]) arr[j * cols + i] = a;
      }
    };
    for (const net of R.streets) for (const e of net.edges) {
      const paved = net.rank >= 6 || (net.rank >= 5 && e.core);
      for (const q of e.pts) { lay(R.lane, q.x, q.y, 11, 0.95); if (paved) lay(R.pave, q.x, q.y, 9, 0.95); }
    }
    // Skriv bare der noe er slitt (nå eller forrige gang).
    let minI = cols, maxI = -1, minJ = rows, maxJ = -1;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      if (data[k] > 0.004 || R.exposure[k] > 0.004 || R.pave[k] > 0.004 || R.lane[k] > 0.004) { if (i < minI) minI = i; if (i > maxI) maxI = i; if (j < minJ) minJ = j; if (j > maxJ) maxJ = j; }
    }
    const prev = R.wearBox;
    const cur = maxI >= 0 ? { i0: Math.max(0, minI - 1), i1: Math.min(cols - 1, maxI + 1), j0: Math.max(0, minJ - 1), j1: Math.min(rows - 1, maxJ + 1) } : null;
    const box = cur && prev ? { i0: Math.min(cur.i0, prev.i0), i1: Math.max(cur.i1, prev.i1), j0: Math.min(cur.j0, prev.j0), j1: Math.max(cur.j1, prev.j1) } : (cur || prev);
    R.wearBox = cur;
    if (!box) return;
    const Wp = cols * WS, px = R.wearImg.data, nz = R.wearNoise, ex = R.exposure, pv = R.pave, ln = R.lane;
    // Ytelse: maks(slitasje, eksponering) per celle beregnes én gang; interpolasjonen er skrevet ut uten funksjonskall.
    const M = R.wearMax || (R.wearMax = new Float32Array(cols * rows));
    for (let j = box.j0; j <= box.j1; j++) for (let i = box.i0; i <= box.i1; i++) { const k = j * cols + i; M[k] = data[k] > ex[k] ? data[k] : ex[k]; }
    for (let py = box.j0 * WS; py < (box.j1 + 1) * WS; py++) {
      const fy = (py + 0.5) / WS - 0.5, jf = Math.floor(fy), v = fy - jf;
      const j0 = jf < 0 ? 0 : jf >= rows ? rows - 1 : jf, j1 = jf + 1 >= rows ? rows - 1 : jf + 1 < 0 ? 0 : jf + 1;
      const r0 = j0 * cols, r1 = j1 * cols;
      for (let pxx = box.i0 * WS; pxx < (box.i1 + 1) * WS; pxx++) {
        const fx = (pxx + 0.5) / WS - 0.5, ifl = Math.floor(fx), u = fx - ifl;
        const i0 = ifl < 0 ? 0 : ifl >= cols ? cols - 1 : ifl, i1 = ifl + 1 >= cols ? cols - 1 : ifl + 1 < 0 ? 0 : ifl + 1;
        const a00 = r0 + i0, a10 = r0 + i1, a01 = r1 + i0, a11 = r1 + i1;
        const w = (M[a00] * (1 - u) + M[a10] * u) * (1 - v) + (M[a01] * (1 - u) + M[a11] * u) * v;
        const o = (py * Wp + pxx) * 4;
        const n = nz[py * Wp + pxx];
        // Gresset slites først i flekker; ved mye slitasje blir jorda sammenhengende bar.
        let a = smooth(0.26, 0.62, w * 1.12 + (n - 0.5) * 0.7);
        const shade = 0.78 + n * 0.5;
        let r = 112 * shade, g = 94 * shade, b = 68 * shade;
        // Ønskelinjer modnes: det som går mest, blir til en lys grusvei med småstein (historien ligger i bakken).
        const walk0 = (data[a00] * (1 - u) + data[a10] * u) * (1 - v) + (data[a01] * (1 - u) + data[a11] * u) * v;
        const lane = (ln[a00] * (1 - u) + ln[a10] * u) * (1 - v) + (ln[a01] * (1 - u) + ln[a11] * u) * v;
        const walk = walk0 > lane ? walk0 : lane;
        if (walk > 0.5) {
          const road = smooth(0.62, 0.9, walk + (n - 0.5) * 0.18);
          if (road > 0) {
            const grit = (n > 0.82 ? 1.18 : n < 0.12 ? 0.82 : 1) * (0.9 + n * 0.2);
            r += (160 * grit - r) * road; g += (146 * grit - g) * road; b += (116 * grit - b) * road;
            if (road > a) a = road;
          }
        }
        // Brolagt torg: ujevne heller; hver liten blokk får sin egen valør, fugene er svake og ikke et rutenett.
        const pave = (pv[a00] * (1 - u) + pv[a10] * u) * (1 - v) + (pv[a01] * (1 - u) + pv[a11] * u) * v;
        if (pave > 0.02) {
          const row = (py / 3) | 0, cshift = (row & 1) * 2, col = ((pxx + cshift) / 4) | 0;
          const hb = (((row * 73856093) ^ (col * 19349663)) >>> 0) % 1000 / 1000;
          const joint = (py % 3 === 0 && hb < 0.7) || ((pxx + cshift) % 4 === 0 && hb > 0.35);
          const k = smooth(0.15, 0.6, pave + (n - 0.5) * 0.4);
          const tone = (joint ? 0.84 : 1) * (0.86 + hb * 0.2 + n * 0.1);
          // Kantstein: en mørk, smal kant der gata møter jord gjør løpet lesbart som gate.
          const edge = smooth(0.08, 0.26, pave) * (1 - smooth(0.26, 0.5, pave));
          r += (154 * tone * (1 - edge * 0.38) - r) * Math.max(k, edge * 0.7); g += (147 * tone * (1 - edge * 0.38) - g) * Math.max(k, edge * 0.7); b += (130 * tone * (1 - edge * 0.38) - b) * Math.max(k, edge * 0.7);
          if (k > a) a = k;
          if (edge * 0.7 > a) a = edge * 0.7;
        }
        px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = a * 215;
      }
    }
    R.wearCanvas.getContext('2d').putImageData(R.wearImg, 0, 0);
  };

  // Verdensoversikt: en egen visning av samme tilstand (se render/overview.js).
  R.renderOverview = (state, cam, renderTime, hoverRegionId) => {
    const t0 = performance.now();
    drawOverview(ctx, R, state, { sw: cam.screenW, sh: cam.screenH, dpr: cam.dpr || 1, time: renderTime, hoverId: hoverRegionId });
    R.stats.overviewMs = (R.stats.overviewMs || 0) + (performance.now() - t0 - (R.stats.overviewMs || 0)) * 0.1;
  };

  // ---------- Treffsjekk for klikking ----------
  R.pick = (state, cam, sx, sy) => {
    const p = screenToWorld(cam, sx, sy);
    const pad = 4 / zoomOf(cam);
    let best = null;
    for (const n of state.nodes) {
      let hit = false;
      if (n.kind === 'tree') {
        if (n.state !== 'alive') continue;
        const h = treeHeight(n.species, n.growth);
        const hw = Math.max(5, h * (n.species === 'spruce' ? 0.2 : 0.3)) + pad;
        hit = p.x > n.x - hw && p.x < n.x + hw && p.y > n.y - h - pad && p.y < n.y + 4 + pad;
      } else {
        const dx = (p.x - n.x) / (n.radius * 1.15 + pad), dy = (p.y - (n.y - n.radius * 0.35)) / (n.radius * 0.8 + pad);
        hit = dx * dx + dy * dy < 1;
      }
      if (hit && (!best || n.y > best.y)) best = n;
    }
    return best;
  };

  // Arbeidsspor: kvister, flis og barkbiter som samler seg der det hugges, lagres og bygges.
  // Antall følger spillets totaler; plasseringen er deterministisk per kilde.
  const litterFor = (key, count, rx, ry, seed) => {
    let L = litterCache.get(key);
    if (!L) { L = []; litterCache.set(key, L); }
    if (L.length < count) {
      const r = mulberry(seed + L.length * 977);
      while (L.length < count) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r());
        L.push({ x: Math.cos(a) * d * rx, y: Math.sin(a) * d * ry, rot: (r() - 0.5) * 1.4, len: 2 + r() * 4, kind: r() < 0.55 ? 0 : r() < 0.75 ? 1 : 2, k: r() });
      }
    }
    return L;
  };

  // ---------- Tegning ----------
  // Øyeblikksbilde av hele hjemmeregionen (samme tegning som spillet, uten skjermpynt) til planetvisningen.
  R.snapshot = (state, renderTime, width = 1536) => {
    const W = state.world.width, H = state.world.height, h = Math.round(width * H / W);
    if (!R.snapCanvas || R.snapCanvas.width !== width) R.snapCanvas = makeCanvas(width, h);
    const saved = ctx;
    ctx = R.snapCanvas.getContext('2d');
    try { R.render(state, { x: W / 2, y: H / 2, w: W, screenW: width, screenH: h, dpr: 1 }, renderTime, null, { snapshot: true }); } finally { ctx = saved; }
    return R.snapCanvas;
  };

  R.render = (state, cam, renderTime, hoverId, opts = {}) => {
    const t0 = performance.now();
    const snapshot = !!opts.snapshot;
    const dpr = cam.dpr || 1;
    const z = zoomOf(cam);
    const S = dpr * z;
    const E = dpr * (cam.screenW / 2) - cam.x * S, F = dpr * (cam.screenH / 2) - cam.y * S;
    const { width: W, height: H, pond } = state.world;
    const vh = viewH(cam);
    const vx0 = cam.x - cam.w / 2, vx1 = cam.x + cam.w / 2, vy0 = cam.y - vh / 2, vy1 = cam.y + vh / 2;
    const inView = (x, y, mx = 70, up = 150) => x > vx0 - mx && x < vx1 + mx && y > vy0 - 20 && y < vy1 + up;
    const detailed = cam.w < VIEW.semanticAreaW;
    const C = state.settlement.center;
    if (!snapshot) R.view = { x0: vx0, x1: vx1, y0: vy0, y1: vy1 };
    const festival = state.time < (state.civilization?.festivalUntil ?? -Infinity);
    // Detaljnivå: finkorn og småplanter tones inn når vi zoomer nær og forsvinner jevnt når vi trekker ut.
    const detail = smooth(0.8, 1.6, S);
    const mid = smooth(0.4, 0.8, S);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2c3222';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(S, 0, 0, S, E, F);
    ctx.imageSmoothingEnabled = true;
    // Sprites males med 3 px/enhet: ved vanlig zoom er nedskalering liten, og bilineær er nok (og mye raskere enn 'high').
    ctx.imageSmoothingQuality = S > 2.4 ? 'medium' : 'low';

    // Terreng.
    const sx0 = clamp(vx0 - 4, 0, W), sy0 = clamp(vy0 - 4, 0, H), sx1 = clamp(vx1 + 4, 0, W), sy1 = clamp(vy1 + 4, 0, H);
    // Velg det minste terrengbildet som fortsatt gir minst ett kildepiksel per skjermpiksel.
    let tm = R.terrainMips[0];
    for (const m of R.terrainMips) if (m.s >= S * 0.85) tm = m;
    ctx.imageSmoothingQuality = 'low'; // bilineær er rask og nok når mip-nivået velges etter zoom
    ctx.drawImage(tm.c, sx0 * tm.s, sy0 * tm.s, (sx1 - sx0) * tm.s, (sy1 - sy0) * tm.s, sx0, sy0, sx1 - sx0, sy1 - sy0);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(R.ecologyOverlay, sx0 * ECOLOGY_SCALE, sy0 * ECOLOGY_SCALE, (sx1 - sx0) * ECOLOGY_SCALE, (sy1 - sy0) * ECOLOGY_SCALE, sx0, sy0, sx1 - sx0, sy1 - sy0);
    ctx.globalAlpha = 1;

    ctx.imageSmoothingQuality = S > 2.4 ? 'medium' : 'low';
    // Finkorn: en sømløs flis holder bakken levende ved nærzoom uten synlig gjentakelse.
    if (detail > 0.02) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx0, sy0, sx1 - sx0, sy1 - sy0);
      ctx.clip();
      ctx.globalAlpha = 0.22 * detail;
      ctx.fillStyle = R.grain;
      ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
      ctx.restore();
    }

    // Slitasje og bar jord rundt bosettingen.
    ctx.drawImage(R.wearCanvas, 0, 0, W, H);

    // Lysglimt på vannet.
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39 + renderTime * 0.03;
      const x = pond.x + Math.cos(a) * pond.rx * 0.6 * ((i % 4) / 4 + 0.2);
      const y = pond.y + Math.sin(a * 1.3) * pond.ry * 0.55;
      ctx.fillStyle = `rgba(200,214,210,${(0.05 + 0.05 * Math.sin(renderTime * 1.3 + i)).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 6 + (i % 3) * 3, 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const sprs = decorSprites();
    const blockers = state.buildings;
    const sp = state.stockpile;
    const fx = R.fx;

    // Bakkedekor (gress, bregner, kvister, småstein) — kun ved nærlesning, tonet inn med zoom.
    if (detail > 0.02) {
      const ground = R.decor.ground;
      const from = lowerBound(ground, vy0 - 24), to = lowerBound(ground, vy1 + 12);
      let lastAlpha = -1;
      for (let i = from; i < to; i++) {
        const t = ground[i];
        if (t.x < vx0 - 22 || t.x > vx1 + 22) continue;
        const wr = R.worn(state, t.x, t.y);
        const alpha = (1 - clamp(wr * 1.6)) * detail;
        if (alpha < 0.05) continue;
        let hidden = Math.abs(t.x - sp.x) < 30 && Math.abs(t.y - sp.y) < 10;
        if (!hidden) for (const b of blockers) if (Math.abs(t.x - b.x) < b.radius * 0.8 && Math.abs(t.y - b.y) < b.radius * 0.45) { hidden = true; break; }
        if (hidden) continue;
        let s;
        if (t.kind === 'tuft' || t.kind === 'fern') {
          const sw = wind(t.x, renderTime + t.phase * 0.1) * (t.kind === 'tuft' ? 1 : 0.32);
          const fr = sprs[t.kind === 'tuft' ? 'tufts' : 'ferns'][t.v];
          s = fr[Math.max(0, Math.min(SWAY_STEPS - 1, Math.round(sw * 2 + 2)))];
        } else s = t.kind === 'stick' ? sprs.sticks[t.v] : sprs.stones[t.v];
        if (alpha !== lastAlpha) { ctx.globalAlpha = alpha; lastAlpha = alpha; }
        ctx.drawImage(s.canvas, t.x - s.ax * t.s, t.y - s.ay * t.s, s.w * t.s, s.h * t.s);
      }
      ctx.globalAlpha = 1;

      // Arbeidsspor fra spilltilstanden.
      drawWorkLitter(state);
    }

    // Skygger (lys fra øvre venstre → skygge mot nedre høyre): lang og myk, med tettere kontaktskygge ved foten.
    for (const n of state.nodes) {
      if (n.kind !== 'tree' || n.state !== 'alive' || !inView(n.x, n.y, 90)) continue;
      const h = treeHeight(n.species, n.growth);
      if (n.species === 'spruce') {
        shadow(n.x + h * 0.2, n.y + h * 0.045, h * 0.34, 3 + h * 0.07, 0.5);
      } else {
        shadow(n.x + h * 0.08, n.y + h * 0.02, h * 0.3, 2 + h * 0.035, 0.3);
        shadow(n.x + h * 0.3, n.y + h * 0.05, h * 0.3, 3 + h * 0.07, 0.3);
      }
      shadow(n.x + 0.8, n.y + 0.2, 3.4 + h * 0.03, 1.6, 0.55);
    }
    for (const b of state.buildings) {
      if (b.type === 'fire' || b.type === 'hearth' || b.progress < 0.5) continue;
      shadow(b.x + b.radius * 0.45, b.y + b.radius * 0.18, b.radius * 1.3, b.radius * 0.42, 0.55);
    }
    for (const h of state.humans) if (!h.away && inView(h.x, h.y)) drawHumanShadow(ctx, h);
    for (const c of state.globe.caravans) if (inView(c.x, c.y)) drawHumanShadow(ctx, caravanFigure(c));

    // Dybdesorterte objekter.
    const list = [];
    for (const n of state.nodes) {
      if (!inView(n.x, n.y)) continue;
      list.push({ y: n.y, draw: () => (n.kind === 'tree' ? drawTree(n) : drawRock(n)) });
    }
    if (mid > 0.02) {
      const up = R.decor.upright;
      const from = lowerBound(up, vy0 - 10), to = lowerBound(up, vy1 + 90);
      for (let i = from; i < to; i++) {
        const u = up[i];
        if (u.x < vx0 - 60 || u.x > vx1 + 60) continue;
        if (u.kind === 'sapling' && detail < 0.3) continue;
        if (blockers.some((q) => Math.hypot(q.x - u.x, q.y - u.y) < q.radius + 8)) continue;
        list.push({ y: u.y, draw: () => drawUpright(u) });
      }
    }
    for (const b of state.buildings) {
      list.push({ y: b.y, draw: () => drawBuilding(b) });
      if (!b.complete) {
        const n = Math.ceil((1 - b.progress) * 5);
        list.push({ y: b.y + 8, draw: () => drawSprite(ctx, materialSprite(n), b.x + b.radius + 4, b.y + 8) });
      }
    }
    list.push({ y: sp.y + WOOD_PILE_OFFSET.y, draw: () => drawSprite(ctx, woodPileSprite(pileCount(state.resources.wood)), sp.x + WOOD_PILE_OFFSET.x, sp.y + WOOD_PILE_OFFSET.y) });
    list.push({ y: sp.y + STONE_PILE_OFFSET.y, draw: () => drawSprite(ctx, stonePileSprite(pileCount(state.resources.stone)), sp.x + STONE_PILE_OFFSET.x, sp.y + STONE_PILE_OFFSET.y) });
    const hInfo = { time: state.time, gatherInterval: gatherInterval(state), renderTime };
    const rankOf = new Map(state.settlements.map((q) => [q.id, stageRank(q.stage)]));
    const sanctIdx = new Map(state.buildings.filter((q) => q.type === 'sanctuary').sort((a, b) => a.id - b.id).map((q, i) => [q.id, i]));
    const variantOf = (b) => (b.type === 'hut' ? ((rankOf.get(b.settlementId || 'first') ?? 0) >= 4 ? 1 : 0) : b.type === 'sanctuary' ? sanctIdx.get(b.id) : 0);
    for (const h of state.humans) if (!h.away && inView(h.x, h.y)) list.push({ y: h.y, draw: () => drawHuman(ctx, h, hInfo) });
    // Karavaner fra fjerne land: ekte figurer som går inn over kartkanten med varer.
    for (const c of state.globe.caravans) if (inView(c.x, c.y)) list.push({ y: c.y, draw: () => drawHuman(ctx, caravanFigure(c), hInfo) });
    // Foredlede varer lagres synlig ved lageret.
    if (state.resources.planks >= 1) list.push({ y: sp.y + 6, draw: () => drawSprite(ctx, plankPileSprite(Math.min(14, Math.ceil(Math.sqrt(state.resources.planks) * 1.6))), sp.x - 36, sp.y + 8) });
    if (state.resources.cutstone >= 1) list.push({ y: sp.y + 8, draw: () => drawSprite(ctx, blockPileSprite(Math.min(18, Math.ceil(Math.sqrt(state.resources.cutstone) * 2))), sp.x + 40, sp.y + 10) });
    for (const f of fx.falls) list.push({ y: f.y + 0.5, draw: () => drawFall(f) });
    // Minnesteiner ved tjernet: én for hver avsluttet syklus (arv, bare presentasjon — påvirker ingen regler).
    const stones = state.legacy?.stones || [];
    stones.forEach((m, i) => {
      const a = -Math.PI / 2 + (i - (stones.length - 1) / 2) * 0.2;
      const x = pond.x + Math.cos(a) * (pond.rx + 12), y = pond.y + Math.sin(a) * (pond.ry + 9);
      if (inView(x, y)) list.push({ y, draw: () => drawMemorial(x, y, m.n) });
    });
    list.sort((a, b) => a.y - b.y);
    for (const o of list) o.draw();

    // Partikler og lys.
    drawParticles(ctx, fx, false);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of state.buildings) {
      if (b.type === 'sanctuary' && b.complete && sanctIdx.get(b.id) === 3) { drawFireGlow(ctx, b.x, b.y - 38, renderTime); drawFlames(ctx, b.x, b.y - 38, renderTime); continue; }
      if ((b.type !== 'fire' && b.type !== 'hearth') || !b.complete) continue;
      drawFireGlow(ctx, b.x, b.y, renderTime);
      if (festival && b.type === 'hearth') drawFireGlow(ctx, b.x, b.y - 2, renderTime * 1.3); // høstfest: større, varmere ild
      drawEmbers(ctx, b.x, b.y, renderTime);
      drawFlames(ctx, b.x, b.y - 1, renderTime);
    }
    drawParticles(ctx, fx, true);
    ctx.globalCompositeOperation = 'source-over';
    drawArcs(ctx, fx);

    // Visuell hierarki: leiren er blikkfanget, skogen lenger ute dempes svakt.
    if (state.buildings.length && !snapshot) {
      const gx0 = sx0, gy0 = sy0, gw = sx1 - sx0, gh = sy1 - sy0;
      const dim = ctx.createRadialGradient(C.x, C.y, 340, C.x, C.y, 1250);
      dim.addColorStop(0, 'rgba(10,14,8,0)');
      dim.addColorStop(1, 'rgba(10,14,8,0.2)');
      ctx.fillStyle = dim;
      ctx.fillRect(gx0, gy0, gw, gh);
      ctx.globalCompositeOperation = 'lighter';
      const warm = ctx.createRadialGradient(C.x, C.y, 10, C.x, C.y, 300);
      warm.addColorStop(0, 'rgba(255,228,170,0.055)');
      warm.addColorStop(1, 'rgba(255,228,170,0)');
      ctx.fillStyle = warm;
      ctx.fillRect(gx0, gy0, gw, gh);
      ctx.globalCompositeOperation = 'source-over';
    }

    if (snapshot) { ctx.setTransform(1, 0, 0, 1, 0, 0); return; }
    // Skjermrom: fargetone, lett vignett, små gevinsttall og områdeetikett.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sw = cam.screenW, sh = cam.screenH;
    ctx.fillStyle = 'rgba(255,214,160,0.04)';
    ctx.fillRect(0, 0, sw, sh);
    const vg = ctx.createRadialGradient(sw / 2, sh / 2, Math.min(sw, sh) * 0.4, sw / 2, sh / 2, Math.max(sw, sh) * 0.78);
    vg.addColorStop(0, 'rgba(10,8,4,0)');
    vg.addColorStop(1, 'rgba(10,8,4,0.18)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, sw, sh);

    if (R.weather.rain > 0) {
      const k = Math.min(1, R.weather.rain / 2, (11 - R.weather.rain) / 1.5);
      ctx.fillStyle = `rgba(36,46,56,${(0.1 * k).toFixed(3)})`; ctx.fillRect(0, 0, sw, sh);
      ctx.strokeStyle = `rgba(200,212,220,${(0.32 * k).toFixed(3)})`; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 220; i++) {
        const sx = ((i * 97.13 + renderTime * 40) % (sw + 60)) - 30, sy = ((i * 53.71 + renderTime * 620 + (i % 7) * 90) % (sh + 40)) - 20;
        ctx.moveTo(sx, sy); ctx.lineTo(sx - 3, sy + 13);
      }
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.font = '600 13px Georgia, "Palatino Linotype", serif';
    for (const p of fx.popups) {
      const s = worldToScreen(cam, p.x, p.y);
      const a = 1 - clamp((p.age - 0.7) / 0.6);
      ctx.fillStyle = `rgba(20,14,8,${(0.5 * a).toFixed(3)})`;
      ctx.fillText(p.text, s.x + 1, s.y - p.age * 22 + 1);
      ctx.fillStyle = p.res === 'wood' ? `rgba(240,214,170,${a.toFixed(3)})` : `rgba(222,222,214,${a.toFixed(3)})`;
      ctx.fillText(p.text, s.x, s.y - p.age * 22);
    }

    const areaK = smooth(VIEW.semanticAreaW * 0.9, VIEW.semanticAreaW * 1.25, cam.w);
    if (areaK > 0 && state.buildings.length) {
      ctx.globalAlpha = areaK;
      ctx.textAlign = 'center';
      for (const S of state.settlements) {
        if (S.id !== 'first' && S.state === 'founding' && !state.buildings.some((q) => q.settlementId === S.id)) continue;
        const isFirst = S.id === 'first';
        const s = worldToScreen(cam, S.x, S.y - (isFirst ? 120 : 90));
        const name = isFirst ? (['By', 'Storby'].includes(S.stage) ? 'Den første byen' : state.milestones.first_village != null ? 'Den første landsbyen' : 'Den første boplassen') : S.name;
        const homes = state.buildings.filter((q) => q.complete && q.settlementId === S.id && (q.type === 'hut' || q.type === 'shelter' || q.type === 'townhouse')).length;
        ctx.font = 'italic 15px Georgia, "Palatino Linotype", serif';
        ctx.fillStyle = 'rgba(16,12,8,0.55)'; ctx.fillText(name, s.x + 1, s.y + 1);
        ctx.fillStyle = '#efe4cc'; ctx.fillText(name, s.x, s.y);
        ctx.font = '12px "Segoe UI", system-ui, sans-serif'; ctx.fillStyle = 'rgba(236,226,204,0.85)';
        ctx.fillText(`${S.stage} · ${S.role} · ${S.population.length} mennesker · ${homes} hjem`, s.x, s.y + 17);
      }
      ctx.globalAlpha = 1;
      if (state.expansion?.discovered && !state.expansion.founded && state.expansion.site) {
        const s2 = worldToScreen(cam, state.expansion.site.x, state.expansion.site.y);
        ctx.globalAlpha = areaK * 0.75; ctx.fillStyle = '#d7c58e'; ctx.beginPath(); ctx.arc(s2.x, s2.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
      const party = state.realm.party;
      if (party) {
        const s3 = worldToScreen(cam, party.site.x, party.site.y);
        ctx.globalAlpha = areaK * 0.75; ctx.fillStyle = '#d7c58e'; ctx.beginPath(); ctx.arc(s3.x, s3.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    R.stats.frameMs += (performance.now() - t0 - R.stats.frameMs) * 0.1;

    // --- lokale tegnefunksjoner ---
    function shadow(x, y, rx, ry, a) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(SHADOW_ROT);
      ctx.globalAlpha = a;
      ctx.drawImage(SOFT, -rx, -ry, rx * 2, ry * 2);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawWorkLitter(st) {
      const livedIn = clamp(st.humans.length * 0.16 + (st.totals.wood + st.totals.stone) / 130, 0, 1);
      const lit = (key, count, rx, ry, seed, cx, cy, wood) => {
        const L = litterFor(key, count, rx, ry, seed);
        for (let i = 0; i < count; i++) {
          const q = L[i], x = cx + q.x, y = cy + q.y;
          if (x < vx0 - 10 || x > vx1 + 10 || y < vy0 - 10 || y > vy1 + 10) continue;
          if (q.kind === 0 && wood) { // kvist / avkapp
            taper(ctx, x - q.len, y - q.rot * q.len * 0.4, x + q.len, y + q.rot * q.len * 0.4, 0.9 + q.k * 0.5, 0.6, q.k < 0.5 ? 'rgb(94,72,52)' : 'rgb(122,98,68)');
            dab(ctx, x + q.len, y + q.rot * q.len * 0.4, 0.35, 0.45, 0, 'rgba(206,178,132,0.9)');
          } else if (q.kind === 1) { // flis / bark
            dab(ctx, x, y, 0.9 + q.k * 0.7, 0.45, q.rot, wood ? 'rgba(196,168,120,0.85)' : 'rgba(160,156,144,0.85)');
          } else { // bark / grus
            dab(ctx, x, y, 0.8 + q.k * 0.8, 0.5, q.rot, wood ? 'rgba(86,62,44,0.85)' : 'rgba(110,106,96,0.85)');
          }
        }
      };
      // Ved lageret: spon og kvister øker med innhøstet trevirke; steingrus med brutt stein.
      lit('sp-w', Math.min(46, Math.floor(st.totals.wood / 2.5)), 38, 15, 11, sp.x - 6, sp.y + 4, true);
      lit('sp-s', Math.min(34, Math.floor(st.totals.stone / 2.5)), 30, 11, 23, sp.x + 22, sp.y + 4, false);
      // Rundt byggeplasser og bygg: byggeavfall er tydeligst mens noe reises.
      // Etterpå blir bare et fåtall bruksspor liggende, og det øker med aktivitet.
      for (const b of st.buildings) {
        const base = b.type === 'fire' ? 6 : 16;
        const count = b.complete
          ? Math.round(base * (0.24 + livedIn * 0.42))
          : Math.round(base * (0.32 + b.progress * 0.68));
        lit('b' + b.id, count, b.radius * 1.35, b.radius * 0.52, b.id * 53, b.x, b.y + b.radius * 0.35, true);
      }
      // Ved felte trær: bark og flis rundt stubben.
      for (const n of st.nodes) {
        if (n.kind !== 'tree' || !n.stump || !inView(n.x, n.y, 20)) continue;
        lit('st' + n.id, 7, 9, 3.4, n.id * 31, n.x, n.y + 1, true);
      }
    }
    // Svai uten skjev transformasjon: sprite tegnes i tre vannrette skiver forskjøvet mot toppen (rask, aksejustert).
    function swaySprite(s, x, y, sk, flip, alpha) {
      if (alpha <= 0) return;
      if (alpha < 1) ctx.globalAlpha = alpha;
      const N = Math.abs(sk) * s.h < 0.35 ? 1 : 3, ph = s.canvas.height / N, uh = s.h / N, w = s.canvas.width;
      for (let i = 0; i < N; i++) {
        const sy = i * ph, over = i < N - 1 ? 2 : 0;
        const dx = -sk * ((i + 0.5) * uh - s.ay);
        const dh = ph + over;
        ctx.save();
        ctx.translate(x + dx, y);
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(s.canvas, 0, sy, w, Math.min(dh, s.canvas.height - sy), -s.ax, i * uh - s.ay, s.w, (Math.min(dh, s.canvas.height - sy) / ph) * uh);
        ctx.restore();
      }
      if (alpha < 1) ctx.globalAlpha = 1;
    }
    function drawUpright(u) {
      if (u.kind === 'bush') drawSprite(ctx, sprs.bushes[u.v], u.x, u.y);
      else if (u.kind === 'log') {
        const s = sprs.logs[u.v];
        if (u.flip) { ctx.save(); ctx.translate(u.x, u.y); ctx.scale(-1, 1); drawSprite(ctx, s, 0, 0); ctx.restore(); } else drawSprite(ctx, s, u.x, u.y);
      } else {
        swaySprite(treeSprite(u.species, u.variant, u.k), u.x, u.y, wind(u.x, renderTime) * 0.02, u.flip, 1);
      }
    }
    function drawTree(n) {
      if (n.stump) drawStump(n);
      if (n.state !== 'alive') return;
      const { k, f } = growthLevels(n.growth);
      const v = lookVariant(n);
      const s0 = treeSprite(n.species, v, k);
      const sk = wind(n.x, renderTime) * 0.012 * (0.4 + n.growth) + shakeAngle(fx, n.id);
      if (hoverId === n.id) ctx.filter = 'brightness(1.16)';
      swaySprite(s0, n.x, n.y, sk, n.id % 2 === 1, 1);
      // Blanding mellom vekststadier hoppes over når treet er langt unna (usynlig forskjell, halv kostnad).
      if (f > 0.02 && S > 0.7) swaySprite(treeSprite(n.species, v, k + 1), n.x, n.y, sk, n.id % 2 === 1, f);
      ctx.filter = 'none';
      if (n.chopped > 0) {
        // Hogstskår i stammen: dypere jo mer som er hugget.
        const cap = Math.max(1, treeCapacity(n));
        const depth = clamp(n.chopped / cap) * (1 + n.growth * 4.5) * 0.9;
        ctx.fillStyle = '#2a2018';
        ctx.beginPath();
        ctx.moveTo(n.x + 0.2, n.y - 3.4);
        ctx.lineTo(n.x + 0.2 + depth, n.y - 2.3);
        ctx.lineTo(n.x + 0.2, n.y - 1.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d8bc8c';
        ctx.fillRect(n.x + 0.2, n.y - 3, Math.max(0.3, depth * 0.6), 0.5);
      }
    }
    function drawStump(n) {
      const g = n.fellGrowth || 0.6;
      const r = 1 + g * 2.6;
      const h = 2 + g * 1.5;
      const birch = n.species === 'birch';
      // Rotanlegg og skygge ved foten.
      dab(ctx, n.x + 0.6, n.y + 0.4, r * 1.5, r * 0.5, 0, 'rgba(20,16,10,0.35)');
      ctx.fillStyle = birch ? '#a8a294' : '#5c4432';
      ctx.beginPath();
      ctx.moveTo(n.x - r * 1.25, n.y + 0.2);
      ctx.quadraticCurveTo(n.x - r, n.y - h * 0.5, n.x - r * 0.9, n.y - h);
      ctx.lineTo(n.x + r * 0.9, n.y - h);
      ctx.quadraticCurveTo(n.x + r, n.y - h * 0.5, n.x + r * 1.25, n.y + 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(n.x + r * 0.25, n.y - h, r * 0.75, h);
      ctx.strokeStyle = 'rgba(30,22,14,0.5)';
      ctx.lineWidth = 0.25;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(n.x + i * r * 0.35, n.y - h); ctx.lineTo(n.x + i * r * 0.42, n.y); ctx.stroke(); }
      ctx.fillStyle = '#c9ab7e';
      ctx.beginPath();
      ctx.ellipse(n.x, n.y - h, r, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,90,60,0.6)';
      ctx.lineWidth = 0.22;
      for (const q of [0.78, 0.52, 0.28]) { ctx.beginPath(); ctx.ellipse(n.x, n.y - h, r * q, r * 0.42 * q, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    function drawRock(n) {
      const s = rockSprite(n, visibleBoulders(n));
      const sa = shakeAngle(fx, n.id) * 18;
      if (hoverId === n.id) ctx.filter = 'brightness(1.18)';
      drawSprite(ctx, s, n.x + sa, n.y);
      ctx.filter = 'none';
    }
    function caravanFigure(c) {
      const res = c.goods[0].res;
      return { id: c.id, x: c.x, y: c.y, dir: c.dir, look: c.look, walk: c.walk, state: 'toStore', carry: { type: res === 'wood' || res === 'planks' || res === 'food' ? 'wood' : 'stone', amount: 3 }, born: -10, anim: 0, gatherKind: null };
    }
    function drawBuilding(b) {
      const v = variantOf(b);
      // Byen bygger om halmhyttene til tømmerstuer: et lite støvskyll når utseendet skifter.
      const prevV = R.tiers.get(b.id);
      if (prevV !== undefined && prevV !== v && !snapshot) { emit(fx, 'dust', b.x, b.y, 12, { spread: 26, spreadY: 9, z: 2 }); emit(fx, 'mote', b.x, b.y, 8, { spread: 20, spreadY: 8, z: 14 }); }
      R.tiers.set(b.id, v);
      const s = buildingSprite(b, v);
      drawSprite(ctx, s, b.x, b.y);
      if (b.type === 'sawmill' && b.complete && b.active) {
        // Sagbladet går opp og ned mens sagbruket arbeider.
        const off = Math.sin(renderTime * 8 + b.id) * 2.6;
        taper(ctx, b.x - 10, b.y - 7 + off, b.x - 6.2, b.y - 22 + off, 0.9, 0.9, 'rgb(170,172,168)');
      }
    }
    function drawMemorial(x, y, n) {
      // En reist stein med lav, mose og innhugne tegn — én for hver syklus som er levd.
      const h = 15 + (n % 3) * 3, w = 5.5 + (n % 2);
      dab(ctx, x + 3, y + 0.6, w * 1.6, 2.2, 0, 'rgba(18,14,8,0.4)');
      ctx.fillStyle = '#6f6c64';
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w - 0.8, y - h * 0.6, x - w * 0.55, y - h); ctx.quadraticCurveTo(x, y - h - 2.4, x + w * 0.6, y - h + 0.6); ctx.quadraticCurveTo(x + w + 0.6, y - h * 0.5, x + w, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.24)'; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y); ctx.lineTo(x + w * 0.5, y - h + 1); ctx.quadraticCurveTo(x + w + 0.6, y - h * 0.5, x + w, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(214,208,190,0.28)'; ctx.fillRect(x - w * 0.6, y - h * 0.9, w * 0.35, h * 0.7);
      dab(ctx, x - w * 0.4, y - 1.4, w * 0.7, 1.4, 0.1, 'rgba(84,104,52,0.8)');
      ctx.strokeStyle = 'rgba(40,34,26,0.75)'; ctx.lineWidth = 0.45;
      for (let k = 0; k < Math.min(5, n); k++) { const yy = y - h * 0.78 + k * 2.4; ctx.beginPath(); ctx.moveTo(x - 1.6, yy); ctx.lineTo(x + 1.4, yy + 0.8); ctx.moveTo(x, yy - 0.8); ctx.lineTo(x, yy + 1.6); ctx.stroke(); }
    }
    function drawFall(f) {
      const T = 1.3;
      const len = treeHeight(f.species, f.growth);
      const v = lookVariant(f);
      const { k } = growthLevels(f.growth);
      const s = treeSprite(f.species, v, Math.min(k + 1, 11));
      const fall = (Math.PI / 2) * f.dir * 0.92;
      // Treet faller, blir liggende med krone og greiner, og går gradvis over i en kappet stokk.
      const lying = f.t < T ? 1 : 1 - clamp((f.t - 3.2) / 3);
      if (lying > 0) {
        const a = f.t < T ? Math.pow(f.t / T, 2.2) * fall : fall + Math.sin(clamp((f.t - T) / 0.5) * Math.PI) * 0.04 * f.dir;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(a);
        ctx.globalAlpha = lying;
        drawSprite(ctx, s, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (f.t >= 3.2) {
        const alpha = clamp((f.t - 3.2) / 2) * (1 - clamp((f.t - 6) / 3));
        if (alpha <= 0) return;
        const L = clamp(len * 0.42, 14, 44), r = 0.9 + f.growth * 2.3;
        const x0 = f.x + f.dir * 2.5, y0 = f.y + 1.2, x1 = x0 + f.dir * L, y1 = y0 + 1;
        const bark = f.species === 'birch' ? [170, 164, 150] : [92, 68, 48];
        ctx.globalAlpha = alpha;
        dab(ctx, (x0 + x1) / 2 + 0.6, y0 + r * 0.8, L * 0.52, r * 0.8, 0.02, 'rgba(18,14,8,0.35)');
        taper(ctx, x0, y0 - r, x1, y1 - r * 0.9, r * 2, r * 1.65, rgba(bark, 1));
        taper(ctx, x0, y0 - r * 0.45, x1, y1 - r * 0.4, r * 0.9, r * 0.75, 'rgba(0,0,0,0.28)');
        taper(ctx, x0, y0 - r * 1.4, x1, y1 - r * 1.3, r * 0.35, r * 0.3, 'rgba(236,220,186,0.28)');
        ctx.fillStyle = '#d4b688';
        ctx.beginPath();
        ctx.ellipse(x0, y0 - r, r * 0.45, r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,90,60,0.6)';
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.ellipse(x0, y0 - r, r * 0.22, r * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 3; i++) taper(ctx, x0 + f.dir * L * (0.3 + i * 0.22), y0 - r * 1.6, x0 + f.dir * (L * (0.3 + i * 0.22) + 3), y0 - r * 1.6 - 2.4 - i * 0.6, 0.6, 0.3, rgba(bark, 1));
        // Grønne kvister og nåler ved toppen.
        for (let i = 0; i < 9; i++) dab(ctx, x1 + f.dir * (1 + (i % 3) * 1.6), y1 - r * 0.6 + ((i * 7) % 5) * 0.5 - 1, 1.6, 0.7, (i % 4) * 0.5, f.species === 'birch' ? 'rgba(96,114,52,0.85)' : 'rgba(34,52,38,0.9)');
        ctx.globalAlpha = 1;
      }
    }
  };

  return R;
}
