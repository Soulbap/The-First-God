// OPUS-02 · Hva gjør et menneske akkurat nå? Ren visningsmodell (ingen sideeffekter) som leser faktisk tilstand.
// Brukes av hover-etiketten i nærbildet. Teksten er norsk bokmål.
import { settlementById } from './settlements.js';

const RES = { wood: 'trevirke', stone: 'stein', food: 'mat', planks: 'planker', cutstone: 'tilhugget stein', knowledge: 'kunnskap' };
const BUILDING = { shelter: 'det første lyet', fire: 'bålet', hut: 'en hytte', storage: 'lageret', hearth: 'ildstedet', field: 'en åker', workshop: 'et verksted', sawmill: 'sagbruket', mason: 'steinhoggeriet', townhouse: 'et bolighus', market: 'torget', hall: 'kunnskapshallen', well: 'en brønn', warehouse: 'varehuset', sanctuary: 'helligdommen' };

export function activityOf(state, h) {
  const carry = h.carry?.amount > 0 ? RES[h.carry.type] || '' : '';
  const target = h.targetId != null ? state.buildings.find((b) => b.id === h.targetId) : null;
  switch (h.state) {
    case 'idle': return 'Tar en pause';
    case 'arriving': return 'Kommer til leiren';
    case 'wander': return 'Går en tur i bygda';
    case 'toNode': return h.gatherKind === 'wood' ? 'Går mot skogen' : 'Går mot bruddet';
    case 'gather': return h.gatherKind === 'wood' ? 'Feller trær' : 'Bryter stein';
    case 'toStore': return carry ? `Bærer ${carry} til lageret` : 'Går til lageret';
    case 'toSite': return `Går for å bygge ${BUILDING[state.buildings.find((b) => b.id === h.targetId)?.type] || ''}`.trim();
    case 'build': return `Bygger ${BUILDING[target?.type] || ''}`.trim();
    case 'toFire': return 'Går til ilden';
    case 'rest': return 'Ber ved ilden';
    case 'toMaintain': case 'maintain': {
      const t = target?.type;
      const verb = h.state === 'maintain';
      if (t === 'market') return verb ? 'Handler på torget' : 'Går til torget';
      if (t === 'hall') return verb ? 'Lærer i hallen' : 'Går til hallen';
      if (t === 'well') return verb ? 'Henter vann' : 'Går til brønnen';
      if (t === 'hearth' || t === 'fire') return verb ? 'Prater ved ildstedet' : 'Går til ildstedet';
      if (t === 'hut' || t === 'townhouse' || t === 'shelter') return verb ? 'Er hjemme en stund' : 'Går hjem';
      return verb ? 'Tar seg av lageret' : 'Går til lageret';
    }
    case 'toDeliveryPickup': return 'Henter varer til en annen bygd';
    case 'toDeliver': {
      const to = carry ? ` med ${carry}` : '';
      return `Bærer varer${to} til en annen bygd`;
    }
    case 'toExplore': return 'Speider etter nytt land';
    case 'explore': return 'Speider';
    case 'returning': return 'Vender hjem fra speiding';
    case 'toFound': case 'foundingWait': case 'toSettle': case 'settleWait': return 'Nybygger på vei til et nytt sted';
    case 'toEdge': case 'away': case 'expReturn': return 'På ferd til fjerne land';
    default: return 'Går omkring';
  }
}

export function homeOf(state, h) {
  const S = settlementById(state, h.settlementId || 'first');
  return S ? (S.id === 'first' ? 'Den første bosettingen' : S.name) : '';
}
