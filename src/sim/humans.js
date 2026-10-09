// Autonome mennesker. Enkel tilstandsmaskin:
// idle → (bygg | finn ressurs → gå → samle → bær til lager) → (hvil og be ved bålet) → idle
import { BALANCE as B } from '../data/balance.js';
import { rand, range } from '../core/rng.js';
import { treeAvailable, harvestTree, harvestRock } from './nature.js';
import { addWork } from './construction.js';
import { recordAuto } from './stats.js';
import { addWear } from './wear.js';

const H = B.human;

export const carryCapacity = (state) => H.carry + state.modifiers.carry;
export const gatherInterval = (state) => H.gatherSeconds / state.modifiers.gatherSpeed;

const nodeById = (state, id) => state.nodes.find((n) => n.id === id);
const buildingById = (state, id) => state.buildings.find((b) => b.id === id);
const fireOf = (state) => state.buildings.find((b) => b.type === 'fire' && b.complete);

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
  const dx = h.tx - h.x, dy = h.ty - h.y;
  const d = Math.hypot(dx, dy);
  const stepLen = H.speed * h.look.pace * dt;
  if (Math.abs(dx) > 0.5) h.dir = dx > 0 ? 1 : -1;
  if (d <= stepLen) { h.x = h.tx; h.y = h.ty; return true; }
  h.x += (dx / d) * stepLen;
  h.y += (dy / d) * stepLen;
  h.walk += stepLen;
  addWear(state, h.x, h.y, B.wear.perSecondWalking * dt);
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
  h.state = 'toStore';
  h.tx = state.stockpile.x + range(state.rng, -14, 14);
  h.ty = state.stockpile.y + range(state.rng, 8, 14);
}

function chooseTask(state, h) {
  // 1) Byggeplasser som trenger hender.
  const site = state.buildings.find((b) => !b.complete && !b.divine && b.builders.length < H.maxBuilders);
  if (site) {
    site.builders.push(h.id);
    h.targetId = site.id;
    const a = range(state.rng, 0.15, 0.85) * Math.PI;
    h.tx = site.x + Math.cos(a) * (site.radius + 5);
    h.ty = site.y + Math.sin(a) * (site.radius * 0.55 + 4);
    h.state = 'toSite';
    return;
  }
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
    state.events.push({ type: 'gain', res: type, amount, x: state.stockpile.x, y: state.stockpile.y, manual: false });
    h.deliveries++;
  }
  h.carry = { type: null, amount: 0 };
  const fire = fireOf(state);
  if (fire && h.deliveries > 0 && h.deliveries % H.restEveryDeliveries === 0) {
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
      addWork(state, b, dt * H.buildRate);
      break;
    }
    case 'toFire': {
      const fire = fireOf(state);
      if (!fire) { goIdle(state, h); break; }
      if (moveTo(state, h, dt)) {
        h.state = 'rest';
        h.timer = range(state.rng, H.restSeconds[0], H.restSeconds[1]);
        h.dir = fire.x > h.x ? 1 : -1;
      }
      break;
    }
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
