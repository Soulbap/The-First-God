// Planetkamera (OPUS-01). Ren matematikk — testbar uten nettleser.
// Kameraet ser alltid rett ned mot planetens sentrum fra høyden h (i planetradier) over et fokuspunkt (lat, lon),
// med nord opp. Ved liten h er bildet et nesten flatt kart (samme som den detaljerte verdenen); ved stor h ses
// hele kloden med ekte krumning. Overgangen fra 2D-verdenen beregnes slik at bredden i bildet er identisk.
import { fromLatLon, toLatLon, basisAt, dot, norm, offsetDir, localOffset } from '../sim/planet.js';

export const GLOBE = {
  fovY: 0.62,         // vertikal synsvinkel (radianer, ~35,5°)
  maxH: 3.5,          // hele kloden i bildet
  continentH: 0.6,    // kontinentet: kjente land og kyst
  scales: [            // meningsnivå etter høyde (navn i grensesnittet)
    { id: 'region', name: 'Region', maxH: 0.09 },
    { id: 'continent', name: 'Kontinent', maxH: 0.9 },
    { id: 'planet', name: 'Planet', maxH: Infinity },
  ],
};

export function createGlobeCamera(lat, lon, h) {
  return { lat, lon, h, tween: null };
}

const tanY = () => Math.tan(GLOBE.fovY / 2);

// Kameraets ramme for en skjermstørrelse.
export function globeFrame(g, sw, sh) {
  const f = fromLatLon(g.lat, g.lon), b = basisAt(f);
  const pos = f.map((v) => v * (1 + g.h));
  const ty = tanY(), tx = ty * (sw / sh);
  return { pos, fwd: f.map((v) => -v), right: b.east, up: b.north, tx, ty, sw, sh, focus: f };
}

// Retning (enhetsvektor på kulen) → skjermpunkt. `front` er usann når punktet er på baksiden.
export function projectDir(F, p) {
  const d = [p[0] - F.pos[0], p[1] - F.pos[1], p[2] - F.pos[2]];
  const z = dot(d, F.fwd);
  if (z <= 1e-6) return null;
  const x = dot(d, F.right) / (z * F.tx), y = dot(d, F.up) / (z * F.ty);
  // Synlig når punktet vender mot kameraet (horisonten).
  const front = dot(p, F.pos) > 1;
  return { x: (x * 0.5 + 0.5) * F.sw, y: (0.5 - y * 0.5) * F.sh, front };
}

// Skjermpunkt → treffpunkt på kulen (eller null når strålen bommer).
export function unprojectScreen(F, sx, sy) {
  const x = (sx / F.sw) * 2 - 1, y = 1 - (sy / F.sh) * 2;
  const dir = norm([0, 1, 2].map((i) => F.fwd[i] + F.right[i] * x * F.tx + F.up[i] * y * F.ty));
  const o = F.pos, b = dot(o, dir), c = dot(o, o) - 1, disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0) return null;
  return norm([o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t]);
}

// Høyden som gir en gitt synlig bredde (radianer bue langs midtlinjen) for et skjermforhold — eksakt for kula:
// et punkt i buelengde a fra fokus havner på skjermkanten når sin a / (h + 1 − cos a) = tan(fovX/2).
export function heightForSpan(span, sw, sh) {
  const a = span / 2, tx = tanY() * (sw / sh);
  return Math.sin(a) / tx - (1 - Math.cos(a));
}
export function spanForHeight(h, sw, sh) {
  const tx = tanY() * (sw / sh), r = Math.hypot(1, tx), phi = Math.atan(tx);
  const arg = (tx * (h + 1)) / r;
  return arg >= 1 ? 2 * (Math.PI / 2 - phi) : 2 * (Math.asin(arg) - phi);
}

// 2D-kamera (verdensenheter) ↔ planetkamera over hjemmeregionen.
export function globeFromWorldCam(planet, cam, world) {
  const p = planet.worldToDir(cam.x, cam.y), ll = toLatLon(p);
  const span = (cam.w / world.width) * planet.patch.w;
  return createGlobeCamera(ll.lat, ll.lon, heightForSpan(span, cam.screenW, cam.screenH));
}

export function worldCamFromGlobe(planet, g, world, sw, sh) {
  const p = fromLatLon(g.lat, g.lon), w = planet.dirToWorld(p);
  return { x: w.x, y: w.y, w: (spanForHeight(g.h, sw, sh) / planet.patch.w) * world.width };
}

export const scaleOf = (h) => GLOBE.scales.find((s) => h <= s.maxH) || GLOBE.scales[GLOBE.scales.length - 1];

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function globeGlide(g, lat, lon, h, duration = 2) {
  g.tween = { from: { lat: g.lat, lon: g.lon, h: g.h }, to: { lat, lon: g.lon + wrap(lon - g.lon), h }, t: 0, duration };
}

export function updateGlobeCamera(g, dt) {
  if (!g.tween) return false;
  const T = g.tween;
  T.t = Math.min(1, T.t + dt / T.duration);
  const k = ease(T.t);
  g.lat = T.from.lat + (T.to.lat - T.from.lat) * k;
  g.lon = T.from.lon + (T.to.lon - T.from.lon) * k;
  // Høyden interpoleres logaritmisk: zoomhastigheten oppleves jevn fra region til planet.
  g.h = Math.exp(Math.log(T.from.h) + (Math.log(T.to.h) - Math.log(T.from.h)) * k);
  if (T.t >= 1) g.tween = null;
  return true;
}

export function clampGlobe(g, minH) {
  g.h = Math.max(minH, Math.min(GLOBE.maxH, g.h));
  g.lat = Math.max(-1.35, Math.min(1.35, g.lat));
  g.lon = wrap(g.lon);
}

// Dra: flytt fokus slik at overflaten følger pekeren (radianer per piksel ved fokus).
export function dragGlobe(g, dx, dy, sw, sh) {
  const radPerPx = Math.min(0.02, (2 * g.h * tanY()) / sh);
  g.lat += dy * radPerPx;
  g.lon -= (dx * radPerPx) / Math.max(0.2, Math.cos(g.lat));
  g.tween = null;
}

// Lokalt tangentplan rundt hjemmet (for den lokale teksturen og overlegg).
export { offsetDir, localOffset };
