// Oppretter den identiske startverdenen for en syklus (samme seed → samme verden).
import { BALANCE as B } from '../data/balance.js';
import { createRng, rand, range } from '../core/rng.js';

export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export function inPond(state, x, y, margin = 0) {
  const p = state.world.pond;
  const dx = (x - p.x) / (p.rx + margin);
  const dy = (y - p.y) / (p.ry + margin);
  return dx * dx + dy * dy < 1;
}

export function inBounds(state, x, y, margin) {
  return x > margin && y > margin && x < state.world.width - margin && y < state.world.height - margin;
}

// Gyldig sted for et tre (verdensgenerering og frøspredning).
export function isFreeForTree(state, x, y) {
  if (!inBounds(state, x, y, 30) || inPond(state, x, y, 22)) return false;
  const C = state.settlement.center;
  if (dist(x, y, C.x, C.y) < B.settlement.clearRadius) return false;
  if (dist(x, y, state.stockpile.x, state.stockpile.y) < 50) return false;
  for (const n of state.nodes) {
    const need = n.kind === 'tree' ? B.tree.minSpacing : n.radius + 16;
    if (dist(x, y, n.x, n.y) < need) return false;
  }
  for (const b of state.buildings) if (dist(x, y, b.x, b.y) < b.radius + 26) return false;
  return true;
}

export function makeTree(state, species, x, y, growth) {
  return {
    id: state.nextId++, kind: 'tree', species, variant: Math.floor(rand(state.rng) * 4),
    x, y, growth, chopped: 0, state: 'alive', timer: 0, stump: false,
    vigor: range(state.rng, 0.85, 1.15), reservedBy: [],
  };
}

function addTree(state, species, x, y, growth) {
  if (state.nodes.filter((n) => n.kind === 'tree').length >= B.tree.maxTrees) return null;
  const t = makeTree(state, species, x, y, growth);
  state.nodes.push(t);
  return t;
}

function addRock(state, x, y, radius) {
  const maxStone = Math.round(radius * 0.9);
  const node = { id: state.nextId++, kind: 'rock', x, y, radius, stone: maxStone, maxStone, regenTimer: 0, reservedBy: [] };
  state.nodes.push(node);
  return node;
}

export function createWorld(seed = 20261009) {
  const rng = createRng(seed);
  const W = B.world.width, H = B.world.height;
  const C = { x: W / 2, y: H / 2 + 20 };
  const cell = B.wear.cell;
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  const state = {
    version: 1, seed, rng, time: 0, nextId: 1,
    world: { width: W, height: H, pond: { x: C.x - 360, y: C.y + 210, rx: 130, ry: 64 } },
    settlement: { center: C, angleOffset: 0 },
    stockpile: { x: C.x + 4, y: C.y + 48 },
    resources: { wood: 0, stone: 0, pp: 0 },
    totals: { wood: 0, stone: 0, pp: 0, manualClicks: 0 },
    upgrades: {},
    discovered: {}, // innsikt-id → spilltid da den ble synlig (se discovery.js)
    modifiers: { gatherSpeed: 1, carry: 0, buildSpeed: 1 },
    nodes: [], buildings: [], humans: [],
    milestones: {}, unlocks: { zoomArea: false, villageView: false },
    timers: { seed: B.tree.seedIntervalSeconds, wearDecay: 0 },
    stats: { log: [], autoStart: null },
    wear: { cell, cols, rows, data: new Float32Array(cols * rows) },
    // Renderer-avledet økologi. Ingen ressurs- eller navigasjonstilstand ligger her;
    // revisjonen forteller bare presentasjonen når et begrenset miljølag kan oppdateres.
    ecology: { revision: 0, refreshTimer: 0 },
    events: [],
  };
  state.settlement.angleOffset = rand(rng) * Math.PI * 2;

  // Åpningsbildet: «et tre og en stein», med unge trær som synlig vokser.
  addTree(state, 'birch', C.x - 100, C.y - 22, 1);
  addRock(state, C.x + 84, C.y + 20, 28);
  addTree(state, 'spruce', C.x - 175, C.y - 95, 0.32);
  addTree(state, 'birch', C.x + 45, C.y - 120, 0.12);
  addTree(state, 'spruce', C.x + 205, C.y - 70, 0.7);

  // Lunder rundt leirplassen. Hver lund har en tydelig hovedart; blanding skjer
  // bare langs kanten, slik at skogen leses som bestander framfor jevn støy.
  for (let g = 0; g < 12; g++) {
    const a = rand(rng) * Math.PI * 2;
    const d = range(rng, 300, 1020);
    const gx = C.x + Math.cos(a) * d, gy = C.y + Math.sin(a) * d * 0.7;
    if (!inBounds(state, gx, gy, 60) || inPond(state, gx, gy, 60)) continue;
    const species = rand(rng) < 0.55 ? 'spruce' : 'birch';
    const count = 6 + Math.floor(rand(rng) * 7);
    for (let i = 0; i < count; i++) {
      for (let tries = 0; tries < 8; tries++) {
        // To summerte trekk samler trærne nær sentrum uten å lage harde sirkler.
        const x = gx + (rand(rng) + rand(rng) - 1) * 138;
        const y = gy + (rand(rng) + rand(rng) - 1) * 102;
        if (!isFreeForTree(state, x, y)) continue;
        const edge = Math.hypot(x - gx, (y - gy) * 1.15) / 150;
        const growth = edge > 0.62 && rand(rng) < 0.48 ? range(rng, 0.12, 0.48) : range(rng, 0.55, 1);
        const sp = rand(rng) < (edge > 0.55 ? 0.68 : 0.9) ? species : (species === 'birch' ? 'spruce' : 'birch');
        addTree(state, sp, x, y, growth);
        break;
      }
    }
  }
  // Enkelttrær.
  for (let i = 0; i < 16; i++) {
    const x = range(rng, 60, W - 60), y = range(rng, 60, H - 60);
    if (isFreeForTree(state, x, y) && dist(x, y, C.x, C.y) > 230) addTree(state, rand(rng) < 0.6 ? 'birch' : 'spruce', x, y, range(rng, 0.3, 1));
  }
  // Steiner.
  let rocks = 0;
  for (let tries = 0; tries < 200 && rocks < 8; tries++) {
    const a = rand(rng) * Math.PI * 2, d = range(rng, 190, 820);
    const x = C.x + Math.cos(a) * d, y = C.y + Math.sin(a) * d * 0.7;
    const r = range(rng, 14, 28);
    if (!inBounds(state, x, y, 60) || inPond(state, x, y, 40)) continue;
    if (state.nodes.some((n) => dist(x, y, n.x, n.y) < (n.kind === 'rock' ? n.radius + r + 40 : r + 24))) continue;
    addRock(state, x, y, r);
    rocks++;
  }
  return state;
}
