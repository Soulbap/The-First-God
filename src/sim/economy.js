// Inkrementell økonomi: kostnader, krav, kjøp og effekter. Ingen UI- eller tegnelogikk.
import { UPGRADES, upgradeById } from '../data/upgrades.js';
import { findBuildSite, startConstruction } from './construction.js';
import { spawnHumans } from './population.js';

export const upgradeCount = (state, id) => state.upgrades[id] || 0;

export function builtCount(state, types) {
  const arr = Array.isArray(types) ? types : [types];
  return state.buildings.filter((b) => b.complete && arr.includes(b.type)).length;
}

export function requirementMet(state, req) {
  if (req.all) return req.all.every((r) => requirementMet(state, r));
  if (req.upgrade) return upgradeCount(state, req.upgrade) > 0;
  if (req.built) return builtCount(state, req.built) > 0;
  if (req.builtCount) return builtCount(state, req.builtCount.types) >= req.builtCount.n;
  if (req.people) return state.humans.length >= req.people;
  if (req.gathered) return state.totals.wood + state.totals.stone >= req.gathered;
  if (req.noPending) return !state.buildings.some((b) => b.type === req.noPending && !b.complete);
  return false;
}

export function currentCost(state, def) {
  const g = def.costGrowth ? Math.pow(def.costGrowth, upgradeCount(state, def.id)) : 1;
  const out = {};
  for (const [k, v] of Object.entries(def.cost)) out[k] = Math.round(v * g);
  return out;
}

export const canAfford = (state, cost) => Object.entries(cost).every(([k, v]) => state.resources[k] >= v);

// 'locked' | 'unaffordable' | 'available' | 'building' | 'done'
export function upgradeStatus(state, def) {
  if (state.buildings.some((b) => b.source === def.id && !b.complete)) return 'building';
  const max = def.max || 1;
  if (upgradeCount(state, def.id) >= max) return 'done';
  if (!def.requires.every((r) => requirementMet(state, r))) return 'locked';
  return canAfford(state, currentCost(state, def)) ? 'available' : 'unaffordable';
}

export function purchase(state, id) {
  const def = upgradeById(id);
  if (!def) return { ok: false, reason: 'unknown' };
  const status = upgradeStatus(state, def);
  if (status !== 'available') return { ok: false, reason: status };
  for (const a of def.actions) {
    if (a.type === 'construct' && !findBuildSite(state, a.building)) return { ok: false, reason: 'noSite' };
  }
  const cost = currentCost(state, def);
  for (const [k, v] of Object.entries(cost)) state.resources[k] -= v;
  state.upgrades[id] = upgradeCount(state, id) + 1;
  for (const a of def.actions) applyAction(state, def, a);
  state.events.push({ type: 'purchased', id, cost });
  return { ok: true };
}

function applyAction(state, def, a) {
  if (a.type === 'construct') startConstruction(state, a.building, { onComplete: a.onComplete || null, source: def.id });
  else if (a.type === 'spawnHumans') spawnHumans(state, a.count, { at: a.at });
  else if (a.type === 'modify') {
    if (a.mult) state.modifiers[a.key] *= a.mult;
    if (a.add) state.modifiers[a.key] += a.add;
  }
}

export const allUpgrades = () => UPGRADES;
