// Målrettede tester for Genesis-01: økonomi, natur, bygging, mennesker, milepæler, kamera og stabilitet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance, clickNode, step, drainEvents } from '../src/sim/game.js';
import { purchase, upgradeStatus } from '../src/sim/economy.js';
import { upgradeById } from '../src/data/upgrades.js';
import { treeAvailable } from '../src/sim/nature.js';
import { productionRate } from '../src/sim/stats.js';
import { BALANCE as B } from '../src/data/balance.js';
import { createCamera, screenToWorld, worldToScreen, zoomAt, glideTo, updateCamera, setZoomLimits, clampCamera, VIEW } from '../src/view/camera.js';

const firstTree = (s) => s.nodes.find((n) => n.kind === 'tree' && n.growth === 1);
const firstRock = (s) => s.nodes.find((n) => n.kind === 'rock');

function runUntil(s, pred, maxSeconds) {
  const steps = Math.round(maxSeconds / B.dt);
  for (let i = 0; i < steps; i++) {
    step(s);
    if (s.events.length > 256) s.events.length = 0;
    if (pred(s)) return true;
  }
  return false;
}

function settledGame() {
  const s = createGame();
  s.resources.wood = 500; s.resources.stone = 500;
  assert.equal(purchase(s, 'first_shelter').ok, true);
  assert.ok(runUntil(s, () => s.buildings[0].complete, 30));
  assert.equal(purchase(s, 'awakening').ok, true);
  return s;
}

test('klikk på tre gir trevirke, klikk på stein gir stein', () => {
  const s = createGame();
  const t = firstTree(s), r = firstRock(s);
  const before = treeAvailable(t);
  assert.equal(clickNode(s, t.id), 1);
  assert.equal(s.resources.wood, 1);
  assert.equal(treeAvailable(t), before - 1);
  assert.equal(clickNode(s, r.id), 1);
  assert.equal(s.resources.stone, 1);
  assert.equal(r.stone, r.maxStone - 1);
});

test('tre felles ved uttømming, blir stubbe og vokser opp igjen', () => {
  const s = createGame();
  const t = firstTree(s);
  const cap = treeAvailable(t);
  for (let i = 0; i < cap; i++) clickNode(s, t.id);
  assert.equal(t.state, 'stump');
  assert.ok(s.events.some((e) => e.type === 'treeFelled' && e.id === t.id));
  assert.equal(clickNode(s, t.id), 0, 'stubbe gir ingenting');
  advance(s, B.tree.stumpRegrowSeconds + 1);
  assert.equal(t.state, 'alive');
  assert.ok(t.growth < 0.1);
  const g0 = t.growth;
  advance(s, 30);
  assert.ok(t.growth > g0 + 0.15, 'treet vokser synlig over tid');
});

test('ungt tre kan ikke høstes manuelt; stein fornyes og går aldri negativ', () => {
  const s = createGame();
  const young = s.nodes.find((n) => n.kind === 'tree' && n.growth < B.tree.harvestMinGrowthManual);
  assert.equal(clickNode(s, young.id), 0);
  const r = firstRock(s);
  for (let i = 0; i < r.maxStone + 5; i++) clickNode(s, r.id);
  assert.equal(r.stone, 0);
  assert.equal(s.resources.stone, r.maxStone);
  advance(s, B.rock.regenSeconds + 0.5);
  assert.equal(r.stone, 1);
});

test('oppgraderinger: låst, for dyr, kjøpbar og trekker riktig kostnad', () => {
  const s = createGame();
  assert.equal(upgradeStatus(s, upgradeById('awakening')), 'locked');
  assert.equal(upgradeStatus(s, upgradeById('first_shelter')), 'unaffordable');
  assert.equal(purchase(s, 'first_shelter').ok, false);
  assert.equal(s.buildings.length, 0);
  s.resources.wood = 12; s.resources.stone = 7;
  assert.equal(upgradeStatus(s, upgradeById('first_shelter')), 'available');
  assert.equal(purchase(s, 'first_shelter').ok, true);
  assert.deepEqual([s.resources.wood, s.resources.stone], [2, 2]);
  assert.equal(upgradeStatus(s, upgradeById('first_shelter')), 'building');
  assert.equal(purchase(s, 'first_shelter').ok, false, 'kan ikke kjøpes to ganger');
});

test('lyet bygges i trinn og blir ferdig; vekkelse gir mennesker ved lyet', () => {
  const s = createGame();
  s.resources.wood = 100; s.resources.stone = 100;
  purchase(s, 'first_shelter');
  const b = s.buildings[0];
  advance(s, 4);
  assert.ok(b.progress > 0.1 && b.progress < 0.5 && !b.complete, 'synlig delvis bygget');
  advance(s, 14);
  assert.ok(b.complete);
  assert.equal(upgradeStatus(s, upgradeById('first_shelter')), 'done');
  assert.ok(s.milestones.first_home != null);
  assert.equal(purchase(s, 'awakening').ok, true);
  assert.equal(s.humans.length, 2);
  for (const h of s.humans) assert.ok(Math.hypot(h.x - b.x, h.y - b.y) < 40);
});

test('mennesker sanker selv, og vist produksjon stemmer med leveransene', () => {
  const s = settledGame();
  const w0 = s.resources.wood, st0 = s.resources.stone;
  advance(s, 60);
  const gained = (s.resources.wood - w0) + (s.resources.stone - st0);
  assert.ok(gained > 10, `ressurser økte uten klikking (${gained})`);
  const logged = s.stats.log.reduce((a, e) => a + e.amount, 0);
  assert.equal(logged, gained);
  const rate = productionRate(s);
  assert.ok(Math.abs((rate.wood + rate.stone) * 60 - gained) < 1e-6);
});

test('mennesker kommer seg videre når målet forsvinner (ingen vranglås)', () => {
  const s = settledGame();
  const h = s.humans[0];
  assert.ok(runUntil(s, () => h.state === 'toNode' || h.state === 'gather', 30));
  const target = s.nodes.find((n) => n.id === h.targetId);
  // Spilleren tømmer målet mens mennesket er underveis.
  if (target.kind === 'tree') { while (treeAvailable(target) > 0) clickNode(s, target.id); }
  else { while (target.stone > 0) clickNode(s, target.id); }
  step(s);
  assert.notEqual(h.targetId, target.id);
  assert.ok(!target.reservedBy.includes(h.id));
  const d0 = h.deliveries;
  assert.ok(runUntil(s, () => h.deliveries > d0, 60), 'mennesket fortsetter å levere');
});

test('mennesker uten gyldige ressurser rusler og prøver igjen', () => {
  const s = settledGame();
  for (const n of s.nodes) { if (n.kind === 'tree') n.growth = 0.1; else n.stone = 0; }
  advance(s, 5);
  assert.ok(s.humans.every((h) => ['idle', 'wander', 'toStore'].includes(h.state)));
  s.nodes.find((n) => n.kind === 'rock').stone = 10;
  assert.ok(runUntil(s, () => s.humans.some((h) => h.state === 'gather'), 30));
});

test('bål og nye hjem bygges av menneskene uten overlapp; milepæl låser opp områdezoom', () => {
  const s = settledGame();
  assert.equal(purchase(s, 'common_fire').ok, true);
  assert.ok(runUntil(s, () => s.buildings.some((b) => b.type === 'fire' && b.complete), 60), 'bålet blir bygget');
  assert.equal(s.unlocks.zoomArea, false);
  assert.equal(purchase(s, 'new_home').ok, true);
  assert.equal(purchase(s, 'new_home').ok, false, 'ett hjem om gangen');
  assert.ok(runUntil(s, () => s.unlocks.zoomArea, 120), 'milepæl nås');
  assert.ok(s.milestones.settlement != null);
  assert.ok(runUntil(s, () => s.humans.length === 4, 5));
  for (let i = 0; i < 2; i++) {
    s.resources.wood += 200; s.resources.stone += 200;
    assert.equal(purchase(s, 'new_home').ok, true);
    assert.ok(runUntil(s, () => s.buildings.every((b) => b.complete), 120));
  }
  assert.equal(purchase(s, 'new_home').ok, false, 'maks antall hjem');
  const bs = s.buildings;
  for (let i = 0; i < bs.length; i++) {
    for (let j = i + 1; j < bs.length; j++) {
      assert.ok(Math.hypot(bs[i].x - bs[j].x, bs[i].y - bs[j].y) >= bs[i].radius + bs[j].radius, `${bs[i].type}/${bs[j].type} overlapper`);
    }
    for (const n of s.nodes) if (n.kind === 'rock') assert.ok(Math.hypot(bs[i].x - n.x, bs[i].y - n.y) >= bs[i].radius + n.radius);
  }
  const positions = bs.map((b) => [b.x, b.y]);
  advance(s, 60);
  assert.deepEqual(s.buildings.map((b) => [b.x, b.y]), positions, 'bygg flytter seg aldri');
});

test('felles lager, ordnet arbeid og landsbyildsted bygges autonomt og utløser første landsby', () => {
  const s = settledGame();
  s.resources.wood = 900; s.resources.stone = 900;
  assert.equal(purchase(s, 'common_fire').ok, true);
  assert.ok(runUntil(s, () => s.buildings.some((b) => b.type === 'fire' && b.complete), 60));
  for (let i = 0; i < 3; i++) {
    assert.equal(purchase(s, 'new_home').ok, true);
    assert.ok(runUntil(s, () => s.buildings.every((b) => b.complete), 120));
  }
  assert.equal(s.humans.length, 8, 'hjemmene gjør leiren til et større samfunn');
  assert.equal(purchase(s, 'shared_storage').ok, true);
  assert.ok(runUntil(s, () => s.buildings.some((b) => b.type === 'storage' && b.complete), 120));
  const storage = s.buildings.find((b) => b.type === 'storage');
  assert.equal(purchase(s, 'organized_labor').ok, true);
  assert.equal(purchase(s, 'village_hearth').ok, true);
  assert.ok(runUntil(s, () => s.buildings.some((b) => b.type === 'hearth' && b.complete), 120));
  assert.ok(runUntil(s, () => s.milestones.first_village != null, 10));
  assert.equal(s.unlocks.villageView, true);
  const h = s.humans[0];
  assert.ok(runUntil(s, () => h.state === 'toStore', 90));
  assert.ok(Math.hypot(h.tx - storage.x, h.ty - storage.y) < storage.radius + 28, 'leveransen går til felleslageret');
});

test('samme seed gir identisk verden og forløp (determinisme)', () => {
  const a = settledGame(), b = settledGame();
  advance(a, 90); advance(b, 90);
  assert.deepEqual(a.resources, b.resources);
  assert.deepEqual(a.humans.map((h) => [h.x, h.y, h.state]), b.humans.map((h) => [h.x, h.y, h.state]));
});

test('langtidskjøring: ingen løpsk spawning, negative ressurser eller NaN', () => {
  const s = settledGame();
  purchase(s, 'common_fire');
  purchase(s, 'hands_remember');
  advance(s, 40 * 60);
  const trees = s.nodes.filter((n) => n.kind === 'tree');
  assert.ok(trees.length <= B.tree.maxTrees, `for mange trær: ${trees.length}`);
  assert.equal(s.humans.length, 2);
  for (const v of Object.values(s.resources)) assert.ok(Number.isFinite(v) && v >= 0);
  for (const h of s.humans) assert.ok(Number.isFinite(h.x) && Number.isFinite(h.y));
  for (const n of s.nodes) assert.ok(n.kind === 'tree' ? n.growth >= 0 && n.growth <= 1 : n.stone >= 0 && n.stone <= n.maxStone);
  assert.ok(s.resources.pp > 0, 'bønn ved bålet gir PP');
  assert.ok(s.stats.log.length < 2000, 'statistikklogg beskjæres');
  drainEvents(s);
});

test('kamera: skjerm↔verden rundtur og zoom rundt markøren ved ulike nivåer', () => {
  const cam = createCamera(1200, 800, 1600, 900);
  for (const w of [400, 600, 820]) {
    cam.w = w;
    const p = screenToWorld(cam, 333, 222);
    const q = worldToScreen(cam, p.x, p.y);
    assert.ok(Math.abs(q.x - 333) < 1e-9 && Math.abs(q.y - 222) < 1e-9);
  }
  const before = screenToWorld(cam, 1200, 300);
  zoomAt(cam, 1200, 300, 0.8);
  const after = screenToWorld(cam, 1200, 300);
  assert.ok(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9);
  zoomAt(cam, 800, 450, 10);
  assert.equal(cam.w, VIEW.near.maxW, 'nær-grense før milepæl');
  setZoomLimits(cam, true);
  glideTo(cam, 1200, 780, VIEW.area.w, 4);
  let prevW = cam.w, jumps = 0;
  for (let i = 0; i < 300; i++) {
    updateCamera(cam, 1 / 60);
    clampCamera(cam, 2400, 1600);
    if (Math.abs(cam.w - prevW) > 40) jumps++;
    prevW = cam.w;
  }
  assert.equal(jumps, 0, 'jevn overgang uten hopp');
  assert.ok(Math.abs(cam.w - VIEW.area.w) < 1);
  const p = screenToWorld(cam, 100, 100);
  const q = worldToScreen(cam, p.x, p.y);
  assert.ok(Math.abs(q.x - 100) < 1e-9, 'interaksjon korrekt etter zoom');
});
