// GAMEPLAY-10 · Verdens daggry: verdensregioner, ekspedisjoner, utposter, karavaner, oversikt og sluttmilepæl.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, checkMilestones } from '../src/sim/game.js';
import { purchase } from '../src/sim/economy.js';
import { BALANCE as B } from '../src/data/balance.js';
import { createGlobe, reachableUnknown, discoveredRegions, outpostRegions, edgePoint, worldReadiness } from '../src/sim/worldmap.js';
import { civilizationStage } from '../src/sim/civstage.js';
import { overviewLayout, worldToOverview, regionAt, frontierIds } from '../src/view/overview.js';
import { createCamera, glideTo, updateCamera } from '../src/view/camera.js';
import { addPeople, reached } from './support.js';
import { createGame as fresh } from '../src/sim/game.js';
import { makeBot, playTo } from '../tools/bot.js';

const run = (s, seconds, until = () => false) => { for (let i = 0; i < seconds / B.dt; i++) { step(s); if (until(s)) return true; } return false; };
const ready = (seed = 3) => {
  const s = createGame(seed); addPeople(s, 'first', 8);
  s.civilization.nextFoodAt = Infinity; s.civilization.nextPopulationAt = Infinity;
  s.resources.wood = 800; s.resources.stone = 500; s.resources.food = 200; s.resources.planks = 80; s.resources.cutstone = 60;
  return s;
};

test('verdenskartet er deterministisk fra frøet og har hjemmeregionen i midten', () => {
  const a = createGlobe(20261009), b = createGlobe(20261009), c = createGlobe(5);
  assert.deepEqual(a.regions.map((r) => [r.id, r.biome, r.richness]), b.regions.map((r) => [r.id, r.biome, r.richness]));
  assert.notDeepEqual(a.regions.map((r) => r.biome), c.regions.map((r) => r.biome));
  assert.equal(a.regions.length, B.globe.cols * B.globe.rows);
  const home = a.regions.filter((r) => r.home);
  assert.equal(home.length, 1);
  assert.equal(home[0].steps, 0);
  assert.equal(a.regions.filter((r) => r.state === 'ukjent').length, a.regions.length - 1);
});

test('bare land inntil kjent land kan nås av en ekspedisjon', () => {
  const s = createGame();
  const first = reachableUnknown(s);
  assert.equal(first.length, 8);
  assert.ok(first.every((r) => r.steps === 1));
  s.globe.regions.find((r) => r.id === first[0].id).state = 'oppdaget';
  assert.ok(reachableUnknown(s).some((r) => r.steps === 2), 'nytt land åpner flere mål');
});

test('ekspedisjon: følget drar fysisk ut, er borte en tid, oppdager landet og kommer hjem uten tap', () => {
  const s = ready(); s.globe.expeditionsEnabled = true; s.globe.nextMissionAt = 0;
  const people = s.humans.length, wood = s.resources.wood, food = s.resources.food, k0 = s.resources.knowledge;
  assert.ok(run(s, 60, () => !!s.globe.mission), 'ekspedisjonen starter');
  const m = s.globe.mission; const target = s.globe.regions.find((r) => r.id === m.regionId);
  assert.equal(target.state, 'ukjent');
  assert.equal(s.resources.wood, wood - B.globe.expedition.wood); assert.equal(s.resources.food, food - B.globe.expedition.food);
  assert.ok(run(s, 120, () => m.phase === 'away'));
  assert.equal(s.humans.filter((h) => h.away).length, B.realm.party);
  assert.equal(s.humans.length, people, 'ingen er borte for godt under en ekspedisjon');
  assert.ok(run(s, 400, () => target.state === 'oppdaget'));
  assert.ok(s.resources.knowledge > k0, 'oppdagelse gir kunnskap');
  assert.equal(s.globe.stats.discovered, 1); assert.equal(s.globe.mission, null);
  s.globe.expeditionsEnabled = false; // ingen ny ferd mens følget går hjem
  assert.ok(run(s, 150, () => s.humans.every((h) => !h.away && h.state !== 'expReturn')), 'alle er hjemme igjen');
  assert.equal(s.humans.length, people);
  assert.equal(s.humans.filter((h) => h.missionId != null).length, 0);
});

test('utpost: nybyggere forlater hjemmeregionen for godt, utposten vokser og sender karavaner som gir faktiske varer', () => {
  const s = ready(); const G = s.globe;
  const target = G.regions.find((r) => r.id === 'r11'); target.state = 'oppdaget';
  G.outpostsEnabled = true; G.nextMissionAt = 0;
  const people = s.humans.length, planks = s.resources.planks;
  assert.ok(run(s, 60, () => !!G.mission));
  assert.equal(G.mission.kind, 'outpost');
  assert.equal(s.resources.planks, planks - B.globe.outpost.planks, 'forsyninger brukes');
  assert.ok(run(s, 600, () => target.state === 'utpost'), 'utposten blir til');
  assert.equal(s.humans.length, people - B.globe.outpostParty, 'nybyggerne er borte fra hjemmeregionen');
  assert.equal(s.settlements[0].population.length, s.humans.length, 'bosettingens folketall følger med');
  assert.equal(target.pop, B.globe.outpostParty);
  const before = { ...s.resources }, totals = { ...s.totals };
  assert.ok(run(s, 400, () => G.stats.caravanDeliveries >= 1), 'en karavane ankommer');
  const gain = ['wood', 'stone', 'food', 'planks', 'cutstone'].reduce((n, k) => n + (s.totals[k] - totals[k]), 0);
  assert.ok(gain > 0, 'varer ble levert');
  assert.ok(G.caravans.length <= B.globe.maxCaravans);
  assert.ok(Object.values(s.resources).every((v) => v >= 0));
  assert.ok(run(s, 900, () => target.pop >= B.globe.establishedPop && target.state === 'etablert'), 'utposten vokser til etablert');
  assert.ok(target.pop <= B.globe.outpostCap);
  assert.equal(outpostRegions(s).length, 1);
});

test('begrensninger: ingen ekspedisjon uten hender eller forsyninger', () => {
  const s = createGame(); s.globe.expeditionsEnabled = true; s.globe.nextMissionAt = 0;
  assert.ok(worldReadiness(s, 'expedition').some((c) => c.id === 'hands' && !c.ok));
  run(s, 30);
  assert.equal(s.globe.mission, null);
});

test('kartkantpunkt ligger på kanten i retning av regionen', () => {
  const s = createGame(); const C = s.settlement.center;
  for (const r of s.globe.regions.filter((q) => !q.home)) {
    const e = edgePoint(s, r);
    assert.ok(e.x >= 0 && e.x <= s.world.width && e.y >= 0 && e.y <= s.world.height);
    const dir = Math.sign(r.col - 2), dirY = Math.sign(r.row - 1);
    if (dir) assert.equal(Math.sign(e.x - C.x), dir); if (dirY) assert.equal(Math.sign(e.y - C.y), dirY);
  }
});

test('oversikt: rutenett uten overlapp, riktig projeksjon og treff', () => {
  const s = createGame();
  for (const [w, h] of [[1366, 768], [1920, 1080], [900, 600]]) {
    const L = overviewLayout(s, w, h);
    const cells = [...L.cells.values()];
    for (const c of cells) { assert.ok(c.x >= 0 && c.y >= 0 && c.x + c.w <= w + 0.5 && c.y + c.h <= h + 0.5, 'innenfor skjermen'); assert.ok(Math.abs(c.w / c.h - 1.5) < 1e-6, 'sideforhold 3:2'); }
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) { const a = cells[i], b = cells[j]; assert.ok(a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 || a.y + a.h <= b.y + 0.01 || b.y + b.h <= a.y + 0.01, 'ingen overlapp'); }
    const tl = worldToOverview(L, s, 0, 0), br = worldToOverview(L, s, s.world.width, s.world.height);
    assert.ok(Math.abs(tl.x - L.home.x) < 1e-6 && Math.abs(br.x - (L.home.x + L.home.w)) < 1e-6 && Math.abs(br.y - (L.home.y + L.home.h)) < 1e-6);
    const mid = worldToOverview(L, s, s.settlement.center.x, s.settlement.center.y);
    assert.equal(regionAt(L, s, mid.x, mid.y).home, true);
    assert.equal(regionAt(L, s, -5, -5), null);
  }
  assert.equal(frontierIds(s).size, 8);
});

test('kameraet kommer alltid trygt tilbake fra oversikten: glid til områdevisning er begrenset og gyldig', () => {
  const cam = createCamera(1200, 800); cam.maxW = 2300;
  glideTo(cam, 1200, 780, 1850, 1.2);
  for (let i = 0; i < 100; i++) updateCamera(cam, 0.02);
  assert.equal(cam.tween, null); assert.ok(Math.abs(cam.w - 1850) < 1);
});

test('sluttmilepælen krever virkelig utforskning og utposter — ikke bare oppgraderingen', () => {
  const s = createGame(); s.milestones.connected_realm = 1; s.upgrades.connected_world = 1;
  checkMilestones(s); assert.equal(s.milestones.first_world_civilization, undefined);
  s.globe.regions.filter((r) => !r.home).slice(0, 4).forEach((r) => { r.state = 'oppdaget'; });
  checkMilestones(s); assert.equal(s.milestones.first_world_civilization, undefined, 'ingen utposter');
  s.globe.regions.filter((r) => !r.home).slice(0, 2).forEach((r) => { r.state = 'utpost'; });
  checkMilestones(s); assert.equal(s.milestones.first_world_civilization, undefined, 'ingen karavaner');
  s.globe.stats.caravanDeliveries = 6; checkMilestones(s);
  assert.notEqual(s.milestones.first_world_civilization, undefined);
  assert.equal(civilizationStage(s).rank, 5);
});

test('fullt spill: Verdens første sivilisasjon nås ved vanlig spilling, deterministisk og uten snarveier', () => {
  const a = reached('first_world_civilization');
  assert.ok(a.ok, 'sluttmilepælen nås innen fire timer spilltid');
  const s = a.s;
  assert.ok(s.time < 14400);
  assert.equal(civilizationStage(s).rank, 5);
  assert.ok(discoveredRegions(s).length >= 4 && outpostRegions(s).length >= 2 && s.globe.stats.caravanDeliveries >= 6);
  for (const [k, v] of Object.entries(s.resources)) assert.ok(v >= 0, k);
  // Gjentakelse: samme frø og samme (bot-)handlinger gir identisk utfall.
  const b = fresh(20261009), bot = makeBot();
  assert.ok(playTo(b, bot, 'first_world_civilization', 14400));
  assert.equal(b.time, s.time);
  assert.equal(b.humans.length, s.humans.length);
  assert.deepEqual(b.settlements.map((q) => [q.id, q.x, q.y, q.kind]), s.settlements.map((q) => [q.id, q.x, q.y, q.kind]));
  assert.deepEqual(b.globe.regions.map((r) => r.state), s.globe.regions.map((r) => r.state));
  assert.equal(Math.round(b.totals.knowledge), Math.round(s.totals.knowledge));
});

test('Ragnarok gir et gyldig utgangspunkt: verdenskart, rike og nettverk nullstilles', () => {
  const { s } = reached('first_world_civilization');
  const r = createGame(s.seed);
  assert.equal(r.globe.stats.discovered, 0); assert.equal(r.globe.regions.filter((q) => q.state !== 'ukjent' && !q.home).length, 0);
  assert.equal(r.globe.caravans.length, 0); assert.equal(r.globe.mission, null);
  assert.equal(r.settlements.length, 1); assert.equal(r.realm.autoFounding, false);
  assert.deepEqual(r.network.routes, {}); assert.deepEqual(r.milestones, {}); assert.equal(r.resources.planks, 0);
  assert.equal(civilizationStage(r).rank, 0);
});
