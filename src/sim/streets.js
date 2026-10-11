// OPUS-12 · Gatenett som ekte infrastruktur. Nettet vokser av bosettingens egne bygg: et nytt bygg knyttes til de nærmeste dørene
// (aldri gjennom andre bygg), eldre gater blir værende og får bedre dekke etter hvert (sti → jordvei → grusvei → brolagt gate).
// Folk går langs nettet (se humans.js), og forbedringer krever materialer fra bosettingens eget lager, tid og hender.
// Nettet lagres på bosettingen (`S.net`): { nodes: [byggId], edges: [{ a, b, lv, len }] } — a < b, lv 0–3.
import { BALANCE as B } from '../data/balance.js';
import { stageRank, isHome, settlementById } from './settlements.js';
import { invGet, invTake } from './inventory.js';
import { refreshDistricts } from './districts.js';

export const NODE_TYPES = new Set(['hut', 'townhouse', 'shelter', 'market', 'hall', 'hearth', 'fire', 'well', 'warehouse', 'sawmill', 'mason', 'workshop', 'storage', 'sanctuary', 'commons', 'park', 'mine', 'coal_mine', 'smelter', 'charcoal_kiln', 'watermill', 'windmill', 'steam_engine', 'metalworks', 'locomotive_workshop', 'rail_terminal', 'generator', 'grid_station', 'oil_well', 'refinery', 'combustion_engine', 'motor_depot', 'precision_works', 'electronics_works', 'aircraft_works', 'research_institute', 'telegraph', 'dock', 'boatyard', 'field', 'airfield']);
export const doorOf = (b) => ({ x: b.x, y: b.y + Math.max(3, b.radius * 0.18) });
const CORE = new Set(['market', 'hall', 'hearth', 'well', 'fire', 'commons', 'park']);

// Fotavtrykk for kryssing (ellipse rundt bygget).
const blocks = (b, x, y) => {
  if (b.type === 'fire' || b.type === 'well' || b.type === 'commons' || b.type === 'park') return false;
  const rx = b.radius * 0.78, ry = b.radius * 0.42;
  const dx = (x - b.x) / rx, dy = (y - (b.y - b.radius * 0.12)) / ry;
  return dx * dx + dy * dy < 1;
};
function crosses(buildings, a, b, skip) {
  const n = Math.max(3, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
  for (let i = 1; i < n; i++) {
    const x = a.x + (b.x - a.x) * (i / n), y = a.y + (b.y - a.y) * (i / n);
    for (const q of buildings) if (!skip.has(q.id) && blocks(q, x, y)) return true;
  }
  return false;
}

// Gatens polylinje: svak bue med et deterministisk sideskift (samme som tegningen).
export function edgePoints(A, C, ids) {
  const len = Math.hypot(C.x - A.x, C.y - A.y) || 1;
  const bend = (((ids[0] * 31 + ids[1] * 17) % 7) - 3) * 1.6;
  const nx = -(C.y - A.y) / len, ny = (C.x - A.x) / len, pts = [], n = Math.max(2, Math.ceil(len / 9));
  for (let k = 0; k <= n; k++) { const t = k / n, w = Math.sin(t * Math.PI) * bend; pts.push({ x: A.x + (C.x - A.x) * t + nx * w, y: A.y + (C.y - A.y) * t + ny * w }); }
  return pts;
}

const nodeBuildings = (state, id) => state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === id && NODE_TYPES.has(b.type)).sort((p, q) => p.id - q.id);

// Utvider nettet med bygg som ennå ikke er knyttet til det. Kalles jevnlig (1 Hz); gjør ingenting når ingenting er nytt.
export function growStreets(state, S) {
  if (stageRank(S.stage || 'Leir') < 1) return false; // leirer har bare tråkk
  const bs = nodeBuildings(state, S.id);
  if (bs.length < 2) return false;
  const net = (S.net ??= { nodes: [], edges: [], sig: '' });
  const sig = `${bs.length}:${bs[bs.length - 1].id}`;
  if (net.sig === sig) return false; // ingen nye bygg siden sist (mislykkede forsøk gjentas når noe nytt kommer til)
  const byId = new Map(bs.map((b) => [b.id, b]));
  // Bygg som er borte (f.eks. etter ombygging til annen type) fjernes med sine gater.
  net.nodes = net.nodes.filter((id) => byId.has(id));
  net.edges = net.edges.filter((e) => byId.has(e.a) && byId.has(e.b));
  if (!net.nodes.length) {
    const heart = bs.find((b) => b.type === 'hearth') || bs.find((b) => b.type === 'fire') || bs.find((b) => CORE.has(b.type)) || bs[0];
    net.nodes.push(heart.id);
  }
  const have = new Set(net.nodes), has = (a, c) => net.edges.some((e) => e.a === Math.min(a, c) && e.b === Math.max(a, c));
  let grew = false, allConnected = true;
  for (const b of bs) {
    if (have.has(b.id)) continue;
    const D = doorOf(b);
    const near = net.nodes.map((id) => byId.get(id)).map((q) => ({ q, d: Math.hypot(doorOf(q).x - D.x, doorOf(q).y - D.y) })).sort((p, r) => p.d - r.d || p.q.id - r.q.id);
    const links = [];
    for (const { q, d } of near) {
      if (d > (links.length ? 130 : 320)) break;
      if (links.length && d > near[0].d * 1.7) break;
      if (crosses(bs, D, doorOf(q), new Set([b.id, q.id]))) continue;
      // En andre forbindelse bare i en annen retning, så det blir kvartaler og ikke en vifte.
      if (links.length) {
        const q0 = doorOf(links[0].q), q1 = doorOf(q);
        const a0 = Math.atan2(q0.y - D.y, q0.x - D.x), a1 = Math.atan2(q1.y - D.y, q1.x - D.x);
        if (Math.abs(Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0))) < 1.05) continue;
      }
      links.push({ q, d });
      if (links.length >= 2) break;
    }
    if (!links.length) { allConnected = false; continue; }
    for (const { q, d } of links) if (!has(b.id, q.id)) net.edges.push({ a: Math.min(b.id, q.id), b: Math.max(b.id, q.id), lv: 0, len: Math.round(d) });
    net.nodes.push(b.id); have.add(b.id); grew = true;
  }
  // Lagrer signaturen bare når alt ble knyttet: ellers prøves de gjenstående på nytt når verden endres.
  net.sig = allConnected ? sig : `${sig}!${state.buildings.length}`;
  return grew;
}

// ---------- Ruter langs nettet ----------
function graphOf(state, S) {
  const net = S.net; if (!net || net.edges.length < 2) return null;
  const sig = `${net.edges.length}|${net.nodes.length}|${state.buildings.length}`;
  const g = cache.get(S);
  if (g && g.sig === sig) return g;
  const pos = new Map(), adj = new Map();
  for (const b of state.buildings) if (b.complete && (b.settlementId || 'first') === S.id) pos.set(b.id, doorOf(b));
  for (const e of net.edges) {
    const A = pos.get(e.a), C = pos.get(e.b); if (!A || !C) continue;
    const len = Math.hypot(A.x - C.x, A.y - C.y);
    (adj.get(e.a) || adj.set(e.a, []).get(e.a)).push({ to: e.b, len });
    (adj.get(e.b) || adj.set(e.b, []).get(e.b)).push({ to: e.a, len });
  }
  const ng = { sig, pos, adj, ids: [...adj.keys()].sort((a, b) => a - b) };
  cache.set(S, ng);
  return ng;
}
const cache = new WeakMap();

// Veien fra (x0,y0) til (x1,y1) langs nettet som liste med veipunkter, eller null når nettet ikke gir en rimelig vei.
// Rimelig = hele veien er høyst 1,6 × luftlinjen + 30, og begge endene ligger nær nettet.
export function routeAlong(state, S, x0, y0, x1, y1) {
  const g = S && graphOf(state, S); if (!g) return null;
  const straight = Math.hypot(x1 - x0, y1 - y0);
  if (straight < 70) return null;
  const nearest = (x, y) => { let best = null, bd = Infinity; for (const id of g.ids) { const p = g.pos.get(id), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = id; } } return { id: best, d: bd }; };
  const s = nearest(x0, y0), t = nearest(x1, y1);
  if (s.id == null || t.id == null || s.d > 60 || t.d > 60 || s.id === t.id) return null;
  // Dijkstra på et lite nett (titalls noder).
  const dist = new Map([[s.id, 0]]), prev = new Map(), open = [s.id], done = new Set();
  while (open.length) {
    open.sort((a, b) => dist.get(a) - dist.get(b) || a - b);
    const u = open.shift(); if (done.has(u)) continue; done.add(u);
    if (u === t.id) break;
    for (const { to, len } of g.adj.get(u) || []) {
      const nd = dist.get(u) + len;
      if (nd < (dist.get(to) ?? Infinity)) { dist.set(to, nd); prev.set(to, u); open.push(to); }
    }
  }
  if (!dist.has(t.id)) return null;
  const path = []; for (let u = t.id; u != null; u = prev.get(u)) path.push(u);
  path.reverse();
  const total = s.d + dist.get(t.id) + t.d;
  if (total > straight * 1.6 + 30) return null;
  return path.map((id) => ({ x: g.pos.get(id).x, y: g.pos.get(id).y }));
}

// ---------- Gater som segmenter (for tomtevalg) ----------
// Flate segmenter [ax, ay, bx, by] for en bosettings nett (hurtiglagret på nettets utseende).
const segCache = new WeakMap();
export function streetSegments(state, S) {
  const net = S?.net; if (!net?.edges.length) return [];
  const sig = `${net.edges.length}|${state.buildings.length}`;
  const c = segCache.get(S);
  if (c && c.sig === sig) return c.segs;
  const pos = new Map(); for (const b of state.buildings) if ((b.settlementId || 'first') === S.id) pos.set(b.id, doorOf(b));
  const segs = [];
  for (const e of net.edges) { const A = pos.get(e.a), C = pos.get(e.b); if (A && C) segs.push([A.x, A.y, C.x, C.y]); }
  segCache.set(S, { sig, segs });
  return segs;
}
export function distToStreet(segs, x, y) {
  let best = Infinity;
  for (const [ax, ay, bx, by] of segs) {
    const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2)) : 0;
    const d = Math.hypot(ax + vx * t - x, ay + vy * t - y);
    if (d < best) best = d;
  }
  return best;
}

// ---------- Veiarbeid ----------
export const ROAD_NAMES = ['sti', 'jordvei', 'grusvei', 'brolagt gate'];

// Høyeste dekke en bosetting kan lage nå: trinn og kunnskap, ikke «alt oppgraderes når teknologien kommer».
export function maxRoadLevel(state, S) {
  const rank = stageRank(S.stage || 'Leir'), up = state.upgrades;
  let m = 0;
  if (rank >= 3) m = 1;
  if (rank >= 4 && up.construction_methods) m = 2;
  if (rank >= 5 && up.factory_manufacture) m = 3;
  return m;
}
export const roadCost = (lv, len) => (lv === 1 ? { stone: Math.ceil(len / 30) } : lv === 2 ? { stone: Math.ceil(len / 18), cutstone: Math.ceil(len / 45) } : { cutstone: Math.ceil(len / 18), planks: Math.ceil(len / 60) });
const ROAD_RESERVE = { stone: 120, cutstone: 30, planks: 60, wood: 160 }; // veiarbeid bruker bare overskudd
const roadSeconds = (lv, len) => (10 + len * (0.2 + 0.12 * lv));

function edgePriority(state, e, byId) {
  const A = byId.get(e.a), C = byId.get(e.b); if (!A || !C) return -1;
  let p = (CORE.has(A.type) ? 4 : 0) + (CORE.has(C.type) ? 4 : 0);
  for (const q of [A, C]) { if (isHome(q)) p += (q.tier || 0) * 0.8; else p += 1.2; }
  return p - e.len * 0.004;
}

// Starter ett veiarbeid om gangen per bosetting når materialer (utover en reserve) og hender finnes. Returnerer true ved ny start.
export function stepRoadworks(state, S) {
  if (S.state !== 'active' || !S.net?.edges.length || S.roadJob || S.population.length < 4) return false;
  const maxLv = maxRoadLevel(state, S);
  if (maxLv < 1) return false;
  const byId = new Map(state.buildings.filter((b) => (b.settlementId || 'first') === S.id).map((b) => [b.id, b]));
  // Neste gate: den viktigste som ikke har fått dekket vi nå kan lage. Én rangering lavere først: ingen hopper fra sti rett til brolegging mens andre står igjen.
  const lvls = S.net.edges.map((e) => e.lv);
  const floor = Math.min(...lvls);
  const cands = S.net.edges.filter((e) => e.lv < maxLv && e.lv <= floor + 1).sort((p, q) => edgePriority(state, q, byId) - edgePriority(state, p, byId) || p.a - q.a || p.b - q.b);
  for (const e of cands.slice(0, 6)) {
    const to = e.lv + 1, cost = roadCost(to, e.len);
    if (!Object.entries(cost).every(([k, n]) => invGet(state, S.id, k) >= n + (ROAD_RESERVE[k] || 0))) continue;
    for (const [k, n] of Object.entries(cost)) invTake(state, S.id, k, n);
    S.roadJob = { a: e.a, b: e.b, to, total: roadSeconds(to, e.len), left: roadSeconds(to, e.len), workers: [] };
    return true;
  }
  return false;
}

export function roadJobPoint(state, S) {
  const j = S.roadJob; if (!j) return null;
  const A = state.buildings.find((b) => b.id === j.a), C = state.buildings.find((b) => b.id === j.b);
  if (!A || !C) return null;
  const a = doorOf(A), c = doorOf(C);
  return { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
}

// Arbeid på veien: kalles av en arbeider hvert steg. Returnerer true når jobben ble ferdig.
export function workRoad(state, S, dt) {
  const j = S.roadJob; if (!j) return false;
  j.left -= dt * state.modifiers.buildSpeed;
  if (j.left > 0) return false;
  const e = S.net.edges.find((q) => q.a === j.a && q.b === j.b);
  if (e) e.lv = Math.max(e.lv, j.to);
  S.roadJob = null;
  S.roadsBuilt = (S.roadsBuilt || 0) + 1;
  const p = e && roadPointOf(state, S, e);
  state.events.push({ type: 'roadBuilt', settlementId: S.id, level: j.to, x: p?.x ?? S.x, y: p?.y ?? S.y });
  return true;
}
const roadPointOf = (state, S, e) => { const A = state.buildings.find((b) => b.id === e.a), C = state.buildings.find((b) => b.id === e.b); return A && C ? { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 } : null; };

export const roadStats = (S) => {
  const lv = [0, 0, 0, 0];
  for (const e of S.net?.edges || []) lv[e.lv]++;
  return { edges: S.net?.edges.length || 0, levels: lv };
};

export function stepStreets(state) {
  refreshDistricts(state);
  for (const S of state.settlements) {
    if (S.state !== 'active') continue;
    growStreets(state, S);
    if (S.roadJob && (!S.net?.edges.some((e) => e.a === S.roadJob.a && e.b === S.roadJob.b))) S.roadJob = null;
    stepRoadworks(state, S);
  }
}
