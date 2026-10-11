// OPUS-07: kull, damp, fabrikk og jernbane er en liten videreføring av den
// eksisterende material-, kraft- og transportmodellen. Ingen spillerordre.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, findBuildSite } from './construction.js';
import { settlementById } from './settlements.js';
import { landLink, trainServes } from './regional.js';
import { invGet, invAdd, invTake } from './inventory.js';
import { recordFlow } from './trade.js';
import { chronicle } from './chronicle.js';
import { factoryPower, stepPower } from './power.js';
import { stepPetroleum } from './petroleum.js';
import { stepAviation } from './aviation.js';
import { stepScience } from './science.js';

const done = (s, type, id = null) => s.buildings.some((b) => b.complete && b.type === type && (id == null || (b.settlementId || 'first') === id));
const pending = (s, type, id = null) => s.buildings.some((b) => !b.complete && b.type === type && (id == null || (b.settlementId || 'first') === id));
const afford = (s, cost) => Object.entries(cost).every(([k, n]) => (s.resources[k] || 0) >= n);
const spend = (s, cost) => { for (const [k, n] of Object.entries(cost)) s.resources[k] -= n; };
const construct = (s, type, cost, settlementId = 'first') => {
  if (done(s, type, settlementId) || pending(s, type, settlementId) || !afford(s, cost)) return false;
  const site = findBuildSite(s, type, settlementId); if (!site) return false;
  spend(s, cost); return !!startConstruction(s, type, { source: `industrial:${type}`, site, settlementId });
};

export const coalNodes = (s) => s.nodes.filter((n) => n.kind === 'mineral' && n.mineral === 'coal' && n.amount > 0);
export const steamPowerAt = (s, settlementId) => s.buildings.filter((b) => b.complete && b.type === 'steam_engine' && (b.settlementId || 'first') === settlementId).reduce((n, b) => n + (b.availablePower || 0), 0);

// OPUS-08/coal: en dampmaskin brenner full kull bare når det finnes forbruk (fabrikk, generator, institutt eller
// lokomotiv). Ellers går den på standby, slik at kull ikke brennes opp uten nytte.
function engineDemand(s) {
  return s.buildings.some((b) => b.complete && (B.industrial.factories[b.type] || b.type === 'generator' || b.type === 'research_institute')) || s.industrial.locomotives > 0;
}

function operateEngine(s, b, dt, demand = true) {
  const I = s.industrial, cfg = B.industrial.engine;
  b.wear ??= 0; b.reliability ??= 1; b.fuelCycle ??= 0;
  const water = b.waterAvailable ?? true; // lokal brønn/dam er en eksisterende vannabstraksjon.
  const rate = demand ? cfg.coalPerSecond : cfg.standbyCoalPerSecond;
  if (!water || s.resources.coal < rate * dt) { b.availablePower = 0; b.active = false; b.idle = water ? 'kull' : 'vann'; return; }
  s.resources.coal -= rate * dt; s.industrial.coalBurned = (s.industrial.coalBurned || 0) + rate * dt;
  b.availablePower = cfg.power * b.reliability; b.active = true; b.idle = null;
  b.wear += cfg.wearPerSecond * dt;
  if (b.wear >= cfg.repairAt) {
    if (afford(s, cfg.repair)) { spend(s, cfg.repair); b.wear = 0; b.reliability = Math.min(1, b.reliability + .2); I.repairs++; }
    else b.reliability = Math.max(.45, b.reliability - dt * .006);
  }
}

function runFactory(s, b, dt) {
  const recipe = B.industrial.factories[b.type]; if (!recipe) return;
  const I = s.industrial, S = settlementById(s, b.settlementId || 'first');
  if (!S || S.population.length < B.production.minPopulation) { b.active = false; b.idle = 'folk'; return; }
  if (!Object.entries(recipe.inputs).every(([k, n]) => (s.resources[k] || 0) >= n)) { b.active = false; b.idle = 'råvare'; return; }
  if (recipe.cap && Object.entries(recipe.cap).some(([k, n]) => (s.resources[k] || 0) >= n)) { b.active = false; b.idle = 'fullt lager'; return; }
  // Mekanisk kraft først, deretter elektrisk kraft fra bosettingens kapasitet (OPUS-08).
  const power = factoryPower(s, S, recipe, dt);
  if (!power) { b.active = false; b.idle = recipe.electric ? 'kraft' : 'dampkraft'; return; }
  b.active = true; b.idle = null; b.power = power;
  b.cycle = (b.cycle || 0) + dt * (power === 'elektrisk' ? B.electric.speed : 1);
  if (b.cycle < recipe.seconds) return;
  b.cycle = 0;
  if (!Object.entries(recipe.inputs).every(([k, n]) => s.resources[k] >= n)) return;
  for (const [k, n] of Object.entries(recipe.inputs)) s.resources[k] -= n;
  for (const [k, n] of Object.entries(recipe.outputs)) { s.resources[k] += n; s.totals[k] += n; }
  b.made = (b.made || 0) + 1; I.factoryCycles++;
  s.events.push({ type: 'industrialMade', buildingType: b.type, x: b.x, y: b.y });
  chronicle(s, `industrial:factory:${b.id}`, 'work', 'En ny fabrikk har startet produksjonen.', { x: b.x, y: b.y });
}

function railwayKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }
export function validRailway(s, a, b) {
  const A = settlementById(s, a), C = settlementById(s, b); if (!A || !C || a === b) return false;
  const d = Math.hypot(A.x - C.x, A.y - C.y);
  // Ingen global teleportering eller havkryssing: bare eksisterende regionale landforbindelser.
  return d <= B.industrial.rail.maxDistance && !((A.x - s.world.pond.x) * (C.x - s.world.pond.x) < 0 && Math.abs((A.y + C.y) / 2 - s.world.pond.y) < s.world.pond.ry);
}
function makeRail(s) {
  const I = s.industrial, active = s.settlements.filter((q) => q.state === 'active');
  if (active.length < 2 || I.rails.length || !done(s, 'locomotive_workshop') || !afford(s, B.industrial.rail.cost)) return;
  const pair = active.find((a) => active.some((b) => validRailway(s, a.id, b.id))); if (!pair) return;
  const other = active.find((b) => b.id !== pair.id && validRailway(s, pair.id, b.id)); if (!other) return;
  spend(s, B.industrial.rail.cost); I.rails.push({ id: railwayKey(pair.id, other.id), a: pair.id, b: other.id, builtAt: s.time });
  construct(s, 'rail_terminal', {}, pair.id); construct(s, 'rail_terminal', {}, other.id);
  chronicle(s, `industrial:rail:${railwayKey(pair.id, other.id)}`, 'route', 'Den første jernbanen forbinder to bosetninger.', { x: (pair.x + other.x) / 2, y: (pair.y + other.y) / 2 });
}
function buildLocomotive(s) {
  const I = s.industrial; if (I.locomotives || !I.rails.length || !afford(s, B.industrial.locomotive)) return;
  spend(s, B.industrial.locomotive); I.locomotives = 1;
}
// OPUS-12 · Toget går bare når en bosetting har bestilt noe (en leveranse i kø mellom de to endene av banen), aldri «for sikkerhets skyld».
// Tidligere sendte det kull ut av og tilbake til hjemmelageret uten nytte. Bestillinger for samme vare og retning slås sammen opp til lasten;
// varen trekkes fra avsenderens lager ved avreise og havner i mottakerens lager ved ankomst.
function dispatchRail(s) {
  const I = s.industrial, rail = I.rails[0];
  if (!rail || !I.locomotives || I.shipments.some((q) => q.status === 'traveling' && q.rail)) return;
  const queued = (s.region?.deliveries || []).filter((d) => d.status === 'queued' && ((d.source === rail.a && d.destination === rail.b) || (d.source === rail.b && d.destination === rail.a)));
  const first = queued.find((d) => invGet(s, d.source, d.type) >= d.amount);
  if (!first) return;
  let amount = 0;
  for (const d of queued) {
    if (d.source !== first.source || d.destination !== first.destination || d.type !== first.type) continue;
    if (amount + d.amount > B.industrial.rail.load || invGet(s, d.source, d.type) < amount + d.amount) continue;
    amount += d.amount; d.status = 'cancelled'; d.handedTo = 'rail';
  }
  if (amount <= 0) return;
  invTake(s, first.source, first.type, amount);
  I.shipments.push({ id: s.nextId++, rail: rail.id, from: first.source, to: first.destination, type: first.type, amount, status: 'traveling', departAt: s.time, arriveAt: s.time + B.industrial.rail.travelSeconds });
}

// OPUS-08: landforbindelse for lastebiler. Samme regler som jernbanen, men kortere rekkevidde (ingen havkryssing).
export { landLink };
function roadPair(s) {
  const active = s.settlements.filter((q) => q.state === 'active');
  for (const a of active) for (const b of active) if (a.id < b.id && landLink(s, a.id, b.id, B.combustion.road.maxDistance)) return { a: a.id, b: b.id };
  return null;
}
// Lastebil: en tur bruker drivstoff og ett trekk på slitasje; verksted krever ekte materialer. Lasten trekkes ved avreise.
// OPUS-11: lastebilen kjører bare med varer en bosetting faktisk mangler til et pågående prosjekt (ellers ville drivstoffet
// brennes på turer som ikke flytter noe nyttig), og lasten havner i bosettingens eget lager.
function dispatchRoad(s) {
  const I = s.industrial, R = B.combustion.road;
  if (!I.roads || s.resources.truck < 1) return;
  if (I.shipments.filter((q) => q.status === 'traveling' && q.mode === 'road').length >= s.resources.truck) return;
  if (s.resources.fuel < R.fuelPerTrip) return;
  // OPUS-12: lastebilen tar en bestilling i kø (et prosjekt, vedlikehold eller handel) mellom to bosettinger med landforbindelse; toget har forrang der det går.
  const order = (s.region?.deliveries || []).find((d) => d.status === 'queued' && !trainServes(s, d.source, d.destination) && landLink(s, d.source, d.destination, R.maxDistance) && invGet(s, d.source, d.type) >= Math.min(d.amount, R.load));
  if (!order) return;
  if (I.truckWear >= R.tripsBeforeService) {
    if (!afford(s, R.service)) return;
    spend(s, R.service); I.truckWear = 0; I.serviceCount++;
  }
  const amount = Math.min(R.load, Math.ceil(order.amount), Math.floor(invGet(s, order.source, order.type)));
  if (amount < 1) return;
  s.resources.fuel -= R.fuelPerTrip; I.fuelBurned += R.fuelPerTrip; invTake(s, order.source, order.type, amount);
  order.amount -= amount; if (order.amount <= 0) { order.status = 'cancelled'; order.handedTo = 'truck'; }
  I.truckWear += 1; I.roadTrips++;
  I.shipments.push({ id: s.nextId++, mode: 'road', from: order.source, to: order.destination, type: order.type, amount, status: 'traveling', departAt: s.time, arriveAt: s.time + R.travelSeconds });
}
function stepShipments(s) {
  for (const q of s.industrial.shipments) if (q.status === 'traveling' && s.time >= q.arriveAt) {
    q.status = 'done';
    if (q.mode === 'road') {
      const dest = settlementById(s, q.to);
      invAdd(s, dest ? q.to : 'first', q.type, q.amount); // mål borte: lasten går tilbake til hovedlageret
      recordFlow(s, q.from, q.to, q.type, q.amount, 'truck');
      s.industrial.roadDeliveries++;
      const A = settlementById(s, q.from), C = settlementById(s, q.to);
      chronicle(s, 'motor:first-delivery', 'route', 'De første motorvognene frakter varer mellom bosetninger.', A && C ? { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 } : null);
      continue;
    }
    invAdd(s, settlementById(s, q.to ?? 'first') ? (q.to ?? 'first') : 'first', q.type, q.amount); // jernbanelasten havner i mottakerens lager
    s.industrial.deliveries++;
    recordFlow(s, q.from ?? 'first', q.to ?? 'first', q.type, q.amount, 'rail');
    const rail = s.industrial.rails.find((r) => r.id === q.rail), A = rail && settlementById(s, rail.a), C = rail && settlementById(s, rail.b);
    chronicle(s, `industrial:shipment:${q.id}`, 'route', 'Et damplokomotiv frakter varer mellom bosettingene.', A && C ? { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 } : null);
  }
  if (s.industrial.shipments.length > 30) s.industrial.shipments = s.industrial.shipments.filter((q) => q.status !== 'done');
}

export function enableIndustry(s) { s.industrial.enabled = true; }
export function stepIndustry(s, dt) {
  if (!s.industrial?.enabled) return;
  const I = s.industrial;
  if (coalNodes(s).some((n) => n.discovered)) construct(s, 'coal_mine', B.industrial.coalMine);
  if (done(s, 'coal_mine') && s.resources.coal >= B.industrial.engine.minCoal) construct(s, 'steam_engine', B.industrial.engine.cost);
  if (s.upgrades.factory_manufacture && done(s, 'steam_engine') && !done(s, 'metalworks')) construct(s, 'metalworks', B.industrial.factories.metalworks.cost);
  if (done(s, 'metalworks') && !done(s, 'locomotive_workshop')) construct(s, 'locomotive_workshop', B.industrial.factories.locomotive_workshop.cost);
  const demand = engineDemand(s);
  for (const b of s.buildings) if (b.complete && b.type === 'steam_engine') operateEngine(s, b, dt, demand);
  // OPUS-08: olje, forbrenning og elektrisitet. Kraftkapasiteten må være klar før fabrikkene kjører.
  stepPetroleum(s, dt);
  stepPower(s, dt);
  // OPUS-10: telegraf og forskning trekker strøm før fabrikkene, slik at kommunikasjon ikke kan sultes av industrien.
  stepScience(s, dt);
  for (const b of s.buildings) if (b.complete && B.industrial.factories[b.type]) runFactory(s, b, dt);
  makeRail(s); buildLocomotive(s); dispatchRail(s); dispatchRoad(s); stepShipments(s);
  // OPUS-09: flyverk, flyplass og flyvninger bruker de samme lagrene og kraftreglene som resten av industrien.
  stepAviation(s);
  I.operatingPower = s.buildings.filter((b) => b.type === 'steam_engine').reduce((n, b) => n + (b.availablePower || 0), 0);
  if (I.operatingPower > 0 && !I.announced) { I.announced = true; const b = s.buildings.find((q) => q.type === 'steam_engine'); chronicle(s, 'industrial:first-steam', 'work', 'Menneskene har konstruert sin første dampmaskin.', { x: b.x, y: b.y }); }
}
