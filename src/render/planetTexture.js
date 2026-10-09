// Maler planetens overflate til to teksturer (rene piksel-arrays, ingen DOM — kjører i en Worker eller i Node):
//  - global: ekvirektangulær (2:1) for hele kloden,
//  - lokal: tangentplanet rundt hjemmet (±localSpan radianer), høyere oppløsning der sivilisasjonen bor.
// Fargene er dempede jordtoner (realistisk painterly); lys fra nordvest som i den detaljerte verdenen.
import { createPlanet, fromLatLon, offsetDir } from '../sim/planet.js';

export const LOCAL_SPAN = 0.62; // radianer fra hjemmet til kanten av den lokale teksturen

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sat = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const sstep = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const C = {
  deep: [24, 44, 56], sea: [34, 62, 72], shallow: [62, 96, 96], sand: [150, 138, 104],
  grass: [104, 112, 62], dry: [140, 130, 80], forest: [58, 80, 44], conifer: [40, 60, 40],
  rock: [108, 102, 92], darkRock: [76, 72, 66], snow: [226, 226, 218], desert: [172, 150, 106], tundra: [118, 116, 96],
};

function landColor(s, hash) {
  const { e, moist, temp } = s;
  let c = mix(C.dry, C.grass, sstep(0.25, 0.5, moist));
  c = mix(c, mix(C.forest, C.conifer, sstep(0.55, 0.3, temp)), sstep(0.5, 0.72, moist));
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

// Felles maling: fyller RGBA ut fra et høydefelt og overflatedata. dirAt(i, j) → enhetsvektor.
function paint(planet, w, h, dirAt, lightScale) {
  const n = w * h, E = new Float32Array(n), S = new Array(n);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const s = planet.surface(dirAt(i, j));
    E[j * w + i] = s.e; S[j * w + i] = s;
  }
  const data = new Uint8ClampedArray(n * 4);
  let r = 0x9e3779b9 ^ planet.seed;
  const rnd = () => { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; return ((r >>> 0) % 10000) / 10000; };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, s = S[k], e = s.e;
    const ex = E[j * w + Math.min(w - 1, i + 1)] - E[j * w + Math.max(0, i - 1)];
    const ey = E[Math.min(h - 1, j + 1) * w + i] - E[Math.max(0, j - 1) * w + i];
    const hash = rnd();
    let c;
    if (e < 0) c = seaColor(e);
    else {
      c = landColor(s, hash);
      // Bakkeskygge: lys fra nordvest (øvre venstre i kartet).
      const shade = 1 + (-ex - ey) * lightScale * (0.6 + sstep(0.15, 0.5, e));
      c = c.map((v) => v * Math.max(0.55, Math.min(1.35, shade)));
    }
    // Malerisk korn: små, ujevne variasjoner i valør.
    const g = 0.94 + hash * 0.1;
    data[k * 4] = c[0] * g; data[k * 4 + 1] = c[1] * g; data[k * 4 + 2] = c[2] * g; data[k * 4 + 3] = e < 0 ? 128 : 255; // alfa merker vann (havglans i shaderen)
  }
  return data;
}

export function bakeGlobal(planet, w = 2048) {
  const h = w / 2;
  const data = paint(planet, w, h, (i, j) => fromLatLon((0.5 - (j + 0.5) / h) * Math.PI, ((i + 0.5) / w - 0.5) * 2 * Math.PI), w / 40);
  return { w, h, data };
}

export function bakeLocal(planet, size = 2048) {
  const b = planet.home.basis, L = LOCAL_SPAN;
  const data = paint(planet, size, size, (i, j) => offsetDir(b, ((i + 0.5) / size * 2 - 1) * L, (1 - (j + 0.5) / size * 2) * L), size / 60);
  return { w: size, h: size, span: L, data };
}

// Alt i ett (brukes av workeren og av hovedtråden som reserve).
export function bakePlanet(seed, regions, { global = 2048, local = 2048 } = {}) {
  const planet = createPlanet(seed, regions);
  return { global: bakeGlobal(planet, global), local: bakeLocal(planet, local) };
}
