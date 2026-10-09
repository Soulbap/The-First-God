// Tester for den rene (DOM-frie) delen av VISUAL-01: miljøfelt, deterministisk dekor og lagerhauger.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { inPond } from '../src/sim/world.js';
import { buildEnvironment, envAt } from '../src/render/environment.js';
import { generateDecor } from '../src/render/decor.js';
import { pileCount } from '../src/render/buildings.js';
import { lookVariant, TREE_VARIANTS } from '../src/render/trees.js';

const scene = (seed) => {
  const s = createGame(seed);
  const env = buildEnvironment(s);
  return { s, env, decor: generateDecor(s, env) };
};
const digest = (a) => JSON.stringify(a.map((t) => [t.kind, Math.round(t.x * 100), Math.round(t.y * 100), t.v ?? t.k ?? 0]));

test('miljøfeltet er deterministisk og holder seg i 0–1', () => {
  const a = buildEnvironment(createGame(7)), b = buildEnvironment(createGame(7));
  assert.deepEqual(Array.from(a.canopy), Array.from(b.canopy));
  assert.deepEqual(Array.from(a.moisture), Array.from(b.moisture));
  assert.deepEqual(Array.from(a.soil), Array.from(b.soil));
  for (const f of [a.canopy, a.conifer, a.moisture, a.soil]) for (const v of f) assert.ok(v >= 0 && v <= 1 && Number.isFinite(v));
});

test('miljøfeltet henger sammen med verden: fuktig ved tjernet, kronedekke under trær, tørt i leiren', () => {
  const s = createGame(), env = buildEnvironment(s);
  const p = s.world.pond, C = s.settlement.center;
  const shore = envAt(env, p.x + p.rx * 1.3, p.y), far = envAt(env, C.x + 700, C.y - 450);
  assert.ok(shore.moisture > far.moisture, 'vannkanten er fuktigere enn åpent land langt unna');
  const tree = s.nodes.find((n) => n.kind === 'tree' && n.growth > 0.8);
  assert.ok(envAt(env, tree.x, tree.y).canopy > 0.25, 'modne trær gir kronedekke');
  assert.ok(envAt(env, C.x, C.y).canopy < 0.1, 'leirplassen er åpen');
});

test('dekor: samme seed gir identisk plassering, ulik seed gir ulik', () => {
  const a = scene(20261009), b = scene(20261009), c = scene(12345);
  assert.equal(digest(a.decor.ground), digest(b.decor.ground));
  assert.equal(digest(a.decor.upright), digest(b.decor.upright));
  assert.notEqual(digest(a.decor.ground), digest(c.decor.ground));
});

test('dekor: ingenting i tjernet, undervegetasjon ikke oppå trær eller i leiren, og bregner står i skygge', () => {
  const { s, env, decor } = scene();
  const C = s.settlement.center;
  assert.ok(decor.ground.length > 1000 && decor.upright.length > 50, 'nok dekor til å bære bakken');
  for (const t of decor.ground) assert.ok(!inPond(s, t.x, t.y, 0), 'bakkedekor i vann');
  for (const u of decor.upright) {
    assert.ok(Math.hypot(u.x - C.x, u.y - C.y) >= 110, 'oppreist dekor midt i leiren');
    for (const n of s.nodes) if (n.kind === 'tree') assert.ok(Math.hypot(n.x - u.x, (n.y - u.y) * 1.3) >= 14, 'dekor oppå et tre');
  }
  const ferns = decor.ground.filter((t) => t.kind === 'fern');
  assert.ok(ferns.length > 20);
  const avg = (arr) => arr.reduce((x, y) => x + y, 0) / arr.length;
  const fernCanopy = avg(ferns.map((f) => envAt(env, f.x, f.y).canopy));
  const allCanopy = avg(decor.ground.filter((t) => t.kind === 'tuft').map((f) => envAt(env, f.x, f.y).canopy));
  assert.ok(fernCanopy > allCanopy, 'bregner vokser i mer skyggefulle områder enn gress');
});

test('dekor: sorteringen etter y holdes (trengs for binærsøk i tegningen)', () => {
  const { decor } = scene();
  for (const list of [decor.ground, decor.upright]) for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].y <= list[i].y);
});

test('lagerhauger: antall stokker/steiner vokser jevnt med beholdningen og er begrenset', () => {
  assert.equal(pileCount(0), 0);
  let prev = 0;
  for (let a = 0; a <= 400; a += 1) { const n = pileCount(a); assert.ok(n >= prev && n <= 28); prev = n; }
  assert.equal(pileCount(400), 28);
  assert.ok(pileCount(1) > 0, 'selv én enhet gir synlig materiale');
});

test('trevarianter: lookVariant gir 8 ulike utseender uten å endre simuleringens variant', () => {
  const s = createGame();
  const seen = new Set();
  for (const n of s.nodes) if (n.kind === 'tree') {
    const before = n.variant;
    const v = lookVariant(n);
    assert.ok(v >= 0 && v < TREE_VARIANTS);
    assert.equal(n.variant, before);
    seen.add(v);
  }
  assert.ok(seen.size >= 6, 'flere ulike utseender i verden');
});
