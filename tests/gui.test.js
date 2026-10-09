// GUI-01: progressiv oppdagelse, visningsmodell for Innsikter og ressurslinjen. Uten DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, advance, clickNode, drainEvents } from '../src/sim/game.js';
import { purchase, upgradeStatus } from '../src/sim/economy.js';
import { UPGRADES, upgradeById } from '../src/data/upgrades.js';
import { CATEGORIES } from '../src/data/gui.js';
import { isDiscovered } from '../src/sim/discovery.js';
import { selectInsights, selectResources, selectDivine, currentEpoch, reachedMilestones, fmtAmount, fmtRate } from '../src/ui/insights.js';
import { BALANCE as B } from '../src/data/balance.js';

const ids = (s) => selectInsights(s).cards.map((c) => c.id);
const card = (s, id) => selectInsights(s).cards.find((c) => c.id === id);
const tree = (s) => s.nodes.find((n) => n.kind === 'tree' && n.growth === 1);
const rock = (s) => s.nodes.find((n) => n.kind === 'rock');

function runUntil(s, pred, maxSeconds) {
  for (let i = 0; i < Math.round(maxSeconds / B.dt); i++) {
    step(s);
    if (s.events.length > 256) s.events.length = 0;
    if (pred(s)) return true;
  }
  return false;
}
const give = (s, w, st) => { s.resources.wood += w; s.resources.stone += st; };

function withShelter() {
  const s = createGame();
  clickNode(s, tree(s).id);
  give(s, 10, 5);
  assert.equal(purchase(s, 'first_shelter').ok, true);
  assert.ok(runUntil(s, () => s.buildings[0].complete, 30));
  return s;
}

test('start: ingen innsikter vises, ingen kategorier, ingen fremtidige priser', () => {
  const s = createGame();
  step(s);
  const m = selectInsights(s);
  assert.deepEqual(m.cards, []);
  assert.equal(m.showTabs, false);
  assert.equal(m.availableCount, 0);
  assert.deepEqual(s.discovered, {});
});

test('første sanking oppdager Første ly (én gang, med hendelse)', () => {
  const s = createGame();
  clickNode(s, tree(s).id);
  step(s);
  assert.deepEqual(ids(s), ['first_shelter']);
  assert.equal(drainEvents(s).filter((e) => e.type === 'discovered').length, 1);
  advance(s, 2);
  assert.equal(drainEvents(s).filter((e) => e.type === 'discovered').length, 0, 'ingen gjentatt oppdagelse');
});

test('oppdaget men for dyr: lesbart kort med manglende ressurser og fremdrift; kjøp avvises', () => {
  const s = createGame();
  for (let i = 0; i < 6; i++) clickNode(s, tree(s).id);
  for (let i = 0; i < 3; i++) clickNode(s, rock(s).id);
  step(s);
  const c = card(s, 'first_shelter');
  assert.equal(c.status, 'unaffordable');
  assert.equal(c.missingText, 'Mangler 4 trevirke og 2 stein');
  assert.deepEqual(c.cost.map((k) => [k.res, k.need, k.ok]), [['wood', 10, false], ['stone', 5, false]]);
  assert.ok(Math.abs(c.progress - 0.6) < 1e-9, 'fremdrift = svakeste ressurs (6/10, 3/5)');
  assert.equal(c.verb, 'Bygg');
  assert.equal(purchase(s, 'first_shelter').ok, false);
  assert.equal(s.resources.wood, 6, 'ingenting trekkes');
  give(s, 4, 2);
  assert.equal(card(s, 'first_shelter').status, 'available');
  assert.equal(card(s, 'first_shelter').missingText, '');
  assert.equal(selectInsights(s).availableCount, 1);
});

test('Vekkelse er skjult til lyet står — også mens det bygges og med nok ressurser', () => {
  const s = createGame();
  clickNode(s, tree(s).id);
  give(s, 100, 100);
  purchase(s, 'first_shelter');
  advance(s, 4);
  assert.deepEqual(ids(s), ['first_shelter']);
  const c = card(s, 'first_shelter');
  assert.equal(c.status, 'building');
  assert.ok(c.buildProgress > 0 && c.buildProgress < 1, 'byggefremdrift vises');
  assert.ok(!isDiscovered(s, upgradeById('awakening')));
  assert.ok(runUntil(s, () => s.buildings[0].complete, 30));
  step(s);
  assert.deepEqual(ids(s), ['awakening'], 'fullført engangsvalg forsvinner, neste dukker opp');
  assert.equal(card(s, 'awakening').verb, 'Lås opp');
});

test('etter Vekkelse: Felles ild og Hendene husker oppdages, og kategorifaner (Liv, Tro) vises', () => {
  const s = withShelter();
  step(s);
  assert.equal(selectInsights(s).showTabs, false, 'én kategori gir ingen faner');
  give(s, 12, 6);
  assert.equal(purchase(s, 'awakening').ok, true);
  step(s);
  const m = selectInsights(s);
  assert.deepEqual(m.cards.map((c) => c.id), ['common_fire', 'hands_remember']);
  assert.equal(m.showTabs, true);
  assert.deepEqual(m.categories.map((c) => c.id), ['liv', 'tro']);
  assert.ok(!m.cards.some((c) => c.id === 'new_home'), 'Nytt hjem er ikke oppdaget før bålet står');
  assert.ok(m.categories.every((c) => CATEGORIES.some((k) => k.id === c.id)));
});

test('Nytt hjem: gjentakbart, synlig mens det bygges, forsvinner ved maks', () => {
  const s = withShelter();
  give(s, 500, 500);
  purchase(s, 'awakening');
  purchase(s, 'common_fire');
  assert.ok(runUntil(s, () => s.buildings.some((b) => b.type === 'fire' && b.complete), 60));
  step(s);
  assert.deepEqual(card(s, 'new_home').level, { count: 0, max: 3 });
  for (let i = 1; i <= 3; i++) {
    assert.equal(purchase(s, 'new_home').ok, true);
    step(s);
    assert.equal(card(s, 'new_home')?.status, 'building', 'kortet blir stående under bygging');
    assert.equal(card(s, 'new_home').level.count, i);
    assert.ok(runUntil(s, () => s.buildings.every((b) => b.complete), 120));
    step(s);
  }
  assert.equal(card(s, 'new_home'), undefined, 'maks nådd: borte fra aktive valg');
  assert.equal(upgradeStatus(s, upgradeById('new_home')), 'done');
});

test('hele tidligspillet: alt som kan kjøpes er oppdaget (ingen softlock), og ingenting er synlig før det er relevant', () => {
  const s = createGame();
  const check = () => {
    for (const def of UPGRADES) {
      const st = upgradeStatus(s, def);
      if (st === 'available' || st === 'unaffordable') assert.ok(isDiscovered(s, def), `${def.id} kjøpbar men skjult`);
    }
    for (const c of selectInsights(s).cards) assert.notEqual(c.status, 'done');
  };
  for (let i = 0; i < 10; i++) clickNode(s, tree(s).id);
  for (let i = 0; i < 5; i++) clickNode(s, rock(s).id);
  step(s); check();
  const order = ['first_shelter', 'awakening', 'common_fire', 'hands_remember', 'new_home', 'new_home', 'new_home'];
  for (const id of order) {
    assert.ok(runUntil(s, () => { check(); return upgradeStatus(s, upgradeById(id)) !== 'locked' && s.buildings.every((b) => b.complete); }, 180), `${id} blir mulig`);
    assert.ok(ids(s).includes(id), `${id} vises når det er mulig`);
    give(s, 200, 200);
    assert.equal(purchase(s, id).ok, true, id);
    step(s); check();
  }
  assert.ok(runUntil(s, () => s.buildings.every((b) => b.complete), 180));
  step(s);
  assert.deepEqual(ids(s), ['shared_storage'], 'neste landsbysteg vises etter at leirinnholdet er fullført');
  assert.equal(s.humans.length, 8);
});

test('ressurslinje: Folk og produksjon vises først når mennesker finnes; PP først når bålet står', () => {
  const s = withShelter();
  assert.deepEqual(selectResources(s).map((r) => [r.id, r.rate]), [['wood', null], ['stone', null]]);
  assert.equal(selectDivine(s), null);
  give(s, 100, 100);
  purchase(s, 'awakening');
  advance(s, 30);
  const res = selectResources(s);
  assert.deepEqual(res.map((r) => r.id), ['wood', 'stone', 'people']);
  assert.equal(res[2].value, 2);
  assert.ok(res[0].rate >= 0 && res[1].rate >= 0);
  assert.equal(selectDivine(s), null, 'PP antydes ikke før bønn er mulig');
  purchase(s, 'common_fire');
  assert.ok(runUntil(s, () => s.buildings.some((b) => b.type === 'fire' && b.complete), 60));
  assert.equal(selectDivine(s).id, 'pp');
});

test('epoke og undertittel følger bosettingen; milepæler listes i rekkefølge', () => {
  const s = createGame();
  assert.deepEqual(currentEpoch(s), { id: 'genesis', name: 'Genesis', stage: 'Skapelsens morgen' });
  assert.deepEqual(reachedMilestones(s), []);
  const t = withShelter();
  step(t);
  assert.equal(currentEpoch(t).stage, 'Det første lyet');
  assert.deepEqual(reachedMilestones(t).map((m) => m.id), ['first_home']);
  give(t, 500, 500);
  purchase(t, 'awakening');
  assert.equal(currentEpoch(t).stage, 'Den første leiren');
});

test('Ragnarok (ny syklus) starter uten oppdagelser eller kort', () => {
  const s = withShelter();
  step(s);
  assert.ok(ids(s).length > 0);
  const next = createGame(s.seed);
  assert.deepEqual(next.discovered, {});
  assert.deepEqual(ids(next), []);
});

test('tallformat: stabilt, desimalkomma, aldri negativt', () => {
  assert.equal(fmtAmount(0), '0');
  assert.equal(fmtAmount(9999.9), '9999');
  assert.equal(fmtAmount(12345), '12,3k');
  assert.equal(fmtAmount(2_500_000), '2,5M');
  assert.equal(fmtAmount(-3), '0');
  assert.equal(fmtRate(2.44), '+2,4/s');
  assert.equal(fmtRate(0), '+0,0/s');
});
