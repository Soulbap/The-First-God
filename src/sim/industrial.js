// OPUS-07: kull, damp, fabrikk og jernbane er en liten videreføring av den
// eksisterende material-, kraft- og transportmodellen. Ingen spillerordre.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, findBuildSite } from './construction.js';
import { settlementById } from './settlements.js';
import { chronicle } from './chronicle.js';

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

function operateEngine(s, b, dt) {
  const I = s.industrial, cfg = B.industrial.engine;
  b.wear ??= 0; b.reliability ??= 1; b.fuelCycle ??= 0;
  const water = b.waterAvailable ?? true; // lokal brønn/dam er en eksisterende vannabstraksjon.
  if (!water || s.resources.coal < cfg.coalPerSecond * dt) { b.availablePower = 0; b.active = false; b.idle = water ? 'kull' : 'vann'; return; }
  s.resources.coal -= cfg.coalPerSecond * dt;
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
  if (steamPowerAt(s, S.id) < recipe.power) { b.active = false; b.idle = 'dampkraft'; return; }
  if (!Object.entries(recipe.inputs).every(([k, n]) => (s.resources[k] || 0) >= n)) { b.active = false; b.idle = 'råvare'; return; }
  b.active = true; b.idle = null; b.cycle = (b.cycle || 0) + dt;
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
function dispatchRail(s) {
  const I = s.industrial, rail = I.rails[0]; if (!rail || !I.locomotives || I.shipments.some((q) => q.status === 'traveling') || s.resources.coal < B.industrial.rail.load) return;
  // Lasten trekkes når toget går og finnes bare i transit før ankomst.
  const amount = B.industrial.rail.load; s.resources.coal -= amount;
  I.shipments.push({ id: s.nextId++, rail: rail.id, type: 'coal', amount, status: 'traveling', departAt: s.time, arriveAt: s.time + B.industrial.rail.travelSeconds });
}
function stepShipments(s) {
  for (const q of s.industrial.shipments) if (q.status === 'traveling' && s.time >= q.arriveAt) {
    q.status = 'done'; s.resources[q.type] += q.amount; s.industrial.deliveries++;
    const rail = s.industrial.rails.find((r) => r.id === q.rail), A = rail && settlementById(s, rail.a), C = rail && settlementById(s, rail.b);
    chronicle(s, `industrial:shipment:${q.id}`, 'route', 'Et damplokomotiv frakter kull til industribyen.', A && C ? { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 } : null);
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
  for (const b of s.buildings) if (b.complete && b.type === 'steam_engine') operateEngine(s, b, dt);
  for (const b of s.buildings) if (b.complete && B.industrial.factories[b.type]) runFactory(s, b, dt);
  makeRail(s); buildLocomotive(s); dispatchRail(s); stepShipments(s);
  I.operatingPower = s.buildings.filter((b) => b.type === 'steam_engine').reduce((n, b) => n + (b.availablePower || 0), 0);
  if (I.operatingPower > 0 && !I.announced) { I.announced = true; const b = s.buildings.find((q) => q.type === 'steam_engine'); chronicle(s, 'industrial:first-steam', 'work', 'Menneskene har konstruert sin første dampmaskin.', { x: b.x, y: b.y }); }
}
