// Automatisk tomtevalg og byggefremdrift. Spilleren plasserer aldri bygg selv.
import { BALANCE as B } from '../data/balance.js';
import { dist, inBounds, inPond } from './world.js';
import { spawnHumans } from './population.js';
import { stampWear } from './wear.js';
import { storyBuilt } from './story.js';
import { clearTrees } from './nature.js';

export function siteIsValid(state, type, x, y) {
  const r = B.building[type].radius;
  if (!inBounds(state, x, y, 70) || inPond(state, x, y, r + 14)) return false;
  if (type !== 'field' && dist(x, y, state.stockpile.x, state.stockpile.y) < r + 34) return false;
  // Tettere enn før (OPUS-02): 9 mellom boliger og verksteder gir smale smau; åkre trenger fortsatt luft.
  for (const b of state.buildings) if (dist(x, y, b.x, b.y) < r + b.radius + (type === 'field' || b.type === 'field' ? 14 : 9)) return false;
  for (const n of state.nodes) {
    const need = n.kind === 'tree' ? r + 22 : r + n.radius + 10;
    if (dist(x, y, n.x, n.y) < need) return false;
  }
  return true;
}

// Bosettingens soner (OPUS-01): menneskene velger fortsatt selv, men med en enkel «smak» som gir et lesbart sted —
// en tett kjerne rundt ildstedet, hjem i klynger, verksteder vendt mot råvaren og åkerland i utkanten.
const ZONE = {
  shelter: 'home', hut: 'home', townhouse: 'home',
  fire: 'core', hearth: 'core', storage: 'core', market: 'core', hall: 'core',
  sawmill: 'work', mason: 'work', workshop: 'work',
  field: 'field',
  well: 'core', warehouse: 'core', sanctuary: 'sanct',
};
export const zoneOf = (type) => ZONE[type] || 'core';

// Retning (enhetsvektor) mot tyngdepunktet av en ressurs rundt et punkt — verkstedene legger seg den veien.
function resourceDir(state, anchor, kind) {
  let sx = 0, sy = 0;
  for (const n of state.nodes) {
    if (n.kind !== kind || (kind === 'tree' && n.state !== 'alive')) continue;
    const dx = n.x - anchor.x, dy = n.y - anchor.y, d = Math.hypot(dx, dy);
    if (d < 40 || d > 900) continue;
    const w = 1 / (d + 120);
    sx += (dx / d) * w; sy += (dy / d) * w;
  }
  const l = Math.hypot(sx, sy);
  return l > 1e-9 ? { x: sx / l, y: sy / l } : null;
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
  if (zone === 'home') score += Math.min(3, homesNear) * 9 + Math.min(2, coreNear) * 4 - workNear * 7 - fieldsNear * 6 + streetBonus(ctx, x, y, anchor);
  else if (zone === 'core') score += coreNear * 5 - ring * 0.3; // torg og hall vil helt inn mot sentrum
  else if (zone === 'work') {
    const dir = ctx.dir;
    if (dir) score += (dx * dir.x + dy * dir.y) * 34;
    score += Math.min(2, workNear) * 10 - homesNear * 4;
  } else if (zone === 'field') {
    let trees = 0;
    for (const n of state.nodes) if (n.kind === 'tree' && n.state === 'alive' && Math.hypot(n.x - x, n.y - y) < 140) trees++;
    score += Math.min(3, fieldsNear) * 16 - homesNear * 8 - trees * 2 + Math.min(ring, 260) * 0.14;
  }
  return score;
}

// Deterministisk søk i ringer rundt leirens hjerte (bålet når det finnes). Blant gyldige tomter i de nærmeste
// ringene velges den som passer sonen best; ellers som før den første ledige.
export function findBuildSite(state, type, settlementId = 'first') {
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
  const ctx = { settlementId, rays: zone === 'home' ? streetRays(state, settlementId) : null, dir: type === 'sawmill' ? resourceDir(state, anchor, 'tree') : type === 'mason' ? resourceDir(state, anchor, 'rock') : null };
  const reach = zone === 'field' ? 150 : zone === 'work' ? 120 : 70; // hvor langt utover første ledige ring vi vurderer
  let best = null, firstRing = null;
  for (let ring = minRing; ring <= 520; ring += 10) {
    if (firstRing != null && ring > firstRing + reach) break;
    const steps = Math.max(12, Math.round(ring / 8));
    for (let k = 0; k < steps; k++) {
      const a = state.settlement.angleOffset + (k / steps) * Math.PI * 2;
      const x = anchor.x + Math.cos(a) * ring;
      const y = anchor.y + Math.sin(a) * ring * 0.72;
      if (!siteIsValid(state, type, x, y)) continue;
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
  if (B.production[type]) { b.cycle = 0; b.active = false; b.idle = null; b.made = 0; }
  state.buildings.push(b);
  if (settlementId !== 'first') clearTrees(state, b.x, b.y, def.radius + 52);
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
  if (b.onComplete && b.onComplete.spawnHumans) spawnHumans(state, b.onComplete.spawnHumans, { at: 'edge', building: b, settlementId: b.settlementId });
  if (b.onComplete?.regionalPopulation) state.region.nextPopulationAt = Math.min(state.region.nextPopulationAt, state.time + 5);
}

export function stepConstruction(state, dt) {
  for (const b of state.buildings) if (b.divine && !b.complete) addWork(state, b, dt);
}
