// Automatisk tomtevalg og byggefremdrift. Spilleren plasserer aldri bygg selv.
import { BALANCE as B } from '../data/balance.js';
import { dist, inBounds, inPond } from './world.js';
import { spawnHumans } from './population.js';
import { stampWear } from './wear.js';

export function siteIsValid(state, type, x, y) {
  const r = B.building[type].radius;
  if (!inBounds(state, x, y, 70) || inPond(state, x, y, r + 14)) return false;
  if (type !== 'field' && dist(x, y, state.stockpile.x, state.stockpile.y) < r + 34) return false;
  for (const b of state.buildings) if (dist(x, y, b.x, b.y) < r + b.radius + 18) return false;
  for (const n of state.nodes) {
    const need = n.kind === 'tree' ? r + 22 : r + n.radius + 10;
    if (dist(x, y, n.x, n.y) < need) return false;
  }
  return true;
}

// Deterministisk søk i ringer rundt leirens hjerte (bålet når det finnes).
export function findBuildSite(state, type, settlementId = 'first') {
  const def = B.building[type];
  const home = state.settlements.find((s) => s.id === settlementId);
  const C = settlementId === 'first' || !home ? state.settlement.center : home;
  const fire = state.buildings.find((b) => b.type === 'fire' && (b.settlementId || 'first') === settlementId);
  const anchor = type === 'fire' || !fire ? C : fire;
  for (let ring = def.minRing; ring <= 520; ring += 10) {
    const steps = Math.max(12, Math.round(ring / 8));
    for (let k = 0; k < steps; k++) {
      const a = state.settlement.angleOffset + (k / steps) * Math.PI * 2;
      const x = anchor.x + Math.cos(a) * ring;
      const y = anchor.y + Math.sin(a) * ring * 0.72;
      if (siteIsValid(state, type, x, y)) return { x, y };
    }
  }
  return null;
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
