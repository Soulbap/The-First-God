// Gress, bregner, kvister, steiner, busker, falne stammer og undervegetasjon.
// Plasseres deterministisk fra verdens-seed og miljøfeltet (fukt, kronedekke, jordsmonn) — ikke jevnt drysset.
import { mulberry, paintSprite, dab, taper, jitter, rgba, makeNoise, fbm, smooth, clamp, makeCanvas, RS } from './paint.js';
import { inPond } from '../sim/world.js';
import { envAt } from './environment.js';

const GRASS = [[78, 96, 48], [92, 106, 54], [108, 112, 62], [66, 82, 44], [120, 116, 72]];
export const TUFT = { grass: 12, flower: 4, reed: 3, dry: 4 };

function paintTuft(seed, kind) {
  const rnd = mulberry(seed);
  const tall = kind === 'reed' ? 17 : kind === 'dry' ? 5 + rnd() * 3 : 5 + rnd() * 4.5;
  const W = 14, H = tall + 4;
  return paintSprite(W, H, W / 2, H - 2, (ctx) => {
    dab(ctx, 0, 0, 4.2, 1.0, 0, 'rgba(26,30,16,0.3)');
    const blades = kind === 'reed' ? 9 : 10 + Math.floor(rnd() * 8);
    ctx.lineCap = 'round';
    for (let i = 0; i < blades; i++) {
      const bx = (rnd() - 0.5) * 6;
      const h = tall * (0.45 + rnd() * 0.6);
      const lean = (rnd() - 0.5) * h * 0.8;
      const base = kind === 'reed' ? [72, 84, 50] : kind === 'dry' ? [[116, 110, 66], [100, 98, 58], [128, 120, 76]][i % 3] : GRASS[Math.floor(rnd() * GRASS.length)];
      ctx.strokeStyle = rgba(jitter(base, rnd, 0.25), 0.9);
      ctx.lineWidth = kind === 'reed' ? 0.7 : 0.4 + rnd() * 0.3;
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

function paintFern(seed) {
  const rnd = mulberry(seed);
  const R = 8 + rnd() * 5;
  return paintSprite(R * 2 + 6, R + 8, R + 3, R + 5, (ctx) => {
    dab(ctx, 0, 0, R * 0.6, 1.2, 0, 'rgba(22,28,14,0.3)');
    const fronds = 6 + Math.floor(rnd() * 4);
    ctx.lineCap = 'round';
    for (let i = 0; i < fronds; i++) {
      const a = -Math.PI * (0.08 + 0.84 * (i + rnd() * 0.6) / fronds);
      const len = R * (0.65 + rnd() * 0.5);
      const ex = Math.cos(a) * len, ey = Math.sin(a) * len * 0.8 + len * 0.2;
      const cx = Math.cos(a) * len * 0.5, cy = Math.sin(a) * len * 1.05;
      const col = jitter([[58, 86, 44], [70, 96, 48], [48, 74, 40]][i % 3], rnd, 0.22);
      ctx.strokeStyle = rgba(col, 0.95);
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();
      // Småblader langs stilken.
      const n = 7 + Math.floor(len * 0.5);
      for (let k = 1; k < n; k++) {
        const t = k / n, u = 1 - t;
        const px = 2 * u * t * cx + t * t * ex, py = 2 * u * t * cy + t * t * ey;
        const ll = (1 - t * 0.75) * len * 0.22;
        const tx = 2 * u * cx + 2 * t * (ex - cx), ty = 2 * u * cy + 2 * t * (ey - cy);
        const tl = Math.hypot(tx, ty) || 1;
        const nx = -ty / tl, ny = tx / tl;
        ctx.strokeStyle = rgba(jitter(col, rnd, 0.2), 0.85);
        ctx.lineWidth = 0.32;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + nx * ll + tx / tl * ll * 0.4, py + ny * ll + ty / tl * ll * 0.4);
        ctx.moveTo(px, py);
        ctx.lineTo(px - nx * ll + tx / tl * ll * 0.4, py - ny * ll + ty / tl * ll * 0.4);
        ctx.stroke();
      }
    }
  });
}

function paintStick(seed) {
  const rnd = mulberry(seed);
  return paintSprite(16, 8, 8, 4, (ctx) => {
    const len = 5 + rnd() * 5, a = (rnd() - 0.5) * 0.7;
    const x1 = Math.cos(a) * len, y1 = Math.sin(a) * len * 0.5;
    dab(ctx, 0.3, 0.7, len * 0.55, 0.5, a * 0.5, 'rgba(20,18,12,0.28)');
    taper(ctx, -x1, -y1, x1, y1, 0.75, 0.45, rgba(jitter([86, 66, 46], rnd, 0.25), 1));
    taper(ctx, -x1, -y1 - 0.15, x1, y1 - 0.15, 0.25, 0.15, 'rgba(150,126,92,0.55)');
    if (rnd() < 0.7) {
      const t = 0.1 + rnd() * 0.5, sx = -x1 + (x1 * 2) * t, sy = -y1 + (y1 * 2) * t;
      const b = a + (rnd() < 0.5 ? 0.7 : -0.7);
      taper(ctx, sx, sy, sx + Math.cos(b) * len * 0.4, sy + Math.sin(b) * len * 0.22, 0.45, 0.25, rgba([82, 62, 44], 1));
    }
  });
}

function paintStones(seed) {
  const rnd = mulberry(seed);
  return paintSprite(18, 9, 9, 5, (ctx) => {
    const n = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const x = (rnd() - 0.5) * 9, y = (rnd() - 0.5) * 3, sz = 0.9 + rnd() * rnd() * 2.2, k = 0.75 + rnd() * 0.5;
      dab(ctx, x + 0.5, y + 0.55, sz * 1.15, sz * 0.58, 0, 'rgba(22,20,14,0.38)');
      dab(ctx, x, y, sz, sz * 0.68, rnd(), rgba([128 * k, 122 * k, 108 * k], 1));
      dab(ctx, x - sz * 0.3, y - sz * 0.25, sz * 0.5, sz * 0.3, 0, 'rgba(206,200,184,0.5)');
      dab(ctx, x + sz * 0.2, y + sz * 0.25, sz * 0.7, sz * 0.25, 0, 'rgba(30,28,22,0.25)');
    }
  });
}

function paintLog(seed) {
  const rnd = mulberry(seed);
  const len = 22 + rnd() * 14, r = 2.2 + rnd() * 1.6, birch = rnd() < 0.35;
  return paintSprite(len + 14, r * 2 + 12, (len + 14) / 2, r * 2 + 7, (ctx) => {
    dab(ctx, 1, 0.8, len * 0.55, r * 0.7, 0, 'rgba(18,16,10,0.34)');
    const x0 = -len / 2, x1 = len / 2, yc = -r;
    const bark = birch ? [182, 176, 160] : [88, 66, 46];
    taper(ctx, x0, yc, x1, yc + (rnd() - 0.5) * 0.8, r * 2, r * 1.8, rgba(bark, 1));
    taper(ctx, x0, yc + r * 0.45, x1, yc + r * 0.45, r * 0.9, r * 0.8, 'rgba(0,0,0,0.28)');
    taper(ctx, x0, yc - r * 0.4, x1, yc - r * 0.4, r * 0.35, r * 0.3, 'rgba(230,214,180,0.3)');
    for (let i = 0; i < len * 1.4; i++) dab(ctx, x0 + rnd() * len, yc + (rnd() - 0.5) * r * 1.7, 0.5 + rnd() * 1.2, 0.2 + rnd() * 0.25, 0, rgba(birch ? [50, 46, 40] : [52, 40, 28], 0.5));
    // Mose på oversiden.
    for (let i = 0; i < len * 0.9; i++) {
      const x = x0 + rnd() * len;
      if (Math.sin(x * 0.4 + seed) < -0.1) continue;
      dab(ctx, x, yc - r * (0.55 + rnd() * 0.35), 0.8 + rnd() * 1.5, 0.45 + rnd() * 0.5, 0, rgba(jitter([70, 94, 46], rnd, 0.3), 0.8));
    }
    // Brutt endestykke med lyst treverk, og en kortere greinstubbe.
    dab(ctx, x1, yc, r * 0.5, r * 0.95, 0, rgba([176, 148, 108], 1));
    dab(ctx, x1, yc, r * 0.26, r * 0.5, 0, 'rgba(120,92,62,0.6)');
    taper(ctx, x0 + len * 0.3, yc - r * 0.5, x0 + len * 0.3 + 1.5, yc - r * 1.7, 0.9, 0.6, rgba(bark, 1));
  });
}

function paintBush(seed, type) {
  const rnd = mulberry(seed);
  if (type === 'juniper') {
    const h = 9 + rnd() * 7, w = 5 + rnd() * 3;
    return paintSprite(w * 2 + 8, h + 6, w + 4, h + 3, (ctx) => {
      dab(ctx, 0.5, 0.5, w * 0.9, 1.4, 0, 'rgba(20,24,14,0.35)');
      for (let i = 0; i < h * w * 2.2; i++) {
        const t = rnd(), y = -t * h, half = w * (1 - t * 0.7) * (0.6 + rnd() * 0.5);
        const x = (rnd() - 0.5) * 2 * half;
        const lit = x < 0 ? 1.15 : 0.85;
        dab(ctx, x, y, 0.9 + rnd(), 0.5, rnd() * 3, rgba(jitter([44 * lit, 60 * lit, 46 * lit], rnd, 0.25), 0.9));
      }
    });
  }
  if (type === 'heath') {
    const w = 8 + rnd() * 5, h = 3 + rnd() * 2;
    return paintSprite(w * 2 + 6, h + 6, w + 3, h + 3, (ctx) => {
      dab(ctx, 0.5, 0.6, w * 0.9, 1.4, 0, 'rgba(20,24,14,0.3)');
      for (let i = 0; i < w * h * 3.4; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
        const x = Math.cos(a) * d * w, y = -h * 0.55 + Math.sin(a) * d * h * 0.75;
        const lit = y < -h * 0.6 ? 1.2 : 0.88;
        dab(ctx, x, y, 0.6 + rnd() * 0.7, 0.35 + rnd() * 0.4, rnd() * 3, rgba(jitter([[84, 78, 56], [66, 82, 48], [96, 70, 62]][i % 3].map((v) => v * lit), rnd, 0.3), 0.9));
      }
      for (let i = 0; i < 6; i++) dab(ctx, (rnd() - 0.5) * w * 1.4, -rnd() * h * 1.1, 0.4, 0.4, 0, rgba([128, 82, 112], 0.9));
    });
  }
  const w = 9 + rnd() * 6, h = 4 + rnd() * 2.4;
  return paintSprite(w * 2 + 6, h + 6, w + 3, h + 3, (ctx) => {
    dab(ctx, 0.5, 0.6, w * 0.9, 1.5, 0, 'rgba(20,24,14,0.32)');
    for (let i = 0; i < w * h * 4; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
      const x = Math.cos(a) * d * w, y = -h * 0.5 + Math.sin(a) * d * h * 0.8;
      const lit = y < -h * 0.5 ? 1.15 : 0.9;
      dab(ctx, x, y, 0.8 + rnd() * 0.8, 0.5, rnd() * 3, rgba(jitter([62 * lit, 80 * lit, 44 * lit], rnd, 0.3), 0.9));
    }
    if (rnd() < 0.6) for (let i = 0; i < 8; i++) dab(ctx, (rnd() - 0.5) * w * 1.4, -rnd() * h, 0.5, 0.5, 0, 'rgba(70,64,110,0.9)');
  });
}

// Forhåndsskjærte svairammer (5 steg) slik at gress og bregner kan tegnes uten skjev transformasjon per bilde.
export const SWAY_STEPS = 5;
function swayFrames(s, maxSkew) {
  const hPx = s.h * RS, pad = Math.ceil(maxSkew * hPx) + 1;
  const frames = [];
  for (let i = 0; i < SWAY_STEPS; i++) {
    const sk = maxSkew * ((i - (SWAY_STEPS - 1) / 2) / ((SWAY_STEPS - 1) / 2));
    const c = makeCanvas(s.canvas.width + pad * 2, s.canvas.height);
    const g = c.getContext('2d');
    const base = s.ay * RS;
    // Toppen forskyves sideveis; foten blir stående.
    g.setTransform(1, 0, -sk, 1, pad + sk * base, 0);
    g.drawImage(s.canvas, 0, 0);
    frames.push({ canvas: c, w: c.width / RS, h: s.h, ax: s.ax + pad / RS, ay: s.ay });
  }
  return frames;
}

let sprites = null;
export function decorSprites() {
  if (!sprites) {
    const tufts = [];
    for (let i = 0; i < TUFT.grass; i++) tufts.push(paintTuft(100 + i, 'grass'));
    for (let i = 0; i < TUFT.flower; i++) tufts.push(paintTuft(200 + i, 'flower'));
    for (let i = 0; i < TUFT.reed; i++) tufts.push(paintTuft(300 + i, 'reed'));
    for (let i = 0; i < TUFT.dry; i++) tufts.push(paintTuft(350 + i, 'dry'));
    const ferns = Array.from({ length: 6 }, (_, i) => paintFern(600 + i));
    sprites = {
      tufts: tufts.map((t) => swayFrames(t, 0.22)),
      ferns: ferns.map((f) => swayFrames(f, 0.07)),
      sticks: Array.from({ length: 6 }, (_, i) => paintStick(700 + i)),
      stones: Array.from({ length: 4 }, (_, i) => paintStones(800 + i)),
      logs: Array.from({ length: 4 }, (_, i) => paintLog(900 + i)),
      bushes: [
        ...Array.from({ length: 4 }, (_, i) => paintBush(400 + i, 'juniper')),
        ...Array.from({ length: 4 }, (_, i) => paintBush(500 + i, 'berry')),
        ...Array.from({ length: 3 }, (_, i) => paintBush(550 + i, 'heath')),
      ],
    };
  }
  return sprites;
}

// Kategori-indekser i tufts: 0–11 gress, 12–15 blomst, 16–18 sivaks, 19–22 tørt gress.
const T_FLOWER = TUFT.grass, T_REED = TUFT.grass + TUFT.flower, T_DRY = T_REED + TUFT.reed;

export function generateDecor(state, env) {
  const rnd = mulberry(state.seed ^ 0x5eed);
  const { width: W, height: H } = state.world;
  const C = state.settlement.center;
  const ground = [], upright = [];
  const clump = makeNoise(state.seed + 501);
  const nodes = state.nodes;
  const tooClose = (x, y, r) => { for (const n of nodes) if (Math.hypot(n.x - x, (n.y - y) * 1.3) < r + (n.kind === 'rock' ? n.radius : 0)) return true; return false; };
  const dCamp = (x, y) => Math.hypot(x - C.x, (y - C.y) * 1.2);

  // Gress: samles i flekker; tynnere under tett skog, på bart jord og i selve leiren.
  for (let i = 0; i < 22000; i++) {
    const x = 10 + rnd() * (W - 20), y = 10 + rnd() * (H - 20);
    if (inPond(state, x, y, 4)) continue;
    const e = envAt(env, x, y);
    const c = fbm(clump, x / 90, y / 90, 3);
    const w = (1 - e.canopy * 0.8) * (1 - e.soil * 0.85) * (0.3 + e.moisture * 0.8) * (0.25 + Math.pow(Math.max(0, c - 0.28) * 2.4, 1.6)) * (0.35 + 0.65 * smooth(20, 170, dCamp(x, y)));
    if (rnd() > w) continue;
    const nearPond = inPond(state, x, y, 26);
    let v;
    if (nearPond && rnd() < 0.7) v = T_REED + Math.floor(rnd() * TUFT.reed);
    else if (e.moisture < 0.3 && rnd() < 0.3) v = T_DRY + Math.floor(rnd() * TUFT.dry);
    else if (rnd() < 0.07 + e.moisture * 0.05) v = T_FLOWER + Math.floor(rnd() * TUFT.flower);
    else v = Math.floor(rnd() * TUFT.grass);
    ground.push({ kind: 'tuft', x, y, v, s: 0.62 + rnd() * 0.55, phase: rnd() * 6 });
  }
  // Bregner: fuktig skygge under kronene, i små grupper.
  for (let i = 0; i < 2600; i++) {
    const x = 10 + rnd() * (W - 20), y = 10 + rnd() * (H - 20);
    if (inPond(state, x, y, 10)) continue;
    const e = envAt(env, x, y);
    if (rnd() > smooth(0.25, 0.75, e.canopy) * smooth(0.3, 0.7, e.moisture) * 0.85 || tooClose(x, y, 7)) continue;
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) ground.push({ kind: 'fern', x: x + (rnd() - 0.5) * 18, y: y + (rnd() - 0.5) * 8, v: Math.floor(rnd() * 6), s: 0.75 + rnd() * 0.55, phase: rnd() * 6 });
  }
  // Kvister og småstein (flate detaljer).
  for (let i = 0; i < 2600; i++) {
    const x = 10 + rnd() * (W - 20), y = 10 + rnd() * (H - 20);
    if (inPond(state, x, y, 4)) continue;
    const e = envAt(env, x, y);
    if (rnd() < e.canopy * 0.7) ground.push({ kind: 'stick', x, y, v: Math.floor(rnd() * 6), s: 0.8 + rnd() * 0.5, flip: rnd() < 0.5 });
  }
  for (let i = 0; i < 900; i++) {
    const x = 10 + rnd() * (W - 20), y = 10 + rnd() * (H - 20);
    if (inPond(state, x, y, 4)) continue;
    const e = envAt(env, x, y);
    if (rnd() < 0.05 + e.soil * 0.55) ground.push({ kind: 'stones', x, y, v: Math.floor(rnd() * 4), s: 0.8 + rnd() * 0.5, flip: rnd() < 0.5 });
  }
  // Busker på skogkanten.
  for (let i = 0; i < 600 && upright.filter((u) => u.kind === 'bush').length < 130; i++) {
    const x = 30 + rnd() * (W - 60), y = 30 + rnd() * (H - 60);
    if (inPond(state, x, y, 20) || dCamp(x, y) < 130 || tooClose(x, y, 14)) continue;
    const e = envAt(env, x, y);
    const edge = smooth(0.08, 0.3, e.canopy) * (1 - smooth(0.55, 0.85, e.canopy));
    if (rnd() > edge * 1.1 + 0.03) continue;
    const v = e.moisture > 0.55 && rnd() < 0.7 ? 4 + Math.floor(rnd() * 4) : e.soil > 0.4 && rnd() < 0.7 ? 8 + Math.floor(rnd() * 3) : Math.floor(rnd() * 4);
    upright.push({ kind: 'bush', x, y, v });
  }
  // Falne stammer og dødt trevirke i skogen.
  for (let i = 0, n = 0; i < 400 && n < 26; i++) {
    const x = 40 + rnd() * (W - 80), y = 40 + rnd() * (H - 80);
    if (inPond(state, x, y, 20) || dCamp(x, y) < 150 || tooClose(x, y, 22)) continue;
    const e = envAt(env, x, y);
    if (e.canopy < 0.3 || rnd() > e.canopy) continue;
    upright.push({ kind: 'log', x, y, v: Math.floor(rnd() * 4), flip: rnd() < 0.5 });
    n++;
  }
  // Undervegetasjon: unge trær og småplanter i ulik alder ved siden av de modne.
  for (let i = 0, n = 0; i < 1400 && n < 240; i++) {
    const x = 30 + rnd() * (W - 60), y = 30 + rnd() * (H - 60);
    if (inPond(state, x, y, 28) || dCamp(x, y) < 170 || tooClose(x, y, 16)) continue;
    const e = envAt(env, x, y);
    if (rnd() > smooth(0.15, 0.5, e.canopy) * (1 - smooth(0.75, 1.0, e.canopy) * 0.5) * 0.9) continue;
    upright.push({ kind: 'sapling', x, y, species: rnd() < e.conifer * 0.9 + 0.05 ? 'spruce' : 'birch', variant: Math.floor(rnd() * 8), k: Math.floor(rnd() * 3), flip: rnd() < 0.5 });
    n++;
  }
  ground.sort((a, b) => a.y - b.y);
  upright.sort((a, b) => a.y - b.y);
  return { ground, upright };
}
