// Inkrementell økonomi: kostnader, krav, kjøp og effekter. Ingen UI- eller tegnelogikk.
import { UPGRADES, upgradeById } from '../data/upgrades.js';
import { findBuildSite, startConstruction } from './construction.js';
import { spawnHumans } from './population.js';
import { settlementStage, stageRank } from './settlements.js';
import { activeSettlements, distinctRoles, civilizationStage } from './civstage.js';
import { establishedRoutes } from './regional.js';
import { discoveredRegions, outpostRegions } from './worldmap.js';

export const upgradeCount = (state, id) => state.upgrades[id] || 0;

export const techCount = (state) => UPGRADES.filter((u) => u.category === 'kunnskap' && upgradeCount(state, u.id) > 0).length;

export function builtCount(state, types) {
  const arr = Array.isArray(types) ? types : [types];
  return state.buildings.filter((b) => b.complete && arr.includes(b.type)).length;
}

export function requirementMet(state, req) {
  if (req.all) return req.all.every((r) => requirementMet(state, r));
  if (req.upgrade) return upgradeCount(state, req.upgrade) > 0;
  if (req.built) return builtCount(state, req.built) > 0;
  if (req.builtCount) return builtCount(state, req.builtCount.types) >= req.builtCount.n;
  if (req.milestone) return state.milestones[req.milestone] != null;
  if (req.people) return state.humans.length >= req.people;
  if (req.gathered) return state.totals.wood + state.totals.stone >= req.gathered;
  if (req.noPending) return !state.buildings.some((b) => b.type === req.noPending && !b.complete);
  if (req.expansion) return !!state.expansion?.[req.expansion];
  if (req.delivery) return (state.region?.completedDeliveries || 0) >= req.delivery;
  if (req.regionalProjects) return (state.region?.completedProjects || 0) >= req.regionalProjects;
  if (req.foodHarvest) return (state.civilization?.foodHarvests || 0) >= req.foodHarvest;
  if (req.settlementStage) return state.settlements.some((s) => settlementStage(state, s) === req.settlementStage);
  if (req.stageMin) return state.settlements.some((s) => stageRank(settlementStage(state, s)) >= stageRank(req.stageMin));
  if (req.settlements) return activeSettlements(state).length >= req.settlements;
  if (req.roles) return distinctRoles(state) >= req.roles;
  if (req.routes) return establishedRoutes(state).length >= req.routes;
  if (req.techs) return techCount(state) >= req.techs;
  if (req.knowledge) return state.totals.knowledge >= req.knowledge;
  if (req.regions) return discoveredRegions(state).length >= req.regions;
  if (req.outposts) return outpostRegions(state).length >= req.outposts;
  if (req.caravans) return (state.globe?.stats.caravanDeliveries || 0) >= req.caravans;
  if (req.civStage) return civilizationStage(state).rank >= req.civStage;
  if (req.regionalWear) {
    const a = state.settlement.center, b = state.settlements?.find((s) => s.id === 'second');
    if (!b) return false;
    let sum = 0, n = 0;
    for (let t = 0.15; t < 0.9; t += 0.1) { const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t; const w = state.wear, i = Math.floor(y / w.cell) * w.cols + Math.floor(x / w.cell); sum += w.data[i] || 0; n++; }
    return n > 0 && sum / n >= req.regionalWear;
  }
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
    if (a.type === 'construct' && !findBuildSite(state, a.building, a.settlement || 'first')) return { ok: false, reason: 'noSite' };
  }
  const cost = currentCost(state, def);
  for (const [k, v] of Object.entries(cost)) state.resources[k] -= v;
  state.upgrades[id] = upgradeCount(state, id) + 1;
  for (const a of def.actions) applyAction(state, def, a);
  state.events.push({ type: 'purchased', id, cost });
  return { ok: true };
}

function applyAction(state, def, a) {
  if (a.type === 'construct') startConstruction(state, a.building, { onComplete: a.onComplete || null, source: def.id, settlementId: a.settlement || 'first' });
  else if (a.type === 'spawnHumans') spawnHumans(state, a.count, { at: a.at });
  else if (a.type === 'modify') {
    if (a.mult) state.modifiers[a.key] *= a.mult;
    if (a.add) state.modifiers[a.key] += a.add;
  } else if (a.type === 'enableExploration') {
    state.modifiers.exploration = true;
    state.exploration.nextAt = state.time + a.afterSeconds;
  } else if (a.type === 'enableHorizons') {
    state.expansion.enabled = true;
    state.exploration.nextAt = state.time + a.afterSeconds;
  } else if (a.type === 'beginFounding') {
    state.expansion.founding = true;
  } else if (a.type === 'enableRegion') {
    state.region.enabled = true;
  } else if (a.type === 'enableRegionalPopulation') {
    state.region.populationUnlocked = true;
    state.region.nextPopulationAt = state.time + a.afterSeconds;
  } else if (a.type === 'enableFood') {
    state.civilization.foodUnlocked = true;
    state.civilization.nextFoodAt = state.time + a.afterSeconds;
    state.civilization.nextPopulationAt = state.time + a.afterSeconds;
  } else if (a.type === 'enableExchange') {
    state.civilization.exchangeUnlocked = true;
  } else if (a.type === 'enableFounding') {
    state.realm.autoFounding = true; state.realm.limit = Math.max(state.realm.limit, a.limit);
    state.realm.nextCheckAt = state.time + a.afterSeconds;
  } else if (a.type === 'enableExpeditions') {
    state.globe.expeditionsEnabled = true; state.globe.nextMissionAt = state.time + a.afterSeconds;
  } else if (a.type === 'enableOutposts') {
    state.globe.outpostsEnabled = true;
  } else if (a.type === 'connectWorld') {
    state.globe.connected = true;
  }
}

export const allUpgrades = () => UPGRADES;
