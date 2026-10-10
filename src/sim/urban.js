// OPUS-02 · Byvekst. Etter innsikten «Byplan» bygger folket selv videre når en bosetting har overskudd:
// brønner (møteplasser), bolighus (flere hjem → flere mennesker) og varehus (større lager for foredlede varer).
// Spilleren velger aldri tomt eller rekkefølge. Tomtevalget er det samme deterministiske søket som ellers
// (construction.js), og byggingen skjer med de vanlige byggerne — ingenting dukker opp uten at noen har arbeidet.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, findBuildSite } from './construction.js';
import { stageRank } from './settlements.js';

// Hver post: «mål» for antall bygg av typen per bosetting ved et gitt utviklingstrinn. Postene prøves i rekkefølge.
export const URBAN_PLAN = [
  { type: 'well', scope: 'all', targets: [['Landsby', 1], ['By', 2]], cost: { wood: 14, stone: 22 } },
  // Bygdene vokser også (mer enn fire folk): flere hytter etter hvert som bygda når nye trinn.
  { type: 'hut', scope: 'satellite', targets: [['Landsby', 3], ['Voksende landsby', 4], ['Tidlig by', 5]], cost: { wood: 20, stone: 12 } },
  { type: 'townhouse', scope: 'capital', targets: [['Tidlig by', 4], ['By', 6], ['Storby', 8]], cost: { wood: 40, stone: 30, planks: 8, cutstone: 4 } },
  { type: 'warehouse', scope: 'capital', targets: [['By', 1], ['Storby', 2]], cost: { wood: 60, stone: 40, planks: 10, cutstone: 4 } },
];

export const urbanTarget = (item, stage) => {
  let n = 0;
  for (const [st, t] of item.targets) if (stageRank(stage) >= stageRank(st)) n = t;
  return n;
};

const count = (state, id, type) => state.buildings.filter((b) => b.type === type && (b.settlementId || 'first') === id).length;
const affordable = (state, cost) => Object.entries(cost).every(([k, n]) => state.resources[k] >= n + (B.urban.reserve[k] || 0));

// Neste post denne bosettingen ville bygget (uavhengig av ressurser). Brukes av panelet og testene.
export function nextUrban(state, S) {
  for (const item of URBAN_PLAN) {
    if (item.scope === 'capital' && S.id !== 'first') continue;
    if (item.scope === 'satellite' && S.id === 'first') continue;
    if (count(state, S.id, item.type) < urbanTarget(item, S.stage)) return item;
  }
  return null;
}

export function stepUrban(state) {
  const U = state.urban;
  if (!U?.enabled || state.time < U.nextAt) return;
  U.nextAt = state.time + B.urban.checkSeconds;
  // Det første lyet blir et synlig minnested når byen faktisk har vokst fram;
  // det forsvinner ikke som historien, men leses heller ikke som et vanlig hjem.
  const capital = state.settlements.find((s) => s.id === 'first');
  if (capital && ['By', 'Storby'].includes(capital.stage)) {
    const shelter = state.buildings.find((b) => b.type === 'shelter' && b.complete);
    if (shelter && !shelter.heritage) { shelter.heritage = true; state.events.push({ type: 'heritage', id: shelter.id, x: shelter.x, y: shelter.y }); }
  }
  for (const S of state.settlements) {
    if (S.state !== 'active' || S.population.length < 2) continue;
    // Ett prosjekt om gangen i hver bosetting, og aldri mens noe annet ufullført står der.
    if (state.buildings.some((b) => !b.complete && (b.settlementId || 'first') === S.id)) continue;
    const item = nextUrban(state, S);
    if (!item || !affordable(state, item.cost) || !findBuildSite(state, item.type, S.id)) continue;
    for (const [k, n] of Object.entries(item.cost)) state.resources[k] -= n;
    startConstruction(state, item.type, { source: `urban:${item.type}`, settlementId: S.id });
    U.built = (U.built || 0) + 1;
    return; // maks ett nytt prosjekt per sjekk
  }
}
