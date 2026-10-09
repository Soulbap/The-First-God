// Bygg som males i byggetrinn: grunn → stenger/stolper → vegger → tak/dekke → dør.
import { mulberry, paintSprite, dab, taper, jitter, rgba, clamp, smooth, lerp } from './paint.js';
import { paintTownhouse, paintSawmill, paintMason, paintMarket, paintHall } from './city.js';

const STEPS = 48; // kvantisering av byggefremdrift for mellomlagring

function groundAndStones(ctx, rnd, rx, ry, p, stoneCount) {
  const a = smooth(0, 0.1, p);
  // Tråkket jord med ujevn kant — ikke en ren ellipse.
  dab(ctx, 0, 0, rx + 7, ry + 4, 0, rgba([92, 76, 56], 0.4 * a));
  for (let i = 0; i < 70 * a; i++) {
    const t = rnd() * Math.PI * 2, d = 0.55 + rnd() * 0.75;
    dab(ctx, Math.cos(t) * (rx + 3) * d, Math.sin(t) * (ry + 2) * d, 1 + rnd() * 2.4, 0.5 + rnd() * 0.7, rnd() * 3, rgba(jitter([108, 90, 66], rnd, 0.3), 0.3));
  }
  const n = Math.floor(clamp(p / 0.14) * stoneCount);
  const order = [];
  for (let i = 0; i < stoneCount; i++) order.push(((i / stoneCount) * Math.PI * 2) + Math.PI);
  for (let i = 0; i < n; i++) {
    const t = order[i];
    const x = Math.cos(t) * (rx + 1) + (rnd() - 0.5) * 0.8, y = Math.sin(t) * (ry + 0.6);
    const k = 0.78 + rnd() * 0.45, sz = 1.4 + rnd() * 0.9;
    dab(ctx, x + 0.5, y + 0.7, sz * 1.1, sz * 0.6, 0, 'rgba(22,19,14,0.42)');
    dab(ctx, x, y, sz, sz * 0.7, rnd(), rgba([124 * k, 118 * k, 106 * k], 1));
    dab(ctx, x - sz * 0.3, y - sz * 0.25, sz * 0.45, sz * 0.28, 0, 'rgba(196,190,176,0.6)');
    dab(ctx, x + sz * 0.15, y + sz * 0.3, sz * 0.7, sz * 0.22, 0, 'rgba(30,26,20,0.25)');
    if (rnd() < 0.22) dab(ctx, x - sz * 0.1, y - sz * 0.35, sz * 0.5, sz * 0.22, 0, rgba([78, 98, 50], 0.8));
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
      // Hudene har ulik alder og tone; røyk sverter toppen, regn gir striper og kanten er smusset av jord.
      const seams2 = [-1.05, -0.62, -0.25, 0.12, 0.5, 0.85, 1.1];
      for (let pi = 0; pi < seams2.length - 1; pi++) {
        const a0 = seams2[pi], a1 = seams2[pi + 1];
        const yb = (v) => Math.sqrt(Math.max(0, 1 - Math.min(1, v * v))) * ry;
        const light = (pi * 5 + 3) % 4 < 2;
        ctx.fillStyle = light ? `rgba(220,196,150,${0.05 + (pi % 3) * 0.035})` : `rgba(40,28,18,${0.05 + (pi % 3) * 0.04})`;
        ctx.beginPath();
        ctx.moveTo(a0 * rx, yb(a0) + 1);
        ctx.lineTo(a1 * rx, yb(a1) + 1);
        ctx.lineTo(a1 * 1.5, apexY + 3);
        ctx.lineTo(a0 * 1.5, apexY + 3);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 46; i++) {
        const x = (rnd() - 0.5) * rx * 1.8, y0 = apexY + 8 + rnd() * 30;
        ctx.strokeStyle = `rgba(46,32,22,${0.1 + rnd() * 0.12})`;
        ctx.lineWidth = 0.3 + rnd() * 0.3;
        ctx.beginPath();
        ctx.moveTo(x * (0.3 + (y0 - apexY) / 60), y0);
        ctx.lineTo(x * (0.35 + (y0 + 8 + rnd() * 10 - apexY) / 60), y0 + 8 + rnd() * 10);
        ctx.stroke();
      }
      const soot = ctx.createLinearGradient(0, apexY, 0, apexY + 22);
      soot.addColorStop(0, 'rgba(22,16,12,0.55)');
      soot.addColorStop(1, 'rgba(22,16,12,0)');
      ctx.fillStyle = soot;
      ctx.fillRect(-40, apexY, 80, 24);
      const mud = ctx.createLinearGradient(0, ry - 7, 0, ry + 1.5);
      mud.addColorStop(0, 'rgba(70,52,34,0)');
      mud.addColorStop(1, 'rgba(70,52,34,0.5)');
      ctx.fillStyle = mud;
      ctx.fillRect(-40, ry - 7, 80, 9);
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
      // Skinnreim surrer stengene sammen under toppen.
      for (let i = 0; i < 2; i++) taper(ctx, -2.4, apexY + 6 + i * 2.6, 2.4, apexY + 6.6 + i * 2.6, 0.7, 0.7, 'rgb(74,56,40)');
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
    // Steinfundament langs foten.
    if (q > 0.25) {
      for (let i = 0; i < 26; i++) {
        const t = (i / 25) * Math.PI;
        const x = Math.cos(t) * (rx + 0.6), y = Math.sin(t) * (ry + 0.5);
        const k = 0.78 + rnd() * 0.4;
        dab(ctx, x, y + 0.2, 1.9, 1.15, rnd() * 0.3, rgba([116 * k, 110 * k, 98 * k], 1));
        dab(ctx, x - 0.4, y - 0.3, 0.8, 0.45, 0, 'rgba(190,184,170,0.5)');
      }
    }
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
      // Stråtaket legges i kurser: tydelige bånd av bunter, mose på eldre partier og sverte rundt røykhullet.
      for (let yy = apexY + 5; yy < eaveY + ery + 1; yy += 4.4) {
        const k = (yy - apexY) / (eaveY + ery - apexY);
        ctx.strokeStyle = `rgba(52,40,22,${0.16 + 0.1 * (k % 0.3)})`;
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.ellipse(0, yy - ery * k * 0.1, erx * k * 1.02, ery * k * 0.62, 0, 0.05, Math.PI - 0.05);
        ctx.stroke();
      }
      for (let i = 0; i < 90; i++) {
        const x = (rnd() - 0.5) * erx * 1.8, y = apexY + 8 + rnd() * 34;
        dab(ctx, x, y, 0.8 + rnd() * 1.6, 0.4 + rnd() * 0.6, rnd() * 3, rgba(jitter([82, 98, 50], rnd, 0.3), 0.3));
      }
      const hs = ctx.createLinearGradient(0, apexY, 0, apexY + 14);
      hs.addColorStop(0, 'rgba(26,18,10,0.5)');
      hs.addColorStop(1, 'rgba(26,18,10,0)');
      ctx.fillStyle = hs;
      ctx.fillRect(-40, apexY - 2, 80, 16);
      const sg = ctx.createLinearGradient(-erx, 0, erx, 0);
      sg.addColorStop(0, 'rgba(255,236,190,0.08)');
      sg.addColorStop(0.5, 'rgba(0,0,0,0)');
      sg.addColorStop(1, 'rgba(20,14,6,0.35)');
      ctx.fillStyle = sg;
      ctx.fillRect(-40, apexY - 2, 80, 80);
      ctx.restore();
      // Ujevn takkant: stråene henger ned i frynser.
      for (let i = 0; i < 70; i++) {
        const tt = (i / 69) * Math.PI;
        const x = Math.cos(tt) * erx * 0.99, y = eaveY + Math.sin(tt) * ery * 0.99;
        ctx.strokeStyle = rgba(jitter([128, 106, 66], rnd, 0.3), 0.85);
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rnd() - 0.5) * 0.8, y + 1.2 + rnd() * 2.2);
        ctx.stroke();
      }
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

// ---------- Felles lager: lavt tømmerbygg med åpen front og tak ----------
function paintStorage(seed, p) {
  return paintSprite(88, 60, 44, 51, (ctx) => {
    const rnd = mulberry(seed), rx = 29, ry = 10, roofY = -31;
    groundAndStones(ctx, rnd, rx, ry, p, 13);
    const posts = [-23, -8, 8, 23];
    const frame = clamp((p - 0.1) / 0.3);
    for (const x of posts) {
      const h = 24 * frame;
      taper(ctx, x, 3, x, 3 - h, 1.45, 1.15, 'rgb(86,66,45)');
      taper(ctx, x - 0.35, 2, x - 0.35, 3 - h, 0.35, 0.25, 'rgba(180,146,102,0.45)');
    }
    if (frame > 0.45) {
      taper(ctx, -27, -20, 27, -20, 1.2, 1.2, 'rgb(92,70,48)');
      taper(ctx, -27, -8, 27, -8, 0.9, 0.9, 'rgb(96,74,52)');
    }
    const wall = clamp((p - 0.38) / 0.22);
    if (wall > 0) {
      ctx.save();
      ctx.globalAlpha = wall;
      ctx.fillStyle = 'rgb(102,80,54)';
      ctx.fillRect(-28, -20, 56, 13);
      for (let x = -25; x < 27; x += 4) taper(ctx, x, -19, x + 1, -7, 1.1, 1.1, 'rgba(66,48,32,0.7)');
      ctx.restore();
    }
    const roof = clamp((p - 0.58) / 0.32);
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = roof;
      ctx.beginPath(); ctx.moveTo(-34, -19); ctx.lineTo(-22, roofY); ctx.lineTo(22, roofY); ctx.lineTo(34, -19); ctx.closePath();
      ctx.fillStyle = 'rgb(120,99,60)'; ctx.fill();
      for (let i = 0; i < 260; i++) {
        const x = -28 + rnd() * 56, y = roofY + rnd() * 14;
        ctx.strokeStyle = rgba(jitter([151, 128, 77], rnd, 0.22), 0.55); ctx.lineWidth = 0.45;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 2, y + 3 + rnd() * 3); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(25,18,10,0.28)'; ctx.fillRect(-34, -19, 68, 3);
      ctx.restore();
    }
    const goods = clamp((p - 0.72) / 0.28);
    if (goods > 0) {
      ctx.save(); ctx.globalAlpha = goods;
      for (let i = 0; i < 11; i++) {
        const x = -20 + (i % 6) * 8 + (rnd() - 0.5), y = 3 - Math.floor(i / 6) * 3;
        taper(ctx, x - 3.1, y, x + 3.1, y - 0.4, 1.15, 1.1, i % 2 ? 'rgb(108,78,49)' : 'rgb(89,63,41)');
      }
      for (let i = 0; i < 7; i++) dab(ctx, 8 + (i % 4) * 3.2, 2 - Math.floor(i / 4) * 2.1, 1.6, 1.1, rnd(), 'rgb(117,112,100)');
      ctx.restore();
    }
  });
}

// ---------- Landsbyildsted: steinsatt ild, sitteplasser og permanent samlingsplass ----------
function paintHearth(seed, p) {
  return paintSprite(76, 42, 38, 28, (ctx) => {
    const rnd = mulberry(seed), a = smooth(0, 0.15, p);
    dab(ctx, 0, 1, 30, 12, 0, rgba([94, 77, 55], 0.48 * a));
    const stones = Math.floor(clamp(p / 0.42) * 18);
    for (let i = 0; i < stones; i++) {
      const t = (i / 18) * Math.PI * 2 + 0.2;
      const x = Math.cos(t) * 12, y = Math.sin(t) * 5.8;
      dab(ctx, x + 0.5, y + 0.6, 2.5, 1.35, 0, 'rgba(20,15,10,0.4)');
      dab(ctx, x, y, 2.35, 1.5, rnd(), rgba(jitter([122, 115, 101], rnd, 0.2), a));
      dab(ctx, x - 0.5, y - 0.45, 0.9, 0.5, 0, 'rgba(205,196,178,0.45)');
    }
    const logs = clamp((p - 0.35) / 0.35);
    for (const [x, y, rot] of [[-24, 4, -0.08], [24, 3, 0.08], [0, 10, 0]]) {
      ctx.save(); ctx.globalAlpha = logs; ctx.translate(x, y); ctx.rotate(rot);
      taper(ctx, -7, 0, 7, 0, 2.2, 2.1, 'rgb(91,65,42)');
      taper(ctx, -7, 0.7, 7, 0.7, 1, 1, 'rgba(24,16,10,0.32)'); ctx.restore();
    }
    const pit = clamp((p - 0.48) / 0.35);
    dab(ctx, 0, 0, 8, 4, 0, rgba([25, 20, 15], 0.8 * pit));
    for (let i = 0; i < 4 * pit; i++) taper(ctx, -5 + i * 3.3, 1, 5 - i * 2.2, -1, 1.25, 1.1, 'rgb(68,48,33)');
  });
}

// ---------- Bålplass (statisk del; flammer tegnes levende) ----------
function paintFirePit(seed, p) {
  return paintSprite(36, 22, 18, 13, (ctx) => {
    const rnd = mulberry(seed);
    // Bar jord rundt, svidd bakke og aske — bålet har preget stedet.
    dab(ctx, 0, 0.5, 15, 7, 0, rgba([100, 84, 60], 0.5 * smooth(0, 0.1, p)));
    for (let i = 0; i < 36 * smooth(0, 0.3, p); i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
      dab(ctx, Math.cos(a) * 12 * d, Math.sin(a) * 5.5 * d, 0.8 + rnd() * 1.8, 0.4 + rnd() * 0.7, rnd() * 3, rgba(jitter([94, 78, 56], rnd, 0.3), 0.35));
    }
    dab(ctx, 0, 0, 8.4, 4.1, 0, rgba([22, 18, 14], 0.8 * smooth(0, 0.2, p)));
    dab(ctx, 0.5, 0.2, 5.6, 2.8, 0, rgba([84, 80, 74], 0.55 * smooth(0.5, 0.9, p)));
    const n = Math.floor(clamp(p / 0.55) * 12);
    for (let i = 0; i < n; i++) {
      const t = (i / 12) * Math.PI * 2 + Math.PI;
      const x = Math.cos(t) * 8, y = Math.sin(t) * 4.0;
      const k = 0.7 + rnd() * 0.45, sz = 1.5 + rnd() * 0.5;
      dab(ctx, x + 0.4, y + 0.6, sz * 1.1, sz * 0.62, 0, 'rgba(18,14,10,0.5)');
      dab(ctx, x, y, sz, sz * 0.72, rnd(), rgba([118 * k, 112 * k, 102 * k], 1));
      dab(ctx, x - sz * 0.25, y - sz * 0.25, sz * 0.45, sz * 0.28, 0, 'rgba(186,178,164,0.5)');
      dab(ctx, x - Math.cos(t) * sz * 0.5, y - Math.sin(t) * sz * 0.35, sz * 0.7, sz * 0.4, 0, 'rgba(18,14,10,0.45)');
    }
    const logs = clamp((p - 0.55) / 0.4) * 4;
    const ang = [-0.5, 0.45, -0.15, 0.2];
    for (let i = 0; i < Math.floor(logs); i++) {
      const a = ang[i];
      const x0 = -Math.cos(a) * 5.2, y0 = Math.sin(a) * 1.6, x1 = Math.cos(a) * 5.2, y1 = -Math.sin(a) * 1.6 - 1;
      taper(ctx, x0, y0, x1, y1, 1.6, 1.4, 'rgb(74,54,38)');
      taper(ctx, x0, y0 + 0.3, x1, y1 + 0.3, 0.7, 0.6, 'rgba(0,0,0,0.35)');
      taper(ctx, x1 - Math.cos(a) * 1.4, y1 + Math.sin(a) * 0.4, x1, y1, 1.5, 1.3, 'rgb(26,22,18)');
      dab(ctx, x1, y1, 0.65, 0.65, 0, 'rgb(48,38,30)');
    }
  });
}

// ---------- Dyrket mark: jordstriper, lave gjerder og grønne skudd ----------
function paintField(seed, p) {
  return paintSprite(96, 48, 48, 29, (ctx) => {
    const rnd = mulberry(seed), a = smooth(0, 0.2, p);
    dab(ctx, 0, 2, 42, 15, 0, rgba([105, 82, 53], 0.58 * a));
    ctx.save(); ctx.globalAlpha = a;
    for (let row = 0; row < 7; row++) {
      const y = -9 + row * 3.4;
      taper(ctx, -36, y, 36, y + 1.8, 1.2, 1.1, row % 2 ? 'rgb(93,70,44)' : 'rgb(122,95,60)');
      if (p > 0.5) for (let i = 0; i < 10; i++) dab(ctx, -31 + i * 7 + (rnd() - .5), y - 1, 0.8, 1.5 + rnd(), 0, 'rgb(105,126,58)');
    }
    for (const x of [-38, 38]) taper(ctx, x, 5, x, -15, 1.1, .8, 'rgb(96,72,48)');
    ctx.restore();
  });
}

// ---------- Verksted: åpen tømmerbod med arbeidsbenk ----------
function paintWorkshop(seed, p) {
  return paintSprite(82, 60, 41, 48, (ctx) => {
    const rnd = mulberry(seed), a = smooth(0, .2, p);
    dab(ctx, 0, 3, 29, 10, 0, rgba([40, 30, 18], .35 * a));
    ctx.save(); ctx.globalAlpha = a;
    for (const x of [-22, 22]) taper(ctx, x, 4, x, -28, 1.6, 1.25, 'rgb(91,68,45)');
    taper(ctx, -27, -17, 27, -17, 1.3, 1.1, 'rgb(98,75,49)');
    ctx.beginPath(); ctx.moveTo(-34, -17); ctx.lineTo(-19, -36); ctx.lineTo(22, -36); ctx.lineTo(34, -17); ctx.closePath(); ctx.fillStyle = 'rgb(112,89,55)'; ctx.fill();
    taper(ctx, -22, 0, 22, 0, 2.6, 2.2, 'rgb(106,76,46)');
    for (let i = 0; i < 7; i++) dab(ctx, -16 + i * 5, -3 + rnd() * 3, 1.2, .9, rnd(), 'rgb(145,136,116)');
    ctx.restore();
  });
}

const cache = new Map();
export function buildingSprite(b) {
  const level = b.complete ? STEPS : Math.floor(b.progress * STEPS);
  const entry = cache.get(b.id);
  if (entry && entry.level === level) return entry.sprite;
  const p = level / STEPS;
  const seed = b.id * 101 + 7;
  const sprite = b.type === 'shelter' ? paintShelter(seed, p)
    : b.type === 'hut' ? paintHut(seed, p)
      : b.type === 'storage' ? paintStorage(seed, p)
      : b.type === 'hearth' ? paintHearth(seed, p)
        : b.type === 'field' ? paintField(seed, p)
          : b.type === 'workshop' ? paintWorkshop(seed, p)
            : b.type === 'sawmill' ? paintSawmill(seed, p)
              : b.type === 'mason' ? paintMason(seed, p)
                : b.type === 'townhouse' ? paintTownhouse(seed, p)
                  : b.type === 'market' ? paintMarket(seed, p)
                    : b.type === 'hall' ? paintHall(seed, p) : paintFirePit(seed, p);
  cache.set(b.id, { level, sprite });
  return sprite;
}

// ---------- Lager og byggematerialer ----------
export const pileCount = (amount) => Math.min(28, Math.ceil(Math.sqrt(Math.max(0, amount)) * 2.2));

const woodCache = new Map(), stoneCache = new Map(), matCache = new Map();

// En stokk sett fra siden: bark med skyggeside, høylys og (valgfritt) synlig kappflate i høyre ende.
function logSide(ctx, x, y, len, rad, rnd, end) {
  const bark = jitter([[98, 74, 52], [108, 84, 58], [84, 64, 46], [118, 98, 72]][Math.floor(rnd() * 4)], rnd, 0.18);
  const tilt = (rnd() - 0.5) * 0.9;
  dab(ctx, x + 0.5, y + rad * 0.75, len * 0.55, rad * 0.55, 0, 'rgba(22,16,10,0.4)');
  taper(ctx, x - len / 2, y - tilt / 2, x + len / 2, y + tilt / 2, rad * 2, rad * 1.9, rgba(bark, 1));
  taper(ctx, x - len / 2, y + rad * 0.5 - tilt / 2, x + len / 2, y + rad * 0.5 + tilt / 2, rad * 0.9, rad * 0.85, 'rgba(0,0,0,0.3)');
  taper(ctx, x - len / 2, y - rad * 0.55 - tilt / 2, x + len / 2, y - rad * 0.55 + tilt / 2, rad * 0.35, rad * 0.3, 'rgba(232,210,170,0.3)');
  for (let i = 0; i < len * 0.9; i++) dab(ctx, x - len / 2 + rnd() * len, y + (rnd() - 0.5) * rad * 1.6, 0.4 + rnd() * 0.9, 0.18 + rnd() * 0.2, 0, 'rgba(44,32,22,0.5)');
  if (end) {
    const ex = x + len / 2, ey = y + tilt / 2;
    dab(ctx, ex, ey, rad * 0.42, rad * 0.98, 0, rgba(jitter([196, 162, 116], rnd, 0.15), 1));
    dab(ctx, ex, ey, rad * 0.2, rad * 0.5, 0, 'rgba(130,98,64,0.65)');
  }
}
// En stokk rettet mot betrakteren: kappflaten med årringer.
function logEnd(ctx, x, y, rad, rnd) {
  const bark = jitter([100, 76, 54], rnd, 0.18);
  dab(ctx, x + 0.4, y + 0.45, rad * 1.05, rad * 0.95, 0, 'rgba(24,16,10,0.45)');
  dab(ctx, x, y, rad, rad * 0.95, 0, rgba(bark, 1));
  dab(ctx, x - 0.1, y - 0.1, rad * 0.78, rad * 0.74, 0, rgba(jitter([196, 164, 118], rnd, 0.14), 1));
  dab(ctx, x - 0.1, y - 0.1, rad * 0.4, rad * 0.38, 0, 'rgba(136,102,68,0.7)');
  dab(ctx, x - 0.1, y - 0.1, rad * 0.12, rad * 0.12, 0, 'rgba(90,64,40,0.9)');
}

// Fast oppsett per stokk-indeks, slik at haugen vokser uten å stokkes om og alltid speiler beholdningen.
const WOOD_LAYOUT = (() => {
  const r = mulberry(4242), rows = [6, 5, 5, 4, 3, 3, 2], out = [];
  rows.forEach((cnt, row) => {
    for (let c = 0; c < cnt; c++) {
      out.push({ x: (c - (cnt - 1) / 2) * 5.3 + (r() - 0.5) * 1.1, y: -1.6 - row * 2.7 + (r() - 0.5) * 0.4, len: 8.5 + r() * 4, rad: 1.35 + r() * 0.6, end: r() < 0.28, seed: Math.floor(r() * 1e6) });
    }
  });
  return out;
})();

export function woodPileSprite(n) {
  if (woodCache.has(n)) return woodCache.get(n);
  const s = paintSprite(40, 28, 20, 24, (ctx) => {
    if (n > 0) dab(ctx, 0.5, 0.9, 15.5, 2.6, 0, 'rgba(20,16,10,0.26)');
    WOOD_LAYOUT.slice(0, n).sort((a, b) => a.y - b.y).forEach((l) => {
      const rnd = mulberry(l.seed);
      if (l.end) logEnd(ctx, l.x, l.y, l.rad * 1.02, rnd);
      else logSide(ctx, l.x, l.y, l.len, l.rad, rnd, (l.seed & 1) === 0);
    });
    // Kvister og avkapp ligger i kanten av haugen når den blir stor.
    if (n > 6) for (let i = 0; i < Math.min(5, (n - 6) / 3); i++) taper(ctx, -16 + i * 2.2, 0.8 + (i % 2) * 0.6, -13 + i * 2.2, 0.2 + (i % 2) * 0.7, 0.6, 0.45, 'rgb(104,80,56)');
  });
  woodCache.set(n, s);
  return s;
}

// Fasettert stein med lys flate øverst til venstre, mørk underside og kontaktskygge.
function stone(ctx, x, y, sz, rnd) {
  const sides = 7, pts = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + rnd() * 0.4;
    const rr = 0.82 + rnd() * 0.34;
    pts.push([x + Math.cos(a) * sz * rr, y - sz * 0.45 + Math.sin(a) * sz * rr * 0.62]);
  }
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < sides; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
  const k = 0.78 + rnd() * 0.42;
  dab(ctx, x + sz * 0.25, y + 0.3, sz * 1.1, sz * 0.3, 0, 'rgba(20,18,14,0.45)');
  path();
  ctx.fillStyle = rgba([118 * k, 112 * k, 100 * k], 1);
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  dab(ctx, x - sz * 0.3, y - sz * 0.75, sz * 0.7, sz * 0.38, 0, 'rgba(206,200,184,0.5)');
  dab(ctx, x + sz * 0.25, y + sz * 0.05, sz * 0.9, sz * 0.32, 0, 'rgba(24,22,18,0.38)');
  for (let i = 0; i < sz * 2; i++) dab(ctx, x + (rnd() - 0.5) * sz * 1.6, y - sz * 0.45 + (rnd() - 0.5) * sz * 0.8, 0.3 + rnd() * 0.5, 0.2 + rnd() * 0.3, 0, rgba([90 * k, 86 * k, 76 * k], 0.5));
  ctx.restore();
  path();
  ctx.strokeStyle = 'rgba(34,30,24,0.4)';
  ctx.lineWidth = 0.3;
  ctx.stroke();
}

const STONE_LAYOUT = (() => {
  const r = mulberry(9191), out = [];
  for (let i = 0; i < 28; i++) {
    const row = Math.floor(Math.sqrt(i * 1.5));
    out.push({ x: (r() - 0.5) * (23 - row * 4.2), y: -1 - row * 2.5 + (r() - 0.5) * 0.8, sz: Math.max(1.3, 3.1 - row * 0.28) * (0.75 + r() * 0.5), seed: Math.floor(r() * 1e6) });
  }
  return out;
})();

export function stonePileSprite(n) {
  if (stoneCache.has(n)) return stoneCache.get(n);
  const s = paintSprite(36, 26, 18, 22, (ctx) => {
    if (n > 0) dab(ctx, 0.5, 0.9, 12.5, 2.4, 0, 'rgba(20,16,10,0.24)');
    STONE_LAYOUT.slice(0, n).sort((a, b) => a.y - b.y).forEach((q) => stone(ctx, q.x, q.y, q.sz, mulberry(q.seed)));
  });
  stoneCache.set(n, s);
  return s;
}

// Byggematerialer ved en byggeplass: staker og noen stein.
export function materialSprite(n) {
  if (matCache.has(n)) return matCache.get(n);
  const s = paintSprite(28, 16, 14, 11, (ctx) => {
    const rnd = mulberry(55);
    if (n > 0) dab(ctx, 0.5, 0.7, 11, 2.6, 0, 'rgba(20,16,10,0.34)');
    for (let i = 0; i < n; i++) {
      const y = -1.1 - (i % 3) * 1.5;
      logSide(ctx, -4 + (rnd() - 0.5) * 2, y, 10 + rnd() * 2, 0.7, rnd, i % 2 === 0);
    }
    for (let i = 0; i < Math.min(3, n); i++) stone(ctx, 7 + i * 2.1, -0.4 - (i % 2) * 0.7, 1.4 + rnd() * 0.5, rnd);
  });
  matCache.set(n, s);
  return s;
}
