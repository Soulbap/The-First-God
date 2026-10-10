// OPUS-02 · Dyrket mark. Rundt hver ferdig åker legger landet seg i striper: flere teiger med ulik form og retning,
// flere jo flere innhøstinger folket faktisk har gjort. Teigene males direkte i slitasjelaget (jord + furer + avling).
// Ren avledning av spilltilstanden: ingenting her påvirker regler, og alt er deterministisk fra bygg-id.
import { mulberry } from './paint.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// Teiger per åker: 2 til å begynne med, +1 for hver 12. innhøsting (maks 5).
export function farmPlots(state) {
  const harvests = state.civilization?.foodHarvests || 0;
  const pond = state.world.pond;
  const out = [];
  for (const f of state.buildings) {
    if (f.type !== 'field' || !f.complete) continue;
    const rnd = mulberry(f.id * 977 + 13);
    const n = 2 + Math.min(3, Math.floor(harvests / 12));
    const a0 = rnd() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      // Teigene sprer seg i en halvåpen ring rundt åkeren; hver får egen størrelse og vinkel.
      const a = a0 + (k / n) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
      const w = 34 + rnd() * 26, h = 20 + rnd() * 14, d = f.radius * 1.02 + w * 0.5 + 4 + rnd() * 10;
      const cx = f.x + Math.cos(a) * d * 1.25, cy = f.y + Math.sin(a) * d * 0.7;
      const ang = (rnd() - 0.5) * 0.5 + (rnd() < 0.5 ? 0 : Math.PI / 2 * 0.2);
      const rx = w * 0.5 + 4, ry = h * 0.5 + 4;
      if (((cx - pond.x) / (pond.rx + rx)) ** 2 + ((cy - pond.y) / (pond.ry + ry)) ** 2 < 1) continue;
      if (state.buildings.some((b) => b !== f && b.type !== 'field' && Math.hypot(b.x - cx, (b.y - cy) * 1.4) < b.radius * 0.95 + Math.max(rx, ry) * 0.9)) continue;
      if (out.some((q) => Math.hypot(q.cx - cx, q.cy - cy) < (q.w + w) * 0.42)) continue;
      out.push({ cx, cy, w, h, ang, id: f.id * 10 + k, tone: rnd(), dir: rnd() < 0.5 ? 0 : 1, fieldId: f.id });
    }
  }
  return out;
}

// Maler teigene inn i bildedata (RGBA, wear-lagets oppløsning). `unit` = verdensenheter per piksel.
// `crop` 0..1 følger innhøstingssyklusen (0 = nypløyd, 1 = moden).
export function paintFarm(px, imgW, imgH, unit, plots, crop) {
  for (const p of plots) {
    const ca = Math.cos(p.ang), sa = Math.sin(p.ang);
    const rx = p.w / 2, ry = p.h / 2, reach = Math.hypot(rx, ry) + 3;
    const x0 = Math.max(0, Math.floor((p.cx - reach) / unit)), x1 = Math.min(imgW - 1, Math.ceil((p.cx + reach) / unit));
    const y0 = Math.max(0, Math.floor((p.cy - reach) / unit)), y1 = Math.min(imgH - 1, Math.ceil((p.cy + reach) / unit));
    const grow = clamp(crop * 0.85 + p.tone * 0.2);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const wx = (x + 0.5) * unit - p.cx, wy = (y + 0.5) * unit - p.cy;
      const u = wx * ca + wy * sa, v = -wx * sa + wy * ca;
      // Avrundet rektangel med litt ujevn kant.
      const edge = 1 - clamp((Math.max(Math.abs(u) / rx, Math.abs(v) / ry) - 0.88) / 0.12);
      if (edge <= 0) continue;
      const along = p.dir ? v : u;
      const furrow = 0.5 + 0.5 * Math.sin(along * 1.25 + p.tone * 6);
      const o = (y * imgW + x) * 4;
      // Jord → grønn avling, med fure-skygge. Hver teig har sin egen valør.
      const soil = [104 + p.tone * 18, 82 + p.tone * 12, 56 + p.tone * 8];
      const leaf = [88 + p.tone * 24, 116 - p.tone * 10, 54];
      const k = grow * (0.35 + 0.65 * furrow);
      const sh = 0.82 + 0.28 * furrow;
      const r = (soil[0] + (leaf[0] - soil[0]) * k) * sh, g = (soil[1] + (leaf[1] - soil[1]) * k) * sh, b = (soil[2] + (leaf[2] - soil[2]) * k) * sh;
      const a = 232 * edge;
      const ex = px[o + 3] / 255, na = a / 255 + ex * (1 - a / 255);
      px[o] = (r * (a / 255) + px[o] * ex * (1 - a / 255)) / (na || 1);
      px[o + 1] = (g * (a / 255) + px[o + 1] * ex * (1 - a / 255)) / (na || 1);
      px[o + 2] = (b * (a / 255) + px[o + 2] * ex * (1 - a / 255)) / (na || 1);
      px[o + 3] = na * 255;
    }
  }
}
