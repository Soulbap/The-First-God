// OPUS-11: regionale lagre, transport uten teleportering, boligtrinn, avstand og luft, ytelse og determinisme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance, step } from '../src/sim/game.js';
import { regionState, demandOf, housingCap, stockCap } from '../src/sim/worldmap.js';
import { stockOf, stockAdd, projectNeeds } from '../src/sim/regional.js';
import { stepIndustry, enableIndustry } from '../src/sim/industrial.js';
import { findBuildSite, siteIsValid, siteStats } from '../src/sim/construction.js';
import { tierOf, maxTierFor, stepRenovation } from '../src/sim/renovation.js';
import { housingCapacity } from '../src/sim/settlements.js';
import { projectRegionScene } from '../src/sim/regionScene.js';
import { serialize, deserialize } from '../src/sim/save.js';
import { BALANCE as B } from '../src/data/balance.js';
import { fingerprint, runSeed } from '../tools/fastforward.mjs';
import { reached, addBuilding, addPeople } from './support.js';

const GOODS = ['ironOre', 'coal', 'copperOre', 'tinOre', 'crudeOil', 'wood', 'stone', 'food', 'planks', 'cutstone', 'charcoal'];

function outpost(s, biome = 'fjell') {
  const r = s.globe.regions.find((q) => !q.home && q.biome === biome) || s.globe.regions.find((q) => !q.home);
  r.state = regionState.UTPOST; r.pop = 6; r.homes = 2; r.nextGrowAt = Infinity; r.nextCaravanAt = 5;
  s.globe.outpostsEnabled = true; s.globe.nextMissionAt = Infinity;
  return r;
}
const inTransit = (s, g) => s.globe.caravans.reduce((n, c) => n + c.goods.filter((x) => x.res === g).reduce((m, x) => m + x.amount, 0), 0);
const regionSum = (s, g) => s.globe.regions.reduce((n, r) => n + (r.inventory[g] || 0) + (r.stock[g] || 0), 0);

test('regionlager: utvinning flytter bare fra forekomst til lager, og varer bevares gjennom karavaner', () => {
  const s = createGame(1101); s.materials.enabled = true; s.industrial.enabled = true; s.industrial.petroleum = true;
  const r = outpost(s, 'fjell');
  const start = Object.fromEntries(GOODS.map((g) => [g, regionSum(s, g) + s.resources[g]]));
  advance(s, 600);
  assert.ok(r.extracted > 5, 'folk i regionen har faktisk utvunnet noe');
  for (const g of GOODS) {
    const now = regionSum(s, g) + inTransit(s, g) + s.resources[g];
    assert.ok(Math.abs(now - start[g]) < 1e-6, `${g}: ${start[g]} → ${now}`);
  }
  assert.ok(Object.values(r.stock).every((v) => v >= 0) && Object.values(r.inventory).every((v) => v >= 0), 'aldri negativ beholdning');
  assert.ok(Object.keys(r.stock).every((k) => (r.stock[k] || 0) <= stockCap(r) + 1e-9), 'lagerplassen er begrenset');
});

test('regionlager: karavanen bærer bare det regionens lager har og det hjemmelageret trenger mest', () => {
  const s = createGame(1102); s.materials.enabled = true; s.industrial.enabled = true;
  const r = outpost(s, 'fjell'); r.nextCaravanAt = 0;
  r.stock = { ironOre: 30, coal: 30, stone: 30 }; r.inventory = { ironOre: 0, coal: 0, stone: 0, cutstone: 0 };
  s.resources.coal = 200; s.resources.stone = 500; s.resources.ironOre = 0; // jern mangler, kull og stein dekket
  step(s); step(s);
  const c = s.globe.caravans[0];
  assert.ok(c, 'en karavane går');
  assert.ok(c.goods.some((g) => g.res === 'ironOre'), 'jern mangler mest og bæres');
  assert.ok(!c.goods.some((g) => g.res === 'coal' || g.res === 'stone'), 'dekkede varer sendes ikke');
  assert.ok(c.goods.every((g) => g.amount <= 30), 'aldri mer enn lageret hadde');
  assert.equal(r.stock.ironOre, 30 - c.goods.find((g) => g.res === 'ironOre').amount, 'varen er reservert (trukket fra lageret) ved avreise');
  // Uten noe på lageret går ingen karavane.
  const t = createGame(1103); const q = outpost(t, 'fjell'); q.nextCaravanAt = 0; q.stock = {}; q.inventory = { ironOre: 0, coal: 0, stone: 0, cutstone: 0 };
  step(t); assert.equal(t.globe.caravans.length, 0, 'ingen lagerbeholdning, ingen karavane');
});

test('regionlager: boliger bygges av regionens eget lager og gir plass til flere folk', () => {
  const s = createGame(1104);
  const r = outpost(s, 'skog'); r.state = regionState.ETABLERT; r.pop = housingCap(r) - 1; r.inventory = { wood: 500, planks: 50, charcoal: 20 };
  const before = r.homes; r.stock = {};
  advance(s, 20); assert.equal(r.building, null, 'uten materialer i lageret bygges ingenting');
  r.stock = { wood: 40 };
  advance(s, 2); assert.ok(r.building, 'byggingen starter når lageret har materialer');
  assert.ok(r.stock.wood < 40, 'materialene er brukt fra regionens lager');
  advance(s, B.globe.homeSeconds + 5);
  assert.equal(r.homes, before + 1); assert.ok(housingCap(r) > 4 + before * 2 - 1);
});

test('bosettingslager: leveranser havner i satellittens eget lager og prosjekter bruker bare det', () => {
  const s = createGame(1105);
  const S = { id: 'second', name: 'Lysningen', x: s.settlement.center.x + 700, y: s.settlement.center.y - 300, state: 'active', population: [], kind: 'farm', projectsDone: 0, role: 'x', stage: 'Leir', stock: {} };
  s.settlements.push(S);
  stockAdd(S, 'wood', 14); assert.equal(stockOf(s, S, 'wood'), 14);
  s.region.projects.second = { id: 'p1', type: 'storage', cost: { wood: 14, stone: 8 }, settlementId: 'second' };
  const needs = projectNeeds(s);
  assert.deepEqual(needs.map((n) => [n.type, n.missing]), [['stone', 8]], 'bare det som mangler etter lokalt lager');
  assert.equal(stockOf(s, s.settlements[0], 'wood'), s.resources.wood, 'hovedstadens lager er hjemmelageret');
});

test('lastebil: kjører bare med varer et prosjekt mangler, lasten finnes bare i transitt og havner i bosettingens lager (også etter lagring)', () => {
  const s = createGame(1106); enableIndustry(s); s.industrial.roads = true;
  addBuilding(s, 'steam_engine', 'first', 900, 700, { reliability: 1, availablePower: 5 }); s.resources.coal = 100;
  const S = { id: 'second', name: 'B', x: s.settlement.center.x + 420, y: s.settlement.center.y - 100, state: 'active', population: [], kind: 'farm', projectsDone: 0, role: 'x', stage: 'Leir', stock: {} };
  s.settlements.push(S);
  s.resources.truck = 1; s.resources.fuel = 6; s.resources.stone = 60; s.resources.wood = 60;
  stepIndustry(s, 0.1);
  assert.equal(s.industrial.shipments.filter((q) => q.mode === 'road').length, 0, 'uten prosjekt kjører ingen lastebil (ingen bortkastet drivstoff)');
  s.region.projects.second = { id: 'p1', type: 'storage', cost: { wood: 14, stone: 8 }, settlementId: 'second' };
  const total = () => s.resources.stone + stockOf(s, S, 'stone') + s.industrial.shipments.filter((q) => q.status === 'traveling' && q.type === 'stone').reduce((n, q) => n + q.amount, 0);
  const start = total();
  stepIndustry(s, 0.1);
  const trip = s.industrial.shipments.find((q) => q.mode === 'road');
  assert.ok(trip && trip.to === 'second', 'lastebilen kjører til bosettingen som mangler varer');
  assert.equal(s.resources.fuel, 6 - B.combustion.road.fuelPerTrip);
  assert.equal(total(), start, 'lasten er i transitt, verken kopiert eller borte');
  const saved = deserialize(serialize(s));
  advance(saved, B.combustion.road.travelSeconds + 2);
  const S2 = saved.settlements.find((q) => q.id === 'second');
  assert.ok(stockOf(saved, S2, trip.type) >= trip.amount, 'lasten kom frem i lageret etter lagring og lesing');
});

test('boligtrinn: ombygging krever kunnskap, materialer og tid, og gir mer plass; minnestedet bevares', () => {
  const s = createGame(1107);
  s.urban.enabled = true;
  const S = s.settlements[0]; S.stage = 'Tidlig by'; addPeople(s, 'first', 6);
  const huts = [0, 1, 2].map((i) => addBuilding(s, 'hut', 'first', 1000 + i * 150, 600));
  assert.equal(tierOf(huts[0]), 1);
  assert.equal(maxTierFor(s, S), 2, 'uten Byggemetoder er tømmerstue det høyeste');
  s.resources.wood = 500; s.resources.stone = 500; s.resources.planks = 100; s.resources.cutstone = 100;
  const cap0 = housingCapacity(s, 'first');
  stepRenovation(s, 6);
  const active = huts.find((h) => h.renovation); assert.ok(active && active.renovation.to === 2);
  assert.equal(s.resources.stone, 500 - B.renovation.tiers[2].cost.stone, 'kostnaden trekkes ved start');
  const spent = s.resources.wood;
  for (let i = 0; i < 40 && active.renovation; i++) stepRenovation(s, 6);
  assert.equal(active.tier, 2); assert.equal(s.resources.wood, spent, 'ingen dobbel betaling for samme ombygging');
  assert.ok(housingCapacity(s, 'first') > cap0, 'boligplassen øker');
  // Videre trinn krever kunnskap.
  for (let i = 0; i < 200; i++) stepRenovation(s, 6);
  assert.ok(huts.every((h) => tierOf(h) === 2), 'alle hjem er på høyeste mulige trinn uten Byggemetoder');
  s.upgrades.construction_methods = 1;
  assert.equal(maxTierFor(s, S), 3);
  for (let i = 0; i < 200; i++) stepRenovation(s, 6);
  assert.ok(huts.every((h) => tierOf(h) === 3), 'steinhus etter Byggemetoder');
  // Ingen trinn over det kunnskapen tillater, uansett hvor lenge man venter.
  assert.ok(huts.every((h) => tierOf(h) <= 3));
  // Lagring midt i en ombygging.
  const t = addBuilding(s, 'hut', 'first', 1800, 600); S.stage = 'Tidlig by';
  s.upgrades.construction_methods = 0; s.resources.wood = 500; s.resources.stone = 500; s.resources.planks = 100;
  stepRenovation(s, 6);
  const mid = deserialize(serialize(s)).buildings.find((b) => b.id === t.id);
  assert.ok(mid.renovation && mid.renovation.to === 2, 'ombygging overlever lagring');
});

test('boligtrinn: bygård krever industri, moderne blokk krever strøm i bosettingen, og et spill når begge', () => {
  const s = createGame(1108); const S = s.settlements[0]; S.stage = 'By';
  s.upgrades.construction_methods = 1; s.upgrades.factory_manufacture = 1; s.upgrades.electric_power = 1;
  assert.equal(maxTierFor(s, S), 3, 'industri må være aktivert');
  enableIndustry(s); assert.equal(maxTierFor(s, S), 4);
  s.industrial.litSettlements = ['first']; assert.equal(maxTierFor(s, S), 5);
  s.industrial.litSettlements = []; assert.equal(maxTierFor(s, S), 4, 'uten strøm ingen moderne blokk');
  const { s: g } = reached('first_world_civilization', 31337);
  const homes = g.buildings.filter((b) => b.complete && ['hut', 'townhouse'].includes(b.type) && b.settlementId === 'first');
  assert.ok(homes.some((b) => tierOf(b) >= 3), 'et ekte spill har hevet boligtrinnet');
});

test('avstand: bosettinger ligger minst en bosettingsavstand fra hverandre, og luften mellom bygg avtar med trinnet', () => {
  const { s } = reached((st) => st.settlements.length >= 3, 701, 9000, 'tre-bosettinger');
  assert.ok(s.settlements.length >= 3, 'flere bosettinger oppstod');
  for (const a of s.settlements) for (const b of s.settlements) if (a.id < b.id) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= B.realm.minSiteSpacing - 1, `${a.id}–${b.id}`);
  // Luft: samme avstand er ugyldig i en leir, men gyldig i en by.
  const w = createGame(1109), C = w.settlement.center; w.nodes = []; // ingen trær i veien for prøvepunktet
  addBuilding(w, 'hut', 'first', C.x + 300, C.y + 100);
  const r = B.building.hut.radius, d = r + 30 + 16 + 4; // rett utenfor vanlig klarering, innenfor leirens ekstra luft
  w.settlements[0].stage = 'Leir'; assert.equal(siteIsValid(w, 'hut', C.x + 300 + d, C.y + 100, 'first'), false);
  w.settlements[0].stage = 'By'; assert.equal(siteIsValid(w, 'hut', C.x + 300 + d, C.y + 100, 'first'), true);
});

test('ytelse: et mislykket tomtesøk gjentas ikke i hvert steg, men finner tomt når oppsettet endres', () => {
  const s = createGame(1110);
  // Ingen tomt finnes: kartet er krympet så alt ligger utenfor kanten.
  const W = s.world.width, H = s.world.height; s.world.width = 300; s.world.height = 300;
  const before = siteStats.searches;
  let found = 0;
  for (let i = 0; i < 1200; i++) { s.time += 1 / 60; if (findBuildSite(s, 'airfield', 'first')) found++; }
  const searches = siteStats.searches - before;
  assert.equal(found, 0);
  assert.ok(searches <= 8, `1200 kall (20 s) ga ${searches} faktiske søk`);
  // Oppsettet endres: det første kallet søker på nytt, og tomt finnes igjen.
  s.world.width = W; s.world.height = H; addBuilding(s, 'fire', 'first', 500, 500);
  assert.ok(findBuildSite(s, 'airfield', 'first'), 'tomt finnes igjen når verden er endret');
});

test('determinisme: samme frø og tid gir identisk tilstand, og lagre/lese midt i kjøringen endrer ikke utfallet', () => {
  const a = runSeed({ seed: 4343, seconds: 1500, keepState: true }).final, b = runSeed({ seed: 4343, seconds: 1500, keepState: true }).final;
  assert.equal(fingerprint(a), fingerprint(b));
  const c = createGame(4343); advance(c, 700);
  const d = deserialize(serialize(c)); advance(c, 600); advance(d, 600);
  assert.equal(fingerprint(c), fingerprint(d));
});

test('utforsking: et oppdaget land kan besøkes som deterministisk lokalt landskap uten å endre økonomien', () => {
  const s = createGame(1111);
  const r = s.globe.regions.find((q) => !q.home && q.biome === 'dal'); r.state = regionState.ETABLERT; r.pop = 8; r.homes = 4; r.extracted = 50;
  const fp = fingerprint(s);
  const a = projectRegionScene(s, r.id), b = projectRegionScene(s, r.id);
  assert.equal(JSON.stringify(a.nodes), JSON.stringify(b.nodes), 'samme landskap hver gang');
  assert.equal(fingerprint(s), fp, 'besøket skriver ingenting tilbake');
  assert.equal(a.buildings.filter((q) => q.type === 'hut').length, 4, 'boligene speiler regionens tilstand');
  assert.equal(a.world.biome, 'dal'); assert.ok(a.world.streams.length >= 0);
  const kyst = s.globe.regions.find((q) => !q.home && q.biome === 'kyst'); kyst.state = regionState.UTPOST; kyst.pop = 3; kyst.homes = 1;
  const k = projectRegionScene(s, kyst.id);
  assert.ok(k.world.pond.rx >= 400, 'kystland har hav i bildet');
  const unknown = s.globe.regions.find((q) => !q.home && q.state === 'ukjent');
  assert.equal(projectRegionScene(s, unknown.id), null, 'ukjente land vises ikke');
});

test('Ragnarok: en ny syklus har ingen regionlager, bosettingslager eller boligtrinn fra forrige', () => {
  const { s } = reached((st) => st.globe.regions.some((r) => r.state === 'utpost' || r.state === 'etablert'), 701, 12000, 'utpost');
  const fresh = createGame(s.seed);
  assert.ok(fresh.globe.regions.every((r) => Object.keys(r.stock).length === 0 && r.homes === 0 && r.state !== 'utpost'));
  assert.ok(fresh.settlements.every((q) => Object.keys(q.stock || {}).length === 0));
  assert.equal(fresh.renovation.done, 0); assert.deepEqual(fresh.siteMisses, {});
});

test('utforsking: kameraet kan bytte mellom regioner uten å endre simuleringen, og fjerne land utvikler seg utenfor skjermen', () => {
  const run = (switching) => {
    const s = createGame(1112); s.materials.enabled = true;
    const r = outpost(s, 'dal');
    const ids = s.globe.regions.filter((q) => !q.home).map((q) => q.id);
    for (let i = 0; i < 10; i++) {
      advance(s, 30);
      if (switching) { s.globe.activeRegionId = ids[i % ids.length]; visitRegionIfAllowed(s, ids[(i * 3) % ids.length]); }
    }
    s.globe.activeRegionId = s.globe.regions.find((q) => q.home).id;
    return { s, r };
  };
  const a = run(false), b = run(true);
  assert.equal(fingerprint(a.s), fingerprint(b.s), 'kameraet er ren presentasjon');
  assert.ok(a.r.extracted > 5 && Object.values(a.r.stock).some((v) => v > 1), 'regionen utvinner og lagrer mens ingen ser på');
});

function visitRegionIfAllowed(s, id) { const r = s.globe.regions.find((q) => q.id === id); if (r && (r.home || r.state !== 'ukjent')) s.globe.activeRegionId = id; }

test('lagring: en v10-lagring uten OPUS-11-felt migreres uten tap og spillet fortsetter uten negative eller ugyldige verdier', () => {
  const s = createGame(1113); advance(s, 400);
  const raw = JSON.parse(serialize(s)); raw.v = 10;
  for (const r of raw.state.globe.regions) { delete r.stock; delete r.homes; delete r.building; delete r.extracted; delete r.aerial; }
  for (const q of raw.state.settlements) delete q.stock;
  delete raw.state.renovation; delete raw.state.siteMisses; delete raw.state.world.streams; delete raw.state.world.waters; delete raw.state.world.zones;
  const old = deserialize(JSON.stringify(raw));
  assert.ok(old, 'lagringen leses');
  assert.ok(old.globe.regions.every((r) => r.stock && r.homes != null) && old.settlements.every((q) => q.stock));
  assert.equal(old.renovation.done, 0); assert.deepEqual(old.world.streams, []);
  advance(old, 600);
  assert.ok(Object.values(old.resources).every((n) => Number.isFinite(n) && n >= 0), 'ingen negative eller ugyldige ressurser');
});
