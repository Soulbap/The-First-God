// Forhåndsmalt terreng: miljøstyrt grunnfarge, lagdelte penselstrøk, skogbunn (strø, mose, bart jordsmonn,
// småstein, kvister) og et sømløst finkornslag som holder bakken levende ved nærzoom.
import { makeCanvas, makeNoise, fbm, mix, smooth, clamp, rgba, jitter, dab, mulberry, tileNoise } from './paint.js';
import { envAt } from './environment.js';

export const TERRAIN_SCALE = 2; // piksler per verdensenhet i terrengbildet

const LUSH = [76, 92, 46], DRY = [112, 110, 66], MOSS = [54, 72, 42], DIRT = [112, 92, 66];
const NEEDLE = [88, 72, 52], LEAF = [112, 100, 58], WET = [58, 76, 44], MUD = [78, 68, 50];

export function terrainColorFn(state, env) {
  const s = state.seed;
  const nA = makeNoise(s + 11), nB = makeNoise(s + 23), nC = makeNoise(s + 37), nD = makeNoise(s + 41);
  const C = state.settlement.center;
  const p = state.world.pond;
  const elev = (x, y) => fbm(nA, x / 650, y / 650, 4);
  return (x, y) => {
    const e = envAt(env, x, y);
    const m = fbm(nB, x / 190, y / 190, 3);
    let col = mix(LUSH, DRY, smooth(0.46, 0.72, m) * 0.34);
    col = mix(col, MOSS, smooth(0.35, 0.85, e.moisture) * 0.4);
    // Under kronene: barnåler under gran, løv under bjørk; litt mørkere.
    const litter = mix(LEAF, NEEDLE, e.conifer);
    col = mix(col, litter, smooth(0.2, 0.85, e.canopy) * 0.5);
    const shade = 1 - e.canopy * 0.16;
    // Bart jordsmonn med uregelmessige kanter.
    const dd = fbm(nC, x / 38, y / 38, 3);
    col = mix(col, DIRT, smooth(0.4, 0.74, e.soil + (dd - 0.5) * 0.5) * 0.7);
    // Lysere, tørrere lysninger.
    col = mix(col, [134, 128, 80], smooth(0.5, 0.78, fbm(nD, x / 300 + 40, y / 300, 3)) * 0.14 * (1 - e.canopy));
    const dc = Math.hypot(x - C.x, (y - C.y) * 1.3);
    col = mix(col, [104, 96, 66], (1 - smooth(30, 140, dc)) * 0.14);
    const pd = Math.hypot((x - p.x) / p.rx, (y - p.y) / p.ry);
    if (pd < 1.5) col = mix(col, WET, (1 - smooth(1.05, 1.5, pd)) * 0.65);
    if (pd < 1.12) col = mix(col, MUD, (1 - smooth(0.98, 1.12, pd)) * 0.8);
    const sh = clamp(1 + (elev(x - 8, y - 8) - elev(x + 8, y + 8)) * 6, 0.9, 1.1) * shade;
    return [col[0] * sh, col[1] * sh, col[2] * sh];
  };
}

export function buildTerrain(state, env) {
  const { width: W, height: H, pond } = state.world;
  const TS = TERRAIN_SCALE;
  const canvas = makeCanvas(W * TS, H * TS);
  const ctx = canvas.getContext('2d');
  const colorAt = terrainColorFn(state, env);

  // Grunnlag i lav oppløsning, myk oppskalering.
  const cell = 3;
  const lw = Math.ceil(W / cell), lh = Math.ceil(H / cell);
  const low = makeCanvas(lw, lh);
  const lctx = low.getContext('2d');
  const img = lctx.createImageData(lw, lh);
  for (let j = 0; j < lh; j++) {
    for (let i = 0; i < lw; i++) {
      const c = colorAt(i * cell, j * cell);
      const o = (j * lw + i) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
    }
  }
  lctx.putImageData(img, 0, 0);
  const baseAt = (x, y) => {
    const i = Math.min(lw - 1, Math.max(0, Math.round(x / cell))), j = Math.min(lh - 1, Math.max(0, Math.round(y / cell)));
    const o = (j * lw + i) * 4;
    return [img.data[o], img.data[o + 1], img.data[o + 2]];
  };
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(low, 0, 0, W * TS, H * TS);

  ctx.save();
  ctx.scale(TS, TS);
  const rnd = mulberry(state.seed + 99);
  const inPondArea = (x, y) => Math.hypot((x - pond.x) / pond.rx, (y - pond.y) / pond.ry) < 1.08;
  ctx.lineCap = 'round';

  // 1) Brede penselstrøk gir maleritekstur uten store flekker.
  for (let i = 0; i < Math.round((W * H) / 220); i++) {
    const x = rnd() * W, y = rnd() * H;
    const c = jitter(baseAt(x, y), rnd, 0.12);
    dab(ctx, x, y, 3 + rnd() * 6, 1 + rnd() * 2.2, (rnd() - 0.5) * 1.2, rgba(c, 0.12 + rnd() * 0.12));
  }
  // 2) Fine gresstrøk: korte, nesten vertikale — tettere der det er fuktig og åpent.
  for (let i = 0; i < Math.round((W * H) / 52); i++) {
    const x = rnd() * W, y = rnd() * H;
    const e = envAt(env, x, y);
    if (rnd() > (1 - e.soil * 0.9) * (0.55 + e.moisture * 0.45)) continue;
    const k = rnd();
    const base = baseAt(x, y);
    const c = k < 0.5 ? jitter([base[0] * 0.82, base[1] * 0.86, base[2] * 0.8], rnd, 0.2) : jitter([base[0] * 1.2, base[1] * 1.18, base[2] * 0.95], rnd, 0.2);
    dab(ctx, x, y, 0.35 + rnd() * 0.45, 0.9 + rnd() * 1.5, (rnd() - 0.5) * 0.9, rgba(c, 0.3 + rnd() * 0.35));
  }

  // 3) Skogbunn under trærne: myk skygge på lesiden av lyset (lys fra øvre venstre).
  for (const n of state.nodes) {
    if (n.kind !== 'tree' || n.growth < 0.4) continue;
    const r = 24 + n.growth * 30;
    const g = ctx.createRadialGradient(n.x + 6, n.y - 3, 2, n.x + 6, n.y - 3, r);
    g.addColorStop(0, n.species === 'spruce' ? 'rgba(26,30,18,0.34)' : 'rgba(34,42,20,0.2)');
    g.addColorStop(1, 'rgba(26,30,18,0)');
    ctx.fillStyle = g;
    ctx.fillRect(n.x + 6 - r, n.y - 3 - r, r * 2, r * 2);
    // Rotsone: litt bar jord og røtter ved stammefoten.
    dab(ctx, n.x, n.y + 0.5, 3 + n.growth * 4, 1.4 + n.growth * 1.6, 0, rgba([62, 50, 36], 0.28));
  }

  // 4) Strø: barnåler, løv og kvister fordelt etter kronedekket.
  for (let i = 0; i < Math.round((W * H) / 130); i++) {
    const x = rnd() * W, y = rnd() * H;
    const e = envAt(env, x, y);
    if (e.canopy < 0.12 || inPondArea(x, y)) continue;
    const q = rnd();
    if (q > e.canopy * 0.9) continue;
    const a = rnd() * Math.PI;
    if (rnd() < e.conifer) {
      ctx.strokeStyle = rgba(jitter(NEEDLE, rnd, 0.35), 0.42);
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * (1 + rnd() * 1.6), y + Math.sin(a) * (0.6 + rnd() * 1.0));
      ctx.stroke();
    } else {
      const lc = [[150, 126, 58], [122, 98, 50], [168, 148, 70], [96, 108, 52]][Math.floor(rnd() * 4)];
      dab(ctx, x, y, 0.5 + rnd() * 0.6, 0.3 + rnd() * 0.3, a, rgba(lc, 0.55));
    }
  }
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * W, y = rnd() * H;
    const e = envAt(env, x, y);
    if (rnd() > e.canopy * 0.8 + 0.04 || inPondArea(x, y)) continue;
    const a = rnd() * Math.PI, len = 2.5 + rnd() * 5, bend = (rnd() - 0.5) * 1.2;
    ctx.strokeStyle = rgba(jitter([70, 54, 38], rnd, 0.3), 0.7);
    ctx.lineWidth = 0.28 + rnd() * 0.22;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + bend, y + Math.sin(a) * len * 0.3, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.5);
    ctx.stroke();
  }

  // 5) Mose i fuktige, skyggefulle strøk.
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * W, y = rnd() * H;
    const e = envAt(env, x, y);
    if (inPondArea(x, y) || rnd() > e.moisture * (0.25 + e.canopy * 0.9) * 0.9 - 0.12) continue;
    const r = 3 + rnd() * 7, cnt = 10 + Math.floor(rnd() * 16);
    for (let j = 0; j < cnt; j++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r;
      dab(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 0.6 + rnd() * 1.4, 0.4 + rnd() * 0.7, rnd() * 3, rgba(jitter([64, 86, 44], rnd, 0.3), 0.35 + rnd() * 0.3));
    }
  }

  // 6) Bart jordsmonn: uregelmessige flekker med småstein.
  for (let i = 0; i < 2200; i++) {
    const x = rnd() * W, y = rnd() * H;
    const e = envAt(env, x, y);
    if (inPondArea(x, y) || e.soil < 0.38 || rnd() > e.soil) continue;
    const r = 3 + rnd() * 8, cnt = 8 + Math.floor(rnd() * 14);
    for (let j = 0; j < cnt; j++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r;
      dab(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 0.7 + rnd() * 1.8, 0.5 + rnd() * 0.9, rnd() * 3, rgba(jitter(DIRT, rnd, 0.28), 0.3 + rnd() * 0.3));
    }
  }

  // 7) Småstein: tettest i bart jordsmonn, ofte i små grupper.
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * W, y = rnd() * H;
    const e = envAt(env, x, y);
    if (inPondArea(x, y) || rnd() > 0.1 + e.soil * 0.7) continue;
    const group = rnd() < 0.3 ? 2 + Math.floor(rnd() * 3) : 1;
    for (let g = 0; g < group; g++) {
      const px = x + (rnd() - 0.5) * 5, py = y + (rnd() - 0.5) * 3;
      const k = 0.7 + rnd() * 0.55, sz = 0.55 + rnd() * rnd() * 1.6;
      dab(ctx, px + 0.35, py + 0.4, sz * 1.1, sz * 0.55, 0, 'rgba(26,24,16,0.32)');
      dab(ctx, px, py, sz, sz * 0.62, rnd(), rgba([128 * k, 122 * k, 108 * k], 0.88));
      dab(ctx, px - sz * 0.25, py - sz * 0.2, sz * 0.5, sz * 0.28, 0, 'rgba(206,200,184,0.42)');
    }
  }

  // Tjern: dypt i midten, lysere grunne kanter, bredd av gjørme.
  ctx.save();
  ctx.translate(pond.x, pond.y);
  ctx.scale(1, pond.ry / pond.rx);
  const g = ctx.createRadialGradient(-pond.rx * 0.15, -pond.rx * 0.1, pond.rx * 0.1, 0, 0, pond.rx);
  g.addColorStop(0, 'rgb(32,52,58)');
  g.addColorStop(0.7, 'rgb(46,68,70)');
  g.addColorStop(0.92, 'rgb(72,88,78)');
  g.addColorStop(1, 'rgba(82,86,66,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, pond.rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.85;
    const x = pond.x + Math.cos(a) * pond.rx * d, y = pond.y + Math.sin(a) * pond.ry * d;
    dab(ctx, x, y, 3 + rnd() * 8, 0.4 + rnd() * 0.5, 0, rnd() < 0.5 ? 'rgba(150,170,172,0.10)' : 'rgba(20,34,40,0.18)');
  }
  // Steiner og gjørme langs bredden.
  for (let i = 0; i < 160; i++) {
    const a = rnd() * Math.PI * 2, d = 1.0 + rnd() * 0.12;
    const x = pond.x + Math.cos(a) * pond.rx * d, y = pond.y + Math.sin(a) * pond.ry * d;
    const k = 0.7 + rnd() * 0.5, sz = 0.6 + rnd() * 1.3;
    dab(ctx, x + 0.3, y + 0.4, sz, sz * 0.5, 0, 'rgba(20,24,18,0.4)');
    dab(ctx, x, y, sz, sz * 0.6, rnd(), rgba([118 * k, 114 * k, 102 * k], 0.85));
  }
  ctx.restore();
  return canvas;
}

// Sømløs finkornsflis (én flis, to støylag med ulik periode, lys/mørk med alfa). Flislegges over 200 verdensenheter;
// kontrasten er lav og kornet fint, så gjentakelsen ikke synes. Ordinær blanding holder bildet billig.
export const GRAIN_UNITS = 200;
export function buildGrain(seed) {
  const size = 768;
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const im = g.createImageData(size, size);
  const layers = [[32, 4, 0.6, seed + 5], [48, 3, 0.4, seed + 77]].map(([P, oct, w, sd]) => ({ w, oct, P, nz: Array.from({ length: oct }, (_, o) => tileNoise(sd + o * 13, P * (1 << o))) }));
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let v = 0;
      for (const L of layers) {
        let a = 0.5, norm = 0, sum = 0;
        for (let o = 0; o < L.oct; o++) { const f = (L.P * (1 << o)) / size; sum += a * L.nz[o](i * f, j * f); norm += a; a *= 0.62; }
        v += (sum / norm) * L.w;
      }
      const d = clamp((v - 0.5) * 2.8, -1, 1), o = (j * size + i) * 4;
      if (d > 0) { im.data[o] = 255; im.data[o + 1] = 244; im.data[o + 2] = 205; } else { im.data[o] = 14; im.data[o + 1] = 20; im.data[o + 2] = 8; }
      im.data[o + 3] = Math.abs(d) * 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}
