// Bygg som males i byggetrinn: grunn → stenger/stolper → vegger → tak/dekke → dør.
import { mulberry, paintSprite, dab, taper, jitter, rgba, clamp, smooth, lerp } from './paint.js';

const STEPS = 48; // kvantisering av byggefremdrift for mellomlagring

function groundAndStones(ctx, rnd, rx, ry, p, stoneCount) {
  const a = smooth(0, 0.1, p);
  dab(ctx, 0, 0, rx + 6, ry + 3.5, 0, rgba([96, 80, 60], 0.45 * a));
  for (let i = 0; i < 40 * a; i++) dab(ctx, (rnd() - 0.5) * rx * 2.2, (rnd() - 0.5) * ry * 2.2, 1 + rnd() * 2, 0.6, 0, rgba(jitter([110, 92, 68], rnd, 0.3), 0.35));
  const n = Math.floor(clamp(p / 0.14) * stoneCount);
  const order = [];
  for (let i = 0; i < stoneCount; i++) order.push(((i / stoneCount) * Math.PI * 2) + Math.PI);
  for (let i = 0; i < n; i++) {
    const t = order[i];
    const x = Math.cos(t) * (rx + 1), y = Math.sin(t) * (ry + 0.6);
    const k = 0.8 + rnd() * 0.4;
    dab(ctx, x + 0.4, y + 0.6, 1.9, 1.0, 0, 'rgba(25,22,18,0.4)');
    dab(ctx, x, y, 1.7, 1.15, rnd(), rgba([124 * k, 118 * k, 106 * k], 1));
    dab(ctx, x - 0.5, y - 0.4, 0.8, 0.5, 0, 'rgba(190,184,170,0.6)');
  }
}

// ---------- Første ly: lavvo av stenger og huder ----------
function paintShelter(seed, p) {
  return paintSprite(70, 66, 35, 58, (ctx) => {
    const rnd = mulberry(seed);
    const rx = 19, ry = 8.5, apexY = -40;
    groundAndStones(ctx, rnd, rx, ry, p, 16);
    const poles = [];
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) * Math.PI * 2 + 0.31;
      poles.push({ x: Math.cos(t) * rx, y: Math.sin(t) * ry, back: Math.sin(t) < 0 });
    }
    poles.sort((a, b) => a.y - b.y);
    const pp = clamp((p - 0.12) / 0.38) * poles.length;
    const drawPole = (pl, l) => {
      const tipX = (0 - pl.x) * 1.2 + pl.x, tipY = (apexY - pl.y) * 1.2 + pl.y;
      const ex = pl.x + (tipX - pl.x) * l, ey = pl.y + (tipY - pl.y) * l;
      taper(ctx, pl.x, pl.y, ex, ey, 1.1, 0.6, 'rgb(98,78,56)');
      taper(ctx, pl.x - 0.3, pl.y, ex - 0.2, ey, 0.4, 0.2, 'rgba(160,136,104,0.6)');
    };
    poles.forEach((pl, i) => { const l = clamp(pp - i); if (l > 0) drawPole(pl, l); });
    const q = clamp((p - 0.5) / 0.42);
    if (q > 0) {
      const cone = () => {
        ctx.beginPath();
        ctx.moveTo(-rx - 0.6, 0);
        ctx.lineTo(-1.6, apexY + 3);
        ctx.lineTo(1.6, apexY + 3);
        ctx.lineTo(rx + 0.6, 0);
        ctx.ellipse(0, 0, rx + 0.6, ry + 0.4, 0, 0, Math.PI);
        ctx.closePath();
      };
      ctx.save();
      cone();
      ctx.clip();
      const yCut = lerp(ry + 1, apexY + 2, q);
      ctx.beginPath();
      ctx.rect(-40, yCut, 80, 60);
      ctx.clip();
      ctx.fillStyle = 'rgb(122,102,80)';
      ctx.fillRect(-40, apexY, 80, 60);
      for (let i = 0; i < 700; i++) {
        const x = (rnd() - 0.5) * rx * 2.2, y = apexY + rnd() * (ry - apexY);
        const lit = 1.18 - (x / rx) * 0.28;
        dab(ctx, x, y, 1 + rnd() * 2.2, 0.5 + rnd() * 0.6, (rnd() - 0.5) * 0.4, rgba(jitter([128 * lit, 106 * lit, 82 * lit], rnd, 0.2), 0.6));
      }
      // Sømmer mellom hudene.
      ctx.strokeStyle = 'rgba(58,44,32,0.55)';
      ctx.lineWidth = 0.45;
      for (const sx of [-0.62, -0.25, 0.12, 0.5, 0.85]) {
        ctx.beginPath();
        ctx.moveTo(sx * rx, Math.sqrt(Math.max(0, 1 - sx * sx)) * ry);
        ctx.lineTo(sx * 1.5, apexY + 3);
        ctx.stroke();
      }
      const sg = ctx.createLinearGradient(-rx, 0, rx, 0);
      sg.addColorStop(0, 'rgba(255,236,200,0.10)');
      sg.addColorStop(0.55, 'rgba(0,0,0,0)');
      sg.addColorStop(1, 'rgba(18,12,8,0.38)');
      ctx.fillStyle = sg;
      ctx.fillRect(-40, apexY, 80, 60);
      if (q < 1) {
        ctx.strokeStyle = 'rgba(70,52,36,0.8)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-40, yCut + 0.3);
        ctx.lineTo(40, yCut + 0.3);
        ctx.stroke();
      }
      ctx.restore();
      // Stengene stikker opp over dekket.
      ctx.save();
      ctx.beginPath();
      ctx.rect(-40, apexY - 20, 80, 23);
      ctx.clip();
      poles.forEach((pl) => drawPole(pl, 1));
      ctx.restore();
    }
    const f = smooth(0.9, 1, p);
    if (f > 0) {
      ctx.fillStyle = rgba([28, 22, 18], 0.92 * f);
      ctx.beginPath();
      ctx.moveTo(-5, ry - 0.2);
      ctx.quadraticCurveTo(-1.5, ry - 10, 0, ry - 15);
      ctx.quadraticCurveTo(1.5, ry - 10, 4, ry - 0.4);
      ctx.closePath();
      ctx.fill();
      taper(ctx, 4, ry - 0.4, 0.4, ry - 14, 1.3, 0.5, rgba([150, 124, 94], 0.9 * f));
      for (let i = 0; i < 6; i++) dab(ctx, -rx + i * 7.5, Math.sqrt(Math.max(0, 1 - Math.pow((-rx + i * 7.5) / rx, 2))) * ry + 0.4, 1.4, 0.9, 0, rgba([120, 114, 102], f));
    }
  });
}

// ---------- Hytte: rundhus med flettverksvegg og stråtak ----------
function paintHut(seed, p) {
  return paintSprite(78, 70, 39, 60, (ctx) => {
    const rnd = mulberry(seed);
    const rx = 21, ry = 10, wallH = 12, erx = 25.5, ery = 12.5, eaveY = -wallH + 1, apexY = -42;
    groundAndStones(ctx, rnd, rx, ry, p, 18);
    const posts = [];
    for (let i = 0; i < 14; i++) {
      const t = (i / 14) * Math.PI * 2;
      posts.push({ x: Math.cos(t) * rx, y: Math.sin(t) * ry, back: Math.sin(t) < 0 });
    }
    posts.sort((a, b) => a.y - b.y);
    const pp = clamp((p - 0.12) / 0.2) * posts.length;
    const q = clamp((p - 0.32) / 0.26);
    const wall = (front) => {
      if (q <= 0) return;
      const h = q * wallH;
      ctx.beginPath();
      if (front) {
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
        ctx.lineTo(-rx, -h);
        ctx.ellipse(0, -h, rx, ry, 0, Math.PI, 0, true);
      } else {
        ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(rx, -h);
        ctx.ellipse(0, -h, rx, ry, 0, 0, Math.PI, true);
      }
      ctx.closePath();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = front ? 'rgb(118,96,68)' : 'rgb(70,56,40)';
      ctx.fillRect(-rx - 2, -wallH - ry - 2, rx * 2 + 4, wallH + ry * 2 + 4);
      for (let yy = -wallH - ry; yy < ry + 1; yy += 1.4) {
        for (let xx = -rx; xx < rx; xx += 3 + rnd() * 2) {
          const lit = front ? 1.15 - (xx / rx) * 0.3 : 0.7;
          dab(ctx, xx, yy, 2 + rnd() * 1.4, 0.55, (rnd() - 0.5) * 0.2, rgba(jitter([132 * lit, 108 * lit, 76 * lit], rnd, 0.22), 0.8));
        }
      }
      if (front) for (let i = 0; i < 26; i++) dab(ctx, (rnd() - 0.5) * rx * 2, (rnd() - 0.2) * ry - rnd() * wallH, 1.5 + rnd() * 2.5, 1 + rnd() * 1.4, rnd(), rgba(jitter([150, 130, 100], rnd, 0.2), 0.45));
      ctx.restore();
    };
    const drawPost = (pt, l) => {
      taper(ctx, pt.x, pt.y + 0.5, pt.x, pt.y - (wallH + 1.5) * l, 1.4, 1.1, 'rgb(92,70,48)');
      taper(ctx, pt.x - 0.35, pt.y, pt.x - 0.35, pt.y - (wallH + 1) * l, 0.4, 0.3, 'rgba(160,132,96,0.6)');
    };
    posts.forEach((pt, i) => { if (pt.back) { const l = clamp(pp - i); if (l > 0) drawPost(pt, l); } });
    wall(false);
    posts.forEach((pt, i) => { if (!pt.back) { const l = clamp(pp - i); if (l > 0) drawPost(pt, l); } });
    wall(true);
    // Takstoler.
    const r = clamp((p - 0.58) / 0.14);
    const rafters = [];
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2 + 0.2;
      rafters.push({ x: Math.cos(t) * erx, y: eaveY + Math.sin(t) * ery });
    }
    rafters.sort((a, b) => a.y - b.y);
    rafters.forEach((rf, i) => {
      const l = clamp(r * rafters.length - i);
      if (l > 0) taper(ctx, rf.x, rf.y, rf.x + (0 - rf.x) * l * 1.05, rf.y + (apexY - 2 - rf.y) * l * 1.05, 1.0, 0.6, 'rgb(96,74,52)');
    });
    // Stråtak legges fra takskjegget og opp.
    const t = clamp((p - 0.72) / 0.26);
    if (t > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-erx, eaveY);
      ctx.lineTo(-1.2, apexY);
      ctx.lineTo(1.2, apexY);
      ctx.lineTo(erx, eaveY);
      ctx.ellipse(0, eaveY, erx, ery, 0, 0, Math.PI);
      ctx.closePath();
      ctx.clip();
      const yCut = lerp(eaveY + ery + 1, apexY - 1, t);
      ctx.beginPath();
      ctx.rect(-40, yCut, 80, 80);
      ctx.clip();
      ctx.fillStyle = 'rgb(128,108,66)';
      ctx.fillRect(-40, apexY - 2, 80, 80);
      for (let i = 0; i < 1100; i++) {
        const x = (rnd() - 0.5) * erx * 2.1, y = apexY + rnd() * (eaveY + ery - apexY);
        const ang = Math.atan2(apexY - y, 0 - x);
        const lit = 1.2 - (x / erx) * 0.32 - ((y - apexY) / 50) * 0.1;
        const len = 2 + rnd() * 3;
        ctx.strokeStyle = rgba(jitter([150 * lit, 128 * lit, 80 * lit], rnd, 0.24), 0.7);
        ctx.lineWidth = 0.35 + rnd() * 0.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        ctx.stroke();
      }
      const sg = ctx.createLinearGradient(-erx, 0, erx, 0);
      sg.addColorStop(0, 'rgba(255,236,190,0.08)');
      sg.addColorStop(0.5, 'rgba(0,0,0,0)');
      sg.addColorStop(1, 'rgba(20,14,6,0.35)');
      ctx.fillStyle = sg;
      ctx.fillRect(-40, apexY - 2, 80, 80);
      ctx.restore();
      // Skygge under takskjegget.
      if (t > 0.9) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
        ctx.lineTo(-rx, -wallH);
        ctx.ellipse(0, -wallH, rx, ry, 0, Math.PI, 0, true);
        ctx.closePath();
        ctx.clip();
        dab(ctx, 0, eaveY + ery + 0.5, erx, 2.6, 0, 'rgba(20,14,8,0.4)');
        ctx.restore();
      }
    }
    const f = smooth(0.92, 1, p);
    if (f > 0) {
      ctx.fillStyle = rgba([26, 20, 16], 0.94 * f);
      ctx.beginPath();
      ctx.moveTo(-3.6, ry - 0.2);
      ctx.lineTo(-3.6, ry - wallH + 2.2);
      ctx.quadraticCurveTo(0, ry - wallH, 3.6, ry - wallH + 2.2);
      ctx.lineTo(3.6, ry - 0.2);
      ctx.closePath();
      ctx.fill();
    }
  });
}

// ---------- Bålplass (statisk del; flammer tegnes levende) ----------
function paintFirePit(seed, p) {
  return paintSprite(30, 18, 15, 11, (ctx) => {
    const rnd = mulberry(seed);
    dab(ctx, 0, 0, 10, 5, 0, rgba([60, 50, 40], 0.5 * smooth(0, 0.1, p)));
    dab(ctx, 0, 0, 6, 3, 0, rgba([36, 30, 26], 0.8 * smooth(0, 0.2, p)));
    const n = Math.floor(clamp(p / 0.55) * 11);
    for (let i = 0; i < n; i++) {
      const t = (i / 11) * Math.PI * 2 + Math.PI;
      const x = Math.cos(t) * 7.5, y = Math.sin(t) * 3.8;
      const k = 0.75 + rnd() * 0.4;
      dab(ctx, x + 0.3, y + 0.5, 1.8, 1.0, 0, 'rgba(20,16,12,0.45)');
      dab(ctx, x, y, 1.6, 1.15, rnd(), rgba([118 * k, 112 * k, 102 * k], 1));
      dab(ctx, x - 0.4, y - 0.4, 0.7, 0.45, 0, 'rgba(186,178,164,0.55)');
    }
    const logs = clamp((p - 0.55) / 0.4) * 4;
    const ang = [-0.5, 0.45, -0.15, 0.2];
    for (let i = 0; i < Math.floor(logs); i++) {
      const a = ang[i];
      taper(ctx, -Math.cos(a) * 5, Math.sin(a) * 1.5, Math.cos(a) * 5, -Math.sin(a) * 1.5 - 1, 1.5, 1.3, 'rgb(84,62,44)');
      dab(ctx, Math.cos(a) * 5, -Math.sin(a) * 1.5 - 1, 0.7, 0.7, 0, 'rgb(150,120,86)');
    }
  });
}

const cache = new Map();
export function buildingSprite(b) {
  const level = b.complete ? STEPS : Math.floor(b.progress * STEPS);
  const entry = cache.get(b.id);
  if (entry && entry.level === level) return entry.sprite;
  const p = level / STEPS;
  const seed = b.id * 101 + 7;
  const sprite = b.type === 'shelter' ? paintShelter(seed, p) : b.type === 'hut' ? paintHut(seed, p) : paintFirePit(seed, p);
  cache.set(b.id, { level, sprite });
  return sprite;
}

// ---------- Lager og byggematerialer ----------
export const pileCount = (amount) => Math.min(28, Math.ceil(Math.sqrt(Math.max(0, amount)) * 2.2));

const woodCache = new Map(), stoneCache = new Map(), matCache = new Map();
export function woodPileSprite(n) {
  if (woodCache.has(n)) return woodCache.get(n);
  const s = paintSprite(34, 26, 17, 22, (ctx) => {
    const rnd = mulberry(77);
    if (n > 0) dab(ctx, 0, 0.5, 15, 3, 0, 'rgba(22,18,12,0.35)');
    let i = 0;
    for (let row = 0; row < 7 && i < n; row++) {
      const per = 7 - row;
      for (let c = 0; c < per && i < n; c++, i++) {
        const x = (c - (per - 1) / 2) * 3.7 + (rnd() - 0.5) * 0.4, y = -1.7 - row * 3.1;
        dab(ctx, x + 0.4, y + 0.4, 1.9, 1.75, 0, 'rgba(30,22,14,0.5)');
        dab(ctx, x, y, 1.8, 1.65, 0, rgba(jitter([92, 70, 48], rnd, 0.2), 1));
        dab(ctx, x - 0.15, y - 0.1, 1.25, 1.1, 0, rgba(jitter([176, 146, 104], rnd, 0.15), 1));
        dab(ctx, x - 0.15, y - 0.1, 0.45, 0.4, 0, 'rgba(120,90,60,0.8)');
      }
    }
  });
  woodCache.set(n, s);
  return s;
}

export function stonePileSprite(n) {
  if (stoneCache.has(n)) return stoneCache.get(n);
  const s = paintSprite(34, 24, 17, 20, (ctx) => {
    const rnd = mulberry(91);
    const spots = [];
    for (let i = 0; i < 28; i++) {
      const row = Math.floor(Math.sqrt(i * 1.6));
      spots.push({ x: (rnd() - 0.5) * (22 - row * 4), y: -1.2 - row * 2.4 + (rnd() - 0.5) });
    }
    if (n > 0) dab(ctx, 0, 0.5, 13, 3, 0, 'rgba(22,18,12,0.35)');
    spots.slice(0, n).sort((a, b) => a.y - b.y).forEach((sp) => {
      const k = 0.78 + rnd() * 0.4;
      dab(ctx, sp.x + 0.4, sp.y + 0.6, 2.1, 1.3, 0, 'rgba(20,18,14,0.45)');
      dab(ctx, sp.x, sp.y, 2.0, 1.45, rnd(), rgba([122 * k, 116 * k, 104 * k], 1));
      dab(ctx, sp.x - 0.6, sp.y - 0.5, 0.9, 0.55, 0, 'rgba(196,190,176,0.5)');
    });
  });
  stoneCache.set(n, s);
  return s;
}

export function materialSprite(n) {
  if (matCache.has(n)) return matCache.get(n);
  const s = paintSprite(26, 14, 13, 10, (ctx) => {
    const rnd = mulberry(55);
    if (n > 0) dab(ctx, 0, 0.5, 10, 2.4, 0, 'rgba(22,18,12,0.3)');
    for (let i = 0; i < n; i++) {
      const y = -1 - (i % 3) * 1.5;
      taper(ctx, -8 + (rnd() - 0.5) * 2, y, 3 + (rnd() - 0.5) * 2, y - 0.4, 1.4, 1.3, 'rgb(98,74,52)');
      dab(ctx, 3 + (i % 2) * 2 + 4, -0.8, 1.4, 1.0, 0, 'rgb(120,114,102)');
    }
  });
  matCache.set(n, s);
  return s;
}
