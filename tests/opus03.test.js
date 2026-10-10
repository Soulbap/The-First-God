import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, checkMilestones } from '../src/sim/game.js';
import { ragnarokAward, emptyMeta, canBuyPrestige } from '../src/sim/legacy.js';
import { PRESTIGE } from '../src/data/prestige.js';
import { isFreeForTree } from '../src/sim/world.js';
import { siteIsValid, startConstruction } from '../src/sim/construction.js';
import { visitRegion, visitableRegion, regionById, regionState } from '../src/sim/worldmap.js';
import { purchase } from '../src/sim/economy.js';

test('OPUS-03: startsone har nok løs stein på tvers av frø', () => {
  for (const seed of [7, 31337, 20261009, 991]) {
    const s = createGame(seed);
    const near = s.nodes.filter((n) => n.kind === 'rock' && Math.hypot(n.x - s.settlement.center.x, n.y - s.settlement.center.y) <= 450);
    assert.ok(near.length >= 6, `${seed}: ${near.length} nære steiner`);
  }
});

test('OPUS-03: trær kan ikke gjenoppstå i bygg eller bykjerne', () => {
  const s = createGame(7), b = startConstruction(s, 'hut');
  assert.ok(b);
  assert.equal(isFreeForTree(s, b.x, b.y), false);
  assert.equal(isFreeForTree(s, b.x + b.radius + 20, b.y), false);
  assert.equal(isFreeForTree(s, s.settlement.center.x, s.settlement.center.y), false);
});

test('OPUS-03: offentlige bygg får funksjonell klarering', () => {
  const s = createGame(7), a = startConstruction(s, 'hut'); assert.ok(a);
  assert.equal(siteIsValid(s, 'market', a.x + a.radius + 35, a.y), false);
});

test('OPUS-03: selv en lang første syklus kjøper ikke nesten hele ekkotreet', () => {
  const s = createGame(7);
  s.totals.wood = 10000; s.totals.stone = 6000; s.totals.pp = 2000; s.totals.knowledge = 800;
  s.milestones = Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['m' + i, i]));
  const award = ragnarokAward(s), meta = emptyMeta(); meta.prestige = award;
  assert.ok(award < 150, `førstesyklus ${award} PrP`);
  assert.ok(PRESTIGE.filter((p) => canBuyPrestige(meta, p.id)).length <= 3);
});

test('OPUS-03: kartet kommer før planeten, og besøk krever ekte oppdagelse', () => {
  const s = createGame(7);
  // Samme flagg som milepælen setter; kravene for selve milepælen testes i realm.test.
  s.unlocks.mapView = true;
  assert.equal(s.unlocks.mapView, true); assert.notEqual(s.unlocks.worldView, true);
  const r = s.globe.regions.find((q) => !q.home);
  assert.equal(visitableRegion(s, r.id), false);
  r.state = regionState.OPPDAGET;
  assert.equal(visitRegion(s, r.id), true);
  assert.equal(s.globe.activeRegionId, r.id);
  assert.equal(regionById(s, r.id).state, regionState.OPPDAGET);
});

test('OPUS-03: luftmåling åpner planetkameraet etter sen sivilisasjon', () => {
  const s = createGame(7);
  s.milestones.first_world_civilization = 1; s.upgrades.cartography = 1;
  s.resources.planks = 100; s.resources.cutstone = 100; s.resources.food = 100; s.resources.knowledge = 500;
  assert.equal(purchase(s, 'aerial_survey').ok, true);
  checkMilestones(s);
  assert.equal(s.unlocks.worldView, true);
});
