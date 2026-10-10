// OPUS-11 · Boligenes senere trinn. Samme maletradisjon som city.js (lys fra øvre venstre, skrå dybdeakse,
// kontaktskygge, dempet palett). To nye silhuetter:
//   bygård (tier 4) = flere etasjer i tegl med gesims, sprosser og skorsteiner — industribyens bolig
//   moderne blokk (tier 5) = pusset blokk med vindusbånd, balkonger og flatt tak — elektrisitetens bolig
// Vindusposisjonene eksporteres (i spritens ankerkoordinater) slik at nattlyset treffer de malte vinduene.
import { mulberry, paintSprite, dab, taper, rgba, smooth } from './paint.js';
import { box, contact, groundPatch, stage } from './city.js';

const TEN = { W: 42, D: 22, floors: 4, fh: 13, x: -25 };
const MOD = { W: 46, D: 24, floors: 5, fh: 12, x: -27 };

export const tenementWindows = () => {
  const out = [];
  for (let f = 1; f < TEN.floors; f++) for (let i = 0; i < 3; i++) out.push([TEN.x + 5 + i * 12.5, -(f + 1) * TEN.fh + 3, 6, 7]);
  return out;
};
export const modernWindows = () => {
  const out = [];
  for (let f = 0; f < MOD.floors; f++) for (let i = 0; i < 4; i++) if (!(f === 0 && i === 1)) out.push([MOD.x + 4 + i * 10.5, -(f + 1) * MOD.fh + 3.5, 7.5, 6]);
  return out;
};

const BRICKS = [
  ['rgb(146,88,70)', 'rgb(104,62,50)'],
  ['rgb(132,82,66)', 'rgb(94,58,48)'],
  ['rgb(156,112,84)', 'rgb(112,80,60)'],
  ['rgb(118,96,84)', 'rgb(84,68,60)'],
];

export function paintTenement(seed, p) {
  return paintSprite(100, 122, 46, 102, (ctx) => {
    const rnd = mulberry(seed), vr = mulberry(seed * 13 + 5);
    const brick = BRICKS[Math.floor(vr() * BRICKS.length)], chimLeft = vr() < 0.5, shop = vr() < 0.5;
    const { W, D, floors, fh, x } = TEN;
    groundPatch(ctx, rnd, 36, 11, p, [104, 100, 90]);
    contact(ctx, W, D, smooth(0.1, 0.4, p));
    const walls = stage(p, 0.1, 0.72), roof = stage(p, 0.7, 0.98), H = floors * fh;
    ctx.save();
    ctx.beginPath(); ctx.rect(-70, -H * walls - 40, 170, H * walls + 60); ctx.clip();
    // Sokkel i stein og teglvegger med fuger.
    box(ctx, rnd, x, 0, W, D, H, brick[0], brick[1], null, { courses: floors * 4, mortar: 'rgba(48,36,28,0.34)' });
    ctx.fillStyle = 'rgb(122,116,104)'; ctx.fillRect(x, -fh * 0.9, W, fh * 0.9);
    for (let i = 0; i < 6; i++) ctx.fillRect(x + i * (W / 6) + 0.3, -fh * 0.9, 0.5, fh * 0.9);
    // Gesimser mellom etasjene.
    for (let f = 1; f <= floors; f++) taper(ctx, x - 0.6, -f * fh, x + W + 0.6, -f * fh, 1.1, 1.1, 'rgb(190,178,152)');
    // Vinduer med sprosse og karm, og dør i første etasje.
    for (const [wx, wy, ww, wh] of tenementWindows()) {
      ctx.fillStyle = 'rgb(40,36,34)'; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(150,172,180,0.45)'; ctx.fillRect(wx + 0.8, wy + 0.8, ww - 1.6, wh * 0.4);
      ctx.fillStyle = 'rgb(214,204,178)'; ctx.fillRect(wx + ww / 2 - 0.3, wy, 0.6, wh); ctx.fillRect(wx - 0.6, wy + wh, ww + 1.2, 0.9);
    }
    // Første etasje: dør og butikkvindu (noen får en markise).
    ctx.fillStyle = 'rgb(54,40,28)'; ctx.fillRect(x + W / 2 - 4, -11, 8, 11);
    ctx.fillStyle = 'rgb(196,170,126)'; ctx.fillRect(x + W / 2 - 4, -11.8, 8, 0.9);
    for (const sx of [x + 5, x + W - 15]) { ctx.fillStyle = 'rgb(38,34,30)'; ctx.fillRect(sx, -9, 10, 6.5); ctx.fillStyle = 'rgba(236,196,120,0.3)'; ctx.fillRect(sx + 0.8, -8.2, 8.4, 2.4); }
    if (shop && p > 0.8) { ctx.fillStyle = '#9a4e42'; ctx.beginPath(); ctx.moveTo(x + 3, -10.5); ctx.lineTo(x + 15, -10.5); ctx.lineTo(x + 16.5, -6.5); ctx.lineTo(x + 1.5, -6.5); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.35, roof);
      // Lavt, flatt tak med brystning, og to skorsteiner.
      box(ctx, rnd, x - 0.8, -H, W + 1.6, D + 0.8, 2.6, 'rgb(112,106,98)', 'rgb(82,78,72)', 'rgb(96,92,86)');
      for (const cx of chimLeft ? [x + 6, x + 22] : [x + W - 12, x + W - 28]) {
        ctx.fillStyle = 'rgb(108,76,62)'; ctx.fillRect(cx, -H - 16 * roof, 5, 14 * roof);
        ctx.fillStyle = 'rgb(84,58,48)'; ctx.fillRect(cx + 3.6, -H - 16 * roof, 1.4, 14 * roof);
        ctx.fillStyle = 'rgb(140,134,122)'; ctx.fillRect(cx - 0.6, -H - 16 * roof, 6.2, 1.4);
      }
      ctx.restore();
    }
  });
}

export function paintModern(seed, p) {
  return paintSprite(104, 124, 48, 104, (ctx) => {
    const rnd = mulberry(seed), vr = mulberry(seed * 17 + 9);
    const tone = vr() < 0.5 ? ['rgb(184,174,154)', 'rgb(128,120,104)'] : ['rgb(168,172,166)', 'rgb(118,122,118)'];
    const { W, D, floors, fh, x } = MOD;
    groundPatch(ctx, rnd, 38, 11, p, [112, 110, 104]);
    contact(ctx, W, D, smooth(0.1, 0.4, p));
    const walls = stage(p, 0.1, 0.74), roof = stage(p, 0.72, 0.98), H = floors * fh;
    ctx.save();
    ctx.beginPath(); ctx.rect(-72, -H * walls - 40, 176, H * walls + 60); ctx.clip();
    box(ctx, rnd, x, 0, W, D, H, tone[0], tone[1], null, { courses: 0 });
    // Vindusbånd med blågrått glass og lys karm; balkongplate under hvert andre bånd.
    for (const [wx, wy, ww, wh] of modernWindows()) {
      ctx.fillStyle = 'rgb(48,58,68)'; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(176,200,214,0.38)'; ctx.fillRect(wx + 0.6, wy + 0.6, ww * 0.5, wh * 0.45);
      ctx.fillStyle = 'rgb(226,222,208)'; ctx.fillRect(wx - 0.5, wy + wh, ww + 1, 0.8);
    }
    for (let f = 1; f < floors; f += 2) { taper(ctx, x - 1.5, -f * fh, x + W + 1.5, -f * fh, 1.4, 1.4, 'rgb(170,166,154)'); taper(ctx, x - 1.5, -f * fh - 2.6, x + W + 1.5, -f * fh - 2.6, 0.6, 0.6, 'rgb(96,100,98)'); }
    // Inngang med skjermtak og butikkfasade i første etasje.
    ctx.fillStyle = 'rgb(58,66,74)'; ctx.fillRect(x + W / 2 - 5, -11, 10, 11);
    ctx.fillStyle = 'rgba(176,200,214,0.3)'; ctx.fillRect(x + W / 2 - 4, -10, 8, 4);
    ctx.fillStyle = 'rgb(120,126,122)'; ctx.fillRect(x + W / 2 - 8, -12.6, 16, 1.6);
    ctx.restore();
    if (roof > 0) {
      ctx.save(); ctx.globalAlpha = smooth(0, 0.35, roof);
      box(ctx, rnd, x - 0.6, -H, W + 1.2, D + 0.6, 1.8, 'rgb(150,146,136)', 'rgb(112,108,100)', 'rgb(128,124,116)');
      // Teknisk loft, antenne og en liten takterrasse.
      box(ctx, rnd, x + W - 16, -H - 1.8, 12, 8, 7, 'rgb(170,166,154)', 'rgb(126,122,112)', 'rgb(144,140,130)');
      taper(ctx, x + 8, -H - 1.8, x + 8, -H - 16 * roof, 0.7, 0.4, 'rgb(70,70,72)');
      taper(ctx, x + 5, -H - 11 * roof, x + 11, -H - 11 * roof, 0.5, 0.5, 'rgb(70,70,72)');
      ctx.restore();
    }
  });
}
