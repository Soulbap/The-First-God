// OPUS-12 · Regional økonomi: eierskap til lager, handel på bestilling, tog uten meningsløse sløyfer, flytting og vekst etter sted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance, step } from '../src/sim/game.js';
import { serialize, deserialize, SAVE_VERSION } from '../src/sim/save.js';
import { applyLegacy } from '../src/sim/legacy.js';
import { createWorld } from '../src/sim/world.js';
import { BALANCE as B } from '../src/data/balance.js';
import { stepHuman } from '../src/sim/humans.js';
import { stepCivilization } from '../src/sim/civilization.js';
import { stepProduction } from '../src/sim/production.js';
import { stepMechanical, enableMechanical } from '../src/sim/mechanical.js';
import { enableMaterials } from '../src/sim/materials.js';
import { enableIndustry, stepIndustry } from '../src/sim/industrial.js';
import { stepRegional } from '../src/sim/regional.js';
import { planTrade, inbound } from '../src/sim/trade.js';
import { invGet, invTotal } from '../src/sim/inventory.js';
import { nextGrowth, jobsOf } from '../src/sim/growth.js';
import { stepMigration, migrantsInFlight } from '../src/sim/migration.js';
import { housingCapacity } from '../src/sim/settlements.js';
import { addBuilding, addPeople, reached } from './support.js';

// Syntetisk to-bosettingsverden: hovedstaden og «Bygda» 900 enheter unna, med land mellom, uten naturnoder (ingen sanking som forstyrrer regnskapet).
function twoSettlements(seed = 1201, { clearNodes = true } = {}) {
  const s = createGame(seed);
  const C = s.settlement.center;
  s.settlements.push({ id: 'second', name: 'Bygda', x: C.x + 900, y: C.y - 120, state: 'active', population: [], kind: 'farm', projectsDone: 9, role: 'Matbygda', stage: 'Landsby', stock: {}, plan: [] });
  s.settlements[0].stage = 'By';
  s.expansion.founded = true; s.region.enabled = true; s.civilization.foodUnlocked = true; s.civilization.nextFoodAt = 0; s.civilization.nextPopulationAt = 0;
  if (clearNodes) s.nodes = [];
  return s;
}
const S2 = (s) => s.settlements.find((q) => q.id === 'second');

test('en satellitts sankere leverer til bosettingens eget lager, ikke til hovedstadens', () => {
  const s = twoSettlements();
  addPeople(s, 'second', 1);
  const h = s.humans[0];
  h.state = 'toStore'; h.carry = { type: 'wood', amount: 3 }; h.tx = h.x; h.ty = h.y; h.deliveries = 1;
  const cap = s.resources.wood;
  stepHuman(s, h, 1 / 60);
  assert.equal(S2(s).stock.wood, 3, 'lastet havner i satellittens lager');
  assert.equal(s.resources.wood, cap, 'hovedstadens lager er urørt');
});

test('åkre mater sin egen bosetting, og maten har en øvre grense i lageret', () => {
  const s = twoSettlements();
  addPeople(s, 'second', 8);
  addBuilding(s, 'field', 'second', S2(s).x, S2(s).y);
  const food0 = s.resources.food;
  stepCivilization(s);
  assert.ok(invGet(s, 'second', 'food') > 0 && s.resources.food === food0, 'høsten går til satellitten, ikke hovedstaden');
  const cap = B.human.foodStore.base + B.human.foodStore.perPerson * 8;
  for (let i = 0; i < 400; i++) { s.time += B.human.foodHarvestSeconds; stepCivilization(s); }
  assert.ok(invGet(s, 'second', 'food') <= cap + 1e-6, `matlageret (${invGet(s, 'second', 'food')}) er begrenset til ${cap}`);
});

test('sagbruk og steinhoggeri arbeider på sin egen bosettings lager', () => {
  const s = twoSettlements();
  addPeople(s, 'second', 3);
  addBuilding(s, 'sawmill', 'second', S2(s).x + 60, S2(s).y, { cycle: 0 });
  S2(s).stock.wood = 80;
  s.resources.wood = 500; s.resources.planks = 0;
  const wood0 = s.resources.wood;
  for (let i = 0; i < 30; i++) stepProduction(s, 1);
  assert.ok(S2(s).stock.planks >= 1, 'planker lages i satellitten');
  assert.ok(S2(s).stock.wood < 80, 'råvaren trekkes fra satellittens lager');
  assert.equal(s.resources.wood, wood0, 'hovedstadens tre er urørt');
  assert.equal(s.resources.planks, 0, 'hovedstadens planker er urørt');
});

test('en satellitts mølle er et regionalt prosjekt som må leveres, ikke gratis fra hovedstaden', () => {
  const s = twoSettlements();
  addPeople(s, 'second', 4);
  addBuilding(s, 'sawmill', 'second', S2(s).x + 60, S2(s).y); addBuilding(s, 'mason', 'second', S2(s).x - 60, S2(s).y);
  enableMechanical(s);
  s.resources.wood = 400; s.resources.stone = 400; s.resources.planks = 100; s.resources.mechanicalComponents = 9;
  const before = JSON.stringify(s.resources);
  stepMechanical(s, 1);
  assert.equal(JSON.stringify(s.resources), before, 'ingenting trekkes fra hovedstaden når satellitten bestiller mølla');
  const p = s.region.projects.second;
  assert.ok(p && (p.type === 'watermill' || p.type === 'windmill') && p.cost.wood > 0, 'prosjektet venter på levering til satellittens lager');
});

test('handel: hovedstaden mangler malm, satellitten har overskudd — varen fraktes, bevares og bestillingene stopper når behovet er dekket', () => {
  const s = twoSettlements();
  enableMaterials(s); s.materials.ironworking = true;
  addPeople(s, 'second', 3); addPeople(s, 'first', 2);
  addBuilding(s, 'storage', 'first', s.settlement.center.x - 60, s.settlement.center.y + 60); addBuilding(s, 'storage', 'second', S2(s).x - 60, S2(s).y + 60);
  S2(s).stock.ironOre = 60; s.resources.ironOre = 0;
  const total = () => invTotal(s, 'ironOre') + s.region.deliveries.filter((d) => d.type === 'ironOre' && (d.status === 'reserved' || d.status === 'traveling')).reduce((n, d) => n + d.amount, 0);
  const t0 = total(), target = B.materials.stockTargets.ironOre;
  let guard = 0;
  while (s.resources.ironOre < target && guard++ < 4000) { advance(s, 1); stepRegional(s, 1); assert.ok(Math.abs(total() - t0) < 1e-6, `bevart (${total()} mot ${t0})`); }
  assert.ok(s.resources.ironOre >= target, `malmen kom frem (${s.resources.ironOre})`);
  assert.ok(s.trade.flows['second>first|ironOre'] > 0, 'regnskapet viser frakten');
  // Når behovet er dekket, stopper bestillingene — ingen sløyfe.
  advance(s, 120);
  const moved = s.trade.flows['second>first|ironOre'], orders = s.trade.orders.import;
  advance(s, 600); stepRegional(s, 1);
  assert.equal(s.trade.flows['second>first|ironOre'], moved, 'ingenting mer fraktes uten behov');
  assert.equal(s.trade.orders.import, orders, 'ingen nye importbestillinger');
  assert.ok(Math.abs(total() - t0) < 1e-6);
});

test('jernbane: kull går bare når en bosetting trenger det, aldri ut og tilbake uten nytte', () => {
  const s = twoSettlements();
  enableIndustry(s); enableMaterials(s);
  addBuilding(s, 'coal_mine', 'first', 900, 600);
  s.settlements.push({ id: 'third', name: 'T', x: s.settlement.center.x - 800, y: s.settlement.center.y - 100, state: 'active', population: [], kind: 'stone', projectsDone: 9, role: 'x', stage: 'Landsby', stock: {}, plan: [] });
  s.industrial.rails.push({ id: 'first|second', a: 'first', b: 'second', builtAt: 0 }); s.industrial.locomotives = 1;
  // Ingen behov: kull i begge ender over målet, ingenting bestilt.
  s.resources.coal = 200; S2(s).stock.coal = 50;
  const coal0 = invTotal(s, 'coal');
  for (let t = 0; t < 600; t++) { s.time += 1; planTrade(s); stepIndustry(s, 1); }
  assert.equal(s.industrial.shipments.filter((q) => q.rail).length, 0, 'ingen tog uten bestilling');
  // Behov: hovedstaden går tom for kull, satellitten har — toget henter.
  s.resources.coal = 0; s.industrial.coalBurned = 0;
  for (let t = 0; t < 120; t++) { s.time += 1; planTrade(s); stepIndustry(s, 1); }
  const trips = s.industrial.shipments.filter((q) => q.rail);
  assert.ok(trips.length >= 1 && trips.every((q) => q.type === 'coal' && q.from === 'second' && q.to === 'first'), 'toget går fra overskudd til behov');
  const flying = s.industrial.shipments.filter((q) => q.status === 'traveling').reduce((n, q) => n + q.amount, 0);
  assert.ok(Math.abs(invTotal(s, 'coal') + flying - 50) < 1e-6, 'lasten er bevart (kull + i transitt)');
  void coal0;
  // Og motsatt retning går ikke: hovedstaden (nå med kull) sender ikke kullet tilbake uten at satellitten trenger det.
  const n0 = s.industrial.shipments.length;
  for (let t = 0; t < 300; t++) { s.time += 1; planTrade(s); stepIndustry(s, 1); }
  assert.ok(s.industrial.shipments.slice(n0).every((q) => !(q.type === 'coal' && q.from === 'first')), 'ingen retur uten behov');
});

test('en sulten bosetting får mat fra den som har overskudd, og matlageret blir aldri negativt', () => {
  const s = twoSettlements();
  addPeople(s, 'second', 6);
  addBuilding(s, 'storage', 'first', s.settlement.center.x - 60, s.settlement.center.y + 60); addBuilding(s, 'storage', 'second', S2(s).x - 60, S2(s).y + 60);
  addPeople(s, 'first', 3);
  s.resources.food = 120; S2(s).stock.food = 0;
  const total = () => invTotal(s, 'food') + s.region.deliveries.filter((d) => d.type === 'food' && (d.status === 'reserved' || d.status === 'traveling')).reduce((n, d) => n + d.amount, 0);
  const t0 = total();
  let eaten = 0;
  for (let i = 0; i < 700; i++) {
    const before = total();
    advance(s, 1); stepRegional(s, 1);
    eaten += before - total();
    assert.ok(s.resources.food >= 0 && invGet(s, 'second', 'food') >= -1e-9);
  }
  assert.ok(s.trade.flows['first>second|food'] > 0, 'hovedstaden sendte mat');
  assert.ok(eaten >= 0 && t0 - total() <= (s.totals.foodEaten || 0) + 1e-6, 'maten som forsvant er spist (regnskapet stemmer)');
});

test('flytting: folk flytter dit det finnes bolig, mat og arbeid; ingen oppstår eller forsvinner', () => {
  const s = twoSettlements();
  addPeople(s, 'second', 3);
  const first = s.settlements[0];
  // Hovedstaden er full og uten mer arbeid; Bygda har bolig, mat og arbeid.
  for (let i = 0; i < 5; i++) addBuilding(s, 'hut', 'first', 800 + i * 70, 500, { tier: 3, radius: 30 });
  for (let i = 0; i < 4; i++) addBuilding(s, 'hut', 'second', S2(s).x - 100 + i * 70, S2(s).y + 120, { tier: 3, radius: 30 });
  addBuilding(s, 'field', 'second', S2(s).x, S2(s).y - 90); addBuilding(s, 'sawmill', 'second', S2(s).x + 100, S2(s).y);
  s.industrial.roads = true; s.upgrades.construction_methods = 1;
  addPeople(s, 'first', housingCapacity(s, 'first')); // hovedstaden er full
  s.civilization.foodUnlocked = false; // ingen naturlig vekst i denne testen: bare flytting endrer folketallet per bosetting
  S2(s).stock.food = 60; first.jobs = 6; S2(s).jobs = 30;
  for (const h of s.humans) h.born = -1000;
  const total0 = s.humans.length, ids0 = s.humans.map((h) => h.id).sort((a, b) => a - b).join(',');
  let moved = false;
  for (let i = 0; i < 900 && !moved; i++) { advance(s, 1); s.settlements[0].jobs = 6; S2(s).jobs = 30; stepMigration(s, 1); moved = (s.migration.done || 0) >= 1; }
  assert.ok(moved, 'minst én flyttet');
  assert.equal(s.humans.length, total0, 'ingen oppstår eller forsvinner');
  assert.equal(s.humans.map((h) => h.id).sort((a, b) => a - b).join(','), ids0);
  const pops = s.settlements.flatMap((q) => q.population);
  assert.equal(new Set(pops).size, pops.length, 'hver bor i nøyaktig én bosetting');
  for (const q of s.settlements) for (const id of q.population) { const h = s.humans.find((x) => x.id === id); assert.ok(h && (h.settlementId === q.id || h.state === 'toMigrate')); }
  assert.ok(migrantsInFlight(s).length <= B.migration.maxInFlight);
});

test('vekst etter sted: en bygd med skog lager sagbruk, en bygd med stein lager steinhoggeri, og uten arbeid bygges ikke flere hus', () => {
  const s = twoSettlements(1301);
  const S = S2(s); S.stage = 'Voksende landsby';
  s.civilization.exchangeUnlocked = false;
  addPeople(s, 'second', 2);
  for (const t of ['well', 'commons']) addBuilding(s, t, 'second', S.x + 30, S.y + 60);
  addBuilding(s, 'field', 'second', S.x - 90, S.y); addBuilding(s, 'hut', 'second', S.x + 90, S.y); addBuilding(s, 'hut', 'second', S.x + 150, S.y);
  S.stock.food = 80; s.nodes = [];
  const tree = (i) => ({ id: s.nextId++, kind: 'tree', species: 'birch', variant: 0, x: S.x + 100 + (i % 6) * 22, y: S.y - 150 - Math.floor(i / 6) * 22, growth: 1, chopped: 0, state: 'alive', timer: 0, stump: false, vigor: 1, reservedBy: [] });
  for (let i = 0; i < 18; i++) s.nodes.push(tree(i));
  assert.equal(nextGrowth(s, S).type, 'sawmill', 'skog i nærheten gir sagbruk');
  s.nodes = [];
  for (let i = 0; i < 4; i++) s.nodes.push({ id: s.nextId++, kind: 'rock', x: S.x - 120 + i * 30, y: S.y - 160, radius: 20, stone: 20, maxStone: 20, regenTimer: 0, reservedBy: [] });
  assert.equal(nextGrowth(s, S).type, 'mason', 'stein i nærheten gir steinhoggeri');
  // Uten skog og stein: ingen spesialisering utover det bygda trenger. Er bygda full og uten arbeid, bygges ikke flere hus.
  s.nodes = [];
  const housing = housingCapacity(s, 'second');
  addPeople(s, 'second', Math.max(0, housing - S.population.length));
  S.jobs = S.population.length; // like mange arbeidsplasser som folk
  assert.notEqual(nextGrowth(s, S)?.type, 'hut', 'ingen nye hus uten arbeid til flere');
  S.jobs = S.population.length + 6;
  assert.equal(nextGrowth(s, S)?.type, 'hut', 'med arbeid bygges flere hus');
  assert.ok(jobsOf(s, S) >= 6);
});

test('lagring: v12 lagrer gatenett, byggeplaner og handelsregnskap; en v11-lagring leses og spillet fortsetter uten feil', () => {
  assert.equal(SAVE_VERSION, 12);
  const { s } = reached('connected_realm', 777);
  const t = deserialize(serialize(s));
  assert.deepEqual(t.trade, s.trade); assert.deepEqual(t.migration, s.migration);
  assert.deepEqual(t.settlements.map((q) => q.jobs), s.settlements.map((q) => q.jobs));
  // Simuler en v11-lagring uten OPUS-12-feltene.
  const raw = JSON.parse(serialize(s)); raw.v = 11;
  delete raw.state.trade; delete raw.state.migration; for (const S of raw.state.settlements) { delete S.net; delete S.roadJob; delete S.districts; delete S.identity; delete S.jobs; }
  for (const h of raw.state.humans) { delete h.homeId; delete h.workId; delete h.destId; delete h.slot; }
  for (const d of raw.state.region.deliveries) delete d.source;
  const old = deserialize(JSON.stringify(raw));
  assert.ok(old && old.trade && old.migration, 'nye felt fylles');
  advance(old, 90);
  for (const [k, v] of Object.entries(old.resources)) assert.ok(v >= 0 && Number.isFinite(v), k);
  for (const S of old.settlements) for (const [k, v] of Object.entries(S.stock || {})) assert.ok(v >= -1e-9 && Number.isFinite(v), `${S.id}.${k}`);
  assert.ok(old.settlements.some((q) => q.net?.edges.length), 'gatenettet bygges opp igjen fra byggene');
});

test('Ragnarok: en ny syklus har ingen gater, handel, flytting eller lokale lagre fra forrige verden', () => {
  const { s } = reached('connected_realm', 777);
  assert.ok(s.settlements.some((q) => q.net?.edges.length) && Object.keys(s.trade.flows).length > 0);
  const fresh = applyLegacy(createWorld(777), { cycles: 1, stones: [], bonuses: {} });
  assert.equal(fresh.settlements.length, 1);
  assert.equal(fresh.settlements[0].net, undefined);
  assert.deepEqual(fresh.trade, { orders: {}, flows: {}, modes: {} });
  assert.equal(fresh.migration.done, 0);
  assert.equal(fresh.buildings.length, 0);
});

test('fjerne bosettinger utvikler seg uten at kameraet er der: bygg, folk og handel øker i simuleringen', () => {
  const { s } = reached('connected_realm', 777);
  const t = deserialize(serialize(s));
  const sat = t.settlements.filter((q) => q.id !== 'first');
  const b0 = t.buildings.filter((b) => b.settlementId !== 'first').length, f0 = Object.values(t.trade.flows).reduce((a, b) => a + b, 0);
  advance(t, 1500);
  assert.ok(t.buildings.filter((b) => b.settlementId !== 'first').length > b0, 'satellittene bygger videre');
  assert.ok(Object.values(t.trade.flows).reduce((a, b) => a + b, 0) > f0, 'handelen fortsetter');
  assert.ok(sat.length >= 3);
  void step; void inbound;
});
