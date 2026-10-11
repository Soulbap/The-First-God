// OPUS-12 · Det daglige livet. Mennesker har hjem, arbeidssted og et sted å møtes — ikke bare «bålet».
// Alt her er deterministisk (state.rng) og billig: ingen global stifinning, bare valg blant bosettingens egne bygg
// med plasser (kapasitet), slik at ingen samles i én klump. Modulen endrer HVOR folk er, aldri hvor mye de produserer.
import { BALANCE as B } from '../data/balance.js';
import { rand, range } from '../core/rng.js';
import { dayPhase, lightAt } from '../view/daylight.js';
import { isHome, housingOf, stageRank, settlementById } from './settlements.js';

// Tilstander der et menneske er knyttet til et sted (opptar en plass).
export const BOUND = new Set(['toFire', 'rest', 'toMaintain', 'maintain', 'wander', 'linger']);

// Plasser per stedstype. Ringplasser (bål, brønn, allmenning, park) ligger rundt stedet; faste bygg har plasser foran døren.
const KINDS = {
  fire: { cap: 5, ring: true }, hearth: { cap: 7, ring: true }, well: { cap: 3, ring: true }, sanctuary: { cap: 4, ring: true },
  commons: { cap: 8, ring: true }, park: { cap: 9, ring: true },
  market: { cap: 9 }, hall: { cap: 6 }, storage: { cap: 3 }, warehouse: { cap: 3 },
};
const WORK = new Set(['sawmill', 'mason', 'workshop', 'mine', 'coal_mine', 'smelter', 'watermill', 'windmill', 'steam_engine', 'metalworks', 'locomotive_workshop', 'rail_terminal', 'generator', 'oil_well', 'refinery', 'motor_depot', 'precision_works', 'electronics_works', 'aircraft_works', 'airfield', 'research_institute', 'telegraph', 'dock', 'boatyard', 'charcoal_kiln', 'field', 'combustion_engine']);
export const WORK_TYPES = WORK;
export const isWorkplace = (b) => WORK.has(b.type);
export const isGatheringPlace = (b) => !!KINDS[b.type];

const capOf = (b, state) => (isHome(b) ? Math.max(2, Math.min(4, Math.ceil(housingOf(b, state) / 2))) : isWorkplace(b) ? (b.type === 'field' ? 4 : 3) : KINDS[b.type]?.cap || 3);

// Mellomlager per tilstandsobjekt (ikke lagret): bygg etter bosetting, og belegg per steg.
const cache = new WeakMap();
function cacheOf(state) {
  let c = cache.get(state);
  if (!c) { c = { sig: '', byS: null, occT: -1, occ: null }; cache.set(state, c); }
  return c;
}
function placesBySettlement(state) {
  const c = cacheOf(state), sig = `${state.nextId}|${state.buildings.length}|${state.buildings.reduce((n, b) => n + (b.complete ? 1 : 0), 0)}`;
  if (c.sig === sig && c.byS) return c.byS;
  const byS = {};
  for (const b of state.buildings) {
    if (!b.complete) continue;
    const id = b.settlementId || 'first';
    (byS[id] ||= []).push(b);
  }
  c.sig = sig; c.byS = byS;
  return byS;
}
// Hvor mange som er knyttet til hvert sted akkurat nå, og hvilke plasser som er tatt. Beregnes én gang per simuleringssteg.
function occupancy(state) {
  const c = cacheOf(state);
  if (c.occT === state.time && c.occ) return c.occ;
  const occ = new Map();
  for (const h of state.humans) {
    if (h.destId == null || !BOUND.has(h.state)) continue;
    let e = occ.get(h.destId);
    if (!e) occ.set(h.destId, e = { n: 0, slots: new Set() });
    e.n++; e.slots.add(h.slot);
  }
  c.occT = state.time; c.occ = occ;
  return occ;
}
const occOf = (state, id) => occupancy(state).get(id) || { n: 0, slots: new Set() };

export const nightOf = (state) => lightAt(dayPhase(state.time)).night;
const litIds = (state) => state.industrial?.litSettlements || [];

// Bolig: hvert menneske får ett hjem i sin egen bosetting, og et hjem har bare så mange beboere som det har plass til (avledet, ikke lagret per hjem).
export function assignHome(state, h) {
  const homes = (placesBySettlement(state)[h.settlementId || 'first'] || []).filter(isHome);
  if (!homes.length) { h.homeId = null; return null; }
  const cur = homes.find((b) => b.id === h.homeId);
  if (cur) return cur;
  const counts = new Map();
  for (const q of state.humans) if (q.homeId != null && q.settlementId === h.settlementId) counts.set(q.homeId, (counts.get(q.homeId) || 0) + 1);
  // Det hjemmet med mest ledig plass i forhold til størrelsen; tie-break på id.
  let best = null, bestFree = -Infinity;
  for (const b of homes) {
    if (b.renovation) continue;
    const free = housingOf(b, state) - (counts.get(b.id) || 0);
    if (free > bestFree + 1e-9 || (Math.abs(free - bestFree) < 1e-9 && best && b.id < best.id)) { best = b; bestFree = free; }
  }
  h.homeId = best ? best.id : null;
  return best;
}

// Steder rundt bålet og i bygda får ulik tyngde ut fra bosettingens trinn, tid på døgnet og om det er strøm.
function weightOf(state, S, b, h, ctx, purpose) {
  const { rank, night, lit } = ctx, day = 1 - night;
  let w = 0;
  switch (b.type) {
    case 'fire': w = rank <= 2 ? 4 : 0.5 + night * (lit ? 0.3 : 1.2); break;
    case 'hearth': w = rank <= 3 ? 3.5 : 1.2 + night * (lit ? 0.5 : 2.2); break;
    case 'well': w = rank >= 2 ? 1.6 * (1 + (ctx.morning ? 1 : 0)) : 0.8; break;
    case 'market': w = rank >= 2 ? 3.6 * day + (lit ? 1.4 * night : 0.2) : 0.5; break;
    case 'hall': w = 2.2 * (1 - 0.5 * night); break;
    case 'commons': w = 3.2 + (lit ? 0.6 : 0.2) * night; break;
    case 'park': w = 2.8 * (1 - 0.5 * night) + (lit ? 1.2 * night : 0); break;
    case 'sanctuary': w = 1.1 + 0.8 * night; break;
    case 'storage': case 'warehouse': w = purpose === 'maintain' ? 1.2 : 0.3; break;
    default:
      if (isHome(b)) {
        const own = b.id === h.homeId;
        w = own ? 0.9 + night * 5.5 + (purpose === 'rest' ? 1.2 : 0) : 0.35 + night * 0.4;
        if (b.renovation) w *= 0.2;
      } else if (isWorkplace(b)) {
        // Arbeidsplasser trekker til seg folk på dagtid; aktive virksomheter mest. Eget arbeidssted foretrekkes.
        w = purpose === 'leisure' ? 0.4 * day : (b.active || b.type === 'field' ? 2.6 : 1.1) * day * (b.id === h.workId ? 2.2 : 1);
        if (night > 0.7 && !lit) w *= 0.2;
      }
  }
  if (w <= 0) return 0;
  // Fullt sted teller ikke; nesten fullt teller lite. Dette hindrer klumper.
  const cap = ctx.capMul * capOf(b, state), o = occOf(state, b.id);
  if (o.n >= cap) return 0;
  return w * (1 - o.n / cap) ** 1.5;
}

// Plassen en person står på: ring rundt åpne steder (spiral), rader foran døren på bygg. Deterministisk av id og plassnummer.
export function slotPoint(b, slot) {
  const ring = KINDS[b.type]?.ring;
  if (ring) {
    const a = slot * 2.399 + b.id * 0.7, r = b.radius * 0.5 + 9 + 5.5 * Math.sqrt(slot);
    return { x: b.x + Math.cos(a) * r, y: b.y + 2 + Math.sin(a) * r * 0.5 };
  }
  const col = slot % 4, row = Math.floor(slot / 4);
  return { x: b.x + (col - 1.5) * 11 + ((row % 2) ? 5 : 0), y: b.y + b.radius * 0.52 + 6 + row * 9 };
}
function freeSlot(state, b) {
  const used = occOf(state, b.id).slots;
  let k = 0;
  while (used.has(k)) k++;
  return k;
}

// Velger et sted for hvile, samling eller vedlikehold i menneskets egen bosetting. Returnerer {b, x, y} eller null.
// `purpose`: 'rest' (etter en leveranse), 'leisure' (ingen oppgave), 'maintain' (vedlikehold/handel/arbeid).
export function pickPlace(state, h, purpose, { festival = false } = {}) {
  const id = h.settlementId || 'first', S = settlementById(state, id);
  if (!S) return null;
  const places = placesBySettlement(state)[id] || [];
  if (!places.length) return null;
  const night = nightOf(state), ph = dayPhase(state.time);
  const ctx = { rank: stageRank(S.stage || 'Leir'), night, lit: litIds(state).includes(id), morning: ph > 0.25 && ph < 0.42, capMul: festival ? 3 : 1 };
  assignHome(state, h);
  const cand = [];
  let total = 0;
  for (const b of places) {
    if (!isGatheringPlace(b) && !isHome(b) && !isWorkplace(b)) continue;
    if (festival && b.type !== 'hearth' && b.type !== 'fire') continue;
    const w = weightOf(state, S, b, h, ctx, purpose);
    if (w > 0) { cand.push([b, w]); total += w; }
  }
  if (!cand.length) return null;
  let r = rand(state.rng) * total;
  let pick = cand[cand.length - 1][0];
  for (const [b, w] of cand) { r -= w; if (r <= 0) { pick = b; break; } }
  const slot = freeSlot(state, pick), p = slotPoint(pick, slot);
  if (isWorkplace(pick)) h.workId = pick.id;
  h.destId = pick.id; h.slot = slot;
  return { b: pick, x: p.x + range(state.rng, -1.5, 1.5), y: p.y + range(state.rng, -1, 1) };
}

export function releasePlace(h) { h.destId = null; h.slot = null; }

// Hvor lenge en samling varer (sekunder) etter hva det er: kort ved arbeidsplassen, lenger ved hjemmet om kvelden.
export function lingerSeconds(state, b) {
  const n = nightOf(state);
  if (isHome(b)) return range(state.rng, 6, 12) * (1 + n);
  if (isWorkplace(b)) return range(state.rng, 3, 6);
  return range(state.rng, 4, 9);
}

// Er et menneske «ledig» for oppdrag fra riket (følge, ekspedisjon)? Samlede og vandrende teller som ledige.
export const isFree = (h) => h.state === 'idle' || h.state === 'wander' || h.state === 'linger';

export const dailyStats = (state) => {
  const out = { homed: 0, working: 0, social: 0, total: state.humans.length };
  for (const h of state.humans) {
    if (h.homeId != null) out.homed++;
    if (h.workId != null) out.working++;
    if (BOUND.has(h.state) && h.destId != null) out.social++;
  }
  return out;
};
