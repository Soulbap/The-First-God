// OPUS-11: verdensgenerering, ressursgeografi, geografi-invarianter og gjenvekst.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance } from '../src/sim/game.js';
import { createWorld, inPond, inMaintainedArea, inBuiltArea } from '../src/sim/world.js';
import { createGlobe } from '../src/sim/worldmap.js';
import { createPlanet, offsetDir } from '../src/sim/planet.js';
import { seedTree } from '../src/sim/nature.js';
import { serialize, deserialize } from '../src/sim/save.js';
import { PROFILES, inAnyWater } from '../src/sim/landscape.js';
import { BALANCE as B } from '../src/data/balance.js';
import { reached, addBuilding } from './support.js';

const SEEDS = [1, 7, 34, 100, 701, 2026, 4242, 31337, 20261009];
const count = (s, kind) => s.nodes.filter((n) => n.kind === kind).length;

test('geografi: hvert land ligger på land med riktig landskap, og kystland har hav (150 frø)', () => {
  const fails = [];
  for (let seed = 1; seed <= 150; seed++) {
    const g = createGlobe(seed), P = createPlanet(seed, g.regions);
    for (const r of g.regions) {
      const site = P.sites.get(r.id), biome = P.biomeAt(site.dir), e = P.surface(site.dir).e;
      if (!(e > 0)) fails.push(`${seed} ${r.name} i havet`);
      if (r.biome === 'fjell' && biome !== 'fjell') fails.push(`${seed} ${r.name} fjell→${biome}`);
      if (r.biome === 'skog' && biome !== 'skog') fails.push(`${seed} ${r.name} skog→${biome}`);
      if (r.biome === 'slette' && !['slette', 'ørken'].includes(biome)) fails.push(`${seed} ${r.name} slette→${biome}`);
      if (r.biome === 'kyst') {
        let sea = false;
        for (let k = 0; k < 24 && !sea; k++) { const a = (k / 24) * Math.PI * 2; for (const d of [0.04, 0.07, 0.1]) if (P.surface(offsetDir(P.home.basis, site.x + Math.cos(a) * d, site.y + Math.sin(a) * d)).e < 0) sea = true; }
        if (!sea) fails.push(`${seed} ${r.name} kyst uten hav`);
      }
    }
  }
  assert.deepEqual(fails, []);
});

test('landskap: deterministisk per frø og biom, og forskjellig mellom biomer og frø', () => {
  const sig = (w) => JSON.stringify([w.nodes.map((n) => [n.kind, Math.round(n.x), Math.round(n.y)]), w.world.streams, w.world.waters, w.world.zones]);
  assert.equal(sig(createWorld(77, 'skog')), sig(createWorld(77, 'skog')));
  assert.notEqual(sig(createWorld(77, 'skog')), sig(createWorld(78, 'skog')));
  assert.notEqual(sig(createWorld(77, 'skog')), sig(createWorld(77, 'fjell')));
});

test('landskap: biomene har egen identitet (fjell er steinrikt, slette åpen, skog tett)', () => {
  let rocks = { fjell: 0, slette: 0, skog: 0 }, trees = { fjell: 0, slette: 0, skog: 0 };
  for (const seed of SEEDS) for (const b of Object.keys(rocks)) { const w = createWorld(seed, b, { remote: true }); rocks[b] += count(w, 'rock'); trees[b] += count(w, 'tree'); }
  assert.ok(rocks.fjell > rocks.slette && rocks.fjell > rocks.skog, `stein: ${JSON.stringify(rocks)}`);
  assert.ok(trees.skog > trees.slette && trees.skog > trees.fjell, `trær: ${JSON.stringify(trees)}`);
  for (const b of Object.keys(PROFILES)) assert.ok(createWorld(5, b).nodes.length > 40, `${b} er ikke tomt`);
});

test('landskap: ingen trær, steiner eller årer i vann, og leirens hjerte er åpent og tørt', () => {
  for (const seed of SEEDS) for (const biome of Object.keys(PROFILES)) {
    const w = createWorld(seed, biome), C = w.settlement.center;
    for (const n of w.nodes) {
      assert.ok(!inAnyWater(w, n.x, n.y, 4), `${seed}/${biome}: ${n.kind} i vann (${Math.round(n.x)},${Math.round(n.y)})`);
      assert.ok(n.x > 0 && n.y > 0 && n.x < w.world.width && n.y < w.world.height, 'innenfor kartet');
    }
    assert.ok(!inPond(w, C.x, C.y, 60), `${seed}/${biome}: leiren står ikke i vann`);
    for (const s of w.world.streams) assert.ok(s.pts.every((p) => Math.hypot(p.x - C.x, (p.y - C.y) / 0.72) >= B.landscape.streamClear - 1), 'bekken holdes unna leirens hjerte');
  }
});

test('landskap: bekk og innsjø finnes i en del verdener og lagres og leses uendret; eldre lagring får ingen nye vannlegemer', () => {
  const withWater = SEEDS.filter((sd) => { const w = createWorld(sd); return w.world.streams.length || w.world.waters.length; });
  assert.ok(withWater.length >= 5, 'vann utover tjernet er vanlig, men ikke alltid');
  const s = createGame(withWater[0]);
  const back = deserialize(serialize(s));
  assert.deepEqual(back.world.streams, s.world.streams); assert.deepEqual(back.world.waters, s.world.waters); assert.deepEqual(back.world.zones, s.world.zones);
  const raw = JSON.parse(serialize(s)); raw.v = 10; delete raw.state.world.streams; delete raw.state.world.waters; delete raw.state.world.zones;
  const old = deserialize(JSON.stringify(raw));
  assert.deepEqual(old.world.streams, []); assert.deepEqual(old.world.waters, []); assert.deepEqual(old.world.zones, []);
});

test('tidlig stein: rikelig og innen rekkevidde for alle frø (ingen blokkert start)', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const w = createWorld(seed), C = w.settlement.center;
    const rocks = w.nodes.filter((n) => n.kind === 'rock');
    const near = rocks.filter((r) => Math.hypot(r.x - C.x, (r.y - C.y) / 0.7) <= B.rock.earlyRadius + 120);
    const within = (d) => rocks.filter((r) => Math.hypot(r.x - C.x, r.y - C.y) <= d).reduce((n, r) => n + r.stone, 0);
    assert.ok(near.length >= 6, `${seed}: bare ${near.length} steiner nær leiren`);
    assert.ok(within(700) >= 150, `${seed}: bare ${within(700)} stein innen 700 enheter`);
  }
});

test('ressursgeografi: flere begrensede årer per mineral, deterministiske og ulike mellom frø', () => {
  const kinds = { copperOre: 3, tinOre: 2, ironOre: 5, coal: 3 };
  const amounts = {};
  for (const seed of SEEDS) {
    const a = createWorld(seed), b = createWorld(seed);
    for (const [k, n] of Object.entries(kinds)) {
      const va = a.nodes.filter((q) => q.mineral === k), vb = b.nodes.filter((q) => q.mineral === k);
      assert.ok(va.length >= Math.max(2, n - 1), `${seed}: ${k} har ${va.length} årer`);
      assert.deepEqual(va.map((q) => [q.x, q.y, q.amount]), vb.map((q) => [q.x, q.y, q.amount]), 'deterministisk');
      assert.ok(va.every((q) => q.amount > 0 && q.amount === q.maxAmount && Number.isFinite(q.amount)), 'begrenset');
      (amounts[k] ||= new Set()).add(va.reduce((t, q) => t + q.amount, 0));
    }
  }
  for (const k of Object.keys(kinds)) assert.ok(amounts[k].size > 3, `${k} varierer mellom frø`);
});

test('gjenvekst: ingen trær spirer i bygd, på stier eller trasé; naturen vokser fritt utenfor', () => {
  const { s } = reached('dawn_civilization', 31337);
  const t0 = s.buildings.length;
  assert.ok(t0 >= 8, 'en ekte bygd å teste mot');
  // Tving frem mange frøspredningsforsøk (deterministisk tilfeldighet), og se at ingen nye trær havner i bygd eller på linjer.
  // Tynn skogen litt, så frøspredning ikke stoppes av treantallstaket.
  s.nodes = s.nodes.filter((n) => n.kind !== 'tree' || n.id % 2 === 1);
  const cap = B.tree.maxTrees;
  assert.ok(count(s, 'tree') < cap - 10, 'plass til nye trær');
  let placed = 0, outside = 0;
  for (let i = 0; i < 3000; i++) {
    const t = seedTree(s);
    if (!t) continue;
    placed++;
    assert.ok(!inMaintainedArea(s, t.x, t.y), `nytt tre ved (${Math.round(t.x)},${Math.round(t.y)}) i vedlikeholdt område`);
    if (!inBuiltArea(s, t.x, t.y)) outside++;
    s.nodes = s.nodes.filter((n) => n.id !== t.id); // holder treantallet under taket så forsøkene fortsetter
  }
  assert.ok(placed > 20 && outside === placed, 'frøspredning fungerer fortsatt utenfor bygda');
});

test('gjenvekst: en stubbe i en ny tomt skyter ikke på nytt, men en stubbe utenfor gjør det', () => {
  const s = createGame(402);
  const C = s.settlement.center;
  const stump = { id: s.nextId++, kind: 'tree', species: 'birch', variant: 0, x: C.x + 400, y: C.y - 300, growth: 0.9, chopped: 0, state: 'stump', timer: 0.1, stump: true, vigor: 1, reservedBy: [] };
  const inside = { ...stump, id: s.nextId++, x: C.x + 700, y: C.y + 100 };
  s.nodes.push(stump, inside);
  addBuilding(s, 'hut', 'first', inside.x + 20, inside.y + 10); // bygget kommer etter at treet ble felt
  advance(s, 3);
  assert.equal(stump.state, 'alive', 'stubben i åpent land vokser tilbake');
  assert.ok(!s.nodes.some((n) => n.id === inside.id && n.state === 'alive'), 'stubben inne i tomta er fjernet, ikke gjenvokst');
});

test('gjenvekst: jernbanetrasé og stier er vedlikeholdte linjer', () => {
  const s = createGame(403);
  const A = s.settlements[0];
  s.settlements.push({ id: 'second', name: 'B', x: A.x + 500, y: A.y, state: 'active', population: [], kind: 'farm', projectsDone: 0, role: 'x', stage: 'By', stock: {} });
  s.industrial.rails.push({ id: 'first|second', a: 'first', b: 'second', builtAt: 0 });
  assert.ok(inMaintainedArea(s, A.x + 250, A.y + 8), 'trassen holdes åpen');
  assert.ok(!inMaintainedArea(s, A.x + 250, A.y + 200), 'men bare trassen, ikke en enorm sirkel');
  const hearth = addBuilding(s, 'fire', 'first', A.x, A.y + 40);
  const hut = addBuilding(s, 'hut', 'first', A.x - 120, A.y + 40);
  assert.ok(inMaintainedArea(s, (hearth.x + hut.x) / 2, hearth.y + 1), 'stien mellom hus og ildsted holdes åpen');
});
