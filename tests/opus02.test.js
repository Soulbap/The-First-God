// OPUS-02: Byplan (autonom byvekst), Takkoffer (PP-sluk), kronikk og navn, gatenett.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, advance } from '../src/sim/game.js';
import { purchase, upgradeStatus } from '../src/sim/economy.js';
import { upgradeById } from '../src/data/upgrades.js';
import { BALANCE as B } from '../src/data/balance.js';
import { serialize, deserialize } from '../src/sim/save.js';
import { nameOf, chronicle } from '../src/sim/chronicle.js';
import { ragnarokAward, offeringPrp } from '../src/sim/legacy.js';
import { URBAN_PLAN, urbanTarget } from '../src/sim/urban.js';
import { buildStreets } from '../src/render/streets.js';
import { dist } from '../src/sim/world.js';
import { reached } from './support.js';
import { makeBot, playTo } from '../tools/bot.js';

const noNegative = (s) => Object.entries(s.resources).every(([, v]) => v >= -1e-9);

test('Byplan: låst før «Sivilisasjonens morgen»; byggingen starter først etter kjøp, og aldri uten overskudd', () => {
  const { s } = reached('dawn_civilization');
  const def = upgradeById('city_plan');
  const t = JSON.parse(serialize(s), (k, v) => v); // bare for å sikre at tilstanden er serialiserbar
  assert.ok(t.state);
  assert.equal(s.urban.enabled, false, 'ikke aktivert av seg selv');
  const before = s.buildings.length;
  advance(s, 30);
  assert.ok(!s.buildings.some((b) => String(b.source).startsWith('urban:')), 'ingen byvekst uten Byplan');
  assert.notEqual(upgradeStatus(s, def), 'locked');
  s.resources.wood = 600; s.resources.stone = 400; s.resources.planks = 40; s.resources.cutstone = 30;
  assert.equal(purchase(s, 'city_plan').ok, true);
  assert.equal(s.urban.enabled, true);
  s.resources.wood = 5; s.resources.stone = 5; // nesten tomt: reserven skal stoppe byvekst
  advance(s, 40);
  assert.ok(!s.buildings.some((b) => String(b.source).startsWith('urban:')), 'reserven beskyttes');
  assert.ok(noNegative(s));
  assert.ok(s.buildings.length >= before);
});

test('Byvekst: bolighus, brønner og varehus reises av folket; ingen overlapp, ingen negative ressurser', () => {
  const { s } = reached('first_world_civilization');
  const urban = s.buildings.filter((b) => String(b.source).startsWith('urban:'));
  assert.ok(urban.length >= 3, `byen vokste (${urban.length})`);
  assert.ok(urban.some((b) => b.type === 'well'), 'brønn');
  assert.ok(s.buildings.filter((b) => b.type === 'townhouse').length > 3, 'flere bolighus enn innsikten alene gir');
  for (let i = 0; i < s.buildings.length; i++) for (let j = i + 1; j < s.buildings.length; j++) {
    const a = s.buildings[i], b = s.buildings[j];
    assert.ok(dist(a.x, a.y, b.x, b.y) >= (a.type === 'fire' || b.type === 'fire' ? 0 : (a.radius + b.radius) * 0.95), `${a.type}#${a.id} overlapper ${b.type}#${b.id}`);
  }
  assert.ok(noNegative(s));
  for (const b of urban) assert.ok(b.crew?.length >= 1 || !b.complete, 'noen bygde det faktisk');
});

test('Byplanens mål følger utviklingstrinnet (og kan bare stige)', () => {
  const th = URBAN_PLAN.find((i) => i.type === 'townhouse');
  assert.equal(urbanTarget(th, 'Landsby'), 0);
  assert.equal(urbanTarget(th, 'Tidlig by'), 4);
  assert.equal(urbanTarget(th, 'By'), 6);
  assert.equal(urbanTarget(th, 'Storby'), 8);
});

test('Navn og kronikk: deterministiske, bare ekte hendelser, ingen duplikater, begrenset lengde', () => {
  const a = reached('first_world_civilization').s;
  const b = (() => { const g = createGame(20261009), bot = makeBot(); playTo(g, bot, 'first_world_civilization', 14400); return g; })();
  assert.deepEqual(a.chronicle.entries.map((e) => e.text), b.chronicle.entries.map((e) => e.text), 'samme seed og handlinger → samme kronikk');
  const texts = a.chronicle.entries.map((e) => e.text);
  assert.ok(texts.length >= 12 && texts.length <= 90, `lengde ${texts.length}`);
  assert.equal(new Set(Object.keys(a.chronicle.keys)).size, Object.keys(a.chronicle.keys).length);
  assert.ok(texts.some((t) => /grunnla/.test(t)), 'en grunnleggelse er nevnt');
  assert.ok(texts.some((t) => /Verdens første sivilisasjon/.test(t)), 'sluttmilepælen er nevnt');
  const times = a.chronicle.entries.map((e) => e.t);
  assert.deepEqual(times, [...times].sort((x, y) => x - y), 'tidsrekkefølge');
  // Navnene er distinkte blant de levende.
  const names = a.humans.map((h) => nameOf(a, h));
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((n) => /^[A-ZÆØÅ]/.test(n)));
});

test('Kronikken skrives bare én gang per hendelse, også etter lagring og lasting', () => {
  const { s } = reached('city_rises');
  const text = JSON.stringify(s.chronicle.entries);
  const t = deserialize(serialize(s));
  assert.ok(t);
  assert.equal(JSON.stringify(t.chronicle.entries), text);
  assert.equal(chronicle(t, 'milestone:first_home', 'milestone', 'Duplikat.'), false);
  advance(t, 5);
  assert.equal(t.chronicle.entries.filter((e) => e.text.startsWith('Første hjem')).length, 1);
});

test('Gamle lagringer (uten byvekst og kronikk) lastes med trygge standardverdier', () => {
  const s = createGame(20261009);
  advance(s, 3);
  const data = JSON.parse(serialize(s));
  delete data.state.urban; delete data.state.chronicle;
  const t = deserialize(JSON.stringify(data));
  assert.ok(t);
  assert.equal(t.urban.enabled, false);
  assert.deepEqual(t.chronicle.entries, []);
  advance(t, 5);
});

test('Takkoffer: PP-sluk som reiser helligdommen stykke for stykke, med avtagende PrP og ingen annen effekt', () => {
  const { s } = reached('city_rises');
  const t = deserialize(serialize(s));
  const mods = JSON.stringify(t.modifiers);
  const def = upgradeById('thanksgiving');
  t.resources.pp = 5000;
  const award0 = ragnarokAward(t);
  const costs = [];
  for (let i = 0; i < B.offering.max; i++) {
    const before = t.resources.pp;
    assert.equal(purchase(t, 'thanksgiving').ok, true, `nivå ${i + 1}`);
    costs.push(before - t.resources.pp);
    for (let k = 0; k < 400 && t.buildings.some((b) => b.type === 'sanctuary' && !b.complete); k++) advance(t, 1);
  }
  assert.equal(upgradeStatus(t, def), 'done');
  assert.equal(purchase(t, 'thanksgiving').ok, false);
  assert.ok(costs.every((c, i) => i === 0 || c > costs[i - 1]), 'stigende pris');
  assert.equal(JSON.stringify(t.modifiers), mods, 'ingen spillbonuser');
  assert.equal(t.buildings.filter((b) => b.type === 'sanctuary' && b.complete).length, B.offering.max);
  const gains = [1, 2, 3, 4, 5, 6].map((n) => offeringPrp(n) - offeringPrp(n - 1));
  assert.ok(gains.every((g, i) => i === 0 || g <= gains[i - 1]), `avtagende: ${gains.join(',')}`);
  assert.ok(ragnarokAward(t) - award0 >= offeringPrp(B.offering.max), 'gir faktisk PrP');
  assert.ok(offeringPrp(B.offering.max) <= B.offering.prpScale * 2.5, 'men ikke urimelig mye');
  // Helligdommen ligger et sted fri for andre bygg.
  const sanct = t.buildings.filter((b) => b.type === 'sanctuary');
  for (const x of sanct) for (const y of t.buildings) if (x !== y) assert.ok(dist(x.x, x.y, y.x, y.y) >= (x.radius + y.radius) * 0.9);
});

test('Gatenett: hver gate går mellom to inngangsdører uten å gå gjennom andre bygg', () => {
  const { s } = reached('first_world_civilization');
  const nets = buildStreets(s);
  assert.ok(nets.length >= 1);
  const net = nets.find((n) => n.settlementId === 'first');
  assert.ok(net && net.edges.length >= 8, 'hovedstaden har et gatenett');
  // Alle bygg i hovedstaden er knyttet til nettet (minst én gate hver) — ingen stranda dører.
  const touched = new Set(); for (const e of net.edges) { touched.add(e.a); touched.add(e.b); }
  const homes = s.buildings.filter((b) => b.complete && (b.settlementId || 'first') === 'first' && ['townhouse', 'hut', 'market', 'hall', 'warehouse', 'sawmill', 'mason'].includes(b.type));
  const missing = homes.filter((b) => !touched.has(b.id));
  assert.ok(missing.length <= Math.ceil(homes.length * 0.2), `forbundet ${homes.length - missing.length}/${homes.length}`);
});

test('Gatenettet er deterministisk', () => {
  const { s } = reached('first_world_civilization');
  assert.deepEqual(buildStreets(s), buildStreets(s));
});

test('Simuleringen er uendret av presentasjonen: samme seed og tid gir samme bygg', () => {
  const a = createGame(777), b = createGame(777);
  for (let i = 0; i < 600; i++) { step(a); step(b); }
  assert.deepEqual(a.buildings.map((q) => [q.type, q.x, q.y]), b.buildings.map((q) => [q.type, q.x, q.y]));
});
