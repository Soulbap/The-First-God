// OPUS-11 · Bygg som utvikler seg. Boliger får et trinn (tier) som følger bosettingens kunnskap, trinn og kraft:
//   1 halmhytte → 2 tømmerstue → 3 steinhus → 4 bygård (flere etasjer, industritid) → 5 moderne blokk (elektrisitet)
// (Telt/ly er trinn 0 og blir et minnested.) En ombygging er en ekte hendelse: den krever kunnskap, materialer fra lageret,
// arbeid og tid, og gir mer boligplass. Den er ikke en kosmetisk bytte: kostnaden trekkes ved start, byggingen pågår synlig
// (stillas), og ferdig bygg har et bestemt trinn som lagres og aldri bygges om uten at et høyere trinn er mulig.
// Hver bosetting ombygger ett hjem om gangen, minst utviklede først, aldri det utvalgte minnestedet.
import { BALANCE as B } from '../data/balance.js';
import { stageRank, isHome, housingCapacity, housingOf } from './settlements.js';
import { landLink } from './regional.js';
import { planArchitecture } from './architecture.js';
import { siteIsValid } from './construction.js';

export const MAX_TIER = 5;

// Trinnet til et bolighus. Eldre lagringer har bare `renovated` (tømmerstue) og `type` (bolighus = steinhus).
export function tierOf(b) {
  if (b.tier != null) return b.tier;
  if (b.type === 'townhouse') return 3;
  if (b.type === 'hut') return b.renovated ? 2 : 1;
  return 0;
}

const litIds = (state) => state.industrial?.litSettlements || [];

// Høyeste trinn en bosetting kan bygge om til nå: kunnskap, bosettingens trinn og (for det høyeste) strøm.
export function maxTierFor(state, S) {
  const rank = stageRank(S.stage || 'Leir'), R = B.renovation.requires;
  let t = 1;
  if (rank >= R[2].rank) t = 2;
  if (rank >= R[3].rank && state.upgrades[R[3].upgrade]) t = 3;
  // Bygård i en satellitt krever tunge materialer (tegl, hugget stein, jern) over land: først når lastebiler faktisk finnes (OPUS-11).
  const hauled = S.id === 'first' || (state.industrial?.roads && ((state.resources.truck || 0) >= 1 || (state.industrial.roadDeliveries || 0) > 0) && landLink(state, 'first', S.id, B.combustion.road.maxDistance))
    || (state.industrial?.rails || []).some((r) => r.a === S.id || r.b === S.id);
  if (rank >= R[4].rank && state.upgrades[R[4].upgrade] && state.industrial?.enabled && hauled) t = 4;
  if (rank >= R[5].rank && state.upgrades[R[5].upgrade] && litIds(state).includes(S.id)) t = 5;
  return t;
}

const homesOf = (state, id) => state.buildings.filter((b) => b.complete && isHome(b) && (b.settlementId || 'first') === id);
const affordable = (state, cost) => Object.entries(cost).every(([k, n]) => (state.resources[k] || 0) >= n + (B.urban.reserve[k] || 0));
const CONSOLIDATION_COST = { wood: 26, stone: 24, planks: 5, cutstone: 6 };

// To små, utdaterte boliger kan bli én ekte bytomt når det er boligpress. Dette er ikke riving for pynt:
// kapasiteten bevares eller øker, beboere flyttes til det nye huset, materialene betales og arbeidet tar tid.
export function consolidationPlan(state, S) {
  if (stageRank(S.stage || 'Leir') < 5) return null;
  // Vanlige, foreldede steinhus kan også erstattes. Minnesteder og nyere blokker
  // er fortsatt fredet; dette gjør ombygging mulig etter at hytter har blitt få.
  const homes = homesOf(state, S.id).filter((b) => !b.heritage && tierOf(b) >= 1 && tierOf(b) <= 3 && !b.renovation).sort((a, b) => a.id - b.id);
  for (let i = 0; i < homes.length; i++) for (let j = i + 1; j < homes.length; j++) {
    const a = homes[i], b = homes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d > 132) continue;
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, ignored = new Set([a.id, b.id]);
    if (!siteIsValid(state, 'townhouse', x, y, S.id, ignored)) continue;
    const oldCapacity = housingOf(a, state) + housingOf(b, state);
    if (housingOf({ type: 'townhouse', tier: 3 }, state) < oldCapacity) continue;
    return { a, b, x, y, oldCapacity };
  }
  return null;
}

function finishConsolidation(state, S, active) {
  const { partnerId, x, y } = active.renovation;
  const partner = state.buildings.find((b) => b.id === partnerId);
  if (!partner) { active.renovation = null; return; }
  const oldIds = new Set([active.id, partner.id]);
  const b = { id: state.nextId++, type: 'townhouse', x, y, radius: B.building.townhouse.radius, progress: 1, work: B.building.townhouse.work, workNeeded: B.building.townhouse.work, complete: true, divine: false, builders: [], startedAt: state.time, settlementId: S.id, tier: 3, consolidatedFrom: [...oldIds], renovatedAt: state.time };
  b.arch = planArchitecture(state, b, S, 3);
  state.buildings = state.buildings.filter((q) => !oldIds.has(q.id));
  state.buildings.push(b);
  for (const h of state.humans) if (oldIds.has(h.homeId)) h.homeId = b.id;
  state.renovation.consolidated = (state.renovation.consolidated || 0) + 1;
  state.events.push({ type: 'consolidated', id: b.id, from: [...oldIds], x, y, settlementId: S.id });
}

// Det eldste hjemmet blir et bevart minnested når bosettingen er blitt en by: en gammel halmhytte som får stå (ikke ombygd, ikke glemt).
function preserveHeritage(state, S) {
  // Satellitter bevarer også sitt første hus som minnested (flagges som landsby, før første ombygging) (OPUS-12).
  if (S.id !== 'first') {
    if (stageRank(S.stage || 'Leir') < stageRank('Landsby') || state.buildings.some((b) => b.heritage && (b.settlementId || 'first') === S.id)) return;
    const first = homesOf(state, S.id).filter((b) => b.type === 'hut' && tierOf(b) === 1).sort((a, b) => a.id - b.id)[0];
    if (first) { first.heritage = true; state.events.push({ type: 'heritage', id: first.id, x: first.x, y: first.y }); }
    return;
  }
  if (stageRank(S.stage || 'Leir') < stageRank('By')) return;
  if (state.buildings.some((b) => b.heritage && b.type === 'hut' && (b.settlementId || 'first') === S.id)) return;
  const old = homesOf(state, S.id).filter((b) => b.type === 'hut' && tierOf(b) === 1).sort((a, b) => a.id - b.id)[0];
  if (old) { old.heritage = true; state.events.push({ type: 'heritage', id: old.id, x: old.x, y: old.y }); }
}

// Radiusen vokser med trinnet bare når det er plass (ingen overlapp).
function growRadius(state, b, tier) {
  const want = B.renovation.radius[tier] || b.radius;
  if (want <= b.radius) return;
  const clear = state.buildings.every((q) => q === b || Math.hypot(q.x - b.x, q.y - b.y) >= want + q.radius + 6);
  if (clear) b.radius = want;
}

// Starter selve ombyggingen (materialene er allerede betalt). Brukes av hovedstaden direkte og av regionale prosjekter i satellitter.
export function beginRenovation(state, b, to) {
  b.renovation = { to, left: B.renovation.tiers[to].seconds, startedAt: state.time };
  state.events.push({ type: 'renovationStarted', id: b.id, tier: to, x: b.x, y: b.y });
}

// Returnerer true når en ny ombygging ble startet (eller bestilt) i dette steget.
export function stepRenovation(state, dt) {
  let started = false;
  for (const S of state.settlements) {
    if (S.state !== 'active') continue;
    preserveHeritage(state, S);
    const homes = homesOf(state, S.id);
    const active = homes.find((b) => b.renovation);
    if (active) {
      // Arbeidet går bare når det er folk i bosettingen som kan gjøre det (minst to), og tar mer tid i små bygder.
      const workers = Math.min(2, Math.floor(S.population.length / 2));
      active.renovation.left -= dt * workers / 2;
      if (active.renovation.left <= 0) {
        if (active.renovation.kind === 'consolidation') { finishConsolidation(state, S, active); continue; }
        const to = active.renovation.to;
        active.tier = to; active.renovation = null; active.renovatedAt = state.time;
        if (to >= 2) active.renovated = true; // eldre kode og lagringer leser `renovated`
        growRadius(state, active, to);
        if (to >= 3) active.arch = planArchitecture(state, active, S, to); // byggeplan: etasjer, tak, fasade (OPUS-12)
        state.renovation.done = (state.renovation.done || 0) + 1;
        state.events.push({ type: 'renovated', id: active.id, buildingType: active.type, tier: to, x: active.x, y: active.y });
      }
      continue;
    }
    if (S.population.length < 2) continue;
    // Sentrumstomter konsolideres bare når byen faktisk mangler boligplass. Ett prosjekt per bosetting,
    // og vernede/memoriale hjem er aldri kandidater.
    const plan = S.population.length >= housingCapacity(state, S.id) - 1 ? consolidationPlan(state, S) : null;
    if (plan) {
      if (S.id === 'first') {
        if (!affordable(state, CONSOLIDATION_COST)) continue;
        for (const [k, n] of Object.entries(CONSOLIDATION_COST)) state.resources[k] -= n;
      } else {
        S.stock ??= {};
        if (!Object.entries(CONSOLIDATION_COST).every(([k, n]) => (S.stock[k] || 0) >= n)) continue;
        for (const [k, n] of Object.entries(CONSOLIDATION_COST)) S.stock[k] -= n;
      }
      plan.a.renovation = { kind: 'consolidation', partnerId: plan.b.id, x: plan.x, y: plan.y, left: 70, startedAt: state.time };
      state.events.push({ type: 'consolidationStarted', id: plan.a.id, partnerId: plan.b.id, x: plan.x, y: plan.y, settlementId: S.id });
      started = true;
      continue;
    }
    const cap = maxTierFor(state, S);
    const candidate = homes.filter((b) => !b.heritage && tierOf(b) >= 1 && tierOf(b) < cap).sort((a, b) => tierOf(a) - tierOf(b) || a.id - b.id)[0];
    if (!candidate) continue;
    const to = tierOf(candidate) + 1, spec = B.renovation.tiers[to];
    if (S.id === 'first') {
      if (!affordable(state, spec.cost)) continue;
      for (const [k, n] of Object.entries(spec.cost)) state.resources[k] -= n;
      beginRenovation(state, candidate, to);
      started = true;
      continue;
    }
    // En satellitt bruker bare sitt eget lager (OPUS-11): mangler det materialer, bestilles de som et regionalt prosjekt som bærere
    // eller lastebil leverer, og ombyggingen starter når lageret har alt.
    const R = state.region;
    if (!R?.enabled || R.projects[S.id]) continue;
    S.stock ??= {};
    if (Object.entries(spec.cost).every(([k, n]) => (S.stock[k] || 0) >= n)) {
      for (const [k, n] of Object.entries(spec.cost)) S.stock[k] -= n;
      beginRenovation(state, candidate, to);
    } else {
      R.projects[S.id] = { id: `renov:${candidate.id}:${to}`, type: 'renovation', cost: { ...spec.cost }, settlementId: S.id, renovation: { buildingId: candidate.id, to }, urban: true, startedAt: state.time };
    }
    started = true;
  }
  return started;
}
