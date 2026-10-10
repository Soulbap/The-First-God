// GAMEPLAY-07..10: visningsmodeller (uten DOM) og innholdsintegritet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { UPGRADES, MILESTONES } from '../src/data/upgrades.js';
import { CATEGORIES, RESOURCES } from '../src/data/gui.js';
import { hasIcon } from '../src/ui/icons.js';
import { selectRealm, selectResources, realmVisible, reachedMilestones, currentEpoch, insightCard } from '../src/ui/insights.js';
import { classifyPresentation } from '../src/ui/presentation.js';
import { addBuilding, addPeople, reached } from './support.js';

test('alt innhold har ikon, kategori og kjente ressurser (ingen døde kort)', () => {
  const cats = new Set(CATEGORIES.map((c) => c.id));
  for (const u of UPGRADES) {
    assert.ok(hasIcon(u.icon), `ikon ${u.icon} (${u.id})`);
    assert.ok(cats.has(u.category), `kategori ${u.category} (${u.id})`);
    for (const k of Object.keys(u.cost)) assert.ok(RESOURCES[k], `ressurs ${k} (${u.id})`);
    assert.ok(u.effect && u.world, `tekster (${u.id})`);
  }
  for (const c of CATEGORIES) assert.ok(hasIcon(c.icon));
  for (const r of Object.values(RESOURCES)) assert.ok(hasIcon(r.icon));
});

test('alle krav bruker kjente kravtyper (ellers kan innhold aldri låses opp)', () => {
  const known = new Set(['all', 'upgrade', 'built', 'builtCount', 'milestone', 'people', 'gathered', 'noPending', 'expansion', 'delivery', 'regionalProjects', 'foodHarvest', 'settlementStage', 'stageMin', 'settlements', 'roles', 'routes', 'techs', 'knowledge', 'regions', 'outposts', 'caravans', 'civStage', 'regionalWear', 'ppTotal', 'festivals']);
  const walk = (r, where) => { for (const k of Object.keys(r)) { assert.ok(known.has(k), `${where}: ukjent krav «${k}»`); if (k === 'all') r.all.forEach((q) => walk(q, where)); } };
  for (const u of UPGRADES) for (const r of [...u.requires, ...(u.discover || [])]) walk(r, u.id);
  for (const m of MILESTONES) walk(m.when, m.id);
});

test('full spilling kjøper alt innhold (ingen oppgradering er utilgjengelig)', () => {
  const { s, bot } = reached('first_world_civilization');
  const bought = new Set(bot.bought.map((b) => b.id));
  // Luftmåling ligger bevisst etter «Verdens første sivilisasjon»; den er ikke del av den gamle sluttlinjen.
  const never = UPGRADES.filter((u) => !bought.has(u.id) && u.id !== 'aerial_survey').map((u) => u.id);
  assert.deepEqual(never, [], 'alle oppgraderinger kan nås');
  const ms = MILESTONES.filter((m) => s.milestones[m.id] == null && m.id !== 'planetary_survey').map((m) => m.id);
  assert.deepEqual(ms, [], 'alle milepæler kan nås');
});

test('ressurslinjen viser nye ressurser først når de finnes', () => {
  const s = createGame(); addPeople(s, 'first', 2);
  const ids = () => selectResources(s).map((r) => r.id);
  assert.ok(!ids().includes('planks') && !ids().includes('knowledge'));
  addBuilding(s, 'sawmill'); assert.ok(ids().includes('planks'));
  s.totals.cutstone = 1; assert.ok(ids().includes('cutstone'));
  s.totals.knowledge = 2; assert.ok(ids().includes('knowledge'));
});

test('Rike-panelet forklarer hva som mangler for byen og for nye bosettinger', () => {
  const s = createGame(); addPeople(s, 'first', 3);
  assert.equal(realmVisible(s), false);
  s.milestones.dawn_civilization = 1;
  assert.equal(realmVisible(s), true);
  const m = selectRealm(s);
  assert.equal(m.stage, 'Regional sivilisasjon');
  assert.equal(m.next, 'Organisert sivilisasjon');
  assert.ok(m.city && m.city.some((c) => !c.ok && c.label), 'byens krav listes');
  assert.equal(m.expansion, null, 'utvidelse vises først når den er låst opp');
  assert.equal(m.settlements.length, 1);
  s.realm.autoFounding = true; s.realm.limit = 4;
  assert.ok(selectRealm(s).expansion.length >= 6);
});

test('Rike-panelet etter fullt spill: stadium, nettverk og verden', () => {
  const { s } = reached('first_world_civilization');
  const m = selectRealm(s);
  assert.equal(m.stage, 'Verdens første sivilisasjon');
  assert.equal(m.next, null);
  assert.equal(m.settlements.length, 4);
  assert.ok(m.network.routes >= 3 && m.network.caravans >= 6);
  assert.ok(m.world.regions.length >= 4 && m.world.outposts >= 2);
  assert.equal(m.city, null, 'byen er ferdig, ingen krav å vise');
  assert.equal(currentEpoch(s).stage, 'Verdens første sivilisasjon');
});

test('milepæler og meldinger: oversikten annonseres, og sluttmilepælen vises som en melding', () => {
  const { s } = reached('first_world_civilization');
  const list = reachedMilestones(s);
  assert.equal(list.at(-1).id, 'first_world_civilization');
  const realm = list.find((m) => m.id === 'connected_realm');
  assert.match(realm.opens, /verdensoversikten/);
  const p = classifyPresentation({ type: 'milestone', id: 'first_world_civilization', title: 'Verdens første sivilisasjon', text: 'x' });
  assert.equal(p.kicker, 'Milepæl');
  const card = insightCard(createGame(), UPGRADES.find((u) => u.id === 'sawmill_up'));
  assert.equal(card, null, 'ikke oppdaget ennå');
});
