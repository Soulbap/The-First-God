// Prosedyrale painterly-trær (bjørk og gran) i vekststadier.
// Vekst skjer ved at stammen forlenges fra toppen og nye greiner/kroner kommer til —
// ikke ved å skalere en ferdig sprite. Hver variant har egne proporsjoner, tetthet og fargetone.
import { mulberry, paintSprite, dab, taper, jitter, rgba, clamp } from './paint.js';

export const TREE_LEVELS = 12;
export const TREE_VARIANTS = 8;
export const levelGrowth = (k) => 0.04 + (k / (TREE_LEVELS - 1)) * 0.96;
// Simuleringens variant (0–3) utvides med id for flere silhuetter — uten å røre simuleringens tilfeldighet.
export const lookVariant = (n) => (n.variant + 4 * (n.id % 2)) % TREE_VARIANTS;

const SPRUCE = { dark: [22, 35, 29], mid: [36, 54, 40], light: [58, 78, 54], hi: [96, 108, 74] };
const BIRCH_PALS = [
  { dark: [48, 62, 34], mid: [84, 101, 47], light: [124, 136, 64], hi: [172, 170, 100] },
  { dark: [40, 58, 36], mid: [68, 90, 44], light: [104, 124, 58], hi: [150, 160, 90] },
  { dark: [50, 64, 34], mid: [88, 104, 46], light: [128, 138, 60], hi: [176, 176, 96] },
];
const FRESH = [100, 132, 66];

const tint = (c, k, g) => [c[0] * k * (1 - g), c[1] * k * (1 + g * 0.6), c[2] * k];
const youthMix = (c, y) => [c[0] + (FRESH[0] - c[0]) * y, c[1] + (FRESH[1] - c[1]) * y, c[2] + (FRESH[2] - c[2]) * y];

// ---------- Bjørk ----------
function birchParams(variant) {
  const r = mulberry(variant * 3571 + 29);
  return { pal: BIRCH_PALS[variant % 3], dens: 0.95 + r() * 0.3, lean: (r() - 0.5) * 2, spread: 0.85 + r() * 0.35, tint: 0.92 + r() * 0.16, droop: 0.12 + r() * 0.2, gapCrown: r() < 0.5 };
}

function paintClump(ctx, rnd, cx, cy, R, P, density, ang, young) {
  const pal = { dark: youthMix(P.pal.dark, young * 0.4), mid: youthMix(P.pal.mid, young * 0.5), light: youthMix(P.pal.light, young * 0.4), hi: P.pal.hi };
  const n = Math.max(6, Math.round(R * R * 0.78 * density * P.dens));
  // Kronen strekker seg langs grenen og henger litt — ikke en kule.
  const o = Math.atan2(Math.sin(ang) * 0.35, Math.cos(ang));
  const co = Math.cos(o), so = Math.sin(o);
  const layer = (count, rad, ox, oy, col, sMin, sMax, alpha) => {
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * rad;
      const lx = Math.cos(a) * d * 1.3, ly = Math.sin(a) * d * 0.58;
      const x = cx + ox + lx * co - ly * so, y = cy + oy + lx * so + ly * co + d * P.droop * (ly > 0 ? 1 : 0.4);
      const s = sMin + rnd() * (sMax - sMin);
      dab(ctx, x, y, s, s * (0.5 + rnd() * 0.3), rnd() * Math.PI, rgba(jitter(tint(col, P.tint, 0), rnd, 0.24), alpha));
    }
  };
  layer(n * 0.5, R, R * 0.1, R * 0.16, pal.dark, 1.2, 2.3, 0.9);
  layer(n * 0.48, R * 0.86, -R * 0.05, -R * 0.06, pal.mid, 1.1, 2.1, 0.85);
  layer(n * 0.3, R * 0.62, -R * 0.26, -R * 0.28, pal.light, 0.9, 1.8, 0.85);
  layer(n * 0.08, R * 0.4, -R * 0.4, -R * 0.42, pal.hi, 0.7, 1.4, 0.8);
  // Hengende bladstrenger og løse blader rundt kanten gir en luftig, uregelmessig silhuett.
  for (let i = 0; i < n * 0.14; i++) {
    const a = rnd() * Math.PI * 2, d = R * (0.8 + rnd() * 0.45);
    const x = cx + Math.cos(a) * d * 1.15, y = cy + Math.abs(Math.sin(a)) * d * 0.5 + R * 0.2;
    dab(ctx, x, y, 0.5 + rnd() * 0.7, 0.9 + rnd() * 1.1, (rnd() - 0.5) * 0.4, rgba(jitter(tint(pal.mid, P.tint, 0), rnd, 0.25), 0.85));
  }
}

const birchSkeletons = new Map();
function birchSkeleton(variant) {
  if (birchSkeletons.has(variant)) return birchSkeletons.get(variant);
  const P = birchParams(variant);
  const r = mulberry(1000 + variant * 7919);
  const lens = [18, 16, 15, 13, 11, 9];
  const trunk = [];
  let ang = -Math.PI / 2 + (r() - 0.5) * 0.18, cum = 0;
  for (const len of lens) { ang += (r() - 0.5) * 0.22; trunk.push({ ang, len, cum }); cum += len; }
  const branches = [];
  let side = r() < 0.5 ? -1 : 1;
  for (let i = 1; i < trunk.length; i++) {
    const count = i < 2 ? 1 : r() < 0.3 ? 1 : 2;
    for (let j = 0; j < count; j++) {
      side = -side;
      const at = 0.2 + r() * 0.7;
      const asym = 1 + side * P.lean * 0.3;
      const len = (20 + r() * 14) * (1 - i * 0.09) * asym * P.spread;
      branches.push({
        ti: i, at, side, ang: trunk[i].ang + side * (0.5 + r() * 0.6), len,
        born: trunk[i].cum + at * trunk[i].len, clump: (6 + r() * 5) * (0.9 + 0.15 * asym),
        subs: [0, 1].map((q) => ({ at: 0.45 + r() * 0.45, dang: (q ? 1 : -1) * (0.3 + r() * 0.4) + side * 0.25, k: 0.4 + r() * 0.3, clump: 5 + r() * 5, skip: r() < 0.28 })),
      });
    }
  }
  const sk = { trunk, branches, total: cum, P };
  birchSkeletons.set(variant, sk);
  return sk;
}

function paintBirch(variant, g) {
  const sk = birchSkeleton(variant), P = sk.P;
  const W = 50 + 140 * g, Hh = 30 + 108 * g;
  const young = Math.pow(1 - g, 1.5);
  return paintSprite(W, Hh, W / 2, Hh - 5, (ctx) => {
    const rnd = mulberry(variant * 131 + Math.round(g * 1000));
    const T = 5 + 77 * g;
    const baseW = 0.9 + 4.4 * g;
    const widthAt = (s) => Math.max(0.35, baseW * (1 - 0.8 * s / Math.max(T, 1)));
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
    for (const br of sk.branches) {
      const sb = clamp((T - br.born) / 26);
      if (sb <= 0) continue;
      const o = along(br.ti, br.at);
      if (!o) continue;
      const L = br.len * sb * (0.6 + 0.4 * g);
      const e = { x: o.x + Math.cos(br.ang) * L, y: o.y + Math.sin(br.ang) * L };
      const bw = Math.max(0.35, baseW * 0.34 * (1 - br.born / 95)) * (0.5 + 0.5 * sb);
      taper(ctx, o.x, o.y, e.x, e.y, bw, bw * 0.4, 'rgb(92,82,70)');
      taper(ctx, o.x, o.y - bw * 0.2, e.x, e.y - bw * 0.2, bw * 0.3, bw * 0.15, 'rgba(176,168,150,0.5)');
      const gcl = (0.55 + 0.45 * g);
      clumps.push({ x: e.x, y: e.y, R: br.clump * 1.0 * (0.45 + 0.55 * sb) * gcl, ang: br.ang });
      if (sb > 0.5) clumps.push({ x: o.x + (e.x - o.x) * 0.62, y: o.y + (e.y - o.y) * 0.62 - 1.5, R: br.clump * 0.7 * sb * gcl, ang: br.ang });
      for (const sub of br.subs) {
        const ss = clamp((sb - 0.35) / 0.65);
        if (ss <= 0) continue;
        const so = { x: o.x + (e.x - o.x) * sub.at, y: o.y + (e.y - o.y) * sub.at };
        const sl = br.len * sub.k * ss;
        const sa = br.ang + sub.dang;
        const se = { x: so.x + Math.cos(sa) * sl, y: so.y + Math.sin(sa) * sl };
        taper(ctx, so.x, so.y, se.x, se.y, bw * 0.5, 0.25, 'rgb(82,72,62)');
        if (!sub.skip) clumps.push({ x: se.x, y: se.y + 1.5, R: sub.clump * (0.4 + 0.6 * ss) * gcl, ang: sa });
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
      for (let d = 1.5; d < len; d += 1.4 + rnd() * 2.4) {
        const t = d / len, w = w0 + (w1 - w0) * t;
        dab(ctx, a.x + (b.x - a.x) * t + (rnd() - 0.5) * w * 0.4, a.y + (b.y - a.y) * t, w * (0.18 + rnd() * 0.3), 0.22 + rnd() * 0.22, 0, 'rgba(38,34,30,0.85)');
      }
    }
    if (g > 0.35) {
      // Gammel bjørk har mørk, sprukken rot.
      for (let i = 0; i < 44 * g; i++) {
        const y = -rnd() * 8 * g, w = widthAt(0);
        dab(ctx, (rnd() - 0.5) * w * 1.1, y, 0.3 + rnd() * 0.6, 0.6 + rnd() * 1.2, 0, 'rgba(46,40,34,0.7)');
      }
      dab(ctx, 0, 0.3, baseW * 0.85, 0.9, 0, 'rgba(40,32,24,0.5)');
    }
    const top = pts[pts.length - 1];
    clumps.push({ x: top.x, y: top.y + 1, R: 3 + 8 * g, ang: -Math.PI / 2 });
    clumps.sort((a, b) => a.y - b.y);
    for (const c of clumps) paintClump(ctx, rnd, c.x, c.y, c.R, P, 0.8, c.ang, young);
  });
}

// ---------- Gran ----------
function spruceParams(variant) {
  const r = mulberry(variant * 911 + 17);
  return {
    wMul: 0.74 + r() * 0.56, pe: 0.8 + r() * 0.5, tierMul: 0.8 + r() * 0.4, bare: 0.02 + r() * 0.16, droop: 0.2 + r() * 0.4,
    bend: (r() - 0.5) * 0.12, tint: 0.88 + r() * 0.26, hueG: (r() - 0.5) * 0.12, dens: 0.8 + r() * 0.4, gap: 0.04 + r() * 0.12, sparseTop: r() < 0.4,
  };
}

function paintSpruce(variant, g) {
  const P = spruceParams(variant);
  const Ht = 8 + 112 * g;
  const W = 28 + 104 * g, Hh = 18 + 118 * g;
  const young = Math.pow(1 - g, 1.6);
  return paintSprite(W, Hh, W / 2, Hh - 5, (ctx) => {
    const rnd = mulberry(variant * 977 + Math.round(g * 1000));
    const col = (c, k = 1) => youthMix(tint(c, P.tint * k, P.hueG), young * 0.45);
    const pal = { dark: col(SPRUCE.dark), mid: col(SPRUCE.mid), light: col(SPRUCE.light), hi: col(SPRUCE.hi) };
    const tw = 0.6 + 3.1 * g;
    const bx = (y) => P.bend * Math.pow(-y / Math.max(Ht, 1), 2) * Ht * 0.25;
    // Stammen følger en svak kurve og synes i åpninger mellom grenkransene.
    let px = 0, py = 0;
    for (let s = 1; s <= 8; s++) {
      const y = -(Ht * s) / 8, x = bx(y), w0 = tw * (1 - (s - 1) / 8.4) + 0.25, w1 = tw * (1 - s / 8.4) + 0.25;
      taper(ctx, px, py, x, y, w0, w1, 'rgb(84,60,44)');
      taper(ctx, px + w0 * 0.25, py, x + w1 * 0.25, y, w0 * 0.42, w1 * 0.4, 'rgba(44,32,24,0.65)');
      px = x; py = y;
    }
    if (g > 0.3) dab(ctx, 0, 0.3, tw * 0.9, 0.8, 0, 'rgba(40,28,20,0.5)');
    const n = Math.max(3, Math.round((3 + 13 * g) * P.tierMul));
    const h0 = Ht * (P.bare * (1 - 0.5 * g) + 0.03);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const tr = mulberry(variant * 100 + i * 13 + 7);
      const y = -(h0 + t * (Ht * 0.97 - h0)) * (0.97 + tr() * 0.06);
      const dead = g > 0.55 && t < 0.35 && tr() < P.gap * 1.4;
      const baseWd = (Math.pow(1 - t, P.pe) * Ht * 0.3 * P.wMul * (0.72 + 0.28 * g) + 1.4);
      const trunkX = bx(y);
      for (const side of [-1, 1]) {
        const width = baseWd * (0.74 + tr() * 0.5) * (dead ? 0.35 : 1);
        const tilt = (tr() - 0.5) * 0.18;
        const lit = side < 0 ? 1 : 0.55;
        const thick = 2.0 + width * 0.2;
        const count = Math.round((6 + width * 6) * P.dens * (dead ? 0.3 : 1));
        const arc = (u) => ({ x: trunkX + side * width * u, y: y + tilt * width * u + width * (P.droop * 0.7 * u * u - 0.08 * u) });
        if (dead) {
          const e = arc(1);
          taper(ctx, trunkX, y, e.x, e.y, 0.9, 0.35, 'rgb(96,74,56)');
        }
        for (let k = 0; k < count; k++) {
          const u = Math.sqrt(rnd());
          const p = arc(u);
          const hang = rnd() * thick * (1.1 - u * 0.5);
          dab(ctx, p.x + (rnd() - 0.5) * 2, p.y + hang, 1.4 + rnd() * 1.6, 0.6 + rnd() * 0.5, side * (0.35 + u * 0.5), rgba(jitter(pal.dark, rnd, 0.25), 0.92));
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
        // Hengende grenspisser og enkelte løse kvister ytterst gir en ujevn, spiss silhuett.
        if (!dead) {
          const tip = arc(1);
          for (let k = 0; k < 3 + width * 0.12; k++) {
            const u = 0.78 + rnd() * 0.25, p = arc(u);
            ctx.strokeStyle = rgba(jitter(rnd() < 0.5 ? pal.dark : pal.mid, rnd, 0.2), 0.9);
            ctx.lineWidth = 0.35;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y + thick * 0.4);
            ctx.lineTo(p.x + side * (0.5 + rnd() * 1.4), p.y + thick * (0.7 + rnd() * 0.6));
            ctx.stroke();
          }
          dab(ctx, tip.x, tip.y + thick * 0.7, 1.0 + rnd(), 0.5, side * 0.9, rgba(pal.dark, 0.9));
        }
      }
    }
    // Topp: glissen eller tett leder.
    const topN = P.sparseTop ? 5 : 10;
    for (let k = 0; k < topN; k++) dab(ctx, bx(-Ht) + (rnd() - 0.5) * 1.4, -Ht + rnd() * 6, 0.9, 0.5, Math.PI / 2, rgba(jitter(pal.mid, rnd, 0.2), 0.9));
    taper(ctx, bx(-Ht * 0.97), -Ht * 0.97, bx(-Ht - 1.5), -Ht - 1.5, 0.6, 0.2, rgba(pal.light, 1));
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
