// Tidlig sivilisasjon: få, synlige regler oppå den eksisterende regionale logistikkmodellen.
import { BALANCE as B } from '../data/balance.js';
import { spawnHumans } from './population.js';
import { completedHomesOf, housingCapacity, roleEffect } from './settlements.js';

const fields = (state) => state.buildings.filter((b) => b.complete && b.type === 'field');

export function stepCivilization(state) {
  const C = state.civilization;
  if (!C?.foodUnlocked) return;
  if (state.time >= C.nextFoodAt) {
    const activeFields = fields(state);
    if (activeFields.length) {
      let made = 0;
      for (const field of activeFields) {
        const settlement = state.settlements.find((s) => s.id === field.settlementId);
        made += B.human.foodPerHarvest + state.modifiers.foodBonus + roleEffect(settlement?.role, 'foodPerField', 0);
      }
      state.resources.food += made; state.totals.food += made; C.foodHarvests++;
      for (const field of activeFields) state.events.push({ type: 'foodHarvest', x: field.x, y: field.y, amount: made });
    }
    C.nextFoodAt = state.time + B.human.foodHarvestSeconds;
  }
  if (state.time < C.nextPopulationAt || state.resources.food < B.human.foodForGrowth) return;
  // Hver bosetting kan vokse med én innbygger per runde når den har ledig bolig og maten rekker.
  // Byer vokser litt raskere (rollen kan korte ned ventetiden), men aldri forbi boligkapasiteten.
  let interval = B.human.civilizationPopulationSeconds;
  for (const settlement of state.settlements) {
    if (state.resources.food < B.human.foodForGrowth) break;
    if (settlement.population.length >= housingCapacity(state, settlement.id)) continue;
    const home = completedHomesOf(state, settlement.id)[0];
    if (!home) continue;
    state.resources.food -= B.human.foodForGrowth;
    spawnHumans(state, 1, { at: 'shelter', building: home, settlementId: settlement.id });
    state.events.push({ type: 'populationGrew', settlementId: settlement.id, x: settlement.x, y: settlement.y });
    interval = Math.min(interval, B.human.civilizationPopulationSeconds * roleEffect(settlement.role, 'growth'));
  }
  C.nextPopulationAt = state.time + interval;
}
