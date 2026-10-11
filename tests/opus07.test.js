import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance } from '../src/sim/game.js';
import { enableMaterials, harvestMineral } from '../src/sim/materials.js';
import { enableIndustry, stepIndustry, validRailway } from '../src/sim/industrial.js';
import { planTrade } from '../src/sim/trade.js';
import { serialize, deserialize, SAVE_VERSION } from '../src/sim/save.js';
import { addBuilding, addPeople } from './support.js';

test('OPUS-07: kullåren er seedet, begrenset og krever industrigruve før uttak', () => {
  const a = createGame(701), b = createGame(701); const ca = a.nodes.find((n) => n.mineral === 'coal'), cb = b.nodes.find((n) => n.mineral === 'coal');
  assert.deepEqual([ca.x, ca.y, ca.amount], [cb.x, cb.y, cb.amount]);
  enableMaterials(a); enableIndustry(a); ca.discovered = true;
  assert.equal(harvestMineral(a, ca), 0, 'kull oppstår ikke uten gruve');
  addBuilding(a, 'coal_mine'); const before = ca.amount; assert.equal(harvestMineral(a, ca, before + 2), before); assert.equal(ca.amount, 0);
});

test('OPUS-07: damp bruker kull, stanser uten brensel og reparerer uten negative lagre', () => {
  const s = createGame(702); enableIndustry(s); const e = addBuilding(s, 'steam_engine', 'first', 900, 700, { reliability: 1, wear: .44 });
  s.resources.coal = 3; s.resources.wood = 3; s.resources.mechanicalComponents = 1; stepIndustry(s, 1);
  assert.ok(e.availablePower > 0 && s.resources.coal < 3);
  s.resources.coal = 0; stepIndustry(s, 1); assert.equal(e.availablePower, 0); assert.equal(e.idle, 'kull');
  assert.ok(Object.values(s.resources).every((n) => n >= 0));
});

test('OPUS-07: fabrikk forvandler ekte innsatsvarer bare med dampkraft', () => {
  const s = createGame(703); enableIndustry(s); addPeople(s, 'first', 3); addBuilding(s, 'steam_engine', 'first', 900, 700, { reliability: 1 }); const f = addBuilding(s, 'metalworks');
  s.resources.coal = 8; s.resources.iron = 2; advance(s, 20);
  assert.ok(s.resources.industrialMachinery >= 1 && s.resources.iron < 2 && f.made >= 1);
  const made = s.resources.industrialMachinery; s.resources.coal = 0; advance(s, 20); assert.equal(s.resources.industrialMachinery, made, 'ingen fri fabrikkproduksjon');
});

test('OPUS-07: jernbane har gyldig landkorridor; kull flyttes bare på bestilling og finnes bare i transit før ankomst (OPUS-12)', () => {
  const s = createGame(704); enableIndustry(s);
  s.region.enabled = true;
  s.settlements.push({ id: 'second', name: 'Kullbygda', x: s.settlement.center.x + 700, y: s.settlement.center.y - 220, state: 'active', population: [], kind: 'mine', projectsDone: 0, role: 'Gruvebygd', stage: 'By', stock: {} });
  assert.ok(validRailway(s, 'first', 'second'));
  addBuilding(s, 'locomotive_workshop'); s.resources.wood = 200; s.resources.planks = 80; s.resources.iron = 30; s.resources.railwayComponents = 8; s.resources.industrialMachinery = 4; s.resources.coal = 20;
  stepIndustry(s, 0.1); assert.equal(s.industrial.rails.length, 1); assert.equal(s.industrial.locomotives, 1);
  // Uten en bestilling går toget ikke (OPUS-11 sendte kull ut og tilbake uten nytte).
  stepIndustry(s, 0.1); assert.ok(!s.industrial.shipments.some((q) => q.rail), 'ingen last uten behov');
  // Når Kullbygda har overskudd av kull og hovedstaden mangler det, bestilles og fraktes kullet.
  s.resources.coal = 0; s.second = s.settlements[1]; s.settlements[1].stock.coal = 9;
  s.materials.enabled = true; s.buildings.push({ id: s.nextId++, type: 'coal_mine', x: 10, y: 10, radius: 30, complete: true, settlementId: 'first', builders: [] });
  assert.ok(planTrade(s) >= 1, 'hovedstaden bestiller kull');
  const sum = () => s.resources.coal + s.settlements[1].stock.coal + s.industrial.shipments.filter((q) => q.status === 'traveling').reduce((n, q) => n + q.amount, 0);
  const total = sum();
  stepIndustry(s, 0.1);
  const t = s.industrial.shipments.find((q) => q.rail && q.status === 'traveling');
  assert.ok(t && t.from === 'second' && t.to === 'first' && t.type === 'coal', 'toget går fra Kullbygda til hovedstaden');
  assert.equal(sum(), total, 'lasten er i transit, ikke duplisert');
  s.time += 30; stepIndustry(s, 0); assert.equal(s.industrial.deliveries, 1); assert.equal(sum(), total, 'ankomst bevarer lasten');
  assert.equal(s.resources.coal, t.amount);
});

test('OPUS-07: v6-lagring fylles med industri uten å miste kull eller last', () => {
  const s = createGame(705); enableIndustry(s); s.resources.coal = 7; s.industrial.shipments.push({ id: 9, type: 'coal', amount: 3, status: 'traveling', departAt: 2, arriveAt: 8, rail: 'first|second' });
  const raw = JSON.parse(serialize(s)); assert.equal(raw.v, SAVE_VERSION); raw.v = 6; delete raw.state.industrial; delete raw.state.resources.coal;
  const old = deserialize(JSON.stringify(raw)); assert.ok(old.industrial && 'coal' in old.resources);
  const restored = deserialize(serialize(s)); assert.equal(restored.resources.coal, 7); assert.equal(restored.industrial.shipments[0].amount, 3);
});
