// Prosedyrale steinblokker. Antall synlige blokker følger gjenværende stein.
import { mulberry, paintSprite, dab, jitter, rgba } from './paint.js';

const geoCache = new Map();
export function rockGeometry(rock) {
  let g = geoCache.get(rock.id);
  if (g) return g;
  const r = mulberry(rock.id * 31 + 5);
  const R = rock.radius;
  const n = 3 + Math.floor(r() * 3);
  const boulders = [{ x: 0, y: 0, r: R * 0.62, seed: r() * 1e6 }];
  for (let i = 1; i < n; i++) {
    const a = r() * Math.PI * 2, d = R * (0.45 + r() * 0.3);
    boulders.push({ x: Math.cos(a) * d, y: Math.abs(Math.sin(a)) * d * 0.45 + R * 0.05, r: R * (0.2 + r() * 0.18), seed: r() * 1e6 });
  }
  // Fjerningsrekkefølge: de minste forsvinner først, hovedblokken sist.
  const removalOrder = boulders.map((b, i) => i).sort((a, b) => boulders[a].r - boulders[b].r);
  g = { boulders, removalOrder, moss: r() < 0.7 };
  geoCache.set(rock.id, g);
  return g;
}

export const visibleBoulders = (rock) => {
  const n = rockGeometry(rock).boulders.length;
  return Math.ceil((rock.stone / rock.maxStone) * n);
};

function paintBoulder(ctx, b, moss) {
  const rnd = mulberry(Math.floor(b.seed));
  const cy = b.y - b.r * 0.55;
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rr = b.r * (0.82 + rnd() * 0.3);
    pts.push([b.x + Math.cos(a) * rr, Math.min(b.y + 1.2, cy + Math.sin(a) * rr * 0.75)]);
  }
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= pts.length; i++) {
      const p = pts[i % pts.length], q = pts[(i - 1) % pts.length];
      ctx.quadraticCurveTo(q[0], q[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  };
  // Kontaktskygge.
  dab(ctx, b.x + b.r * 0.15, b.y + 0.8, b.r * 1.05, b.r * 0.28, 0, 'rgba(20,18,14,0.35)');
  path();
  ctx.fillStyle = 'rgb(112,106,96)';
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  const base = [120, 114, 102];
  const n = Math.round(b.r * b.r * 1.6 + 20);
  for (let i = 0; i < n; i++) {
    const x = b.x + (rnd() - 0.5) * b.r * 2.2, y = cy + (rnd() - 0.5) * b.r * 1.7;
    const light = 1.22 - ((x - b.x) / b.r) * 0.18 - ((y - cy) / b.r) * 0.5;
    dab(ctx, x, y, 0.8 + rnd() * 1.8, 0.5 + rnd() * 1.0, rnd() * Math.PI, rgba(jitter([base[0] * light, base[1] * light, base[2] * light], rnd, 0.18), 0.75));
  }
  if (moss) {
    for (let i = 0; i < b.r * 3; i++) {
      const x = b.x - b.r * 0.2 + (rnd() - 0.6) * b.r * 1.1, y = cy - b.r * 0.35 + (rnd() - 0.5) * b.r * 0.5;
      dab(ctx, x, y, 0.7 + rnd() * 1.2, 0.5 + rnd() * 0.6, rnd() * 3, rgba(jitter([82, 96, 52], rnd, 0.25), 0.7));
    }
  }
  ctx.strokeStyle = 'rgba(40,36,30,0.55)';
  ctx.lineWidth = 0.35;
  for (let c = 0; c < 2; c++) {
    let x = b.x + (rnd() - 0.5) * b.r, y = cy - b.r * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) { x += (rnd() - 0.5) * b.r * 0.5; y += b.r * 0.22; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  const grad = ctx.createLinearGradient(0, cy - b.r * 0.2, 0, b.y + 1);
  grad.addColorStop(0, 'rgba(20,18,15,0)');
  grad.addColorStop(1, 'rgba(20,18,15,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(b.x - b.r * 1.3, cy - b.r, b.r * 2.6, b.r * 2.2);
  ctx.restore();
  path();
  ctx.strokeStyle = 'rgba(38,34,28,0.35)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

const cache = new Map();
export function rockSprite(rock, k) {
  const key = rock.id + ':' + k;
  let s = cache.get(key);
  if (s) return s;
  const geo = rockGeometry(rock);
  const R = rock.radius;
  const W = R * 2.8 + 12, H = R * 1.7 + 10;
  s = paintSprite(W, H, W / 2, H - 5, (ctx) => {
    const rnd = mulberry(rock.id * 7 + 1);
    // Grus rundt foten — blir liggende når steinen er brutt ned.
    for (let i = 0; i < R * 2.5; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R * 1.05;
      dab(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.35 + 1, 0.5 + rnd() * 0.9, 0.35 + rnd() * 0.4, rnd() * 3, rgba(jitter([128, 120, 106], rnd, 0.3), 0.8));
    }
    const hidden = new Set(geo.removalOrder.slice(0, geo.boulders.length - k));
    const order = geo.boulders.map((b, i) => i).filter((i) => !hidden.has(i)).sort((a, b) => geo.boulders[a].y - geo.boulders[b].y);
    for (const i of order) paintBoulder(ctx, geo.boulders[i], geo.moss && i === 0);
  });
  cache.set(key, s);
  return s;
}
