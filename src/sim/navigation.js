// OPUS-05: liten, autoritativ navigasjonskapasitet. Dette er ikke en egen økonomi:
// båter bygges av det vanlige lageret og brukes bare av worldmap sine reserverte varer.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, siteIsValid } from './construction.js';
import { chronicle } from './chronicle.js';

const affordable = (s, cost) => Object.entries(cost).every(([k, n]) => (s.resources[k] || 0) >= n);
const spend = (s, cost) => { for (const [k, n] of Object.entries(cost)) s.resources[k] -= n; };
const complete = (s, type) => s.buildings.some((b) => b.type === type && b.complete);
const pending = (s, type) => s.buildings.some((b) => b.type === type && !b.complete);

// Dammen er den konkrete elvetilgangen i hjemmeregionen. Dokkens tomt står på land
// umiddelbart ved vannet, slik at den ikke kan oppstå i en landlåst bykjerne.
function dockSite(state) {
  const p = state.world.pond;
  for (const extra of [52, 78, 108, 142]) for (let i = 0; i < 32; i++) {
    const a = state.settlement.angleOffset + i / 32 * Math.PI * 2;
    const x = p.x + Math.cos(a) * (p.rx + extra), y = p.y + Math.sin(a) * (p.ry + extra * 0.72);
    if (siteIsValid(state, 'dock', x, y)) return { x, y };
  }
  return null;
}

function buildDock(state) {
  if (complete(state, 'dock') || pending(state, 'dock') || !affordable(state, B.navigation.dock)) return;
  const site = dockSite(state); if (!site) return;
  spend(state, B.navigation.dock);
  startConstruction(state, 'dock', { source: 'navigation:dock', site });
}

function buildVessel(state) {
  const N = state.navigation, G = state.globe;
  const cost = N.advanced ? B.navigation.sail : B.navigation.boat;
  if (!complete(state, 'dock') || G.vessels.length >= B.navigation.maxVessels || !affordable(state, cost)) return;
  spend(state, cost);
  const dock = state.buildings.find((b) => b.type === 'dock' && b.complete);
  const vessel = { id: state.nextId++, kind: N.advanced ? 'seilskip' : 'elvbåt', capacity: N.advanced ? 12 : 6, x: dock.x, y: dock.y + 8, route: null, progress: 0, cargo: null, builtAt: state.time };
  G.vessels.push(vessel); N.boats++; N.vesselsBuilt++;
  state.events.push({ type: 'vesselBuilt', vessel: vessel.kind, x: vessel.x, y: vessel.y });
  chronicle(state, `vessel:${vessel.id}`, 'route', vessel.kind === 'seilskip' ? 'Et seilskip ble sjøsatt med varerom under de nye seilene.' : 'En liten båt ble sjøsatt ved landingsplassen.', { x: vessel.x, y: vessel.y });
}

function improveKnowledge(state) {
  const G = state.globe;
  const candidates = G.regions.filter((r) => !r.home && r.state !== 'ukjent' && r.knowledge !== 'charted').sort((a, b) => a.steps - b.steps || a.row - b.row || a.col - b.col);
  const r = candidates[0]; if (!r) return;
  r.knowledge = r.knowledge === 'discovered' ? 'surveyed' : 'charted';
  state.globe.stats[r.knowledge] = (state.globe.stats[r.knowledge] || 0) + 1;
  state.events.push({ type: 'regionSurveyed', regionId: r.id, knowledge: r.knowledge });
  chronicle(state, `map:${r.id}:${r.knowledge}`, 'explore', r.knowledge === 'surveyed' ? `Karttegnerne har oppmålt ${r.name}.` : `Karttegnerne har forbedret kartet over ${r.name}.`, null);
}

export function stepNavigation(state) {
  const N = state.navigation;
  if (!N?.enabled) return;
  buildDock(state); buildVessel(state);
  if (state.time >= N.nextSurveyAt) { improveKnowledge(state); N.nextSurveyAt = state.time + B.navigation.surveySeconds / (N.advanced ? 1.8 : 1); }
}
