// Autonome mennesker. Enkel tilstandsmaskin:
// idle → (bygg | finn ressurs → gå → samle → bær til lager) → (hvil og be ved bålet) → idle
import { BALANCE as B } from '../data/balance.js';
import { rand, range } from '../core/rng.js';
import { treeAvailable, harvestTree, harvestRock } from './nature.js';
import { addWork } from './construction.js';
import { recordAuto } from './stats.js';
import { addWear } from './wear.js';
import { inBounds, inPond, dist } from './world.js';
import { startConstruction } from './construction.js';
import { beginDelivery, pickupDelivery, completeDelivery } from './regional.js';

const H = B.human;

export const carryCapacity = (state) => H.carry + state.modifiers.carry;
export const gatherInterval = (state) => H.gatherSeconds / state.modifiers.gatherSpeed;

const nodeById = (state, id) => state.nodes.find((n) => n.id === id);
const buildingById = (state, id) => state.buildings.find((b) => b.id === id);
const fireOf = (state) => state.buildings.find((b) => b.type === 'fire' && b.complete);
const hearthOf = (state) => state.buildings.find((b) => b.type === 'hearth' && b.complete);
const storeOf = (state) => state.buildings.find((b) => b.type === 'storage' && b.complete);
const deliveryPoint = (state) => storeOf(state) || state.stockpile;

export function nodeUsable(n) {
  if (n.kind === 'tree') return n.state === 'alive' && n.growth >= B.tree.harvestMinGrowthHuman && treeAvailable(n) > 0;
  return n.stone > 0;
}

const nodeHasRoom = (n, h) => n.reservedBy.includes(h.id) || n.reservedBy.length < (n.kind === 'tree' ? 1 : B.rock.maxGatherers);

function release(state, h) {
  if (h.targetId != null) {
    const n = nodeById(state, h.targetId);
    if (n) n.reservedBy = n.reservedBy.filter((id) => id !== h.id);
    const b = buildingById(state, h.targetId);
    if (b) b.builders = b.builders.filter((id) => id !== h.id);
  }
  h.targetId = null;
}

function moveTo(state, h, dt) {
  // En liten lokal styring: gå rundt tjernet og ikke gjennom et bygg. Dette er
  // bevisst ikke et eget pathfinding-system; den brukes bare når direkte kurs er blokkert.
  if (!h.waypoints?.length) {
    const p = state.world.pond;
    const crossesPond = (h.x - p.x) * (h.tx - p.x) < 0 && Math.abs((h.y + h.ty) / 2 - p.y) < p.ry + 36;
    if (crossesPond) h.waypoints = [{ x: p.x + (h.x < p.x ? -p.rx - 55 : p.rx + 55), y: p.y - p.ry - 45 }];
  }
  const goal = h.waypoints?.[0] || { x: h.tx, y: h.ty };
  const dx = goal.x - h.x, dy = goal.y - h.y;
  const d = Math.hypot(dx, dy);
  const stepLen = H.speed * h.look.pace * dt;
  if (Math.abs(dx) > 0.5) h.dir = dx > 0 ? 1 : -1;
  if (d <= stepLen) { h.x = goal.x; h.y = goal.y; if (h.waypoints?.length) { h.waypoints.shift(); return false; } return true; }
  h.x += (dx / d) * stepLen;
  h.y += (dy / d) * stepLen;
  h.walk += stepLen;
  const traffic = h.state === 'toStore' || h.state === 'toSite' || h.state === 'returning' || h.state === 'toDeliver' || h.state === 'toDeliveryPickup'
    ? B.wear.transportMultiplier : h.state === 'toExplore' ? B.wear.explorationMultiplier : 1;
  addWear(state, h.x, h.y, B.wear.perSecondWalking * traffic * dt);
  return false;
}

function chooseResourceKind(state) {
  // Holder et grovt forhold 3:2 mellom trevirke og stein, med litt menneskelig variasjon.
  const woodScore = state.resources.wood / 0.6, stoneScore = state.resources.stone / 0.4;
  let kind = woodScore <= stoneScore ? 'tree' : 'rock';
  if (rand(state.rng) < 0.25) kind = kind === 'tree' ? 'rock' : 'tree';
  return kind;
}

function findNode(state, h, kind) {
  let best = null, bestD = Infinity;
  for (const n of state.nodes) {
    if (n.kind !== kind || !nodeUsable(n) || !nodeHasRoom(n, h)) continue;
    const d = Math.hypot(n.x - h.x, n.y - h.y);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

function goIdle(state, h, [a, b] = [0.3, 0.9]) {
  h.state = 'idle';
  h.timer = range(state.rng, a, b);
}

function goStore(state, h) {
  const store = deliveryPoint(state);
  h.state = 'toStore';
  h.tx = store.x + range(state.rng, -14, 14);
  h.ty = store.y + (store.type === 'storage' ? store.radius * 0.52 : 10) + range(state.rng, 2, 12);
}

function completedHomes(state) {
  return state.buildings.filter((b) => b.complete && (b.type === 'shelter' || b.type === 'hut'));
}

function goMaintenance(state, h) {
  const homes = completedHomes(state);
  const choices = [deliveryPoint(state), ...homes, hearthOf(state) || fireOf(state)].filter(Boolean);
  if (!choices.length) return false;
  const target = choices[(h.id + h.deliveries) % choices.length];
  h.targetId = target.id || null;
  h.tx = target.x + range(state.rng, -target.radius * 0.45, target.radius * 0.45);
  h.ty = target.y + target.radius * 0.52 + range(state.rng, 3, 10);
  h.state = 'toMaintain';
  return true;
}

function explorationTarget(state) {
  const C = state.settlement.center;
  for (let tries = 0; tries < 10; tries++) {
    const a = range(state.rng, -Math.PI, Math.PI);
    const d = range(state.rng, 390, 610);
    const x = C.x + Math.cos(a) * d, y = C.y + Math.sin(a) * d * 0.72;
    const pond = state.world.pond;
    const dry = ((x - pond.x) / (pond.rx + 35)) ** 2 + ((y - pond.y) / (pond.ry + 35)) ** 2 >= 1;
    if (x > 90 && y > 90 && x < state.world.width - 90 && y < state.world.height - 90 && dry) return { x, y };
  }
  return { x: C.x + 420, y: C.y - 190 };
}

function settlementSite(state) {
  if (state.expansion.site) return state.expansion.site;
  const C = state.settlement.center;
  let best = null;
  // Fast kandidatnett + enkel egnethet: avstand, tørr lysning, lokale ressurser og fri plass.
  for (let y = 180; y < state.world.height - 180; y += 90) for (let x = 180; x < state.world.width - 180; x += 90) {
    const d = dist(x, y, C.x, C.y); if (d < 560 || d > 980 || inPond(state, x, y, 100)) continue;
    if (state.buildings.some((b) => dist(x, y, b.x, b.y) < 120)) continue;
    const near = state.nodes.filter((n) => dist(x, y, n.x, n.y) < 240).length;
    const crowded = state.nodes.filter((n) => dist(x, y, n.x, n.y) < 72).length;
    const score = near * 20 - crowded * 36 - Math.abs(d - 740) * 0.08 - y * 0.001;
    if (!best || score > best.score) best = { x, y, score };
  }
  state.expansion.site = best || { x: C.x + 700, y: C.y - 260 };
  return state.expansion.site;
}

function maybeExplore(state, h) {
  if (!state.modifiers.exploration || state.time < state.exploration.nextAt || state.exploration.activeId != null) return false;
  if (state.buildings.some((b) => !b.complete) || h.carry.amount) return false;
  const target = state.expansion.enabled && !state.expansion.discovered ? settlementSite(state) : explorationTarget(state);
  state.exploration.activeId = h.id;
  state.exploration.nextAt = state.time + B.human.explorationCooldown;
  h.exploreTarget = target;
  h.tx = target.x; h.ty = target.y; h.state = 'toExplore';
  return true;
}

function chooseTask(state, h) {
  if (state.expansion.founding && !state.expansion.founded && !state.expansion.founders.length && state.humans.length >= B.human.foundingParty) {
    const founders = state.humans.slice(0, B.human.foundingParty);
    state.expansion.founders = founders.map((q) => q.id);
    for (const q of founders) { q.state = 'toFound'; q.tx = settlementSite(state).x; q.ty = settlementSite(state).y; q.waypoints = null; }
    return;
  }
  if (h.settlementId === 'second' && state.expansion.founded && h.deliveries % 2 === 0) {
    const S = state.settlements.find((s) => s.id === 'second');
    h.tx = S.x + range(state.rng, -95, 95); h.ty = S.y + range(state.rng, -55, 65); h.state = 'wander'; return;
  }
  if (state.region?.enabled && beginDelivery(state, h)) return;
  // 1) Byggeplasser som trenger hender.
  const site = state.buildings.find((b) => !b.complete && !b.divine && b.builders.length < H.maxBuilders && (b.settlementId === h.settlementId || state.expansion.founders.includes(h.id)));
  if (site) {
    site.builders.push(h.id);
    h.targetId = site.id;
    const a = range(state.rng, 0.15, 0.85) * Math.PI;
    h.tx = site.x + Math.cos(a) * (site.radius + 5);
    h.ty = site.y + Math.sin(a) * (site.radius * 0.55 + 4);
    h.state = 'toSite';
    return;
  }
  if (maybeExplore(state, h)) return;
  // 2) Sanking.
  const kind = chooseResourceKind(state);
  const n = findNode(state, h, kind) || findNode(state, h, kind === 'tree' ? 'rock' : 'tree');
  if (n) {
    n.reservedBy.push(h.id);
    h.targetId = n.id;
    h.gatherKind = n.kind === 'tree' ? 'wood' : 'stone';
    const side = h.x < n.x ? -1 : 1;
    h.tx = n.x + side * (n.kind === 'tree' ? 9 : n.radius * 0.8 + 6);
    h.ty = n.y + 3;
    h.state = 'toNode';
    return;
  }
  // 3) Ingen gyldig oppgave: rusle litt i leiren og prøv igjen (ingen vranglås).
  const C = state.settlement.center;
  h.tx = C.x + range(state.rng, -90, 90);
  h.ty = C.y + range(state.rng, -40, 60);
  h.state = 'wander';
}

function deliver(state, h) {
  const { type, amount } = h.carry;
  if (type && amount > 0) {
    state.resources[type] += amount;
    state.totals[type] += amount;
    recordAuto(state, type, amount);
    const store = deliveryPoint(state);
    state.events.push({ type: 'gain', res: type, amount, x: store.x, y: store.y, manual: false });
    h.deliveries++;
  }
  h.carry = { type: null, amount: 0 };
  if (!state.buildings.some((b) => !b.complete) && hearthOf(state) && h.deliveries % 3 === 1 && goMaintenance(state, h)) return;
  const fire = hearthOf(state) || fireOf(state);
  const every = hearthOf(state) ? H.villageRestEveryDeliveries : H.restEveryDeliveries;
  if (fire && h.deliveries > 0 && h.deliveries % every === 0) {
    const a = (h.id * 2.399) % (Math.PI * 2);
    h.state = 'toFire';
    h.tx = fire.x + Math.cos(a) * 24;
    h.ty = fire.y + Math.sin(a) * 13 + 2;
  } else {
    goIdle(state, h, [0.2, 0.8]);
  }
}

function abandonTarget(state, h) {
  release(state, h);
  if (h.carry.amount > 0) goStore(state, h);
  else goIdle(state, h, [0.2, 0.6]);
}

export function stepHuman(state, h, dt) {
  switch (h.state) {
    case 'idle':
      h.timer -= dt;
      if (h.timer <= 0) chooseTask(state, h);
      break;
    case 'arriving':
    case 'wander':
      if (moveTo(state, h, dt)) goIdle(state, h, h.state === 'arriving' ? [0.4, 1.2] : H.idleSeconds);
      break;
    case 'toNode': {
      const n = nodeById(state, h.targetId);
      if (!n || !nodeUsable(n)) { abandonTarget(state, h); break; }
      if (moveTo(state, h, dt)) { h.state = 'gather'; h.timer = 0; }
      break;
    }
    case 'gather': {
      const n = nodeById(state, h.targetId);
      if (!n || !nodeUsable(n)) { abandonTarget(state, h); break; }
      h.dir = n.x > h.x ? 1 : -1;
      h.timer += dt;
      const interval = gatherInterval(state);
      if (h.timer >= interval) {
        h.timer -= interval;
        const got = n.kind === 'tree' ? harvestTree(state, n, 1) : harvestRock(state, n, 1);
        if (got > 0) {
          h.carry.type = h.gatherKind;
          h.carry.amount += got;
          state.events.push({ type: 'hit', nodeId: n.id, by: 'human', res: h.gatherKind, x: n.x, y: n.y });
        }
        if (h.carry.amount >= carryCapacity(state) || !nodeUsable(n)) { release(state, h); goStore(state, h); }
      }
      break;
    }
    case 'toStore':
      if (moveTo(state, h, dt)) deliver(state, h);
      break;
    case 'toDeliveryPickup':
      if (moveTo(state, h, dt)) pickupDelivery(state, h);
      break;
    case 'toDeliver':
      if (moveTo(state, h, dt)) { completeDelivery(state, h); goIdle(state, h, [0.3, 0.8]); }
      break;
    case 'toSite': {
      const b = buildingById(state, h.targetId);
      if (!b || b.complete) { release(state, h); goIdle(state, h); break; }
      if (moveTo(state, h, dt)) { h.state = 'build'; h.dir = b.x > h.x ? 1 : -1; }
      break;
    }
    case 'build': {
      const b = buildingById(state, h.targetId);
      if (!b || b.complete) { release(state, h); goIdle(state, h, [0.5, 1.2]); break; }
      h.anim += dt;
      addWork(state, b, dt * H.buildRate * state.modifiers.buildSpeed);
      break;
    }
    case 'toFire': {
      const fire = hearthOf(state) || fireOf(state);
      if (!fire) { goIdle(state, h); break; }
      if (moveTo(state, h, dt)) {
        h.state = 'rest';
        h.timer = range(state.rng, H.restSeconds[0], H.restSeconds[1]);
        h.dir = fire.x > h.x ? 1 : -1;
      }
      break;
    }
    case 'toMaintain':
      if (moveTo(state, h, dt)) { h.state = 'maintain'; h.timer = range(state.rng, B.human.maintenanceSeconds[0], B.human.maintenanceSeconds[1]); }
      break;
    case 'maintain':
      h.timer -= dt;
      if (h.timer <= 0) { release(state, h); goIdle(state, h, [0.3, 0.9]); }
      break;
    case 'toExplore':
      if (moveTo(state, h, dt)) { h.state = 'explore'; h.timer = range(state.rng, B.human.explorationSeconds[0], B.human.explorationSeconds[1]); }
      break;
    case 'explore':
      h.timer -= dt;
      if (h.timer <= 0) {
        if (state.expansion.enabled && !state.expansion.discovered) {
          state.expansion.discovered = true;
          const S = settlementSite(state);
          state.events.push({ type: 'siteDiscovered', x: S.x, y: S.y });
        }
        const C = state.settlement.center;
        h.tx = C.x + range(state.rng, -24, 24); h.ty = C.y + range(state.rng, 8, 34);
        h.state = 'returning';
      }
      break;
    case 'returning':
      if (moveTo(state, h, dt)) { state.exploration.activeId = null; h.exploreTarget = null; goIdle(state, h, [0.4, 1.1]); }
      break;
    case 'toFound':
      if (moveTo(state, h, dt)) {
        h.state = 'foundingWait'; h.timer = 2.2;
      }
      break;
    case 'foundingWait':
      h.timer -= dt;
      if (h.timer <= 0) {
        const allThere = state.expansion.founders.every((id) => ['foundingWait', 'toFound'].includes(state.humans.find((q) => q.id === id)?.state));
        if (allThere && !state.buildings.some((b) => b.source === 'founding')) {
          const S = settlementSite(state);
          state.settlements.push({ id: 'second', name: 'Lysningen', x: S.x, y: S.y, state: 'founding', population: [...state.expansion.founders] });
          for (const id of state.expansion.founders) { const q = state.humans.find((z) => z.id === id); q.settlementId = 'second'; q.state = 'idle'; q.timer = 0.1; }
          const first = state.settlements.find((s) => s.id === 'first');
          if (first) first.population = first.population.filter((id) => !state.expansion.founders.includes(id));
          startConstruction(state, 'hut', { source: 'founding', site: S, settlementId: 'second' });
        } else goIdle(state, h);
      }
      break;
    case 'rest':
      h.timer -= dt;
      if (h.timer <= 0) {
        state.resources.pp += H.prayerPP;
        state.totals.pp += H.prayerPP;
        state.events.push({ type: 'prayer', humanId: h.id, x: h.x, y: h.y });
        goIdle(state, h, [0.4, 1.0]);
      }
      break;
    default:
      goIdle(state, h);
  }
}

export function stepHumans(state, dt) {
  for (const h of state.humans) stepHuman(state, h, dt);
}
