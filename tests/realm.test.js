// GAMEPLAY-09 · Det voksende riket: tomtevalg, grunnleggelse, ruter, spesialisering og regnskap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/sim/game.js';
import { BALANCE as B } from '../src/data/balance.js';
import { findSettlementSite, foundingReadiness } from '../src/sim/realm.js';
import { establishedRoutes, recordTrip, routeKey } from '../src/sim/regional.js';
import { inPond } from '../src/sim/world.js';
import { distinctRoles, activeSettlements } from '../src/sim/civstage.js';
import { roleEffect } from '../src/sim/settlements.js';
import { addPeople, reached } from './support.js';

const withSecond = (seed) => {
  const s = createGame(seed); const C = s.settlement.center;
  s.settlements.push({ id: 'second', name: 'Lysningen', x: C.x + 560, y: C.y - 120, state: 'active', population: [], kind: 'farm', projectsDone: 3, role: 'Matbygda', stage: 'Leir' });
  return s;
};

test('tomtevalg er deterministisk og gyldig for mange frø', () => {
  for (const seed of [1, 7, 42, 20261009, 99999, 31337]) {
    const a = findSettlementSite(withSecond(seed)), b = findSettlementSite(withSecond(seed));
    assert.deepEqual(a, b, `samme frø → samme sted (${seed})`);
    assert.ok(a, `det finnes et gyldig sted (${seed})`);
    const s = withSecond(seed);
    assert.ok(!inPond(s, a.x, a.y, 100), 'ikke i tjernet');
    assert.ok(a.x > 100 && a.y > 100 && a.x < s.world.width - 100 && a.y < s.world.height - 100, 'innenfor kartet');
    for (const q of s.settlements) assert.ok(Math.hypot(a.x - q.x, a.y - q.y) >= B.realm.minSiteSpacing, 'avstand til andre bosettinger');
    assert.ok(['forest', 'stone', 'farm'].includes(a.kind));
  }
});

test('grunnleggelse krever mat, folk, materialer, ledige hender og ro — og forklarer hva som mangler', () => {
  const s = withSecond(5); s.realm.autoFounding = true; s.realm.limit = 4;
  const missing = () => foundingReadiness(s).filter((c) => !c.ok).map((c) => c.id);
  assert.ok(['food', 'people', 'materials', 'hands'].every((id) => missing().includes(id)));
  addPeople(s, 'first', 10); s.civilization.foodUnlocked = true; s.civilization.foodHarvests = 5; s.resources.food = 10;
  s.resources.wood = 200; s.resources.stone = 200; s.realm.lastFoundedAt = -999;
  assert.deepEqual(missing(), [], 'alle forutsetninger oppfylt (inkl. et egnet sted)');
  s.realm.limit = 2;
  assert.deepEqual(missing(), ['limit'], 'taket på antall bosettinger gjelder');
});

test('autonom grunnleggelse: følget reiser, bosettingen vokser fra en hytte, og ingen folk eller ressurser dupliseres', () => {
  const s = withSecond(8); const C = s.settlement.center; s.realm.autoFounding = true; s.realm.limit = 4; s.realm.nextCheckAt = 0;
  addPeople(s, 'first', 10); s.civilization.foodUnlocked = true; s.civilization.foodHarvests = 5; s.civilization.nextFoodAt = Infinity; s.civilization.nextPopulationAt = Infinity;
  s.resources.food = 10; s.resources.wood = 100; s.resources.stone = 60; s.realm.lastFoundedAt = -999; s.expansion.founded = true;
  const people = s.humans.length;
  let launched = false;
  for (let i = 0; i < 400 / B.dt && s.settlements.length < 3; i++) { step(s); if (s.realm.party && !launched) { launched = true; assert.equal(s.resources.wood, 100 - B.realm.supplies.wood, 'forsyninger brukes ved avreise'); assert.equal(s.resources.stone, 60 - B.realm.supplies.stone); } }
  assert.ok(launched, 'følget dro');
  assert.equal(s.settlements.length, 3);
  const T = s.settlements[2];
  assert.equal(T.id, 'third'); assert.equal(T.population.length, B.realm.party);
  assert.equal(s.humans.length, people, 'ingen nye eller tapte mennesker');
  assert.equal(s.humans.filter((h) => h.settlementId === 'third').length, B.realm.party);
  assert.equal(s.buildings.filter((b) => b.settlementId === 'third').length, 1, 'bare grunnsteinen står ved start (ingen ferdig bosetting)');
  assert.ok(!s.buildings.find((b) => b.settlementId === 'third').complete);
  assert.equal(s.realm.party, null);
  assert.ok(Math.hypot(T.x - C.x, T.y - C.y) > B.realm.minSiteDistance);
});

test('spilling: fire bosettinger med ulike roller, ruter fra faktiske turer og et sammenhengende rike', () => {
  const { s, ok } = reached('connected_realm', 777);
  assert.ok(ok, 'milepælen nås også med et annet frø');
  const act = activeSettlements(s);
  assert.ok(act.length >= 4);
  assert.equal(new Set(act.map((q) => q.id)).size, act.length, 'unike id-er');
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) assert.ok(Math.hypot(act[i].x - act[j].x, act[i].y - act[j].y) >= B.realm.minSiteSpacing * 0.99, 'avstand mellom bosettinger');
  assert.ok(distinctRoles(s) >= 3, 'rollene er forskjellige');
  assert.ok(establishedRoutes(s).length >= 3);
  for (const r of establishedRoutes(s)) assert.ok(r.trips >= B.realm.routeEstablishedTrips);
  assert.ok(s.region.completedDeliveries >= 14);
  // Folk finnes i nøyaktig én bosetting hver.
  const ids = act.flatMap((q) => q.population);
  assert.equal(new Set(ids).size, ids.length, 'ingen i to bosettinger');
  assert.equal(ids.length, s.humans.length, 'alle mennesker tilhører en bosetting');
  // Regnskap: ingen negative beholdninger, reservasjoner = leveringer underveis.
  for (const [k, v] of Object.entries(s.resources)) assert.ok(v >= 0, k);
  for (const k of Object.keys(s.region.reserved)) {
    const sum = s.region.deliveries.filter((d) => d.type === k && (d.status === 'reserved' || d.status === 'traveling')).reduce((n, d) => n + d.amount, 0);
    assert.equal(s.region.reserved[k], sum);
  }
  // Ingen uendelig leveringssløyfe: hver levering er ferdig, kansellert eller under arbeid.
  assert.ok(s.region.deliveries.every((d) => ['done', 'cancelled', 'queued', 'reserved', 'traveling'].includes(d.status)));
  assert.ok(s.region.deliveries.filter((d) => d.status === 'queued').length < 12);
});

test('spesialisering har målbare følger', () => {
  assert.ok(roleEffect('Sagbruksbygd', 'craft') > 1 && roleEffect('Steinhoggerbygd', 'craft') > 1);
  assert.ok(roleEffect('Matbygda', 'foodPerField', 0) >= 1);
  assert.ok(roleEffect('Kunnskapssete', 'knowledge') > 1 && roleEffect('Bysenter', 'growth') < 1);
});

test('ruter oppstår bare av fullførte turer', () => {
  const s = createGame();
  const key = routeKey('first', 'second');
  assert.equal(s.network.routes[key], undefined);
  recordTrip(s, 'first', 'second', 'wood', 4); recordTrip(s, 'second', 'first', 'stone', 4);
  assert.equal(s.network.routes[key].established, false);
  recordTrip(s, 'first', 'second', 'wood', 4);
  assert.equal(s.network.routes[key].established, true);
  assert.ok(s.events.some((e) => e.type === 'routeEstablished'));
  recordTrip(s, 'first', 'first', 'wood', 4); // en tur til seg selv er ingen rute
  assert.equal(Object.keys(s.network.routes).length, 1);
});
