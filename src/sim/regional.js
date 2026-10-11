// Regional forsyningsmodell for flere bosettinger. Hovedstadens lager er `state.resources`; hver ny bosetting har sitt
// eget lager (`settlement.stock`, OPUS-11). En levering trekkes fra hovedstaden ved avreise, er i transitt (reservert),
// og havner først i bosettingens eget lager ved ankomst. Prosjekter bruker bare det lokale lageret.
// Hovedstaden (første bosetting) sender; hver ny bosetting bygger etter en plan som følger
// stedets forhold (skog, stein, jord). Handelsruter vokser ut av faktiske reiser.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, siteIsValid } from './construction.js';
import { spawnHumans } from './population.js';
import { settlementById, completedHomesOf, housingCapacity } from './settlements.js';
import { storyRoute } from './story.js';
import { beginRenovation } from './renovation.js';

export { settlementStage, settlementRole, localCapacity } from './settlements.js';

const projectDefs = [
  { id: 'second_storage', type: 'storage', cost: { wood: 14, stone: 8 } },
  { id: 'second_home', type: 'hut', cost: { wood: 20, stone: 12 } },
  { id: 'second_hearth', type: 'hearth', cost: { wood: 12, stone: 16 } },
  { id: 'second_field', type: 'field', cost: { wood: 18, stone: 6 } },
  { id: 'second_workshop', type: 'workshop', cost: { wood: 22, stone: 18 } },
  { id: 'second_field2', type: 'field', cost: { wood: 18, stone: 6 } }, // OPUS-02: Lysningen er en matbygd — flere åkre
];

// Planer for senere bosettinger: samme byggeflyt, men tilpasset stedets art.
const KIND_PLANS = {
  forest: [['storage', { wood: 14, stone: 8 }], ['hut', { wood: 20, stone: 12 }], ['sawmill', { wood: 30, stone: 18, planks: 4 }], ['hut', { wood: 20, stone: 12 }]],
  stone: [['storage', { wood: 14, stone: 8 }], ['hut', { wood: 20, stone: 12 }], ['mason', { wood: 24, stone: 30, planks: 3 }], ['hut', { wood: 20, stone: 12 }]],
  farm: [['storage', { wood: 14, stone: 8 }], ['hut', { wood: 20, stone: 12 }], ['field', { wood: 18, stone: 6 }], ['hut', { wood: 20, stone: 12 }], ['field', { wood: 18, stone: 6 }]],
};
export const planFor = (id, kind) => (KIND_PLANS[kind] || KIND_PLANS.farm).map(([type, cost], i) => ({ id: `${id}_${type}_${i}`, type, cost: { ...cost } }));

// Landforbindelse mellom to bosettinger innen en rekkevidde: ikke over vann (tjernet/innsjøer). Brukes av lastebiler og veier.
export function landLink(s, a, b, maxDistance) {
  const A = settlementById(s, a), C = settlementById(s, b); if (!A || !C || a === b) return false;
  const d = Math.hypot(A.x - C.x, A.y - C.y);
  return d <= maxDistance && !((A.x - s.world.pond.x) * (C.x - s.world.pond.x) < 0 && Math.abs((A.y + C.y) / 2 - s.world.pond.y) < s.world.pond.ry);
}
// Lastebil overtar transporten til en bosetting når den kan: motorvogner finnes, drivstoff er der og landforbindelsen holder.
// Da bestilles ingen bærere (folk bruker tiden på annet arbeid), og lastebilen henter det prosjektet mangler.
const trucksServe = (state, id) => {
  const I = state.industrial, R = B.combustion.road;
  return !!I?.roads && (state.resources.truck || 0) >= 1 && (state.resources.fuel || 0) >= R.fuelPerTrip && landLink(state, 'first', id, R.maxDistance);
};

const planOf = (state, S) => (S.id === 'second' ? projectDefs : S.plan || []);

// Bosettingens lager (OPUS-11). Hovedstaden bruker det delte hjemmelageret; satellittene har eget lager som bare fylles av leveranser.
export const stockOf = (state, S, type) => (S?.id === 'first' ? state.resources[type] : S?.stock?.[type]) || 0;
export function stockAdd(S, type, amount) { S.stock ??= {}; S.stock[type] = (S.stock[type] || 0) + amount; }
// Varer underveis til en bosetting med motorvogn (ikke ennå i lageret).
const truckTransit = (state, id, type) => (state.industrial?.shipments || []).filter((q) => q.mode === 'road' && q.to === id && q.type === type && q.status === 'traveling').reduce((n, q) => n + q.amount, 0);
const carrierTransit = (state, id, type) => state.region.deliveries.filter((d) => d.destination === id && d.type === type && d.status !== 'done' && d.status !== 'cancelled').reduce((n, d) => n + d.amount, 0);
// Hva prosjektene i satellittbosettingene fortsatt mangler (stedets lager + det som er underveis er trukket fra).
export function projectNeeds(state) {
  const needs = [];
  for (const p of Object.values(state.region?.projects || {})) {
    const S = settlementById(state, p.settlementId); if (!S) continue;
    for (const [type, need] of Object.entries(p.cost)) {
      const missing = need - stockOf(state, S, type) - carrierTransit(state, S.id, type) - truckTransit(state, S.id, type);
      if (missing > 0) needs.push({ settlementId: S.id, type, missing });
    }
  }
  return needs;
}

// Tomtesøk for en ny bosetting. Søket er deterministisk, men dyrt når ringen er full; derfor huskes en mislykket
// søkning (gjelder bare så lenge verdens oppsett er uendret), og neste forsøk søker bredere i stedet for å gjenta det samme.
// Hurtigbufferen er ren ytelse: nøkkelen dekker alt siteIsValid leser (bygg og noder legges bare til med nye id-er).
export const siteSearchStats = { searches: 0, skipped: 0 };
const layoutSig = (state) => `${state.nextId}|${state.buildings.length}|${state.nodes.length}`;

export function localSite(state, type, S, ordinal) {
  const misses = (state.siteMisses ??= {});
  const key = `local|${S.id}|${type}|${ordinal}`;
  const m = misses[key];
  const sig = layoutSig(state);
  if (m && m.sig === sig && state.time < m.retryAt) { siteSearchStats.skipped++; return null; }
  const attempts = m && m.sig === sig ? m.attempts : 0; // endret verden: begynn på nytt
  const maxR = 230 + 40 * Math.min(attempts, 8); // ingen fastlåsing: hvert mislykket forsøk utvider ringen
  siteSearchStats.searches++;
  const a0 = 0.7 + ordinal * 1.9;
  for (let r = 72; r < maxR; r += 14) for (let k = 0; k < 16; k++) {
    const a = a0 + k / 16 * Math.PI * 2;
    const x = S.x + Math.cos(a) * r, y = S.y + Math.sin(a) * r * 0.68;
    if (siteIsValid(state, type, x, y, S.id)) { delete misses[key]; return { x, y }; }
  }
  misses[key] = { sig, attempts: attempts + 1, retryAt: state.time + 4 * (attempts + 1) };
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
  R.projects[S.id] = { ...def, settlementId: S.id, startedAt: state.time };
  state.events.push({ type: 'regionalProject', id: def.id, x: S.x, y: S.y });
}

function queueNeed(state, p) {
  const amountMax = deliveryAmount(state), S = settlementById(state, p.settlementId);
  for (const [type, need] of Object.entries(p.cost)) {
    const missing = need - stockOf(state, S, type) - carrierTransit(state, p.settlementId, type) - truckTransit(state, p.settlementId, type);
    if (missing > 0 && !trucksServe(state, p.settlementId) && state.resources[type] >= Math.min(missing, amountMax)) {
      state.region.deliveries.push({ id: state.nextId++, project: p.id, type, amount: Math.min(missing, amountMax), status: 'queued', source: 'first', destination: p.settlementId, createdAt: state.time, carrierId: null });
    }
  }
}

function finishProject(state, p) {
  const S = settlementById(state, p.settlementId);
  if (!S || Object.entries(p.cost).some(([k, n]) => stockOf(state, S, k) < n)) return;
  if (p.renovation) { // ombygging av et eksisterende hjem: materialene brukes fra bosettingens lager, ingen ny tomt
    const b = state.buildings.find((q) => q.id === p.renovation.buildingId);
    for (const [k, n] of Object.entries(p.cost)) S.stock[k] -= n;
    if (b && !b.renovation) beginRenovation(state, b, p.renovation.to); else for (const [k, n] of Object.entries(p.cost)) S.stock[k] += n; // bygget er borte: varene blir liggende
    delete state.region.projects[S.id];
    return;
  }
  const site = localSite(state, p.type, S, S.projectsDone || 0);
  if (!site) return;
  const b = startConstruction(state, p.type, { source: p.id, site, settlementId: S.id, onComplete: p.type === 'hut' ? { regionalPopulation: 1 } : null });
  if (b) { for (const [k, n] of Object.entries(p.cost)) S.stock[k] -= n; state.region.completedProjects++; if (!p.urban) S.projectsDone = (S.projectsDone || 0) + 1; delete state.region.projects[S.id]; }
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
  const S = settlementById(state, d.destination);
  if (S) stockAdd(S, d.type, d.amount);
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
