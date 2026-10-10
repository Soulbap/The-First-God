import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, checkMilestones } from '../src/sim/game.js';
import { ragnarokAward, emptyMeta, canBuyPrestige } from '../src/sim/legacy.js';
import { PRESTIGE } from '../src/data/prestige.js';
import { isFreeForTree } from '../src/sim/world.js';
import { siteIsValid, startConstruction } from '../src/sim/construction.js';
import { visitRegion, visitableRegion, regionById, regionState } from '../src/sim/worldmap.js';
import { purchase } from '../src/sim/economy.js';
import { projectRegionScene } from '../src/sim/regionScene.js';
import { serialize, deserialize } from '../src/sim/save.js';
import { stepUrban } from '../src/sim/urban.js';

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

test('OPUS-03: fjernt land projiseres deterministisk uten å endre den autoritative verdenen', () => {
  const s = createGame(31337), r = s.globe.regions.find((q) => !q.home);
  r.state = regionState.OPPDAGET;
  const before = JSON.stringify({ resources: s.resources, humans: s.humans, region: r });
  const a = projectRegionScene(s, r.id), b = projectRegionScene(s, r.id);
  assert.ok(a && b);
  const signature = (x) => JSON.stringify({ nodes: x.nodes.map((n) => [n.kind, Math.round(n.x), Math.round(n.y)]), buildings: x.buildings, people: x.humans });
  assert.equal(signature(a), signature(b));
  assert.equal(a.humans.length, 0, 'oppdaget land oppfinner ingen innbyggere');
  assert.equal(JSON.stringify({ resources: s.resources, humans: s.humans, region: r }), before);
});

test('OPUS-03: utpostbildet følger regionens faktiske befolkning og overlever lagring', () => {
  const s = createGame(99), r = s.globe.regions.find((q) => !q.home);
  r.state = regionState.ETABLERT; r.pop = 6;
  const scene = projectRegionScene(s, r.id);
  assert.equal(scene.humans.length, 6);
  assert.ok(scene.buildings.some((b) => b.type === 'storage'));
  assert.equal(visitRegion(s, r.id), true);
  const loaded = deserialize(serialize(s));
  assert.equal(loaded.globe.activeRegionId, r.id);
  assert.equal(projectRegionScene(loaded, r.id).humans.length, 6);
});

test('OPUS-03: v2-lagring fyller kartets besøksfelt uten å avvise verdenen', () => {
  const s = createGame(7), data = JSON.parse(serialize(s));
  data.v = 2; delete data.state.globe.activeRegionId; delete data.state.globe.cartography;
  const loaded = deserialize(JSON.stringify(data));
  assert.ok(loaded);
  assert.equal(loaded.globe.activeRegionId, loaded.globe.regions.find((r) => r.home).id);
});

test('OPUS-03: en moden by fornyer gamle hytter med reelle ressurser, én om gangen', () => {
  const s = createGame(7);
  s.urban.enabled = true; s.urban.nextAt = 0;
  s.settlements[0].stage = 'By'; s.settlements[0].population = [1, 2, 3, 4, 5, 6];
  const hut = startConstruction(s, 'hut'); hut.complete = true; hut.progress = 1;
  s.resources.wood = 500; s.resources.stone = 500;
  const before = { wood: s.resources.wood, stone: s.resources.stone };
  stepUrban(s);
  assert.equal(hut.renovated, true);
  assert.equal(s.resources.wood, before.wood - 18);
  assert.equal(s.resources.stone, before.stone - 10);
});
