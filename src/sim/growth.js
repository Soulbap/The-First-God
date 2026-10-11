// OPUS-12 · Hva en bosetting bygger videre ut fra stedet og behovet — ikke etter en felles mal. En satellitt vurderer jevnlig sin egen
// situasjon (folk, bolig, mat, nærmeste skog/stein/malm, hva den sender ut) og velger det neste prosjektet som faktisk mangler.
// Dermed blir en skogsbygd til sagbruk og tømmer, en steinbygd til steinhoggeri, en bygd ved malm til gruveby, og en bygd med god jord til jordbruk —
// og de får ulik størrelse, ulikt utseende og ulike varer å handle med. Prosjektene betales fra bosettingens eget lager (leveres av handelen).
import { BALANCE as B } from '../data/balance.js';
import { stageRank, housingCapacity, isHome } from './settlements.js';
import { invGet } from './inventory.js';

const count = (state, id, type) => state.buildings.filter((b) => (b.settlementId || 'first') === id && b.type === type).length; // inkluderer pågående
const near = (state, S, kind, r, pred = () => true) => state.nodes.filter((n) => n.kind === kind && Math.hypot(n.x - S.x, n.y - S.y) < r && pred(n)).length;

// Kostnader for tillegg utover URBAN_PLAN. Alle er små nok til å leveres av bærere og lastebil.
export const GROWTH_COST = {
  commons: { wood: 10, stone: 12 },
  field: { wood: 18, stone: 6 },
  sawmill: { wood: 30, stone: 18, planks: 4 },
  mason: { wood: 24, stone: 30, planks: 3 },
  workshop: { wood: 22, stone: 18 },
  mine: { wood: 34, stone: 18 },
  coal_mine: { wood: 46, stone: 34, planks: 10, iron: 2 },
  market: { wood: 40, stone: 30, planks: 8 },
  warehouse: { wood: 60, stone: 40, planks: 10, cutstone: 4 },
  townhouse: { wood: 40, stone: 30, planks: 8, cutstone: 4 },
  park: { wood: 24, stone: 18, planks: 4 },
  hut: { wood: 20, stone: 12 },
  well: { wood: 14, stone: 22 },
};

// Arbeidsplasser i en bosetting (OPUS-12): bosettingens økonomi avgjør hvor mange den kan gi arbeid, og dermed hvor stor den blir.
// Et sagbruk uten skog, et steinhoggeri uten stein og en gruve uten malm gir nesten ingen arbeid; en åker, et verksted eller en fabrikk gir mer.
export function jobsOf(state, S) {
  let j = 6; // sanking og enkelt håndverk
  const nearN = (kind, r, pred) => state.nodes.reduce((n, q) => (q.kind === kind && Math.abs(q.x - S.x) < r && Math.abs(q.y - S.y) < r && Math.hypot(q.x - S.x, q.y - S.y) < r && (!pred || pred(q)) ? n + 1 : n), 0);
  let trees = null, rocks = null, ore = null, coal = null;
  for (const b of state.buildings) {
    if (!b.complete || (b.settlementId || 'first') !== S.id) continue;
    switch (b.type) {
      case 'field': j += 4; break;
      case 'sawmill': trees ??= nearN('tree', 330, (q) => q.state === 'alive'); j += trees >= 8 ? 5 : 1; break;
      case 'mason': rocks ??= nearN('rock', 330, (q) => q.stone > 0); j += rocks >= 2 ? 5 : 1; break;
      case 'mine': ore ??= nearN('mineral', 430, (q) => q.amount > 0 && q.mineral !== 'coal' && q.mineral !== 'oil'); j += ore >= 1 ? 7 : 0; break;
      case 'coal_mine': coal ??= nearN('mineral', 430, (q) => q.amount > 0 && q.mineral === 'coal'); j += coal >= 1 ? 9 : 0; break;
      case 'workshop': case 'hall': case 'warehouse': case 'rail_terminal': j += 3; break;
      case 'market': j += 4; break;
      case 'watermill': case 'windmill': j += 2; break;
      case 'metalworks': case 'locomotive_workshop': case 'refinery': case 'motor_depot': case 'precision_works': case 'aircraft_works': case 'electronics_works': case 'generator': case 'steam_engine': case 'research_institute': j += 6; break;
      case 'airfield': case 'dock': case 'boatyard': j += 4; break;
      default: break;
    }
  }
  return j;
}

// Hovedstaden følger URBAN_PLAN (urban.js). Satellitter: en prioritert liste der hver post har en betingelse som beskriver et faktisk behov.
// Returnerer { type, cost } eller null. Ren spørring.
export function nextGrowth(state, S) {
  const id = S.id, rank = stageRank(S.stage || 'Leir'), pop = S.population.length, housing = housingCapacity(state, id);
  const n = (t) => count(state, id, t);
  const homes = state.buildings.filter((b) => (b.settlementId || 'first') === id && isHome(b)).length;
  const food = invGet(state, id, 'food'), jobs = S.jobs ?? jobsOf(state, S);
  const C = (t) => ({ type: t, cost: { ...GROWTH_COST[t] } });
  const exported = (types) => Object.entries(state.trade?.flows || {}).reduce((a, [k, v]) => { const [route, type] = k.split('|'); return route.startsWith(`${id}>`) && types.includes(type) ? a + v : a; }, 0);
  // 1) Vann og grunnbolig.
  if (rank >= 2 && n('well') < 1) return C('well');
  if (rank >= 2 && n('commons') < 1) return C('commons');
  // 2) Mat: en bosetting uten åker og uten matlager sulter. Åker når folk trenger mer enn de har.
  if (state.civilization?.foodUnlocked && rank >= 2 && n('field') < Math.min(4, 1 + Math.floor(pop / 9)) && (n('field') < 1 || food < 20 + pop)) return C('field');
  // 3) Bolig etter presset: bosettingen er full, og trinnet tillater flere hus.
  const homeCap = [2, 3, 3, 4, 5, 7, 9][Math.min(6, rank)];
  if (homes < homeCap && (homes < 2 || (pop >= housing - 1 && jobs >= pop + 2))) return C('hut'); // flere hus bare når det finnes arbeid til flere
  // 4) Spesialisering ut fra nærmeste ressurser (geografi avgjør, ikke et fast manus).
  if (rank >= 3) {
    if (n('sawmill') < 1 && near(state, S, 'tree', 330, (t) => t.state === 'alive') >= 14) return C('sawmill');
    if (n('mason') < 1 && near(state, S, 'rock', 330) >= 3) return C('mason');
    if (state.materials?.enabled && n('mine') + n('coal_mine') < 1 && near(state, S, 'mineral', 430, (m) => m.discovered && m.amount > 0 && m.mineral !== 'oil') >= 1 && state.industrial?.enabled && state.nodes.some((m) => m.kind === 'mineral' && m.mineral === 'coal' && m.discovered && Math.hypot(m.x - S.x, m.y - S.y) < 430)) return C('coal_mine');
    if (state.materials?.enabled && n('mine') + n('coal_mine') < 1 && near(state, S, 'mineral', 430, (m) => m.discovered && m.amount > 0 && m.mineral !== 'oil' && m.mineral !== 'coal') >= 1) return C('mine');
    if (n('workshop') < 1 && state.civilization?.exchangeUnlocked && pop >= 6) return C('workshop');
  }
  // 5) By: handel, lager, bolighus og park når bosettingen har vokst og har noe å handle med.
  if (rank >= 4 && n('market') < 1 && pop >= 10 && (n('sawmill') + n('mason') + n('field') + n('mine') + n('coal_mine') >= 1)) return C('market');
  if (rank >= 4 && n('warehouse') < 1 && n('market') >= 1 && exported(['wood', 'stone', 'planks', 'cutstone', 'food', 'coal', 'ironOre', 'copperOre', 'tinOre']) >= 24) return C('warehouse');
  const th = rank >= 6 ? 6 : rank >= 5 ? 4 : rank >= 4 ? 2 : 0;
  if (n('townhouse') < th && state.upgrades.construction_methods && pop >= housing - 2 && jobs >= pop + 3) return C('townhouse');
  if (rank >= 5 && n('park') < 1) return C('park');
  if (rank >= 3 && n('well') < 2 && pop >= 14) return C('well');
  return null;
}
