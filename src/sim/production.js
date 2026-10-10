// Foredling og kunnskap: bygg som arbeider av seg selv når bosettingen har folk til det.
// Sagbruk og steinhoggeri forvandler råvarer til planker og tilhugget stein; verksted, foredling og
// kunnskapshall gir kunnskap. Ingenting skjer uten et ferdig bygg, folk og (for foredling) råvarer.
import { BALANCE as B } from '../data/balance.js';
import { recordAuto } from './stats.js';
import { settlementById, roleEffect } from './settlements.js';
import { mechanicalMultiplier } from './mechanical.js';

const RECIPE_TYPES = ['sawmill', 'mason'];
export const recipeOf = (type) => (RECIPE_TYPES.includes(type) ? B.production[type] : null);

export function craftSpeed(state, S) {
  return (state.modifiers.craftSpeed || 1) * roleEffect(S?.role, 'craft');
}

export function knowledgeMultiplier(state, S) {
  return (state.modifiers.knowledge || 1) * roleEffect(S?.role, 'knowledge');
}

export function addKnowledge(state, amount, S) {
  const gain = amount * knowledgeMultiplier(state, S);
  state.resources.knowledge += gain;
  state.totals.knowledge += gain;
  recordAuto(state, 'knowledge', gain);
  return gain;
}

const staffed = (S) => !!S && S.population.length >= B.production.minPopulation;

function stepRecipe(state, b, S, dt) {
  const recipe = recipeOf(b.type);
  const inputs = Object.entries(recipe.inputs);
  const enough = inputs.every(([k, n]) => state.resources[k] >= n + recipe.reserve);
  const cap = recipe.cap * (state.buildings.some((q) => q.complete && q.type === 'market') ? B.production.marketCapMultiplier : 1)
    * (state.buildings.some((q) => q.complete && q.type === 'warehouse') ? B.production.warehouseCapMultiplier : 1);
  if (b.cycle <= 0 && Object.keys(recipe.outputs).every((k) => state.resources[k] >= cap)) { b.active = false; b.idle = 'fullt'; return; }
  if (!staffed(S)) { b.active = false; b.idle = 'folk'; return; }
  if (!enough && b.cycle <= 0) { b.active = false; b.idle = 'råvare'; return; }
  b.active = true; b.idle = null;
  // Bare lokale, virkende møller kan akselerere foredlingen. Uten kraft går
  // verkstedet videre for hånd, med vanlig tempo.
  b.cycle += dt * craftSpeed(state, S) * mechanicalMultiplier(state, S.id, b.type);
  if (b.cycle < recipe.seconds) return;
  // Sjekk igjen ved avslutning: aldri negativ beholdning, og råvaren trekkes først nå.
  if (!inputs.every(([k, n]) => state.resources[k] >= n)) { b.cycle = recipe.seconds; b.active = false; b.idle = 'råvare'; return; }
  b.cycle = 0;
  for (const [k, n] of inputs) state.resources[k] -= n;
  for (const [k, n] of Object.entries(recipe.outputs)) {
    state.resources[k] += n; state.totals[k] += n; recordAuto(state, k, n);
  }
  b.made++;
  addKnowledge(state, B.knowledge.perCycle, S);
  state.events.push({ type: 'processed', buildingType: b.type, id: b.id, x: b.x, y: b.y });
}

function stepPeriodic(state, b, S, dt, seconds, yieldFn) {
  if (!staffed(S)) { b.active = false; return; }
  b.active = true;
  b.cycle = (b.cycle || 0) + dt;
  if (b.cycle < seconds) return;
  b.cycle = 0;
  addKnowledge(state, yieldFn(), S);
  state.events.push({ type: 'studied', buildingType: b.type, id: b.id, x: b.x, y: b.y });
}

export function stepProduction(state, dt) {
  for (const b of state.buildings) {
    if (!b.complete) continue;
    const S = settlementById(state, b.settlementId || 'first');
    if (recipeOf(b.type)) stepRecipe(state, b, S, dt);
    else if (b.type === 'workshop') stepPeriodic(state, b, S, dt, B.knowledge.workshopSeconds, () => B.knowledge.workshopYield);
    else if (b.type === 'hall') stepPeriodic(state, b, S, dt, B.knowledge.hallSeconds, () => B.knowledge.hallYield * (1 + B.knowledge.hallPerPerson * Math.min(S.population.length, B.knowledge.hallPopCap)));
  }
}
