// Tidlig sivilisasjon: få, synlige regler oppå den eksisterende regionale logistikkmodellen.
import { BALANCE as B } from '../data/balance.js';
import { spawnHumans } from './population.js';
import { settlementRole } from './regional.js';

const homes = (state, id) => state.buildings.filter((b) => b.complete && b.settlementId === id && (b.type === 'shelter' || b.type === 'hut'));
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
        const roleBonus = settlement && settlementRole(state, settlement) === 'Matbygda' ? 1 : 0;
        made += B.human.foodPerHarvest + roleBonus;
      }
      state.resources.food += made; state.totals.food += made; C.foodHarvests++;
      for (const field of activeFields) state.events.push({ type: 'foodHarvest', x: field.x, y: field.y, amount: made });
    }
    C.nextFoodAt = state.time + B.human.foodHarvestSeconds;
  }
  if (state.time < C.nextPopulationAt || state.resources.food < B.human.foodForGrowth) return;
  for (const settlement of state.settlements) {
    if (settlement.population.length >= homes(state, settlement.id).length * B.settlement.localHomeCapacity) continue;
    const home = homes(state, settlement.id)[0];
    if (!home) continue;
    state.resources.food -= B.human.foodForGrowth;
    spawnHumans(state, 1, { at: 'shelter', building: home, settlementId: settlement.id });
    state.events.push({ type: 'populationGrew', settlementId: settlement.id, x: settlement.x, y: settlement.y });
    break;
  }
  C.nextPopulationAt = state.time + B.human.civilizationPopulationSeconds;
}
