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

export function discoverMinerals(state) {
  if (!materialEnabled(state)) return;
  const mine = state.nodes.find((n) => n.kind === 'mineral' && n.amount > 0 && !n.discovered);
  if (!mine) return;
  mine.discovered = true;
  state.events.push({ type: 'mineralDiscovered', mineral: mine.mineral, x: mine.x, y: mine.y });
}

function buildWhenReady(state, type, cost) {
  if (has(state, type) || pending(state, type) || !affordable(state, cost) || !findBuildSite(state, type)) return false;
  spend(state, cost); startConstruction(state, type, { source: `materials:${type}` });
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

export function harvestMineral(state, node, amount = 1) {
  if (!materialEnabled(state) || !node || node.kind !== 'mineral' || node.amount <= 0) return 0;
  if (node.mineral === 'coal' && (!state.industrial?.enabled || !state.buildings.some((b) => b.complete && b.type === 'coal_mine'))) return 0;
  const got = Math.min(amount, node.amount); node.amount -= got; node.stone = node.amount; node.discovered = true;
  return got;
}

export function stepMaterials(state, dt) {
  if (!materialEnabled(state)) return;
  discoverMinerals(state);
  // Infrastruktur er en konsekvens av kunnskap og ekte lokale ressurser, aldri
  // en direkte byggordre fra spilleren.
  if (state.nodes.some((n) => n.kind === 'mineral' && n.discovered && n.amount > 0)) buildWhenReady(state, 'mine', M.mineReserve);
  if (has(state, 'mine')) buildWhenReady(state, 'charcoal_kiln', M.kilnReserve);
  if (has(state, 'charcoal_kiln') && (state.resources.copperOre > 0 || state.resources.tinOre > 0 || state.resources.ironOre > 0)) buildWhenReady(state, 'smelter', M.smelterReserve);
  for (const b of state.buildings) {
    if (b.type === 'charcoal_kiln') cycle(state, b, { in: { wood: M.charcoal.wood }, out: 'charcoal', amount: M.charcoal.out, seconds: M.charcoal.seconds }, dt);
    if (b.type === 'smelter') {
      if (state.resources.copperOre >= M.copper.ore) cycle(state, b, { in: { copperOre: M.copper.ore, charcoal: M.copper.fuel }, out: 'copper', amount: M.copper.out, seconds: M.copper.seconds }, dt);
      else if (state.resources.copper >= M.bronze.copper && state.resources.tinOre >= M.bronze.tin) cycle(state, b, { in: { copper: M.bronze.copper, tinOre: M.bronze.tin, charcoal: M.bronze.fuel }, out: 'bronze', amount: M.bronze.out, seconds: M.bronze.seconds }, dt);
      else if (state.materials.ironworking && state.resources.ironOre >= M.iron.ore) cycle(state, b, { in: { ironOre: M.iron.ore, charcoal: M.iron.fuel }, out: 'iron', amount: M.iron.out, seconds: M.iron.seconds }, dt);
    }
  }
  state.materials.toolTier = state.resources.iron > 0 ? 'jern' : state.resources.bronze > 0 ? 'bronse' : 'stein';
  state.materials.gatherBonus = state.materials.toolTier === 'jern' ? 1.35 : state.materials.toolTier === 'bronse' ? 1.18 : 1;
}

export function enableMaterials(state, { ironworking = false } = {}) {
  state.materials.enabled = true;
  if (ironworking) state.materials.ironworking = true;
}
