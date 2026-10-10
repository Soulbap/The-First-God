import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance, step } from '../src/sim/game.js';
import { enableMaterials, harvestMineral } from '../src/sim/materials.js';
import { serialize, deserialize } from '../src/sim/save.js';
import { createGlobe } from '../src/sim/worldmap.js';
import { addPeople } from './support.js';

const complete = (s, type) => {
  const b = { id: s.nextId++, type, x: 100 + s.buildings.length * 70, y: 100, radius: 20, complete: true, cycle: 0, active: false, idle: null };
  s.buildings.push(b); return b;
};

test('mineralforekomster er deterministiske, begrensede og har alltid kobber nær hjemmet', () => {
  const a = createGame(77), b = createGame(77);
  const pick = (s) => s.nodes.filter((n) => n.kind === 'mineral').map((n) => [n.mineral, Math.round(n.x), Math.round(n.y), n.amount]);
  assert.deepEqual(pick(a), pick(b));
  const copper = a.nodes.find((n) => n.mineral === 'copperOre');
  assert.ok(Math.hypot(copper.x - a.settlement.center.x, copper.y - a.settlement.center.y) < 700);
  enableMaterials(a); copper.discovered = true;
  const initial = copper.amount; assert.equal(harvestMineral(a, copper, initial + 9), initial); assert.equal(copper.amount, 0);
});

test('smelting bruker virkelige innsatsvarer, stanser uten kull og lager bronse/jern uten duplisering', () => {
  const s = createGame(4); enableMaterials(s, { ironworking: true });
  addPeople(s, 'first', 3);
  complete(s, 'smelter');
  s.resources.copperOre = 2; s.resources.charcoal = 1;
  advance(s, 14); assert.equal(s.resources.copper, 1); assert.equal(s.resources.copperOre, 0); assert.equal(s.resources.charcoal, 0);
  const before = s.resources.copper; advance(s, 20); assert.equal(s.resources.copper, before, 'ingen fri produksjon uten innsats');
  s.resources.copper = 2; s.resources.tinOre = 1; s.resources.charcoal = 1; advance(s, 17); assert.equal(s.resources.bronze, 1);
  s.resources.ironOre = 2; s.resources.charcoal = 2; advance(s, 19); assert.equal(s.resources.iron, 1);
  assert.ok(Object.values(s.resources).every((n) => n >= 0));
});

test('v3-lagring fylles med OPUS-04-felt og transportinventar uten å forsvinne', () => {
  const s = createGame(12); enableMaterials(s); s.resources.copperOre = 3;
  const raw = JSON.parse(serialize(s)); raw.v = 3; delete raw.state.materials; delete raw.state.resources.copperOre;
  const loaded = deserialize(JSON.stringify(raw));
  assert.ok(loaded && loaded.materials && 'copperOre' in loaded.resources);
  const g = createGlobe(12); assert.deepEqual(g.regions, createGlobe(12).regions);
});
