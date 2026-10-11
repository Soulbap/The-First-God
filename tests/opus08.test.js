import { queueProjectNeeds } from '../src/sim/regional.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance } from '../src/sim/game.js';
import { enableMaterials, harvestMineral } from '../src/sim/materials.js';
import { enableIndustry, stepIndustry } from '../src/sim/industrial.js';
import { stepPower, factoryPower } from '../src/sim/power.js';
import { stepPetroleum, oilNodes, ensureOilField } from '../src/sim/petroleum.js';
import { serialize, deserialize, SAVE_VERSION } from '../src/sim/save.js';
import { upgradeById, UPGRADES } from '../src/data/upgrades.js';
import { upgradeStatus, purchase } from '../src/sim/economy.js';
import { BALANCE as B } from '../src/data/balance.js';
import { addBuilding, addPeople } from './support.js';

const steamEngine = (s, power = 5) => addBuilding(s, 'steam_engine', 'first', 900, 700, { reliability: 1, availablePower: power });

test('OPUS-08: oljefeltet er seedet, begrenset og kan ikke håndplukkes', () => {
  const a = createGame(801), b = createGame(801); ensureOilField(a); ensureOilField(b);
  const oa = oilNodes(a), ob = oilNodes(b);
  assert.equal(oa.length, 2, 'et hovedfelt og et mindre felt per seed (OPUS-11)');
  assert.deepEqual(oa.map((n) => [n.x, n.y, n.amount]), ob.map((n) => [n.x, n.y, n.amount]));
  assert.ok(oa.every((n) => n.amount > 0 && n.amount <= B.petroleum.field.reserve + B.petroleum.field.spread), 'begrenset mengde');
  assert.ok(oa[1].amount < oa[0].amount, 'det andre feltet er mindre');
  enableMaterials(a); oa[0].discovered = true; const before = oa[0].amount;
  assert.equal(harvestMineral(a, oa[0], 5), 0, 'olje oppstår ikke uten brønn');
  assert.equal(oa[0].amount, before, 'ingen uttak uten brønn');
});

test('OPUS-08: nye verdener starter uten elektrisitet, olje, forbrenning eller lastebiler', () => {
  const s = createGame(802);
  assert.equal(s.industrial.electric, false);
  assert.equal(s.industrial.petroleum, false);
  assert.equal(s.resources.truck, 0);
  assert.equal(s.resources.fuel, 0);
  assert.equal(s.resources.crudeOil, 0);
});

test('OPUS-08: generator og nettstasjon gir lokal kapasitet som er begrenset og krever damp', () => {
  const s = createGame(803); enableIndustry(s); s.industrial.electric = true;
  steamEngine(s, 5); s.resources.coal = 50;
  addBuilding(s, 'generator', 'first', 1000, 600);
  stepPower(s, 1 / 60);
  assert.equal(s.industrial.electricBudget.first, undefined, 'generator uten nettstasjon gir ingen strøm');
  addBuilding(s, 'grid_station', 'first', 1040, 640);
  stepPower(s, 1 / 60);
  assert.equal(s.industrial.electricBudget.first, B.electric.generator.output / 60, 'kapasiteten er generatorens output, ikke et lager');
  assert.deepEqual(s.industrial.litSettlements, ['first']);

  const F = addBuilding(s, 'metalworks', 'first', 1100, 760);
  let electric = 0; for (let i = 0; i < 10; i++) if (factoryPower(s, { id: 'first' }, B.industrial.factories.metalworks, 1 / 60) === 'elektrisk') electric++;
  assert.ok(electric > 0 && electric < 10, 'kapasiteten rekker for noen steg og er deretter brukt opp');
  assert.ok(s.industrial.electricBudget.first >= 0, 'strømbudsjettet blir aldri negativt');
  assert.ok(F.complete);
});

test('OPUS-08: uten damp eller forbrenning stopper generatoren og fabrikken får ikke strøm', () => {
  const s = createGame(804); enableIndustry(s); s.industrial.electric = true;
  steamEngine(s, 0); // ingen kull og ingen effekt
  addBuilding(s, 'generator', 'first', 1000, 600); addBuilding(s, 'grid_station', 'first', 1040, 640);
  stepPower(s, 1 / 60);
  assert.equal(s.industrial.electricBudget.first, undefined, 'ingen generatorkraft uten drivkraft');
  assert.equal(factoryPower(s, { id: 'first' }, B.industrial.factories.metalworks, 1 / 60), null, 'fabrikken står uten kraft');
});

test('OPUS-08: raffineriet bevarer råolje og gir mindre drivstoff enn innsatsen', () => {
  const s = createGame(805); enableIndustry(s); enableMaterials(s); s.industrial.refining = true;
  steamEngine(s, 5); s.resources.coal = 200; addPeople(s, 'first', 3);
  addBuilding(s, 'refinery', 'first', 1000, 720); s.resources.crudeOil = 10;
  const before = s.resources.crudeOil + s.resources.fuel * 2;
  advance(s, 40);
  assert.ok(s.resources.fuel >= 1, 'raffineriet lager drivstoff');
  assert.ok(s.resources.crudeOil >= 0, 'råolje blir aldri negativ');
  assert.ok(s.resources.crudeOil + s.resources.fuel * 2 <= before + 1e-9, 'to råolje gir høyst én drivstoff');
});

test('OPUS-08: brønnen pumper bare fra oljefeltet og bevarer utvinnet mengde', () => {
  const s = createGame(806); ensureOilField(s); enableIndustry(s); enableMaterials(s); s.industrial.petroleum = true;
  const node = oilNodes(s)[0]; node.discovered = true; const startAmount = node.amount;
  addBuilding(s, 'oil_well', 'first', node.x + 90, node.y - 40);
  for (let i = 0; i < 600; i++) stepPetroleum(s, 1 / 60);
  assert.ok(s.resources.crudeOil > 0, 'brønnen gir råolje');
  assert.ok(Math.abs(s.resources.crudeOil + node.amount - startAmount) < 1e-6, 'ingen olje oppstår eller forsvinner');
  assert.ok(node.amount >= 0);
});

test('OPUS-08: forbrenningsmotoren bruker drivstoff og stanser uten drivstoff', () => {
  const s = createGame(807); enableIndustry(s); s.industrial.combustion = true;
  const e = addBuilding(s, 'combustion_engine', 'first', 1000, 600, { reliability: 1, wear: 0 });
  s.resources.fuel = 0.5; stepPetroleum(s, 1); assert.ok(e.availablePower > 0 && s.resources.fuel < 0.5, 'motoren bruker drivstoff');
  s.resources.fuel = 0; stepPetroleum(s, 1); assert.equal(e.availablePower, 0); assert.equal(e.idle, 'drivstoff');
  assert.ok(s.resources.fuel >= 0);
});

test('OPUS-08: lastebil frakter planker mellom gyldige bosettinger uten teleportering', () => {
  const s = createGame(808); enableIndustry(s); s.industrial.roads = true; steamEngine(s, 5); s.resources.coal = 100;
  s.settlements.push({ id: 'second', name: 'Veibygda', x: s.settlement.center.x + 420, y: s.settlement.center.y - 120, state: 'active', population: [], kind: 'mine', projectsDone: 0, role: 'Vei', stage: 'By' });
  s.resources.truck = 1; s.resources.fuel = 5; s.resources.planks = 100;
  // OPUS-11: lastebilen kjører bare med varer en bosetting faktisk trenger (prosjekt), og lasten havner i bosettingens eget lager.
  s.region.projects.second = { id: 'second_test', type: 'sawmill', cost: { planks: 8 }, settlementId: 'second' };
  queueProjectNeeds(s); queueProjectNeeds(s);
  const second = s.settlements.find((q) => q.id === 'second');
  const total = () => s.resources.planks + (second.stock?.planks || 0) + s.industrial.shipments.filter((q) => q.status === 'traveling').reduce((n, q) => n + q.amount, 0);
  const start = total();
  stepIndustry(s, 0.1);
  const trip = s.industrial.shipments.find((q) => q.mode === 'road');
  assert.ok(trip, 'lastebilen kjører');
  assert.equal(total(), start, 'lasten er i transit, ikke duplisert');
  assert.equal(s.resources.fuel, 5 - B.combustion.road.fuelPerTrip, 'en tur bruker drivstoff');
  advance(s, B.combustion.road.travelSeconds + 1);
  assert.equal(s.industrial.shipments.find((q) => q.id === trip.id).status, 'done');
  assert.equal(total(), start, 'ankomst bevarer lasten: ingenting kopieres eller forsvinner');
  assert.ok(s.industrial.roadDeliveries >= 1);
  assert.ok(Object.values(s.resources).every((n) => n >= 0));
});

test('OPUS-08: lastebil kjører ikke uten drivstoff eller over havet', () => {
  const noFuel = createGame(809); enableIndustry(noFuel); noFuel.industrial.roads = true;
  noFuel.resources.truck = 1; noFuel.resources.fuel = 0; noFuel.resources.planks = 100;
  noFuel.settlements.push({ id: 'second', name: 'Uten drivstoff', x: noFuel.settlement.center.x + 300, y: noFuel.settlement.center.y, state: 'active', population: [], kind: 'mine', projectsDone: 0, role: 'Vei', stage: 'By' });
  stepIndustry(noFuel, 0.1);
  assert.equal(noFuel.industrial.shipments.filter((q) => q.mode === 'road').length, 0, 'uten drivstoff kjører ingen lastebil');

  // Innen lastebilens rekkevidde, men midtpunktet ligger på tvers av dammen: ingen landforbindelse, altså ingen tur.
  const sea = createGame(809); enableIndustry(sea); sea.industrial.roads = true; steamEngine(sea, 5); sea.resources.coal = 100;
  const p = sea.world.pond, C = sea.settlement.center, x = p.x - 220, y = p.y + 120;
  assert.ok(Math.hypot(x - C.x, y - C.y) <= B.combustion.road.maxDistance, 'innen rekkevidde');
  assert.ok((C.x - p.x) * (x - p.x) < 0 && Math.abs((C.y + y) / 2 - p.y) < p.ry, 'ruta krysser dammen');
  sea.settlements.push({ id: 'second', name: 'Hinsides dammen', x, y, state: 'active', population: [], kind: 'mine', projectsDone: 0, role: 'Vei', stage: 'By' });
  sea.resources.truck = 1; sea.resources.fuel = 5; sea.resources.planks = 100;
  stepIndustry(sea, 0.1);
  assert.equal(sea.industrial.shipments.filter((q) => q.mode === 'road').length, 0, 'lastebil kjører ikke over vannet');
});

test('OPUS-08: oppgraderingene krever reelle forutsetninger før de låses opp', () => {
  const s = createGame(810);
  const ids = ['petroleum_geology', 'electric_power', 'refining', 'combustion_engine'];
  for (const id of ids) assert.ok(upgradeById(id), `${id} finnes`);
  assert.equal(upgradeStatus(s, upgradeById('electric_power')), 'locked');
  assert.equal(upgradeStatus(s, upgradeById('combustion_engine')), 'locked');
  // Kjøp krever at forutsetningene er oppfylt; ingen gratis oppgradering.
  s.resources.knowledge = 10000; s.resources.copper = 100; s.resources.iron = 100;
  assert.deepEqual(purchase(s, 'electric_power'), { ok: false, reason: 'locked' });
  assert.equal(s.industrial.electric, false);
  assert.ok(UPGRADES.filter((u) => ids.includes(u.id)).every((u) => u.category === 'kunnskap'));
});

test('OPUS-08: v7-lagring fylles med nye felt uten å miste råvarer eller oljefeltet', () => {
  const s = createGame(811); ensureOilField(s); enableIndustry(s); s.resources.crudeOil = 3; s.resources.fuel = 2; s.resources.truck = 1;
  s.industrial.roadTrips = 0; s.industrial.shipments.push({ id: 9, mode: 'road', from: 'first', to: 'second', type: 'planks', amount: 4, status: 'traveling', departAt: 2, arriveAt: 8 });
  const raw = JSON.parse(serialize(s)); assert.equal(raw.v, SAVE_VERSION); assert.equal(SAVE_VERSION, 11);
  raw.v = 7; delete raw.state.industrial.electric; delete raw.state.industrial.petroleum; delete raw.state.resources.truck; delete raw.state.resources.crudeOil;
  const old = deserialize(JSON.stringify(raw));
  assert.equal(old.industrial.electric, false); assert.equal(old.resources.truck, 0);
  const restored = deserialize(serialize(s));
  assert.equal(restored.resources.crudeOil, 3); assert.equal(restored.resources.fuel, 2); assert.equal(restored.resources.truck, 1);
  assert.equal(restored.industrial.shipments.find((q) => q.mode === 'road').amount, 4);
  assert.equal(oilNodes(restored).length, 2, 'oljefeltet lagres med verdenen');
});
