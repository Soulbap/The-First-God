// Forhåndsmalt terreng: støybasert grunnfarge, lysskygge fra høyde, penselstrøk og en liten tjern.
import { makeCanvas, makeNoise, fbm, mix, smooth, clamp, rgba, jitter, dab, mulberry } from './paint.js';

export const TERRAIN_SCALE = 1.5; // piksler per verdensenhet i terrengbildet

const LUSH = [74, 90, 46], DRY = [124, 120, 74], MOSS = [54, 68, 40], DIRT = [112, 94, 68];
const TRAMPLED = [104, 96, 66], WET = [58, 76, 44], MUD = [78, 68, 50], SUNLIT = [146, 142, 88];

export function terrainColorFn(state) {
  const s = state.seed;
  const nA = makeNoise(s + 11), nB = makeNoise(s + 23), nC = makeNoise(s + 37);
  const C = state.settlement.center;
  const p = state.world.pond;
  const elev = (x, y) => fbm(nA, x / 650, y / 650, 4);
  return (x, y) => {
    const m = fbm(nB, x / 260, y / 260, 4);
    const d = fbm(nC, x / 70, y / 70, 3);
    let col = mix(LUSH, DRY, smooth(0.42, 0.7, m));
    col = mix(col, MOSS, smooth(0.46, 0.26, m) * 0.6);
    col = mix(col, SUNLIT, smooth(0.55, 0.72, fbm(nC, x / 420 + 40, y / 420, 3)) * 0.3);
    col = mix(col, DIRT, smooth(0.64, 0.8, d) * 0.5);
    const dc = Math.hypot(x - C.x, (y - C.y) * 1.3);
    col = mix(col, TRAMPLED, (1 - smooth(30, 150, dc)) * 0.22);
    const pd = Math.hypot((x - p.x) / p.rx, (y - p.y) / p.ry);
    if (pd < 1.5) col = mix(col, WET, (1 - smooth(1.05, 1.5, pd)) * 0.65);
    if (pd < 1.12) col = mix(col, MUD, (1 - smooth(0.98, 1.12, pd)) * 0.8);
    const sh = clamp(1 + (elev(x - 8, y - 8) - elev(x + 8, y + 8)) * 10, 0.82, 1.18);
    return [col[0] * sh, col[1] * sh, col[2] * sh];
  };
}

export function buildTerrain(state) {
  const { width: W, height: H, pond } = state.world;
  const TS = TERRAIN_SCALE;
  const canvas = makeCanvas(W * TS, H * TS);
  const ctx = canvas.getContext('2d');
  const colorAt = terrainColorFn(state);

  // Grunnlag i lav oppløsning, myk oppskalering.
  const cell = 4;
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
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(low, 0, 0, W * TS, H * TS);

  ctx.save();
  ctx.scale(TS, TS);
  const rnd = mulberry(state.seed + 99);
  // Penselstrøk som gir maleritekstur.
  const strokes = Math.round((W * H) / 70);
  for (let i = 0; i < strokes; i++) {
    const x = rnd() * W, y = rnd() * H;
    const c = jitter(colorAt(x, y), rnd, 0.16);
    dab(ctx, x, y, 2 + rnd() * 4, 0.7 + rnd() * 1.1, (rnd() - 0.5) * 0.7, rgba(c, 0.35 + rnd() * 0.3));
  }
  // Skogbunn: skygge og barnåler under de opprinnelige lundene gir dybde og lesbarhet.
  for (const n of state.nodes) {
    if (n.kind !== 'tree' || n.growth < 0.4) continue;
    const r = 26 + n.growth * 30;
    const g = ctx.createRadialGradient(n.x + 6, n.y - 4, 2, n.x + 6, n.y - 4, r);
    g.addColorStop(0, n.species === 'spruce' ? 'rgba(30,32,20,0.42)' : 'rgba(40,46,24,0.28)');
    g.addColorStop(1, 'rgba(30,32,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(n.x + 6 - r, n.y - 4 - r, r * 2, r * 2);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.8;
      dab(ctx, n.x + Math.cos(a) * d, n.y - 4 + Math.sin(a) * d * 0.7, 1 + rnd() * 2, 0.5, rnd() * 3, n.species === 'spruce' ? 'rgba(96,72,48,0.35)' : 'rgba(120,110,60,0.3)');
    }
  }
  // Småstein.
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W, y = rnd() * H;
    const k = 0.75 + rnd() * 0.5;
    dab(ctx, x + 0.4, y + 0.4, 1 + rnd(), 0.6, 0, 'rgba(30,28,20,0.3)');
    dab(ctx, x, y, 0.8 + rnd() * 0.8, 0.55, rnd(), rgba([132 * k, 126 * k, 112 * k], 0.8));
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
  ctx.restore();
  return canvas;
}
