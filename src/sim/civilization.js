// Tidlig sivilisasjon: få, synlige regler oppå den eksisterende regionale logistikkmodellen.
import { BALANCE as B } from '../data/balance.js';
import { spawnHumans } from './population.js';
import { completedHomesOf, housingCapacity, roleEffect } from './settlements.js';
import { storyFestival } from './story.js';
import { mechanicalFoodMultiplier } from './mechanical.js';
import { invAdd, invGet, invTake } from './inventory.js';

const fields = (state) => state.buildings.filter((b) => b.complete && b.type === 'field');

export const festivalActive = (state) => state.time < (state.civilization?.festivalUntil ?? -Infinity);

// Høstfest: når lagrene er fulle, samles folket ved ildstedet. Maten brukes, bønnene dobles. Ingen spillerhandling.
function stepFestival(state) {
  const C = state.civilization, F = B.festival;
  if (festivalActive(state) || state.time < C.nextFestivalAt) return;
  const hearth = state.buildings.find((b) => (b.type === 'hearth' || b.type === 'fire') && b.complete && (b.settlementId || 'first') === 'first');
  const cost = Math.round(F.base + state.humans.length * F.perPerson);
  if (!hearth || state.resources.food < F.minFood + cost) return;
  state.resources.food -= cost;
  C.festivalUntil = state.time + F.duration;
  C.nextFestivalAt = state.time + F.interval;
  C.festivals++;
  state.events.push({ type: 'festival', x: hearth.x, y: hearth.y, food: cost, n: C.festivals });
  storyFestival(state, C.festivals, { x: hearth.x, y: hearth.y });
}

export function stepCivilization(state) {
  const C = state.civilization;
  if (!C?.foodUnlocked) return;
  stepFestival(state);
  if (state.time >= C.nextFoodAt) {
    // OPUS-12: åkrene mater sin egen bosetting (maten havner i bosettingens lager, ikke i hovedstadens).
    const activeFields = fields(state);
    if (activeFields.length) {
      const made = {};
      for (const field of activeFields) {
        const id = field.settlementId || 'first', settlement = state.settlements.find((s) => s.id === id);
        made[id] = (made[id] || 0) + (B.human.foodPerHarvest + state.modifiers.foodBonus + roleEffect(settlement?.role, 'foodPerField', 0)) * mechanicalFoodMultiplier(state, id);
      }
      // Matlagrene har en grense (låver og kjellere): over den står åkeren hvilende og høsten går tapt. Dermed hoper ikke maten seg opp i det uendelige.
      for (const [id, n] of Object.entries(made)) {
        const S = state.settlements.find((q) => q.id === id), cap = B.human.foodStore.base + B.human.foodStore.perPerson * (S?.population.length || 0);
        const room = Math.max(0, cap - invGet(state, id, 'food')), got = Math.min(n, room);
        if (got > 0) { invAdd(state, id, 'food', got); state.totals.food += got; }
        made[id] = got;
      }
      C.foodHarvests++;
      for (const field of activeFields) state.events.push({ type: 'foodHarvest', x: field.x, y: field.y, amount: made[field.settlementId || 'first'] });
    }
    C.nextFoodAt = state.time + B.human.foodHarvestSeconds;
  }
  // OPUS-12: folk spiser. Hver bosetting bruker av sitt eget matlager; er det tomt, er bosettingen sulten (ingen vekst, og over tid flytter folk).
  if (state.time >= (C.nextEatAt ?? 0)) {
    const dtEat = B.human.eatSeconds;
    C.nextEatAt = state.time + dtEat;
    for (const S of state.settlements) {
      if (S.state !== 'active' || !S.population.length) continue;
      const want = S.population.length * B.human.foodPerPersonSecond * dtEat, ate = invTake(state, S.id, 'food', want);
      state.totals.foodEaten = (state.totals.foodEaten || 0) + ate;
      S.hungry = ate + 1e-9 < want ? (S.hungry || 0) + dtEat : 0;
    }
  }
  if (state.time < C.nextPopulationAt || !state.settlements.some((q) => invGet(state, q.id, 'food') >= B.human.foodForGrowth)) return;
  // Hver bosetting kan vokse med én innbygger per runde når den har ledig bolig og sin egen mat rekker.
  // Byer vokser litt raskere (rollen kan korte ned ventetiden), men aldri forbi boligkapasiteten.
  let interval = B.human.civilizationPopulationSeconds;
  for (const settlement of state.settlements) {
    if (invGet(state, settlement.id, 'food') < B.human.foodForGrowth) continue;
    if (settlement.population.length >= housingCapacity(state, settlement.id)) continue;
    const home = completedHomesOf(state, settlement.id)[0];
    if (!home) continue;
    invTake(state, settlement.id, 'food', B.human.foodForGrowth);
    spawnHumans(state, 1, { at: 'shelter', building: home, settlementId: settlement.id });
    state.events.push({ type: 'populationGrew', settlementId: settlement.id, x: settlement.x, y: settlement.y });
    interval = Math.min(interval, B.human.civilizationPopulationSeconds * roleEffect(settlement.role, 'growth'));
  }
  C.nextPopulationAt = state.time + interval;
}
