import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/sim/game.js';
import { purchase } from '../src/sim/economy.js';
import { BALANCE as B } from '../src/data/balance.js';

function until(s, when, seconds = 360) {
  for (let i = 0; i < seconds / B.dt; i++) { step(s); if (when()) return true; }
  return false;
}

function foundedRegion() {
  const s = createGame(); s.resources.wood = 3000; s.resources.stone = 3000;
  purchase(s, 'first_shelter'); assert.ok(until(s, () => s.buildings[0]?.complete, 30));
  purchase(s, 'awakening'); purchase(s, 'common_fire'); assert.ok(until(s, () => s.buildings.some((b) => b.type === 'fire' && b.complete), 80));
  for (let i = 0; i < 3; i++) { purchase(s, 'new_home'); assert.ok(until(s, () => s.buildings.every((b) => b.complete), 140)); }
  purchase(s, 'shared_storage'); assert.ok(until(s, () => s.buildings.every((b) => b.complete), 140));
  purchase(s, 'organized_labor'); purchase(s, 'village_hearth'); assert.ok(until(s, () => s.milestones.first_village != null, 140));
  purchase(s, 'explorer_urge'); assert.ok(until(s, () => s.milestones.first_paths != null, 140));
  purchase(s, 'new_horizons'); assert.ok(until(s, () => s.expansion.discovered, 220));
  purchase(s, 'founding'); assert.ok(until(s, () => s.expansion.founded, 220));
  s.resources.wood = 3000; s.resources.stone = 3000;
  return s;
}

test('regional logistikk reserverer, leverer og bygger uten å skape ressurser', () => {
  const s = foundedRegion();
  const total = s.resources.wood + s.resources.stone;
  assert.equal(purchase(s, 'growing_kin').ok, true);
  assert.equal(purchase(s, 'between_hearths').ok, true);
  assert.ok(until(s, () => s.region.completedDeliveries >= 2, 260), 'minst to fysiske leveranser kommer frem');
  assert.ok(s.region.deliveries.every((d) => ['done', 'queued', 'reserved', 'traveling'].includes(d.status)));
  assert.ok(Object.values(s.region.reserved).every((n) => n >= 0));
  assert.ok(until(s, () => s.region.completedProjects >= 1, 300), 'lokalt prosjekt bygges først etter leveranser');
  assert.ok(s.resources.wood + s.resources.stone < total, 'oppgraderinger og leveranser kan ikke gi fri beholdning');
  assert.ok(s.buildings.some((b) => b.settlementId === 'second' && b.type === 'storage'));
});

test('lokal vekst respekterer boliger og ny syklus rydder regional tilstand', () => {
  const s = foundedRegion();
  purchase(s, 'growing_kin'); purchase(s, 'between_hearths');
  assert.ok(until(s, () => s.region.completedProjects >= 2, 500));
  assert.ok(until(s, () => s.settlements.find((q) => q.id === 'second').population.length >= 4, 160));
  const second = s.settlements.find((q) => q.id === 'second');
  const capacity = s.buildings.filter((b) => b.complete && b.settlementId === 'second' && b.type === 'hut').length * 2;
  assert.ok(second.population.length <= capacity);
  const reset = createGame(s.seed);
  assert.equal(reset.region.deliveries.length, 0);
  assert.equal(reset.region.completedDeliveries, 0);
  assert.equal(reset.settlements.length, 1);
});
