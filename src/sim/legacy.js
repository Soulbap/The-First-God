// OPUS-01 · Ragnarok og arv. Ren logikk: tildeling av PrP, kjøp av ekko og hvordan de virker i en ny syklus.
// Metatilstanden (meta) eies av main.js og lagres separat; selve syklusen får bare en kopi av det som gjelder.
import { PRESTIGE, prestigeById, prestigeCost } from '../data/prestige.js';
import { civilizationStage } from './civstage.js';
import { BALANCE as B } from '../data/balance.js';

export const emptyMeta = () => ({ prestige: 0, cycles: 0, bonuses: {}, legacy: [] });

export const offeringPrp = (n) => Math.round(B.offering.prpScale * Math.sqrt(Math.max(0, n)));

// Prestige Points for syklusen som avsluttes. Belønner bare det som faktisk er bygget opp; ingenting trekkes fra.
export function ragnarokAward(state) {
  const homes = state.buildings.filter((b) => b.complete && (b.type === 'shelter' || b.type === 'hut' || b.type === 'townhouse')).length;
  const outposts = state.globe.regions.filter((r) => r.state === 'utpost' || r.state === 'etablert').length;
  const milestones = Object.keys(state.milestones).length;
  // Takkoffer: avtagende (kvadratrot) — de første stykkene betyr mest.
  const offerings = offeringPrp(state.buildings.filter((b) => b.complete && b.type === 'sanctuary').length);
  // Gjentatt passiv produksjon skal ha avtagende verdi. Utvikling, ikke venting, er den viktigste arven.
  const material = Math.floor(Math.sqrt(state.totals.wood + state.totals.stone) / 11);
  const prayer = Math.floor(Math.sqrt(state.totals.pp) / 4);
  const knowledge = Math.floor(Math.sqrt(state.totals.knowledge) / 3);
  return material + homes * 2 + prayer + knowledge + (state.settlements.length - 1) * 2 + outposts * 3 + milestones * 2 + offerings;
}

// Kort minne om syklusen (vises som minnestein ved tjernet i senere sykluser).
export function cycleMemory(state, n) {
  return { n, stage: civilizationStage(state).name, people: state.humans.length, settlements: state.settlements.length, minutes: Math.round(state.time / 60) };
}

export function canBuyPrestige(meta, id, budget = meta.prestige) {
  const def = prestigeById(id);
  if (!def) return false;
  const L = meta.bonuses[id] || 0;
  return L < def.max && budget >= prestigeCost(def, L);
}

// Kjøp ett nivå. Returnerer kostnaden (eller 0 når kjøpet ikke er mulig). `budget` lar Ragnarok-dialogen bruke
// PrP som tildeles ved bekreftelse; trekket gjøres fra meta.prestige og kan derfor midlertidig bli negativt
// til tildelingen legges til.
export function buyPrestige(meta, id, budget = meta.prestige) {
  if (!canBuyPrestige(meta, id, budget)) return 0;
  const def = prestigeById(id), L = meta.bonuses[id] || 0, cost = prestigeCost(def, L);
  meta.bonuses[id] = L + 1;
  meta.prestige -= cost;
  return cost;
}

// Ekkoene virker gjennom vanlige modifikatorer i den nye syklusen. Startverdenen (tre, stein, terreng) er uendret.
export function applyLegacy(state, meta) {
  if (!meta) return state;
  const m = state.modifiers;
  for (const def of PRESTIGE) {
    const L = meta.bonuses?.[def.id] || 0;
    if (L > 0) def.apply(m, L);
  }
  state.legacy = { cycles: meta.cycles || 0, stones: (meta.legacy || []).slice(-7), bonuses: { ...(meta.bonuses || {}) } };
  return state;
}
