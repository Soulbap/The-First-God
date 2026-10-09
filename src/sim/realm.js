// Riket: autonom grunnleggelse av flere bosettinger, deterministisk tomtevalg og bosettingsidentitet.
// Spilleren velger aldri sted. Folk drar først når maten, overskuddet og materialene er der.
import { BALANCE as B } from '../data/balance.js';
import { dist, inPond } from './world.js';
import { startConstruction } from './construction.js';
import { planFor } from './regional.js';
import { settlementById } from './settlements.js';

const NAMES = { forest: 'Skogbrynet', stone: 'Steinvarden', farm: 'Åkerlia' };
const ORDINAL = ['second', 'third', 'fourth', 'fifth', 'sixth'];

const routeCrossesPond = (state, a, b) => {
  for (let t = 0.05; t < 1; t += 0.05) if (inPond(state, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 24)) return true;
  return false;
};

function classify(state, x, y) {
  let trees = 0, rocks = 0;
  for (const n of state.nodes) {
    const d = dist(x, y, n.x, n.y);
    if (n.kind === 'tree' && d < 270) trees++;
    else if (n.kind === 'rock' && d < 300) rocks++;
  }
  const kind = rocks >= 2 ? 'stone' : trees >= 9 ? 'forest' : 'farm';
  return { trees, rocks, kind };
}

// Deterministisk kandidatnett. Krav: tørt land, avstand til andre bosettinger, trygg vei (ikke gjennom
// tjernet), fritt byggeareal. Poengsum: ressurser i nærheten, vann, passelig avstand og at stedet
// gir bosettingen en rolle riket ennå mangler.
export function findSettlementSite(state, { ignore = [] } = {}) {
  const taken = state.settlements.filter((s) => !ignore.includes(s.id));
  const pending = state.realm.party?.site ? [state.realm.party.site] : [];
  const anchors = [...taken, ...pending];
  const have = new Set(taken.map((s) => s.kind).filter(Boolean));
  const P = state.world.pond, R = B.realm;
  let best = null;
  for (let y = 160; y <= state.world.height - 160; y += 70) for (let x = 160; x <= state.world.width - 160; x += 70) {
    if (inPond(state, x, y, 110)) continue;
    let nearest = Infinity, nearestS = null, ok = true;
    for (const a of anchors) {
      const d = dist(x, y, a.x, a.y);
      if (d < R.minSiteSpacing) { ok = false; break; }
      if (d < nearest) { nearest = d; nearestS = a; }
    }
    if (!ok || nearest < R.minSiteDistance || nearest > R.maxSiteDistance) continue;
    if (state.buildings.some((b) => dist(x, y, b.x, b.y) < 130)) continue;
    if (state.nodes.some((n) => dist(x, y, n.x, n.y) < 80)) continue; // fritt byggeareal
    if (routeCrossesPond(state, nearestS, { x, y })) continue;
    const c = classify(state, x, y);
    const water = dist(x, y, P.x, P.y) < 420 ? 12 : 0;
    const score = c.trees * 4 + c.rocks * 22 + water - Math.abs(nearest - 640) * 0.06 + (have.has(c.kind) ? 0 : 26) - y * 0.0005 - x * 0.0003;
    if (!best || score > best.score) best = { x, y, score, kind: c.kind, trees: c.trees, rocks: c.rocks };
  }
  return best;
}

const idleMembers = (state) => state.humans.filter((h) => h.settlementId === 'first' && (h.state === 'idle' || h.state === 'wander') && !h.carry.amount && !h.away && h.partyId == null);

// Tomtesøk er ikke gratis; resultatet gjenbrukes noen sekunder (panelet spør ofte, simuleringen sjelden).
function cachedSite(state) {
  const Rm = state.realm;
  if (!Rm.siteCache || state.time - Rm.siteCache.t > 10) Rm.siteCache = { t: state.time, site: findSettlementSite(state) };
  return Rm.siteCache.site;
}

// Hva mangler før neste bosetting kan grunnlegges? Brukes både av simuleringen og av Rike-panelet.
export function foundingReadiness(state) {
  const Rm = state.realm, R = B.realm, first = settlementById(state, 'first');
  const newest = state.settlements[state.settlements.length - 1];
  const checks = [
    { id: 'limit', label: 'Plass til flere bosettinger', ok: state.settlements.length < Rm.limit },
    { id: 'young', label: 'Forrige bosetting har begynt å vokse', ok: !newest || newest.id === 'first' || ((newest.projectsDone || 0) >= 2 && newest.state === 'active') },
    { id: 'cooldown', label: 'Roligere tid siden sist', ok: state.time - Rm.lastFoundedAt >= R.foundingCooldown },
    { id: 'food', label: 'Trygg matforsyning', ok: state.civilization.foodUnlocked && state.resources.food >= R.minFood && state.civilization.foodHarvests >= R.minFoodHarvests },
    { id: 'people', label: 'Befolkningsoverskudd', ok: first.population.length >= R.party + R.minCapitalSurplus + 2 },
    { id: 'materials', label: 'Byggematerialer til reisen', ok: state.resources.wood >= R.supplies.wood && state.resources.stone >= R.supplies.stone },
    { id: 'hands', label: 'Ledige hender', ok: idleMembers(state).length >= R.party },
    { id: 'idle', label: 'Ingen følge underveis', ok: !Rm.party },
    { id: 'site', label: 'Egnet sted i landskapet', ok: state.settlements.length >= Rm.limit || !!cachedSite(state) },
  ];
  return checks;
}

function launchParty(state) {
  const R = B.realm, Rm = state.realm;
  const site = findSettlementSite(state);
  if (!site) return false;
  const members = idleMembers(state).sort((a, b) => a.id - b.id).slice(0, R.party);
  if (members.length < R.party) return false;
  state.resources.wood -= R.supplies.wood; state.resources.stone -= R.supplies.stone;
  const party = { id: state.nextId++, site, members: members.map((m) => m.id), launchedAt: state.time };
  Rm.party = party;
  for (const m of members) { m.partyId = party.id; m.state = 'toSettle'; m.tx = site.x + (m.id % 3 - 1) * 14; m.ty = site.y + 10; m.waypoints = null; }
  state.events.push({ type: 'partyDeparted', x: site.x, y: site.y });
  return true;
}

export function stepRealm(state) {
  const Rm = state.realm;
  if (!Rm.autoFounding || state.time < Rm.nextCheckAt) return;
  Rm.nextCheckAt = state.time + B.realm.checkSeconds;
  if (foundingReadiness(state).every((c) => c.ok)) launchParty(state);
}

// Kalles når et medlem har ankommet. Bosettingen stiftes først når hele følget er på stedet.
export function partyArrive(state, h) {
  const party = state.realm.party;
  if (!party || party.id !== h.partyId) { h.partyId = null; return false; }
  h.state = 'settleWait'; h.timer = 1.6;
  return true;
}

export function partyTick(state, h, dt) {
  const party = state.realm.party;
  if (!party || party.id !== h.partyId) { h.partyId = null; h.state = 'idle'; h.timer = 0.5; return; }
  h.timer -= dt;
  if (h.timer > 0) return;
  const mem = party.members.map((id) => state.humans.find((q) => q.id === id));
  if (!mem.every((q) => q && q.state === 'settleWait')) { h.timer = 0.6; return; }
  foundSettlement(state, party, mem);
}

function foundSettlement(state, party, members) {
  const Rm = state.realm, site = party.site;
  const id = ORDINAL[state.settlements.length - 1] || `s${state.settlements.length + 1}`;
  const sameKind = state.settlements.filter((s) => s.kind === site.kind).length;
  const name = NAMES[site.kind] + (sameKind ? ' ' + 'I'.repeat(sameKind + 1) : '');
  const S = { id, name, x: site.x, y: site.y, state: 'founding', population: members.map((m) => m.id), kind: site.kind, plan: planFor(id, site.kind), projectsDone: 0, foundedAt: state.time, role: 'Skogbygd', stage: 'Leir' };
  state.settlements.push(S);
  const first = settlementById(state, 'first');
  first.population = first.population.filter((hid) => !S.population.includes(hid));
  for (const m of members) { m.settlementId = id; m.partyId = null; m.state = 'idle'; m.timer = 0.1; }
  Rm.party = null; Rm.lastFoundedAt = state.time; Rm.foundedCount++;
  startConstruction(state, 'hut', { source: `founding:${id}`, site, settlementId: id });
  state.events.push({ type: 'settlementFounded', id, name, x: site.x, y: site.y, kind: site.kind });
}
