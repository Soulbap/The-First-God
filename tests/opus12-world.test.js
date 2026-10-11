// OPUS-12 · Levende sivilisasjon: menneskenes liv, gatenett, områder og arkitektur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance, step } from '../src/sim/game.js';
import { serialize, deserialize, SAVE_VERSION } from '../src/sim/save.js';
import { BOUND, pickPlace, assignHome, capOf, nightOf } from '../src/sim/community.js';
import { crowding } from '../src/sim/metrics.js';
import { isHome, housingOf } from '../src/sim/settlements.js';
import { growStreets, routeAlong, maxRoadLevel, roadCost, stepRoadworks, workRoad, blockedBy, doorOf, streetSegments, distToStreet } from '../src/sim/streets.js';
import { districtProfile, recognizedDistricts, districtOf } from '../src/sim/districts.js';
import { makeArch, planArchitecture } from '../src/sim/architecture.js';
import { tenementWindows, modernWindows } from '../src/render/housing.js';
import { dayPhase } from '../src/view/daylight.js';
import { tierOf } from '../src/sim/renovation.js';
import { reached, addBuilding, addPeople } from './support.js';

const settled = () => reached('connected_realm', 777);

// ---------- Menneskenes daglige liv ----------
test('hvert sted et menneske søker finnes, er ferdig, ligger i egen bosetting og har plass', () => {
  const { s } = settled();
  const t = deserialize(serialize(s)); // arbeid på en kopi: testen endrer ikke den delte tilstanden
  advance(t, 90);
  const occ = new Map();
  let bound = 0;
  for (const h of t.humans) {
    if (!BOUND.has(h.state) || h.destId == null) continue;
    bound++;
    const b = t.buildings.find((q) => q.id === h.destId);
    assert.ok(b && b.complete, 'stedet finnes og er ferdig');
    assert.equal(b.settlementId || 'first', h.settlementId, 'stedet ligger i menneskets egen bosetting');
    occ.set(b.id, (occ.get(b.id) || 0) + 1);
  }
  assert.ok(bound >= 5, `noen er ute blant folk (${bound})`);
  for (const [id, n] of occ) assert.ok(n <= capOf(t.buildings.find((q) => q.id === id), t) + 1, `plasser (${n}) ved ${id}`);
});

test('hjem og arbeidssted: folk har ett hjem i egen bosetting, og hjemmet har ikke flere beboere enn plassen tillater', () => {
  const { s } = settled();
  const t = deserialize(serialize(s));
  for (const h of t.humans) assignHome(t, h);
  const per = new Map();
  for (const h of t.humans) {
    if (h.homeId == null) continue;
    const b = t.buildings.find((q) => q.id === h.homeId);
    assert.ok(b && isHome(b) && (b.settlementId || 'first') === h.settlementId, 'hjemmet er et bolighus i egen bosetting');
    per.set(b.id, (per.get(b.id) || 0) + 1);
  }
  assert.ok(per.size >= 3, 'flere hjem er i bruk');
  // Fordeling uten overfylling: ingen bolig har mer enn 1,5 × plassen (en liten margin finnes mens folk flytter og bygg bygges om).
  for (const [id, n] of per) assert.ok(n <= Math.ceil(housingOf(t.buildings.find((q) => q.id === id), t) * 1.5) + 1, `beboere i ${id}: ${n}`);
  advance(t, 120);
  assert.ok(t.humans.some((h) => h.workId != null), 'noen har fått et arbeidssted etter å ha vært på jobb');
  for (const h of t.humans) if (h.workId != null) { const w = t.buildings.find((q) => q.id === h.workId); assert.ok(!w || (w.settlementId || 'first') === h.settlementId); }
});

test('ingen patologisk trengsel: folk fordeler seg på flere steder og står ikke i klumper', () => {
  const { s } = settled();
  const t = deserialize(serialize(s));
  let worst = 0, clustered = 0, atFire = 0, n = 0, stacked = 0;
  const kinds = new Set();
  for (let i = 0; i < 24; i++) {
    advance(t, 10);
    const c = crowding(t);
    worst = Math.max(worst, c.maxCluster); clustered += c.clusteredShare; atFire += c.atFireShare; stacked += c.stacked; n++;
    for (const h of t.humans) if (BOUND.has(h.state) && h.destId != null) kinds.add(t.buildings.find((b) => b.id === h.destId)?.type);
  }
  assert.ok(worst <= 11, `største klynge ${worst}`);
  assert.ok(clustered / n < 0.2, `andel i klynger ${(clustered / n).toFixed(2)}`);
  assert.ok(atFire / n < 0.45, `andel ved bål ${(atFire / n).toFixed(2)}`);
  assert.ok(stacked / n < 6, `på samme punkt ${(stacked / n).toFixed(1)}`);
  assert.ok(kinds.size >= 4, `ulike møteplasser i bruk: ${[...kinds].join(', ')}`);
});

test('samlingsplassene følger døgnet: om natten søker folk hjem, om dagen torg og arbeid', () => {
  const s = createGame(321);
  const S = s.settlements[0]; S.stage = 'Tidlig by';
  addBuilding(s, 'fire', 'first', 1000, 700, { radius: 14 });
  addBuilding(s, 'market', 'first', 1100, 700, { radius: 42 });
  const homes = [0, 1, 2, 3].map((i) => addBuilding(s, 'hut', 'first', 800 + i * 70, 800, { radius: 30, tier: 1 }));
  addPeople(s, 'first', 4);
  const h = s.humans[0]; assignHome(s, h);
  const share = (time) => {
    s.time = time; let own = 0, market = 0;
    for (let i = 0; i < 400; i++) { const hh = { ...h, destId: null, slot: null }; s.time = time + i * 0.001; const p = pickPlace(s, hh, 'leisure'); if (!p) continue; if (p.b.id === h.homeId) own++; if (p.b.type === 'market') market++; }
    return { own, market };
  };
  // Klokken: fase 0 = midnatt (t = 336 s), fase 0,5 = middag (t = 96 s).
  assert.ok(nightOf({ time: 336 }) > 0.8 && nightOf({ time: 96 }) < 0.05);
  const night = share(336), day = share(96);
  assert.ok(night.own > day.own * 2, `eget hjem: natt ${night.own} mot dag ${day.own}`);
  assert.ok(day.market > night.market, `torg: dag ${day.market} mot natt ${night.market}`);
});

test('menneskenes bevegelser er deterministiske (to kjøringer og lagre/lese gir samme tilstand)', () => {
  const sig = (t) => JSON.stringify([t.humans.map((h) => [h.id, Math.round(h.x), Math.round(h.y), h.state, h.destId ?? 0, h.homeId ?? 0, h.settlementId]), t.buildings.length, t.settlements.map((q) => [q.id, q.population.length, q.net?.edges.length || 0])]);
  const a = reached('city_rises', 31).s;
  const fresh = () => { const t = deserialize(serialize(a)); return t; };
  const t1 = fresh(), t2 = fresh();
  advance(t1, 240); advance(t2, 120);
  const mid = deserialize(serialize(t2)); advance(mid, 120);
  assert.equal(sig(t1), sig(mid), 'lagring midt i kjøringen endrer ikke forløpet');
  const t3 = fresh(); advance(t3, 240);
  assert.equal(sig(t1), sig(t3), 'to kjøringer fra samme tilstand gir samme resultat');
});

// ---------- Gatenett ----------
test('gatenett: alle bygg er knyttet til nettet, ingen gate går gjennom et bygg, og bygg står ikke oppå gater', () => {
  const { s } = settled();
  let checked = 0;
  for (const S of s.settlements) {
    if (!S.net?.edges.length) continue;
    const bs = s.buildings.filter((b) => b.complete && (b.settlementId || 'first') === S.id);
    const byId = new Map(bs.map((b) => [b.id, b]));
    // Sammenhengende: bredde-først fra første node når alle noder.
    const adj = new Map();
    for (const e of S.net.edges) { (adj.get(e.a) || adj.set(e.a, []).get(e.a)).push(e.b); (adj.get(e.b) || adj.set(e.b, []).get(e.b)).push(e.a); }
    const seen = new Set([S.net.nodes[0]]), q = [S.net.nodes[0]];
    while (q.length) for (const v of adj.get(q.shift()) || []) if (!seen.has(v)) { seen.add(v); q.push(v); }
    const nodes = S.net.nodes.filter((id) => adj.has(id));
    assert.ok(nodes.every((id) => seen.has(id)), `${S.id}: nettet henger sammen`);
    assert.ok(S.net.nodes.length >= Math.floor(bs.filter((b) => b.type !== 'sanctuary').length * 0.5), `${S.id}: de fleste bygg er knyttet til`);
    for (const e of S.net.edges) {
      const A = byId.get(e.a), C = byId.get(e.b);
      assert.ok(A && C, 'gatens endepunkter finnes');
      assert.ok(!blockedBy(bs, doorOf(A), doorOf(C), new Set([e.a, e.b])), `${S.id}: gate ${e.a}-${e.b} går ikke gjennom et bygg`);
      assert.ok(e.lv >= 0 && e.lv <= 3);
    }
    checked++;
  }
  assert.ok(checked >= 2, 'minst to bosettinger har gatenett');
});

test('veiarbeid: dekket krever trinn og kunnskap, koster ekte materialer og tar tid; ingen hopper over et nivå', () => {
  const s = createGame(654);
  const S = s.settlements[0]; S.stage = 'Tidlig by';
  addBuilding(s, 'hearth', 'first', 1000, 700, { radius: 25 });
  for (const [x, y] of [[1090, 700], [1000, 790], [910, 700], [1090, 790]]) addBuilding(s, 'hut', 'first', x, y, { radius: 30, tier: 1 });
  addPeople(s, 'first', 6);
  assert.ok(growStreets(s, S), 'nettet vokser');
  assert.ok(S.net.edges.length >= 4 && S.net.edges.every((e) => e.lv === 0));
  S.stage = 'Landsby'; assert.equal(maxRoadLevel(s, S), 0, 'en landsby har bare stier');
  S.stage = 'Tidlig by'; assert.equal(maxRoadLevel(s, S), 1, 'uten byggekunnskap er jordvei det høyeste');
  s.resources.stone = 10;
  assert.equal(stepRoadworks(s, S), false, 'uten materialer utover reserven skjer ingenting');
  s.resources.stone = 500;
  const before = s.resources.stone;
  assert.equal(stepRoadworks(s, S), true);
  const job = S.roadJob, e = S.net.edges.find((q) => q.a === job.a && q.b === job.b);
  assert.equal(job.to, 1);
  assert.equal(s.resources.stone, before - roadCost(1, e.len).stone, 'materialene trekkes ved start');
  assert.equal(stepRoadworks(s, S), false, 'ett veiarbeid om gangen');
  for (let i = 0; i < 400 && S.roadJob; i++) workRoad(s, S, 1);
  assert.equal(e.lv, 1); assert.equal(S.roadsBuilt, 1);
  // Neste gate får også nivå 1 før noen får nivå 2.
  s.upgrades.construction_methods = 1;
  assert.equal(maxRoadLevel(s, S), 2);
  stepRoadworks(s, S);
  const nxt = S.net.edges.find((q) => q.a === S.roadJob.a && q.b === S.roadJob.b);
  assert.equal(nxt.lv, 0, 'en gate som fortsatt er sti går først, selv om kunnskapen tillater grusvei');
  assert.ok(!S.net.edges.some((q) => q.lv > Math.min(...S.net.edges.map((r) => r.lv)) + 1));
});

test('gatenettet leder trafikken: ruten mellom to dører går langs nettet og er rimelig kort', () => {
  const { s } = settled();
  const S = s.settlements[0];
  const bs = s.buildings.filter((b) => b.complete && (b.settlementId || 'first') === 'first' && S.net.nodes.includes(b.id));
  let found = 0;
  for (let i = 0; i < bs.length && found < 5; i++) for (let j = i + 1; j < bs.length && found < 5; j++) {
    const a = doorOf(bs[i]), c = doorOf(bs[j]);
    if (Math.hypot(a.x - c.x, a.y - c.y) < 160) continue;
    const r = routeAlong(s, S, a.x, a.y, c.x, c.y);
    if (!r) continue;
    found++;
    let len = 0; for (let k = 1; k < r.length; k++) len += Math.hypot(r[k].x - r[k - 1].x, r[k].y - r[k - 1].y);
    assert.ok(len <= Math.hypot(a.x - c.x, a.y - c.y) * 1.6 + 30, 'rimelig omvei');
    assert.ok(Math.hypot(r[0].x - a.x, r[0].y - a.y) < 60 && Math.hypot(r.at(-1).x - c.x, r.at(-1).y - c.y) < 60);
  }
  assert.ok(found >= 1, 'minst én rute ble funnet langs nettet');
});

// ---------- Områder, tetthet og bevaring ----------
test('funksjonelle områder: en by har gjenkjennelige områder, og bolig ligger ikke midt i industrien', () => {
  const { s } = settled();
  const cap = s.settlements[0];
  const p = districtProfile(s, cap);
  assert.ok(recognizedDistricts(s, cap).length >= 2, `områder: ${recognizedDistricts(s, cap).join(', ')}`);
  assert.equal(districtOf('sawmill'), 'industri'); assert.equal(districtOf('hut'), 'bolig'); assert.equal(districtOf('market'), 'handel');
  if (p.bolig && p.industri) assert.ok(Math.hypot(p.bolig.x - p.industri.x, p.bolig.y - p.industri.y) >= 50, 'bolig- og industritungepunkt er ikke det samme stedet');
  // Hver bosetting har en økonomisk identitet avledet av hva den driver med.
  for (const S of s.settlements.filter((q) => q.state === 'active' && q.id !== 'first')) assert.ok(typeof S.identity === 'string' && S.identity.length > 0);
});

test('bygg overlapper aldri: fotavtrykkene i samme bosetting holder avstand', () => {
  const { s } = settled();
  const bs = s.buildings.filter((b) => b.complete && b.type !== 'field');
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i], b = bs[j];
    if ((a.settlementId || 'first') !== (b.settlementId || 'first')) continue;
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= (a.radius + b.radius) * 0.85, `${a.type}#${a.id} og ${b.type}#${b.id} overlapper`);
  }
});

test('det eldste hjemmet og det første lyet bevares som minnesteder når byen bygges om', () => {
  const { s } = settled();
  const heritage = s.buildings.filter((b) => b.heritage);
  assert.ok(heritage.length >= 1, 'minst ett bevart minnested');
  assert.ok(new Set(heritage.map((b) => b.settlementId || 'first')).size >= 2, 'også en satellitt bevarer sitt første hus');
  for (const b of heritage) assert.ok(tierOf(b) <= 1, `${b.type} er ikke bygget om til et høyere trinn`);
  assert.ok(s.buildings.some((b) => b.type === 'shelter'), 'det første lyet står fortsatt');
});

// ---------- Arkitektur ----------
test('arkitektur: byggeplanen er deterministisk og gir variasjon i høyde, tak, fasade og akser', () => {
  assert.deepEqual(makeArch(5, 7, 100, 0.5, 5), makeArch(5, 7, 100, 0.5, 5));
  const plans = Array.from({ length: 80 }, (_, i) => makeArch(5, 7, 100 + i, 0.5, 5));
  const uniq = (key) => new Set(plans.map((p) => p[key])).size;
  assert.ok(uniq('roof') >= 3 && uniq('facade') >= 3 && uniq('bays') >= 3 && uniq('floors') >= 2 && uniq('balcony') >= 2, 'moderne blokker varierer');
  assert.ok(new Set(plans.map((p) => p.sig)).size >= 50, 'mange ulike byggeplaner');
  const tens = Array.from({ length: 80 }, (_, i) => makeArch(4, 7, 300 + i, 0.5, 4));
  assert.ok(new Set(tens.map((p) => p.roof)).size >= 3 && new Set(tens.map((p) => p.facade)).size >= 3);
});

test('arkitektur: høyde følger grunnens verdi og bosettingens størrelse; en liten by bygger ikke høyhus', () => {
  const avg = (v, r, tier = 5) => { let n = 0; for (let i = 0; i < 200; i++) n += makeArch(tier, 9, i, v, r).floors; return n / 200; };
  assert.ok(avg(0.9, 6) > avg(0.1, 6) + 1, 'sentrum bygges høyere enn kanten');
  assert.ok(avg(0.9, 6) > avg(0.9, 4) + 0.5, 'storbyen bygger høyere enn den tidlige byen');
  for (let i = 0; i < 100; i++) { const p = makeArch(5, 3, i, 1, 4); assert.ok(p.floors >= 4 && p.floors <= 5, 'tidlig by: høyst fem etasjer'); }
  for (let i = 0; i < 100; i++) { const p = makeArch(5, 3, i, 1, 6); assert.ok(p.floors >= 4 && p.floors <= 8); }
  for (let i = 0; i < 100; i++) { const p = makeArch(3, 3, i, 1, 5); assert.ok(p.floors >= 2 && p.floors <= 3, 'steinhus: to–tre etasjer'); }
});

test('arkitektur: vinduene følger byggeplanen (etasjer × akser), slik at nattlyset treffer fasaden', () => {
  for (const a of [makeArch(4, 1, 5, 0.9, 5), makeArch(4, 1, 6, 0.1, 4), makeArch(5, 1, 7, 0.9, 6), makeArch(5, 1, 8, 0.2, 4)]) {
    const w = a.tier === 5 ? modernWindows(a) : tenementWindows(a);
    const expect = a.tier === 5 ? a.floors * (a.bays + 1) - 1 : (a.floors - 1) * a.bays;
    assert.equal(w.length, expect);
    for (const [x, y, ww, hh] of w) assert.ok(ww > 0 && hh > 0 && y < 0);
  }
});

test('arkitektur: en ombygging til bygård eller blokk gir byggeplan, og planen bruker byens egne forhold', () => {
  const s = createGame(99);
  const S = s.settlements[0]; S.stage = 'Storby'; addPeople(s, 'first', 40);
  addBuilding(s, 'market', 'first', 1000, 700, { radius: 42 });
  const center = addBuilding(s, 'hut', 'first', 1060, 760, { radius: 30, tier: 4 });
  const edge = addBuilding(s, 'hut', 'first', 1500, 1100, { radius: 30, tier: 4 });
  const a1 = planArchitecture(s, center, S, 5), a2 = planArchitecture(s, edge, S, 5);
  assert.equal(a1.tier, 5); assert.ok(a1.floors >= a2.floors, 'sentrum er minst like høyt som kanten');
  assert.ok(SAVE_VERSION >= 12);
});

test('nærmiljøet rundt: gatenett og bygg lagres og leses uendret', () => {
  const { s } = settled();
  const t = deserialize(serialize(s));
  assert.deepEqual(t.settlements.map((q) => q.net), s.settlements.map((q) => q.net));
  assert.equal(t.buildings.filter((b) => b.arch).length, s.buildings.filter((b) => b.arch).length);
  void step; void streetSegments; void distToStreet; void dayPhase;
});
