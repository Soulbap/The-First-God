// OPUS-08: elektrisk kraft som lokal kapasitet. Generatoren drives av damp- eller forbrenningskraft
// i sin egen bosetting (og dermed av kull eller drivstoff som faktisk brennes der). Nettstasjonen dekker
// bare den bosettingen. Strøm lagres ikke, overføres ikke mellom bosettinger og finnes ikke uten bygg.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, findBuildSite } from './construction.js';
import { chronicle } from './chronicle.js';

const E = B.electric;
const done = (s, type, id = 'first') => s.buildings.some((b) => b.complete && b.type === type && (b.settlementId || 'first') === id);
const pending = (s, type, id = 'first') => s.buildings.some((b) => !b.complete && b.type === type && (b.settlementId || 'first') === id);
const afford = (s, cost) => Object.entries(cost).every(([k, n]) => (s.resources[k] || 0) >= n);
const spend = (s, cost) => { for (const [k, n] of Object.entries(cost)) s.resources[k] -= n; };

// Mekanisk kraft i en bosetting: damp og forbrenning. Det som fabrikker, generatorer og raffinerier trenger.
export function mechanicalPowerAt(s, id = 'first') {
  return s.buildings
    .filter((b) => b.complete && (b.type === 'steam_engine' || b.type === 'combustion_engine') && (b.settlementId || 'first') === id)
    .reduce((n, b) => n + (b.availablePower || 0), 0);
}

// Bygger generator og nettstasjon autonomt når dampkraft finnes og materialene er tilgjengelige.
// Ingen lys eller maskiner tilføres uten at de faktiske bygge- og kraftkravene er oppfylt.
function buildElectricity(s) {
  if (!s.industrial.electric) return;
  if (done(s, 'steam_engine') && !done(s, 'generator') && !pending(s, 'generator') && afford(s, E.generator.cost)) {
    const site = findBuildSite(s, 'generator', 'first');
    if (site) { spend(s, E.generator.cost); startConstruction(s, 'generator', { source: 'power:generator', site, settlementId: 'first' }); }
  }
  if (done(s, 'generator') && !done(s, 'grid_station') && !pending(s, 'grid_station') && afford(s, E.grid.cost)) {
    const site = findBuildSite(s, 'grid_station', 'first');
    if (site) { spend(s, E.grid.cost); startConstruction(s, 'grid_station', { source: 'power:grid', site, settlementId: 'first' }); }
  }
}

// Kapasiteten per bosetting gjelder for ett simuleringssteg. Forbrukere trekker fra samme budsjett i fabrikkene.
export function stepPower(s, dt) {
  const I = s.industrial;
  buildElectricity(s);
  I.electricBudget = {};
  I.litSettlements = [];
  for (const S of s.settlements.filter((q) => q.state === 'active')) {
    const generator = s.buildings.some((b) => b.complete && b.type === 'generator' && (b.settlementId || 'first') === S.id);
    const grid = s.buildings.some((b) => b.complete && b.type === 'grid_station' && (b.settlementId || 'first') === S.id);
    if (!generator || !grid || mechanicalPowerAt(s, S.id) < E.generator.steamPower) continue;
    I.electricBudget[S.id] = E.generator.output * dt;
    I.litSettlements.push(S.id);
    I.generated += E.generator.output * dt;
  }
  if (I.litSettlements.length && !I.announcedElectric) {
    I.announcedElectric = true;
    const g = s.buildings.find((b) => b.complete && b.type === 'generator');
    chronicle(s, 'power:first-generator', 'work', 'Den første generatoren leverer elektrisk kraft.', g ? { x: g.x, y: g.y } : null);
  }
}

// Elektrisk kraft foretrekkes når bosettingens kapasitet for dette steget rekker (raskere drift). Ellers faller
// fabrikken tilbake til mekanisk kraft, som før OPUS-08. Kapasiteten trekkes bare når den faktisk brukes.
// Returnerer kilden, eller null når fabrikken mangler kraft.
export function factoryPower(s, S, recipe, dt) {
  const budget = s.industrial.electricBudget?.[S.id] || 0, need = (recipe.electric || 0) * dt;
  if (need > 0 && budget >= need) { s.industrial.electricBudget[S.id] = budget - need; return 'elektrisk'; }
  // Elektronikk har ingen mekanisk reserve: uten strøm står den stille.
  if (!recipe.electricOnly && mechanicalPowerAt(s, S.id) >= recipe.power) return 'mekanisk';
  return null;
}
