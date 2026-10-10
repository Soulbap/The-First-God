import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance } from '../src/sim/game.js';
import { enableIndustry, stepIndustry } from '../src/sim/industrial.js';
import { factoryPower } from '../src/sim/power.js';
import { stepScience } from '../src/sim/science.js';
import { serialize, deserialize, SAVE_VERSION } from '../src/sim/save.js';
import { upgradeStatus, purchase } from '../src/sim/economy.js';
import { upgradeById } from '../src/data/upgrades.js';
import { BALANCE as B } from '../src/data/balance.js';
import { addBuilding, addPeople } from './support.js';

const powered = (s, perSecondBudget = 50) => { s.industrial.electricBudget.first = perSecondBudget / 60; };

test('OPUS-10: elektronikk krever elektrisk kraft og har ingen mekanisk reserve', () => {
  const s = createGame(1001); enableIndustry(s);
  addBuilding(s, 'steam_engine', 'first', 900, 700, { reliability: 1, availablePower: 5 });
  const recipe = B.industrial.factories.electronics_works;
  assert.equal(recipe.electricOnly, true);
  assert.equal(factoryPower(s, { id: 'first' }, recipe, 1 / 60), null, 'damp alene gir ikke elektronikk');
  powered(s, 6);
  assert.equal(factoryPower(s, { id: 'first' }, recipe, 1 / 60), 'elektrisk');
});

test('OPUS-10: elektronikkverket bruker ekte innsatsvarer og er begrenset av taket', () => {
  const s = createGame(1002); enableIndustry(s); s.industrial.electronics = true;
  addPeople(s, 'first', 3); addBuilding(s, 'precision_works', 'first', 1100, 760);
  addBuilding(s, 'generator', 'first', 1000, 600); addBuilding(s, 'grid_station', 'first', 1040, 640);
  addBuilding(s, 'steam_engine', 'first', 900, 700, { reliability: 1, availablePower: 5 }); s.resources.coal = 300;
  s.resources.precisionComponents = 0; s.resources.copper = 0; s.resources.industrialMachinery = 0;
  // Dampmotoren slites: vedlikehold (tre og maskindeler) holder den over generatorens kravsgrense.
  s.resources.wood = 200; s.resources.mechanicalComponents = 40;
  addBuilding(s, 'electronics_works', 'first', 1000, 780);
  advance(s, 200);
  assert.equal(s.resources.electronics, 0, 'ingen elektronikk uten innsatsvarer');
  s.resources.precisionComponents = 30; s.resources.copper = 30; s.resources.industrialMachinery = 30;
  advance(s, 600);
  assert.equal(s.resources.electronics, B.industrial.factories.electronics_works.cap.electronics, 'taket stopper produksjonen');
  assert.ok(Object.values(s.resources).every((n) => n >= 0));
});

test('OPUS-10: telegrafen fungerer bare med strøm og trekker den fra kapasiteten', () => {
  const s = createGame(1003); enableIndustry(s);
  addBuilding(s, 'telegraph', 'first', 1000, 600);
  s.industrial.electricBudget = {};
  stepScience(s, 1 / 60);
  assert.equal(s.science.telegraphActive, false, 'ingen strøm, ingen telegraf');
  powered(s, 50);
  stepScience(s, 1 / 60);
  assert.equal(s.science.telegraphActive, true);
  assert.ok(Math.abs(s.industrial.electricBudget.first - ((50 / 60) - B.science.telegraph.electric / 60)) < 1e-9, 'strømmen trekkes');
});

test('OPUS-10: flyoppdrag koordineres bare via en aktiv telegraf når telegrafi er kjent', () => {
  const s = createGame(1004); enableIndustry(s); s.aviation.enabled = true; s.aviation.surveyEnabled = true;
  addBuilding(s, 'airfield', 'first', 1000, 600); addBuilding(s, 'steam_engine', 'first', 900, 700, { reliability: 1, availablePower: 5 }); s.resources.coal = 200;
  const r = s.globe.regions.find((q) => !q.home && q.steps === 1); r.state = 'oppdaget'; r.knowledge = 'discovered';
  s.resources.aircraft = 1; s.resources.fuel = 10;
  s.science.communication = true;
  stepIndustry(s, 1 / 60);
  assert.equal(s.aviation.flights.length, 0, 'uten telegraf ingen oppdrag');
  // Telegrafen får strøm fra en ekte generator og nettstasjon, ikke fra et håndsatt budsjett.
  addBuilding(s, 'telegraph', 'first', 1040, 640);
  addBuilding(s, 'generator', 'first', 1000, 600); addBuilding(s, 'grid_station', 'first', 1080, 640);
  stepIndustry(s, 1 / 60);
  assert.equal(s.aviation.flights.length, 1, 'med aktiv telegraf kan flyet gå');
});

test('OPUS-10: forskningsinstituttet gir kunnskap fra strøm og ingen gratis kunnskap', () => {
  const s = createGame(1005); enableIndustry(s); s.science.research = true;
  addBuilding(s, 'research_institute', 'first', 1000, 600);
  const start = s.resources.knowledge;
  s.industrial.electricBudget = {};
  stepScience(s, 1);
  assert.equal(s.resources.knowledge, start, 'ingen forskning uten strøm');
  powered(s, 60);
  stepScience(s, 1);
  assert.ok(Math.abs(s.resources.knowledge - start - B.science.institute.knowledgePerSecond) < 1e-9, 'kunnskap tilsvarer rate og strøm');
  assert.ok(Math.abs(s.science.researchKnowledge - B.science.institute.knowledgePerSecond) < 1e-9);
});

test('OPUS-10: oppgraderingene for telegraf og forskning krever reelle bygg og folk', () => {
  const s = createGame(1006);
  assert.ok(upgradeById('communication') && upgradeById('research') && upgradeById('rocket_foundations'));
  s.upgrades.electronics = 1;
  s.resources.knowledge = 10000; s.resources.copper = 100; s.resources.electronics = 100;
  assert.equal(upgradeStatus(s, upgradeById('communication')), 'locked', 'elektronikkverk må stå');
  assert.equal(upgradeStatus(s, upgradeById('research')), 'locked', 'telegraf og folk må finnes');
  assert.equal(purchase(s, 'research').ok, false);
  assert.equal(s.science.research, false);
});

test('OPUS-10: rakettgrunnlaget er kun kunnskap, uten rakett- eller banebygg', () => {
  const s = createGame(1007);
  s.upgrades.research = 1; addBuilding(s, 'research_institute', 'first', 1000, 600);
  s.resources.knowledge = 10000; s.resources.electronics = 10; s.resources.precisionComponents = 10; s.resources.fuel = 10;
  s.upgrades.electronics = 1; s.upgrades.communication = 1;
  const r = purchase(s, 'rocket_foundations');
  assert.equal(r.ok, true);
  assert.equal(s.science.rocketryFoundations, true);
  assert.ok(Object.keys(B.building).every((k) => !/rocket|launch|orbit|spaceport|satellite/.test(k)), 'ingen orbitale bygg er definert');
});

test('OPUS-10: v9-lagring fylles med vitenskap uten å miste elektronikk eller forskningsdata', () => {
  const s = createGame(1008); enableIndustry(s); s.resources.electronics = 4; s.science.communication = true; s.science.researchKnowledge = 12;
  assert.equal(SAVE_VERSION, 11);
  const raw = JSON.parse(serialize(s)); raw.v = 9; delete raw.state.science; delete raw.state.resources.electronics; delete raw.state.industrial.electronics;
  const old = deserialize(JSON.stringify(raw));
  assert.equal(old.science.communication, false); assert.equal(old.resources.electronics, 0);
  const restored = deserialize(serialize(s));
  assert.equal(restored.resources.electronics, 4); assert.equal(restored.science.researchKnowledge, 12); assert.equal(restored.science.communication, true);
});
