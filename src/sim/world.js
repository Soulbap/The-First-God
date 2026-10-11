// Oppretter den identiske startverdenen for en syklus (samme seed → samme verden).
import { BALANCE as B } from '../data/balance.js';
import { createRng, rand, range } from '../core/rng.js';
import { createGlobe } from './worldmap.js';
import { createChronicle } from './chronicle.js';
import { generateGeography, populateLandscape, inAnyWater } from './landscape.js';
import { railEnds } from './rails.js';

export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// Vann er hovedtjernet pluss innsjøer og bekk (se landscape.js). Alle regler om «våt grunn» går hit.
export function inPond(state, x, y, margin = 0) {
  return inAnyWater(state, x, y, margin);
}

export function inBounds(state, x, y, margin) {
  return x > margin && y > margin && x < state.world.width - margin && y < state.world.height - margin;
}

// Gyldig sted for et tre (verdensgenerering og frøspredning).
export function isFreeForTree(state, x, y) {
  if (!inBounds(state, x, y, 30) || inPond(state, x, y, 22)) return false;
  const C = state.settlement.center;
  if (dist(x, y, C.x, C.y) < B.settlement.clearRadius) return false;
  if (dist(x, y, state.stockpile.x, state.stockpile.y) < 50) return false;
  for (const n of state.nodes) {
    const need = n.kind === 'tree' ? B.tree.minSpacing : n.radius + 16;
    if (dist(x, y, n.x, n.y) < need) return false;
  }
  // OPUS-02: folk holder bygdene åpne — skogen vokser ikke tilbake over hjem og åkre. Bygdens kjerne holdes åpen, og rundt hvert hus
  // i en bygd er det litt mer luft enn ellers.
  return !inMaintainedArea(state, x, y);
}

// Bygdens vedlikeholdte område (OPUS-11): kjernen rundt hjertet, fotavtrykk med klarering rundt hvert bygg (også ufullførte),
// stier og jernbanetraseer. Frøspredning og stubbegjenvekst respekterer dette; naturen vokser fritt utenfor.
export function inMaintainedArea(state, x, y) {
  for (const s of state.settlements || []) if (dist(x, y, s.x, s.y) < 118) return true;
  return inBuiltArea(state, x, y);
}

// Bare det som faktisk er bygget: bygg med klarering (dører, gårdsrom) og stier/traseer. Ingen abstrakt sirkel.
export function inBuiltArea(state, x, y) {
  for (const b of state.buildings) if (dist(x, y, b.x, b.y) < b.radius + 42) return true;
  return onMaintainedLine(state, x, y);
}

const segDist = (x, y, ax, ay, bx, by) => {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2)) : 0;
  return Math.hypot(ax + vx * t - x, ay + vy * t - y);
};

// OPUS-11 · Vedlikeholdte linjer: stier fra hvert ferdige bygg inn mot bosettingens hjerte, og jernbanetraseer mellom bosettinger.
// Skog og stein vokser ikke tilbake over dem (verken i by, industriområde eller på flyplass; flyplassens bygg har eget fotavtrykk ovenfor).
// Bare faktiske, brukte linjer teller; ingen enorm eksklusjonssirkel.
export function onMaintainedLine(state, x, y) {
  for (const S of state.settlements) {
    const id = S.id;
    const heart = state.buildings.find((b) => b.complete && (b.type === 'hearth' || b.type === 'fire') && (b.settlementId || 'first') === id) || S;
    if (Math.hypot(x - heart.x, y - heart.y) > 420) continue;
    for (const b of state.buildings) {
      if (!b.complete || (b.settlementId || 'first') !== id || b === heart) continue;
      const d = Math.hypot(b.x - heart.x, b.y - heart.y);
      if (d < 40 || d > 320) continue;
      if (segDist(x, y, b.x, b.y, heart.x, heart.y) < 14) return true;
    }
  }
  for (const r of state.industrial?.rails || []) {
    const e = railEnds(state, r);
    if (e && segDist(x, y, e.a.x, e.a.y, e.b.x, e.b.y) < 26) return true;
  }
  return false;
}

export function makeTree(state, species, x, y, growth) {
  return {
    id: state.nextId++, kind: 'tree', species, variant: Math.floor(rand(state.rng) * 4),
    x, y, growth, chopped: 0, state: 'alive', timer: 0, stump: false,
    vigor: range(state.rng, 0.85, 1.15), reservedBy: [],
  };
}

function addTree(state, species, x, y, growth) {
  if (state.nodes.filter((n) => n.kind === 'tree').length >= B.tree.maxTrees) return null;
  const t = makeTree(state, species, x, y, growth);
  state.nodes.push(t);
  return t;
}

function addRock(state, x, y, radius) {
  const maxStone = Math.round(radius * 0.9);
  const node = { id: state.nextId++, kind: 'rock', x, y, radius, stone: maxStone, maxStone, regenTimer: 0, reservedBy: [] };
  state.nodes.push(node);
  return node;
}

function addMineral(state, type, x, y, amount) {
  state.nodes.push({ id: state.nextId++, kind: 'mineral', mineral: type, x, y, radius: 18, amount, maxAmount: amount, stone: amount, maxStone: amount, discovered: false, reservedBy: [] });
}

// Flere årer per mineral i ulike retninger. Rekkefølgen (nærmest først) er den samme som oppdagelsesrekkefølgen
// (se discoverMinerals). Tilfeldighet hentes fra en egen strøm, slik at skog og stein i verden ikke endres av dette.
const VEIN_KINDS = ['copperOre', 'tinOre', 'ironOre', 'coal'];
function placeVeins(state, mainRng) {
  const rng = createRng((state.seed ^ 0x2a6d365b) >>> 0), C = state.settlement.center, V = B.materials.veins;
  const placed = [];
  VEIN_KINDS.forEach((kind, k) => {
    const cfg = V[kind], rich = range(rng, cfg.richness[0], cfg.richness[1]);
    const base = rand(rng) * Math.PI * 2;
    for (let i = 0; i < cfg.count; i++) {
      const d0 = cfg.dist[0] + (cfg.dist[1] - cfg.dist[0]) * (cfg.count > 1 ? i / (cfg.count - 1) : 0.5);
      let spot = null;
      for (let tries = 0; tries < 24 && !spot; tries++) {
        const a = base + i * 2.1 + tries * 0.55, d = d0 * (1 - 0.04 * Math.floor(tries / 8));
        const x = C.x + Math.cos(a) * d, y = C.y + Math.sin(a) * d * 0.68;
        if (!inBounds(state, x, y, 90) || inPond(state, x, y, 70)) continue;
        if (placed.some((p) => dist(x, y, p.x, p.y) < 240)) continue;
        if (state.nodes.some((n) => n.kind !== 'tree' && dist(x, y, n.x, n.y) < 70)) continue;
        spot = { x, y };
      }
      if (!spot) continue;
      placed.push(spot);
      const amount = Math.round((cfg.reserve + Math.floor(rand(rng) * cfg.spread)) * rich * (i === 0 ? 1 : cfg.laterShare));
      addMineral(state, kind, spot.x, spot.y, amount);
    }
  });
}

// `biome` gir landets landskap (skog, fjell, slette, kyst, dal); `remote` utelater hjemmeregionens malmårer.
export function createWorld(seed = 20261009, biome = 'skog', { remote = false } = {}) {
  const rng = createRng(seed);
  const W = B.world.width, H = B.world.height;
  const C = { x: W / 2, y: H / 2 + 20 };
  const cell = B.wear.cell;
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  const state = {
    version: 1, seed, rng, time: 0, nextId: 1,
    world: { width: W, height: H, pond: { x: C.x - 360, y: C.y + 210, rx: 130, ry: 64 } },
    settlement: { center: C, angleOffset: 0 },
    settlements: [{ id: 'first', name: 'Den første landsbyen', x: C.x, y: C.y, state: 'active', population: [], kind: 'capital', projectsDone: 0, role: 'Skogbygd', stage: 'Leir', stock: {} }],
    expansion: { enabled: false, site: null, discovered: false, founding: false, founded: false, founders: [] },
    region: { enabled: false, populationUnlocked: false, deliveries: [], reserved: { wood: 0, stone: 0, food: 0, planks: 0, cutstone: 0 }, completedDeliveries: 0, completedProjects: 0, projects: {}, nextPopulationAt: Infinity },
    realm: { autoFounding: false, limit: 2, party: null, lastFoundedAt: -Infinity, nextCheckAt: Infinity, foundedCount: 0, siteCache: null },
    network: { routes: {}, trips: 0 },
    trade: { orders: {}, flows: {}, modes: {} }, // OPUS-12: handelsregnskap (statistikk)
    migration: { done: 0, byRoute: {}, nextAt: 0 }, // OPUS-12: flytting mellom bosettinger
    urban: { enabled: false, nextAt: 0, built: 0 }, // OPUS-02: Byplan
    renovation: { done: 0, consolidated: 0, attempted: 0, restructured: 0, capacityGained: 0, landEfficiencyGain: 0, labor: 0, materialsSpent: {}, rejected: {} }, // OPUS-11/12C.2
    chronicle: createChronicle(),
    globe: createGlobe(seed),
    civilization: { foodUnlocked: false, exchangeUnlocked: false, nextFoodAt: Infinity, nextPopulationAt: Infinity, foodHarvests: 0, exchangeDeliveries: 0, festivalUntil: -Infinity, nextFestivalAt: 0, festivals: 0 },
    materials: { enabled: false, ironworking: false, toolTier: 'stein', gatherBonus: 1, trades: [], delivered: 0 },
    // OPUS-05: transportkapasitet er sykluslokal. Fartøy og kai må bygges av ekte lager.
    navigation: { enabled: false, advanced: false, docks: 0, boats: 0, vesselsBuilt: 0, nextSurveyAt: Infinity },
    mechanical: { enabled: false, componentsMade: 0, waterSuitability: 0, windSuitability: 0, operatingPower: 0, requiredPower: 0, repairs: 0 },
    // OPUS-08: `electric*`, `petroleum`, `refining`, `combustion` og `roads` er evnene (kunnskap); `electricBudget`
    // er kapasitet per simuleringssteg, ikke et lager. `wear`/`repairs` er slitasje på motorvogner.
    industrial: { enabled: false, operatingPower: 0, repairs: 0, factoryCycles: 0, rails: [], locomotives: 0, shipments: [], deliveries: 0, announced: false,
      electric: false, petroleum: false, refining: false, combustion: false, roads: false, precision: false, electronics: false,
      electricBudget: {}, litSettlements: [], generated: 0, crudeExtracted: 0, fuelBurned: 0, roadDeliveries: 0, roadTrips: 0, truckWear: 0, serviceCount: 0 },
    // OPUS-09: luftfart. `surveys` er fullførte luftmålinger (grunnlaget for planetkameraet); `flights` er aktive oppdrag.
    aviation: { enabled: false, surveyEnabled: false, flights: [], surveys: 0, flightsDone: 0, flightWear: 0, services: 0, announcedFlight: false, announcedSurvey: false, nextFlightAt: Infinity, fuelBurned: 0 },
    // OPUS-10: `telegraphActive` er avledet per steg fra en strømført telegraf. `researchKnowledge` teller kunnskap fra institutt.
    science: { communication: false, research: false, rocketryFoundations: false, telegraphActive: false, researchKnowledge: 0, announcedElectronics: false, announcedResearch: false },
    stockpile: { x: C.x + 4, y: C.y + 48 },
    resources: { wood: 0, stone: 0, food: 0, planks: 0, cutstone: 0, copperOre: 0, tinOre: 0, ironOre: 0, coal: 0, charcoal: 0, copper: 0, bronze: 0, iron: 0, mechanicalComponents: 0, industrialMachinery: 0, railwayComponents: 0, crudeOil: 0, fuel: 0, truck: 0, precisionComponents: 0, aircraft: 0, electronics: 0, knowledge: 0, pp: 0 },
    totals: { wood: 0, stone: 0, food: 0, planks: 0, cutstone: 0, copperOre: 0, tinOre: 0, ironOre: 0, coal: 0, charcoal: 0, copper: 0, bronze: 0, iron: 0, mechanicalComponents: 0, industrialMachinery: 0, railwayComponents: 0, crudeOil: 0, fuel: 0, truck: 0, precisionComponents: 0, aircraft: 0, electronics: 0, knowledge: 0, pp: 0, manualClicks: 0 },
    upgrades: {},
    discovered: {}, // innsikt-id → spilltid da den ble synlig (se discovery.js)
    modifiers: { gatherSpeed: 1, carry: 0, buildSpeed: 1, exploration: false, craftSpeed: 1, knowledge: 1, foodBonus: 0, townhouseBonus: 0, regionalCarry: 0, rockRegen: 1, treeGrowth: 1, walkSpeed: 1, clickBonus: 0, awakenBonus: 0, prayerMult: 1, expeditionSpeed: 1 },
    legacy: { cycles: 0, stones: [], bonuses: {} }, // arv fra tidligere sykluser (OPUS-01); påvirker ikke startverdenen
    nodes: [], buildings: [], humans: [], siteMisses: {}, // OPUS-11: husker mislykkede tomtesøk (se construction.js)
    milestones: {}, unlocks: { zoomArea: false, villageView: false },
    timers: { seed: B.tree.seedIntervalSeconds, wearDecay: 0, roles: 0 },
    exploration: { nextAt: Infinity, activeId: null },
    stats: { log: [], autoStart: null },
    wear: { cell, cols, rows, data: new Float32Array(cols * rows) },
    // Renderer-avledet økologi. Ingen ressurs- eller navigasjonstilstand ligger her;
    // revisjonen forteller bare presentasjonen når et begrenset miljølag kan oppdateres.
    ecology: { revision: 0, refreshTimer: 0 },
    events: [],
  };
  state.settlement.angleOffset = rand(rng) * Math.PI * 2;

  // Åpningsbildet: «et tre og en stein», med unge trær som synlig vokser.
  addTree(state, 'birch', C.x - 100, C.y - 22, 1);
  addRock(state, C.x + 84, C.y + 20, 28);
  addTree(state, 'spruce', C.x - 175, C.y - 95, 0.32);
  addTree(state, 'birch', C.x + 45, C.y - 120, 0.12);
  addTree(state, 'spruce', C.x + 205, C.y - 70, 0.7);

  // Landskapet (OPUS-11): vann, soner og natur genereres biomstyrt og deterministisk (src/sim/landscape.js).
  generateGeography(state, rng, biome);
  populateLandscape(state, rng, biome, { addTree, addRock, isFreeForTree });
  // Ressursgeografi (OPUS-11): hver malm og kullet har flere begrensede årer. Den nærmeste ligger innen rekkevidde,
  // de neste lenger ute i hver sin retning; hvert frø har sin egen rikdom per mineral. Ingen forekomst er uendelig.
  if (!remote) placeVeins(state, rng); // fjerne land får sine forekomster fra regionens lager (regionScene.js)
  // OPUS-08: oljefeltet legges IKKE til her. Det opprettes deterministisk når petroleumskunnskapen
  // aktiveres (ensureOilField i src/sim/petroleum.js). Slik er verdenen før det identisk med tidligere spill.
  return state;
}
