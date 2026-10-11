// OPUS-12C.2 · Lett, avledet bystruktur. Gater og faktiske bygg er fortsatt
// autoritative; dette laget beskriver sentrum, frontrekker og ledige gateparseller.
// Resultatet mellomlagres og bygges bare på nytt når bygg eller gatenett endres.
import { streetSegments, distToStreet } from './streets.js';
import { stageRank, isHome } from './settlements.js';

const cache = new WeakMap();
export const urbanPerf = { rebuilds: 0, rebuildMs: 0, siteCalls: 0, siteMs: 0, redevelopmentCalls: 0, redevelopmentMs: 0 };
const URBAN_TYPES = new Set(['hut', 'townhouse', 'shelter', 'market', 'hall', 'hearth', 'well', 'warehouse', 'commons', 'park', 'workshop', 'sawmill', 'mason', 'storage', 'sanctuary', 'telegraph', 'research_institute']);

function closest(segs, x, y) {
  let best = null;
  for (let i = 0; i < segs.length; i++) {
    const [ax, ay, bx, by] = segs[i], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
    if (!l2) continue;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2));
    const px = ax + vx * t, py = ay + vy * t, len = Math.sqrt(l2), d = Math.hypot(x - px, y - py);
    if (!best || d < best.distance) best = { index: i, t, along: t * len, len, x: px, y: py, distance: d, nx: -vy / len, ny: vx / len };
  }
  return best;
}

function centerOf(S, buildings) {
  const civic = buildings.filter((b) => ['market', 'hall', 'hearth', 'fire', 'well', 'commons', 'park'].includes(b.type));
  const basis = civic.length ? civic : buildings;
  if (!basis.length) return { x: S.x, y: S.y };
  return { x: basis.reduce((n, b) => n + b.x, 0) / basis.length, y: basis.reduce((n, b) => n + b.y, 0) / basis.length };
}

function frontClusters(fronts) {
  const eligible = fronts.filter((f) => f.frontage);
  const adj = new Map(eligible.map((f) => [f.id, []]));
  let gaps = 0;
  for (let i = 0; i < eligible.length; i++) for (let j = i + 1; j < eligible.length; j++) {
    const a = eligible[i], b = eligible[j], d = Math.hypot(a.b.x - b.b.x, a.b.y - b.b.y);
    if (d > 112) continue;
    const dot = Math.abs(a.nx * b.nx + a.ny * b.ny);
    if (dot < 0.55) continue;
    adj.get(a.id).push(b.id); adj.get(b.id).push(a.id);
    if (d > 82) gaps++;
  }
  const byId = new Map(eligible.map((f) => [f.id, f])), seen = new Set(), clusters = [];
  for (const f of eligible) {
    if (seen.has(f.id)) continue;
    const ids = [], q = [f.id]; seen.add(f.id);
    while (q.length) { const id = q.shift(); ids.push(id); for (const n of adj.get(id) || []) if (!seen.has(n)) { seen.add(n); q.push(n); } }
    if (ids.length >= 2) {
      const members = ids.map((id) => byId.get(id));
      let length = 0; for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) length = Math.max(length, Math.hypot(members[i].b.x - members[j].b.x, members[i].b.y - members[j].b.y));
      clusters.push({ ids, size: ids.length, length: Math.round(length) });
    }
  }
  return { clusters, gaps };
}

export function urbanFabric(state, S) {
  const net = S?.net, last = state.buildings.at(-1)?.id || 0;
  const completed = state.buildings.reduce((n, b) => n + (b.complete ? 1 : 0), 0);
  const sig = `${net?.edges?.length || 0}|${net?.nodes?.length || 0}|${state.buildings.length}|${completed}|${last}`;
  const old = cache.get(S); if (old?.sig === sig) return old.fabric;
  const started = globalThis.performance?.now?.() || 0;
  const segs = streetSegments(state, S);
  const buildings = state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === S.id && b.type !== 'field');
  const center = centerOf(S, buildings);
  const urban = buildings.filter((b) => URBAN_TYPES.has(b.type));
  const fronts = urban.map((b) => {
    const f = closest(segs, b.x, b.y); if (!f) return null;
    const frontage = !!b.frontage || (f.distance >= 20 && f.distance <= 58);
    return { id: b.id, b, ...f, frontage, access: f.distance <= 92 };
  }).filter(Boolean);
  const grouped = frontClusters(fronts);
  const coreRadius = Math.max(180, Math.min(430, 150 + Math.sqrt(Math.max(1, urban.length)) * 35));
  const core = urban.filter((b) => Math.hypot(b.x - center.x, b.y - center.y) <= coreRadius);
  const fabric = { segs, buildings, urban, fronts, clusters: grouped.clusters, frontageGaps: grouped.gaps, center, coreRadius, core, signature: sig };
  urbanPerf.rebuilds++; urbanPerf.rebuildMs += (globalThis.performance?.now?.() || started) - started;
  cache.set(S, { sig, fabric }); return fabric;
}

export function frontageOf(state, S, x, y) { return closest(urbanFabric(state, S).segs, x, y); }

export function frontageSites(state, S, radius, max = 192) {
  const started = globalThis.performance?.now?.() || 0;
  // 46 enheter gir et smalt fortau/gårdsbelte, men nok diagonal klaring fra
  // bygningene som opprinnelig skapte gateenden.
  const fabric = urbanFabric(state, S), sites = [], step = Math.max(radius * 2.05, 68), setback = Math.max(42, radius * 1.18);
  const ordered = fabric.segs.map((seg, index) => {
    const [ax, ay, bx, by] = seg, len = Math.hypot(bx - ax, by - ay), mx = (ax + bx) / 2, my = (ay + by) / 2;
    return { seg, index, len, centerDistance: Math.hypot(mx - fabric.center.x, my - fabric.center.y) };
  }).filter((q) => q.len >= step * 1.05).sort((a, b) => a.centerDistance - b.centerDistance || b.len - a.len || a.index - b.index);
  for (const q of ordered) {
    const [ax, ay, bx, by] = q.seg, ux = (bx - ax) / q.len, uy = (by - ay) / q.len, nx = -uy, ny = ux;
    // Gater og bygg former hverandre: modne korridorer kan forlenges ett
    // bygg om gangen forbi siste dør, ikke bare fylle rommet mellom endene.
    for (const along of [-step * 2.25, -step, q.len + step, q.len + step * 2.25]) for (const side of [-1, 1]) sites.push({ x: ax + ux * along + nx * setback * side, y: ay + uy * along + ny * setback * side, frontage: { index: q.index, nx: -nx * side, ny: -ny * side, side, along }, centerDistance: q.centerDistance + Math.min(Math.abs(along), Math.abs(along - q.len)) });
    const count = Math.max(1, Math.floor((q.len - step * 0.35) / step));
    for (let k = 0; k < count && sites.length < max; k++) {
      const along = q.len * (k + 1) / (count + 1);
      for (const side of [-1, 1]) sites.push({ x: ax + ux * along + nx * setback * side, y: ay + uy * along + ny * setback * side, frontage: { index: q.index, nx: -nx * side, ny: -ny * side, side, along }, centerDistance: q.centerDistance });
    }
    if (sites.length >= max) break;
  }
  urbanPerf.siteCalls++; urbanPerf.siteMs += (globalThis.performance?.now?.() || started) - started;
  return sites;
}

export function urbanMetrics(state, S) {
  const f = urbanFabric(state, S), homes = f.urban.filter(isHome), fronted = f.fronts.filter((q) => q.frontage), accessed = f.fronts.filter((q) => q.access);
  const coreArea = Math.PI * f.coreRadius * f.coreRadius;
  const coreHomes = homes.filter((b) => Math.hypot(b.x - f.center.x, b.y - f.center.y) <= f.coreRadius);
  const isolated = fronted.filter((a) => !fronted.some((b) => a !== b && Math.hypot(a.b.x - b.b.x, a.b.y - b.b.y) <= 112)).length;
  const nearest = homes.map((a) => Math.min(...homes.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y)), Infinity)).filter(Number.isFinite);
  const vacant = frontageSites(state, S, 34).filter((p) => distToStreet(f.segs, p.x, p.y) < 60).length;
  return { eligible: f.urban.length, streetAccess: accessed.length, frontageBuildings: fronted.length, frontageCoverage: f.urban.length ? +(fronted.length / f.urban.length * 100).toFixed(1) : 0, continuousFrontageLength: f.clusters.reduce((n, c) => n + c.length, 0), frontageGaps: f.frontageGaps, frontageClusters: f.clusters.length, clusterSizes: f.clusters.map((c) => c.size), typicalClusterSize: f.clusters.length ? +(f.clusters.reduce((n, c) => n + c.size, 0) / f.clusters.length).toFixed(1) : 0, isolatedUrbanBuildings: isolated, coreBuildings: f.core.length, coreDensity: coreArea ? +(f.core.length / coreArea * 10000).toFixed(2) : 0, residentialDensity: coreArea ? +(coreHomes.length / coreArea * 10000).toFixed(2) : 0, candidateCoreParcels: vacant, averageNeighborDistance: nearest.length ? +(nearest.reduce((a, b) => a + b, 0) / nearest.length).toFixed(1) : 0 };
}

export const urbanMaturity = (S) => stageRank(S?.stage || 'Leir') >= stageRank('By');
