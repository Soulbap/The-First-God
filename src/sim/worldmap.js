// Verdenskartet: en grov, deterministisk flermålsmodell. Hjemmeregionen er den detaljerte verdenen
// (full simulering av folk, bygg og ruter). Fjerne regioner simuleres bare som tilstand og tidtakere
// (ukjent → oppdaget → utpost → etablert), og de påvirker spillet gjennom ekspedisjoner og karavaner
// som faktisk går inn over kartkanten. Ingen individuelle mennesker simuleres utenfor hjemmeregionen.
import { BALANCE as B } from '../data/balance.js';
import { createRng, rand } from '../core/rng.js';
import { addWear } from './wear.js';
import { recordTrip } from './regional.js';
import { addKnowledge } from './production.js';
import { settlementById } from './settlements.js';
import { storyWorld } from './story.js';

export const BIOMES = {
  skog: { name: 'Skogland', goods: [['wood', 8], ['planks', 1], ['charcoal', 2]], color: [72, 92, 58] },
  fjell: { name: 'Fjellrike', goods: [['stone', 8], ['cutstone', 1], ['ironOre', 5], ['coal', 3]], color: [112, 108, 98] },
  slette: { name: 'Sletteland', goods: [['food', 5], ['wood', 2], ['tinOre', 3]], color: [128, 124, 70] },
  kyst: { name: 'Kystland', goods: [['food', 3], ['knowledge', 3], ['copperOre', 3], ['crudeOil', 2]], color: [84, 112, 118] },
  dal: { name: 'Dalføre', goods: [['wood', 4], ['stone', 4], ['knowledge', 1], ['copperOre', 3], ['coal', 2]], color: [96, 110, 70] },
};
// Malm, kull og olje er økonomisk viktige og finnes i stor mengde per region (men begrenset); dagligvarer teller mindre.
const HEAVY = new Set(['ironOre', 'copperOre', 'tinOre', 'coal', 'crudeOil']);
const BIOME_ORDER = ['skog', 'fjell', 'slette', 'kyst', 'dal'];
const NAME_STEM = { skog: ['Nordmark', 'Granland', 'Bjørkelund', 'Mørkeskog'], fjell: ['Høyfjell', 'Steinrike', 'Jernåsen', 'Tindlandet'], slette: ['Bredmark', 'Gullsletta', 'Kornvang', 'Vidda'], kyst: ['Vestkysten', 'Fjordvika', 'Skjærgård', 'Havbukta'], dal: ['Langdal', 'Elvedal', 'Solgrenda', 'Fossedalen'] };

export const regionState = { UKJENT: 'ukjent', OPPDAGET: 'oppdaget', UTPOST: 'utpost', ETABLERT: 'etablert', HJEM: 'hjem' };
const homeCell = () => ({ col: Math.floor(B.globe.cols / 2), row: Math.floor(B.globe.rows / 2) });

export function createGlobe(seed) {
  const rng = createRng((seed ^ 0x5bd1e995) >>> 0);
  const H = homeCell(), regions = [];
  const used = {};
  for (let row = 0; row < B.globe.rows; row++) for (let col = 0; col < B.globe.cols; col++) {
    const home = col === H.col && row === H.row;
    const biome = home ? 'skog' : BIOME_ORDER[Math.floor(rand(rng) * BIOME_ORDER.length)];
    const idx = (used[biome] = (used[biome] ?? -1) + 1);
    const inventory = Object.fromEntries(BIOMES[biome].goods.map(([res, n]) => [res, Math.round(n * (home ? 8 : HEAVY.has(res) ? B.globe.depositHeavy : 16) * (0.8 + rand(rng) * 0.4))]));
    // Vannadgang er fysisk, seedet geografi. Den endres aldri når området kartlegges.
    const coast = biome === 'kyst' || (!home && rand(rng) < 0.16);
    const river = biome === 'dal' || (home ? rand(rng) < 0.72 : rand(rng) < 0.28);
    regions.push({
      id: `r${col}${row}`, col, row, biome, home,
      name: home ? 'Hjemlandet' : NAME_STEM[biome][idx % NAME_STEM[biome].length] + (idx >= NAME_STEM[biome].length ? ' II' : ''),
      richness: home ? 1 : 0.8 + rand(rng) * 0.6,
      steps: Math.max(Math.abs(col - H.col), Math.abs(row - H.row)),
      state: home ? regionState.HJEM : regionState.UKJENT,
      knowledge: home ? 'charted' : 'unknown', water: { coast, river, openSea: coast },
      pop: 0, discoveredAt: null, outpostAt: null, nextGrowAt: Infinity, nextCaravanAt: Infinity, caravans: 0, delivered: 0,
      inventory,
      // OPUS-11: regionens eget lager (adskilt fra forekomsten i `inventory`). Folk utvinner fra forekomsten til lageret;
      // karavaner henter bare fra lageret; lokale hus bygges av lageret. `homes` er ferdige boliger (gir plass til folk).
      stock: {}, homes: 0, building: null, extracted: 0, aerial: false,
    });
  }
  const home = regions.find((r) => r.home);
  return {
    regions, expeditionsEnabled: false, outpostsEnabled: false, connected: false, cartography: false, activeRegionId: home.id,
    mission: null, nextMissionAt: Infinity, caravans: [], vessels: [],
    stats: { discovered: 0, surveyed: 0, charted: 0, outposts: 0, established: 0, caravanDeliveries: 0, maritimeDeliveries: 0, expeditions: 0 },
  };
}

export const regionById = (state, id) => state.globe.regions.find((r) => r.id === id);
export const discoveredRegions = (state) => state.globe.regions.filter((r) => !r.home && r.state !== regionState.UKJENT);
export const outpostRegions = (state) => state.globe.regions.filter((r) => r.state === regionState.UTPOST || r.state === regionState.ETABLERT);
// Et besøkbart land er menneskelig oppdaget. Den detaljerte lokale projeksjonen er deterministisk og avledes
// fra regionens autoritative tilstand; den skriver aldri økonomi eller befolkning ved kameraskifte.
export function visitableRegion(state, id) { const r = regionById(state, id); return !!r && (r.home || r.state !== regionState.UKJENT); }
export function visitRegion(state, id) { if (!visitableRegion(state, id)) return false; state.globe.activeRegionId = id; return true; }
const neighbours = (state, r) => state.globe.regions.filter((q) => q !== r && Math.abs(q.col - r.col) <= 1 && Math.abs(q.row - r.row) <= 1);

// Områder som ligger inntil kjent land, og dermed kan nås av en ekspedisjon.
export function reachableUnknown(state) {
  return state.globe.regions.filter((r) => r.state === regionState.UKJENT && neighbours(state, r).some((q) => q.home || q.state !== regionState.UKJENT))
    .sort((a, b) => a.steps - b.steps || a.row - b.row || a.col - b.col);
}

// Landruter er alltid mulige mellom naboregioner; vannruter krever vannadgang i begge ender
// og et faktisk bygget fartøy. Denne lille modellen erstatter ikke den seedede geografien.
export function routeMode(state, from, to) {
  const a = typeof from === 'string' ? regionById(state, from) : from;
  const b = typeof to === 'string' ? regionById(state, to) : to;
  if (!a || !b) return 'land';
  const water = (a.water?.coast || a.water?.river) && (b.water?.coast || b.water?.river);
  if (water && state.globe.vessels?.length) return (a.water.coast && b.water.coast) ? 'sea' : 'river';
  return 'land';
}

// Hvor på kartkanten reisende forlater/kommer inn til hjemmeregionen for en gitt region.
export function edgePoint(state, region) {
  const H = homeCell(), W = state.world.width, Ht = state.world.height, C = state.settlement.center;
  let dx = region.col - H.col, dy = region.row - H.row;
  if (!dx && !dy) dx = 1;
  const len = Math.hypot(dx, dy); dx /= len; dy /= len;
  let t = Infinity;
  const m = 30;
  if (dx > 0) t = Math.min(t, (W - m - C.x) / dx); else if (dx < 0) t = Math.min(t, (m - C.x) / dx);
  if (dy > 0) t = Math.min(t, (Ht - m - C.y) / dy); else if (dy < 0) t = Math.min(t, (m - C.y) / dy);
  const off = ((region.col * 7 + region.row * 13) % 5 - 2) * 26;
  return { x: Math.min(W - m, Math.max(m, C.x + dx * t - dy * off)), y: Math.min(Ht - m, Math.max(m, C.y + dy * t + dx * off)) };
}

const capitalIdle = (state) => state.humans.filter((h) => h.settlementId === 'first' && (h.state === 'idle' || h.state === 'wander') && !h.carry.amount && !h.away && h.partyId == null && h.missionId == null);

export function worldReadiness(state, kind) {
  const G = state.globe, W = B.globe;
  const cost = kind === 'outpost' ? W.outpost : W.expedition;
  const checks = [
    { id: 'idle', label: 'Ingen ferd underveis', ok: !G.mission },
    { id: 'hands', label: 'Ledige hender', ok: capitalIdle(state).length >= (kind === 'outpost' ? W.outpostParty : B.realm.party) },
    ...Object.entries(cost).map(([k, n]) => ({ id: k, label: `Forsyninger: ${n} ${k}`, ok: state.resources[k] >= n })),
  ];
  return checks;
}

// Utposter velges etter hva riket mangler: en region som gir en viktig vare ingen utpost dekker ennå (jern, kull, kobber, olje, tinn)
// er mer verdt enn en som gjentar det vi har. Vekten følger hvor uunnværlig varen er for industrikjeden.
const RESOURCE_WEIGHT = { ironOre: 3, coal: 2, copperOre: 2, crudeOil: 1.5, tinOre: 1 };
export function outpostValue(state, region, covered = null) {
  const have = covered || new Set(outpostRegions(state).flatMap((r) => Object.keys(r.inventory).filter((k) => (r.inventory[k] || 0) > 0)));
  let v = 0;
  for (const [res, w] of Object.entries(RESOURCE_WEIGHT)) if ((region.inventory[res] || 0) > 0) v += have.has(res) ? w * 0.15 : w;
  return v;
}
function pickOutpostTarget(state) {
  const have = outpostRegions(state).map((r) => r.biome), covered = new Set(outpostRegions(state).flatMap((r) => Object.keys(r.inventory).filter((k) => (r.inventory[k] || 0) > 0)));
  return state.globe.regions.filter((r) => r.state === regionState.OPPDAGET)
    .sort((a, b) => outpostValue(state, b, covered) - outpostValue(state, a, covered) || have.filter((x) => x === a.biome).length - have.filter((x) => x === b.biome).length || a.steps - b.steps || a.row - b.row || a.col - b.col)[0] || null;
}

// Grunnantallet utposter, pluss ett ekstra når et oppdaget land gir en uunnværlig vare (jern, kull, kobber) ingen utpost dekker ennå.
const outpostLimit = (state) => {
  const base = state.globe.connected ? 4 : 2, out = outpostRegions(state);
  if (out.length < base) return base;
  const covered = new Set(out.flatMap((r) => Object.keys(r.inventory).filter((k) => (r.inventory[k] || 0) > 0)));
  const gap = state.globe.regions.some((r) => r.state === regionState.OPPDAGET && ['ironOre', 'coal', 'copperOre'].some((k) => !covered.has(k) && (r.inventory[k] || 0) > 0));
  return gap ? Math.min(base + 2, 6) : base;
};

function launchMission(state, kind) {
  const G = state.globe, W = B.globe;
  const target = kind === 'outpost' ? pickOutpostTarget(state) : reachableUnknown(state)[0];
  if (!target) return false;
  const size = kind === 'outpost' ? W.outpostParty : B.realm.party;
  const members = capitalIdle(state).sort((a, b) => a.id - b.id).slice(0, size);
  if (members.length < size) return false;
  const cost = kind === 'outpost' ? W.outpost : W.expedition;
  if (!Object.entries(cost).every(([k, n]) => state.resources[k] >= n)) return false;
  for (const [k, n] of Object.entries(cost)) state.resources[k] -= n;
  const edge = edgePoint(state, target);
  G.mission = { id: state.nextId++, kind, regionId: target.id, members: members.map((m) => m.id), edge, phase: 'out', eta: Infinity, launchedAt: state.time };
  for (const m of members) { m.missionId = G.mission.id; m.state = 'toEdge'; m.tx = edge.x; m.ty = edge.y; m.waypoints = null; }
  state.events.push({ type: 'missionLaunched', kind, regionId: target.id, x: edge.x, y: edge.y });
  return true;
}

// Et medlem har nådd kartkanten og forlater den detaljerte verdenen.
export function missionAtEdge(state, h) {
  const m = state.globe.mission;
  if (!m || m.id !== h.missionId) { h.missionId = null; h.state = 'idle'; h.timer = 0.5; return; }
  h.state = 'away'; h.away = true;
  if (!m.members.every((id) => state.humans.find((q) => q.id === id)?.away)) return;
  const target = regionById(state, m.regionId), per = m.kind === 'outpost' ? B.globe.outpostSecondsPerStep : B.globe.expeditionSecondsPerStep;
  m.phase = 'away'; m.eta = state.time + (per * Math.max(1, target.steps)) / (state.modifiers.expeditionSpeed || 1);
}

export function missionHome(state, h) {
  h.missionId = null; h.away = false; h.state = 'idle'; h.timer = 0.6;
}

function completeMission(state) {
  const G = state.globe, m = G.mission, region = regionById(state, m.regionId);
  const members = m.members.map((id) => state.humans.find((q) => q.id === id)).filter(Boolean);
  if (m.kind === 'expedition') {
    region.state = regionState.OPPDAGET; region.discoveredAt = state.time;
    region.knowledge = 'discovered';
    G.stats.discovered++; G.stats.expeditions++;
    // Hver oppdagelse gir kunnskap, og de nærmeste naboene kommer i sikte.
    addKnowledge(state, 3 + region.steps * 2, settlementById(state, 'first'));
    state.events.push({ type: 'regionDiscovered', regionId: region.id, name: region.name, biome: region.biome });
    storyWorld(state, 'discovered', region, m.members);
    for (const q of members) { q.away = false; q.x = m.edge.x; q.y = m.edge.y; q.state = 'expReturn'; const s = state.stockpile; q.tx = s.x; q.ty = s.y + 12; q.waypoints = null; }
  } else {
    // Utposten bemannes av følget: de forlater hjemmeregionen for godt.
    region.state = regionState.UTPOST; region.outpostAt = state.time; region.pop = members.length;
    region.nextGrowAt = state.time + B.globe.outpostGrowSeconds;
    region.homes = Math.max(region.homes || 0, 1); // følget tok med seg en første bolig
    region.nextCaravanAt = state.time + B.globe.caravanSeconds;
    G.stats.outposts++;
    storyWorld(state, 'outpost', region, m.members); // før følget forlater verden, så navnene finnes
    const gone = new Set(members.map((q) => q.id));
    state.humans = state.humans.filter((q) => !gone.has(q.id));
    for (const s of state.settlements) s.population = s.population.filter((id) => !gone.has(id));
    state.events.push({ type: 'outpostFounded', regionId: region.id, name: region.name });
  }
  G.mission = null;
  G.nextMissionAt = state.time + 30;
}

// ---------- Regionale lagre (OPUS-11) ----------
// Mål per vare for hjemmelageret: karavaner bærer det som mangler mest, ikke bare det som ligger i regionen.
const DEMAND_TARGET = { wood: 80, stone: 80, food: 40, planks: 24, cutstone: 12, charcoal: 24, knowledge: 60, crudeOil: 80 };
export function demandOf(state, res) {
  const T = B.materials.stockTargets;
  if (res === 'knowledge') return 1;
  if (res === 'crudeOil' && !state.industrial?.petroleum) return 0;
  if (res === 'coal' && !state.industrial?.enabled) return 0;
  const target = T[res] ?? DEMAND_TARGET[res] ?? 40;
  return Math.max(0, 1 - (state.resources[res] || 0) / target) * (T.weight[res] || 1);
}
export const stockCap = (r) => (r.state === regionState.ETABLERT ? B.globe.stockCap * 2 : B.globe.stockCap);
export const stockTotal = (r) => Object.values(r.stock || {}).reduce((n, v) => n + v, 0);
export const housingCap = (r) => B.globe.baseHousing + r.homes * B.globe.housingPerHome;
const BUILD_MATERIALS = ['wood', 'planks', 'stone', 'cutstone'];

// Folk i regionen henter råvarer fra forekomsten til regionens lager. Uttaket er begrenset av folketall, rikdom,
// gjenværende forekomst og lagerplass; ingenting oppstår utenfra (forekomst → lager er en ren overføring).
function extractRegion(state, r, dt) {
  const W = B.globe, goods = BIOMES[r.biome].goods, total = goods.reduce((n, [, w]) => n + w, 0);
  const rate = W.extractPerPop * r.pop * r.richness * (state.globe.connected ? 1.25 : 1) * dt;
  for (const [res, w] of goods) {
    const room = stockCap(r) - (r.stock[res] || 0);
    const got = Math.min(rate * w / total, r.inventory[res] || 0, room);
    if (got <= 0) continue;
    r.inventory[res] -= got; r.stock[res] = (r.stock[res] || 0) + got; r.extracted += got;
  }
}

// Lokal bolig bygges av regionens eget lager (konsum): materialer tas fra lageret når byggingen starter.
function growRegion(state, r) {
  const W = B.globe;
  if (r.building) {
    if (state.time < r.building.until) return;
    r.homes++; r.building = null; state.globe.stats.regionHomes = (state.globe.stats.regionHomes || 0) + 1;
    state.events.push({ type: 'regionHomeBuilt', regionId: r.id });
    return;
  }
  if (r.homes >= W.maxHomes || r.pop < housingCap(r) - 1) return; // bygg først når boligene er nesten fulle
  let need = W.homeMaterials; const take = {};
  for (const m of BUILD_MATERIALS) { const g = Math.min(need, Math.floor(r.stock[m] || 0)); if (g > 0) { take[m] = g; need -= g; } }
  if (need > 0) return;
  for (const [m, n] of Object.entries(take)) r.stock[m] -= n;
  r.building = { until: state.time + W.homeSeconds, cost: take };
}

function stepOutposts(state, dt) {
  const G = state.globe, W = B.globe;
  for (const r of outpostRegions(state)) {
    extractRegion(state, r, dt); growRegion(state, r);
    if (state.time >= r.nextGrowAt) {
      const cap = Math.min(W.outpostCap + (G.connected ? 4 : 0), housingCap(r));
      if (r.pop < cap) r.pop++;
      r.nextGrowAt = state.time + W.outpostGrowSeconds;
      if (r.state === regionState.UTPOST && r.pop >= W.establishedPop) {
        r.state = regionState.ETABLERT; G.stats.established++;
        state.events.push({ type: 'regionEstablished', regionId: r.id, name: r.name });
        storyWorld(state, 'established', r);
      }
    }
    if (state.time >= r.nextCaravanAt) {
      const interval = W.caravanSeconds * (r.state === regionState.ETABLERT ? 0.75 : 1);
      r.nextCaravanAt = state.time + interval;
      if (G.caravans.length >= W.maxCaravans) continue;
      const mode = routeMode(state, r, G.regions.find((q) => q.home));
      const vessel = mode === 'land' ? null : G.vessels.find((v) => !v.route);
      // En båt kan ikke brukes av to vareruter samtidig; ingen teleportering via dekorative skip.
      if (mode !== 'land' && !vessel) continue;
      const scale = (r.pop / 3) * r.richness * (G.connected ? 1.5 : 1) * (mode === 'sea' ? 1.45 : mode === 'river' ? 1.2 : 1);
      // Karavanen bærer det hjemmelageret trenger mest, og bare det regionens lager faktisk har (reservasjon ved avreise).
      let remaining = vessel?.capacity ?? W.landCapacity;
      const goods = BIOMES[r.biome].goods.map(([res, n]) => ({ res, n, need: demandOf(state, res) })).filter((g) => g.need > 0.05)
        .sort((a, b) => b.need - a.need).map(({ res, n }) => {
          const amount = Math.min(remaining, Math.floor(r.stock?.[res] || 0), Math.max(1, Math.round(n * scale)));
          remaining -= amount;
          return { res, amount };
        }).filter((g) => g.amount > 0);
      if (!goods.length) continue;
      for (const g of goods) r.stock[g.res] -= g.amount;
      const e = edgePoint(state, r);
      if (vessel) { vessel.route = r.id; vessel.cargo = goods; vessel.progress = 0; }
      G.caravans.push({ id: state.nextId++, regionId: r.id, x: e.x, y: e.y, goods, mode, vesselId: vessel?.id || null, dir: 1, walk: 0, look: { tunic: 2 + (r.col % 3), skin: r.row % 4, hair: (r.col + r.row) % 4, height: 1, pace: 1 } });
      r.caravans++;
    }
  }
}

function stepCaravans(state, dt) {
  const G = state.globe, C = state.stockpile;
  for (const c of G.caravans) {
    const dx = C.x - c.x, dy = C.y + 14 - c.y, d = Math.hypot(dx, dy), step = B.globe.caravanSpeed * (state.modifiers.walkSpeed || 1) * (c.mode === 'sea' ? 1.65 : c.mode === 'river' ? 1.28 : 1) * dt;
    if (d <= step) { c.arrived = true; continue; }
    c.x += dx / d * step; c.y += dy / d * step; c.walk += step; c.dir = dx > 0 ? 1 : -1;
    addWear(state, c.x, c.y, B.wear.perSecondWalking * B.wear.transportMultiplier * dt);
  }
  for (const c of G.caravans.filter((q) => q.arrived)) {
    const r = regionById(state, c.regionId);
    for (const g of c.goods) {
      if (g.res === 'knowledge') { addKnowledge(state, g.amount, settlementById(state, 'first')); continue; }
      state.resources[g.res] += g.amount; state.totals[g.res] += g.amount;
    }
    r.caravans--; r.delivered++; G.stats.caravanDeliveries++;
    if (c.mode !== 'land') { G.stats.maritimeDeliveries++; const v = G.vessels.find((q) => q.id === c.vesselId); if (v) { v.route = null; v.cargo = null; v.x = state.stockpile.x - 50; v.y = state.stockpile.y + 42; } }
    recordTrip(state, r.id, 'first', c.goods[0].res, c.goods[0].amount);
    state.events.push({ type: 'caravanArrived', regionId: r.id, x: c.x, y: c.y });
    storyWorld(state, 'caravan', r);
  }
  if (G.caravans.some((q) => q.arrived)) G.caravans = G.caravans.filter((q) => !q.arrived);
}

// En ferd som ikke kommer seg ut til kartkanten (blokkert vei) avbrytes, og forsyningene gis tilbake.
const MISSION_TIMEOUT = 360;
function abortMission(state) {
  const G = state.globe, m = G.mission, cost = m.kind === 'outpost' ? B.globe.outpost : B.globe.expedition;
  for (const [k, n] of Object.entries(cost)) state.resources[k] += n;
  for (const id of m.members) {
    const q = state.humans.find((h) => h.id === id);
    if (q) { q.missionId = null; q.away = false; q.waypoints = null; q.state = 'idle'; q.timer = 0.5; }
  }
  G.mission = null; G.nextMissionAt = state.time + 60;
}

export function stepWorld(state, dt) {
  const G = state.globe; if (!G) return;
  if (G.mission?.phase === 'out' && state.time - G.mission.launchedAt > MISSION_TIMEOUT) abortMission(state);
  if (G.mission?.phase === 'away' && state.time >= G.mission.eta) completeMission(state);
  else if (!G.mission && state.time >= G.nextMissionAt) {
    if (G.outpostsEnabled && outpostRegions(state).length < outpostLimit(state) && pickOutpostTarget(state)
      && worldReadiness(state, 'outpost').every((c) => c.ok)) launchMission(state, 'outpost');
    else if (G.expeditionsEnabled && reachableUnknown(state).length && worldReadiness(state, 'expedition').every((c) => c.ok)) launchMission(state, 'expedition');
  }
  stepOutposts(state, dt);
  stepCaravans(state, dt);
}
