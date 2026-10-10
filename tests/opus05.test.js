import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance, step } from '../src/sim/game.js';
import { serialize, deserialize } from '../src/sim/save.js';
import { routeMode, regionState } from '../src/sim/worldmap.js';
import { stepNavigation } from '../src/sim/navigation.js';

test('OPUS-05: vannadgang og rutevalg er seed-deterministisk, og land uten fartøy bruker aldri sjøvei', () => {
  const a = createGame(73), b = createGame(73);
  assert.deepEqual(a.globe.regions.map((r) => r.water), b.globe.regions.map((r) => r.water));
  const home = a.globe.regions.find((r) => r.home), other = a.globe.regions.find((r) => !r.home);
  home.water = { coast: true, river: true, openSea: true }; other.water = { coast: true, river: false, openSea: true };
  assert.equal(routeMode(a, other, home), 'land');
  a.globe.vessels.push({ id: 1, capacity: 6 });
  assert.equal(routeMode(a, other, home), 'sea');
});

test('OPUS-05: kai og båt koster vanlige varer, og kartkunnskap forbedres kun etter oppdagelse', () => {
  const s = createGame(9); s.navigation.enabled = true; s.navigation.nextSurveyAt = 0;
  s.resources.wood = 200; s.resources.stone = 100; s.resources.planks = 80;
  const before = { ...s.resources };
  stepNavigation(s);
  const dock = s.buildings.find((b) => b.type === 'dock'); assert.ok(dock);
  assert.ok(s.resources.wood < before.wood && s.resources.planks < before.planks);
  dock.complete = true; dock.progress = 1; stepNavigation(s);
  assert.equal(s.globe.vessels.length, 1);
  const r = s.globe.regions.find((q) => !q.home); assert.equal(r.knowledge, 'unknown');
  r.state = regionState.OPPDAGET; r.knowledge = 'discovered'; s.navigation.nextSurveyAt = 0; stepNavigation(s);
  assert.equal(r.knowledge, 'surveyed');
});

test('OPUS-05: sjølast reserveres, leveres én gang og overlever lagring underveis', () => {
  const s = createGame(10), home = s.globe.regions.find((r) => r.home), r = s.globe.regions.find((q) => !q.home);
  home.water = { coast: true, river: false, openSea: true }; r.water = { coast: true, river: false, openSea: true };
  r.state = regionState.ETABLERT; r.pop = 6; r.nextCaravanAt = 0; r.inventory = { copperOre: 8 };
  s.globe.vessels.push({ id: 500, capacity: 12, route: null, cargo: null, x: 0, y: 0 });
  step(s); const shipment = s.globe.caravans[0]; assert.ok(shipment && shipment.mode === 'sea');
  assert.ok(shipment.goods.reduce((n, g) => n + g.amount, 0) <= 12, 'lasten holder seg innen fartøyets kapasitet');
  const reserved = r.inventory.copperOre, saved = deserialize(serialize(s)); assert.ok(saved);
  advance(saved, 180);
  assert.equal(saved.resources.copperOre, 8 - reserved);
  assert.equal(saved.globe.stats.maritimeDeliveries, 1);
  assert.equal(saved.globe.vessels[0].route, null);
});
