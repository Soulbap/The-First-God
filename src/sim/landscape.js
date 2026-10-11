// OPUS-11 · Landskap. Deterministisk, biomstyrt generering av vann, soner (skog, steinrike høyder, enger) og
// de naturlige objektene i dem. Samme frø og biom gir samme landskap hver gang et sted besøkes, lagres eller
// simuleres utenfor skjermen. Ren simulering: ingen tegning her. Renderen leser `world.waters` og `world.zones`.
//
// Skillet mellom synlig natur og økonomi: «rock»-noder er høstbare (med begrenset, fornybar stein), og de fleste
// steinene ligger i grupper (utspring) i steinrike soner. Småstein og dekor er ren presentasjon (render/decor.js).
import { BALANCE as B } from '../data/balance.js';
import { rand, range } from '../core/rng.js';

// Hvert biom har sin identitet. `groves`: antall lunder; `grove`: [min, maks] trær per lund; `outcrops`: steinutspring;
// `meadows`: åpne enger uten trær; `lake`/`stream`: sannsynlighet for en ekstra innsjø / en bekk.
export const PROFILES = {
  skog: { groves: 24, grove: [9, 16], singles: 14, outcrops: 3, meadows: 2, lake: 0.4, stream: 0.75, spruce: 0.58 },
  fjell: { groves: 4, grove: [4, 8], singles: 5, outcrops: 8, meadows: 1, lake: 0.3, stream: 0.5, spruce: 0.85 },
  slette: { groves: 3, grove: [4, 8], singles: 10, outcrops: 2, meadows: 4, lake: 0.5, stream: 0.5, spruce: 0.25 },
  kyst: { groves: 6, grove: [5, 10], singles: 8, outcrops: 4, meadows: 2, lake: 0.1, stream: 0.4, spruce: 0.4 },
  dal: { groves: 14, grove: [6, 12], singles: 8, outcrops: 4, meadows: 2, lake: 0.2, stream: 1, spruce: 0.5 },
};

const ell = (x, y, ax, ay, bx, by) => ((x - ax) / bx) ** 2 + ((y - ay) / by) ** 2;

// Vann: hovedtjernet, innsjøer (ellipser i `world.waters`) og bekker (linjer i `world.streams`, med halv bredde `w`).
export const watersOf = (state) => (state.world.waters ? [state.world.pond, ...state.world.waters] : [state.world.pond]);

const segDist2 = (x, y, a, b) => {
  const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy;
  const t = l2 ? Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / l2)) : 0;
  const px = a.x + vx * t - x, py = a.y + vy * t - y;
  return px * px + py * py;
};

export function inAnyWater(state, x, y, margin = 0) {
  for (const w of watersOf(state)) {
    const dx = (x - w.x) / (w.rx + margin), dy = (y - w.y) / (w.ry + margin);
    if (dx * dx + dy * dy < 1) return true;
  }
  for (const s of state.world.streams || []) {
    const r = s.w + margin;
    for (let i = 0; i < s.pts.length - 1; i++) if (segDist2(x, y, s.pts[i], s.pts[i + 1]) < r * r) return true;
  }
  return false;
}

// Bekk: en slynget linje fra en kant mot hovedtjernet (eller tvers over kartet), holdt unna bosettingens hjerte.
function makeStream(state, rng, biome) {
  const { width: W, height: H, pond } = state.world, C = state.settlement.center, L = B.landscape;
  const side = Math.floor(rand(rng) * 4);
  const start = [{ x: range(rng, 140, W - 140), y: 90 }, { x: W - 90, y: range(rng, 140, H - 140) }, { x: range(rng, 140, W - 140), y: H - 90 }, { x: 90, y: range(rng, 140, H - 140) }][side];
  const end = biome === 'dal' ? { x: W - start.x, y: H - start.y } : { x: pond.x + range(rng, -40, 40), y: pond.y + (start.y < pond.y ? -pond.ry * 0.6 : pond.ry * 0.6) };
  const pts = [], steps = 28; // tett nok til at ingen strekning skjærer gjennom leirens hjerte
  const bend = range(rng, -1, 1) * 220;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, sway = Math.sin(t * Math.PI) * bend + Math.sin(t * 9 + side) * 26;
    let x = start.x + (end.x - start.x) * t + sway * (end.y - start.y) / (Math.hypot(end.x - start.x, end.y - start.y) || 1);
    let y = start.y + (end.y - start.y) * t - sway * (end.x - start.x) / (Math.hypot(end.x - start.x, end.y - start.y) || 1);
    // Skyv bort fra leirens hjerte slik at bekken ikke går gjennom landsbyen.
    const dx = x - C.x, dy = (y - C.y) / 0.72, d = Math.hypot(dx, dy);
    if (d < L.streamClear) { x = C.x + (dx / (d || 1)) * L.streamClear; y = C.y + (dy / (d || 1)) * L.streamClear * 0.72; }
    pts.push({ x, y });
  }
  // Bekken ender i tjernet: avkort i første punkt som ligger inni det.
  const cut = pts.findIndex((p) => ell(p.x, p.y, pond.x, pond.y, pond.rx, pond.ry) < 1);
  const line = cut > 0 ? pts.slice(0, cut + 1) : pts;
  // En bekk som skjærer for nær leirens hjerte forkastes (ingen bekk i denne verdenen) i stedet for å gå gjennom landsbyen.
  for (let i = 0; i < line.length - 1; i++) if (segDist2(C.x, (C.y) / 0.72, { x: line[i].x, y: line[i].y / 0.72 }, { x: line[i + 1].x, y: line[i + 1].y / 0.72 }) < (L.streamClear * 0.75) ** 2) return null;
  return { w: L.streamWidth, pts: line };
}

function farFromSettlement(state, x, y, minD) {
  const C = state.settlement.center;
  return Math.hypot(x - C.x, (y - C.y) / 0.72) >= minD;
}

// Tilfeldig sted i kartet som er tørt, innenfor kanten og utenfor leirens hjerte.
function randomSpot(state, rng, minFromCamp, margin = 120) {
  const { width: W, height: H } = state.world;
  for (let i = 0; i < 40; i++) {
    const x = range(rng, margin, W - margin), y = range(rng, margin, H - margin);
    if (!farFromSettlement(state, x, y, minFromCamp) || inAnyWater(state, x, y, 60)) continue;
    return { x, y };
  }
  return null;
}

// Genererer vann og soner (kalles før objektene plasseres).
export function generateGeography(state, rng, biome) {
  const prof = PROFILES[biome] || PROFILES.skog, W = state.world.width, H = state.world.height, L = B.landscape;
  state.world.biome = biome;
  // Kystland: havet ligger som en stor vannflate på den ene siden (fartøy, kai og kystlinje er ekte geografi, ikke pynt).
  if (biome === 'kyst') { const C = state.settlement.center; state.world.pond = { x: C.x - 520, y: C.y + 140, rx: 460, ry: 200 }; }
  state.world.waters = [];
  state.world.streams = [];
  state.world.zones = [];
  if (rand(rng) < prof.stream) { const st = makeStream(state, rng, biome); if (st) state.world.streams.push(st); }
  if (rand(rng) < prof.lake) {
    for (let t = 0; t < 12; t++) {
      const x = range(rng, 260, W - 260), y = range(rng, 220, H - 220), rx = range(rng, 90, 150), ry = rx * range(rng, 0.42, 0.55);
      if (!farFromSettlement(state, x, y, L.lakeClear + rx) || inAnyWater(state, x, y, rx + 90)) continue;
      state.world.waters.push({ x, y, rx, ry, kind: 'lake' });
      break;
    }
  }
  // Soner: steinrike høyder, enger og skogsområder. De fargelegger terrenget og styrer hva som vokser.
  const place = (kind, count, rxr, minCamp) => {
    for (let i = 0; i < count; i++) {
      const p = randomSpot(state, rng, minCamp); if (!p) continue;
      const rx = range(rng, rxr[0], rxr[1]);
      state.world.zones.push({ kind, x: p.x, y: p.y, rx, ry: rx * range(rng, 0.6, 0.8) });
    }
  };
  const k = L.areaScale; // kartet er større enn før: flere soner, i samme størrelse
  place('rocky', Math.round(prof.outcrops * k), [110, 190], L.outcropClear);
  place('meadow', Math.round(prof.meadows * k), [170, 280], 260);
  place('forest', Math.max(3, Math.round(prof.groves * k / 4)), [200, 330], 300);
}

export const zoneAt = (state, x, y, kind) => (state.world.zones || []).some((z) => z.kind === kind && ell(x, y, z.x, z.y, z.rx, z.ry) < 1);

// Plasserer trær og steiner i landskapet. `ctx` gir verdensfunksjonene (unngår sirkelimport).
export function populateLandscape(state, rng, biome, ctx) {
  const { addTree, addRock, isFreeForTree } = ctx;
  const prof = PROFILES[biome] || PROFILES.skog, C = state.settlement.center, W = state.world.width, H = state.world.height;
  const zones = state.world.zones, treeCount = () => state.nodes.reduce((n, q) => n + (q.kind === 'tree' ? 1 : 0), 0);
  // Lunder: sentre i skogsoner trekkes først, så vilkårlig. Hver lund har en hovedart; kanten blandes.
  const centers = [];
  for (const z of zones.filter((q) => q.kind === 'forest')) for (let i = 0; i < 4; i++) centers.push({ x: z.x + range(rng, -0.6, 0.6) * z.rx, y: z.y + range(rng, -0.6, 0.6) * z.ry, big: true });
  for (let g = 0; g < Math.round(prof.groves * B.landscape.areaScale); g++) {
    const near = g % 5 < 3, a = rand(rng) * Math.PI * 2, d = near ? range(rng, 260, 780) : range(rng, 300, 1500); // tre av fem lunder nær leiren
    centers.push({ x: C.x + Math.cos(a) * d, y: C.y + Math.sin(a) * d * 0.7, big: false });
  }
  for (const c of centers) {
    if (c.x < 60 || c.y < 60 || c.x > W - 60 || c.y > H - 60 || inAnyWater(state, c.x, c.y, 60)) continue;
    if (zoneAt(state, c.x, c.y, 'meadow')) continue;
    const species = rand(rng) < prof.spruce ? 'spruce' : 'birch';
    const count = Math.round(range(rng, prof.grove[0], prof.grove[1]) * (c.big ? 1.8 : 1));
    for (let i = 0; i < count; i++) {
      if (treeCount() >= B.tree.maxTrees - 24) break; // plass til frøspredning og gjenvekst
      for (let tries = 0; tries < 8; tries++) {
        const x = c.x + (rand(rng) + rand(rng) - 1) * 138, y = c.y + (rand(rng) + rand(rng) - 1) * 102;
        if (!isFreeForTree(state, x, y) || zoneAt(state, x, y, 'meadow') || zoneAt(state, x, y, 'rocky') && rand(rng) < 0.7) continue;
        const edge = Math.hypot(x - c.x, (y - c.y) * 1.15) / 150;
        const growth = edge > 0.62 && rand(rng) < 0.48 ? range(rng, 0.12, 0.48) : range(rng, 0.55, 1);
        const sp = rand(rng) < (edge > 0.55 ? 0.68 : 0.9) ? species : (species === 'birch' ? 'spruce' : 'birch');
        addTree(state, sp, x, y, growth);
        break;
      }
    }
  }
  // Trær i leirens utkant (190–300 enheter ut): bygda ligger ved skogen, ikke midt i en åpen slette.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rand(rng) * 0.4, d = range(rng, 190, 300), x = C.x + Math.cos(a) * d, y = C.y + Math.sin(a) * d * 0.72;
    if (isFreeForTree(state, x, y) && !inAnyWater(state, x, y, 20)) addTree(state, rand(rng) < 0.5 ? 'birch' : 'spruce', x, y, range(rng, 0.5, 1));
  }
  // Enkelttrær og trær i kanten av enger (sparsomt, så engene leses som åpne).
  for (let i = 0; i < Math.round(prof.singles * B.landscape.areaScale); i++) {
    const x = range(rng, 60, W - 60), y = range(rng, 60, H - 60);
    if (isFreeForTree(state, x, y) && Math.hypot(x - C.x, y - C.y) > 230 && !zoneAt(state, x, y, 'meadow')) addTree(state, rand(rng) < 1 - prof.spruce ? 'birch' : 'spruce', x, y, range(rng, 0.3, 1));
  }
  // Steinutspring: grupper av stein av ulik størrelse i de steinrike sonene (og noen som peker mot leiren).
  for (const z of zones.filter((q) => q.kind === 'rocky')) {
    const n = 4 + Math.floor(rand(rng) * 4);
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 6; tries++) {
        const a = rand(rng) * Math.PI * 2, d = Math.sqrt(rand(rng)), x = z.x + Math.cos(a) * z.rx * d * 0.8, y = z.y + Math.sin(a) * z.ry * d * 0.8;
        const r = rand(rng) < 0.25 ? range(rng, 24, 32) : range(rng, 10, 22);
        if (state.nodes.some((q) => q.kind !== 'tree' && Math.hypot(x - q.x, y - q.y) < q.radius + r + 26)) continue;
        if (inAnyWater(state, x, y, 30) || Math.hypot(x - C.x, y - C.y) < 190) continue;
        addRock(state, x, y, r);
        break;
      }
    }
  }
  // Tidlig stein: løse steiner i rimelig gangavstand fra leiren, slik at de første byggene aldri står og venter på stein.
  let rocks = 0;
  for (let tries = 0; tries < 400 && rocks < B.rock.earlyDeposits; tries++) {
    const a = rand(rng) * Math.PI * 2, d = range(rng, 150, rocks < B.rock.earlyNear ? B.rock.earlyRadius : 820);
    const x = C.x + Math.cos(a) * d, y = C.y + Math.sin(a) * d * 0.7;
    const r = range(rng, 14, 28);
    if (x < 60 || y < 60 || x > W - 60 || y > H - 60 || inAnyWater(state, x, y, 40)) continue;
    if (state.nodes.some((n) => Math.hypot(x - n.x, y - n.y) < (n.kind === 'rock' ? n.radius + r + 40 : r + 24))) continue;
    addRock(state, x, y, r);
    rocks++;
  }
}
