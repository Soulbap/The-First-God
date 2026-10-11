// OPUS-12 · Funksjonelle områder og økonomisk identitet. Rene spørringer på tilstanden — ingen soneplanlegging fra spilleren:
// områdene er bare navn på det byggene og aktiviteten faktisk har blitt, og identiteten er det en bosetting ender som ut fra geografi og handel.
import { isHome, stageRank } from './settlements.js';
import { jobsOf } from './growth.js';

export const DISTRICTS = ['bolig', 'jordbruk', 'handel', 'industri', 'sivilt', 'transport', 'forskning'];
export const DISTRICT_NAME = { bolig: 'Boligstrøk', jordbruk: 'Jordbruk', handel: 'Handel', industri: 'Industri', sivilt: 'Sivilt', transport: 'Transport', forskning: 'Forskning' };

const MAP = {
  bolig: ['shelter', 'hut', 'townhouse'],
  jordbruk: ['field', 'watermill', 'windmill'],
  handel: ['market', 'warehouse', 'storage'],
  industri: ['sawmill', 'mason', 'workshop', 'mine', 'coal_mine', 'charcoal_kiln', 'smelter', 'steam_engine', 'metalworks', 'locomotive_workshop', 'generator', 'oil_well', 'refinery', 'combustion_engine', 'precision_works', 'aircraft_works', 'electronics_works'],
  sivilt: ['hall', 'well', 'sanctuary', 'commons', 'park', 'fire', 'hearth'],
  transport: ['rail_terminal', 'motor_depot', 'airfield', 'dock', 'boatyard', 'grid_station'],
  forskning: ['research_institute', 'telegraph'],
};
const OF = {};
for (const [d, ts] of Object.entries(MAP)) for (const t of ts) OF[t] = d;
export const districtOf = (type) => OF[type] || 'sivilt';

// Antall bygg og tyngdepunkt per område i en bosetting.
export function districtProfile(state, S) {
  const out = {};
  for (const b of state.buildings) {
    if (!b.complete || (b.settlementId || 'first') !== S.id) continue;
    const d = districtOf(b.type), e = (out[d] ||= { n: 0, x: 0, y: 0 });
    e.n++; e.x += b.x; e.y += b.y;
  }
  for (const e of Object.values(out)) { e.x = Math.round(e.x / e.n); e.y = Math.round(e.y / e.n); }
  return out;
}

// Områder som har vokst fram: en liten bygd har ingen formelle områder; en by har minst to som er lesbare (flere bygg enn bare spredte enkeltbygg).
export function recognizedDistricts(state, S) {
  const p = S.districts || districtProfile(state, S);
  const rank = stageRank(S.stage || 'Leir');
  const minN = rank >= 5 ? 2 : rank >= 3 ? 3 : 99;
  return Object.entries(p).filter(([d, e]) => d !== 'sivilt' && e.n >= minN).sort((a, b) => b[1].n - a[1].n).map(([d]) => d);
}

const count = (state, id, types) => state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === id && types.includes(b.type)).length;

// Økonomisk identitet: avledet av hva bosettingen faktisk driver med og hva den sender ut. Hovedstaden kalles «Hovedstad» så lenge den er størst.
export function identityOf(state, S) {
  const id = S.id, pop = S.population.length;
  const sent = {};
  for (const [k, n] of Object.entries(state.trade?.flows || {})) { const [route, type] = k.split('|'); const [from] = route.split('>'); if (from === id) sent[type] = (sent[type] || 0) + n; }
  const mines = count(state, id, ['mine', 'coal_mine']), fields = count(state, id, ['field']), saw = count(state, id, ['sawmill']), mason = count(state, id, ['mason']);
  const fact = count(state, id, ['metalworks', 'locomotive_workshop', 'refinery', 'motor_depot', 'precision_works', 'aircraft_works', 'electronics_works', 'steam_engine', 'generator']);
  const research = count(state, id, ['research_institute', 'telegraph']);
  const hub = count(state, id, ['rail_terminal', 'motor_depot', 'airfield']), port = count(state, id, ['dock', 'boatyard']);
  const trade = count(state, id, ['market', 'warehouse']);
  const minerals = (sent.coal || 0) + (sent.ironOre || 0) + (sent.copperOre || 0) + (sent.tinOre || 0);
  const scores = [
    ['Forskningsby', research * 6],
    ['Industriby', fact * 3 + (S.id === 'first' ? 0 : 1)],
    ['Gruveby', mines * 4 + minerals * 0.5],
    ['Havneby', port * 4],
    ['Knutepunkt', hub >= 2 ? hub * 2.5 : 0],
    ['Handelsby', trade >= 2 ? trade * 2 + Math.min(6, Object.values(sent).reduce((a, b) => a + b, 0) / 60) : 0],
    ['Jordbruksbygd', fields * 2.5 + (sent.food || 0) * 0.04],
    ['Skogsby', saw * 4 + (sent.wood || 0) * 0.01 + (sent.planks || 0) * 0.05],
    ['Steinbrudd', mason * 4 + (sent.stone || 0) * 0.01 + (sent.cutstone || 0) * 0.05],
  ].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const top = scores[0];
  if (S.id === 'first') return top && top[1] >= 8 ? `Hovedstad · ${top[0]}` : 'Hovedstad';
  if (!top || pop < 3) return 'Ung bosetting';
  return top[0];
}

export function refreshDistricts(state) {
  for (const S of state.settlements) {
    if (S.state !== 'active') continue;
    S.districts = districtProfile(state, S);
    S.identity = identityOf(state, S);
    S.jobs = jobsOf(state, S);
  }
}
