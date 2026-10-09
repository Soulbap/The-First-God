// Prosedyrale painterly-trær (bjørk og gran) i vekststadier.
// Vekst skjer ved at stammen forlenges fra toppen og nye greiner/kroner kommer til —
// ikke ved å skalere en ferdig sprite.
import { mulberry, paintSprite, dab, taper, jitter, rgba, clamp } from './paint.js';

export const TREE_LEVELS = 12;
export const levelGrowth = (k) => 0.04 + (k / (TREE_LEVELS - 1)) * 0.96;

const PAL = {
  birch: { dark: [50, 63, 34], mid: [84, 101, 47], light: [124, 136, 64], hi: [172, 170, 100] },
  spruce: { dark: [24, 37, 30], mid: [37, 54, 40], light: [58, 77, 53], hi: [92, 104, 72] },
};

function paintClump(ctx, rnd, cx, cy, R, pal, density = 1) {
  const n = Math.max(6, Math.round(R * R * 0.85 * density));
  const layer = (count, rad, ox, oy, col, sMin, sMax, alpha) => {
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * rad;
      const s = sMin + rnd() * (sMax - sMin);
      dab(ctx, cx + ox + Math.cos(a) * d, cy + oy + Math.sin(a) * d * 0.88, s, s * (0.5 + rnd() * 0.3), rnd() * Math.PI, rgba(jitter(col, rnd, 0.22), alpha));
    }
  };
  layer(n * 0.55, R, R * 0.12, R * 0.18, pal.dark, 1.3, 2.5, 0.9);
  layer(n * 0.5, R * 0.86, -R * 0.05, -R * 0.06, pal.mid, 1.2, 2.3, 0.85);
  layer(n * 0.32, R * 0.62, -R * 0.28, -R * 0.3, pal.light, 1.0, 2.0, 0.85);
  layer(n * 0.09, R * 0.38, -R * 0.42, -R * 0.46, pal.hi, 0.8, 1.5, 0.8);
}

// ---------- Bjørk ----------
const birchSkeletons = new Map();
function birchSkeleton(variant) {
  if (birchSkeletons.has(variant)) return birchSkeletons.get(variant);
  const r = mulberry(1000 + variant * 7919);
  const lens = [18, 16, 15, 13, 11, 9];
  const trunk = [];
  let ang = -Math.PI / 2 + (r() - 0.5) * 0.12, cum = 0;
  for (const len of lens) { ang += (r() - 0.5) * 0.16; trunk.push({ ang, len, cum }); cum += len; }
  const branches = [];
  let side = r() < 0.5 ? -1 : 1;
  for (let i = 1; i < trunk.length; i++) {
    const count = i < 2 ? 1 : 2;
    for (let j = 0; j < count; j++) {
      side = -side;
      const at = 0.25 + r() * 0.65;
      const len = (22 + r() * 11) * (1 - i * 0.09);
      branches.push({
        ti: i, at, side, ang: trunk[i].ang + side * (0.6 + r() * 0.5), len,
        born: trunk[i].cum + at * trunk[i].len, clump: 8 + r() * 5,
        subs: [0, 1].map((q) => ({ at: 0.5 + r() * 0.4, dang: (q ? 1 : -1) * (0.3 + r() * 0.35) + side * 0.25, k: 0.5 + r() * 0.25, clump: 7 + r() * 5 })),
      });
    }
  }
  const sk = { trunk, branches, total: cum };
  birchSkeletons.set(variant, sk);
  return sk;
}

function paintBirch(variant, g) {
  const sk = birchSkeleton(variant);
  const W = 36 + 124 * g, Hh = 30 + 104 * g;
  return paintSprite(W, Hh, W / 2, Hh - 5, (ctx) => {
    const rnd = mulberry(variant * 131 + Math.round(g * 1000));
    const T = 5 + 77 * g;
    const baseW = 1.0 + 5.2 * g;
    const widthAt = (s) => Math.max(0.35, baseW * (1 - 0.82 * s / Math.max(T, 1)));
    const pts = [{ x: 0, y: 0, s: 0 }];
    for (const seg of sk.trunk) {
      const vis = clamp(T - seg.cum, 0, seg.len);
      if (vis <= 0) break;
      const p = pts[pts.length - 1];
      pts.push({ x: p.x + Math.cos(seg.ang) * vis, y: p.y + Math.sin(seg.ang) * vis, s: seg.cum + vis });
    }
    const along = (ti, at) => {
      const a = pts[ti], b = pts[ti + 1];
      if (!a || !b) return null;
      return { x: a.x + (b.x - a.x) * at, y: a.y + (b.y - a.y) * at };
    };
    const clumps = [];
    // Greiner (tegnes før kronen).
    for (const br of sk.branches) {
      const sb = clamp((T - br.born) / 26);
      if (sb <= 0) continue;
      const o = along(br.ti, br.at);
      if (!o) continue;
      const L = br.len * sb * (0.6 + 0.4 * g);
      const e = { x: o.x + Math.cos(br.ang) * L, y: o.y + Math.sin(br.ang) * L };
      const bw = Math.max(0.3, baseW * 0.3 * (1 - br.born / 95)) * (0.5 + 0.5 * sb);
      taper(ctx, o.x, o.y, e.x, e.y, bw, bw * 0.4, 'rgb(96,86,74)');
      clumps.push({ x: e.x, y: e.y, R: br.clump * 1.05 * (0.45 + 0.55 * sb) * (0.6 + 0.4 * g) });
      if (sb > 0.5) clumps.push({ x: o.x + (e.x - o.x) * 0.6, y: o.y + (e.y - o.y) * 0.6 - 2, R: br.clump * 0.85 * sb * (0.6 + 0.4 * g) });
      for (const sub of br.subs) {
        const ss = clamp((sb - 0.35) / 0.65);
        if (ss <= 0) continue;
        const so = { x: o.x + (e.x - o.x) * sub.at, y: o.y + (e.y - o.y) * sub.at };
        const sl = br.len * sub.k * ss;
        const sa = br.ang + sub.dang;
        const se = { x: so.x + Math.cos(sa) * sl, y: so.y + Math.sin(sa) * sl };
        taper(ctx, so.x, so.y, se.x, se.y, bw * 0.5, 0.25, 'rgb(84,74,64)');
        clumps.push({ x: se.x, y: se.y + 2, R: sub.clump * 1.2 * (0.4 + 0.6 * ss) * (0.6 + 0.4 * g) });
      }
    }
    // Stamme: hvit bjørkebark med skyggeside og mørke barkmerker.
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const w0 = widthAt(a.s), w1 = widthAt(b.s);
      taper(ctx, a.x, a.y, b.x, b.y, w0, w1, 'rgb(214,208,195)');
      taper(ctx, a.x + w0 * 0.22, a.y, b.x + w1 * 0.22, b.y, w0 * 0.5, w1 * 0.5, 'rgba(128,122,112,0.75)');
      taper(ctx, a.x - w0 * 0.25, a.y, b.x - w1 * 0.25, b.y, w0 * 0.22, w1 * 0.22, 'rgba(240,236,224,0.6)');
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 1.5; d < len; d += 1.6 + rnd() * 2.2) {
        const t = d / len, w = w0 + (w1 - w0) * t;
        dab(ctx, a.x + (b.x - a.x) * t + (rnd() - 0.5) * w * 0.4, a.y + (b.y - a.y) * t, w * (0.18 + rnd() * 0.25), 0.25 + rnd() * 0.2, 0, 'rgba(38,34,30,0.85)');
      }
    }
    if (g > 0.4) {
      // Gammel bjørk har mørk, sprukken rot.
      for (let i = 0; i < 40 * g; i++) {
        const y = -rnd() * 7 * g, w = widthAt(0);
        dab(ctx, (rnd() - 0.5) * w, y, 0.3 + rnd() * 0.6, 0.6 + rnd() * 1, 0, 'rgba(46,40,34,0.7)');
      }
    }
    const top = pts[pts.length - 1];
    clumps.push({ x: top.x, y: top.y + 1, R: 3 + 9 * g });
    clumps.sort((a, b) => a.y - b.y);
    for (const c of clumps) paintClump(ctx, rnd, c.x, c.y, c.R, PAL.birch, 0.75);
  });
}

// ---------- Gran ----------
function paintSpruce(variant, g) {
  const Ht = 8 + 112 * g;
  const W = 22 + 82 * g, Hh = 18 + 118 * g;
  return paintSprite(W, Hh, W / 2, Hh - 5, (ctx) => {
    const rnd = mulberry(variant * 977 + Math.round(g * 1000));
    const pal = PAL.spruce;
    const tw = 0.6 + 3.2 * g;
    taper(ctx, 0, 0, 0, -Ht, tw, 0.3, 'rgb(86,62,46)');
    taper(ctx, tw * 0.25, 0, tw * 0.1, -Ht * 0.9, tw * 0.45, 0.2, 'rgba(48,34,26,0.7)');
    const n = 3 + Math.round(13 * g);
    const h0 = Ht * (0.05 + 0.1 * (1 - g));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const tr = mulberry(variant * 100 + i * 13 + 7);
      const y = -(h0 + t * (Ht * 0.97 - h0));
      const width = (Math.pow(1 - t, 0.9) * Ht * 0.3 + 1.4) * (0.85 + tr() * 0.3);
      for (const side of [-1, 1]) {
        const lit = side < 0 ? 1 : 0.55;
        const thick = 2.2 + width * 0.22;
        const count = Math.round(6 + width * 6);
        const arc = (u) => ({ x: side * width * u, y: y + width * (0.3 * u * u - 0.08 * u) });
        for (let k = 0; k < count; k++) {
          const u = Math.sqrt(rnd());
          const p = arc(u);
          const hang = rnd() * thick * (1.1 - u * 0.5);
          dab(ctx, p.x + (rnd() - 0.5) * 2, p.y + hang, 1.4 + rnd() * 1.4, 0.6 + rnd() * 0.5, side * (0.35 + u * 0.5), rgba(jitter(pal.dark, rnd, 0.25), 0.92));
        }
        for (let k = 0; k < count * 0.7; k++) {
          const u = Math.sqrt(rnd()) * 0.95;
          const p = arc(u);
          dab(ctx, p.x + (rnd() - 0.5) * 1.6, p.y + rnd() * thick * 0.5, 1.2 + rnd() * 1.2, 0.5 + rnd() * 0.4, side * (0.3 + u * 0.5), rgba(jitter(pal.mid, rnd, 0.25), 0.9));
        }
        for (let k = 0; k < count * 0.45 * lit; k++) {
          const u = 0.15 + rnd() * 0.8;
          const p = arc(u);
          dab(ctx, p.x + (rnd() - 0.5) * 1.4, p.y - rnd() * 0.8, 1.0 + rnd() * 1.0, 0.45 + rnd() * 0.3, side * (0.3 + u * 0.4), rgba(jitter(rnd() < 0.3 ? pal.hi : pal.light, rnd, 0.2), 0.85));
        }
      }
    }
    // Toppskudd.
    for (let k = 0; k < 10; k++) dab(ctx, (rnd() - 0.5) * 1.4, -Ht + rnd() * 6, 0.9, 0.5, Math.PI / 2, rgba(jitter(pal.mid, rnd, 0.2), 0.9));
  });
}

const cache = new Map();
export function treeSprite(species, variant, k) {
  const key = species + variant + ':' + k;
  let s = cache.get(key);
  if (!s) {
    s = species === 'spruce' ? paintSpruce(variant, levelGrowth(k)) : paintBirch(variant, levelGrowth(k));
    cache.set(key, s);
  }
  return s;
}

// Gir to nabostadier og blandefaktor for jevn overgang mellom vekststadier.
export function growthLevels(g) {
  const p = clamp((g - 0.04) / 0.96) * (TREE_LEVELS - 1);
  const k = Math.min(TREE_LEVELS - 2, Math.floor(p));
  return { k, f: p - k };
}

export function treeHeight(species, g) {
  return species === 'spruce' ? 8 + 112 * g : 12 + 88 * g;
}
