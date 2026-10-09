// Gresstuster, siv og busker. Rent visuelt; genereres deterministisk fra verdens-seed.
import { mulberry, paintSprite, dab, jitter, rgba, makeNoise, fbm } from './paint.js';
import { inPond } from '../sim/world.js';

const GRASS = [[78, 96, 48], [92, 106, 54], [108, 112, 62], [66, 82, 44], [120, 116, 72]];

function paintTuft(seed, kind) {
  const rnd = mulberry(seed);
  const tall = kind === 'reed' ? 17 : 6 + rnd() * 4;
  const W = kind === 'reed' ? 14 : 14, H = tall + 4;
  return paintSprite(W, H, W / 2, H - 2, (ctx) => {
    dab(ctx, 0, 0, 4.5, 1.1, 0, 'rgba(30,34,18,0.35)');
    const blades = kind === 'reed' ? 9 : 10 + Math.floor(rnd() * 8);
    ctx.lineCap = 'round';
    for (let i = 0; i < blades; i++) {
      const bx = (rnd() - 0.5) * 6;
      const h = tall * (0.5 + rnd() * 0.55);
      const lean = (rnd() - 0.5) * h * 0.7;
      const base = kind === 'reed' ? [72, 84, 50] : GRASS[Math.floor(rnd() * GRASS.length)];
      ctx.strokeStyle = rgba(jitter(base, rnd, 0.25), 0.9);
      ctx.lineWidth = kind === 'reed' ? 0.7 : 0.45 + rnd() * 0.3;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.quadraticCurveTo(bx + lean * 0.3, -h * 0.6, bx + lean, -h);
      ctx.stroke();
    }
    if (kind === 'flower') {
      const col = [[226, 222, 206], [214, 186, 92], [150, 120, 160]][Math.floor(rnd() * 3)];
      for (let i = 0; i < 3 + rnd() * 4; i++) dab(ctx, (rnd() - 0.5) * 7, -tall * (0.6 + rnd() * 0.4), 0.7, 0.6, 0, rgba(jitter(col, rnd, 0.15), 0.95));
    }
    if (kind === 'reed') {
      for (let i = 0; i < 3; i++) dab(ctx, (rnd() - 0.5) * 5, -tall * (0.8 + rnd() * 0.2), 0.5, 1.6, 0.1, 'rgba(92,66,44,0.95)');
    }
  });
}

function paintBush(seed, type) {
  const rnd = mulberry(seed);
  if (type === 'juniper') {
    const h = 9 + rnd() * 7, w = 5 + rnd() * 3;
    return paintSprite(w * 2 + 8, h + 6, w + 4, h + 3, (ctx) => {
      for (let i = 0; i < h * w * 2.2; i++) {
        const t = rnd(), y = -t * h, half = w * (1 - t * 0.7) * (0.6 + rnd() * 0.5);
        const x = (rnd() - 0.5) * 2 * half;
        const lit = x < 0 ? 1.15 : 0.85;
        dab(ctx, x, y, 0.9 + rnd(), 0.5, rnd() * 3, rgba(jitter([44 * lit, 60 * lit, 46 * lit], rnd, 0.25), 0.9));
      }
    });
  }
  const w = 9 + rnd() * 6, h = 4 + rnd() * 2;
  return paintSprite(w * 2 + 6, h + 6, w + 3, h + 3, (ctx) => {
    for (let i = 0; i < w * h * 4; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
      const x = Math.cos(a) * d * w, y = -h * 0.5 + Math.sin(a) * d * h * 0.8;
      const lit = y < -h * 0.5 ? 1.15 : 0.9;
      dab(ctx, x, y, 0.8 + rnd() * 0.8, 0.5, rnd() * 3, rgba(jitter([62 * lit, 80 * lit, 44 * lit], rnd, 0.3), 0.9));
    }
    if (rnd() < 0.6) for (let i = 0; i < 8; i++) dab(ctx, (rnd() - 0.5) * w * 1.4, -rnd() * h, 0.5, 0.5, 0, 'rgba(70,64,110,0.9)');
  });
}

let tuftSprites = null, bushSprites = null;
export function decorSprites() {
  if (!tuftSprites) {
    tuftSprites = [];
    for (let i = 0; i < 12; i++) tuftSprites.push(paintTuft(100 + i, 'grass'));
    for (let i = 0; i < 4; i++) tuftSprites.push(paintTuft(200 + i, 'flower'));
    for (let i = 0; i < 3; i++) tuftSprites.push(paintTuft(300 + i, 'reed'));
    bushSprites = [];
    for (let i = 0; i < 4; i++) bushSprites.push(paintBush(400 + i, 'juniper'));
    for (let i = 0; i < 4; i++) bushSprites.push(paintBush(500 + i, 'berry'));
  }
  return { tufts: tuftSprites, bushes: bushSprites };
}

export function generateDecor(state) {
  const rnd = mulberry(state.seed ^ 0x5eed);
  const { width: W, height: H } = state.world;
  const C = state.settlement.center;
  const tufts = [], bushes = [];
  // Gresset vokser i klynger, ikke jevnt drysset.
  const clump = makeNoise(state.seed + 501);
  for (let i = 0; i < 7000; i++) {
    const x = 10 + rnd() * (W - 20), y = 10 + rnd() * (H - 20);
    if (inPond(state, x, y, 4)) continue;
    const density = fbm(clump, x / 120, y / 120, 3);
    if (rnd() > 0.15 + Math.pow(Math.max(0, density - 0.3) * 2.2, 2)) continue;
    const nearPond = inPond(state, x, y, 26);
    const v = nearPond && rnd() < 0.7 ? 16 + Math.floor(rnd() * 3) : (rnd() < 0.1 ? 12 + Math.floor(rnd() * 4) : Math.floor(rnd() * 12));
    tufts.push({ x, y, v, s: 0.8 + rnd() * 0.5, phase: rnd() * 6 });
  }
  for (let i = 0; i < 90; i++) {
    const x = 30 + rnd() * (W - 60), y = 30 + rnd() * (H - 60);
    if (inPond(state, x, y, 20) || Math.hypot(x - C.x, y - C.y) < 120) continue;
    bushes.push({ x, y, v: Math.floor(rnd() * 8) });
  }
  tufts.sort((a, b) => a.y - b.y);
  return { tufts, bushes };
}
