// Maler planetens overflate til to teksturer (rene piksel-arrays, ingen DOM — kjører i en Worker eller i Node):
//  - global: ekvirektangulær (2:1) for hele kloden,
//  - lokal: tangentplanet rundt hjemmet (±localSpan radianer), høyere oppløsning der sivilisasjonen bor.
// Fargene er dempede jordtoner (realistisk painterly); lys fra nordvest som i den detaljerte verdenen.
// OPUS-02: elver (se sim/hydrology.js) males inn som vann + dal + skog langs breddene. Alfa-kanalen bærer to ting:
//   vann (elv, innsjø, hav) ≈ 64, land = 160 + skogtetthet × 95. Shaderen bruker skogtettheten til å gi skogbelter og enger.
import { createPlanet, fromLatLon, offsetDir, toLatLon } from '../sim/planet.js';
import { buildRivers } from '../sim/hydrology.js';

export const LOCAL_SPAN = 0.62; // radianer fra hjemmet til kanten av den lokale teksturen
export const ALPHA_WATER = 64, ALPHA_LAND = 160, ALPHA_FOREST = 95;

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sat = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const sstep = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const C = {
  deep: [24, 44, 56], sea: [34, 62, 72], shallow: [62, 96, 96], sand: [150, 138, 104], river: [66, 104, 112],
  grass: [96, 114, 62], dry: [136, 130, 84], forest: [58, 84, 46], conifer: [42, 64, 44],
  rock: [108, 102, 92], darkRock: [76, 72, 66], snow: [226, 226, 218], desert: [172, 150, 106], tundra: [118, 116, 96],
  bank: [74, 96, 54],
};

function landColor(s, hash) {
  const { e, moist, temp } = s;
  let c = mix(C.dry, C.grass, sstep(0.2, 0.5, moist));
  c = mix(c, mix(C.forest, C.conifer, sstep(0.55, 0.3, temp)), sstep(0.52, 0.8, moist));
  c = mix(c, C.desert, sstep(0.72, 0.9, temp) * sstep(0.4, 0.2, moist));
  c = mix(c, C.tundra, sstep(0.32, 0.18, temp));
  c = mix(c, mix(C.rock, C.darkRock, hash), sstep(0.32, 0.5, e));
  c = mix(c, C.snow, Math.max(sstep(0.58, 0.72, e + hash * 0.05), sstep(0.16, 0.08, temp)));
  c = mix(c, C.sand, sstep(0.025, 0.0, e) * 0.7);
  return c;
}

function seaColor(e) {
  let c = mix(C.shallow, C.sea, sstep(-0.02, -0.12, e));
  return mix(c, C.deep, sstep(-0.12, -0.4, e));
}

// Skogtetthet 0..1 fra fuktighet, høyde og temperatur (bare tegning; påvirker ingen regler).
function forestOf(s, band) {
  const { e, moist, temp } = s;
  let f = sstep(0.44, 0.74, moist) * sstep(0.46, 0.28, e) * sstep(0.14, 0.3, temp);
  f = f * (1 - 0.7 * sstep(0.7, 0.9, temp) * sstep(0.45, 0.25, moist));
  return sat(f + band * 0.4 * sstep(0.2, 0.4, moist + 0.25));
}

// Elver → masker i teksturens piksler. `toPix(x, y)` gir [px, py]; `scale` er piksler per radian.
function rasterRivers(rivers, w, h, toPix, scale) {
  const core = new Float32Array(w * h), band = new Float32Array(w * h);
  for (const path of rivers.paths) {
    const P = path.pts.map((q) => { const [px, py] = toPix(q.x, q.y); return { px, py, r: Math.max(0.55, q.w * scale * 0.5) }; });
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      if (Math.abs(a.px - b.px) > w / 2) continue; // hopper over sømmen i den globale teksturen
      const rr = Math.max(a.r, b.r), reach = rr * 4 + 2;
      const x0 = Math.max(0, Math.floor(Math.min(a.px, b.px) - reach)), x1 = Math.min(w - 1, Math.ceil(Math.max(a.px, b.px) + reach));
      const y0 = Math.max(0, Math.floor(Math.min(a.py, b.py) - reach)), y1 = Math.min(h - 1, Math.ceil(Math.max(a.py, b.py) + reach));
      const dx = b.px - a.px, dy = b.py - a.py, L2 = dx * dx + dy * dy || 1;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        let t = ((x + 0.5 - a.px) * dx + (y + 0.5 - a.py) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(x + 0.5 - (a.px + dx * t), y + 0.5 - (a.py + dy * t)), r = a.r + (b.r - a.r) * t;
        const k = y * w + x;
        const c = 1 - sstep(r * 0.7, r * 1.25, d);
        if (c > core[k]) core[k] = c;
        const bd = 1 - sat(d / (r * 4));
        if (bd > band[k]) band[k] = bd;
      }
    }
  }
  return { core, band };
}

// Felles maling: fyller RGBA ut fra et høydefelt og overflatedata. dirAt(i, j) → enhetsvektor.
function paint(planet, w, h, dirAt, lightScale, rv = null) {
  // Felt i flate Float32Array (ikke ett objekt per piksel): 2 × 4 M piksler som objekter ga mange hundre MB og kunne velte lavminnemiljøer.
  const n = w * h, E = new Float32Array(n), MO = new Float32Array(n), TE = new Float32Array(n);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const s = planet.surface(dirAt(i, j)), k = j * w + i;
    E[k] = s.e; MO[k] = s.moist; TE[k] = s.temp;
  }
  const s = { e: 0, moist: 0, temp: 0 };
  // Dalen langs elva senkes litt (bare for skyggen), slik at elver ligger i dalfører.
  const E0 = Float32Array.from(E); // ubehandlet høyde (for farge/land-vann); E får elvedaler for skyggen
  if (rv) for (let k = 0; k < n; k++) if (E[k] > 0) E[k] -= rv.band[k] * 0.009 + rv.core[k] * 0.004;
  const data = new Uint8ClampedArray(n * 4);
  let r = 0x9e3779b9 ^ planet.seed;
  const rnd = () => { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; return ((r >>> 0) % 10000) / 10000; };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, e = E0[k];
    s.e = e; s.moist = MO[k]; s.temp = TE[k];
    const ex = E[j * w + Math.min(w - 1, i + 1)] - E[j * w + Math.max(0, i - 1)];
    const ey = E[Math.min(h - 1, j + 1) * w + i] - E[Math.max(0, j - 1) * w + i];
    const hash = rnd();
    const core = rv && e > 0.002 ? rv.core[k] : 0, band = rv && e > 0.002 ? rv.band[k] : 0;
    let c, alpha;
    if (e < 0) { c = seaColor(e); alpha = ALPHA_WATER; }
    else {
      c = landColor(s, hash);
      if (band > 0.02) c = mix(c, C.bank, band * 0.45 * (1 - sstep(0.3, 0.5, e)));
      // Bakkeskygge: lys fra nordvest (øvre venstre i kartet).
      const shade = 1 + (-ex - ey) * lightScale * (0.6 + sstep(0.15, 0.5, e));
      c = c.map((v) => v * Math.max(0.55, Math.min(1.35, shade)));
      alpha = ALPHA_LAND + forestOf(s, band) * ALPHA_FOREST;
      if (core > 0.35) { c = mix(c, mix(C.river, C.shallow, 0.25 + 0.25 * hash), sstep(0.35, 0.8, core)); alpha = core > 0.6 ? ALPHA_WATER : alpha; }
    }
    // Malerisk korn: små, ujevne variasjoner i valør.
    const g = 0.95 + hash * 0.08;
    data[k * 4] = c[0] * g; data[k * 4 + 1] = c[1] * g; data[k * 4 + 2] = c[2] * g; data[k * 4 + 3] = alpha;
  }
  return data;
}

export function bakeGlobal(planet, w = 2048, rivers = null) {
  const h = w / 2;
  let rv = null;
  if (rivers) {
    rv = rasterRivers(rivers, w, h, (x, y) => {
      const L = toLatLon(offsetDir(planet.home.basis, x, y));
      return [(L.lon / (2 * Math.PI) + 0.5) * w, (0.5 - L.lat / Math.PI) * h];
    }, w / (2 * Math.PI));
  }
  const data = paint(planet, w, h, (i, j) => fromLatLon((0.5 - (j + 0.5) / h) * Math.PI, ((i + 0.5) / w - 0.5) * 2 * Math.PI), w / 40, rv);
  return { w, h, data };
}

export function bakeLocal(planet, size = 2048, rivers = null) {
  const b = planet.home.basis, L = LOCAL_SPAN;
  const rv = rivers ? rasterRivers(rivers, size, size, (x, y) => [(x / L * 0.5 + 0.5) * size, (0.5 - y / L * 0.5) * size], size / (2 * L)) : null;
  const data = paint(planet, size, size, (i, j) => offsetDir(b, ((i + 0.5) / size * 2 - 1) * L, (1 - (j + 0.5) / size * 2) * L), size / 60, rv);
  return { w: size, h: size, span: L, data };
}

// Alt i ett (brukes av workeren og av hovedtråden som reserve).
export function bakePlanet(seed, regions, { global = 2048, local = 2048 } = {}) {
  const planet = createPlanet(seed, regions);
  const rivers = buildRivers(planet);
  return { global: bakeGlobal(planet, global, rivers), local: bakeLocal(planet, local, rivers) };
}
