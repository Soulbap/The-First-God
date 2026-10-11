// OPUS-11/12C.2 · Ressurs- og arbeidbetalt boligfornyelse. Vanlig ombygging
// forbedrer et hus på stedet. Omstrukturering gjenoppfører ett ikke-vernet hus
// på en bedre gateparsell mens beboerne blir boende i det gamle til det nye er
// ferdig. Slik kan eldre, spredt geometri faktisk bli til en by over tid.
import { BALANCE as B } from '../data/balance.js';
import { stageRank, isHome, housingCapacity, housingOf } from './settlements.js';
import { landLink } from './regional.js';
import { planArchitecture } from './architecture.js';
import { siteIsValid } from './construction.js';
import { frontageSites, urbanFabric, urbanPerf } from './urban-fabric.js';
import { clearTrees } from './nature.js';
import { invAdd, invGet, invTake } from './inventory.js';

export const MAX_TIER = 5;

export function tierOf(b) {
  if (b.tier != null) return b.tier;
  if (b.type === 'townhouse') return 3;
  if (b.type === 'hut') return b.renovated ? 2 : 1;
  return 0;
}

const litIds = (state) => state.industrial?.litSettlements || [];

export function maxTierFor(state, S) {
  const rank = stageRank(S.stage || 'Leir'), R = B.renovation.requires;
  let t = 1;
  if (rank >= R[2].rank) t = 2;
  if (rank >= R[3].rank && state.upgrades[R[3].upgrade]) t = 3;
  const hauled = S.id === 'first' || (state.industrial?.roads && ((state.resources.truck || 0) >= 1 || (state.industrial.roadDeliveries || 0) > 0) && landLink(state, 'first', S.id, B.combustion.road.maxDistance))
    || (state.industrial?.rails || []).some((r) => r.a === S.id || r.b === S.id);
  if (rank >= R[4].rank && state.upgrades[R[4].upgrade] && state.industrial?.enabled && hauled) t = 4;
  if (rank >= R[5].rank && state.upgrades[R[5].upgrade] && litIds(state).includes(S.id)) t = 5;
  return t;
}

const homesOf = (state, id) => state.buildings.filter((b) => b.complete && isHome(b) && (b.settlementId || 'first') === id);
const affordable = (state, S, cost, reserve = true) => Object.entries(cost).every(([k, n]) => invGet(state, S.id, k) >= n + (S.id === 'first' && reserve ? B.urban.reserve[k] || 0 : 0));
const spend = (state, S, cost) => { for (const [k, n] of Object.entries(cost)) invTake(state, S.id, k, n); };
const CONSOLIDATION_COST = { wood: 26, stone: 24, planks: 5, cutstone: 6 };

function preservation(state, S) {
  if (S.id !== 'first') {
    if (stageRank(S.stage || 'Leir') < stageRank('Landsby') || state.buildings.some((b) => b.heritage && (b.settlementId || 'first') === S.id)) return;
  } else if (stageRank(S.stage || 'Leir') < stageRank('By') || state.buildings.some((b) => b.heritage && b.type === 'hut' && (b.settlementId || 'first') === S.id)) return;
  const first = homesOf(state, S.id).filter((b) => b.type === 'hut' && tierOf(b) === 1).sort((a, b) => a.id - b.id)[0];
  if (first) { first.heritage = true; state.events.push({ type: 'heritage', id: first.id, x: first.x, y: first.y }); }
}

function tierForCapacity(state, oldCapacity, cap) {
  for (let tier = 3; tier <= Math.max(3, cap); tier++) if (housingOf({ type: 'townhouse', tier }, state) >= oldCapacity) return tier;
  return null;
}

// To små nabohus kan bli én større gatebygning. Når gatenettet finnes velges
// en ekte fronttomt; eldre lagringer uten nett beholder den trygge midtpunktsregelen.
export function consolidationPlan(state, S) {
  if (stageRank(S.stage || 'Leir') < stageRank('By')) return null;
  const homes = homesOf(state, S.id).filter((b) => !b.heritage && tierOf(b) >= 1 && tierOf(b) <= 3 && !b.renovation).sort((a, b) => a.id - b.id);
  for (let i = 0; i < homes.length; i++) for (let j = i + 1; j < homes.length; j++) {
    const a = homes[i], b = homes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d > 132) continue;
    const oldCapacity = housingOf(a, state) + housingOf(b, state), to = tierForCapacity(state, oldCapacity, maxTierFor(state, S));
    if (!to) continue;
    const ignored = new Set([a.id, b.id]);
    const front = frontageSites(state, S, B.building.townhouse.radius).find((p) => siteIsValid(state, 'townhouse', p.x, p.y, S.id, ignored));
    const x = front?.x ?? (a.x + b.x) / 2, y = front?.y ?? (a.y + b.y) / 2;
    if (!siteIsValid(state, 'townhouse', x, y, S.id, ignored)) continue;
    return { a, b, x, y, oldCapacity, to, frontage: front?.frontage || null };
  }
  return null;
}

export function restructuringCost(to) {
  const base = B.renovation.restructuring.cost;
  const tier = B.renovation.tiers[to]?.cost || {};
  const out = { ...base };
  for (const [k, n] of Object.entries(tier)) out[k] = (out[k] || 0) + Math.ceil(n * 0.5);
  return out;
}

// Ren analysefunksjon brukt av både simulering, tester og rapportverktøy.
export function restructuringAnalysis(state, S) {
  const started = globalThis.performance?.now?.() || 0;
  const done = (result) => { urbanPerf.redevelopmentCalls++; urbanPerf.redevelopmentMs += (globalThis.performance?.now?.() || started) - started; return result; };
  const reasons = {};
  if (stageRank(S.stage || 'Leir') < stageRank('By')) return done({ plan: null, reasons: { immature: 1 }, eligible: 0 });
  const homes = homesOf(state, S.id), capacity = housingCapacity(state, S.id), pressure = S.population.length / Math.max(1, capacity);
  if (S.population.length < 12 || pressure < B.renovation.restructuring.minOccupancy) return done({ plan: null, reasons: { noDemand: 1 }, eligible: 0 });
  const cap = Math.max(3, maxTierFor(state, S)), fabric = urbanFabric(state, S), byId = new Map(fabric.fronts.map((f) => [f.id, f]));
  const candidates = homes.filter((b) => !b.heritage && !b.renovation && !b.restructured && tierOf(b) >= 1)
    .sort((a, b) => Math.hypot(b.x - fabric.center.x, b.y - fabric.center.y) - Math.hypot(a.x - fabric.center.x, a.y - fabric.center.y) || a.id - b.id);
  if (!candidates.length) return done({ plan: null, reasons: { noObsoleteParcel: 1 }, eligible: 0 });
  const sites = frontageSites(state, S, B.building.townhouse.radius), frontedHomes = homes.filter((b) => byId.get(b.id)?.frontage);
  if (!sites.length) return done({ plan: null, reasons: { noStreetParcel: candidates.length }, eligible: candidates.length });
  let best = null;
  for (const source of candidates) {
    const oldCapacity = housingOf(source, state), to = tierForCapacity(state, oldCapacity, cap);
    if (!to) { reasons.capacity = (reasons.capacity || 0) + 1; continue; }
    const oldNear = frontedHomes.filter((b) => b !== source && Math.hypot(b.x - source.x, b.y - source.y) <= 112).length;
    const oldDist = Math.hypot(source.x - fabric.center.x, source.y - fabric.center.y), ignored = new Set([source.id]);
    let validForSource = false;
    for (const site of sites) {
      // Omstrukturering skal være en lesbar flytting til en ny parsell, ikke en
      // nesten overlappende gjenoppføring som ser ut som vanlig oppgradering.
      if (Math.hypot(site.x - source.x, site.y - source.y) < 96 || !siteIsValid(state, 'townhouse', site.x, site.y, S.id, ignored)) continue;
      validForSource = true;
      const near = frontedHomes.filter((b) => b !== source && Math.hypot(b.x - site.x, b.y - site.y) <= 112).length;
      const targetDist = Math.hypot(site.x - fabric.center.x, site.y - fabric.center.y);
      // Et enslig «frontvendt» bygg er fortsatt ikke byvev. Første flytting kan
      // derfor etablere et anker; senere prosjekter får sterkere klyngegevinst.
      const accessGain = byId.get(source.id)?.frontage && oldNear > 0 ? 0 : 1;
      const score = (near - oldNear) * 42 + (oldDist - targetDist) * 0.18 + accessGain * 28;
      if (score < B.renovation.restructuring.minScore) continue;
      if (!best || score > best.score + 1e-9 || Math.abs(score - best.score) < 1e-9 && source.id < best.source.id) best = { source, x: site.x, y: site.y, frontage: site.frontage, to, oldCapacity, score, beforeDistance: oldDist, afterDistance: targetDist };
    }
    if (!validForSource) reasons.geometry = (reasons.geometry || 0) + 1;
  }
  if (!best && !Object.keys(reasons).length) reasons.noEfficiencyGain = candidates.length;
  return done({ plan: best, reasons, eligible: candidates.length });
}

function replacement(state, S, oldIds, spec, kind) {
  const old = state.buildings.filter((b) => oldIds.has(b.id));
  if (old.length !== oldIds.size) return null;
  const b = { id: state.nextId++, type: 'townhouse', x: spec.x, y: spec.y, radius: B.building.townhouse.radius, progress: 1, work: B.building.townhouse.work, workNeeded: B.building.townhouse.work, complete: true, divine: false, builders: [], startedAt: state.time, settlementId: S.id, tier: spec.to, frontage: spec.frontage, renovatedAt: state.time, restructured: kind === 'restructuring', redevelopedFrom: [...oldIds] };
  if (kind === 'consolidation') b.consolidatedFrom = [...oldIds];
  b.arch = planArchitecture(state, b, S, spec.to);
  state.buildings = state.buildings.filter((q) => !oldIds.has(q.id)); state.buildings.push(b);
  for (const h of state.humans) if (oldIds.has(h.homeId)) h.homeId = b.id;
  return b;
}

function finishConsolidation(state, S, active) {
  const r = active.renovation, oldIds = new Set([active.id, r.partnerId]);
  const b = replacement(state, S, oldIds, r, 'consolidation');
  if (!b) { active.renovation = null; return; }
  state.renovation.consolidated = (state.renovation.consolidated || 0) + 1;
  state.renovation.capacityGained = (state.renovation.capacityGained || 0) + Math.max(0, housingOf(b, state) - r.oldCapacity);
  state.events.push({ type: 'consolidated', id: b.id, from: [...oldIds], x: b.x, y: b.y, settlementId: S.id });
}

function finishRestructuring(state, S, active) {
  const r = active.renovation, oldIds = new Set([active.id]);
  const b = replacement(state, S, oldIds, r, 'restructuring');
  if (!b) { active.renovation = null; return; }
  for (const [k, n] of Object.entries(B.renovation.restructuring.salvage)) invAdd(state, S.id, k, n);
  const R = state.renovation;
  R.restructured = (R.restructured || 0) + 1; R.capacityGained = (R.capacityGained || 0) + Math.max(0, housingOf(b, state) - r.oldCapacity);
  R.landEfficiencyGain = (R.landEfficiencyGain || 0) + Math.max(0, r.beforeDistance - r.afterDistance);
  R.labor = (R.labor || 0) + (r.labor || 0);
  state.events.push({ type: 'restructured', id: b.id, from: active.id, x: b.x, y: b.y, settlementId: S.id });
}

function growRadius(state, b, tier) {
  const want = B.renovation.radius[tier] || b.radius;
  if (want <= b.radius) return;
  if (state.buildings.every((q) => q === b || Math.hypot(q.x - b.x, q.y - b.y) >= want + q.radius + 6)) b.radius = want;
}

export function beginRenovation(state, b, to) {
  b.renovation = { to, left: B.renovation.tiers[to].seconds, startedAt: state.time };
  state.events.push({ type: 'renovationStarted', id: b.id, tier: to, x: b.x, y: b.y });
}

function beginRestructuring(state, S, plan) {
  const cost = restructuringCost(plan.to); if (!affordable(state, S, cost)) return false;
  spend(state, S, cost); clearTrees(state, plan.x, plan.y, B.building.townhouse.radius + 42);
  plan.source.renovation = { kind: 'restructuring', to: plan.to, x: plan.x, y: plan.y, frontage: plan.frontage, oldCapacity: plan.oldCapacity, beforeDistance: plan.beforeDistance, afterDistance: plan.afterDistance, left: B.renovation.restructuring.seconds, startedAt: state.time, labor: 0 };
  const R = state.renovation; R.attempted = (R.attempted || 0) + 1;
  for (const [k, n] of Object.entries(cost)) R.materialsSpent[k] = (R.materialsSpent[k] || 0) + n;
  state.events.push({ type: 'restructuringStarted', id: plan.source.id, x: plan.x, y: plan.y, settlementId: S.id });
  return true;
}

export function stepRenovation(state, dt) {
  const R = state.renovation;
  R.rejected ??= {}; R.materialsSpent ??= {};
  let started = false;
  for (const S of state.settlements) {
    if (S.state !== 'active') continue;
    preservation(state, S);
    const homes = homesOf(state, S.id), active = homes.find((b) => b.renovation);
    if (active) {
      const workers = Math.min(2, Math.floor(S.population.length / 2));
      active.renovation.left -= dt * workers / 2;
      if (active.renovation.kind === 'restructuring') active.renovation.labor += dt * workers;
      if (active.renovation.left <= 0) {
        if (active.renovation.kind === 'consolidation') finishConsolidation(state, S, active);
        else if (active.renovation.kind === 'restructuring') finishRestructuring(state, S, active);
        else {
          const to = active.renovation.to; active.tier = to; active.renovation = null; active.renovatedAt = state.time;
          if (to >= 2) active.renovated = true;
          growRadius(state, active, to); if (to >= 3) active.arch = planArchitecture(state, active, S, to);
          R.done = (R.done || 0) + 1; state.events.push({ type: 'renovated', id: active.id, buildingType: active.type, tier: to, x: active.x, y: active.y });
        }
      }
      continue;
    }
    if (S.population.length < 2) continue;

    // Eksisterende, spredte tomter prioriteres i en moden og godt belagt by.
    const analysis = restructuringAnalysis(state, S);
    if (analysis.plan && beginRestructuring(state, S, analysis.plan)) { started = true; continue; }
    if (!analysis.plan && analysis.eligible) for (const [reason, n] of Object.entries(analysis.reasons)) R.rejected[reason] = (R.rejected[reason] || 0) + n;

    const consolidation = S.population.length >= housingCapacity(state, S.id) - 1 ? consolidationPlan(state, S) : null;
    if (consolidation && affordable(state, S, CONSOLIDATION_COST)) {
      spend(state, S, CONSOLIDATION_COST); clearTrees(state, consolidation.x, consolidation.y, B.building.townhouse.radius + 42);
      consolidation.a.renovation = { kind: 'consolidation', partnerId: consolidation.b.id, x: consolidation.x, y: consolidation.y, frontage: consolidation.frontage, to: consolidation.to, oldCapacity: consolidation.oldCapacity, left: 70, startedAt: state.time };
      state.events.push({ type: 'consolidationStarted', id: consolidation.a.id, partnerId: consolidation.b.id, x: consolidation.x, y: consolidation.y, settlementId: S.id }); started = true; continue;
    }

    const cap = maxTierFor(state, S), candidate = homes.filter((b) => !b.heritage && tierOf(b) >= 1 && tierOf(b) < cap).sort((a, b) => tierOf(a) - tierOf(b) || a.id - b.id)[0];
    if (!candidate) continue;
    const to = tierOf(candidate) + 1, spec = B.renovation.tiers[to];
    if (S.id === 'first') {
      if (!affordable(state, S, spec.cost)) continue;
      spend(state, S, spec.cost); beginRenovation(state, candidate, to); started = true; continue;
    }
    const regional = state.region;
    if (!regional?.enabled || regional.projects[S.id]) continue;
    S.stock ??= {};
    if (affordable(state, S, spec.cost, false)) { spend(state, S, spec.cost); beginRenovation(state, candidate, to); }
    else regional.projects[S.id] = { id: `renov:${candidate.id}:${to}`, type: 'renovation', cost: { ...spec.cost }, settlementId: S.id, renovation: { buildingId: candidate.id, to }, urban: true, startedAt: state.time };
    started = true;
  }
  return started;
}
