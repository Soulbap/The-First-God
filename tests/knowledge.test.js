// GAMEPLAY-08 · Den organiserte sivilisasjonen: kunnskap, fremskritt, sivile bygg og roller.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, checkMilestones } from '../src/sim/game.js';
import { purchase, upgradeStatus, techCount } from '../src/sim/economy.js';
import { upgradeById, UPGRADES } from '../src/data/upgrades.js';
import { BALANCE as B } from '../src/data/balance.js';
import { addKnowledge, craftSpeed } from '../src/sim/production.js';
import { settlementRole, roleEffect, ROLE_EFFECTS } from '../src/sim/settlements.js';
import { deliveryAmount } from '../src/sim/regional.js';
import { gatherInterval } from '../src/sim/humans.js';
import { addBuilding, addPeople, reached } from './support.js';

const run = (s, seconds) => { for (let i = 0; i < seconds / B.dt; i++) step(s); };

test('kunnskap kommer bare fra faktisk virksomhet: ingenting uten bygg og folk', () => {
  const s = createGame(); addPeople(s, 'first', 6);
  run(s, 120);
  assert.equal(s.resources.knowledge, 0);
  addBuilding(s, 'workshop'); // bygg uten folk i en tom bosetting gir intet — men med folk gir det
  run(s, 60);
  assert.ok(s.resources.knowledge > 0, 'verksted med folk gir erfaring');
  const e = createGame(); addBuilding(e, 'workshop'); run(e, 60);
  assert.equal(e.resources.knowledge, 0, 'uten folk ingen kunnskap');
});

test('kunnskapshallen gir jevn kunnskap som vokser med folket', () => {
  const a = createGame(), b = createGame();
  for (const s of [a, b]) addBuilding(s, 'hall');
  addPeople(a, 'first', 2); addPeople(b, 'first', 10);
  run(a, 80); run(b, 80);
  assert.ok(a.resources.knowledge > 0);
  assert.ok(b.resources.knowledge > a.resources.knowledge, 'flere folk gir mer kunnskap');
  assert.equal(a.totals.knowledge, a.resources.knowledge);
});

test('fremskritt kobler seg til målbare evner (og koster kunnskap)', () => {
  const s = createGame(); s.milestones.city_rises = 1;
  assert.equal(purchase(s, 'organized_craft').ok, false, 'uten kunnskap');
  s.resources.knowledge = 100; s.resources.planks = 100; s.resources.cutstone = 100; s.resources.wood = 500; s.resources.food = 50;
  const S = s.settlements[0];
  assert.equal(craftSpeed(s, S), 1);
  assert.equal(purchase(s, 'organized_craft').ok, true);
  assert.equal(s.resources.knowledge, 92, 'nøyaktig kostnad');
  assert.ok(Math.abs(craftSpeed(s, S) - 1.3) < 1e-9);
  assert.equal(purchase(s, 'better_tilling').ok, true);
  assert.equal(s.modifiers.foodBonus, 1);
  assert.equal(purchase(s, 'construction_methods').ok, true);
  assert.equal(s.modifiers.townhouseBonus, 1);
  assert.ok(Math.abs(s.modifiers.buildSpeed - 1.25) < 1e-9);
  assert.equal(techCount(s), 3);
  // Delt kunnskap krever hallen; Samfunnsorden gir bedre leveranser.
  assert.equal(upgradeStatus(s, upgradeById('shared_knowledge')), 'locked');
  addBuilding(s, 'hall');
  assert.equal(purchase(s, 'shared_knowledge').ok, true);
  const base = deliveryAmount(s);
  assert.equal(purchase(s, 'civic_order').ok, true);
  assert.equal(deliveryAmount(s), base + 2, 'mer pålitelige og tyngre leveranser');
  s.settlements[0].role = 'Skogbygd';
  assert.ok(Math.abs(addKnowledge(s, 1, s.settlements[0]) - 1.5) < 1e-9, 'Delt kunnskap: +50 %');
});

test('bedre jordbruk øker innhøstingen med nøyaktig +1 per åker', () => {
  const mk = (bonus) => { const s = createGame(); s.civilization.foodUnlocked = true; s.civilization.nextFoodAt = 0; s.civilization.nextPopulationAt = Infinity; s.modifiers.foodBonus = bonus; addBuilding(s, 'field', 'first', 900, 600); addBuilding(s, 'field', 'first', 1100, 600); step(s); return s.resources.food; };
  assert.equal(mk(1) - mk(0), 2);
});

test('roller gir målbare fordeler og avledes av bygg, ikke ordre', () => {
  const s = createGame(); const S = s.settlements[0];
  S.role = 'Skogbygd'; const h = { settlementId: 'first' };
  const wood = gatherInterval(s, h, 'wood'), stone = gatherInterval(s, h, 'stone');
  assert.ok(wood < stone, 'skogbygd sanker trevirke raskere');
  assert.equal(settlementRole(s, S), 'Skogbygd');
  addBuilding(s, 'sawmill'); assert.equal(settlementRole(s, S), 'Sagbruksbygd');
  addBuilding(s, 'hall'); assert.equal(settlementRole(s, S), 'Kunnskapssete');
  assert.ok(roleEffect('Kunnskapssete', 'knowledge') > roleEffect('Matbygda', 'knowledge'));
  assert.ok(Object.keys(ROLE_EFFECTS).length >= 7);
});

test('Kunnskapens tidsalder krever kunnskap, fremskritt og sivilt bygg — ikke bare ett kjøp', () => {
  const s = createGame(); s.milestones.city_rises = 1;
  for (const id of ['organized_craft', 'better_tilling', 'construction_methods', 'shared_knowledge']) s.upgrades[id] = 1;
  s.totals.knowledge = 500; checkMilestones(s);
  assert.equal(s.milestones.age_of_knowledge, undefined, 'uten kunnskapshall');
  addBuilding(s, 'hall'); checkMilestones(s);
  assert.notEqual(s.milestones.age_of_knowledge, undefined);
  const t = createGame(); t.milestones.city_rises = 1; addBuilding(t, 'hall'); t.totals.knowledge = 500; checkMilestones(t);
  assert.equal(t.milestones.age_of_knowledge, undefined, 'uten fremskritt');
});

test('spilling: kunnskap, fremskritt og hall gir Kunnskapens tidsalder, og byen blir et kunnskapssete', () => {
  const { s, ok } = reached('age_of_knowledge');
  assert.ok(ok);
  assert.ok(techCount(s) >= 4);
  assert.ok(s.buildings.some((b) => b.type === 'hall' && b.complete));
  assert.ok(s.totals.knowledge >= 70);
  assert.equal(s.settlements[0].role, 'Kunnskapssete');
  const techs = UPGRADES.filter((u) => u.category === 'kunnskap');
  assert.ok(techs.length >= 5 && techs.every((u) => u.effect && /\d|bedre|raskere|mer|øker/i.test(u.effect)), 'hvert fremskritt har en målbar effekt');
});

test('Ragnarok nullstiller kunnskap og fremskritt', () => {
  const { s } = reached('age_of_knowledge');
  assert.ok(s.upgrades.organized_craft);
  const fresh = createGame(s.seed);
  assert.equal(fresh.resources.knowledge, 0); assert.equal(fresh.totals.knowledge, 0);
  assert.deepEqual(fresh.upgrades, {}); assert.equal(fresh.modifiers.knowledge, 1); assert.equal(fresh.modifiers.craftSpeed, 1);
});
