// OPUS-12 · Flytting mellom bosettinger. Mennesker flytter dit det finnes bolig og mat, bort fra trangboddhet og sult — én og én,
// til fots og bare mellom bosettinger med landforbindelse. Ingen oppstår eller forsvinner: en flytter blir i den gamle bosettingens
// folketall til ankomst, og ved ankomst flyttes id-en til den nye. Resultatet er bosettinger som vokser, stagnerer og tømmes ulikt.
import { BALANCE as B } from '../data/balance.js';
import { housingCapacity, settlementById } from './settlements.js';
import { invGet } from './inventory.js';
import { landLink } from './regional.js';

export const migrantsInFlight = (state) => state.humans.filter((h) => h.state === 'toMigrate');

// Hvor presset en bosetting er (høyere = flere ønsker å dra). Trangboddhet er fullt hus; sult er tomt matlager over tid.
function pressure(state, S) {
  const pop = S.population.length, cap = housingCapacity(state, S.id);
  // Fullt hus er ikke nok til å dra (det ga pendling mellom like fulle bosettinger): det må i tillegg mangle arbeid å gi flere.
  const crowded = pop >= cap && pop > 4 && (S.jobs ?? 99) - pop < 1 ? 1 + (pop - cap) * 0.5 : 0;
  const hungry = (S.hungry || 0) >= B.migration.hungerSeconds && pop > 4 ? 2 : 0;
  // Arbeidsløshet: flere folk enn arbeidsplasser (en tømt gruve, en felt skog) driver folk bort.
  const jobless = S.jobs != null && pop > S.jobs + B.migration.joblessMargin && pop > 4 ? 1.5 : 0;
  return crowded + hungry + jobless;
}
// Hvor attraktiv: ledig bolig og mat (en bosetting uten bolig eller mat tiltrekker ingen).
function pull(state, S) {
  const free = housingCapacity(state, S.id) - S.population.length - migrantsInFlight(state).filter((h) => h.migrateTo === S.id).length;
  const slack = (S.jobs ?? 99) - S.population.length;
  if (free < 1 || slack < 2 || invGet(state, S.id, 'food') < B.migration.minFoodToReceive || (S.hungry || 0) > 0) return 0;
  return free * 1 + Math.min(3, invGet(state, S.id, 'food') / 20) + Math.min(3, slack / 4);
}
const connected = (state, a, b) => landLink(state, a.id, b.id, B.migration.maxDistance) || (state.industrial?.rails || []).some((r) => (r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id));

// Kalles jevnlig fra byplanen. Starter høyst én flytting om gangen og høyst `maxInFlight` totalt.
export function stepMigration(state, dt) {
  const M = (state.migration ??= { done: 0, byRoute: {}, nextAt: 0 });
  if (state.time < M.nextAt) return false;
  M.nextAt = state.time + B.migration.checkSeconds;
  const active = state.settlements.filter((s) => s.state === 'active');
  if (active.length < 2 || migrantsInFlight(state).length >= B.migration.maxInFlight) return false;
  const donors = active.map((S) => ({ S, p: pressure(state, S) })).filter((x) => x.p > 0).sort((a, b) => b.p - a.p || a.S.id.localeCompare(b.S.id));
  for (const { S: from } of donors) {
    let best = null, bestPull = 0;
    for (const to of active) {
      if (to.id === from.id || !connected(state, from, to)) continue;
      const pl = pull(state, to);
      if (pl > bestPull + 1e-9) { best = to; bestPull = pl; }
    }
    if (!best) continue;
    // En som er ledig (ikke bærer, bygger eller er sendt ut) og har bodd en stund på stedet.
    const h = state.humans.filter((q) => q.settlementId === from.id && (q.state === 'idle' || q.state === 'wander' || q.state === 'linger') && !q.carry.amount && q.partyId == null && q.missionId == null && state.time - q.born > 120 && state.time - (q.movedAt ?? -Infinity) > B.migration.cooldown).sort((a, b) => a.id - b.id)[0];
    if (!h) continue;
    h.state = 'toMigrate'; h.migrateTo = best.id; h.targetId = null; h.destId = null; h.slot = null; h.waypoints = null; h.at = null;
    h.tx = best.x + ((h.id % 5) - 2) * 12; h.ty = best.y + 26 + (h.id % 3) * 6;
    state.events.push({ type: 'migrationStarted', from: from.id, to: best.id, x: h.x, y: h.y });
    return true;
  }
  return false;
}

// Ankomst: id-en flyttes fra den gamle bosettingens folk til den nye (folketallet totalt er uendret).
export function arriveMigrant(state, h) {
  const to = settlementById(state, h.migrateTo), from = settlementById(state, h.settlementId);
  h.migrateTo = null;
  if (!to || !from || to.state !== 'active') { h.state = 'idle'; h.timer = 0.5; return; }
  from.population = from.population.filter((id) => id !== h.id);
  if (!to.population.includes(h.id)) to.population.push(h.id);
  h.movedAt = state.time; h.settlementId = to.id; h.homeId = null; h.workId = null; h.deliveries = 0;
  const M = state.migration, key = `${from.id}>${to.id}`;
  M.done++; M.byRoute[key] = (M.byRoute[key] || 0) + 1;
  state.events.push({ type: 'migrated', from: from.id, to: to.id, x: h.x, y: h.y });
  h.state = 'idle'; h.timer = 0.6;
}
