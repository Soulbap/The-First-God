// OPUS-11 · Boligenes senere trinn. Samme maletradisjon som city.js (lys fra øvre venstre, skrå dybdeakse,
// kontaktskygge, dempet palett). To silhuetter:
//   bygård (tier 4) = flere etasjer i tegl, puss eller stein — industribyens bolig (fra arbeiderboliger til flerfamiliehus)
//   moderne blokk (tier 5) = pusset, glass- eller teglblokk med vindusbånd og balkonger — elektrisitetens bolig
// OPUS-12: hvert hus tegnes etter en byggeplan (`b.arch`, src/sim/architecture.js): etasjer, akser (bredde), tak, fasade, inngang og balkonger.
// To bygårder ved siden av hverandre er ikke samme hus. Vindusposisjonene (i spritens ankerkoordinater) følger planen, slik at nattlyset treffer de malte vinduene.
import { mulberry, paintSprite, dab, taper, rgba, smooth } from './paint.js';
import { box, contact, groundPatch, stage, gableRoof } from './city.js';
import { archOf } from '../sim/architecture.js';

// ---------- Geometri ----------
const TEN = (a) => { const W = 12 * a.bays + 6; return { W, D: 22, floors: a.floors, fh: 13, x: -W / 2 - 4 }; };
const MOD = (a) => { const W = 10.5 * a.bays + 7; return { W, D: 24, floors: a.floors, fh: 12, x: -W / 2 - 3 }; };

export const tenementWindows = (a = archOf({ id: 1 }, 4)) => {
  const { x, floors, fh, W } = TEN(a), out = [], bw = (W - 6) / a.bays;
  for (let f = 1; f < floors; f++) for (let i = 0; i < a.bays; i++) out.push([x + 3 + i * bw + bw / 2 - 3, -(f + 1) * fh + 3, 6, 7]);
  return out;
};
export const modernWindows = (a = archOf({ id: 1 }, 5)) => {
  const { x, floors, fh, W } = MOD(a), out = [], n = a.bays + 1, bw = (W - 7) / n;
  for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) if (!(f === 0 && i === Math.floor(n / 2))) out.push([x + 3.5 + i * bw + 0.8, -(f + 1) * fh + 3.5, bw - 1.6, 6]);
  return out;
};

const BRICKS = [
  ['rgb(146,88,70)', 'rgb(104,62,50)'],
  ['rgb(132,82,66)', 'rgb(94,58,48)'],
  ['rgb(156,112,84)', 'rgb(112,80,60)'],
  ['rgb(118,96,84)', 'rgb(84,68,60)'],
];
const PLASTER = [
  ['rgb(214,196,150)', 'rgb(158,142,106)'],
  ['rgb(206,170,138)', 'rgb(150,120,96)'],
  ['rgb(190,192,176)', 'rgb(138,140,126)'],
  ['rgb(220,210,184)', 'rgb(164,154,130)'],
];
const STONE = [
  ['rgb(150,146,134)', 'rgb(108,104,96)'],
  ['rgb(160,150,128)', 'rgb(116,108,92)'],
  ['rgb(138,140,138)', 'rgb(98,100,98)'],
  ['rgb(152,138,122)', 'rgb(110,98,86)'],
];
const SLATE = ['rgb(86,92,98)', 'rgb(64,70,76)', 'rgb(122,130,138)'];
const TILE = ['rgb(126,72,56)', 'rgb(102,58,46)', 'rgb(160,96,76)'];
const MODERN = {
  concrete: [['rgb(184,174,154)', 'rgb(128,120,104)'], ['rgb(168,172,166)', 'rgb(118,122,118)'], ['rgb(190,186,176)', 'rgb(134,130,120)'], ['rgb(176,168,160)', 'rgb(124,118,112)']],
  glass: [['rgb(104,126,142)', 'rgb(72,90,104)'], ['rgb(96,120,126)', 'rgb(66,86,92)'], ['rgb(116,128,146)', 'rgb(80,90,106)'], ['rgb(108,132,134)', 'rgb(74,94,96)']],
  brick: BRICKS,
  panel: [['rgb(188,182,166)', 'rgb(130,126,112)'], ['rgb(176,180,176)', 'rgb(122,126,122)'], ['rgb(194,186,170)', 'rgb(136,128,114)'], ['rgb(182,178,170)', 'rgb(126,122,116)']],
};
const ACCENT = ['rgb(176,108,78)', 'rgb(82,126,128)', 'rgb(188,156,88)', 'rgb(112,122,146)'];

// ---------- Bygård (tier 4) ----------
export function paintTenement(seed, p, spec = null) {
  const a = spec || archOf({ id: seed }, 4);
  const g = TEN(a);
  return paintSprite(116, 128, 56, 108, (ctx) => {
    const rnd = mulberry(seed), vr = mulberry(seed * 13 + 5);
    const { W, D, floors, fh, x } = g, H = floors * fh;
    const col = (a.facade === 'plaster' ? PLASTER : a.facade === 'stone' ? STONE : BRICKS)[a.tone % 4];
    const chimLeft = vr() < 0.5, shop = vr() < 0.5 && a.entrance !== 'arch';
    groundPatch(ctx, rnd, W * 0.82, 11, p, [104, 100, 90]);
    contact(ctx, W, D, smooth(0.1, 0.4, p));
    const walls = stage(p, 0.1, 0.72), roof = stage(p, 0.7, 0.98);
    ctx.save();
    ctx.beginPath(); ctx.rect(-80, -H * walls - 52, 190, H * walls + 72); ctx.clip();
    box(ctx, rnd, x, 0, W, D, H, col[0], col[1], null, { courses: a.facade === 'plaster' ? 0 : floors * 4, mortar: a.facade === 'stone' ? 'rgba(40,36,30,0.4)' : 'rgba(48,36,28,0.34)' });
    // Sokkel i stein.
    ctx.fillStyle = 'rgb(122,116,104)'; ctx.fillRect(x, -fh * 0.9, W, fh * 0.9);
    for (let i = 0; i < Math.round(W / 7); i++) ctx.fillRect(x + i * (W / Math.round(W / 7)) + 0.3, -fh * 0.9, 0.5, fh * 0.9);
    if (a.facade === 'plaster') { // fuget bånd mellom etasjene i pussen
      for (let f = 1; f < floors; f++) { ctx.fillStyle = 'rgba(255,248,220,0.18)'; ctx.fillRect(x, -f * fh - 1.6, W, 3.2); }
    }
    for (let f = 1; f <= floors; f++) taper(ctx, x - 0.6, -f * fh, x + W + 0.6, -f * fh, 1.1, 1.1, 'rgb(190,178,152)');
    // Vinduer med sprosse og karm.
    for (const [wx, wy, ww, wh] of tenementWindows(a)) {
      ctx.fillStyle = 'rgb(40,36,34)'; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(150,172,180,0.45)'; ctx.fillRect(wx + 0.8, wy + 0.8, ww - 1.6, wh * 0.4);
      ctx.fillStyle = 'rgb(214,204,178)'; ctx.fillRect(wx + ww / 2 - 0.3, wy, 0.6, wh); ctx.fillRect(wx - 0.6, wy + wh, ww + 1.2, 0.9);
    }
    // Jernbalkonger i annen etasje.
    if (a.balcony === 'alt' && floors >= 3) for (const [wx, wy, ww] of tenementWindows(a).filter((_, i) => Math.floor(i / a.bays) === 0 && i % 2 === 0)) {
      taper(ctx, wx - 1.2, wy + 8.6, wx + ww + 1.2, wy + 8.6, 1, 1, 'rgb(46,44,42)');
      for (let k = 0; k < 5; k++) taper(ctx, wx - 0.8 + k * ((ww + 1.6) / 4), wy + 8.6, wx - 0.8 + k * ((ww + 1.6) / 4), wy + 11.6, 0.4, 0.4, 'rgb(46,44,42)');
    }
    // Første etasje: inngang etter planen, butikkvinduer (noen får markise).
    const doorX = a.entrance === 'side' ? x + 6 : x + W / 2 - 4;
    if (a.entrance === 'arch') { ctx.fillStyle = 'rgb(30,26,24)'; ctx.beginPath(); ctx.moveTo(x + W / 2 - 6, 0); ctx.lineTo(x + W / 2 - 6, -fh * 0.7); ctx.arc(x + W / 2, -fh * 0.7, 6, Math.PI, 0); ctx.lineTo(x + W / 2 + 6, 0); ctx.closePath(); ctx.fill(); }
    else { ctx.fillStyle = 'rgb(54,40,28)'; ctx.fillRect(doorX, -11, 8, 11); ctx.fillStyle = 'rgb(196,170,126)'; ctx.fillRect(doorX, -11.8, 8, 0.9); }
    const shopX = a.entrance === 'side' ? [x + 18, x + W - 14] : [x + 4, x + W - 14];
    for (const sx of shopX) if (sx + 10 < x + W && (a.entrance !== 'arch' || Math.abs(sx - (x + W / 2)) > 10)) { ctx.fillStyle = 'rgb(38,34,30)'; ctx.fillRect(sx, -9, 10, 6.5); ctx.fillStyle = 'rgba(236,196,120,0.3)'; ctx.fillRect(sx + 0.8, -8.2, 8.4, 2.4); }
    if (shop && p > 0.8) { ctx.fillStyle = '#9a4e42'; ctx.beginPath(); ctx.moveTo(shopX[0] - 1, -10.5); ctx.lineTo(shopX[0] + 11, -10.5); ctx.lineTo(shopX[0] + 12.5, -6.5); ctx.lineTo(shopX[0] - 2.5, -6.5); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.35, roof);
      if (a.roof === 'gable') {
        const rc = a.tone % 2 ? SLATE : TILE;
        gableRoof(ctx, rnd, x, -H, W, D, 15 * roof, 2, rc[0], rc[1], rc[2]);
        // Takark (to) med lite vindu.
        for (const dx of [0.28, 0.66]) { const cx = x + W * dx; ctx.fillStyle = col[0]; ctx.fillRect(cx - 4, -H - 9 * roof, 8, 8 * roof); ctx.fillStyle = rc[1]; ctx.beginPath(); ctx.moveTo(cx - 5.2, -H - 9 * roof); ctx.lineTo(cx, -H - 14 * roof); ctx.lineTo(cx + 5.2, -H - 9 * roof); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgb(36,32,30)'; ctx.fillRect(cx - 2, -H - 7.4 * roof, 4, 5 * roof); }
        for (const cx of chimLeft ? [x + 5, x + W * 0.55] : [x + W - 11, x + W * 0.4]) { ctx.fillStyle = 'rgb(108,76,62)'; ctx.fillRect(cx, -H - 22 * roof, 5, 12 * roof); ctx.fillStyle = 'rgb(140,134,122)'; ctx.fillRect(cx - 0.6, -H - 22 * roof, 6.2, 1.4); }
      } else if (a.roof === 'mansard') {
        box(ctx, rnd, x + 1, -H, W - 2, D - 3, 9 * roof, SLATE[0], SLATE[1], SLATE[2], { courses: 3, mortar: 'rgba(20,24,28,0.4)' });
        for (let i = 0; i < a.bays; i++) { const cx = x + 3 + i * ((W - 6) / a.bays) + ((W - 6) / a.bays) / 2; ctx.fillStyle = 'rgb(36,32,30)'; ctx.fillRect(cx - 2.5, -H - 6.6 * roof, 5, 5 * roof); ctx.fillStyle = 'rgb(188,176,150)'; ctx.fillRect(cx - 3.1, -H - 7.4 * roof, 6.2, 1); }
        for (const cx of chimLeft ? [x + 5] : [x + W - 11]) { ctx.fillStyle = 'rgb(108,76,62)'; ctx.fillRect(cx, -H - 20 * roof, 5, 12 * roof); }
      } else {
        // Lavt, flatt tak med brystning og to skorsteiner.
        box(ctx, rnd, x - 0.8, -H, W + 1.6, D + 0.8, 2.6, 'rgb(112,106,98)', 'rgb(82,78,72)', 'rgb(96,92,86)');
        for (const cx of chimLeft ? [x + 6, x + W * 0.5] : [x + W - 12, x + W * 0.45]) {
          ctx.fillStyle = 'rgb(108,76,62)'; ctx.fillRect(cx, -H - 16 * roof, 5, 14 * roof);
          ctx.fillStyle = 'rgb(84,58,48)'; ctx.fillRect(cx + 3.6, -H - 16 * roof, 1.4, 14 * roof);
          ctx.fillStyle = 'rgb(140,134,122)'; ctx.fillRect(cx - 0.6, -H - 16 * roof, 6.2, 1.4);
        }
      }
      ctx.restore();
    }
  });
}

// ---------- Moderne blokk (tier 5) ----------
export function paintModern(seed, p, spec = null) {
  const a = spec || archOf({ id: seed }, 5);
  const g = MOD(a);
  return paintSprite(124, 152, 58, 126, (ctx) => {
    const rnd = mulberry(seed), vr = mulberry(seed * 17 + 9);
    const { W, D, floors, fh, x } = g, H = floors * fh;
    const tone = MODERN[a.facade][a.tone % 4];
    groundPatch(ctx, rnd, W * 0.8, 11, p, [112, 110, 104]);
    contact(ctx, W, D, smooth(0.1, 0.4, p));
    const walls = stage(p, 0.1, 0.74), roof = stage(p, 0.72, 0.98);
    ctx.save();
    ctx.beginPath(); ctx.rect(-90, -H * walls - 58, 220, H * walls + 78); ctx.clip();
    box(ctx, rnd, x, 0, W, D, H, tone[0], tone[1], null, { courses: a.facade === 'brick' ? floors * 4 : 0, mortar: 'rgba(48,36,28,0.3)' });
    if (a.facade === 'panel') { // farget panelbånd mellom vindusaksene
      const n = a.bays + 1, bw = (W - 7) / n; ctx.fillStyle = ACCENT[a.tone % 4];
      for (let i = 1; i < n; i += 2) ctx.fillRect(x + 3.5 + i * bw - 0.4, -H, bw * 0.5, H - 11);
    }
    if (a.facade === 'glass') { ctx.fillStyle = 'rgba(190,214,226,0.14)'; for (let i = 0; i < 5; i++) ctx.fillRect(x + 3 + i * (W / 5), -H, W / 11, H); }
    // Vindusbånd med blågrått glass og lys karm.
    for (const [wx, wy, ww, wh] of modernWindows(a)) {
      ctx.fillStyle = a.facade === 'glass' ? 'rgb(40,56,70)' : 'rgb(48,58,68)'; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(176,200,214,0.38)'; ctx.fillRect(wx + 0.6, wy + 0.6, ww * 0.5, wh * 0.45);
      ctx.fillStyle = 'rgb(226,222,208)'; ctx.fillRect(wx - 0.5, wy + wh, ww + 1, 0.8);
    }
    // Balkonger etter planen: annenhver etasje eller alle.
    if (a.balcony !== 'none') for (let f = 1; f < floors; f += a.balcony === 'all' ? 1 : 2) {
      taper(ctx, x - 1.5, -f * fh, x + W + 1.5, -f * fh, 1.4, 1.4, 'rgb(170,166,154)');
      taper(ctx, x - 1.5, -f * fh - 2.6, x + W + 1.5, -f * fh - 2.6, 0.6, 0.6, 'rgb(96,100,98)');
    }
    // Inngang etter planen med skjermtak.
    const dx0 = a.entrance === 'side' ? x + 5 : a.entrance === 'arch' ? x + W / 2 - 7 : x + W / 2 - 5, dw = a.entrance === 'arch' ? 14 : 10;
    ctx.fillStyle = 'rgb(58,66,74)'; ctx.fillRect(dx0, -11, dw, 11);
    ctx.fillStyle = 'rgba(176,200,214,0.3)'; ctx.fillRect(dx0 + 1, -10, dw - 2, 4);
    ctx.fillStyle = 'rgb(120,126,122)'; ctx.fillRect(dx0 - 3, -12.6, dw + 6, 1.6);
    ctx.restore();
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.35, roof);
      if (a.roof === 'slant') {
        // Pulttak: stiger mot baksiden.
        box(ctx, rnd, x - 0.6, -H, W + 1.2, D + 0.6, 1.6, 'rgb(150,146,136)', 'rgb(112,108,100)', 'rgb(128,124,116)');
        ctx.fillStyle = 'rgb(96,104,112)'; ctx.beginPath(); ctx.moveTo(x, -H - 1.6); ctx.lineTo(x + W, -H - 1.6); ctx.lineTo(x + W, -H - 9 * roof); ctx.lineTo(x, -H - 3 * roof); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgb(70,78,86)'; ctx.beginPath(); ctx.moveTo(x + W, -H - 1.6); ctx.lineTo(x + W + D * 0.55, -H - 1.6 - D * 0.38); ctx.lineTo(x + W + D * 0.55, -H - 9 * roof - D * 0.38); ctx.lineTo(x + W, -H - 9 * roof); ctx.closePath(); ctx.fill();
      } else if (a.roof === 'terrace') {
        // Inntrukket toppetasje med glass og takterrasse.
        box(ctx, rnd, x - 0.6, -H, W + 1.2, D + 0.6, 1.6, 'rgb(150,146,136)', 'rgb(112,108,100)', 'rgb(128,124,116)');
        box(ctx, rnd, x + W * 0.18, -H - 1.6, W * 0.64, D * 0.6, 9 * roof, tone[0], tone[1], 'rgb(150,146,136)');
        ctx.fillStyle = 'rgb(48,58,68)'; ctx.fillRect(x + W * 0.24, -H - 8.4 * roof, W * 0.52, 4.6 * roof); ctx.fillStyle = 'rgba(176,200,214,0.35)'; ctx.fillRect(x + W * 0.25, -H - 8 * roof, W * 0.25, 2 * roof);
        taper(ctx, x, -H - 2, x + W * 0.18, -H - 2, 0.6, 0.6, 'rgb(96,100,98)');
      } else if (a.roof === 'loft') {
        box(ctx, rnd, x - 0.6, -H, W + 1.2, D + 0.6, 1.8, 'rgb(150,146,136)', 'rgb(112,108,100)', 'rgb(128,124,116)');
        box(ctx, rnd, x + 5, -H - 1.8, 13, 9, 8 * roof, 'rgb(170,166,154)', 'rgb(126,122,112)', 'rgb(144,140,130)');
        ctx.fillStyle = 'rgb(112,100,88)'; ctx.fillRect(x + W - 17, -H - 12 * roof, 8, 10 * roof); ctx.beginPath(); ctx.ellipse(x + W - 13, -H - 12 * roof, 4, 1.6, 0, 0, Math.PI * 2); ctx.fill(); // vanntank
        taper(ctx, x + W - 16, -H - 2, x + W - 16, -H - 12 * roof, 0.5, 0.5, 'rgb(70,70,72)'); taper(ctx, x + W - 10, -H - 2, x + W - 10, -H - 12 * roof, 0.5, 0.5, 'rgb(70,70,72)');
      } else {
        box(ctx, rnd, x - 0.6, -H, W + 1.2, D + 0.6, 1.8, 'rgb(150,146,136)', 'rgb(112,108,100)', 'rgb(128,124,116)');
        // Teknisk loft, antenne og en liten takterrasse.
        box(ctx, rnd, x + W - 16, -H - 1.8, 12, 8, 7, 'rgb(170,166,154)', 'rgb(126,122,112)', 'rgb(144,140,130)');
        taper(ctx, x + 8, -H - 1.8, x + 8, -H - 16 * roof, 0.7, 0.4, 'rgb(70,70,72)');
        taper(ctx, x + 5, -H - 11 * roof, x + 11, -H - 11 * roof, 0.5, 0.5, 'rgb(70,70,72)');
      }
      ctx.restore();
    }
  });
}
