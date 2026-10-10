import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance } from '../src/sim/game.js';
import { enableMechanical, waterSuitability, windSuitability, stepMechanical, mechanicalMultiplier } from '../src/sim/mechanical.js';
import { serialize, deserialize, SAVE_VERSION } from '../src/sim/save.js';
import { addBuilding, addPeople } from './support.js';
import { inPond } from '../src/sim/world.js';

test('OPUS-06: vann- og vindsuitability er deterministisk og vannkraft krever vannkant', () => {
  const a = createGame(91), b = createGame(91), p = a.world.pond;
  assert.equal(windSuitability(a, 900, 600), windSuitability(b, 900, 600));
  assert.ok(waterSuitability(a, p.x + p.rx + 60, p.y) > 0.5);
  assert.equal(waterSuitability(a, a.settlement.center.x, a.settlement.center.y), 0);
});

test('OPUS-06: maskindeler bruker ekte tre og metall, og første mølle bruker deler', () => {
  const s = createGame(21); enableMechanical(s); addPeople(s, 'first', 3); addBuilding(s, 'workshop'); addBuilding(s, 'sawmill'); addBuilding(s, 'field');
  s.resources.wood = 80; s.resources.stone = 60; s.resources.planks = 20; s.resources.iron = 5;
  advance(s, 55);
  assert.ok(s.totals.mechanicalComponents >= 3, 'verkstedet lager deler av tre og jern');
  const mill = s.buildings.find((b) => b.type === 'watermill' || b.type === 'windmill');
  assert.ok(mill, 'etterspørsel og materialer starter autonom møllebygging');
  assert.ok(s.resources.wood < 80 && s.resources.mechanicalComponents < s.totals.mechanicalComponents, 'byggingen betaler med reelle varer');
});

test('OPUS-06: lokal drift gir foredlingsbonus, slitasje repareres uten negativ beholdning', () => {
  const s = createGame(31); enableMechanical(s); const saw = addBuilding(s, 'sawmill');
  // Et tørt sted på «mølleavstand» fra tjernet (en bekk eller innsjø kan ligge på akkurat det punktet i nye landskap).
  const p = s.world.pond; let mx = p.x + p.rx + 60, my = p.y;
  for (let k = 0; k < 24 && inPond(s, mx, my, 8); k++) { const a = k / 24 * Math.PI * 2; mx = p.x + Math.cos(a) * (p.rx * 1.45 + 5); my = p.y + Math.sin(a) * (p.ry * 1.45 + 5); }
  const mill = addBuilding(s, 'watermill', 'first', mx, my, { wear: .42, reliability: 1 });
  s.resources.wood = 100; s.resources.mechanicalComponents = 2; stepMechanical(s, 1);
  assert.ok(mill.availablePower > 0 && mechanicalMultiplier(s, 'first', 'sawmill') > 1);
  assert.equal(mechanicalMultiplier(s, 'first', 'workshop'), 1, 'ingen universell gratisbonus');
  assert.ok(s.resources.mechanicalComponents >= 0 && s.resources.wood >= 0 && saw.complete);
});

test('OPUS-06: v5-lagring migreres og aktiv mekanikk overlever lagring', () => {
  const s = createGame(41); enableMechanical(s); s.resources.mechanicalComponents = 4;
  const raw = JSON.parse(serialize(s)); assert.equal(raw.v, SAVE_VERSION); raw.v = 5; delete raw.state.mechanical;
  const migrated = deserialize(JSON.stringify(raw)); assert.ok(migrated.mechanical && 'mechanicalComponents' in migrated.resources);
  const restored = deserialize(serialize(s)); assert.equal(restored.resources.mechanicalComponents, 4);
});
