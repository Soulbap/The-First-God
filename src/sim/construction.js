// Automatisk tomtevalg og byggefremdrift. Spilleren plasserer aldri bygg selv.
import { BALANCE as B } from '../data/balance.js';
import { dist, inBounds, inPond } from './world.js';
import { spawnHumans } from './population.js';
import { stampWear } from './wear.js';
import { storyBuilt } from './story.js';
import { clearTrees } from './nature.js';
import { stageRank } from './settlements.js';
import { streetSegments, distToStreet } from './streets.js';
import { planArchitecture } from './architecture.js';
import { railSegments } from './rails.js';
import { frontageOf, frontageSites } from './urban-fabric.js';

// Luft mellom bygg etter bosettingens trinn (OPUS-11): leirer og grender har rom mellom skur, stier og felles plasser;
// tettere by først når bosettingen er blitt en by. Gjelder bare bygg i samme bosetting; kollisjon er alltid forbudt.
const stageGap = (state, settlementId) => {
  const S = state.settlements.find((q) => q.id === settlementId);
  const rank = S ? stageRank(S.stage || 'Leir') : 0;
  return B.spacing.byStage[Math.max(0, Math.min(B.spacing.byStage.length - 1, rank))];
};

export function siteIsValid(state, type, x, y, settlementId = null, ignoreIds = null) {
  const r = B.building[type].radius;
  if (!inBounds(state, x, y, 70) || inPond(state, x, y, r + 14)) return false;
  if (type !== 'field' && dist(x, y, state.stockpile.x, state.stockpile.y) < r + 34) return false;
  // Kollisjon, arbeidsrom og visuell klarering er ulike ting. Små hus kan fortsatt danne gater,
  // mens verksteder og offentlige bygg trenger plass til aktivitet og inngang.
  const space = (t) => ({ field: 18, well: 24, market: 34, hall: 32, warehouse: 30, commons: 22, park: 26, sawmill: 28, mason: 28, sanctuary: 26 }[t] ?? 16);
  const sp = space(type), extra = settlementId ? stageGap(state, settlementId) : 0;
  for (const b of state.buildings) {
    if (ignoreIds?.has(b.id)) continue;
    const same = settlementId && (b.settlementId || 'first') === settlementId;
    const need = r + b.radius + Math.max(sp, space(b.type)) + (same ? extra : 0), dx = x - b.x, dy = y - b.y;
    if (dx * dx + dy * dy < need * need) return false;
  }
  for (const n of state.nodes) {
    const need = n.kind === 'tree' ? r + 22 : r + n.radius + 10, dx = x - n.x, dy = y - n.y;
    if (dx * dx + dy * dy < need * need) return false;
  }
  // OPUS-12: bygg står ikke på jernbanetraseen (sporet går mellom stasjonene og holdes åpent).
  if (type !== 'rail_terminal' && state.industrial?.rails?.length) {
    const lim = r * 0.6 + 12;
    for (const [ax, ay, bx, by] of railSegments(state)) {
      if (x < Math.min(ax, bx) - lim || x > Math.max(ax, bx) + lim || y < Math.min(ay, by) - lim || y > Math.max(ay, by) + lim) continue;
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2)) : 0;
      const dx = ax + vx * t - x, dy = ay + vy * t - y;
      if (dx * dx + dy * dy < lim * lim) return false;
    }
  }
  // OPUS-12: bygg står ved gaten, ikke oppå den. Eksisterende gater (bosettingens nett) holdes åpne.
  if (settlementId && type !== 'fire' && type !== 'well') {
    const segs = streetSegments(state, state.settlements.find((q) => q.id === settlementId));
    const lim = r * 0.55 + 4;
    for (let i = 0; i < segs.length; i++) {
      const sg = segs[i], ax = sg[0], ay = sg[1], bx = sg[2], by = sg[3];
      if (x < Math.min(ax, bx) - lim || x > Math.max(ax, bx) + lim || y < Math.min(ay, by) - lim || y > Math.max(ay, by) + lim) continue;
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
      const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2)) : 0;
      const dx = ax + vx * t - x, dy = ay + vy * t - y;
      if (dx * dx + dy * dy < lim * lim) return false;
    }
  }
  return true;
}

// Bosettingens soner (OPUS-01): menneskene velger fortsatt selv, men med en enkel «smak» som gir et lesbart sted —
// en tett kjerne rundt ildstedet, hjem i klynger, verksteder vendt mot råvaren og åkerland i utkanten.
const ZONE = {
  shelter: 'home', hut: 'home', townhouse: 'home',
  fire: 'core', hearth: 'core', storage: 'core', market: 'core', hall: 'core',
  sawmill: 'work', mason: 'work', workshop: 'work', mine: 'work', coal_mine: 'work', charcoal_kiln: 'work', smelter: 'work', dock: 'work', boatyard: 'work', watermill: 'work', windmill: 'work', steam_engine: 'work', metalworks: 'work', locomotive_workshop: 'work', rail_terminal: 'work', generator: 'work', grid_station: 'work', oil_well: 'work', refinery: 'work', combustion_engine: 'work', motor_depot: 'work', precision_works: 'work', aircraft_works: 'work', airfield: 'work', electronics_works: 'work', telegraph: 'work', research_institute: 'work',
  field: 'field',
  well: 'core', warehouse: 'core', sanctuary: 'sanct', commons: 'core', park: 'core',
};
export const zoneOf = (type) => ZONE[type] || 'core';

// Retning (enhetsvektor) mot tyngdepunktet av en ressurs rundt et punkt — verkstedene legger seg den veien.
function resourceDir(state, anchor, kind) {
  let sx = 0, sy = 0;
  for (const n of state.nodes) {
    if (n.kind !== kind || (kind === 'tree' && n.state !== 'alive')) continue;
    // Olje påvirker ikke plassering før petroleum er kjent (ellers endres tidligere spill).
    if (n.mineral === 'oil' && !state.industrial?.petroleum) continue;
    const dx = n.x - anchor.x, dy = n.y - anchor.y, d = Math.hypot(dx, dy);
    if (d < 40 || d > 900) continue;
    const w = 1 / (d + 120);
    sx += (dx / d) * w; sy += (dy / d) * w;
  }
  const l = Math.hypot(sx, sy);
  return l > 1e-9 ? { x: sx / l, y: sy / l } : null;
}

// Retning (enhetsvektor) fra et punkt mot den andre enden av bosettingens jernbane — stasjonen legges på den siden.
function partnerDir(state, settlementId, anchor) {
  const rail = (state.industrial?.rails || []).find((r) => r.a === settlementId || r.b === settlementId);
  const other = rail && state.settlements.find((q) => q.id === (rail.a === settlementId ? rail.b : rail.a));
  if (!other) return null;
  const dx = other.x - anchor.x, dy = other.y - anchor.y, l = Math.hypot(dx, dy);
  return l > 1 ? { x: dx / l, y: dy / l } : null;
}

// Gater følger de virkelige forbindelsene: retningene fra bosettingen mot de andre bosettingene den sender og
// mottar varer fra. Hus legger seg langs en slik stråle, ved siden av gaten (ikke oppå den).
export function streetRays(state, settlementId) {
  const me = settlementId === 'first' ? state.settlement.center : state.settlements.find((s) => s.id === settlementId);
  if (!me) return [];
  const rays = [];
  for (const s of state.settlements) {
    if (s.id === settlementId || s.state !== 'active') continue;
    const dx = s.x - me.x, dy = s.y - me.y, d = Math.hypot(dx, dy);
    if (d > 1) rays.push({ x: dx / d, y: dy / d });
  }
  return rays;
}
function streetBonus(ctx, x, y, anchor) {
  let best = 0;
  for (const r of ctx.rays || []) {
    const ax = x - anchor.x, ay = y - anchor.y;
    const along = ax * r.x + ay * r.y, perp = Math.abs(-ax * r.y + ay * r.x);
    if (along < 40) continue;
    const t = (perp - 46) / 16;
    best = Math.max(best, Math.exp(-t * t));
  }
  return best * 12;
}

function siteScore(state, type, x, y, ring, anchor, ctx) {
  const zone = zoneOf(type);
  let score = -ring * 0.12; // nærhet til hjertet
  let homesNear = 0, workNear = 0, fieldsNear = 0, coreNear = 0;
  for (const b of state.buildings) {
    if ((b.settlementId || 'first') !== ctx.settlementId) continue;
    const d = Math.hypot(b.x - x, b.y - y), z = zoneOf(b.type);
    if (d < 115 && z === 'home') homesNear++;
    if (d < 160 && z === 'work') workNear++;
    if (d < 150 && z === 'field') fieldsNear++;
    if (d < 120 && z === 'core') coreNear++;
  }
  const dx = (x - anchor.x) / (ring || 1), dy = (y - anchor.y) / (ring || 1);
  // OPUS-12: nærhet til en eksisterende gate gir inngang (hus med gateadgang, verksteder med fraktadgang).
  const dStreet = ctx.segs?.length ? distToStreet(ctx.segs, x, y) : Infinity;
  const frontage = dStreet < 14 ? 0 : dStreet < 46 ? 1 - (dStreet - 14) / 32 : 0;
  // I en by er inngang mot en eksisterende gate viktigere enn bare avstand til bålet.
  // Dette lar hus fylle lesbare fronter uten å gjøre tidlige bygder rutenettaktige.
  if (zone === 'home') score += Math.min(3, homesNear) * 10 + Math.min(2, coreNear) * 4 - workNear * 7 - fieldsNear * 6 + streetBonus(ctx, x, y, anchor) + frontage * 18;
  else if (zone === 'core') score += coreNear * 5 - ring * 0.3; // torg og hall vil helt inn mot sentrum
  else if (zone === 'work') {
    const dir = ctx.dir;
    if (dir) score += (dx * dir.x + dy * dir.y) * 34;
    score += Math.min(2, workNear) * 10 - homesNear * 4 + frontage * 6;
    for (const t of ctx.transport || []) if (Math.hypot(t.x - x, t.y - y) < 150) { score += 8; break; } // fraktadgang
  } else if (zone === 'field') {
    let trees = 0;
    for (const n of state.nodes) if (n.kind === 'tree' && n.state === 'alive' && Math.hypot(n.x - x, n.y - y) < 140) trees++;
    score += Math.min(3, fieldsNear) * 16 - homesNear * 8 - trees * 2 + Math.min(ring, 260) * 0.14;
  }
  return score;
}

// Deterministisk søk i ringer rundt leirens hjerte (bålet når det finnes). Blant gyldige tomter i de nærmeste
// ringene velges den som passer sonen best; ellers som før den første ledige.
// Mislykkede søk huskes så lenge verdens oppsett er uendret (bygg og noder legges bare til med nye id-er). Et nytt forsøk
// kommer enten når oppsettet endres eller etter en kort ventetid, og søker da bredere. Minnet ligger i `state.siteMisses`
// (lagres med spillet), fordi søkeradiusen avhenger av antall mislykkede forsøk: da gir lagre/lese nøyaktig samme forløp.
export const siteStats = { searches: 0, skipped: 0 };
const BASE_RING = 520, RING_STEP = 120, MAX_RING = 1000;

// Felles hukommelse for egne tomtesøk (mølle, brønn, kai …): `fn(attempts)` kalles med antall tidligere mislykkede forsøk
// (0 for et nytt oppsett), slik at søket kan utvide seg. Samme regler som findBuildSite: ren ytelse, ingen permanent oppgivelse.
export function memoSearch(state, key, fn, retry = 5) {
  const misses = (state.siteMisses ??= {}), m = misses[key];
  const sig = `${state.nextId}|${state.buildings.length}|${state.nodes.length}`;
  if (m && m.sig === sig && state.time < m.retryAt) { siteStats.skipped++; return null; }
  const attempts = m && m.sig === sig ? m.attempts : 0;
  siteStats.searches++;
  const r = fn(attempts);
  // Et vellykket søk etter utvidelse beholder radiusen så lenge oppsettet er uendret: da gir to kall etter hverandre (sjekk, så bygg)
  // samme tomt. Uten dette ville det andre kallet søke smalere og ikke finne tomten det første fant.
  if (r) { if (attempts) misses[key] = { sig, attempts, retryAt: 0 }; else delete misses[key]; }
  else misses[key] = { sig, attempts: attempts + 1, retryAt: state.time + retry * (attempts + 1) };
  return r;
}

export function findBuildSite(state, type, settlementId = 'first') {
  const misses = (state.siteMisses ??= {});
  const key = `${settlementId}|${type}`, m = misses[key];
  const sig = `${state.nextId}|${state.buildings.length}|${state.nodes.length}`;
  if (m && m.sig === sig && state.time < m.retryAt) { siteStats.skipped++; return null; }
  const attempts = m && m.sig === sig ? m.attempts : 0;
  siteStats.searches++;
  const site = searchBuildSite(state, type, settlementId, Math.min(MAX_RING, BASE_RING + RING_STEP * attempts));
  // Samme idempotens som i memoSearch: et funn etter utvidelse beholder radiusen til oppsettet endres.
  if (site) { if (attempts) misses[key] = { sig, attempts, retryAt: 0 }; else delete misses[key]; }
  else misses[key] = { sig, attempts: attempts + 1, retryAt: state.time + 3 * (attempts + 1) };
  return site;
}

function searchBuildSite(state, type, settlementId, maxRing) {
  const def = B.building[type];
  const home = state.settlements.find((s) => s.id === settlementId);
  const C = settlementId === 'first' || !home ? state.settlement.center : home;
  const fire = state.buildings.find((b) => b.type === 'fire' && (b.settlementId || 'first') === settlementId);
  let anchor = type === 'fire' || !fire ? C : fire;
  let minRing = def.minRing;
  if (type === 'sanctuary') {
    // Helligdommen vokser som en liten klynge for seg selv, et stykke fra torget: først et sted i utkanten, deretter rundt den første.
    const first = state.buildings.find((b) => b.type === 'sanctuary');
    if (first) { anchor = first; minRing = 46; }
    else { const a = state.settlement.angleOffset + 2.4; anchor = { x: C.x + Math.cos(a) * 250, y: C.y + Math.sin(a) * 180 }; minRing = 0; }
  }
  const zone = zoneOf(type);
  const Sx = state.settlements.find((q) => q.id === settlementId);
  const ctx = { settlementId, segs: streetSegments(state, Sx), transport: state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === settlementId && (b.type === 'rail_terminal' || b.type === 'motor_depot' || b.type === 'dock' || b.type === 'airfield')), rays: zone === 'home' ? streetRays(state, settlementId) : null, dir: type === 'rail_terminal' ? partnerDir(state, settlementId, anchor) : type === 'sawmill' ? resourceDir(state, anchor, 'tree') : type === 'mason' ? resourceDir(state, anchor, 'rock') : type === 'mine' ? resourceDir(state, anchor, 'mineral') : null };
  // Hvor langt utover første ledige ring vi vurderer. Verksteder med en råvareretning (sagbruk mot skog, steinhoggeri mot stein, gruve mot malm)
  // ser lenger, slik at de når kanten av en tett skog i stedet for å stoppe ved første ledige plass på feil side (OPUS-11).
  const reach = ctx.dir ? 280 : zone === 'field' ? 150 : zone === 'work' ? 120 : 70;
  let best = null, firstRing = null;
  // Fra «Tidlig by» velger boliger først reelle ledige fronttomter langs gater.
  // Ring-søket under er fortsatt reserve for leirer, nye bosettinger og utkanter.
  if (zone === 'home' && Sx && stageRank(Sx.stage || 'Leir') >= 4 && ctx.segs.length) {
    for (const candidate of frontageSites(state, Sx, def.radius)) {
      const { x, y } = candidate;
      if (!siteIsValid(state, type, x, y, settlementId)) continue;
      const ring = Math.hypot(x - anchor.x, y - anchor.y);
      if (ring > maxRing + 120) continue;
      const score = siteScore(state, type, x, y, ring, anchor, ctx) + 48;
      if (!best || score > best.score + 1e-9) best = { x, y, score, frontage: candidate.frontage };
    }
    if (best) return { x: best.x, y: best.y, frontage: best.frontage };
  }
  for (let ring = minRing; ring <= maxRing; ring += 10) {
    if (firstRing != null && ring > firstRing + reach) break;
    const steps = Math.max(12, Math.round(ring / 8));
    for (let k = 0; k < steps; k++) {
      const a = state.settlement.angleOffset + (k / steps) * Math.PI * 2;
      const x = anchor.x + Math.cos(a) * ring;
      const y = anchor.y + Math.sin(a) * ring * 0.72;
      if (!siteIsValid(state, type, x, y, settlementId)) continue;
      if (firstRing == null) firstRing = ring;
      const score = siteScore(state, type, x, y, ring, anchor, ctx);
      if (!best || score > best.score + 1e-9) best = { x, y, score };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

export function startConstruction(state, type, { onComplete = null, source = null, site: forcedSite = null, settlementId = 'first' } = {}) {
  const site = forcedSite || findBuildSite(state, type, settlementId);
  if (!site) return null;
  const def = B.building[type];
  const b = {
    id: state.nextId++, type, x: site.x, y: site.y, radius: def.radius,
    progress: 0, work: 0, workNeeded: def.work, complete: false, divine: !!def.divine,
    builders: [], onComplete, source, startedAt: state.time, settlementId,
  };
  const S = state.settlements.find((q) => q.id === settlementId);
  if (S && zoneOf(type) === 'home') {
    const front = forcedSite?.frontage ? { x: 0, y: 0, ...forcedSite.frontage } : frontageOf(state, S, b.x, b.y);
    if (front && front.distance == null || front?.distance < 58) b.frontage = { nx: front.nx, ny: front.ny, street: front.index };
  }
  if (B.production[type]) { b.cycle = 0; b.active = false; b.idle = null; b.made = 0; }
  state.buildings.push(b);
  // Også hovedstaden rydder tomter. Klareringen matcher tre-regelen og hindrer gjenvekst ved dør og gårdsrom.
  clearTrees(state, b.x, b.y, def.radius + 42);
  state.events.push({ type: 'constructionStarted', id: b.id, buildingType: type, x: b.x, y: b.y });
  return b;
}

export function addWork(state, b, amount) {
  if (b.complete) return;
  b.work = Math.min(b.workNeeded, b.work + amount);
  b.progress = b.work / b.workNeeded;
  if (b.work >= b.workNeeded) completeBuilding(state, b);
}

function completeBuilding(state, b) {
  b.complete = true;
  b.progress = 1;
  b.builders = [];
  stampWear(state, b.x, b.y + b.radius * 0.5, b.radius * 0.9, 0.35);
  state.events.push({ type: 'constructionComplete', id: b.id, buildingType: b.type, x: b.x, y: b.y });
  storyBuilt(state, b);
  if (b.source === 'founding') {
    state.expansion.founded = true;
    const settlement = state.settlements.find((s) => s.id === 'second');
    if (settlement) settlement.state = 'active';
    // Et beskjedent ildsted gjør den unge bosettingen lesbar uten en ny økonomikjede.
    const fire = { id: state.nextId++, type: 'fire', x: b.x - 34, y: b.y + 18, radius: B.building.fire.radius,
      progress: 1, work: B.building.fire.work, workNeeded: B.building.fire.work, complete: true, divine: false,
      builders: [], source: 'second_fire', startedAt: state.time, settlementId: 'second' };
    state.buildings.push(fire);
    stampWear(state, fire.x, fire.y, 16, 0.2);
  }
  if (typeof b.source === 'string' && b.source.startsWith('founding:')) {
    const S = state.settlements.find((q) => q.id === b.settlementId);
    if (S) S.state = 'active';
    const fire = { id: state.nextId++, type: 'fire', x: b.x - 34, y: b.y + 18, radius: B.building.fire.radius,
      progress: 1, work: B.building.fire.work, workNeeded: B.building.fire.work, complete: true, divine: false,
      builders: [], source: `${b.settlementId}_fire`, startedAt: state.time, settlementId: b.settlementId };
    state.buildings.push(fire);
    stampWear(state, fire.x, fire.y, 16, 0.2);
  }
  if (b.type === 'townhouse') { const S = state.settlements.find((q) => q.id === (b.settlementId || 'first')); if (S) b.arch = planArchitecture(state, b, S, 3); }
  if (b.onComplete && b.onComplete.spawnHumans) spawnHumans(state, b.onComplete.spawnHumans, { at: 'edge', building: b, settlementId: b.settlementId });
  if (b.onComplete?.regionalPopulation) state.region.nextPopulationAt = Math.min(state.region.nextPopulationAt, state.time + 5);
}

export function stepConstruction(state, dt) {
  for (const b of state.buildings) if (b.divine && !b.complete) addWork(state, b, dt);
}
