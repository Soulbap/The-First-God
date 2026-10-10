// OPUS-11 · Egne silhuetter for industri, kraft, transport og forskning. Tidligere gjenbrukte OPUS-07..10 noen få malerier
// (verksted, fabrikk) for alt fra oljebrønn til forskningsinstitutt. Hver av disse leses nå uten etikett:
//   oljebrønn = tretårn med pumpearm · raffineri = tanker og destillasjonskolonne · generator = kraftsal med skorstein
//   nettstasjon = mast med isolatorer og transformator · flyplass = rullebane, hangar og vindpølse
//   institutt = stor, rolig stenbygning med kuppel og antenne · telegraf = høy mast med tverrbjelker
//   gruve = vinsjtårn med kullhaug · dampmaskinhus = teglhall med høy skorstein · stasjon = plattform og spor
// Samme maletradisjon som city.js (lys fra øvre venstre, skrå dybdeakse, kontaktskygge, dempet palett).
import { mulberry, paintSprite, dab, taper, rgba, smooth, clamp } from './paint.js';
import { box, gableRoof, contact, groundPatch, stage, DX, DY } from './city.js';

const BRICK = ['rgb(132,82,66)', 'rgb(94,58,48)'];
const STONE = ['rgb(138,132,120)', 'rgb(98,94,86)'];
const IRON = 'rgb(78,80,84)', IRON_LIT = 'rgb(122,124,126)', TIMBER = 'rgb(110,82,54)';

const tank = (ctx, x, y, rx, h, base, lit) => {
  const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, lit); g.addColorStop(0.55, base); g.addColorStop(1, 'rgba(40,40,44,1)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - rx, y); ctx.lineTo(x - rx, y - h); ctx.ellipse(x, y - h, rx, rx * 0.42, 0, Math.PI, 0, true); ctx.lineTo(x + rx, y); ctx.ellipse(x, y, rx, rx * 0.42, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
  ctx.fillStyle = lit; ctx.beginPath(); ctx.ellipse(x, y - h, rx, rx * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(30,30,34,0.35)'; ctx.lineWidth = 0.5;
  for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x, y - (h * k) / 4, rx, rx * 0.42, 0, 0, Math.PI); ctx.stroke(); }
};

const chimney = (ctx, x, y, h, w, p) => {
  const hh = h * p;
  ctx.fillStyle = 'rgb(112,74,60)'; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * 0.7, y - hh); ctx.lineTo(x + w * 0.7, y - hh); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgb(82,54,44)'; ctx.beginPath(); ctx.moveTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.3, y - hh); ctx.lineTo(x + w * 0.7, y - hh); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgb(150,142,126)'; ctx.fillRect(x - w * 0.9, y - hh, w * 1.8, 1.6);
};

export function paintDerrick(seed, p) {
  return paintSprite(84, 100, 40, 78, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 32, 11, p, [70, 64, 54]);
    dab(ctx, 0, 3, 22, 6, 0, 'rgba(14,12,10,0.4)');
    // Mørk oljesøl og planker rundt brønnhodet.
    dab(ctx, 0, 1, 15, 5, 0, rgba([34, 30, 26], 0.7 * smooth(0, 0.3, p)));
    const h = 62 * stage(p, 0.1, 0.7);
    // Fire skrå bein og kryssavstivere.
    for (const [bx, by] of [[-13, 3], [13, 3], [-8, -4], [8, -4]]) taper(ctx, bx, by, bx * 0.2, by - h, 2.2, 1.2, TIMBER);
    for (let k = 1; k < 6; k++) {
      const y = -h * (k / 6), w = 13 * (1 - k / 6.4);
      taper(ctx, -w, y + 2, w, y - 4, 0.9, 0.9, 'rgb(150,116,76)'); taper(ctx, w, y + 2, -w, y - 4, 0.9, 0.9, 'rgb(150,116,76)');
    }
    // Krone med trinse.
    if (h > 40) { ctx.fillStyle = IRON; ctx.fillRect(-3, -h - 3, 6, 4); dab(ctx, 0, -h - 4, 2.4, 2.4, 0, IRON_LIT); }
    // Pumpearm og motorhus ved siden av.
    if (p > 0.6) {
      taper(ctx, -26, -7, -4, -15, 1.8, 1.8, IRON); taper(ctx, -4, -15, 6, -12, 1.4, 1.4, IRON); dab(ctx, -26, -6, 2.2, 2.2, 0, IRON_LIT);
      box(ctx, rnd, 14, 4, 12, 8, 8, 'rgb(98,92,84)', 'rgb(70,66,60)', 'rgb(112,106,96)');
      // Tønner med råolje.
      for (const [tx, ty] of [[24, 8], [30, 6], [27, 11]]) { tank(ctx, tx, ty, 2.6, 5, 'rgb(52,48,44)', 'rgb(90,84,76)'); }
    }
  });
}

export function paintRefinery(seed, p) {
  return paintSprite(124, 112, 58, 90, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 52, 14, p, [82, 78, 70]);
    contact(ctx, 60, 22, smooth(0.1, 0.4, p));
    const s1 = stage(p, 0.1, 0.5), s2 = stage(p, 0.4, 0.85), s3 = stage(p, 0.8, 1);
    // To lagertanker foran og en høy destillasjonskolonne bak.
    if (s1 > 0) { tank(ctx, -28, 0, 14, 20 * s1, 'rgb(150,146,136)', 'rgb(190,184,170)'); tank(ctx, -4, 6, 11, 16 * s1, 'rgb(142,138,128)', 'rgb(184,178,164)'); }
    if (s2 > 0) {
      tank(ctx, 26, -10, 8, 54 * s2, 'rgb(116,120,124)', 'rgb(168,172,172)');
      for (let k = 1; k < 5; k++) taper(ctx, 18, -10 - 54 * s2 * (k / 5), 34, -10 - 54 * s2 * (k / 5), 1.2, 1.2, 'rgb(70,72,76)');
      // Rør mellom tankene og kolonnen med tette skjøter.
      taper(ctx, -18, -14, 14, -26, 1.8, 1.8, 'rgb(96,98,100)'); taper(ctx, 0, -10, 20, -18, 1.4, 1.4, 'rgb(96,98,100)');
      for (let k = 0; k < 6; k++) dab(ctx, -14 + k * 5, -16 - k * 1.8, 1.3, 1.3, 0, 'rgb(150,146,134)');
    }
    // Lavt bygg med skorstein og en fakkel.
    if (s2 > 0.5) box(ctx, rnd, 40, 6, 20, 12, 12, 'rgb(128,120,108)', 'rgb(90,84,76)', 'rgb(112,106,96)', { courses: 3 });
    if (s3 > 0) { chimney(ctx, 50, -2, 36, 3, s3); const f = 36 * s3; dab(ctx, 50, -2 - f - 4, 2.4, 4.4, 0, 'rgba(255,170,70,0.85)'); dab(ctx, 50, -2 - f - 5, 1.2, 2.6, 0, 'rgba(255,226,150,0.9)'); }
  });
}

export function paintGenerator(seed, p) {
  return paintSprite(112, 104, 52, 84, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 44, 13, p, [92, 88, 78]);
    contact(ctx, 54, 24, smooth(0.1, 0.4, p));
    const W = 54, D = 24, H = 28, x = -W / 2 - 4, walls = stage(p, 0.1, 0.7), roof = stage(p, 0.65, 0.98);
    ctx.save(); ctx.beginPath(); ctx.rect(-70, -H * walls - 40, 160, H * walls + 60); ctx.clip();
    box(ctx, rnd, x, 0, W, D, H, BRICK[0], BRICK[1], null, { courses: 8, mortar: 'rgba(48,36,28,0.34)' });
    // Høye buevinduer med varmt lys og en stor dør.
    for (let i = 0; i < 4; i++) {
      const wx = x + 6 + i * 12.5;
      ctx.fillStyle = 'rgb(40,36,34)'; ctx.beginPath(); ctx.moveTo(wx, -6); ctx.lineTo(wx, -20); ctx.arc(wx + 3.5, -20, 3.5, Math.PI, 0); ctx.lineTo(wx + 7, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(236,196,120,0.3)'; ctx.fillRect(wx + 1, -18, 5, 8);
    }
    ctx.restore();
    if (roof > 0) { ctx.save(); ctx.globalAlpha = smooth(0, 0.3, roof); gableRoof(ctx, rnd, x - 1, -H, W + 2, D, 12 * roof, 3, 'rgb(94,98,102)', 'rgb(70,74,78)', 'rgb(128,134,138)'); ctx.restore(); }
    chimney(ctx, x + W + 8, 2, 62, 4, stage(p, 0.5, 0.95));
    // Kraftledning ut til en mast.
    if (p > 0.9) { taper(ctx, x + W + 8, -50, x + W + 34, -44, 0.5, 0.5, 'rgba(30,30,34,0.7)'); }
  });
}

export function paintGridStation(seed, p) {
  return paintSprite(60, 92, 28, 74, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 22, 8, p, [90, 88, 80]);
    dab(ctx, 0, 3, 14, 4, 0, 'rgba(14,12,10,0.4)');
    const h = 58 * stage(p, 0.1, 0.7);
    taper(ctx, 0, 2, 0, -h, 3, 1.8, TIMBER);
    for (const [ay, aw] of [[-h + 6, 16], [-h + 18, 12]]) {
      taper(ctx, -aw, ay, aw, ay, 1.4, 1.4, 'rgb(94,70,46)');
      for (const sx of [-aw + 1, aw - 1]) { dab(ctx, sx, ay - 2, 1.5, 1.8, 0, 'rgb(188,196,196)'); taper(ctx, sx, ay + 6, sx, ay, 0.3, 0.3, 'rgba(24,24,28,0.7)'); }
    }
    // Transformatorkasse ved foten med gjerde.
    if (p > 0.55) { box(ctx, rnd, 6, 4, 14, 8, 9, 'rgb(104,110,106)', 'rgb(76,80,78)', 'rgb(124,128,124)', { courses: 2 }); taper(ctx, -18, 6, 24, 6, 0.5, 0.5, 'rgba(90,84,70,0.9)'); }
  });
}

export function paintAirfield(seed, p) {
  return paintSprite(176, 96, 84, 66, (ctx) => {
    const rnd = mulberry(seed);
    const run = stage(p, 0.05, 0.55), hangar = stage(p, 0.4, 0.95);
    // Rullebane: lang, lys stripe av komprimert grus med mørke kantlinjer og midtlinje.
    ctx.save(); ctx.translate(0, 6); ctx.rotate(-0.12);
    ctx.fillStyle = 'rgba(54,48,38,0.4)'; ctx.fillRect(-82, -5.2, 164 * run, 12.4);
    ctx.fillStyle = 'rgb(150,140,116)'; ctx.fillRect(-82, -6, 164 * run, 11);
    for (let i = 0; i < 160 * run; i++) dab(ctx, -80 + rnd() * 160 * run, -5 + rnd() * 9, 1 + rnd() * 2, 0.4, 0, rnd() < 0.5 ? 'rgba(104,94,76,0.35)' : 'rgba(190,180,152,0.3)');
    ctx.fillStyle = 'rgba(236,230,206,0.85)'; for (let k = -76; k < -76 + 150 * run; k += 14) ctx.fillRect(k, -0.6, 7, 1.2);
    ctx.restore();
    // Hangar med buet tak og store porter.
    if (hangar > 0) {
      const x = 14, y = 0, W = 44, D = 24, H = 20 * hangar;
      contact(ctx, W, D, 0.8);
      box(ctx, rnd, x, y, W, D, H, 'rgb(122,116,104)', 'rgb(86,82,74)', null, { courses: 4 });
      const g = ctx.createLinearGradient(0, y - H - 12, 0, y - H);
      g.addColorStop(0, 'rgb(150,146,136)'); g.addColorStop(1, 'rgb(96,94,88)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 2, y - H); ctx.quadraticCurveTo(x + W / 2, y - H - 20, x + W + 2, y - H); ctx.lineTo(x + W + D * DX, y - H - D * DY); ctx.quadraticCurveTo(x + W / 2 + D * DX, y - H - 20 - D * DY, x + D * DX, y - H - D * DY); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgb(46,44,40)'; ctx.fillRect(x + 6, y - H * 0.8, W - 12, H * 0.8);
      ctx.strokeStyle = 'rgba(120,114,100,0.6)'; ctx.lineWidth = 0.6; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 6 + (W - 12) * k / 4, y - H * 0.8); ctx.lineTo(x + 6 + (W - 12) * k / 4, y); ctx.stroke(); }
    }
    // Vindpølse.
    if (p > 0.7) { taper(ctx, -58, 4, -58, -18, 1, 0.8, 'rgb(96,90,80)'); ctx.fillStyle = '#c0583e'; ctx.beginPath(); ctx.moveTo(-58, -18); ctx.lineTo(-44, -16); ctx.lineTo(-58, -13); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(240,236,220,0.85)'; ctx.beginPath(); ctx.moveTo(-52, -17); ctx.lineTo(-48, -16.4); ctx.lineTo(-52, -14.8); ctx.closePath(); ctx.fill(); }
  });
}

export function paintInstitute(seed, p) {
  return paintSprite(124, 118, 58, 98, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 50, 14, p, [112, 110, 100]);
    contact(ctx, 62, 26, smooth(0.1, 0.4, p));
    const W = 62, D = 26, H = 32, x = -W / 2 - 4, walls = stage(p, 0.1, 0.7), top = stage(p, 0.65, 0.98);
    ctx.save(); ctx.beginPath(); ctx.rect(-80, -(H + 30) * walls - 30, 180, (H + 30) * walls + 50); ctx.clip();
    box(ctx, rnd, x, 0, W, D, H, STONE[0], STONE[1], null, { courses: 6, mortar: 'rgba(40,38,32,0.32)' });
    // Søyleinngang og to rekker vinduer.
    for (let i = 0; i < 4; i++) { const cx = x + W / 2 - 12 + i * 8; ctx.fillStyle = 'rgb(188,182,166)'; ctx.fillRect(cx, -H * 0.7, 2.6, H * 0.7); }
    ctx.fillStyle = 'rgb(176,170,154)'; ctx.fillRect(x + W / 2 - 15, -H * 0.7 - 3, 30, 3);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { if (i > 1 && i < 4 && r === 0) continue; const wx = x + 5 + i * 9.4; ctx.fillStyle = 'rgb(38,34,32)'; ctx.fillRect(wx, -9 - r * 14, 5, 8); ctx.fillStyle = 'rgba(150,172,180,0.4)'; ctx.fillRect(wx + 0.7, -8.3 - r * 14, 3.6, 3); }
    ctx.restore();
    if (top > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.35, top);
      gableRoof(ctx, rnd, x - 1, -H, W + 2, D, 10 * top, 2, 'rgb(98,104,108)', 'rgb(72,78,82)', 'rgb(132,138,142)');
      // Kuppel for observasjon og en antenne.
      const cx = x + W / 2 + 4, cy = -H - 8 * top;
      ctx.fillStyle = 'rgb(168,166,156)'; ctx.beginPath(); ctx.ellipse(cx, cy, 10, 8, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(214,210,196,0.7)'; ctx.beginPath(); ctx.ellipse(cx - 2.5, cy - 2.4, 4, 3, 0, Math.PI, 0); ctx.fill();
      taper(ctx, x + W - 6, -H - 6, x + W - 6, -H - 30 * top, 0.9, 0.5, 'rgb(70,70,74)'); taper(ctx, x + W - 11, -H - 22 * top, x + W - 1, -H - 22 * top, 0.5, 0.5, 'rgb(70,70,74)');
      ctx.restore();
    }
  });
}

export function paintTelegraph(seed, p) {
  return paintSprite(52, 84, 24, 68, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 18, 7, p, [92, 88, 76]);
    dab(ctx, 0, 3, 12, 3.4, 0, 'rgba(14,12,10,0.4)');
    const h = 54 * stage(p, 0.1, 0.7);
    taper(ctx, 0, 2, 0, -h, 2.6, 1.4, TIMBER);
    for (const [ay, aw] of [[-h + 4, 12], [-h + 13, 9]]) { taper(ctx, -aw, ay, aw, ay, 1.2, 1.2, 'rgb(94,70,46)'); for (const sx of [-aw + 1.5, aw - 1.5]) dab(ctx, sx, ay - 1.6, 1.3, 1.6, 0, 'rgb(188,196,196)'); }
    if (p > 0.55) { box(ctx, rnd, 6, 5, 12, 7, 9, 'rgb(150,118,80)', 'rgb(104,80,54)', null, { courses: 4 }); gableRoof(ctx, rnd, 5, -4, 14, 7, 5, 1.5, 'rgb(96,70,52)', 'rgb(72,52,38)', 'rgb(124,96,72)'); }
    if (p > 0.9) taper(ctx, -12, -h + 4, -26, -h + 16, 0.4, 0.4, 'rgba(30,30,34,0.6)');
  });
}

export function paintMineHead(seed, p) {
  return paintSprite(96, 92, 44, 72, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 38, 12, p, [58, 54, 48]);
    contact(ctx, 40, 18, smooth(0.1, 0.4, p));
    const h = 46 * stage(p, 0.1, 0.7);
    // Vinsjtårn av tre med hjul på toppen, og et lavt skur.
    for (const sx of [-9, 9]) taper(ctx, sx, 3, sx * 0.5, -h, 2.4, 1.6, TIMBER);
    for (let k = 1; k < 4; k++) { const y = -h * k / 4, w = 9 * (1 - k / 4.4); taper(ctx, -w, y + 3, w, y - 3, 0.9, 0.9, 'rgb(150,116,76)'); }
    if (h > 30) { dab(ctx, -3, -h - 2, 5.4, 5.4, 0, IRON); dab(ctx, 3, -h - 2, 5.4, 5.4, 0, IRON); ctx.strokeStyle = 'rgba(30,30,34,0.7)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -h + 3); ctx.lineTo(0, 2); ctx.stroke(); }
    if (p > 0.55) { box(ctx, rnd, 16, 4, 22, 12, 12, 'rgb(112,92,66)', 'rgb(80,64,46)', null, { courses: 5 }); gableRoof(ctx, rnd, 15, -8, 24, 12, 7, 2, 'rgb(86,72,56)', 'rgb(64,52,40)', 'rgb(116,98,74)'); }
    // Haug av kull og en tipptralle.
    if (p > 0.7) { for (let i = 0; i < 40; i++) dab(ctx, -30 + rnd() * 18, 2 - rnd() * (8 - Math.abs((i % 10) - 5)), 1.2 + rnd() * 2.4, 1 + rnd() * 1.4, rnd(), rnd() < 0.8 ? 'rgb(38,36,36)' : 'rgb(72,70,70)'); }
  });
}

export function paintEngineHouse(seed, p) {
  return paintSprite(104, 112, 48, 90, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 42, 13, p, [72, 68, 60]);
    contact(ctx, 46, 22, smooth(0.1, 0.4, p));
    const W = 46, D = 22, H = 22, x = -W / 2 - 4, walls = stage(p, 0.1, 0.7), roof = stage(p, 0.65, 0.98);
    ctx.save(); ctx.beginPath(); ctx.rect(-70, -H * walls - 40, 160, H * walls + 60); ctx.clip();
    box(ctx, rnd, x, 0, W, D, H, BRICK[0], BRICK[1], null, { courses: 7, mortar: 'rgba(44,32,26,0.34)' });
    for (let i = 0; i < 3; i++) { const wx = x + 6 + i * 14; ctx.fillStyle = 'rgb(38,34,32)'; ctx.fillRect(wx, -17, 7, 11); ctx.fillStyle = 'rgba(255,170,80,0.35)'; ctx.fillRect(wx + 1, -16, 5, 4); }
    ctx.restore();
    if (roof > 0) { ctx.save(); ctx.globalAlpha = smooth(0, 0.3, roof); gableRoof(ctx, rnd, x - 1, -H, W + 2, D, 9 * roof, 2.5, 'rgb(86,90,94)', 'rgb(62,66,70)', 'rgb(120,124,128)'); ctx.restore(); }
    chimney(ctx, x + W + 6, 2, 70, 4.4, stage(p, 0.5, 0.95));
    // Svinghjul synlig i døråpningen.
    if (p > 0.8) { ctx.strokeStyle = 'rgb(60,60,64)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x + W * 0.5, -9, 6.5, 0, Math.PI * 2); ctx.stroke(); }
  });
}

export function paintStation(seed, p) {
  return paintSprite(112, 70, 52, 52, (ctx) => {
    const rnd = mulberry(seed);
    const s = stage(p, 0.1, 0.8);
    // To spor (skinner og sviller) og en lav plattform med tak.
    ctx.save(); ctx.translate(0, 8); ctx.rotate(-0.1);
    for (let k = -50; k < 50 * s; k += 5) { ctx.fillStyle = 'rgb(96,74,52)'; ctx.fillRect(k, -4, 2.4, 11); }
    ctx.fillStyle = 'rgb(122,124,126)'; ctx.fillRect(-52, -2.2, 104 * s, 0.9); ctx.fillRect(-52, 3.2, 104 * s, 0.9);
    ctx.restore();
    if (s > 0.4) {
      box(ctx, rnd, -28, -2, 56, 8, 3.4, 'rgb(150,140,120)', 'rgb(106,98,84)', 'rgb(168,158,136)');
      box(ctx, rnd, -10, -6, 20, 10, 12, 'rgb(150,118,80)', 'rgb(104,80,54)', null, { courses: 5 });
      gableRoof(ctx, rnd, -12, -18, 24, 10, 7, 2, 'rgb(96,70,52)', 'rgb(72,52,38)', 'rgb(124,96,72)');
      ctx.fillStyle = 'rgb(42,34,28)'; ctx.fillRect(-3, -14, 6, 8);
    }
  });
}

export function paintGarage(seed, p) {
  return paintSprite(112, 88, 52, 68, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 44, 13, p, [90, 86, 78]);
    contact(ctx, 52, 22, smooth(0.1, 0.4, p));
    const W = 52, D = 22, H = 20, x = -W / 2 - 4, walls = stage(p, 0.1, 0.7), roof = stage(p, 0.65, 0.98);
    ctx.save(); ctx.beginPath(); ctx.rect(-70, -H * walls - 40, 160, H * walls + 60); ctx.clip();
    box(ctx, rnd, x, 0, W, D, H, 'rgb(140,134,120)', 'rgb(100,96,86)', null, { courses: 5 });
    // Store porter med et lastebilsiluett innenfor.
    for (let i = 0; i < 2; i++) { const gx = x + 5 + i * 24; ctx.fillStyle = 'rgb(48,44,40)'; ctx.fillRect(gx, -15, 19, 15); ctx.fillStyle = 'rgb(86,92,86)'; ctx.fillRect(gx + 3, -10, 12, 6); ctx.fillStyle = 'rgb(66,70,66)'; ctx.fillRect(gx + 10, -12, 5, 8); dab(ctx, gx + 6, -3, 1.6, 1.6, 0, 'rgb(24,24,26)'); dab(ctx, gx + 13, -3, 1.6, 1.6, 0, 'rgb(24,24,26)'); }
    ctx.restore();
    if (roof > 0) { ctx.save(); ctx.globalAlpha = smooth(0, 0.3, roof); gableRoof(ctx, rnd, x - 1, -H, W + 2, D, 8 * roof, 2.5, 'rgb(104,108,112)', 'rgb(76,80,84)', 'rgb(140,144,148)'); ctx.restore(); }
    // Oljefat ved siden av.
    for (const [tx, ty] of [[x + W + 6, 4], [x + W + 12, 2]]) tank(ctx, tx, ty, 2.8, 6, 'rgb(150,70,50)', 'rgb(196,104,78)');
  });
}

export function paintCleanWorks(seed, p) {
  return paintSprite(112, 96, 52, 76, (ctx) => {
    const rnd = mulberry(seed);
    groundPatch(ctx, rnd, 44, 13, p, [100, 98, 90]);
    contact(ctx, 52, 24, smooth(0.1, 0.4, p));
    const W = 52, D = 24, H = 20, x = -W / 2 - 4, walls = stage(p, 0.1, 0.7), roof = stage(p, 0.65, 0.98);
    ctx.save(); ctx.beginPath(); ctx.rect(-70, -H * walls - 40, 160, H * walls + 60); ctx.clip();
    box(ctx, rnd, x, 0, W, D, H, 'rgb(188,182,166)', 'rgb(132,128,116)', null, { courses: 0 });
    for (let i = 0; i < 5; i++) { const wx = x + 4 + i * 9.6; ctx.fillStyle = 'rgb(48,58,68)'; ctx.fillRect(wx, -16, 7, 9); ctx.fillStyle = 'rgba(236,206,140,0.35)'; ctx.fillRect(wx + 0.6, -15.4, 5.8, 3); }
    ctx.fillStyle = 'rgb(60,66,72)'; ctx.fillRect(x + W / 2 - 4, -9, 8, 9);
    ctx.restore();
    // Sagtak (nordlys) i tre rekker: lyse vindusflater mot nord.
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.3, roof);
      for (let k = 0; k < 3; k++) {
        const sx = x + k * (W / 3), sw = W / 3;
        ctx.fillStyle = 'rgb(110,114,118)'; ctx.beginPath(); ctx.moveTo(sx, -H); ctx.lineTo(sx + sw, -H); ctx.lineTo(sx + sw, -H - 10 * roof); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(176,200,214,0.65)'; ctx.beginPath(); ctx.moveTo(sx + sw, -H); ctx.lineTo(sx + sw, -H - 10 * roof); ctx.lineTo(sx + sw + D * DX, -H - 10 * roof - D * DY); ctx.lineTo(sx + sw + D * DX, -H - D * DY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgb(130,134,138)'; ctx.beginPath(); ctx.moveTo(sx, -H); ctx.lineTo(sx + sw, -H - 10 * roof); ctx.lineTo(sx + sw + D * DX, -H - 10 * roof - D * DY); ctx.lineTo(sx + D * DX, -H - D * DY); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  });
}
