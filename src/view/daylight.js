// OPUS-02 · Dagklokka. Én felles klokke (spilltid) for planetens sol og nærbildets lys.
// Ren matematikk, testbar uten nettleser. Ett døgn varer B.day.seconds i spilltid; pause stopper også sola.
import { BALANCE as B } from '../data/balance.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// 0–1 gjennom døgnet: 0,25 soloppgang · 0,5 middag · 0,75 solnedgang · 0 / 1 midnatt.
export const dayPhase = (time) => (((B.day.startPhase + time / B.day.seconds) % 1) + 1) % 1;

// Solhøyde −1…1 (positiv = over horisonten).
export const sunElevation = (phase) => Math.sin(2 * Math.PI * (phase - 0.25));

// Lysforhold for nærbildet. Aldri mørkere enn `minLight` så verden alltid er lesbar.
export function lightAt(phase) {
  const e = sunElevation(phase);
  const night = smooth(0.12, -0.5, e);                       // 0 dag … 1 dyp natt
  const twilight = Math.exp(-Math.pow(e / 0.3, 2)) * (e > -0.6 ? 1 : 0); // varmt lys rundt soloppgang/solnedgang
  const morning = phase < 0.5 ? 1 : 0;
  return { phase, elevation: e, night, twilight, morning, minLight: 0.52,
    // Skyggene er lengst ved horisonten og tynnes ut om natten.
    shadowLen: 1 + 0.65 * (1 - clamp(e * 1.5)), shadowAlpha: 1 - 0.85 * night };
}

// Fargen som multipliseres over verden (RGB 0–255). Dag = hvit (ingen endring).
export function tintAt(L) {
  const day = [255, 255, 255], dusk = [255, 196, 150], night = [112, 128, 178];
  const w = L.twilight * (1 - L.night * 0.4);
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  return mix(mix(day, dusk, clamp(w * 0.85)), night, L.night * 0.9);
}
