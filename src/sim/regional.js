// Regional forsyningsmodell for flere bosettinger: felles beholdning, men hver levering
// reserveres ved avreise og blir først tilgjengelig for et lokalt prosjekt ved ankomst.
// Hovedstaden (første bosetting) sender; hver ny bosetting bygger etter en plan som følger
// stedets forhold (skog, stein, jord). Handelsruter vokser ut av faktiske reiser.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, siteIsValid } from './construction.js';
import { spawnHumans } from './population.js';
import { settlementById, completedHomesOf, housingCapacity } from './settlements.js';
import { storyRoute } from './story.js';

export { settlementStage, settlementRole, localCapacity } from './settlements.js';

const projectDefs = [
  { id: 'second_storage', type: 'storage', cost: { wood: 14, stone: 8 } },
  { id: 'second_home', type: 'hut', cost: { wood: 20, stone: 12 } },
  { id: 'second_hearth', type: 'hearth', cost: { wood: 12, stone: 16 } },
  { id: 'second_field', type: 'field', cost: { wood: 18, stone: 6 } },
  { id: 'second_workshop', type: 'workshop', cost: { wood: 22, stone: 18 } },
];

// Planer for senere bosettinger: samme byggeflyt, men tilpasset stedets art.
const KIND_PLANS = {
  forest: [['storage', { wood: 14, stone: 8 }], ['hut', { wood: 20, stone: 12 }], ['sawmill', { wood: 30, stone: 18, planks: 4 }], ['hut', { wood: 20, stone: 12 }]],
  stone: [['storage', { wood: 14, stone: 8 }], ['hut', { wood: 20, stone: 12 }], ['mason', { wood: 24, stone: 30, planks: 3 }], ['hut', { wood: 20, stone: 12 }]],
  farm: [['storage', { wood: 14, stone: 8 }], ['hut', { wood: 20, stone: 12 }], ['field', { wood: 18, stone: 6 }], ['hut', { wood: 20, stone: 12 }]],
};
export const planFor = (id, kind) => (KIND_PLANS[kind] || KIND_PLANS.farm).map(([type, cost], i) => ({ id: `${id}_${type}_${i}`, type, cost: { ...cost } }));

const planOf = (state, S) => (S.id === 'second' ? projectDefs : S.plan || []);

export function localSite(state, type, S, ordinal) {
  const a0 = 0.7 + ordinal * 1.9;
  for (let r = 72; r < 230; r += 14) for (let k = 0; k < 16; k++) {
    const a = a0 + k / 16 * Math.PI * 2;
    const x = S.x + Math.cos(a) * r, y = S.y + Math.sin(a) * r * 0.68;
    if (siteIsValid(state, type, x, y)) return { x, y };
  }
  return null;
}

export const deliveryAmount = (state) =>
  B.human.regionalDelivery + (state.modifiers.regionalCarry || 0) + (state.buildings.some((b) => b.complete && b.type === 'market') ? 2 : 0);

// ---------- Handelsruter: oppstår av faktiske turer ----------
export const routeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function recordTrip(state, from, to, goods, amount) {
  if (from === to) return;
  const N = state.network, key = routeKey(from, to);
  const r = N.routes[key] || (N.routes[key] = { a: from < to ? from : to, b: from < to ? to : from, trips: 0, goods: {}, established: false, lastAt: 0 });
  r.trips++; r.lastAt = state.time; r.goods[goods] = (r.goods[goods] || 0) + amount;
  N.trips++;
  if (!r.established && r.trips >= B.realm.routeEstablishedTrips) {
    r.established = true;
    const A = settlementById(state, r.a), Bs = settlementById(state, r.b);
    state.events.push({ type: 'routeEstablished', a: r.a, b: r.b, x: ((A?.x ?? 0) + (Bs?.x ?? 0)) / 2, y: ((A?.y ?? 0) + (Bs?.y ?? 0)) / 2 });
    if (A && Bs) storyRoute(state, A, Bs);
  }
}
export const establishedRoutes = (state) => Object.values(state.network.routes).filter((r) => r.established);

function activateProject(state, S, def) {
  const R = state.region;
  if (R.projects[S.id] || state.buildings.some((b) => b.source === def.id)) return;
  R.projects[S.id] = { ...def, settlementId: S.id, delivered: Object.fromEntries(Object.keys(def.cost).map((k) => [k, 0])), startedAt: state.time };
  state.events.push({ type: 'regionalProject', id: def.id, x: S.x, y: S.y });
}

function queueNeed(state, p) {
  const amountMax = deliveryAmount(state);
  for (const [type, need] of Object.entries(p.cost)) {
    const outstanding = state.region.deliveries.filter((d) => d.project === p.id && d.type === type && d.status !== 'done' && d.status !== 'cancelled').reduce((n, d) => n + d.amount, 0);
    const missing = need - p.delivered[type] - outstanding;
    if (missing > 0 && state.resources[type] >= Math.min(missing, amountMax)) {
      state.region.deliveries.push({ id: state.nextId++, project: p.id, type, amount: Math.min(missing, amountMax), status: 'queued', source: 'first', destination: p.settlementId, createdAt: state.time, carrierId: null });
    }
  }
}

function finishProject(state, p) {
  const S = settlementById(state, p.settlementId);
  if (!S || Object.entries(p.cost).some(([k, n]) => p.delivered[k] < n)) return;
  const site = localSite(state, p.type, S, S.projectsDone || 0);
  if (!site) return;
  const b = startConstruction(state, p.type, { source: p.id, site, settlementId: S.id, onComplete: p.type === 'hut' ? { regionalPopulation: 1 } : null });
  if (b) { state.region.completedProjects++; S.projectsDone = (S.projectsDone || 0) + 1; delete state.region.projects[S.id]; }
}

export function beginDelivery(state, h) {
  // Beholdningen kan ha blitt brukt siden leveransen ble satt i kø: bær bare det som faktisk finnes (aldri negativ).
  const d = state.region?.deliveries.find((q) => q.status === 'queued' && state.resources[q.type] >= q.amount);
  if (!d || h.settlementId !== 'first') return false;
  d.status = 'reserved'; d.carrierId = h.id; state.resources[d.type] -= d.amount;
  state.region.reserved[d.type] += d.amount;
  h.regionalDeliveryId = d.id; h.targetId = null;
  h.tx = state.stockpile.x; h.ty = state.stockpile.y + 10; h.state = 'toDeliveryPickup';
  return true;
}

export function pickupDelivery(state, h) {
  const d = state.region.deliveries.find((q) => q.id === h.regionalDeliveryId);
  const S = d && settlementById(state, d.destination);
  if (!d || !S || d.status !== 'reserved') return cancelDelivery(state, h);
  d.status = 'traveling'; h.carry = { type: d.type, amount: d.amount };
  h.tx = S.x + (d.type === 'wood' || d.type === 'planks' ? -18 : 18); h.ty = S.y + 24; h.state = 'toDeliver';
}

export function completeDelivery(state, h) {
  const d = state.region.deliveries.find((q) => q.id === h.regionalDeliveryId);
  if (!d || d.status !== 'traveling') return cancelDelivery(state, h);
  const p = state.region.projects[d.destination];
  if (p?.id === d.project) p.delivered[d.type] += d.amount;
  state.region.reserved[d.type] = Math.max(0, state.region.reserved[d.type] - d.amount);
  d.status = 'done'; state.region.completedDeliveries++; h.carry = { type: null, amount: 0 }; h.regionalDeliveryId = null;
  recordTrip(state, 'first', d.destination, d.type, d.amount);
  state.events.push({ type: 'regionalDelivery', x: h.x, y: h.y, resource: d.type, amount: d.amount });
}

export function cancelDelivery(state, h) {
  const d = state.region?.deliveries.find((q) => q.id === h.regionalDeliveryId);
  if (d && d.status !== 'done' && d.status !== 'cancelled') { state.resources[d.type] += d.amount; state.region.reserved[d.type] = Math.max(0, state.region.reserved[d.type] - d.amount); d.status = 'cancelled'; }
  h.regionalDeliveryId = null; h.carry = { type: null, amount: 0 };
}

function gateOpen(state, def) {
  return (def.type !== 'field' || state.civilization.foodUnlocked) && (def.type !== 'workshop' || state.civilization.exchangeUnlocked);
}

const MAX_PARALLEL = 2;

export function stepRegional(state, dt) {
  const R = state.region; if (!R?.enabled || !state.expansion.founded) return;
  for (const S of state.settlements) {
    if (S.id === 'first' || S.state !== 'active' || R.projects[S.id]) continue;
    if (Object.keys(R.projects).length >= MAX_PARALLEL) break;
    const next = planOf(state, S)[S.projectsDone || 0];
    if (next && gateOpen(state, next)) activateProject(state, S, next);
  }
  for (const p of Object.values(R.projects)) queueNeed(state, p);
  for (const p of Object.values({ ...R.projects })) finishProject(state, p);
  // Hold leveringsloggen kort: ferdige og avbrutte poster trengs ikke lenger.
  if (R.deliveries.length > 80) R.deliveries = R.deliveries.filter((d) => d.status !== 'done' && d.status !== 'cancelled');

  // Tidlig vekst (før mat finnes): én innbygger om gangen i en bosetting med ledige hjem.
  if (R.populationUnlocked && !state.civilization.foodUnlocked && state.time >= R.nextPopulationAt) {
    for (const S of state.settlements) {
      if (S.id === 'first' || S.population.length >= housingCapacity(state, S.id)) continue;
      const home = completedHomesOf(state, S.id)[0];
      if (!home) continue;
      spawnHumans(state, 1, { at: 'shelter', building: home, settlementId: S.id });
      R.nextPopulationAt = state.time + B.human.regionalPopulationSeconds;
      break;
    }
  }
}
