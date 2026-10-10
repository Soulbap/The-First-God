// OPUS-02: nye og forbedrede bygg for byen. Samme maletradisjon som city.js (lys fra øvre venstre, skrå dybdeakse,
// kontaktskygge, dempet palett). Hvert bygg har en silhuett som leses uten etikett:
//   brønn = lav steinring med to stolper og lite tak · varehus = bredt, lavt langhus med store dører og kasser
//   hytte = lav tømmerstue (byens utgave av den første leirens halmhytte) · helligdom = vokser fra offerstein til stavkirke.
import { mulberry, paintSprite, dab, taper, jitter, rgba, clamp, smooth } from './paint.js';
import { box, gableRoof, contact, groundPatch, stoneBlocks, stage, DX, DY } from './city.js';

// Vinduer (i spritens ankerkoordinater, verdensenheter) som får lys i skumringen. Brukes av dagslys-laget.
export const WINDOWS = {
  townhouse: [[-19, -27, 8, 9], [3, -27, 8, 9]],
  cottage: [[-14.5, -10.2, 6.4, 5.6], [2, -10.2, 6.4, 5.6]],
  hall: [[-28, -25, 7, 8], [-15, -25, 7, 8], [-6, -25, 7, 8], [8, -25, 7, 8]],
  warehouse: [],
};

// ---------- Brønn ----------
export function paintWell(seed, p) {
  return paintSprite(52, 56, 26, 42, (ctx) => {
    const rnd = mulberry(seed);
    const a = smooth(0, 0.1, p), ring = stage(p, 0.05, 0.55), frame = stage(p, 0.5, 0.85), roof = stage(p, 0.8, 1);
    dab(ctx, 2, 2, 17, 6, 0, `rgba(16,12,6,${0.32 * a})`);
    // Tråkket jord og vått rundt brønnen.
    dab(ctx, 0, 1, 15, 5.4, 0, rgba([84, 70, 50], 0.5 * a));
    // Steinring.
    if (ring > 0) {
      const h = 8 * ring;
      ctx.fillStyle = 'rgb(112,106,94)';
      ctx.beginPath(); ctx.ellipse(0, -h, 11.5, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgb(124,118,106)';
      ctx.beginPath(); ctx.moveTo(-11.5, -h); ctx.lineTo(-11.5, 0); ctx.ellipse(0, 0, 11.5, 5, 0, Math.PI, 0, true); ctx.lineTo(11.5, -h); ctx.ellipse(0, -h, 11.5, 5, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
      // Steinene i skift.
      for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) {
        const ang = Math.PI * (c + (r % 2) * 0.5) / 8.2, yy = -(r + 0.5) * (h / 3) + Math.sin(ang) * 5;
        if (r * (h / 3) > h + 0.1) continue;
        const k = 0.8 + rnd() * 0.4;
        ctx.fillStyle = rgba([132 * k, 126 * k, 114 * k], 0.9);
        ctx.fillRect(Math.cos(ang) * 11.3 - 1.9, yy - 1.2, 3.8, 2.4);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.26)';
      ctx.beginPath(); ctx.moveTo(4, -h + 3.6); ctx.lineTo(11.5, -h); ctx.lineTo(11.5, 0); ctx.ellipse(0, 0, 11.5, 5, 0, 0, Math.PI * 0.4); ctx.closePath(); ctx.fill();
      // Mørkt vann og lys kant.
      ctx.fillStyle = 'rgb(28,38,44)'; ctx.beginPath(); ctx.ellipse(0, -h, 8.6, 3.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(150,176,186,0.35)'; ctx.beginPath(); ctx.ellipse(-2, -h - 0.4, 3.4, 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(210,204,186,0.5)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(0, -h, 11.2, 4.8, 0, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
      for (let i = 0; i < 4; i++) dab(ctx, -9 + rnd() * 18, -1 + rnd() * 3, 1.2, 0.6, 0, 'rgba(70,96,60,0.7)'); // mose
    }
    if (frame > 0) {
      const top = -8 - 24 * frame;
      for (const sx of [-10, 10]) { taper(ctx, sx, -7, sx, top, 2, 1.7, 'rgb(94,70,46)'); taper(ctx, sx - 0.5, -7, sx - 0.5, top, 0.6, 0.5, 'rgba(176,144,102,0.5)'); }
      taper(ctx, -10, top + 3, 10, top + 3, 1.6, 1.6, 'rgb(104,78,50)');
      // Vinsj, tau og bøtte.
      if (frame > 0.6) {
        taper(ctx, 0, top + 3, 0, top + 14, 0.4, 0.4, 'rgb(150,128,92)');
        dab(ctx, 0, top + 16, 2.1, 1.7, 0, 'rgb(112,84,52)'); dab(ctx, 0, top + 15.2, 1.6, 0.7, 0, 'rgb(40,50,56)');
        taper(ctx, -2, top + 3, 2, top + 3, 2.4, 2.4, 'rgb(122,94,62)');
      }
    }
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.4, roof);
      const y0 = -8 - 24 + 1, mx = 0;
      ctx.fillStyle = 'rgb(88,66,44)';
      ctx.beginPath(); ctx.moveTo(-14, y0 + 2); ctx.lineTo(mx, y0 - 11 * roof); ctx.lineTo(14, y0 + 2); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(-14, y0, 14, y0);
      g.addColorStop(0, 'rgba(176,138,96,0.5)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,12,6,0.4)');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(24,16,8,0.4)'; ctx.lineWidth = 0.45;
      for (let i = 1; i < 4; i++) { const t = i / 4; ctx.beginPath(); ctx.moveTo(-14 + 14 * t, y0 + 2 - (13 * t) * roof); ctx.lineTo(14 - 14 * t, y0 + 2 - (13 * t) * roof); ctx.stroke(); }
      ctx.restore();
    }
  });
}

// ---------- Varehus ----------
export function paintWarehouse(seed, p) {
  return paintSprite(150, 104, 74, 78, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 62, 17, p, [108, 94, 70]);
    const W = 72, D = 30, baseH = 7, wallH = 22, x = -W / 2 - 10, H = baseH + wallH;
    const walls = stage(p, 0.1, 0.62), roof = stage(p, 0.6, 0.98);
    ctx.save();
    ctx.beginPath(); ctx.rect(-90, -H * walls - 50, 200, H * walls + 70); ctx.clip();
    contact(ctx, W, D, smooth(0.1, 0.4, p));
    box(ctx, rnd, x, 0, W, D, baseH, 'rgb(118,112,100)', 'rgb(84,80,72)', null, { courses: 2, mortar: 'rgba(40,36,30,0.4)' });
    stoneBlocks(ctx, rnd, x, 0, W, 2, 12, baseH / 2, [122, 116, 104]);
    box(ctx, rnd, x, -baseH, W, D, wallH, 'rgb(136,104,70)', 'rgb(92,68,44)', null, { courses: 8 });
    // Stående planker og sperrer.
    ctx.strokeStyle = 'rgba(28,18,10,0.3)'; ctx.lineWidth = 0.4;
    for (let i = 1; i < 24; i++) { ctx.beginPath(); ctx.moveTo(x + i * (W / 24), -baseH); ctx.lineTo(x + i * (W / 24), -H); ctx.stroke(); }
    for (let i = 0; i <= 3; i++) taper(ctx, x + 2 + i * ((W - 4) / 3), -baseH, x + 2 + i * ((W - 4) / 3), -H, 2, 2, 'rgb(76,54,34)');
    // Store tofløyede dører med jernbånd, midt på langveggen.
    const dx0 = x + W / 2 - 13;
    ctx.fillStyle = 'rgb(58,42,28)'; ctx.fillRect(dx0, -baseH - 18, 26, 18 + baseH);
    ctx.fillStyle = 'rgb(80,58,38)'; ctx.fillRect(dx0 + 1, -baseH - 17, 11.5, 16.5 + baseH); ctx.fillRect(dx0 + 13.5, -baseH - 17, 11.5, 16.5 + baseH);
    ctx.fillStyle = 'rgb(46,44,42)'; for (const by of [-14, -6]) { ctx.fillRect(dx0 + 1, by - 0.5, 11.5, 1.1); ctx.fillRect(dx0 + 13.5, by - 0.5, 11.5, 1.1); }
    taper(ctx, dx0, -baseH - 18, dx0 + 26, -baseH - 18, 1.4, 1.4, 'rgb(194,166,122)');
    // Lasteluke og heisebjelke i gavlen.
    ctx.fillStyle = 'rgb(46,32,22)'; ctx.fillRect(x + 8, -H + 4, 7, 7);
    ctx.fillStyle = 'rgb(46,32,22)'; ctx.fillRect(x + W - 15, -H + 4, 7, 7);
    // Rampe foran dørene.
    ctx.fillStyle = 'rgb(132,104,70)'; ctx.beginPath(); ctx.moveTo(dx0 - 4, 3); ctx.lineTo(dx0 + 30, 3); ctx.lineTo(dx0 + 26, -baseH + 1); ctx.lineTo(dx0, -baseH + 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,10,0.4)'; ctx.lineWidth = 0.4; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(dx0 - 4 + i * 6.8, 3); ctx.lineTo(dx0 + i * 6.5, -baseH + 1); ctx.stroke(); }
    ctx.restore();
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.35, roof);
      gableRoof(ctx, rnd, x, -H, W, D, 17 * roof, 5, 'rgb(98,92,82)', 'rgb(70,66,58)', 'rgb(128,122,108)');
      ctx.restore();
    }
    // Kasser, tønner og sekker ved porten (kun ferdig bygg).
    const goods = stage(p, 0.9, 1);
    if (goods > 0) {
      ctx.save(); ctx.globalAlpha = goods;
      for (const [cx, cy, k] of [[x + W + 16, 5, 0], [x + W + 24, 4, 1], [x + W + 20, 9, 2]]) {
        dab(ctx, cx + 0.6, cy + 0.8, 7, 2, 0, 'rgba(16,12,6,0.34)');
        if (k === 1) { ctx.fillStyle = 'rgb(116,86,54)'; ctx.fillRect(cx - 3.4, cy - 7, 6.8, 7.4); dab(ctx, cx, cy - 7, 3.4, 1.3, 0, 'rgb(140,108,70)'); taper(ctx, cx - 3.4, cy - 4.8, cx + 3.4, cy - 4.8, 0.7, 0.7, 'rgb(52,48,44)'); taper(ctx, cx - 3.4, cy - 1.8, cx + 3.4, cy - 1.8, 0.7, 0.7, 'rgb(52,48,44)'); }
        else { ctx.fillStyle = k ? 'rgb(150,122,84)' : 'rgb(138,108,72)'; ctx.fillRect(cx - 4.4, cy - 5.6, 8.8, 5.8); ctx.fillStyle = 'rgba(232,208,160,0.4)'; ctx.fillRect(cx - 4.4, cy - 5.6, 8.8, 0.9); ctx.strokeStyle = 'rgba(40,28,16,0.5)'; ctx.lineWidth = 0.35; ctx.strokeRect(cx - 4.4, cy - 5.6, 8.8, 5.8); }
      }
      // Kornsekker.
      for (const [cx, cy] of [[x - 6, 6], [x - 12, 5]]) { dab(ctx, cx, cy, 4.6, 3.2, 0, 'rgb(188,170,126)'); dab(ctx, cx - 1, cy - 1.2, 2.4, 1.2, 0, 'rgba(240,226,184,0.55)'); dab(ctx, cx, cy - 3, 1.4, 0.8, 0, 'rgb(112,92,58)'); }
      ctx.restore();
    }
  });
}

// ---------- Hytte (byens utgave av den første leirens hytte) ----------
export function paintCottage(seed, p) {
  return paintSprite(84, 72, 40, 54, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 30, 9.5, p);
    const W = 32, D = 18, H = 12, x = -W / 2 - 3;
    const walls = stage(p, 0.1, 0.62), roof = stage(p, 0.6, 0.98);
    ctx.save();
    ctx.beginPath(); ctx.rect(-60, -H * walls - 40, 140, H * walls + 60); ctx.clip();
    contact(ctx, W, D, smooth(0.1, 0.4, p));
    // Steinsokkel og tømmervegg med synlige stokkender i hjørnet.
    box(ctx, rnd, x, 0, W, D, 3.4, 'rgb(118,112,100)', 'rgb(84,80,72)', null, { courses: 1 });
    box(ctx, rnd, x, -3.4, W, D, H - 3.4, 'rgb(150,114,74)', 'rgb(100,74,48)', null, { courses: 4 });
    for (let r = 0; r < 4; r++) { dab(ctx, x, -3.4 - (r + 0.5) * ((H - 3.4) / 4), 1.1, 1.0, 0, 'rgb(188,152,104)'); dab(ctx, x + W, -3.4 - (r + 0.5) * ((H - 3.4) / 4), 1.1, 1.0, 0, 'rgb(188,152,104)'); }
    // Dør og vindu med skodder.
    ctx.fillStyle = 'rgb(44,32,20)'; ctx.fillRect(x + W / 2 - 3.6, -10.4, 7.2, 10.4);
    taper(ctx, x + W / 2 - 3.6, -10.4, x + W / 2 + 3.6, -10.4, 1, 1, 'rgb(194,166,126)');
    for (const wx of [x + 4.5, x + W - 11]) {
      ctx.fillStyle = 'rgb(32,26,20)'; ctx.fillRect(wx, -10.2, 6.4, 5.6); ctx.fillStyle = 'rgba(236,196,120,0.32)'; ctx.fillRect(wx + 0.8, -9.4, 4.8, 1.8);
      ctx.fillStyle = 'rgb(96,112,84)'; ctx.fillRect(wx - 1.6, -10.2, 1.5, 5.6); ctx.fillRect(wx + 6.5, -10.2, 1.5, 5.6);
    }
    ctx.restore();
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.35, roof);
      gableRoof(ctx, rnd, x, -H, W, D, 13 * roof, 4, 'rgb(104,82,54)', 'rgb(82,64,42)', 'rgb(140,112,74)');
      // Torv/mose på mønet.
      for (let i = 0; i < 14; i++) dab(ctx, x + 2 + rnd() * (W - 4) + 3, -H - 6.8 * roof - rnd() * 3, 1.6 + rnd(), 0.8, 0, rgba(jitter([86, 108, 54], rnd, 0.3), 0.75));
      ctx.fillStyle = 'rgb(108,102,92)'; ctx.fillRect(x + W - 8, -H - 13 * roof - 6, 4, 8);
      ctx.restore();
    }
  });
}

// ---------- Helligdom: seks stykker i en fast rekkefølge, fra offerstein til stavkirke ----------
const SANCT_SIZE = [[64, 46, 32, 34], [60, 66, 30, 54], [60, 80, 30, 68], [60, 74, 30, 60], [88, 100, 44, 82], [120, 140, 60, 118]];

export function paintSanctuary(seed, p, n) {
  const [w, h, ax, ay] = SANCT_SIZE[Math.min(n, 5)];
  return paintSprite(w, h, ax, ay, (ctx) => {
    const rnd = mulberry(seed);
    const a = smooth(0, 0.1, p), up = stage(p, 0.08, 0.98);
    dab(ctx, 1.4, 1.4, 13 + n * 2.4, 4.4 + n * 0.9, 0, `rgba(16,12,6,${0.34 * a})`);
    dab(ctx, 0, 0.6, 12 + n * 2.2, 4 + n * 0.8, 0, rgba([96, 88, 70], 0.42 * a)); // tråkket plass
    ctx.save();
    // Reisning nedenfra og opp.
    const topY = -(ay + 4);
    ctx.beginPath(); ctx.rect(-ax - 4, topY + (1 - up) * (ay + 6), w + 8, ay + 12); ctx.clip();
    if (n === 0) offerStone(ctx, rnd);
    else if (n === 1) cairn(ctx, rnd);
    else if (n === 2) runestone(ctx, rnd);
    else if (n === 3) brazier(ctx, rnd);
    else if (n === 4) shrine(ctx, rnd, 1);
    else shrine(ctx, rnd, 2);
    ctx.restore();
  });
}

function stoneBlob(ctx, rnd, x, y, rx, ry, tone = [122, 116, 104]) {
  const k = 0.82 + rnd() * 0.36;
  dab(ctx, x + rx * 0.2, y + 0.5, rx * 1.05, ry * 0.42, 0, 'rgba(18,14,10,0.4)');
  dab(ctx, x, y - ry * 0.55, rx, ry, 0, rgba([tone[0] * k, tone[1] * k, tone[2] * k], 1));
  dab(ctx, x - rx * 0.32, y - ry * 0.95, rx * 0.5, ry * 0.4, 0, 'rgba(214,208,192,0.45)');
  dab(ctx, x + rx * 0.3, y - ry * 0.25, rx * 0.7, ry * 0.5, 0, 'rgba(24,20,16,0.28)');
}

function offerStone(ctx, rnd) {
  // Ring av små stener rundt en flat offerstein med skål, blomster og lys.
  for (let i = 0; i < 9; i++) { const t = (i / 9) * Math.PI * 2 + 0.3; stoneBlob(ctx, rnd, Math.cos(t) * 20, Math.sin(t) * 7.4, 3.4 + rnd(), 3 + rnd() * 0.8); }
  ctx.fillStyle = 'rgb(112,106,94)';
  ctx.beginPath(); ctx.ellipse(0, -9, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgb(128,122,110)'; ctx.beginPath(); ctx.moveTo(-10, -9); ctx.lineTo(-8.4, -1); ctx.lineTo(8.4, -1); ctx.lineTo(10, -9); ctx.ellipse(0, -9, 10, 4, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(3, -9, 6, 8);
  ctx.fillStyle = 'rgb(146,140,126)'; ctx.beginPath(); ctx.ellipse(0, -10, 9, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  dab(ctx, -2, -11.4, 3.4, 1.4, 0, 'rgb(70,58,44)'); dab(ctx, -2, -11.8, 2.4, 0.9, 0, 'rgb(200,160,86)');
  for (const [fx, fy, c] of [[4, -11, '#c7b0d8'], [6, -9.8, '#e2d8a0'], [-6.5, -9.8, '#d89a8a']]) { taper(ctx, fx, fy, fx, fy - 2.4, 0.4, 0.3, 'rgb(84,110,56)'); dab(ctx, fx, fy - 2.8, 0.9, 0.9, 0, c); }
}

function cairn(ctx, rnd) {
  const rows = [[5, 4, 4.4], [4, 3.4, 3.8], [3, 2.8, 3], [2, 2.4, 2.4]];
  let y = 0;
  rows.forEach(([cnt, rx, ry], r) => {
    for (let i = 0; i < Math.ceil(cnt); i++) stoneBlob(ctx, rnd, (i - (cnt - 1) / 2) * rx * 1.5 + (rnd() - 0.5) * 1.2, y - (r % 2) * 0.4, rx, ry);
    y -= ry * 1.5;
  });
  stoneBlob(ctx, rnd, 0, y - 1, 2.4, 3);
  taper(ctx, 4.4, y - 1, 4.4, y - 10, 0.5, 0.4, 'rgb(94,70,46)');
  ctx.fillStyle = 'rgb(172,52,44)'; ctx.beginPath(); ctx.moveTo(4.6, y - 10); ctx.lineTo(10, y - 8.2); ctx.lineTo(4.6, y - 6.4); ctx.closePath(); ctx.fill(); // trekantvimpel
}

function runestone(ctx, rnd) {
  // Høy bautastein med innhugne tegn, mose ved foten.
  const h = 54, w = 7.4;
  dab(ctx, 3, 0.6, w * 1.7, 2.4, 0, 'rgba(18,14,8,0.4)');
  const body = () => { ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(-w - 1.2, -h * 0.55, -w * 0.6, -h + 4); ctx.quadraticCurveTo(0, -h - 4, w * 0.55, -h + 2); ctx.quadraticCurveTo(w + 1, -h * 0.5, w, 0); ctx.closePath(); };
  body(); ctx.fillStyle = 'rgb(108,104,98)'; ctx.fill();
  ctx.save(); body(); ctx.clip();
  const g = ctx.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, 'rgba(236,230,212,0.28)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(14,12,10,0.42)');
  ctx.fillStyle = g; ctx.fillRect(-w - 2, -h - 6, w * 2 + 4, h + 8);
  for (let i = 0; i < 90; i++) dab(ctx, (rnd() - 0.5) * w * 2, -rnd() * h, 0.5 + rnd(), 0.3 + rnd() * 0.6, rnd() * 3, `rgba(${rnd() < 0.5 ? '30,28,24' : '190,184,170'},${0.1 + rnd() * 0.12})`);
  // Runer: et lys, innhugget slyngebånd med kors og stav-tegn.
  ctx.strokeStyle = 'rgba(30,26,22,0.8)'; ctx.lineWidth = 0.6;
  for (let r = 0; r < 6; r++) {
    const yy = -h * 0.78 + r * 6.2;
    ctx.beginPath(); ctx.moveTo(-0.6, yy - 2.2); ctx.lineTo(-0.6, yy + 2.4); ctx.moveTo(-0.6, yy - 0.8); ctx.lineTo(2.6, yy - 2.4); ctx.moveTo(-0.6, yy + 0.4); ctx.lineTo(2.6, yy - 1.2); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(176,52,44,0.55)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-w + 1.2, -4); ctx.bezierCurveTo(-w * 0.2, -h * 0.45, w * 0.2, -h * 0.5, -w * 0.6, -h + 8); ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 12; i++) dab(ctx, -w + rnd() * w * 2, -rnd() * 5, 1.6, 0.9, 0, rgba(jitter([84, 106, 52], rnd, 0.3), 0.85));
}

function brazier(ctx, rnd) {
  // Ildskål på steinsøyle; flammen tegnes av renderen (additiv) slik at den lyser i skumringen.
  for (const [r, y] of [[9, -1], [7.6, -5.4]]) { dab(ctx, 0, y, r, r * 0.4, 0, 'rgb(114,108,96)'); }
  ctx.fillStyle = 'rgb(124,118,106)'; ctx.beginPath(); ctx.moveTo(-5.4, -5); ctx.lineTo(-4, -34); ctx.lineTo(4, -34); ctx.lineTo(5.4, -5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.moveTo(1.4, -5); ctx.lineTo(1.2, -34); ctx.lineTo(4, -34); ctx.lineTo(5.4, -5); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(30,26,22,0.32)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-5, -9 - i * 6.6); ctx.lineTo(5, -9 - i * 6.6); ctx.stroke(); }
  ctx.fillStyle = 'rgb(54,48,44)'; ctx.beginPath(); ctx.moveTo(-9, -36); ctx.quadraticCurveTo(0, -27, 9, -36); ctx.lineTo(7.4, -37.4); ctx.lineTo(-7.4, -37.4); ctx.closePath(); ctx.fill();
  dab(ctx, 0, -37.6, 8.6, 2.1, 0, 'rgb(36,30,26)'); dab(ctx, 0, -37.8, 6.4, 1.3, 0, 'rgb(190,96,40)');
  for (let i = 0; i < 4; i++) stoneBlob(ctx, rnd, -13 + i * 8.6, 3 - (i % 2), 3, 2.6);
}

function shrine(ctx, rnd, tiers) {
  // Lite tretempel (stavverk): tårnformet, tjærebrun, med skjellkledde tak og drakehoder.
  const W = tiers === 2 ? 34 : 24, baseH = 5, wallH = tiers === 2 ? 22 : 17;
  const x0 = -W / 2;
  // Stein-sokkel i trinn.
  for (let i = 0; i < 2; i++) { ctx.fillStyle = `rgb(${128 - i * 12},${122 - i * 12},${110 - i * 12})`; ctx.fillRect(x0 - 4 + i * 2, -2 - i * 2.6, W + 8 - i * 4, 2.6); }
  const wall = (ax, ay, w, h, front, side) => {
    ctx.fillStyle = side; ctx.beginPath(); ctx.moveTo(ax + w, ay); ctx.lineTo(ax + w + 6, ay - 3); ctx.lineTo(ax + w + 6, ay - h - 3); ctx.lineTo(ax + w, ay - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = front; ctx.fillRect(ax, ay - h, w, h);
    ctx.strokeStyle = 'rgba(20,12,6,0.35)'; ctx.lineWidth = 0.4; for (let i = 1; i < w / 2.2; i++) { ctx.beginPath(); ctx.moveTo(ax + i * 2.2, ay); ctx.lineTo(ax + i * 2.2, ay - h); ctx.stroke(); }
  };
  const roofTier = (cx, y, w, rise, base, lit) => {
    ctx.fillStyle = base; ctx.beginPath(); ctx.moveTo(cx - w / 2 - 3, y); ctx.lineTo(cx, y - rise); ctx.lineTo(cx + w / 2 + 3, y); ctx.quadraticCurveTo(cx + w / 2 + 4, y + 1.2, cx + w / 2 + 1, y + 1.4); ctx.lineTo(cx - w / 2 - 1, y + 1.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lit; ctx.beginPath(); ctx.moveTo(cx - w / 2 - 3, y); ctx.lineTo(cx, y - rise); ctx.lineTo(cx - 1, y - rise + 0.4); ctx.lineTo(cx - w / 2 - 1.4, y + 0.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(10,6,2,0.45)'; ctx.lineWidth = 0.4;
    for (let r = 1; r < 5; r++) { const t = r / 5; ctx.beginPath(); ctx.moveTo(cx - (w / 2 + 3) * (1 - t), y - rise * t); ctx.lineTo(cx + (w / 2 + 3) * (1 - t), y - rise * t); ctx.stroke(); }
    // Drakehoder på mønet.
    taper(ctx, cx - w / 2 - 3, y, cx - w / 2 - 6, y - 5, 1.3, 0.5, 'rgb(46,30,18)'); taper(ctx, cx + w / 2 + 3, y, cx + w / 2 + 6, y - 5, 1.3, 0.5, 'rgb(46,30,18)');
  };
  wall(x0, -4.6, W, wallH, 'rgb(86,58,38)', 'rgb(58,40,26)');
  ctx.fillStyle = 'rgb(26,18,12)'; ctx.fillRect(-3.6, -4.6 - 12, 7.2, 12); // portal
  taper(ctx, -3.6, -16.6, 3.6, -16.6, 1.2, 1.2, 'rgb(176,142,96)');
  ctx.fillStyle = 'rgba(240,190,96,0.5)'; ctx.fillRect(-2.4, -4.6 - 9, 4.8, 8.4);
  const yR = -4.6 - wallH;
  roofTier(0, yR, W, 10, 'rgb(46,40,36)', 'rgb(94,84,72)');
  if (tiers === 2) {
    const w2 = W * 0.62; wall(-w2 / 2, yR - 6, w2, 12, 'rgb(84,56,36)', 'rgb(56,38,24)');
    ctx.fillStyle = 'rgba(240,190,96,0.45)'; ctx.fillRect(-2, yR - 6 - 9, 4, 5);
    roofTier(0, yR - 18, w2, 12, 'rgb(44,38,34)', 'rgb(92,82,70)');
    const w3 = w2 * 0.5; wall(-w3 / 2, yR - 28, w3, 8, 'rgb(82,54,34)', 'rgb(54,36,22)');
    roofTier(0, yR - 36, w3, 12, 'rgb(42,36,32)', 'rgb(90,80,68)');
    taper(ctx, 0, yR - 47, 0, yR - 66, 1, 0.4, 'rgb(50,36,24)');
    dab(ctx, 0, yR - 67, 1.4, 1.4, 0, 'rgb(212,176,98)');
  }
  for (let i = 0; i < 5; i++) stoneBlob(ctx, rnd, (i - 2) * 11, 4 - (i % 2), 2.6, 2.4);
}
