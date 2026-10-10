// OPUS-04: liten, autoritativ materialøkonomi. Den bruker vanlige byggere,
// lager og ressurser; ingen arbeidere eller ruter styres av spilleren.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, findBuildSite } from './construction.js';

const M = B.materials;
const has = (state, type) => state.buildings.some((b) => b.type === type && b.complete);
const pending = (state, type) => state.buildings.some((b) => b.type === type && !b.complete);
const affordable = (state, cost) => Object.entries(cost).every(([k, v]) => state.resources[k] >= v);
const spend = (state, cost) => { for (const [k, v] of Object.entries(cost)) state.resources[k] -= v; };

export const materialEnabled = (state) => !!state.materials?.enabled;
export const usableMineral = (n) => n?.kind === 'mineral' && n.amount > 0;

// Prospektering: den nærmeste åren av hvert mineral blir kjent med en gang; neste åre først når de kjente nesten er brukt opp
// (folk leter etter mer når behovet melder seg, ikke på forhånd). Olje oppdages først når petroleumskunnskapen finnes.
export function discoverMinerals(state) {
  if (!materialEnabled(state)) return;
  const seen = new Set();
  for (const n of state.nodes) {
    if (n.kind !== 'mineral' || seen.has(n.mineral)) continue;
    seen.add(n.mineral);
    if (n.mineral === 'oil' && !state.industrial?.petroleum) continue;
    const veins = state.nodes.filter((q) => q.kind === 'mineral' && q.mineral === n.mineral);
    const next = veins.find((q) => !q.discovered && q.amount > 0);
    if (!next || !veins.filter((q) => q.discovered).every((q) => q.amount <= q.maxAmount * M.prospectBelow)) continue;
    next.discovered = true;
    state.events.push({ type: 'mineralDiscovered', mineral: next.mineral, x: next.x, y: next.y });
  }
}

function buildWhenReady(state, type, cost) {
  if (has(state, type) || pending(state, type) || !affordable(state, cost)) return false;
  const site = findBuildSite(state, type);
  if (!site || !startConstruction(state, type, { source: `materials:${type}`, site })) return false;
  spend(state, cost);
  return true;
}

function cycle(state, building, recipe, dt) {
  if (!building.complete || state.humans.length < 3) return;
  building.cycle = (building.cycle || 0) - dt;
  if (building.cycle > 0) return;
  if (!Object.entries(recipe.in).every(([k, n]) => state.resources[k] >= n) || state.resources[recipe.out] >= M.storageCap) { building.idle = 'råvare eller lager'; building.cycle = 1; return; }
  for (const [k, n] of Object.entries(recipe.in)) state.resources[k] -= n;
  state.resources[recipe.out] += recipe.amount; state.totals[recipe.out] += recipe.amount;
  building.made = (building.made || 0) + recipe.amount; building.active = true; building.idle = null; building.cycle = recipe.seconds;
  state.events.push({ type: 'materialMade', resource: recipe.out, amount: recipe.amount, x: building.x, y: building.y });
}

// Kull krever en gruve, og olje pumpes bare av en brønn (src/sim/petroleum.js). Ingen av dem håndplukkes.
export function mineralHarvestable(state, node) {
  if (node.mineral === 'oil') return false;
  if (node.mineral === 'coal') return !!state.industrial?.enabled && state.buildings.some((b) => b.complete && b.type === 'coal_mine');
  return true;
}

export function harvestMineral(state, node, amount = 1) {
  if (!materialEnabled(state) || !node || node.kind !== 'mineral' || node.amount <= 0) return 0;
  if (!mineralHarvestable(state, node)) return 0;
  const got = Math.min(amount, node.amount); node.amount -= got; node.stone = node.amount; node.discovered = true;
  return got;
}

// Behovsstyrt utvinning (OPUS-11): hvert mineral har sitt eget lagermål. Folk henter det som mangler mest
// (relativt til målet), ikke bare det nærmeste. Et fullt lager av tinn skal ikke hindre at jern hentes.
export function wantedMineral(state, h = null) {
  if (!materialEnabled(state)) return null;
  const c = state.materials.wanted;
  if (c && c.t === Math.floor(state.time)) return c.kind; // gjenbrukes i samme sekund (mange folk spør samtidig)
  const kind = computeWantedMineral(state);
  state.materials.wanted = { t: Math.floor(state.time), kind };
  return kind;
}
function computeWantedMineral(state) {
  const T = M.stockTargets, ind = !!state.industrial?.enabled;
  let best = null, bestScore = 0;
  for (const kind of ['coal', 'ironOre', 'copperOre', 'tinOre']) {
    if (kind === 'coal' && !(ind && state.buildings.some((b) => b.complete && b.type === 'coal_mine'))) continue;
    const target = kind === 'ironOre' && !state.materials.ironworking ? T.ironOreEarly : T[kind];
    const have = state.resources[kind] || 0;
    if (have >= target) continue;
    if (!state.nodes.some((n) => n.kind === 'mineral' && n.mineral === kind && n.discovered && n.amount > 0)) continue;
    const score = (1 - have / target) * (T.weight[kind] || 1);
    if (score > bestScore) { bestScore = score; best = kind; }
  }
  return best;
}

export function stepMaterials(state, dt) {
  if (!materialEnabled(state)) return;
  // Prospektering og infrastrukturvalg trenger ikke kjøre i hvert 1/60-sekundssteg: én gang i sekundet er nok (ytelse, OPUS-11).
  if (state.time >= (state.materials.nextCheckAt ?? 0)) {
    state.materials.nextCheckAt = state.time + 1;
    discoverMinerals(state);
    // Infrastruktur er en konsekvens av kunnskap og ekte lokale ressurser, aldri
    // en direkte byggordre fra spilleren.
    if (state.nodes.some((n) => n.kind === 'mineral' && n.discovered && n.amount > 0)) buildWhenReady(state, 'mine', M.mineReserve);
    if (has(state, 'mine')) buildWhenReady(state, 'charcoal_kiln', M.kilnReserve);
    if (has(state, 'charcoal_kiln') && (state.resources.copperOre > 0 || state.resources.tinOre > 0 || state.resources.ironOre > 0)) buildWhenReady(state, 'smelter', M.smelterReserve);
  }
  for (const b of state.buildings) {
    if (b.type === 'charcoal_kiln') cycle(state, b, { in: { wood: M.charcoal.wood }, out: 'charcoal', amount: M.charcoal.out, seconds: M.charcoal.seconds }, dt);
    if (b.type === 'smelter') {
      // Smeltingen følger behovet: den oppskriften som er gjennomførbar og lengst unna sitt lagermål går først.
      // (Tidligere gikk kobber alltid først og hindret at jern og bronse noen gang ble laget.)
      const R = state.resources, T = M.stockTargets;
      const recipes = [
        { ok: R.copperOre >= M.copper.ore && R.copper < T.copper, recipe: { in: { copperOre: M.copper.ore, charcoal: M.copper.fuel }, out: 'copper', amount: M.copper.out, seconds: M.copper.seconds } },
        { ok: R.copper >= M.bronze.copper && R.tinOre >= M.bronze.tin && R.bronze < T.bronze, recipe: { in: { copper: M.bronze.copper, tinOre: M.bronze.tin, charcoal: M.bronze.fuel }, out: 'bronze', amount: M.bronze.out, seconds: M.bronze.seconds } },
        { ok: state.materials.ironworking && R.ironOre >= M.iron.ore && R.iron < T.iron, recipe: { in: { ironOre: M.iron.ore, charcoal: M.iron.fuel }, out: 'iron', amount: M.iron.out, seconds: M.iron.seconds } },
      ].filter((r) => r.ok).sort((a, c) => R[a.recipe.out] / T[a.recipe.out] - R[c.recipe.out] / T[c.recipe.out]);
      if (recipes.length) cycle(state, b, recipes[0].recipe, dt);
      else { b.idle = 'råvare eller lager'; b.active = false; }
    }
  }
  state.materials.toolTier = state.resources.iron > 0 ? 'jern' : state.resources.bronze > 0 ? 'bronse' : 'stein';
  state.materials.gatherBonus = state.materials.toolTier === 'jern' ? 1.35 : state.materials.toolTier === 'bronse' ? 1.18 : 1;
}

export function enableMaterials(state, { ironworking = false } = {}) {
  state.materials.enabled = true;
  if (ironworking) state.materials.ironworking = true;
}
