// Sivilisasjonstrinn: en avledet vurdering av hele samfunnet, bygget på faktiske milepæler og tilstand.
// Ingen timere. Trinnet kan bare stige når verden faktisk har endret seg.
import { settlementById } from './settlements.js';

export const CIV_STAGES = [
  { id: 'budding', name: 'Spirende samfunn' },
  { id: 'regional', name: 'Regional sivilisasjon' },
  { id: 'organized', name: 'Organisert sivilisasjon' },
  { id: 'realm', name: 'Sammenhengende rike' },
  { id: 'world_aware', name: 'Verdensbevisst sivilisasjon' },
  { id: 'world_first', name: 'Verdens første sivilisasjon' },
];

export function civilizationStage(state) {
  const m = state.milestones, G = state.globe;
  let rank = 0;
  if (m.dawn_civilization != null) rank = 1;
  if (m.age_of_knowledge != null) rank = 2;
  if (m.connected_realm != null) rank = 3;
  if (rank >= 3 && G && G.stats.discovered >= 2 && G.stats.outposts >= 1) rank = 4;
  if (m.first_world_civilization != null) rank = 5;
  return { rank, ...CIV_STAGES[rank], next: CIV_STAGES[rank + 1] || null };
}

export const activeSettlements = (state) => state.settlements.filter((s) => s.state === 'active');
export const distinctRoles = (state) => new Set(activeSettlements(state).map((s) => s.role)).size;
export const hasCity = (state, id = 'first') => ['By', 'Storby'].includes(settlementById(state, id)?.stage);
