// OPUS-02 · Gårdsplasser og spesialisering. Rekvisitter rundt bygg som leses av spilltilstanden:
//  · sagbruk: tømmerstabler og plankestabler som vokser med det sagbruket faktisk har produsert (b.made)
//  · steinhoggeri: blokker, rå stein og et bruddhull som blir større med produksjonen
//  · åker: neper og en fugleskremsel; flere neper etter hvert som det høstes
//  · by: tønner, benker, kjerrer og tøyvask ved byhusene; lykter langs gatene
//  · leir: ei skinnstativ og en stokk å sitte på ved de første ly
// Alt er deterministisk fra bygg-id og tilstand; ingenting her påvirker spillreglene.
import { mulberry, paintSprite, dab, taper, jitter, rgba, smooth } from './paint.js';
import { woodPileSprite, stonePileSprite } from './buildings.js';
import { plankPileSprite, blockPileSprite } from './city.js';

const cache = new Map();
const once = (key, make) => { let s = cache.get(key); if (!s) { s = make(); cache.set(key, s); } return s; };

export const barrel = () => once('barrel', () => paintSprite(14, 16, 7, 13, (ctx) => {
  const r = mulberry(5);
  dab(ctx, 0.8, 0.8, 5, 1.7, 0, 'rgba(16,12,6,0.4)');
  ctx.fillStyle = 'rgb(112,82,50)'; ctx.beginPath(); ctx.moveTo(-3.8, 0); ctx.quadraticCurveTo(-5, -5, -3.8, -10); ctx.lineTo(3.8, -10); ctx.quadraticCurveTo(5, -5, 3.8, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(236,200,150,0.22)'; ctx.fillRect(-3.6, -10, 1.6, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.26)'; ctx.fillRect(1.8, -10, 2.2, 10);
  for (const y of [-2.2, -7.8]) taper(ctx, -4.4, y, 4.4, y, 0.8, 0.8, 'rgb(48,44,40)');
  dab(ctx, 0, -10, 3.8, 1.3, 0, 'rgb(142,106,66)');
  for (let i = 0; i < 12; i++) dab(ctx, (r() - 0.5) * 7, -r() * 10, 0.4, 0.9, 0, 'rgba(30,20,10,0.25)');
}));

export const crate = () => once('crate', () => paintSprite(16, 14, 8, 11, (ctx) => {
  dab(ctx, 0.8, 0.6, 6.4, 1.8, 0, 'rgba(16,12,6,0.4)');
  ctx.fillStyle = 'rgb(138,106,68)'; ctx.fillRect(-4.8, -7.4, 9.6, 7.6);
  ctx.fillStyle = 'rgb(160,126,84)'; ctx.beginPath(); ctx.moveTo(-4.8, -7.4); ctx.lineTo(-2.8, -9.4); ctx.lineTo(7, -9.4); ctx.lineTo(4.8, -7.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.moveTo(4.8, -7.4); ctx.lineTo(7, -9.4); ctx.lineTo(7, -2); ctx.lineTo(4.8, 0.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,26,14,0.55)'; ctx.lineWidth = 0.5; ctx.strokeRect(-4.8, -7.4, 9.6, 7.6);
  ctx.beginPath(); ctx.moveTo(-4.8, -3.6); ctx.lineTo(4.8, -3.6); ctx.moveTo(-4.8, -7.4); ctx.lineTo(4.8, 0.2); ctx.stroke();
}));

export const cart = () => once('cart', () => paintSprite(34, 24, 17, 20, (ctx) => {
  dab(ctx, 1, 0.8, 11, 2.4, 0, 'rgba(16,12,6,0.36)');
  taper(ctx, -15, -7, -4, -9, 1.2, 1.2, 'rgb(96,70,44)'); taper(ctx, -15, -5.4, -4, -7.4, 1.2, 1.2, 'rgb(84,60,38)'); // skaft
  ctx.fillStyle = 'rgb(128,98,62)'; ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(10, -9); ctx.lineTo(9, -3.6); ctx.lineTo(-4, -3.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(230,200,150,0.2)'; ctx.fillRect(-5, -9, 15, 1.3);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(6, -9, 4, 5.4);
  for (const [x, c] of [[-1, 'rgb(190,172,128)'], [3.4, 'rgb(172,150,108)'], [7, 'rgb(196,178,134)']]) { dab(ctx, x, -10.5, 2.8, 2.2, 0, c); dab(ctx, x - 0.6, -11.2, 1.2, 0.8, 0, 'rgba(244,230,190,0.5)'); }
  dab(ctx, 3, -3, 4.6, 4.6, 0, 'rgb(86,62,40)'); dab(ctx, 3, -3, 3.4, 3.4, 0, 'rgb(112,84,54)'); dab(ctx, 3, -3, 0.9, 0.9, 0, 'rgb(48,38,28)');
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; taper(ctx, 3, -3, 3 + Math.cos(a) * 3.2, -3 + Math.sin(a) * 3.2, 0.4, 0.4, 'rgb(70,50,32)'); }
}));

export const bench = () => once('bench', () => paintSprite(30, 16, 15, 12, (ctx) => {
  dab(ctx, 1, 0.8, 11, 2, 0, 'rgba(16,12,6,0.34)');
  for (const x of [-9, 9]) { taper(ctx, x, 0, x, -4.6, 1.5, 1.4, 'rgb(86,64,42)'); }
  taper(ctx, -12, -4.8, 12, -4.8, 3, 3, 'rgb(130,98,62)'); taper(ctx, -12, -6, 12, -6, 0.8, 0.8, 'rgba(240,210,160,0.4)');
}));

export const laundry = () => once('laundry', () => paintSprite(36, 30, 18, 26, (ctx) => {
  dab(ctx, 0.5, 0.6, 14, 1.6, 0, 'rgba(16,12,6,0.26)');
  for (const x of [-14, 14]) taper(ctx, x, 0, x, -19, 1.2, 1, 'rgb(94,72,48)');
  ctx.strokeStyle = 'rgb(170,150,110)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-14, -18); ctx.quadraticCurveTo(0, -15.4, 14, -18); ctx.stroke();
  [[-8, 'rgb(206,200,184)'], [-1, 'rgb(150,86,70)'], [6, 'rgb(226,220,204)']].forEach(([x, c], i) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 2.6, -17.2 + i * 0.3); ctx.lineTo(x + 2.6, -17.2 + i * 0.3); ctx.lineTo(x + 3, -9.6 + i); ctx.lineTo(x - 2.2, -9.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + 0.6, -17, 2, 7);
  });
}));

export const rack = () => once('rack', () => paintSprite(34, 30, 17, 26, (ctx) => {
  // Skinnstativ ved de første lyene: to staker med tverrstang og et utspent skinn.
  dab(ctx, 0.6, 0.6, 12, 1.6, 0, 'rgba(16,12,6,0.28)');
  for (const x of [-10, 10]) taper(ctx, x, 0, x - 0.6, -20, 1.4, 1, 'rgb(98,76,52)');
  taper(ctx, -10.4, -19, 10.4, -19, 1.1, 1.1, 'rgb(104,80,54)');
  ctx.fillStyle = 'rgb(150,118,84)'; ctx.beginPath(); ctx.moveTo(-9, -18.6); ctx.lineTo(9, -18.6); ctx.quadraticCurveTo(10.6, -11, 7.4, -5.6); ctx.lineTo(3, -7.4); ctx.lineTo(0, -4.6); ctx.lineTo(-3.6, -7); ctx.lineTo(-8, -5.6); ctx.quadraticCurveTo(-10.4, -11, -9, -18.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(40,26,14,0.22)'; ctx.fillRect(1, -18, 8, 13);
  for (let i = 0; i < 20; i++) dab(ctx, (Math.sin(i * 7.1) * 8), -18 + (i * 0.67) % 12, 0.9, 0.5, 0, 'rgba(70,46,28,0.28)');
}));

export const log = () => once('seat', () => paintSprite(24, 14, 12, 10, (ctx) => {
  dab(ctx, 1, 0.8, 9, 1.8, 0, 'rgba(16,12,6,0.32)');
  taper(ctx, -8, -2.6, 8, -2.4, 4.6, 4.2, 'rgb(104,78,52)'); taper(ctx, -8, -3.8, 8, -3.6, 0.9, 0.9, 'rgba(236,206,160,0.4)'); dab(ctx, 8, -2.4, 1.1, 2.1, 0, 'rgb(198,164,118)');
}));

export const haystack = () => once('hay', () => paintSprite(22, 24, 11, 20, (ctx) => {
  const r = mulberry(21);
  dab(ctx, 1, 0.8, 8, 2, 0, 'rgba(16,12,6,0.34)');
  ctx.fillStyle = 'rgb(176,150,92)'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-8.4, -9, -1.4, -17); ctx.quadraticCurveTo(0, -18.4, 1.4, -17); ctx.quadraticCurveTo(8.4, -9, 8, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(250,236,170,0.28)'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-8.4, -9, -1.4, -17); ctx.lineTo(-2, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(60,40,16,0.26)'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.quadraticCurveTo(8.4, -9, 1.4, -17); ctx.lineTo(3, -4); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 26; i++) { const y = -r() * 15; taper(ctx, (r() - 0.5) * 12 * (1 + y / 20), y, (r() - 0.5) * 12 * (1 + y / 20) + 1.4, y - 2, 0.3, 0.2, `rgba(${r() < 0.5 ? '120,96,52' : '226,204,140'},0.5)`); }
  taper(ctx, 0, -5.4, 0, -5.4, 16, 16, 'rgba(0,0,0,0)');
  ctx.strokeStyle = 'rgb(112,88,52)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(0, -7.4, 6, 1.4, 0, 0, Math.PI); ctx.stroke();
}));

export const scarecrow = () => once('scare', () => paintSprite(22, 34, 11, 30, (ctx) => {
  dab(ctx, 0.6, 0.6, 5, 1.2, 0, 'rgba(16,12,6,0.3)');
  taper(ctx, 0, 0, 0, -22, 1.3, 1, 'rgb(96,72,48)'); taper(ctx, -8, -16, 8, -15, 1.1, 1.1, 'rgb(104,78,50)');
  ctx.fillStyle = 'rgb(128,98,74)'; ctx.beginPath(); ctx.moveTo(-3.6, -16); ctx.lineTo(3.6, -15.6); ctx.lineTo(3, -7.6); ctx.lineTo(-3, -8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0.8, -16, 2.8, 8);
  dab(ctx, 0, -21.6, 2.4, 2.4, 0, 'rgb(190,166,118)');
  ctx.fillStyle = 'rgb(86,66,44)'; ctx.beginPath(); ctx.ellipse(0, -23.4, 4.4, 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-2.2, -23.4); ctx.lineTo(0, -27); ctx.lineTo(2.2, -23.4); ctx.closePath(); ctx.fill();
}));

export const lantern = () => once('lantern', () => paintSprite(14, 36, 7, 32, (ctx) => {
  dab(ctx, 0.6, 0.5, 3.4, 1, 0, 'rgba(16,12,6,0.34)');
  taper(ctx, 0, 0, 0, -22, 1.5, 1.1, 'rgb(62,52,44)');
  ctx.fillStyle = 'rgb(54,46,40)'; ctx.fillRect(-2.8, -29, 5.6, 7.4);
  ctx.fillStyle = 'rgba(244,206,126,0.55)'; ctx.fillRect(-1.9, -27.8, 3.8, 5);
  ctx.fillStyle = 'rgb(48,42,38)'; ctx.beginPath(); ctx.moveTo(-3.8, -29); ctx.lineTo(0, -32.2); ctx.lineTo(3.8, -29); ctx.closePath(); ctx.fill();
}));

export const banner = (c1 = '#9a3c34') => once('banner' + c1, () => paintSprite(18, 44, 9, 40, (ctx) => {
  dab(ctx, 0.5, 0.5, 3, 0.9, 0, 'rgba(16,12,6,0.3)');
  taper(ctx, 0, 0, 0, -34, 1.3, 1, 'rgb(86,64,42)');
  ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0.6, -33); ctx.lineTo(8.6, -33); ctx.lineTo(8.6, -17); ctx.lineTo(4.6, -20.4); ctx.lineTo(0.6, -17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(240,210,150,0.55)'; ctx.fillRect(0.6, -33, 8, 1.2); dab(ctx, 4.6, -27, 1.8, 1.8, 0, 'rgba(240,210,150,0.8)');
  dab(ctx, 0, -34.6, 1.1, 1.1, 0, 'rgb(212,176,98)');
}));

// Bruddhull ved steinhoggeriet: en nedsenket, lys steinflate med trappetrinn. `k` (0–1) styrer størrelsen.
const pitCache = new Map();
export function quarryPit(k) {
  const key = Math.round(k * 8);
  let s = pitCache.get(key);
  if (s) return s;
  const kk = key / 8, rx = 12 + kk * 22, ry = 4.6 + kk * 8;
  s = paintSprite(Math.ceil(rx * 2 + 12), Math.ceil(ry * 2 + 16), Math.ceil(rx + 6), Math.ceil(ry + 8), (ctx) => {
    const r = mulberry(33 + key);
    dab(ctx, 0, 0, rx + 3, ry + 2, 0, 'rgba(70,56,38,0.5)');
    dab(ctx, 0, 0.6, rx, ry, 0, 'rgb(102,96,86)');
    dab(ctx, 0.8, 1.6, rx * 0.78, ry * 0.7, 0, 'rgb(86,80,72)');
    dab(ctx, 1.4, 2.2, rx * 0.5, ry * 0.46, 0, 'rgb(62,58,52)');
    for (let i = 0; i < 26 * (0.4 + kk); i++) { const a = r() * Math.PI * 2, d = 0.5 + r() * 0.5; dab(ctx, Math.cos(a) * rx * d, Math.sin(a) * ry * d, 1 + r() * 1.8, 0.6 + r() * 0.9, r(), rgba(jitter([150, 144, 130], r, 0.3), 0.7)); }
    ctx.strokeStyle = 'rgba(214,208,190,0.4)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(0, 0.2, rx - 0.6, ry - 0.3, 0, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
  });
  pitCache.set(key, s);
  return s;
}

// Fast utvalg av «bylivet»-rekvisitter per bolig/hus (deterministisk fra id).
const CITY_PROPS = [barrel, laundry, bench, cart, crate, () => woodPileSprite(7)];

// Gir [{s, x, y}] (relative til bygget). `info`: { rank, foodHarvests, ... }.
export function propsFor(b, info) {
  const rnd = mulberry(b.id * 53 + 11), out = [];
  const R = info.rank;
  const r = b.radius;
  const side = rnd() < 0.5 ? -1 : 1;
  if (b.type === 'sawmill') {
    const made = b.made || 0;
    out.push({ s: woodPileSprite(Math.min(24, 5 + Math.floor(made / 3))), x: -r * 1.05, y: r * 0.15 });
    out.push({ s: woodPileSprite(Math.min(16, 3 + Math.floor(made / 5))), x: -r * 0.55, y: r * 0.62 });
    out.push({ s: plankPileSprite(Math.min(14, 2 + Math.floor(made / 3))), x: r * 1.05, y: r * 0.36 });
  } else if (b.type === 'mason') {
    const made = b.made || 0;
    out.push({ s: blockPileSprite(Math.min(18, 3 + Math.floor(made / 2))), x: r * 1.0, y: r * 0.5 });
    out.push({ s: stonePileSprite(Math.min(26, 6 + made)), x: -r * 1.05, y: r * 0.3 });
    out.push({ s: quarryPit(Math.min(1, made / 28)), x: r * 1.55, y: -r * 0.35, ground: true });
  } else if (b.type === 'field') {
    const n = 1 + Math.min(2, Math.floor((info.foodHarvests || 0) / 10));
    for (let i = 0; i < n; i++) out.push({ s: haystack(), x: -r * 0.9 + i * 11, y: r * 0.62 });
    out.push({ s: scarecrow(), x: r * 0.45, y: r * 0.1 });
  } else if (b.type === 'hall') {
    out.push({ s: banner('#8a3a34'), x: -r * 0.55, y: r * 0.62 }, { s: banner('#3c5a78'), x: r * 0.55, y: r * 0.62 });
    out.push({ s: bench(), x: r * 1.15, y: r * 0.55 });
  } else if (b.type === 'market') {
    out.push({ s: barrel(), x: -r * 1.05, y: r * 0.28 }, { s: crate(), x: r * 1.1, y: r * 0.3 }, { s: cart(), x: r * 0.7, y: r * 0.72 });
  } else if (b.type === 'storage') {
    out.push({ s: barrel(), x: -r * 0.95, y: r * 0.5 }, { s: crate(), x: r * 0.95, y: r * 0.5 });
  } else if ((b.type === 'townhouse' || b.type === 'hut') && R >= 4) {
    const n = rnd() < 0.55 ? 2 : 1;
    for (let i = 0; i < n; i++) { const mk = CITY_PROPS[Math.floor(rnd() * CITY_PROPS.length)]; out.push({ s: mk(), x: side * (r * 0.9 + i * 10) * (i ? -0.8 : 1), y: r * (0.46 + i * 0.12) }); }
  } else if (b.type === 'shelter' && R >= 4) {
    // Det første lyet står fortsatt: to vimpler og en lykt markerer stedet der alt begynte.
    out.push({ s: banner('#a8843c'), x: -r * 1.05, y: r * 0.35 }, { s: banner('#a8843c'), x: r * 1.05, y: r * 0.35 }, { s: lantern(), x: r * 0.1, y: r * 0.95 });
  } else if ((b.type === 'shelter' || b.type === 'hut') && R <= 3) {
    if (b.type === 'shelter') out.push({ s: rack(), x: side * r * 1.2, y: r * 0.35 }, { s: log(), x: -side * r * 0.9, y: r * 0.6 });
    else if (rnd() < 0.6) out.push({ s: rnd() < 0.5 ? rack() : log(), x: side * r * 1.1, y: r * 0.5 });
  }
  return out;
}
