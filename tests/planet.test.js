// OPUS-01: planetgeografi, kart ↔ planet, planetkamera, planetens visningsmodell og lagring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance } from '../src/sim/game.js';
import { createPlanet, localOffset, angle, offsetDir, PLANET } from '../src/sim/planet.js';
import { BALANCE as B } from '../src/data/balance.js';
import { globeFromWorldCam, worldCamFromGlobe, globeFrame, projectDir, unprojectScreen, heightForSpan, spanForHeight, scaleOf, createGlobeCamera, globeGlide, updateGlobeCamera, clampGlobe, GLOBE } from '../src/view/globe.js';
import { planetView } from '../src/render/globe.js';
import { bakeGlobal } from '../src/render/planetTexture.js';
import { serialize, deserialize, SAVE_VERSION } from '../src/sim/save.js';
import { regionState } from '../src/sim/worldmap.js';

const SEEDS = [20261009, 1, 7, 34, 100, 2026, 31337];
const planetFor = (seed) => { const s = createGame(seed); return { s, P: createPlanet(seed, s.globe.regions) }; };

test('planeten er deterministisk: samme frø gir samme hjem og land, et annet frø en annen planet', () => {
  const a = planetFor(20261009).P, b = planetFor(20261009).P, c = planetFor(7).P;
  assert.deepEqual(a.home.dir, b.home.dir);
  for (const [id, site] of a.sites) assert.deepEqual(site.dir, b.sites.get(id).dir);
  assert.equal(a.surface(a.home.dir).e, b.surface(b.home.dir).e);
  assert.notDeepEqual(a.home.dir, c.home.dir);
});

test('hvert kjent land ligger på land med sitt eget landskap (fjell er fjell, slette er slette …)', () => {
  for (const seed of SEEDS) {
    const { s, P } = planetFor(seed);
    for (const r of s.globe.regions) {
      const dir = P.sites.get(r.id).dir, biome = P.biomeAt(dir), e = P.surface(dir).e;
      assert.ok(e > 0, `${seed} ${r.name} (${r.biome}) ligger i havet`);
      if (r.biome === 'fjell') assert.equal(biome, 'fjell', `${seed} ${r.name}`);
      if (r.biome === 'skog') assert.equal(biome, 'skog', `${seed} ${r.name}`);
      if (r.biome === 'slette') assert.ok(['slette', 'ørken'].includes(biome), `${seed} ${r.name}: ${biome}`);
      if (r.biome === 'kyst') {
        // Kystland har hav innen rekkevidde i retning bort fra hjemmet.
        let sea = false;
        for (let k = 0; k < 24 && !sea; k++) { const a = (k / 24) * Math.PI * 2; for (const d of [0.04, 0.07, 0.1]) { const site = P.sites.get(r.id); const q = P.surface(offsetDir(P.home.basis, site.x + Math.cos(a) * d, site.y + Math.sin(a) * d)).e; if (q < 0) sea = true; } }
        assert.ok(sea, `${seed} ${r.name} er kyst uten hav`);
      }
    }
    // Hjemmeregionen er grønt lavland, og hele flekken er tørt land.
    assert.equal(P.biomeAt(P.home.dir), 'skog');
    for (const [x, y] of [[0, 0], [B.world.width, 0], [0, B.world.height], [B.world.width, B.world.height]]) assert.ok(P.surface(P.worldToDir(x, y)).e > 0);
  }
});

test('landenes retning på planeten er nøyaktig samme retning som karavaner og ekspedisjoner bruker ved kartkanten', () => {
  const { s, P } = planetFor(20261009);
  const Hc = Math.floor(B.globe.cols / 2), Hr = Math.floor(B.globe.rows / 2);
  for (const r of s.globe.regions) {
    if (r.home) continue;
    const l = localOffset(P.home.basis, P.sites.get(r.id).dir);
    const dx = r.col - Hc, dy = r.row - Hr; // verdens-y peker sørover
    const want = Math.atan2(-dy, dx), got = Math.atan2(l.y, l.x);
    assert.ok(Math.abs(Math.atan2(Math.sin(got - want), Math.cos(got - want))) < 1e-6, r.name);
    // og nabolandene ligger utenfor hjemmeregionens flekk
    assert.ok(Math.hypot(l.x, l.y) > P.patch.w, r.name);
  }
});

test('verdenskoordinater ↔ planet: hjørner og sentrum går rundt uten feil, og øst/nord stemmer', () => {
  const { s, P } = planetFor(20261009);
  for (const [x, y] of [[0, 0], [1200, 820], [2400, 1600], [300, 1500]]) {
    const w = P.dirToWorld(P.worldToDir(x, y));
    assert.ok(Math.abs(w.x - x) < 0.5 && Math.abs(w.y - y) < 0.5, `${x},${y} → ${w.x},${w.y}`);
  }
  const C = s.settlement.center, east = localOffset(P.home.basis, P.worldToDir(C.x + 500, C.y)), south = localOffset(P.home.basis, P.worldToDir(C.x, C.y + 500));
  assert.ok(east.x > 0 && Math.abs(east.y - localOffset(P.home.basis, P.worldToDir(C.x, C.y)).y) < 1e-9);
  assert.ok(south.y < localOffset(P.home.basis, P.worldToDir(C.x, C.y)).y);
});

test('planetkameraet: 2D-utsnitt ↔ planetutsnitt har samme bredde og sentrum (sømløs overgang)', () => {
  const { s, P } = planetFor(20261009);
  const cam = { x: 1240, y: 800, w: 2300, screenW: 1920, screenH: 1080 };
  const g = globeFromWorldCam(P, cam, s.world);
  const back = worldCamFromGlobe(P, g, s.world, 1920, 1080);
  assert.ok(Math.abs(back.x - cam.x) < 0.5 && Math.abs(back.y - cam.y) < 0.5 && Math.abs(back.w - cam.w) < 0.5);
  // Et punkt på skjermkanten i 2D treffer samme verdenspunkt i planetvisningen (flat-tilnærmingen holder).
  const F = globeFrame(g, 1920, 1080);
  const edgeWorld = { x: cam.x + cam.w / 2 * 0.9, y: cam.y };
  const sp = projectDir(F, P.worldToDir(edgeWorld.x, edgeWorld.y));
  const want = 1920 / 2 + 0.9 * 1920 / 2;
  assert.ok(Math.abs(sp.x - want) < 3 && Math.abs(sp.y - 540) < 3, `skjerm ${sp.x},${sp.y}`);
  assert.ok(Math.abs(spanForHeight(heightForSpan(0.05, 1920, 1080), 1920, 1080) - 0.05) < 1e-12);
});

test('planetkameraet: projeksjon og tilbakeprojeksjon er konsistente; baksiden er skjult', () => {
  const g = createGlobeCamera(0.8, -0.3, 1.5);
  const F = globeFrame(g, 1600, 900);
  for (const [x, y] of [[800, 450], [700, 400], [900, 520]]) {
    const p = unprojectScreen(F, x, y);
    const q = projectDir(F, p);
    assert.ok(Math.abs(q.x - x) < 0.01 && Math.abs(q.y - y) < 0.01 && q.front);
  }
  assert.equal(unprojectScreen(F, 2, 2), null, 'hjørnet bommer på kloden ved full planetvisning');
  const back = F.focus.map((v) => -v);
  assert.ok(!projectDir(F, back)?.front);
});

test('planetkameraet: skalanavn, glid og grenser', () => {
  assert.equal(scaleOf(0.07).id, 'region');
  assert.equal(scaleOf(GLOBE.continentH).id, 'continent');
  assert.equal(scaleOf(GLOBE.maxH).id, 'planet');
  const g = createGlobeCamera(0.8, 0.1, 0.07);
  globeGlide(g, 0.9, 3.1, 2, 1);
  for (let i = 0; i < 40; i++) updateGlobeCamera(g, 0.05);
  assert.equal(g.tween, null);
  assert.ok(Math.abs(g.h - 2) < 1e-9 && Math.abs(g.lat - 0.9) < 1e-9);
  g.h = 99; g.lat = 3; clampGlobe(g, 0.05);
  assert.ok(g.h === GLOBE.maxH && g.lat < 1.4);
  g.h = 0.001; clampGlobe(g, 0.05);
  assert.equal(g.h, 0.05);
});

test('planetens visningsmodell: bare hjemmet er kjent i starten; oppdagede land og utposter vises, og lys følger folket', () => {
  const { s, P } = planetFor(20261009);
  let v = planetView(s, P);
  assert.equal(v.regions.length, 1);
  assert.equal(v.regions[0].id, 'home');
  const [a, b] = s.globe.regions.filter((r) => !r.home);
  a.state = regionState.OPPDAGET; b.state = regionState.UTPOST; b.pop = 4;
  v = planetView(s, P);
  assert.deepEqual(v.regions.map((r) => r.id).sort(), ['home', a.id, b.id].sort());
  assert.ok(v.regions.find((r) => r.id === b.id).reveal > v.regions.find((r) => r.id === a.id).reveal);
  assert.ok(v.lights.length >= 2, 'hovedstaden og utposten lyser');
  // Ragnarok: en ny verden har bare hjemmet
  assert.equal(planetView(createGame(20261009), P).regions.length, 1);
});

test('planettekstur: deterministisk, 2:1 og vann merket i alfa', () => {
  const { P } = planetFor(20261009);
  const t1 = bakeGlobal(P, 64), t2 = bakeGlobal(P, 64);
  assert.equal(t1.w, 64); assert.equal(t1.h, 32);
  assert.deepEqual(t1.data, t2.data);
  const alphas = new Set(); for (let i = 3; i < t1.data.length; i += 4) alphas.add(t1.data[i]);
  const list = [...alphas].sort((x, y) => x - y);
  assert.equal(list[0], 64, 'vann er merket med lav alfa');
  assert.ok(list.some((a) => a >= 160), 'land har høy alfa (160 + skogtetthet)');
  assert.ok(list.every((a) => a === 64 || (a >= 160 && a <= 255)), 'ingen mellomverdier');
});

test('lagring: rundtur gir identisk videre forløp (ingen offline-fremgang, ingen avvik)', () => {
  const a = createGame(20261009), b = createGame(20261009);
  const run = (s) => { s.resources.wood = 400; s.resources.stone = 300; advance(s, 2); };
  run(a); run(b);
  const c = deserialize(serialize(b), { seed: 20261009 });
  assert.ok(c, 'lagringen leses');
  assert.equal(c.time, b.time, 'ingen tid har gått');
  advance(a, 90); advance(c, 90);
  const strip = (s) => serialize(s).replace(/"savedAt":\d+,/, '');
  assert.equal(strip(a), strip(c));
  assert.equal(c.realm.lastFoundedAt, -Infinity, 'Infinity overlever lagringen');
  assert.ok(c.wear.data instanceof Float32Array);
});

test('lagring: ugyldig, fremtidig eller feil frø avvises; manglende felt fylles inn', () => {
  assert.equal(deserialize('ikke json'), null);
  assert.equal(deserialize('{}'), null);
  const s = createGame(20261009);
  const text = serialize(s);
  assert.equal(deserialize(text, { seed: 5 }), null);
  const future = JSON.parse(text); future.v = SAVE_VERSION + 1;
  assert.equal(deserialize(JSON.stringify(future)), null);
  const old = JSON.parse(text); delete old.state.globe; delete old.state.modifiers.rockRegen;
  const filled = deserialize(JSON.stringify(old));
  assert.ok(filled.globe.regions.length === B.globe.cols * B.globe.rows && filled.modifiers.rockRegen === 1);
});

test('planetkonstanter: hjemmeflekken er mindre enn avstanden mellom landene', () => {
  assert.ok(PLANET.patchW < PLANET.regionStep);
  const { P } = planetFor(20261009);
  const ids = [...P.sites.keys()];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    assert.ok(angle(P.sites.get(ids[i]).dir, P.sites.get(ids[j]).dir) > PLANET.regionRadius * 1.2, `${ids[i]}–${ids[j]} overlapper`);
  }
});
