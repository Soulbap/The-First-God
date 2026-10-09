// OPUS-01: velsignelser (PP), høstfest, Ragnarok-arv og bosettingens soner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, advance, clickNode } from '../src/sim/game.js';
import { purchase, upgradeStatus } from '../src/sim/economy.js';
import { upgradeById } from '../src/data/upgrades.js';
import { BALANCE as B } from '../src/data/balance.js';
import { festivalActive } from '../src/sim/civilization.js';
import { ragnarokAward, buyPrestige, canBuyPrestige, applyLegacy, emptyMeta, cycleMemory } from '../src/sim/legacy.js';
import { PRESTIGE, prestigeCost } from '../src/data/prestige.js';
import { findBuildSite, zoneOf } from '../src/sim/construction.js';
import { reached } from './support.js';

function camp(seed = 20261009) {
  const s = createGame(seed);
  s.resources.wood = 500; s.resources.stone = 500;
  purchase(s, 'first_shelter'); advance(s, 20);
  purchase(s, 'awakening'); purchase(s, 'common_fire');
  for (let i = 0; i < 200 && !s.buildings.some((b) => b.type === 'fire' && b.complete); i++) advance(s, 1);
  return s;
}

test('velsignelse: låst uten bønn, kjøpbar med PP, virker varig og har nivåer med stigende pris', () => {
  const s = camp();
  const def = upgradeById('blessed_rain');
  assert.equal(upgradeStatus(s, def), 'locked', 'ingen bønn ennå');
  s.totals.pp = 10; s.resources.pp = 5;
  assert.equal(upgradeStatus(s, def), 'unaffordable');
  s.resources.pp = 100;
  assert.equal(purchase(s, 'blessed_rain').ok, true);
  assert.ok(Math.abs(s.modifiers.treeGrowth - 1.4) < 1e-9);
  assert.equal(s.resources.pp, 100 - 12);
  assert.ok(s.events.some((e) => e.type === 'blessing' && e.kind === 'rain'), 'verden får et synlig svar');
  assert.equal(purchase(s, 'blessed_rain').ok, true);
  assert.equal(s.resources.pp, 100 - 12 - Math.round(12 * 2.4));
  s.resources.pp = 1000;
  purchase(s, 'blessed_rain');
  assert.equal(upgradeStatus(s, def), 'done', 'maks tre nivåer');
  assert.equal(purchase(s, 'blessed_rain').ok, false);
});

test('velsignelse: regn får det samme unge treet til å vokse raskere (samme verden, samme tid)', () => {
  const a = createGame(20261009), b = createGame(20261009);
  b.modifiers.treeGrowth = 1.4; // det kjøpet over setter
  const pickYoung = (s) => s.nodes.find((n) => n.kind === 'tree' && n.growth < 0.4);
  const ta = pickYoung(a), tb = pickYoung(b), g0 = ta.growth;
  advance(a, 30); advance(b, 30);
  assert.ok(tb.growth - g0 > (ta.growth - g0) * 1.3, `${tb.growth} mot ${ta.growth}`);
});

test('velsignelse: steinens gave fornyer stein raskere; vandrerens letthet gjør folk raskere', () => {
  const s = camp();
  s.totals.pp = 200; s.resources.pp = 500; s.upgrades.hands_remember = 1;
  purchase(s, 'stone_gift'); purchase(s, 'wanderer_ease');
  assert.ok(Math.abs(s.modifiers.rockRegen - 0.7) < 1e-9);
  assert.ok(Math.abs(s.modifiers.walkSpeed - 1.12) < 1e-9);
  const rock = s.nodes.find((n) => n.kind === 'rock');
  rock.stone = 0; rock.regenTimer = 0;
  advance(s, B.rock.regenSeconds * 0.72);
  assert.ok(rock.stone >= 1);
});

test('høstfest: starter bare med matoverskudd og ildsted, bruker mat, dobler bønn og blir aldri negativ', () => {
  const s = camp();
  s.civilization.foodUnlocked = true; s.civilization.nextFoodAt = Infinity; s.civilization.nextPopulationAt = Infinity;
  s.resources.food = 5;
  advance(s, 5);
  assert.equal(s.civilization.festivals, 0, 'for lite mat');
  s.resources.food = 200;
  step(s);
  assert.equal(s.civilization.festivals, 1);
  assert.ok(festivalActive(s));
  assert.ok(s.resources.food < 200 && s.resources.food >= 0);
  const pp0 = s.totals.pp;
  advance(s, B.festival.duration - 1);
  assert.ok(s.totals.pp > pp0, 'folket ber under festen');
  advance(s, 2);
  assert.ok(!festivalActive(s), 'festen tar slutt');
  advance(s, 10);
  assert.equal(s.civilization.festivals, 1, 'ny fest først etter pausen');
  s.resources.food = 0; advance(s, B.festival.interval);
  assert.ok(s.resources.food >= 0);
});

test('høstfest: gir milepælen Den første høstfesten i et vanlig forløp', () => {
  const { s } = reached('stable_food');
  for (let i = 0; i < 60 && s.milestones.first_harvest_feast == null; i++) advance(s, 10);
  assert.ok(s.milestones.first_harvest_feast != null);
});

test('Ragnarok: PrP tildeles for det som er bygget; ekko kjøpes med grenser og stigende pris', () => {
  const fresh = createGame(20261009);
  const award0 = ragnarokAward(fresh);
  const s = camp(); advance(s, 60);
  assert.ok(ragnarokAward(s) > award0);
  const meta = emptyMeta(); meta.prestige = 10;
  assert.equal(buyPrestige(meta, 'old_roots'), 5);
  assert.equal(meta.bonuses.old_roots, 1);
  assert.equal(canBuyPrestige(meta, 'old_roots'), false, `neste nivå koster ${prestigeCost(PRESTIGE[0], 1)}`);
  meta.prestige = 1000;
  buyPrestige(meta, 'old_roots'); buyPrestige(meta, 'old_roots');
  assert.equal(buyPrestige(meta, 'old_roots'), 0, 'maks nivå');
  assert.equal(buyPrestige(meta, 'finnes_ikke'), 0);
  const mem = cycleMemory(s, 3);
  assert.equal(mem.n, 3); assert.ok(mem.stage && mem.people >= 2);
});

test('Ragnarok: ekko endrer bare modifikatorer — startverdenen er identisk, og skapelsen må fortsatt gjøres', () => {
  const meta = emptyMeta();
  meta.bonuses = { old_roots: 2, kind_oblivion: 1, echo_prayers: 1, remembered_hands: 1, ash_starmap: 1 };
  meta.legacy = [{ n: 1, stage: 'Spirende samfunn', people: 8, settlements: 1, minutes: 20 }];
  const a = createGame(20261009), b = createGame(20261009, meta);
  assert.deepEqual(b.nodes.map((n) => [n.kind, n.x, n.y]), a.nodes.map((n) => [n.kind, n.x, n.y]), 'samme tre, stein og landskap');
  assert.equal(b.buildings.length, 0); assert.equal(b.humans.length, 0); assert.equal(b.resources.wood, 0);
  assert.equal(b.legacy.stones.length, 1);
  const tree = b.nodes.find((n) => n.kind === 'tree' && n.growth === 1);
  assert.equal(clickNode(b, tree.id), 3, 'Gamle røtter: +2 per klikk');
  b.resources.wood = 100; b.resources.stone = 100;
  purchase(b, 'first_shelter'); advance(b, 20); purchase(b, 'awakening');
  assert.equal(b.humans.length, 3, 'Glemselens vennlighet vekker én til');
  assert.ok(Math.abs(b.modifiers.prayerMult - 1.5) < 1e-9 && Math.abs(b.modifiers.expeditionSpeed - 1.25) < 1e-9);
  assert.equal(applyLegacy(createGame(1), null).legacy.cycles, 0, 'uten meta: ingen arv');
});

test('soner: sagbruket vender mot skogen, åkeren ligger lenger ute enn hjemmene, og hjemmene klynger seg', () => {
  const { s } = reached('dawn_civilization');
  assert.equal(zoneOf('townhouse'), 'home'); assert.equal(zoneOf('sawmill'), 'work'); assert.equal(zoneOf('field'), 'field');
  const fire = s.buildings.find((b) => b.type === 'fire');
  const saw = findBuildSite(s, 'sawmill');
  assert.ok(saw, 'sagbruket finner tomt');
  // Retning mot skogens tyngdepunkt
  let tx = 0, ty = 0;
  for (const n of s.nodes) if (n.kind === 'tree' && n.state === 'alive') { const d = Math.hypot(n.x - fire.x, n.y - fire.y); if (d > 40 && d < 900) { tx += (n.x - fire.x) / d / (d + 120); ty += (n.y - fire.y) / d / (d + 120); } }
  assert.ok((saw.x - fire.x) * tx + (saw.y - fire.y) * ty > 0, 'sagbruket ligger på skogsiden');
  const homes = s.buildings.filter((b) => zoneOf(b.type) === 'home' && (b.settlementId || 'first') === 'first');
  const avgHome = homes.reduce((t, b) => t + Math.hypot(b.x - fire.x, b.y - fire.y), 0) / homes.length;
  const field = s.buildings.find((b) => b.type === 'field' && (b.settlementId || 'first') === 'first');
  assert.ok(Math.hypot(field.x - fire.x, field.y - fire.y) > avgHome, 'åkeren ligger i utkanten');
  const nearest = homes.map((h) => Math.min(...homes.filter((q) => q !== h).map((q) => Math.hypot(q.x - h.x, q.y - h.y))));
  assert.ok(nearest.reduce((a, b) => a + b, 0) / nearest.length < 170, 'hjemmene ligger tett');
});
