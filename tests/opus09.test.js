import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance, checkMilestones } from '../src/sim/game.js';
import { enableIndustry, stepIndustry } from '../src/sim/industrial.js';
import { serialize, deserialize } from '../src/sim/save.js';
import { findBuildSite, siteIsValid } from '../src/sim/construction.js';
import { inPond } from '../src/sim/world.js';
import { BALANCE as B } from '../src/data/balance.js';
import { addBuilding, addPeople } from './support.js';

const flyable = (seed) => {
  const s = createGame(seed); enableIndustry(s);
  s.aviation.enabled = true; s.aviation.surveyEnabled = true;
  addPeople(s, 'first', 4); addBuilding(s, 'steam_engine', 'first', 900, 700, { reliability: 1, availablePower: 5 }); s.resources.coal = 300;
  return s;
};
const region = (s, steps = 1) => {
  const r = s.globe.regions.find((q) => !q.home && q.steps === steps);
  r.state = 'oppdaget'; r.knowledge = 'discovered';
  return r;
};

test('OPUS-09: presisjonskomponenter bruker ekte innsatsvarer og kan ikke lages uten kopper', () => {
  const s = createGame(901); enableIndustry(s); s.industrial.precision = true; addBuilding(s, 'metalworks');
  addPeople(s, 'first', 3); addBuilding(s, 'steam_engine', 'first', 900, 700, { reliability: 1, availablePower: 5 }); s.resources.coal = 200;
  const P = addBuilding(s, 'precision_works', 'first', 1000, 760);
  s.resources.iron = 5; s.resources.industrialMachinery = 3; s.resources.copper = 0;
  advance(s, 60);
  assert.equal(s.resources.precisionComponents, 0, 'ingen komponenter uten kobber');
  s.resources.copper = 3; advance(s, 60);
  assert.ok(s.resources.precisionComponents >= 1 && s.resources.copper < 3 && P.made >= 1, 'komponenter lages av innsatsvarer');
  assert.ok(Object.values(s.resources).every((n) => n >= 0));
});

test('OPUS-09: flyverket bygger fly bare av komponenter og stopper ved full flåte', () => {
  const s = flyable(902); enableIndustry(s); addBuilding(s, 'aircraft_works', 'first', 1000, 760);
  s.resources.planks = 500; s.resources.iron = 50; s.resources.precisionComponents = 0;
  advance(s, 60);
  assert.equal(s.resources.aircraft, 0, 'fly lages ikke fra ingenting');
  s.resources.precisionComponents = 40; advance(s, 400);
  assert.equal(s.resources.aircraft, B.industrial.factories.aircraft_works.cap.aircraft, 'produksjonen stopper ved taket');
  assert.ok(s.resources.precisionComponents < 40, 'komponentene er forbrukt');
});

test('OPUS-09: flyplass velges bare på gyldig, ledig tomt utenfor bykjernen', () => {
  const s = createGame(903);
  const site = findBuildSite(s, 'airfield', 'first');
  assert.ok(site, 'det finnes en tomt');
  assert.ok(siteIsValid(s, 'airfield', site.x, site.y));
  assert.equal(inPond(s, site.x, site.y, B.building.airfield.radius), false, 'ikke i vannet');
  // Søket måler ringer fra bålet (leirens hjerte), så flyplassen står alltid utenfor den tette kjernen.
  const fire = s.buildings.find((b) => b.type === 'fire');
  const anchor = fire || s.settlement.center;
  // Ringene i søket er ellipser (y skaleres med 0.72), så avstanden måles på samme måte.
  const ring = Math.hypot(site.x - anchor.x, (site.y - anchor.y) / 0.72);
  assert.ok(ring >= B.building.airfield.minRing - 1, 'ikke midt i bykjernen');
});

test('OPUS-09: flygning bruker drivstoff og tid, har begrenset rekkevidde og krever fly og flyplass', () => {
  const s = flyable(904); const r = region(s, 1);
  addBuilding(s, 'airfield', 'first', 1000, 600);
  s.resources.fuel = 0; s.resources.aircraft = 1; stepIndustry(s, 1 / 60);
  assert.equal(s.aviation.flights.length, 0, 'uten drivstoff ingen flyvning');
  s.resources.fuel = 10; stepIndustry(s, 1 / 60);
  const f = s.aviation.flights[0];
  assert.ok(f && f.status === 'flying' && f.regionId === r.id, 'flyet setter kurs mot kjent sted');
  assert.equal(f.fuel, 2 * 1 * B.aviation.flight.fuelPerStep, 'rundtur bruker drivstoff');
  assert.equal(s.resources.fuel, 10 - f.fuel, 'drivstoffet trekkes ved avgang');
  assert.equal(f.arriveAt - f.departAt, 2 * 1 * B.aviation.flight.secondsPerStep, 'flyvningen tar tid');
  assert.equal(r.knowledge, 'discovered', 'kartet endrer seg ikke før flyet er fremme');
});

test('OPUS-09: flyvning over fjerne eller ukjente steder og uten fly gjøres ikke', () => {
  const s = flyable(905);
  addBuilding(s, 'airfield', 'first', 1000, 600);
  const far = s.globe.regions.find((q) => !q.home && q.steps > B.aviation.flight.maxSteps);
  const ukjent = s.globe.regions.find((q) => !q.home && q.steps === 1);
  s.resources.fuel = 50; s.resources.aircraft = 1;
  stepIndustry(s, 1 / 60);
  assert.ok(s.aviation.flights.every((f) => f.regionId !== far?.id), 'utenfor rekkevidde');
  assert.ok(s.aviation.flights.every((f) => f.regionId !== ukjent.id), 'ukjent sted flys ikke over');
  s.resources.aircraft = 0; s.aviation.flights = []; stepIndustry(s, 1 / 60);
  assert.equal(s.aviation.flights.length, 0, 'uten fly ingen flyvning');
});

test('OPUS-09: fullført måling øker kartkunnskap ett trinn og teller luftmålinger', () => {
  const s = flyable(906); const r = region(s, 1);
  addBuilding(s, 'airfield', 'first', 1000, 600);
  s.resources.fuel = 10; s.resources.aircraft = 1;
  stepIndustry(s, 1 / 60);
  const arrive = s.aviation.flights[0].arriveAt;
  advance(s, arrive - s.time + 1);
  assert.equal(r.knowledge, 'surveyed');
  assert.equal(s.aviation.surveys, 1);
  assert.ok(s.globe.regions.filter((q) => q.id !== r.id && !q.home && q.state === 'ukjent').every((q) => q.knowledge === 'unknown'), 'ukjente områder forblir ukjente');
});

test('OPUS-09: planetkameraet krever tre fullførte luftmålinger, og milepælen er ikke gratis', () => {
  const s = createGame(907);
  s.milestones.first_world_civilization = 1; s.upgrades.aerial_survey = 1;
  checkMilestones(s);
  assert.notEqual(s.unlocks.worldView, true, 'uten målinger åpnes ikke kameraet');
  s.aviation.surveys = 2; checkMilestones(s); assert.notEqual(s.unlocks.worldView, true);
  s.aviation.surveys = 3; checkMilestones(s); assert.equal(s.unlocks.worldView, true);
});

test('OPUS-09: flyvning overlever lagring midt i turen, og v8-lagring fylles med luftfart', () => {
  const s = flyable(908); const r = region(s, 1);
  addBuilding(s, 'airfield', 'first', 1000, 600);
  s.resources.fuel = 10; s.resources.aircraft = 1; stepIndustry(s, 1 / 60);
  const restored = deserialize(serialize(s));
  const f = restored.aviation.flights[0];
  assert.equal(f.status, 'flying'); assert.equal(f.regionId, r.id); assert.equal(restored.resources.fuel, s.resources.fuel);
  advance(restored, f.arriveAt - restored.time + 1);
  assert.equal(restored.aviation.surveys, 1, 'flyvningen fullføres etter lasting');

  const raw = JSON.parse(serialize(s)); raw.v = 8; delete raw.state.aviation; delete raw.state.resources.aircraft; delete raw.state.resources.precisionComponents;
  const old = deserialize(JSON.stringify(raw));
  assert.equal(old.aviation.enabled, false); assert.equal(old.resources.aircraft, 0);
});
