// Den minste regionale forsyningsmodellen: felles beholdning, men hver levering
// reserveres ved avreise og blir først tilgjengelig for et lokalt prosjekt ved ankomst.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, siteIsValid } from './construction.js';
import { dist } from './world.js';
import { spawnHumans } from './population.js';

const second = (state) => state.settlements.find((s) => s.id === 'second');
const projectDefs = [
  { id: 'second_storage', type: 'storage', cost: { wood: 14, stone: 8 } },
  { id: 'second_home', type: 'hut', cost: { wood: 20, stone: 12 } },
  { id: 'second_hearth', type: 'hearth', cost: { wood: 12, stone: 16 } },
];

export function localCapacity(state, settlementId) {
  return state.buildings.filter((b) => b.complete && b.settlementId === settlementId && (b.type === 'hut' || b.type === 'shelter')).length * B.settlement.localHomeCapacity;
}

function localSite(state, type, S, ordinal) {
  const a0 = 0.7 + ordinal * 1.9;
  for (let r = 72; r < 210; r += 14) for (let k = 0; k < 16; k++) {
    const a = a0 + k / 16 * Math.PI * 2;
    const x = S.x + Math.cos(a) * r, y = S.y + Math.sin(a) * r * 0.68;
    if (siteIsValid(state, type, x, y)) return { x, y };
  }
  return null;
}

function activateProject(state, def) {
  const S = second(state); if (!S || state.region.project || state.buildings.some((b) => b.source === def.id)) return;
  state.region.project = { ...def, delivered: { wood: 0, stone: 0 }, startedAt: state.time };
  state.events.push({ type: 'regionalProject', id: def.id, x: S.x, y: S.y });
}

function queueNeed(state) {
  const p = state.region.project;
  if (!p) return;
  for (const [type, need] of Object.entries(p.cost)) {
    const outstanding = state.region.deliveries.filter((d) => d.project === p.id && d.type === type && d.status !== 'done').reduce((n, d) => n + d.amount, 0);
    const missing = need - p.delivered[type] - outstanding;
    if (missing > 0 && state.resources[type] >= Math.min(missing, B.human.regionalDelivery)) {
      state.region.deliveries.push({ id: state.nextId++, project: p.id, type, amount: Math.min(missing, B.human.regionalDelivery), status: 'queued', source: 'first', destination: 'second', createdAt: state.time, carrierId: null });
    }
  }
}

function finishProject(state) {
  const p = state.region.project, S = second(state); if (!p || !S) return;
  if (Object.entries(p.cost).some(([k, n]) => p.delivered[k] < n)) return;
  const site = localSite(state, p.type, S, state.region.completedProjects);
  if (!site) return;
  const b = startConstruction(state, p.type, { source: p.id, site, settlementId: 'second', onComplete: p.type === 'hut' ? { regionalPopulation: 1 } : null });
  if (b) { state.region.completedProjects++; state.region.project = null; }
}

export function beginDelivery(state, h) {
  const d = state.region?.deliveries.find((q) => q.status === 'queued');
  if (!d || h.settlementId !== 'first') return false;
  d.status = 'reserved'; d.carrierId = h.id; state.resources[d.type] -= d.amount;
  state.region.reserved[d.type] += d.amount;
  h.regionalDeliveryId = d.id; h.targetId = null;
  h.tx = state.stockpile.x; h.ty = state.stockpile.y + 10; h.state = 'toDeliveryPickup';
  return true;
}

export function pickupDelivery(state, h) {
  const d = state.region.deliveries.find((q) => q.id === h.regionalDeliveryId);
  const S = second(state);
  if (!d || !S || d.status !== 'reserved') return cancelDelivery(state, h);
  d.status = 'traveling'; h.carry = { type: d.type, amount: d.amount };
  h.tx = S.x + (d.type === 'wood' ? -18 : 18); h.ty = S.y + 24; h.state = 'toDeliver';
}

export function completeDelivery(state, h) {
  const d = state.region.deliveries.find((q) => q.id === h.regionalDeliveryId);
  if (!d || d.status !== 'traveling') return cancelDelivery(state, h);
  const p = state.region.project;
  if (p?.id === d.project) p.delivered[d.type] += d.amount;
  state.region.reserved[d.type] = Math.max(0, state.region.reserved[d.type] - d.amount);
  d.status = 'done'; state.region.completedDeliveries++; h.carry = { type: null, amount: 0 }; h.regionalDeliveryId = null;
  state.events.push({ type: 'regionalDelivery', x: h.x, y: h.y, resource: d.type, amount: d.amount });
}

export function cancelDelivery(state, h) {
  const d = state.region?.deliveries.find((q) => q.id === h.regionalDeliveryId);
  if (d && d.status !== 'done') { state.resources[d.type] += d.amount; state.region.reserved[d.type] = Math.max(0, state.region.reserved[d.type] - d.amount); d.status = 'cancelled'; }
  h.regionalDeliveryId = null; h.carry = { type: null, amount: 0 };
}

export function stepRegional(state, dt) {
  const R = state.region; if (!R?.enabled || !state.expansion.founded) return;
  const next = projectDefs[R.completedProjects]; if (!R.project && next) activateProject(state, next);
  queueNeed(state); finishProject(state);
  const S = second(state);
  if (S && R.populationUnlocked && state.time >= R.nextPopulationAt && S.population.length < localCapacity(state, 'second')) {
    const home = state.buildings.find((b) => b.complete && b.settlementId === 'second' && (b.type === 'hut' || b.type === 'shelter'));
    if (home) { spawnHumans(state, 1, { at: 'shelter', building: home, settlementId: 'second' }); R.nextPopulationAt = state.time + B.human.regionalPopulationSeconds; }
  }
}
