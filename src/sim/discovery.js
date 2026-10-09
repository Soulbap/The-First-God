// Progressiv oppdagelse: når en innsikt (oppgradering) blir synlig for spilleren.
// Oppdagelse er varig i syklusen og skilt fra kjøpskrav (requires) og effekter (economy.js).
import { UPGRADES } from '../data/upgrades.js';
import { requirementMet, upgradeCount } from './economy.js';

export const discoverRules = (def) => def.discover || def.requires;

export const isDiscovered = (state, def) => state.discovered[def.id] != null || upgradeCount(state, def.id) > 0;

export function checkDiscoveries(state) {
  for (const def of UPGRADES) {
    if (isDiscovered(state, def) || !discoverRules(def).every((r) => requirementMet(state, r))) continue;
    state.discovered[def.id] = state.time;
    state.events.push({ type: 'discovered', id: def.id, name: def.name });
  }
}
