// OPUS-02 · Elver. Enkel, robust hydrologi på et grovt rutenett i tangentplanet rundt hjemmet:
//   1. høyde og fuktighet fra planetens egen overflate (samme felt som tegnes),
//   2. «priority-flood» gir en avrenning som alltid når havet (innsjøer fylles, ingen blindveier),
//   3. akkumulert vannføring (vektet med fuktighet) → elver der vannføringen er stor nok,
//   4. banene glattes (Chaikin). Elver følger altså alltid terrenget nedover, og begynner i fuktige høyland.
// Ren matematikk, deterministisk fra planeten (samme frø = samme elver, også etter Ragnarok og lasting).
// Begrensning: bare kontinentet rundt hjemmet (±HYDRO_SPAN radianer); elver krysser aldri hjemmeregionens flekk.
import { offsetDir, PLANET } from './planet.js';

export const HYDRO_SPAN = 0.62;

class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v, top = v[0], key = k.pop(), val = v.pop();
    if (k.length) {
      let i = 0; const n = k.length;
      for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= key) break; k[i] = k[c]; v[i] = v[c]; i = c; }
      k[i] = key; v[i] = val;
    }
    return top;
  }
}

const NB = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

function chaikin(pts, rounds = 2) {
  let out = pts;
  for (let r = 0; r < rounds; r++) {
    if (out.length < 3) break;
    const next = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const a = out[i], b = out[i + 1];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25, w: a.w * 0.75 + b.w * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75, w: a.w * 0.25 + b.w * 0.75 });
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

// Svake, rolige slyng på tvers av løpet så elvene ikke følger rutenettets 45°-retninger.
function meander(pts, cell, seed) {
  let s = 0;
  return pts.map((q, i) => {
    if (i > 0) s += Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y);
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    const off = cell * 0.55 * Math.sin(s / (cell * 5.5) + seed * 1.7) * Math.min(1, i / 6, (pts.length - 1 - i) / 6);
    return { x: q.x - (dy / l) * off, y: q.y + (dx / l) * off, w: q.w };
  });
}

// Gir { paths: [{ pts: [{x, y, w}] }], n, span } med x/y i radianer (øst/nord fra hjemmet) og w = bredde i radianer.
export function buildRivers(planet, { n = 384, span = HYDRO_SPAN, minAcc = 400, exclude = 0.095 } = {}) {
  const b = planet.home.basis, cell = (2 * span) / n, N = n * n;
  const e = new Float32Array(N), wet = new Float32Array(N);
  const cx = (i) => -span + (i + 0.5) * cell, cy = (j) => span - (j + 0.5) * cell;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const s = planet.surface(offsetDir(b, cx(i), cy(j)));
    // Svært liten, deterministisk skjevhet bryter likhet på flate partier slik at vannet finner en vei.
    e[j * n + i] = s.e + ((Math.imul(i, 73856093) ^ Math.imul(j, 19349663)) >>> 0) % 997 * 1e-7;
    wet[j * n + i] = 0.35 + s.moist * 1.3;
  }
  // Priority-flood fra havet (e < 0) og rutenettets kant.
  const filled = new Float32Array(N), dir = new Int32Array(N).fill(-1), done = new Uint8Array(N), order = new Int32Array(N);
  const heap = new MinHeap(); let cnt = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i;
    if (e[k] < 0 || i === 0 || j === 0 || i === n - 1 || j === n - 1) { filled[k] = e[k]; done[k] = 1; heap.push(e[k], k); }
  }
  while (heap.size) {
    const k = heap.pop(); order[cnt++] = k;
    const i = k % n, j = (k / n) | 0;
    for (const [di, dj] of NB) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
      const q = jj * n + ii;
      if (done[q]) continue;
      done[q] = 1; dir[q] = k;
      filled[q] = Math.max(e[q], filled[k] + 1e-6);
      heap.push(filled[q], q);
    }
  }
  // Vannføring: regn (vektet med fuktighet) samles nedover; behandle fra høyest til lavest.
  const acc = new Float32Array(N);
  for (let k = 0; k < N; k++) acc[k] = e[k] > 0 ? wet[k] : 0;
  for (let t = cnt - 1; t >= 0; t--) { const k = order[t]; if (dir[k] >= 0) acc[dir[k]] += acc[k]; }

  const homeDist = (k) => Math.hypot(cx(k % n), cy((k / n) | 0));
  const isRiver = (k) => e[k] > 0.004 && acc[k] >= minAcc && homeDist(k) > exclude;
  const upstream = new Uint8Array(N);
  for (let k = 0; k < N; k++) if (isRiver(k) && dir[k] >= 0 && isRiver(dir[k])) upstream[dir[k]] = 1;
  const seen = new Uint8Array(N), paths = [];
  for (let k = 0; k < N; k++) {
    if (!isRiver(k) || upstream[k] || seen[k]) continue; // kilder: elvecellen ingen annen elvecelle renner inn i
    const raw = [];
    let c = k;
    for (let guard = 0; guard < N && c >= 0; guard++) {
      const i = c % n, j = (c / n) | 0;
      raw.push({ x: cx(i), y: cy(j), w: cell * Math.min(2.6, 0.34 + 0.2 * Math.sqrt(acc[c] / minAcc)) });
      const joined = seen[c];
      seen[c] = 1;
      const nx = dir[c];
      if (joined || nx < 0) break;
      if (e[nx] <= 0 || homeDist(nx) <= exclude) { // munning i havet (eller hjemmeflekken): legg til punktet og stopp
        raw.push({ x: cx(nx % n), y: cy((nx / n) | 0), w: raw[raw.length - 1].w });
        break;
      }
      c = nx;
    }
    if (raw.length >= 8) paths.push({ pts: meander(chaikin(raw, 3), cell, paths.length) });
  }
  return { paths, n, span, count: paths.reduce((s, p) => s + p.pts.length, 0) };
}

// Hjelper for tester: er punktet (radianer, lokalt) nær en elv?
export function nearRiver(rivers, x, y, r) {
  for (const p of rivers.paths) for (const q of p.pts) if (Math.hypot(q.x - x, q.y - y) < r) return true;
  return false;
}

export { PLANET };
