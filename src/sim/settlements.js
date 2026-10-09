// Bosettingers utviklingstrinn, roller og boligkapasitet. Rene spørringer på tilstanden — ingen sideeffekter.
// Trinn og roller oppstår av faktiske bygg, folk og forbindelser; ingen timere og ingen spillerordre.
import { BALANCE as B } from '../data/balance.js';

export const STAGES = ['Leir', 'Grend', 'Landsby', 'Voksende landsby', 'Tidlig by', 'By', 'Storby'];
export const stageRank = (stage) => STAGES.indexOf(stage);

export const HOME_TYPES = ['shelter', 'hut', 'townhouse'];
export const isHome = (b) => HOME_TYPES.includes(b.type);

const done = (state, id) => state.buildings.filter((b) => b.complete && b.settlementId === id);
export const hasBuilt = (state, id, type) => state.buildings.some((b) => b.complete && b.settlementId === id && b.type === type);
export const settlementById = (state, id) => state.settlements.find((s) => s.id === id);

export function housingOf(b, state) {
  const base = B.housing[b.type] || 0;
  return b.type === 'townhouse' ? base + (state.modifiers.townhouseBonus || 0) : base;
}

// Samlet boligkapasitet i en bosetting.
export function housingCapacity(state, id) {
  let n = 0;
  for (const b of done(state, id)) n += housingOf(b, state);
  return n;
}

export const completedHomesOf = (state, id) => done(state, id).filter(isHome);

export function fieldsCount(state) {
  return state.buildings.filter((b) => b.complete && b.type === 'field').length;
}

// Hvilke krav som mangler for å bli «By» — brukes både av trinnet og av panelet i Rike.
export function cityRequirements(state, S) {
  const C = B.city, id = S.id, bs = done(state, id);
  const infrastructure = bs.filter((b) => !isHome(b) && b.type !== 'fire').length;
  const reqs = [
    { id: 'people', label: 'Befolkning', have: S.population.length, need: C.minPopulation },
    { id: 'housing', label: 'Boliger med plass', have: housingCapacity(state, id), need: Math.max(C.minPopulation, S.population.length) },
    { id: 'townhouse', label: 'Bolighus', have: bs.filter((b) => b.type === 'townhouse').length, need: 1 },
    { id: 'food', label: 'Matforsyning (åkre og lager)', have: fieldsCount(state) >= C.minFields ? Math.floor(state.resources.food) : 0, need: C.minFoodStock },
    { id: 'infra', label: 'Infrastruktur', have: infrastructure, need: C.minInfrastructure },
    { id: 'sawmill', label: 'Sagbruk', have: hasBuilt(state, id, 'sawmill') ? 1 : 0, need: 1 },
    { id: 'mason', label: 'Steinhoggeri', have: hasBuilt(state, id, 'mason') ? 1 : 0, need: 1 },
    { id: 'market', label: 'Torg', have: hasBuilt(state, id, 'market') ? 1 : 0, need: 1 },
    { id: 'refined', label: 'Foredlede materialer', have: Math.min(state.totals.planks || 0, state.totals.cutstone || 0), need: 4 },
    { id: 'links', label: 'Fullførte leveranser', have: state.region?.completedDeliveries || 0, need: C.minDeliveries },
  ];
  return reqs.map((r) => ({ ...r, ok: r.have >= r.need }));
}

export function settlementStage(state, settlement) {
  const id = settlement.id;
  const homes = completedHomesOf(state, id).length;
  const infrastructure = done(state, id).filter((b) => !isHome(b) && b.type !== 'fire').length;
  const population = settlement.population.length;
  if (cityRequirements(state, settlement).every((r) => r.ok)) {
    if (hasBuilt(state, id, 'hall') && population >= C_STORBY_POP && state.upgrades.construction_methods) return 'Storby';
    return 'By';
  }
  if (population >= 8 && homes >= 3 && infrastructure >= 3 && state.civilization?.exchangeUnlocked) return 'Tidlig by';
  if (population >= 6 && homes >= 2 && infrastructure >= 2) return 'Voksende landsby';
  if (population >= 4 && homes >= 2 && infrastructure >= 1) return 'Landsby';
  if (population >= 2 && homes >= 1) return 'Grend';
  return 'Leir';
}
const C_STORBY_POP = 16;

// Rolle: avledet av bygg og lokale forhold, rangert fra mest spesialisert til minst.
export function settlementRole(state, settlement) {
  const id = settlement.id;
  if (hasBuilt(state, id, 'hall')) return 'Kunnskapssete';
  if (stageRank(settlementStage(state, settlement)) >= stageRank('By')) return 'Bysenter';
  if (hasBuilt(state, id, 'sawmill')) return 'Sagbruksbygd';
  if (hasBuilt(state, id, 'mason')) return 'Steinhoggerbygd';
  if (hasBuilt(state, id, 'field')) return 'Matbygda';
  if (hasBuilt(state, id, 'workshop')) return 'Håndverksbygd';
  const local = state.nodes.filter((n) => Math.hypot(n.x - settlement.x, n.y - settlement.y) < 300);
  return local.filter((n) => n.kind === 'tree').length >= local.filter((n) => n.kind === 'rock').length ? 'Skogbygd' : 'Steinbygd';
}

// Målbare følger av rollene. Alle multiplikatorer er 1 for «ingen effekt».
export const ROLE_EFFECTS = {
  Matbygda: { foodPerField: 1 },
  Skogbygd: { gatherWood: 1.25 },
  Steinbygd: { gatherStone: 1.25 },
  Sagbruksbygd: { craft: 1.25 },
  Steinhoggerbygd: { craft: 1.25 },
  Håndverksbygd: { knowledge: 1.15 },
  Bysenter: { growth: 0.8, knowledge: 1.25 },
  Kunnskapssete: { knowledge: 1.5, growth: 0.8 },
};
export const roleEffect = (role, key, fallback = 1) => ROLE_EFFECTS[role]?.[key] ?? fallback;

// Rollen mellomlagres på bosettingen (oppdateres jevnlig) så hyppige spørringer holder seg billige.
export function refreshRoles(state) {
  for (const s of state.settlements) { s.stage = settlementStage(state, s); s.role = settlementRole(state, s); }
}
export const cachedRole = (state, id) => settlementById(state, id)?.role || 'Skogbygd';

export const localCapacity = (state, id) => housingCapacity(state, id);
