// Samlet simuleringssteg og spillerhandlinger. Fast tidssteg, uavhengig av bildefrekvens.
import { BALANCE as B } from '../data/balance.js';
import { MILESTONES } from '../data/upgrades.js';
import { createWorld } from './world.js';
import { stepNature, harvestTree, harvestRock, treeAvailable } from './nature.js';
import { stepConstruction } from './construction.js';
import { stepHumans } from './humans.js';
import { stepWear } from './wear.js';
import { stepEcology } from './ecology.js';
import { pruneStats } from './stats.js';
import { requirementMet } from './economy.js';
import { checkDiscoveries } from './discovery.js';
import { stepRegional } from './regional.js';

export const DT = B.dt;

export const createGame = (seed) => createWorld(seed);

export function checkMilestones(state) {
  for (const m of MILESTONES) {
    if (state.milestones[m.id] != null || !requirementMet(state, m.when)) continue;
    state.milestones[m.id] = state.time;
    if (m.unlock) state.unlocks[m.unlock] = true;
    state.events.push({ type: 'milestone', id: m.id, title: m.title, text: m.text, unlock: m.unlock || null });
  }
}

export function step(state, dt = DT) {
  state.time += dt;
  stepNature(state, dt);
  stepConstruction(state, dt);
  stepHumans(state, dt);
  stepRegional(state, dt);
  stepWear(state, dt);
  stepEcology(state, dt);
  checkMilestones(state);
  checkDiscoveries(state);
  pruneStats(state);
}

// Kjører simuleringen fremover (tester og feilsøking). Hendelser tømmes for å unngå vekst i minnet.
export function advance(state, seconds, { keepEvents = false } = {}) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    step(state);
    if (!keepEvents && state.events.length > 256) state.events = state.events.filter((e) => e.type === 'milestone');
  }
}

export function drainEvents(state) {
  const e = state.events;
  state.events = [];
  return e;
}

// Manuell klikking på et ressursobjekt. Returnerer mengden som ble gitt.
export function clickNode(state, id) {
  const n = state.nodes.find((x) => x.id === id);
  if (!n) return 0;
  let got = 0, res = null;
  if (n.kind === 'tree') {
    if (n.state !== 'alive') return 0;
    if (n.growth < B.tree.harvestMinGrowthManual || treeAvailable(n) <= 0) {
      state.events.push({ type: 'tooYoung', nodeId: n.id, x: n.x, y: n.y });
      return 0;
    }
    got = harvestTree(state, n, B.manual.woodPerClick);
    res = 'wood';
  } else {
    got = harvestRock(state, n, B.manual.stonePerClick);
    res = 'stone';
  }
  if (got > 0) {
    state.resources[res] += got;
    state.totals[res] += got;
    state.totals.manualClicks++;
    state.events.push({ type: 'hit', nodeId: n.id, by: 'player', res, x: n.x, y: n.y });
    state.events.push({ type: 'gain', res, amount: got, x: n.x, y: n.y, manual: true, nodeId: n.id });
  }
  return got;
}
