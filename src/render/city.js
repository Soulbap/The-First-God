// GAMEPLAY-07/08: byggene i den tidlige byen. Samme maletradisjon som landsbyen (dempet palett,
// dabbing, kontaktskygge), men med planker, tilhugget stein og toetasjes volum.
// Skrår projeksjon: dybde (d) går opp til høyre, slik at front, side og tak leses som ett volum.
import { mulberry, paintSprite, dab, taper, jitter, rgba, clamp, smooth } from './paint.js';

export const DX = 0.55, DY = 0.38; // dybdeakse i bildet

export const stage = (p, a, b) => clamp((p - a) / (b - a));

// Boks: front-venstre-bunn (x, y), bredde w, dybde d, høyde h. Gir korte planke-/steinstriper.
export function box(ctx, rnd, x, y, w, d, h, front, side, top, { courses = 0, mortar = null } = {}) {
  const fx = (u) => x + u, ox = d * DX, oy = d * DY;
  // Høyre side.
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(fx(w), y); ctx.lineTo(fx(w) + ox, y - oy); ctx.lineTo(fx(w) + ox, y - oy - h); ctx.lineTo(fx(w), y - h); ctx.closePath(); ctx.fill();
  // Front.
  ctx.fillStyle = front;
  ctx.fillRect(x, y - h, w, h);
  if (courses) {
    for (let i = 1; i < courses; i++) {
      const yy = y - (h * i) / courses;
      ctx.strokeStyle = mortar || 'rgba(30,22,14,0.28)';
      ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx(w), yy); ctx.lineTo(fx(w) + ox, yy - oy); ctx.stroke();
    }
  }
  // Tak-/toppflate.
  if (top) {
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(x, y - h); ctx.lineTo(x + ox, y - h - oy); ctx.lineTo(x + w + ox, y - h - oy); ctx.lineTo(x + w, y - h); ctx.closePath(); ctx.fill();
  }
  // Teksturflekker så flatene ikke blir sterile.
  for (let i = 0; i < w * h * 0.05; i++) dab(ctx, x + rnd() * w, y - rnd() * h, 0.6 + rnd() * 1.4, 0.3 + rnd() * 0.5, rnd() * 3, `rgba(${rnd() < 0.5 ? '20,14,8' : '210,190,150'},${0.06 + rnd() * 0.08})`);
}

// Saltak med mønet langs bredden. Sett fra front-oppe: forsiden av taket og gavlen til høyre.
export function gableRoof(ctx, rnd, x, y, w, d, rise, over, base, dark, lit) {
  const ox = d * DX, oy = d * DY, x0 = x - over, x1 = x + w + over;
  const mx = ox / 2, my = oy / 2;
  // Gavlfeltet (høyre).
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + mx, y - my - rise); ctx.lineTo(x1 + ox, y - oy); ctx.closePath(); ctx.fill();
  // Forsiden av taket.
  const g = ctx.createLinearGradient(0, y - rise, 0, y);
  g.addColorStop(0, lit); g.addColorStop(1, base);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x0, y + 1.5); ctx.lineTo(x1, y + 1.5); ctx.lineTo(x1 + mx, y - my - rise); ctx.lineTo(x0 + mx, y - my - rise); ctx.closePath(); ctx.fill();
  // Takstein/-planker i kurser.
  ctx.strokeStyle = 'rgba(24,16,8,0.32)'; ctx.lineWidth = 0.5;
  const rows = Math.max(4, Math.round(rise / 3));
  for (let i = 1; i < rows; i++) {
    const t = i / rows;
    ctx.beginPath(); ctx.moveTo(x0 + mx * t, y + 1.5 - (my + rise + 1.5) * t); ctx.lineTo(x1 + mx * t, y + 1.5 - (my + rise + 1.5) * t); ctx.stroke();
    for (let k = 0; k < (x1 - x0) / 3.2; k++) {
      const px = x0 + mx * t + (k + (i % 2) * 0.5) * 3.2, py = y + 1.5 - (my + rise + 1.5) * t;
      if (px < x1 + mx * t) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + (my + rise + 1.5) / rows); ctx.stroke(); }
    }
  }
  taper(ctx, x0 + mx, y - my - rise, x1 + mx, y - my - rise, 1.3, 1.3, 'rgb(52,38,24)'); // møne
  taper(ctx, x0, y + 1.5, x1, y + 1.5, 1.1, 1.1, 'rgba(20,12,6,0.45)'); // takskjegg
}

export function contact(ctx, w, d, a) {
  dab(ctx, w * 0.1 + d * DX * 0.5, 2, w * 0.62 + d * 0.3, 4.6 + d * 0.12, 0, `rgba(16,12,6,${0.34 * a})`);
}
export function groundPatch(ctx, rnd, rx, ry, p, tone = [96, 84, 62]) {
  const a = smooth(0, 0.1, p);
  dab(ctx, 0, 1, rx, ry, 0, rgba(tone, 0.45 * a));
  for (let i = 0; i < 46 * a; i++) {
    const t = rnd() * Math.PI * 2, d = 0.4 + rnd() * 0.7;
    dab(ctx, Math.cos(t) * rx * d, Math.sin(t) * ry * d, 0.8 + rnd() * 2, 0.4 + rnd() * 0.7, rnd() * 3, rgba(jitter(tone, rnd, 0.3), 0.3));
  }
}
export const stoneBlocks = (ctx, rnd, x, y, w, rows, perRow, bh, tone) => {
  for (let r = 0; r < rows; r++) for (let c = 0; c < perRow; c++) {
    const bw = w / perRow, bx = x + c * bw + (r % 2) * bw * 0.25, by = y - r * bh;
    const k = 0.82 + rnd() * 0.36;
    ctx.fillStyle = rgba([tone[0] * k, tone[1] * k, tone[2] * k], 1);
    ctx.fillRect(bx, by - bh, bw - 0.6, bh - 0.5);
    ctx.fillStyle = 'rgba(224,218,200,0.22)'; ctx.fillRect(bx, by - bh, bw - 0.6, 0.7);
  }
};

// ---------- Bolighus ----------
export function paintTownhouse(seed, p) {
  return paintSprite(100, 96, 46, 78, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 34, 11, p);
    const W = 46, D = 22, baseH = 13, upH = 20, x = -W / 2 - 4;
    const walls = stage(p, 0.1, 0.62), roof = stage(p, 0.6, 0.98);
    ctx.save();
    ctx.beginPath(); ctx.rect(-70, -(baseH + upH) * walls - 40, 160, (baseH + upH) * walls + 60); ctx.clip();
    contact(ctx, W, D, smooth(0.1, 0.4, p));
    // Steinmur (første etasje) og plankevegg (andre).
    box(ctx, rnd, x, 0, W, D, baseH, 'rgb(120,114,102)', 'rgb(86,82,74)', null, { courses: 3, mortar: 'rgba(40,36,30,0.4)' });
    stoneBlocks(ctx, rnd, x, 0, W, 3, 6, baseH / 3, [124, 118, 106]);
    box(ctx, rnd, x, -baseH, W, D, upH, 'rgb(150,118,78)', 'rgb(100,76,50)', null, { courses: 6 });
    // Bjelkelag mellom etasjene.
    taper(ctx, x, -baseH, x + W, -baseH, 1.8, 1.8, 'rgb(70,50,32)');
    // Vinduer og dør.
    for (const wx of [x + 8, x + W - 16]) { ctx.fillStyle = 'rgb(34,28,22)'; ctx.fillRect(wx, -baseH - 14, 8, 9); ctx.fillStyle = 'rgba(236,196,120,0.38)'; ctx.fillRect(wx + 1, -baseH - 13, 6, 3); taper(ctx, wx - 0.5, -baseH - 14.5, wx + 8.5, -baseH - 14.5, 1, 1, 'rgb(212,196,160)'); }
    ctx.fillStyle = 'rgb(46,34,22)'; ctx.fillRect(x + W / 2 - 4, -11, 8, 11);
    taper(ctx, x + W / 2 - 4, -11, x + W / 2 + 4, -11, 1.1, 1.1, 'rgb(196,170,130)');
    ctx.fillStyle = 'rgba(236,196,120,0.18)'; ctx.fillRect(x + 6, -9, 7, 6);
    ctx.restore();
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.35, roof);
      ctx.beginPath(); ctx.rect(-70, -100, 160, 100); ctx.clip();
      gableRoof(ctx, rnd, x, -(baseH + upH), W, D, 20 * roof, 3, 'rgb(112,74,54)', 'rgb(94,66,48)', 'rgb(148,102,72)');
      // Skorstein med svak røyk.
      ctx.fillStyle = 'rgb(106,100,90)'; ctx.fillRect(x + W - 12, -(baseH + upH) - 24 * roof, 5, 12);
      ctx.restore();
    }
  });
}

// ---------- Sagbruk ----------
export function paintSawmill(seed, p) {
  return paintSprite(110, 90, 54, 72, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 44, 14, p, [112, 92, 64]);
    const W = 54, D = 24, H = 22, x = -W / 2 - 6;
    const build = stage(p, 0.1, 0.7), roof = stage(p, 0.65, 0.98);
    // Åpent skur: fire stolper, en lang sagbenk med trestamme og plankeforråd.
    for (const [px, py] of [[x, 0], [x + W, 0], [x + 6, -D * DY], [x + W + 6, -D * DY]]) {
      taper(ctx, px, py, px, py - H * build, 2.4, 2.0, 'rgb(94,68,44)');
      taper(ctx, px - 0.5, py, px - 0.5, py - H * build, 0.7, 0.5, 'rgba(170,138,98,0.5)');
    }
    contact(ctx, W, D, smooth(0.1, 0.4, p));
    if (build > 0.5) {
      // Sagbenk og stokk.
      const bx = x + 6, by = -3;
      taper(ctx, bx, by, bx + W - 12, by, 4.2, 4.2, 'rgb(100,74,48)');
      taper(ctx, bx + 2, by - 2.6, bx + W - 18, by - 2.6, 4.4, 4.4, 'rgb(122,92,62)');
      dab(ctx, bx + W - 18, by - 2.6, 1.8, 2.3, 0, 'rgb(196,162,116)');
      // Sagramme (animert del tegnes i renderer; her står den stille).
      taper(ctx, bx + 14, by - 5, bx + 14, by - 21, 1.0, 1.0, 'rgb(80,60,40)');
      taper(ctx, bx + 24, by - 5, bx + 24, by - 21, 1.0, 1.0, 'rgb(80,60,40)');
      taper(ctx, bx + 14, by - 21, bx + 24, by - 21, 1.0, 1.0, 'rgb(80,60,40)');
      taper(ctx, bx + 17, by - 4, bx + 21, by - 19, 0.8, 0.8, 'rgb(150,150,148)');
      // Plankestabel.
      for (let r = 0; r < 5; r++) taper(ctx, x + W + 8, 2 - r * 2.2, x + W + 30, 1.2 - r * 2.2, 2.0, 2.0, r % 2 ? 'rgb(196,160,108)' : 'rgb(178,142,94)');
      taper(ctx, x + W + 8, 2, x + W + 8, -9, 0.8, 0.8, 'rgb(90,66,42)');
      for (let i = 0; i < 20; i++) dab(ctx, bx + rnd() * (W - 10), 3 + rnd() * 3, 0.9 + rnd(), 0.4, 0, 'rgba(214,190,140,0.75)'); // sagflis
    }
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.4, roof);
      gableRoof(ctx, rnd, x - 1, -H, W + 2, D, 14 * roof, 5, 'rgb(116,90,56)', 'rgb(88,66,42)', 'rgb(150,120,78)');
      ctx.restore();
    }
  });
}

// ---------- Steinhoggeri ----------
export function paintMason(seed, p) {
  return paintSprite(96, 80, 46, 62, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 40, 13, p, [118, 112, 98]);
    const build = stage(p, 0.1, 0.8);
    contact(ctx, 40, 16, smooth(0.1, 0.4, p));
    // Lav, åpen skur-del bak.
    const W = 34, D = 16, H = 17, x = -26;
    if (build > 0.15) {
      ctx.save(); ctx.beginPath(); ctx.rect(-70, -H * build - 30, 160, H * build + 40); ctx.clip();
      box(ctx, rnd, x, -2, W, D, H, 'rgb(112,106,94)', 'rgb(80,76,68)', null, { courses: 4, mortar: 'rgba(36,32,26,0.45)' });
      stoneBlocks(ctx, rnd, x, -2, W, 4, 5, H / 4, [118, 112, 100]);
      ctx.fillStyle = 'rgb(38,30,22)'; ctx.fillRect(x + 11, -14, 11, 12);
      ctx.restore();
    }
    if (build > 0.6) {
      const r = stage(p, 0.65, 0.98);
      ctx.save(); ctx.globalAlpha = smooth(0, 0.4, r);
      gableRoof(ctx, rnd, x, -2 - H, W, D, 12 * r, 3, 'rgb(104,86,64)', 'rgb(78,62,46)', 'rgb(134,112,84)');
      ctx.restore();
    }
    // Hogd stein: blokker, en arbeidsstein og en liten stabel.
    const blocks = stage(p, 0.3, 0.95);
    for (let i = 0; i < 9 * blocks; i++) {
      const bx = 8 + (i % 3) * 11 + (i > 5 ? 4 : 0), by = 6 - Math.floor(i / 3) * 4.4, k = 0.86 + rnd() * 0.28;
      ctx.fillStyle = 'rgba(16,12,6,0.35)'; ctx.fillRect(bx + 0.8, by + 0.2, 10, 1.2);
      ctx.fillStyle = rgba([156 * k, 150 * k, 138 * k], 1); ctx.fillRect(bx, by - 4.2, 10, 4.2);
      ctx.fillStyle = 'rgba(232,226,208,0.45)'; ctx.fillRect(bx, by - 4.2, 10, 0.9);
      ctx.fillStyle = 'rgba(40,36,30,0.28)'; ctx.fillRect(bx + 8, by - 4.2, 2, 4.2);
    }
    if (blocks > 0.5) {
      dab(ctx, -22, 8, 8, 3, 0, 'rgba(18,14,8,0.35)');
      dab(ctx, -22, 5, 7, 4.4, 0, 'rgb(132,126,114)');
      taper(ctx, -26, 2, -19, 3.4, 1, 1, 'rgb(90,86,80)');
      for (let i = 0; i < 12; i++) dab(ctx, -34 + rnd() * 18, 7 + rnd() * 5, 0.7 + rnd(), 0.4, 0, 'rgba(206,202,190,0.7)');
    }
  });
}

// ---------- Torg ----------
export function paintMarket(seed, p) {
  return paintSprite(120, 90, 60, 66, (ctx) => {
    const rnd = mulberry(seed);
    const a = stage(p, 0.04, 0.45);
    // Belagt plass: lyse steinfliser med fuger.
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0, 50, 17, 0, 0, Math.PI * 2); ctx.clip();
    dab(ctx, 0, 0, 52, 19, 0, rgba([138, 132, 118], 0.9 * a));
    for (let r = -3; r <= 3; r++) for (let c = -9; c <= 9; c++) {
      const k = 0.88 + rnd() * 0.25;
      ctx.fillStyle = rgba([150 * k, 144 * k, 130 * k], 0.85 * a);
      ctx.fillRect(c * 6 + (r % 2) * 3 - 2.8, r * 4.4 - 2, 5.6, 4);
    }
    ctx.restore();
    dab(ctx, 0, 0, 50.6, 17.6, 0, 'rgba(0,0,0,0)');
    ctx.strokeStyle = rgba([84, 78, 66], 0.7 * a); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(0, 0, 50, 17, 0, 0, Math.PI * 2); ctx.stroke();
    // Brønn/stein i midten.
    const well = stage(p, 0.3, 0.6);
    if (well > 0) {
      dab(ctx, 0, 1, 7.5, 3, 0, `rgba(16,12,6,${0.4 * well})`);
      ctx.save(); ctx.globalAlpha = well; dab(ctx, 0, -3, 6.6, 3.2, 0, 'rgb(128,122,108)'); dab(ctx, 0, -4.6, 4.6, 2, 0, 'rgb(34,48,56)'); ctx.restore();
    }
    // Boder med stripete tak.
    const stalls = [[-36, -2, '#a85a48'], [30, -5, '#6e7f5a'], [-8, -14, '#b09050']];
    stalls.forEach(([sx, sy, col], i) => {
      const s = stage(p, 0.4 + i * 0.1, 0.8 + i * 0.07);
      if (s <= 0) return;
      ctx.save(); ctx.globalAlpha = smooth(0, 0.5, s);
      ctx.fillStyle = 'rgba(16,12,6,0.3)'; ctx.fillRect(sx - 9, sy, 22, 3);
      taper(ctx, sx - 8, sy, sx - 8, sy - 16 * s, 1.4, 1.4, 'rgb(88,64,40)'); taper(ctx, sx + 11, sy, sx + 11, sy - 16 * s, 1.4, 1.4, 'rgb(88,64,40)');
      ctx.fillStyle = 'rgb(126,98,64)'; ctx.fillRect(sx - 8, sy - 6, 19, 5); // disk
      for (let k = 0; k < 4; k++) dab(ctx, sx - 5 + k * 5, sy - 8, 1.7, 1.5, 0, ['#9a6a3a', '#b48a52', '#7a8a4a', '#a8a090'][(k + i) % 4]);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sx - 11, sy - 16 * s + 1); ctx.lineTo(sx + 14, sy - 16 * s + 1); ctx.lineTo(sx + 11, sy - 11 * s - 6 + 11 * (1 - s)); ctx.lineTo(sx - 8, sy - 11 * s - 6 + 11 * (1 - s)); ctx.closePath(); ctx.fill();
      for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(236,222,190,0.55)'; ctx.fillRect(sx - 8 + k * 6, sy - 16 * s + 1, 2.6, 5); }
      ctx.restore();
    });
  });
}

// ---------- Kunnskapshall ----------
export function paintHall(seed, p) {
  return paintSprite(130, 112, 62, 90, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 48, 15, p, [104, 94, 74]);
    const W = 62, D = 26, baseH = 10, wallH = 20, x = -W / 2 - 6;
    const walls = stage(p, 0.1, 0.62), roof = stage(p, 0.6, 0.98), H = baseH + wallH;
    ctx.save();
    ctx.beginPath(); ctx.rect(-80, -H * walls - 50, 180, H * walls + 70); ctx.clip();
    contact(ctx, W, D, smooth(0.1, 0.4, p));
    box(ctx, rnd, x, 0, W, D, baseH, 'rgb(124,118,106)', 'rgb(88,84,76)', null, { courses: 2, mortar: 'rgba(40,36,30,0.4)' });
    stoneBlocks(ctx, rnd, x, 0, W, 2, 9, baseH / 2, [128, 122, 110]);
    box(ctx, rnd, x, -baseH, W, D, wallH, 'rgb(142,108,72)', 'rgb(98,72,48)', null, { courses: 7 });
    // Søyler langs fasaden og store dører.
    for (let i = 0; i <= 6; i++) taper(ctx, x + 3 + i * ((W - 6) / 6), -baseH, x + 3 + i * ((W - 6) / 6), -H, 2.1, 2.1, 'rgb(84,60,38)');
    ctx.fillStyle = 'rgb(36,26,18)'; ctx.fillRect(-8, -baseH - 14, 14, 14 + baseH);
    taper(ctx, -8, -baseH - 14, 6, -baseH - 14, 1.4, 1.4, 'rgb(206,174,120)');
    for (const wx of [x + 9, x + W - 17, x + 22, x + W - 31]) { ctx.fillStyle = 'rgb(34,26,18)'; ctx.fillRect(wx, -baseH - 15, 7, 8); ctx.fillStyle = 'rgba(244,206,126,0.45)'; ctx.fillRect(wx + 1, -baseH - 14, 5, 3); }
    // Trapp.
    for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgb(${142 - i * 10},${136 - i * 10},${124 - i * 10})`; ctx.fillRect(-14 - i * 2, 3 - i * 2 - 1, 28 + i * 4, 2); }
    ctx.restore();
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.35, roof);
      gableRoof(ctx, rnd, x, -H, W, D, 26 * roof, 5, 'rgb(84,86,76)', 'rgb(66,66,58)', 'rgb(116,120,104)');
      // Drageskulpterte gavltopper og en liten bjelle-/lysåpning.
      const rx = x + W + 5;
      taper(ctx, rx, -H, rx + 4, -H - 12 * roof, 1.2, 0.5, 'rgb(64,46,30)');
      dab(ctx, x + W / 2 + D * DX / 2, -H - 26 * roof - D * DY / 2 - 3, 3.2, 3.2, 0, 'rgba(244,206,126,0.7)');
      ctx.restore();
    }
  });
}

// ---------- Foredlede varer ved lageret ----------
const plankCache = new Map(), blockCache = new Map();
export function plankPileSprite(n) {
  if (plankCache.has(n)) return plankCache.get(n);
  const s = paintSprite(40, 24, 20, 20, (ctx) => {
    const rnd = mulberry(311);
    if (n > 0) dab(ctx, 0.5, 1, 14, 2.6, 0, 'rgba(18,14,8,0.3)');
    const rows = Math.min(7, Math.ceil(n / 2));
    for (let r = 0; r < rows; r++) {
      const per = Math.min(2, n - r * 2);
      for (let c = 0; c < per; c++) {
        const k = 0.9 + rnd() * 0.18, x0 = -11 + (rnd() - 0.5) * 1.2, y = -r * 2.4 - c * 1.2;
        taper(ctx, x0, y, x0 + 22, y - 0.3, 2.2, 2.2, rgba([196 * k, 160 * k, 108 * k], 1));
        taper(ctx, x0, y - 0.8, x0 + 22, y - 1.1, 0.5, 0.5, 'rgba(238,214,168,0.6)');
        dab(ctx, x0 + 22, y - 0.3, 0.6, 1.1, 0, 'rgb(150,114,70)');
      }
    }
    taper(ctx, -9, 0.4, -9, -rows * 2.4 - 1, 0.7, 0.7, 'rgb(82,60,38)');
    taper(ctx, 9, 0.4, 9, -rows * 2.4 - 1, 0.7, 0.7, 'rgb(82,60,38)');
  });
  plankCache.set(n, s); return s;
}
export function blockPileSprite(n) {
  if (blockCache.has(n)) return blockCache.get(n);
  const s = paintSprite(36, 24, 18, 20, (ctx) => {
    const rnd = mulberry(517);
    if (n > 0) dab(ctx, 0.5, 1, 12, 2.4, 0, 'rgba(18,14,8,0.3)');
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 3), col = i % 3, k = 0.86 + rnd() * 0.26;
      const x = -9 + col * 6.2 + (row % 2) * 2.8, y = -row * 4.2;
      ctx.fillStyle = 'rgba(18,14,8,0.35)'; ctx.fillRect(x + 0.6, y, 6, 1);
      ctx.fillStyle = rgba([160 * k, 154 * k, 142 * k], 1); ctx.fillRect(x, y - 4, 6, 4);
      ctx.fillStyle = 'rgba(236,230,212,0.5)'; ctx.fillRect(x, y - 4, 6, 0.8);
      ctx.fillStyle = 'rgba(40,36,30,0.3)'; ctx.fillRect(x + 4.6, y - 4, 1.4, 4);
    }
  });
  blockCache.set(n, s); return s;
}
