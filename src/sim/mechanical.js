// OPUS-06: lokal, deterministisk mekanisk kraft. Møller er kraftkilder med
// begrenset kapasitet for sin bosetting – aldri et magisk globalt energinett.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, siteIsValid, memoSearch } from './construction.js';
import { inPond, dist } from './world.js';
import { settlementById } from './settlements.js';
import { watersOf } from './landscape.js';
import { invHas, invPay, invOf } from './inventory.js';
import { chronicle } from './chronicle.js';

const done = (s, type, id) => s.buildings.some((b) => b.type === type && b.complete && (id == null || (b.settlementId || 'first') === id));
const pending = (s, type, id) => s.buildings.some((b) => b.type === type && !b.complete && (id == null || (b.settlementId || 'first') === id));
const afford = (s, cost) => Object.entries(cost).every(([k, n]) => (s.resources[k] || 0) >= n);
const spend = (s, cost) => { for (const [k, n] of Object.entries(cost)) s.resources[k] -= n; };

// Verdiene er stabile per seed og posisjon. Vann henter også verdi fra den faktiske dammen;
// vind avledes av seed/koordinater uten flimmer eller per-frame tilfeldighet.
export function waterSuitability(state, x, y) {
  // Møllehuset står tørt, like utenfor den visuelle vannkanten (hovedtjernet eller en innsjø). 1,45 matcher
  // konstruksjonens klareringsmargin, slik at et gyldig hjul aldri havner i vannet.
  let best = 0;
  for (const p of watersOf(state)) {
    const edge = Math.abs(Math.hypot((x - p.x) / p.rx, (y - p.y) / p.ry) - 1.45);
    const v = edge < 0.22 && !inPond(state, x, y, -8) ? Math.max(0, 1 - edge / 0.22) : 0;
    if (v > best) best = v;
  }
  return best;
}
export function windSuitability(state, x, y) {
  const n = Math.sin((state.seed * 0.013 + x * 0.017 + y * 0.021)) * 43758.5453;
  return 0.35 + (n - Math.floor(n)) * 0.65;
}

// OPUS-12: vannhjulet står ved vann i NÆRHETEN av sin egen bosetting (tidligere kunne en satellitts vannmølle havne ved hovedtjernet).
const waterSite = (state, S) => memoSearch(state, `mill|water|${S.id}`, () => {
  const waters = watersOf(state).filter((w) => Math.hypot(w.x - S.x, w.y - S.y) < 620).sort((a, b) => Math.hypot(a.x - S.x, a.y - S.y) - Math.hypot(b.x - S.x, b.y - S.y));
  for (const p of waters) for (let i = 0; i < 40; i++) {
    const a = state.settlement.angleOffset + i / 40 * Math.PI * 2;
    const x = p.x + Math.cos(a) * (p.rx + 60), y = p.y + Math.sin(a) * (p.ry + 38);
    if (waterSuitability(state, x, y) >= .55 && siteIsValid(state, 'watermill', x, y)) return { x, y };
  }
  return null;
});
// Vindmøllen søker stadig lenger ut for hvert mislykket forsøk (OPUS-11), så en trang bygd ikke blir stående uten mølle.
const windSite = (state, S) => memoSearch(state, `mill|wind|${S.id}`, (attempts) => {
  for (let r = 190; r < 460 + 60 * Math.min(attempts, 6); r += 26) for (let i = 0; i < 28; i++) {
    const a = state.settlement.angleOffset + i / 28 * Math.PI * 2;
    const x = S.x + Math.cos(a) * r, y = S.y + Math.sin(a) * r * .72;
    if (windSuitability(state, x, y) >= .66 && siteIsValid(state, 'windmill', x, y)) return { x, y };
  }
  return null;
});

function makeComponents(state, dt) {
  const M = state.mechanical, workshop = state.buildings.find((b) => b.complete && b.type === 'workshop');
  if (!workshop || state.resources.mechanicalComponents >= 12) return;
  // Vedlikeholdet bruker bronse når jernet er knapt (OPUS-11): jern trengs til bygg og maskiner i industrikjeden.
  const R = state.resources, metal = R.iron > 0 && (R.iron >= B.mechanical.ironReserve || R.bronze <= 0) ? 'iron' : R.bronze > 0 ? 'bronze' : null;
  if (!metal || state.resources.wood < B.mechanical.components.wood) return;
  workshop.mechanicalCycle = (workshop.mechanicalCycle || 0) + dt;
  if (workshop.mechanicalCycle < B.mechanical.components.seconds) return;
  workshop.mechanicalCycle = 0;
  state.resources.wood -= B.mechanical.components.wood;
  state.resources[metal] -= B.mechanical.components.metal;
  state.resources.mechanicalComponents += B.mechanical.components.out;
  state.totals.mechanicalComponents += B.mechanical.components.out;
  M.componentsMade++;
  state.events.push({ type: 'mechanicalComponents', x: workshop.x, y: workshop.y });
}

function demandFor(state, id) {
  return state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === id && ['sawmill', 'mason', 'field'].includes(b.type)).length;
}
// Mølletomt for et regionalt prosjekt (brukes av regional.js når materialene er levert til bosettingens lager).
export const millSite = (state, S, type) => (type === 'watermill' ? waterSite(state, S) : windSite(state, S));
export const MILL_TYPES = ['watermill', 'windmill'];

function buildMill(state, S) {
  const demand = demandFor(state, S.id);
  if (demand < B.mechanical.minDemand || done(state, 'watermill', S.id) || done(state, 'windmill', S.id) || pending(state, 'watermill', S.id) || pending(state, 'windmill', S.id)) return;
  const R = state.region;
  if (S.id !== 'first') {
    // En satellitt betaler møllen fra sitt eget lager: materialene bestilles som et regionalt prosjekt og leveres (bærere, lastebil eller jernbane).
    if (!R?.enabled || R.projects[S.id]) return;
    const type = waterSite(state, S) ? 'watermill' : 'windmill';
    R.projects[S.id] = { id: `mill:${type}:${S.id}`, type, cost: { ...B.mechanical[type] }, settlementId: S.id, urban: true, startedAt: state.time };
    return;
  }
  // Sjekk først om en mølle i det hele tatt kan betales, så tomtesøket ikke kjøres i hvert steg uten å kunne bygge.
  if (!afford(state, B.mechanical.watermill) && !afford(state, B.mechanical.windmill)) return;
  const water = waterSite(state, S);
  const type = water ? 'watermill' : 'windmill', site = water || windSite(state, S), cost = B.mechanical[type];
  if (!site || !afford(state, cost)) return;
  spend(state, cost); startConstruction(state, type, { source: `mechanical:${type}`, site, settlementId: S.id });
}

function operate(state, b, dt) {
  const suitability = b.type === 'watermill' ? waterSuitability(state, b.x, b.y) : windSuitability(state, b.x, b.y);
  b.reliability = b.reliability == null ? 1 : b.reliability;
  const powered = suitability * b.reliability;
  b.availablePower = B.mechanical.power * powered;
  b.active = powered > .2;
  if (!b.active) { b.idle = 'svak naturkraft'; return 0; }
  b.idle = null; b.wear = (b.wear || 0) + B.mechanical.wearPerSecond * powered * dt;
  const owner = b.settlementId || 'first';
  if (b.wear >= B.mechanical.repairAt && invHas(state, owner, B.mechanical.repair)) {
    invPay(state, owner, B.mechanical.repair); b.wear = 0; b.reliability = Math.min(1, b.reliability + .18); state.mechanical.repairs++;
  } else if (b.wear >= B.mechanical.repairAt) b.reliability = Math.max(.55, b.reliability - dt * .004);
  return b.availablePower;
}

export function mechanicalMultiplier(state, settlementId, type) {
  const M = state.mechanical;
  if (!M?.enabled || !['sawmill', 'mason'].includes(type)) return 1;
  const supply = state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === settlementId && ['watermill', 'windmill'].includes(b.type)).reduce((n, b) => n + (b.availablePower || 0), 0);
  return supply >= 1 ? B.mechanical.craftMultiplier : 1;
}
export function mechanicalFoodMultiplier(state, settlementId) {
  if (!state.mechanical?.enabled) return 1;
  const supply = state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === settlementId && ['watermill', 'windmill'].includes(b.type)).reduce((n, b) => n + (b.availablePower || 0), 0);
  return supply >= 1 ? B.mechanical.foodMultiplier : 1;
}

export function enableMechanical(state) {
  state.mechanical.enabled = true;
  const S = settlementById(state, 'first');
  state.mechanical.waterSuitability = waterSuitability(state, state.world.pond.x + state.world.pond.rx + 60, state.world.pond.y);
  state.mechanical.windSuitability = windSuitability(state, S.x + 250, S.y);
}

export function stepMechanical(state, dt) {
  if (!state.mechanical?.enabled) return;
  makeComponents(state, dt);
  for (const S of state.settlements.filter((s) => s.state === 'active')) buildMill(state, S);
  let supply = 0;
  for (const b of state.buildings) if (b.complete && ['watermill', 'windmill'].includes(b.type)) supply += operate(state, b, dt);
  state.mechanical.operatingPower = supply;
  state.mechanical.requiredPower = state.settlements.reduce((n, S) => n + demandFor(state, S.id), 0);
  if (supply > 0 && !state.mechanical.announced) {
    state.mechanical.announced = true;
    const mill = state.buildings.find((b) => b.complete && ['watermill', 'windmill'].includes(b.type));
    chronicle(state, 'mechanical:first-power', 'work', mill.type === 'watermill' ? 'Et vannhjul driver nå landsbyens første mølle.' : 'Vindmøllen har gjort bosetningen mindre avhengig av håndkraft.', { x: mill.x, y: mill.y });
  }
}
