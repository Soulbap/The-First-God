// GAMEPLAY-07 · Byenes tid: trinn, foredling, bolighus, torg.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/sim/game.js';
import { purchase, upgradeStatus } from '../src/sim/economy.js';
import { upgradeById } from '../src/data/upgrades.js';
import { BALANCE as B } from '../src/data/balance.js';
import { settlementStage, cityRequirements, housingCapacity, stageRank } from '../src/sim/settlements.js';
import { stepProduction } from '../src/sim/production.js';
import { addBuilding, addPeople, reached } from './support.js';

const run = (s, seconds) => { for (let i = 0; i < seconds / B.dt; i++) step(s); };

test('byen kan ikke låses opp med én terskel: hvert krav må være oppfylt', () => {
  const s = createGame(); const S = s.settlements[0];
  addPeople(s, 'first', 12); // mange folk alene gjør ingen by
  assert.notEqual(settlementStage(s, S), 'By');
  const reqs = cityRequirements(s, S);
  assert.ok(reqs.find((r) => r.id === 'people').ok);
  assert.ok(reqs.filter((r) => !r.ok).length >= 6, 'mange krav mangler fortsatt');
  // Legg til alt unntatt torget: fortsatt ingen by.
  for (const t of ['townhouse', 'townhouse', 'townhouse', 'sawmill', 'mason', 'storage', 'hearth', 'field', 'field']) addBuilding(s, t, 'first', 900 + s.buildings.length * 40, 800);
  s.resources.food = 20; s.totals.planks = 10; s.totals.cutstone = 10; s.region.completedDeliveries = 8;
  assert.notEqual(settlementStage(s, S), 'By', 'torget mangler');
  assert.equal(cityRequirements(s, S).filter((r) => !r.ok).map((r) => r.id).join(), 'market');
  addBuilding(s, 'market', 'first', 700, 900);
  assert.equal(settlementStage(s, S), 'By');
  assert.ok(stageRank('By') > stageRank('Tidlig by'));
});

test('sagbruk: tre → planker, uten å tømme beholdningen og uten folk gjør det ingenting', () => {
  const s = createGame(); const mill = addBuilding(s, 'sawmill');
  s.resources.wood = 100;
  stepProduction(s, 1);
  assert.equal(mill.active, false, 'ingen folk, ingen sagbruk');
  addPeople(s, 'first', 2);
  run(s, 12); // litt over én syklus (10 s)
  assert.equal(s.resources.planks, 1);
  assert.equal(s.resources.wood, 97, 'nøyaktig 3 tre per planke');
  assert.equal(s.totals.planks, 1);
  assert.ok(s.resources.knowledge > 0, 'foredling gir erfaring');
  // Reserve: under reserven + innsats jobber sagbruket ikke.
  mill.cycle = 0; // ingen påbegynt syklus
  s.resources.wood = B.production.sawmill.reserve + 2; const before = s.resources.planks;
  run(s, 30);
  assert.equal(s.resources.planks, before);
  assert.ok(s.resources.wood >= 0);
});

test('foredling stopper når lageret er fullt, og torget dobler kapasiteten', () => {
  const s = createGame(); addBuilding(s, 'mason'); addPeople(s, 'first', 2);
  s.resources.stone = 500; s.resources.cutstone = B.production.mason.cap;
  run(s, 30);
  assert.equal(s.resources.cutstone, B.production.mason.cap, 'ingen overproduksjon');
  addBuilding(s, 'market', 'first', 700, 900);
  run(s, 30);
  assert.ok(s.resources.cutstone > B.production.mason.cap);
  assert.ok(s.resources.cutstone <= B.production.mason.cap * B.production.marketCapMultiplier);
});

test('bolighus rommer fire (fem med Byggemetoder) og vekst stopper ved kapasiteten', () => {
  const s = createGame(); const S = s.settlements[0];
  addBuilding(s, 'townhouse');
  assert.equal(housingCapacity(s, 'first'), 4);
  s.modifiers.townhouseBonus = 1;
  assert.equal(housingCapacity(s, 'first'), 5);
  s.civilization.foodUnlocked = true; s.civilization.nextFoodAt = Infinity; s.civilization.nextPopulationAt = 0; s.resources.food = 500;
  addPeople(s, 'first', 5);
  run(s, 100);
  assert.equal(S.population.length, 5, 'fullt hus: ingen vekst');
  assert.equal(s.humans.length, 5);
  addBuilding(s, 'townhouse', 'first', 1200, 760);
  run(s, 120);
  assert.ok(S.population.length > 5 && S.population.length <= 10);
});

test('byoppgraderinger er låst til riktig kjede og trekker nøyaktig kostnad', () => {
  const s = createGame();
  s.resources.wood = 9999; s.resources.stone = 9999; s.resources.planks = 99; s.resources.cutstone = 99;
  assert.equal(upgradeStatus(s, upgradeById('sawmill_up')), 'locked', 'krever Sivilisasjonens morgen');
  s.milestones.dawn_civilization = 1;
  assert.equal(upgradeStatus(s, upgradeById('townhouses')), 'locked');
  assert.equal(purchase(s, 'sawmill_up').ok, true);
  assert.equal(s.resources.wood, 9999 - 90); assert.equal(s.resources.stone, 9999 - 50);
  assert.equal(upgradeStatus(s, upgradeById('stonecutter_up')), 'locked', 'sagbruket må stå ferdig');
  assert.equal(s.buildings.filter((b) => b.type === 'sawmill').length, 1);
});

test('hele byveien: sagbruk, steinhoggeri, bolighus og torg bygges autonomt og gir milepælen En by reiser seg', () => {
  const { s, ok } = reached('city_rises');
  assert.ok(ok, 'milepælen nås med vanlig spilling');
  for (const t of ['sawmill', 'mason', 'townhouse', 'market']) assert.ok(s.buildings.some((b) => b.type === t && b.complete), t);
  assert.ok(s.buildings.filter((b) => b.type === 'townhouse' && b.complete).length >= 2);
  assert.ok(s.totals.planks > 0 && s.totals.cutstone > 0, 'refinerte materialer er produsert');
  assert.ok(s.resources.planks >= 0 && s.resources.cutstone >= 0 && s.resources.wood >= 0 && s.resources.stone >= 0);
  const S = s.settlements[0];
  assert.ok(['By', 'Storby'].includes(settlementStage(s, S)));
  assert.ok(S.population.length >= B.city.minPopulation, 'byen har flere folk enn en landsby');
  assert.ok(S.population.length <= housingCapacity(s, 'first'), 'aldri over boligkapasiteten');
  // Byen er mekanisk annerledes enn landsbyen: høyere kapasitet per bygg.
  assert.ok(B.housing.townhouse > B.housing.hut);
});

test('regionale leveranser fungerer fortsatt etter byutbyggingen (ingen negative eller tapte reservasjoner)', () => {
  const { s } = reached('city_rises');
  const flying = s.region.deliveries.filter((d) => d.status === 'reserved' || d.status === 'traveling');
  for (const k of ['wood', 'stone', 'food', 'planks', 'cutstone']) {
    const sum = flying.filter((d) => d.type === k).reduce((n, d) => n + d.amount, 0);
    assert.equal(s.region.reserved[k], sum, `reservert ${k} stemmer med leveranser underveis`);
    assert.ok(s.region.reserved[k] >= 0);
  }
  assert.ok(s.region.completedDeliveries >= 6);
});
