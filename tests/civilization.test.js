import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/sim/game.js';
import { purchase } from '../src/sim/economy.js';
import { settlementRole, settlementStage } from '../src/sim/regional.js';
import { BALANCE as B } from '../src/data/balance.js';

function run(s, when, seconds = 240) {
  for (let i = 0; i < seconds / B.dt; i++) { step(s); if (when()) return true; }
  return false;
}

test('dyrket mark høster deterministisk mat og matmangel stopper bare vekst', () => {
  const a = createGame(77), b = createGame(77);
  for (const s of [a, b]) {
    s.civilization.foodUnlocked = true; s.civilization.nextFoodAt = 0; s.civilization.nextPopulationAt = Infinity;
    s.buildings.push({ id: s.nextId++, type: 'field', x: 900, y: 600, radius: 38, progress: 1, complete: true, settlementId: 'first' });
  }
  run(a, () => a.civilization.foodHarvests >= 2, 40); run(b, () => b.civilization.foodHarvests >= 2, 40);
  assert.equal(a.resources.food, b.resources.food);
  assert.ok(a.resources.food > 0);
  const people = a.humans.length; a.resources.food = 0; a.civilization.nextPopulationAt = 0;
  run(a, () => false, 4);
  assert.equal(a.humans.length, people, 'ingen dødsfall eller vekst uten mat');
});

test('stadier og roller kommer fra utvikling, ikke timer eller spillerordre', () => {
  const s = createGame(); const first = s.settlements[0];
  assert.equal(settlementStage(s, first), 'Leir');
  s.buildings.push({ id: s.nextId++, type: 'shelter', complete: true, settlementId: 'first', x: 1000, y: 700, radius: 26 });
  first.population.push(1, 2);
  assert.equal(settlementStage(s, first), 'Grend');
  s.buildings.push({ id: s.nextId++, type: 'field', complete: true, settlementId: 'first', x: 900, y: 600, radius: 38 });
  assert.equal(settlementRole(s, first), 'Matbygda');
});

test('sivilisasjonsoppgraderinger krever mat og Ragnarök nullstiller tilstanden', () => {
  const s = createGame(); s.resources.wood = 1000; s.resources.stone = 1000;
  s.milestones.living_region = 1;
  assert.equal(purchase(s, 'seed_promise').ok, true);
  assert.equal(s.civilization.foodUnlocked, true);
  assert.equal(purchase(s, 'division_labor').ok, false, 'kan ikke kjøpe arbeidsdeling før åkeren er ferdig og har gitt mat');
  const reset = createGame(s.seed);
  assert.equal(reset.civilization.foodUnlocked, false);
  assert.equal(reset.resources.food, 0);
});
