// Planetgeografi (OPUS-01): én deterministisk planet som hjemmeregionen og de fjerne landene faktisk ligger på.
// Ren matematikk — ingen tegning og ingen tilfeldighet fra simuleringen. Samme frø gir samme planet i hver syklus.
//
// Koordinater: enhetsvektorer på kulen (x, y, z) med z mot nordpolen. Hjemmeregionen (2400 × 1600 verdensenheter)
// er et rektangel i tangentplanet ved hjemmets posisjon. Fjerne land (globe.regions, et 5 × 3-rutenett) legges i
// samme tangentplan med retning nøyaktig lik den retningen karavaner og ekspedisjoner bruker ved kartkanten
// (se edgePoint i worldmap.js): øst = +x i verden, nord = −y i verden.
import { BALANCE as B } from '../data/balance.js';
import { createRng, rand } from '../core/rng.js';

export const PLANET = {
  patchW: 0.08,      // hjemmeregionens bredde i radianer bue (~4,6°)
  regionStep: 0.17, // avstand mellom rutenettets land i tangentplanet (radianer)
  regionRadius: 0.075, // et lands utstrekning når det er kjent
  seaLevel: 0,
};

// ---------- Vektorer ----------
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const fromLatLon = (lat, lon) => [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
export const toLatLon = (p) => ({ lat: Math.asin(Math.max(-1, Math.min(1, p[2]))), lon: Math.atan2(p[1], p[0]) });
export const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));

// Ortonormal basis (opp, øst, nord) i et punkt på kulen.
export function basisAt(p) {
  const up = norm(p);
  let east = cross([0, 0, 1], up);
  if (Math.hypot(...east) < 1e-6) east = [0, 1, 0];
  east = norm(east);
  return { up, east, north: cross(up, east) };
}

// Eksponentialavbildning: lokal forskyvning (x øst, y nord, i radianer) → punkt på kulen.
export function offsetDir(basis, x, y) {
  const r = Math.hypot(x, y);
  if (r < 1e-9) return [...basis.up];
  const s = Math.sin(r) / r, c = Math.cos(r);
  return norm([0, 1, 2].map((i) => basis.up[i] * c + (basis.east[i] * x + basis.north[i] * y) * s));
}

// Invers: punkt på kulen → lokal forskyvning i tangentplanet (radianer).
export function localOffset(basis, p) {
  const c = dot(p, basis.up), r = Math.acos(Math.max(-1, Math.min(1, c)));
  const ex = dot(p, basis.east), ny = dot(p, basis.north), t = Math.hypot(ex, ny);
  if (t < 1e-12) return { x: 0, y: 0 };
  return { x: (ex / t) * r, y: (ny / t) * r };
}

// ---------- Støy (3D verdistøy, seedet) ----------
function makeNoise3(seed) {
  const rng = createRng(seed >>> 0), perm = new Uint16Array(512), vals = new Float32Array(256);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand(rng) * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) vals[i] = rand(rng) * 2 - 1;
  const fade = (t) => t * t * (3 - 2 * t);
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const X = xi & 255, Y = yi & 255, Z = zi & 255;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const h = (a, b, c) => vals[perm[perm[perm[a] + b] + c]];
    const X1 = (X + 1) & 255, Y1 = (Y + 1) & 255, Z1 = (Z + 1) & 255;
    const x00 = h(X, Y, Z) + (h(X1, Y, Z) - h(X, Y, Z)) * u, x10 = h(X, Y1, Z) + (h(X1, Y1, Z) - h(X, Y1, Z)) * u;
    const x01 = h(X, Y, Z1) + (h(X1, Y, Z1) - h(X, Y, Z1)) * u, x11 = h(X, Y1, Z1) + (h(X1, Y1, Z1) - h(X, Y1, Z1)) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  };
}

function fbm(n, p, freq, oct, gain = 0.5) {
  let a = 1, f = freq, s = 0, tot = 0;
  for (let i = 0; i < oct; i++) { s += a * n(p[0] * f + i * 17.3, p[1] * f - i * 9.1, p[2] * f + i * 5.7); tot += a; a *= gain; f *= 2.03; }
  return s / tot;
}

const gauss = (d, r) => Math.exp(-(d * d) / (r * r));
const homeCell = () => ({ col: Math.floor(B.globe.cols / 2), row: Math.floor(B.globe.rows / 2) });

// Lokale landskapstrekk som gjør at et kjent land faktisk har sitt landskap (fjell, kyst, slette …).
// Hvert land trekker høyden og fuktigheten mot mål for sitt landskap (vekt = gauss rundt sentrum).
const FEATURE = {
  fjell: { target: 0.5, r: 0.085, moist: 0.45, rugged: true, stretch: 2.3 },
  skog: { target: 0.2, r: 0.08, moist: 0.66 },
  slette: { target: 0.12, r: 0.09, moist: 0.3 },
  kyst: { target: 0.1, r: 0.055, moist: 0.6, bay: true },
  dal: { target: 0.14, r: 0.075, moist: 0.65, valley: true },
};

// Planeten for et frø. `regions` er globe.regions (bare col/row/biome/id brukes; tilstanden leses aldri).
export function createPlanet(seed, regions) {
  const rng = createRng((seed ^ 0x2c1b3c6d) >>> 0);
  const nE = makeNoise3(seed ^ 0x51ed27), nM = makeNoise3(seed ^ 0x7f4a7c15), nD = makeNoise3(seed ^ 0x1b873593), nR = makeNoise3(seed ^ 0x3c6ef372);
  const homeLat = (46 + rand(rng) * 8) * Math.PI / 180, homeLon = (-20 + rand(rng) * 40) * Math.PI / 180;
  const homeDir = fromLatLon(homeLat, homeLon);
  const home = { lat: homeLat, lon: homeLon, dir: homeDir, basis: basisAt(homeDir) };
  const W = B.world.width, H = B.world.height;
  const patch = { w: PLANET.patchW, h: PLANET.patchW * (H / W) };

  const H0 = homeCell();
  const sites = new Map();
  for (const r of regions) {
    if (r.home) { sites.set(r.id, { id: r.id, dir: homeDir, x: 0, y: 0, biome: r.biome, home: true }); continue; }
    const dx = r.col - H0.col, dy = r.row - H0.row;
    // Retningen er nøyaktig rutenettets retning (samme som ved kartkanten); bare avstanden varierer litt.
    const k = 0.92 + rand(rng) * 0.2;
    const x = dx * PLANET.regionStep * k, y = -dy * PLANET.regionStep * k;
    sites.set(r.id, { id: r.id, dir: offsetDir(home.basis, x, y), x, y, biome: r.biome, home: false });
  }
  const feats = [...sites.values()].filter((s) => !s.home).map((s) => {
    const F = FEATURE[s.biome] || FEATURE.skog;
    // Kystland: en bukt litt utenfor landets sentrum, vendt bort fra hjemmet.
    const out = Math.hypot(s.x, s.y) || 1;
    const bay = F.bay ? offsetDir(home.basis, s.x + (s.x / out) * 0.085, s.y + (s.y / out) * 0.085) : null;
    return { ...s, F, bay, ang: rand(rng) * Math.PI };
  });
  const knownRadius = 0.55; // det kjente kontinentet rundt hjemmet

  // Rå overflate i et punkt: høyde (havnivå 0), fuktighet og temperatur (0..1).
  function surface(p) {
    // OPUS-02: domene-forvrengning gir sammenhengende, mindre blobbete kystlinjer; ryggkjeder (tektoniske belter) gir
    // lange fjellkjeder med lavere fotland, i stedet for spredte hauger.
    const wp = 0.3;
    const q = [p[0] + wp * fbm(nD, p, 1.3, 3), p[1] + wp * fbm(nD, [p[1] + 3.1, p[2], p[0]], 1.3, 3), p[2] + wp * fbm(nD, [p[2], p[0] + 5.7, p[1]], 1.3, 3)];
    const base = fbm(nE, q, 1.55, 6) * 0.9 + fbm(nE, p, 5.5, 3) * 0.12 + fbm(nE, p, 15, 3) * 0.035;
    const dh = angle(p, homeDir);
    let e = base - 0.08 + 0.3 * gauss(dh, knownRadius);
    {
      const tcoord = fbm(nR, q, 2.2, 2);
      const t = Math.abs(tcoord);
      const chain = Math.pow(Math.max(0, 1 - t / 0.2), 1.6), foot = Math.max(0, 1 - t / 0.5);
      const ridged = 1 - Math.abs(fbm(nD, p, 16, 3));
      const inland = Math.max(0, Math.min(1, (base + 0.18) * 2.4));
      const damp = 1 - 0.85 * gauss(dh, 0.2); // ikke rett utenfor hjemmeflekken
      e += (0.3 * chain * (0.6 + 0.4 * ridged) + 0.09 * foot * foot) * inland * damp;
    }
    // Kontinentet rundt hjemmet er for det meste lavland; fjellkjeder kommer fra egne rygger og fjell-land.
    if (e > 0.18) e = 0.18 + (e - 0.18) * (1 - 0.55 * gauss(dh, knownRadius));
    // Fuktighetsbelter: bredere, mer sammenhengende enn før; fuktigere ved kyst og i fotland, tørrere inne i det høye.
    let moist = 0.5 + fbm(nM, p, 1.4, 3) * 0.75 + fbm(nM, p, 6, 2) * 0.18 + 0.12 * Math.cos((Math.asin(p[2]) - 1.0) * 3.2);
    moist += 0.18 * (1 - Math.min(1, Math.abs(e - 0.06) / 0.2)) - 0.12 * Math.max(0, e - 0.32);
    if (dh < 0.85) {
      for (const f of feats) {
        const d0 = angle(p, f.dir);
        if (d0 > 0.3 * (f.F.stretch || 1)) continue;
        // Uregelmessig kant (støy på avstanden) i stedet for en ren sirkel.
        let d = d0 * (0.72 + 0.7 * (0.5 + 0.5 * fbm(nD, p, 11, 2)));
        if (f.F.stretch) { // fjellrike: en avlang rygg i en fast retning per land
          const l = localOffset(home.basis, p), dx = l.x - f.x, dy = l.y - f.y, ca = Math.cos(f.ang), sa = Math.sin(f.ang);
          d = Math.hypot((dx * ca + dy * sa) / f.F.stretch, -dx * sa + dy * ca) * (0.8 + 0.5 * (0.5 + 0.5 * fbm(nD, p, 11, 2)));
        }
        const g = 0.88 * gauss(d, f.F.r);
        let target = f.F.target;
        if (f.F.rugged) target += 0.4 * Math.abs(fbm(nD, p, 24, 3));
        if (f.F.valley) target += 0.3 * (1 - gauss(d, f.F.r * 0.6)); // åsrygger rundt en lav dalbunn
        e = e * (1 - g) + target * g;
        moist = moist * (1 - g) + f.F.moist * g;
        if (f.bay) e -= 0.6 * gauss(angle(p, f.bay), 0.045);
      }
      // Hjemmeregionen: mild, skogkledd lavlandsflekk som stemmer med den detaljerte verdenen.
      const hp = gauss(dh * (0.8 + 0.5 * (0.5 + 0.5 * fbm(nD, p, 13, 2))), 0.07);
      e = e * (1 - hp) + 0.12 * hp;
      moist = moist * (1 - hp) + 0.72 * hp;
    }
    const lat = Math.asin(p[2]);
    const temp = Math.max(0, Math.min(1, Math.cos(lat) * 1.2 - 0.08 - Math.max(0, e) * 0.45 + fbm(nM, p, 3.1, 2) * 0.08));
    return { e, moist: Math.max(0, Math.min(1, moist)), temp, lat };
  }

  // Lesbart landskap (brukes av tegning og tester).
  function biomeAt(p) {
    const s = surface(p);
    if (s.e < PLANET.seaLevel) return s.e < -0.18 ? 'hav' : 'grunt';
    if (s.e > 0.42) return 'fjell';
    if (s.temp < 0.14) return 'is';
    if (s.temp > 0.8 && s.moist < 0.35) return 'ørken';
    if (s.moist > 0.55) return 'skog';
    return 'slette';
  }

  // Hjemmeregionens verdenskoordinater ↔ planeten.
  const worldToLocal = (wx, wy) => ({ x: (wx / W - 0.5) * patch.w, y: -(wy / H - 0.5) * patch.h });
  const localToWorld = (x, y) => ({ x: (x / patch.w + 0.5) * W, y: (-y / patch.h + 0.5) * H });
  const worldToDir = (wx, wy) => { const l = worldToLocal(wx, wy); return offsetDir(home.basis, l.x, l.y); };
  const dirToWorld = (p) => { const l = localOffset(home.basis, p); return localToWorld(l.x, l.y); };

  return { seed, home, patch, sites, surface, biomeAt, worldToLocal, localToWorld, worldToDir, dirToWorld, knownRadius };
}

// Hvor mye av et land som er avdekket på planeten (0..1) ut fra regionens tilstand.
export function revealOf(region) {
  if (region.home) return 1;
  return { ukjent: 0, oppdaget: 0.75, utpost: 1, etablert: 1.15 }[region.state] ?? 0;
}
