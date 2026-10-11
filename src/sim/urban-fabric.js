// OPUS-12C · Lett, avledet byvev. Dette er ikke et nytt rutenett eller en egen
// bysimulering: tomter hentes deterministisk fra den faktiske gatenettgeometrien.
// Cachen ugyldiggjøres bare når nett eller bygg endrer seg.
import { streetSegments } from './streets.js';

const cache = new WeakMap();
const home = (b) => b.type === 'hut' || b.type === 'townhouse' || b.type === 'shelter';

function closest(segs, x, y) {
  let best = null;
  for (let i = 0; i < segs.length; i++) {
    const [ax, ay, bx, by] = segs[i], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
    if (!l2) continue;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2));
    const px = ax + vx * t, py = ay + vy * t, d = Math.hypot(x - px, y - py);
    if (!best || d < best.distance) best = { index: i, t, x: px, y: py, distance: d, nx: -vy / Math.sqrt(l2), ny: vx / Math.sqrt(l2) };
  }
  return best;
}

// En kompakt beskrivelse som også er nyttig for diagnostikk: hver bolig får sin
// nærmeste gatefront og bygg grupperes i sammenhengende frontklynger.
export function urbanFabric(state, S) {
  const net = S?.net, sig = `${net?.edges?.length || 0}|${state.buildings.length}`;
  const old = cache.get(S); if (old?.sig === sig) return old.fabric;
  const segs = streetSegments(state, S);
  const homes = state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === S.id && home(b));
  const fronts = homes.map((b) => ({ id: b.id, ...closest(segs, b.x, b.y) })).filter((q) => q.distance != null);
  const bySeg = new Map(); for (const f of fronts) (bySeg.get(f.index) || bySeg.set(f.index, []).get(f.index)).push(f);
  let clusters = 0;
  for (const list of bySeg.values()) {
    list.sort((a, b) => a.t - b.t || a.id - b.id);
    let run = 0, prior = null;
    for (const f of list) { if (prior != null && f.t - prior > 0.34) run = 0; run++; if (run === 2) clusters++; prior = f.t; }
  }
  const fabric = { segs, fronts, clusters, signature: sig };
  cache.set(S, { sig, fabric }); return fabric;
}

export function frontageOf(state, S, x, y) { return closest(urbanFabric(state, S).segs, x, y); }

// Mulige tomter på begge sider av eksisterende gater. Avstanden gir plass til
// kjørebane og inngang; steget er byggebredden, ikke et verdensrutenett.
export function frontageSites(state, S, radius, max = 96) {
  const { segs } = urbanFabric(state, S), sites = [];
  for (let i = 0; i < segs.length && sites.length < max; i++) {
    const [ax, ay, bx, by] = segs[i], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    if (len < 46) continue;
    // `siteIsValid` beholder også gårdsrom/arbeidsrom rundt gamle bygg. Derfor
    // ligger frontlinjen litt lenger enn bare byggets radius fra gatens senter.
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux, step = Math.max(radius * 1.7, 42), setback = radius + 40;
    for (let along = step * 0.7; along < len - step * 0.45 && sites.length < max; along += step) for (const side of [-1, 1]) {
      sites.push({ x: ax + ux * along + nx * setback * side, y: ay + uy * along + ny * setback * side, frontage: { index: i, nx: -nx * side, ny: -ny * side } });
    }
  }
  return sites;
}
