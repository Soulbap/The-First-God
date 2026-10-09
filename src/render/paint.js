// Felles maleverktøy for den prosedyrale painterly-grafikken.
import { mulberry } from '../core/rng.js';

export { mulberry };

// Oppløsning for forhåndsmalte sprites: piksler per verdensenhet.
export const RS = 3;

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
export const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export function jitter(c, rnd, amt) {
  const k = 1 + (rnd() - 0.5) * amt;
  const h = (rnd() - 0.5) * amt * 18;
  return [c[0] * k + h * 0.4, c[1] * k + h * 0.2, c[2] * k - h * 0.3];
}

// Penselstrøk: en rotert, myk ellipse.
export function dab(ctx, x, y, rx, ry, rot, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

// Avsmalnende strøk (stamme, grener, stenger).
export function taper(ctx, x0, y0, x1, y1, w0, w1, color) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2);
  ctx.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
  ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
  ctx.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x1, y1, w1 / 2, 0, Math.PI * 2);
  ctx.fill();
}

// Verdi-støy med glatt interpolasjon.
export function makeNoise(seed) {
  const rnd = mulberry(seed);
  const N = 256;
  const v = new Float32Array(N * N);
  for (let i = 0; i < v.length; i++) v[i] = rnd();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = xi & 255, y0 = yi & 255, x1 = (x0 + 1) & 255, y1 = (y0 + 1) & 255;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = v[y0 * N + x0], b = v[y0 * N + x1], c = v[y1 * N + x0], d = v[y1 * N + x1];
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
}

export function fbm(noise, x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise(x * f + i * 17.3, y * f + i * 9.1);
    norm += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / norm;
}

// Lager en sprite: tegnefunksjonen får en kontekst skalert til verdensenheter med origo i ankeret (bakkepunktet).
export function paintSprite(wUnits, hUnits, anchorX, anchorY, draw) {
  const canvas = makeCanvas(wUnits * RS, hUnits * RS);
  const ctx = canvas.getContext('2d');
  ctx.scale(RS, RS);
  ctx.translate(anchorX, anchorY);
  draw(ctx);
  return { canvas, w: wUnits, h: hUnits, ax: anchorX, ay: anchorY };
}

export function drawSprite(ctx, s, x, y, alpha = 1) {
  if (alpha <= 0) return;
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(s.canvas, x - s.ax, y - s.ay, s.w, s.h);
  if (alpha < 1) ctx.globalAlpha = 1;
}

// Periodisk støy (flislegges sømløst med periode P) — brukes til fine bakketekstur-fliser.
export function tileNoise(seed, P) {
  const rnd = mulberry(seed);
  const v = new Float32Array(P * P);
  for (let i = 0; i < v.length; i++) v[i] = rnd();
  const w = (n) => ((n % P) + P) % P;
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = w(xi), y0 = w(yi), x1 = w(xi + 1), y1 = w(yi + 1);
    const u = xf * xf * (3 - 2 * xf), t = yf * yf * (3 - 2 * yf);
    const a = v[y0 * P + x0], b = v[y0 * P + x1], c = v[y1 * P + x0], d = v[y1 * P + x1];
    return a + (b - a) * u + (c - a) * t + (a - b - c + d) * u * t;
  };
}
