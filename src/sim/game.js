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
import { stepCivilization } from './civilization.js';
import { stepProduction } from './production.js';
import { stepRealm } from './realm.js';
import { stepWorld } from './worldmap.js';
import { refreshRoles } from './settlements.js';
import { applyLegacy } from './legacy.js';
import { storyMilestone } from './story.js';
import { stepUrban } from './urban.js';
import { stepMaterials } from './materials.js';
import { stepNavigation } from './navigation.js';

export const DT = B.dt;

// Ny syklus: identisk startverden; valgfrie ekko fra tidligere sykluser virker bare gjennom modifikatorer.
export const createGame = (seed, meta = null) => applyLegacy(createWorld(seed), meta);

export function checkMilestones(state) {
  for (const m of MILESTONES) {
    if (state.milestones[m.id] != null || !requirementMet(state, m.when)) continue;
    state.milestones[m.id] = state.time;
    if (m.unlock) state.unlocks[m.unlock] = true;
    state.events.push({ type: 'milestone', id: m.id, title: m.title, text: m.text, unlock: m.unlock || null });
    storyMilestone(state, m);
  }
}

export function step(state, dt = DT) {
  state.time += dt;
  stepNature(state, dt);
  stepConstruction(state, dt);
  stepHumans(state, dt);
  stepRegional(state, dt);
  stepCivilization(state, dt);
  stepProduction(state, dt);
  stepMaterials(state, dt);
  stepNavigation(state, dt);
  stepRealm(state, dt);
  stepUrban(state, dt);
  stepWorld(state, dt);
  state.timers.roles += dt;
  if (state.timers.roles >= 1) { state.timers.roles = 0; refreshRoles(state); }
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
    got = harvestTree(state, n, B.manual.woodPerClick + (state.modifiers.clickBonus || 0));
    res = 'wood';
  } else {
    got = harvestRock(state, n, B.manual.stonePerClick + (state.modifiers.clickBonus || 0));
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
