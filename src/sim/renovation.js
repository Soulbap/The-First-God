// OPUS-11 · Bygg som utvikler seg. Boliger får et trinn (tier) som følger bosettingens kunnskap, trinn og kraft:
//   1 halmhytte → 2 tømmerstue → 3 steinhus → 4 bygård (flere etasjer, industritid) → 5 moderne blokk (elektrisitet)
// (Telt/ly er trinn 0 og blir et minnested.) En ombygging er en ekte hendelse: den krever kunnskap, materialer fra lageret,
// arbeid og tid, og gir mer boligplass. Den er ikke en kosmetisk bytte: kostnaden trekkes ved start, byggingen pågår synlig
// (stillas), og ferdig bygg har et bestemt trinn som lagres og aldri bygges om uten at et høyere trinn er mulig.
// Hver bosetting ombygger ett hjem om gangen, minst utviklede først, aldri det utvalgte minnestedet.
import { BALANCE as B } from '../data/balance.js';
import { stageRank, isHome } from './settlements.js';

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
  if (rank >= R[4].rank && state.upgrades[R[4].upgrade] && state.industrial?.enabled) t = 4;
  if (rank >= R[5].rank && state.upgrades[R[5].upgrade] && litIds(state).includes(S.id)) t = 5;
  return t;
}

const homesOf = (state, id) => state.buildings.filter((b) => b.complete && isHome(b) && (b.settlementId || 'first') === id);
const affordable = (state, cost) => Object.entries(cost).every(([k, n]) => (state.resources[k] || 0) >= n + (B.urban.reserve[k] || 0));

// Det eldste hjemmet blir et bevart minnested når bosettingen er blitt en by: en gammel halmhytte som får stå (ikke ombygd, ikke glemt).
function preserveHeritage(state, S) {
  if (stageRank(S.stage || 'Leir') < stageRank('By') || S.id !== 'first') return;
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

// Returnerer true når en ny ombygging ble startet i dette steget.
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
        const to = active.renovation.to;
        active.tier = to; active.renovation = null; active.renovatedAt = state.time;
        if (to >= 2) active.renovated = true; // eldre kode og lagringer leser `renovated`
        growRadius(state, active, to);
        state.renovation.done = (state.renovation.done || 0) + 1;
        state.events.push({ type: 'renovated', id: active.id, buildingType: active.type, tier: to, x: active.x, y: active.y });
      }
      continue;
    }
    if (S.population.length < 2) continue;
    const cap = maxTierFor(state, S);
    const candidate = homes.filter((b) => !b.heritage && tierOf(b) >= 1 && tierOf(b) < cap).sort((a, b) => tierOf(a) - tierOf(b) || a.id - b.id)[0];
    if (!candidate) continue;
    const to = tierOf(candidate) + 1, spec = B.renovation.tiers[to];
    if (!affordable(state, spec.cost)) continue;
    for (const [k, n] of Object.entries(spec.cost)) state.resources[k] -= n;
    candidate.renovation = { to, left: spec.seconds, startedAt: state.time };
    state.events.push({ type: 'renovationStarted', id: candidate.id, tier: to, x: candidate.x, y: candidate.y });
    started = true;
  }
  return started;
}
