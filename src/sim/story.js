// OPUS-02 · Fra simuleringens hendelser til kronikkens setninger (norsk bokmål). Kun fakta: hvem som faktisk
// arbeidet på et bygg, hvilke bosettinger som faktisk ble grunnlagt, hvilke ruter som faktisk ble faste.
import { chronicle, nameList, nameOf } from './chronicle.js';
import { settlementById } from './settlements.js';

const placeOf = (state, id) => {
  const S = settlementById(state, id || 'first');
  if (!S) return 'landsbyen';
  return S.id === 'first' ? (['By', 'Storby'].includes(S.stage) ? 'Den første byen' : 'den første landsbyen') : S.name;
};
const inPlace = (state, id) => { const p = placeOf(state, id); return p.startsWith('Den ') ? 'i ' + p.charAt(0).toLowerCase() + p.slice(1) : 'i ' + p; };

// Første bygg av hver slags per bosetting. Byggerne hentes fra de som faktisk har arbeidet på stedet.
const BUILT = {
  shelter: (who, where) => 'Det første lyet reiste seg ved leirplassen.',
  fire: (who, where) => `${who || 'Folket'} tente det første bålet.`,
  hut: (who, where) => `${who || 'Folket'} reiste den første hytta ${where}.`,
  storage: (who, where) => `${who || 'Folket'} bygde et felles lager ${where}.`,
  hearth: (who, where) => `Et felles ildsted ble tent ${where}.`,
  field: (who, where) => `${who || 'Folket'} pløyde den første åkeren ${where}.`,
  workshop: (who, where) => `Det første verkstedet åpnet ${where}.`,
  sawmill: (who, where) => `${who || 'Folket'} reiste sagbruket ${where}.`,
  mason: (who, where) => `${who || 'Folket'} åpnet steinhoggeriet ${where}.`,
  townhouse: (who, where) => `${who || 'Folket'} bygde det første bolighuset ${where}.`,
  market: (who, where) => `Det første torget åpnet ${where}.`,
  hall: (who, where) => `Kunnskapshallen sto ferdig ${where}.`,
  well: (who, where) => `${who || 'Folket'} gravde den første brønnen ${where}.`,
  warehouse: (who, where) => `Et varehus ble reist ${where}.`,
};
const KIND = { shelter: 'home', hut: 'home', townhouse: 'home', field: 'land', sawmill: 'work', mason: 'work', workshop: 'work', market: 'civic', hall: 'civic', well: 'civic', warehouse: 'work', fire: 'fire', hearth: 'fire', storage: 'work' };

export function storyBuilt(state, b) {
  const at = { x: b.x, y: b.y };
  if (b.type === 'sanctuary') {
    const n = state.buildings.filter((q) => q.type === 'sanctuary' && q.complete).length;
    const names = ['Et offersted ble reist: folket takker dem som kom før.', 'Et varde ble reist ved offerstedet.', 'En bautastein ble reist og innhugget.', 'En lysende ildskål ble tent ved helligdommen.', 'Et lite tretempel reiste seg ved offerstedet.', 'Det store helligdommen sto ferdig. Verden husker.'];
    chronicle(state, `built:sanctuary:${n}`, 'sacred', names[Math.min(n, names.length) - 1] || names[0], at);
    return;
  }
  const f = BUILT[b.type];
  if (!f) return;
  const who = nameList(state, b.crew || [], 2);
  chronicle(state, `built:${b.type}:${b.settlementId || 'first'}`, KIND[b.type] || 'home', f(who, inPlace(state, b.settlementId)), at);
}

export function storyFounded(state, S, memberIds) {
  const who = nameList(state, memberIds, 3);
  chronicle(state, `founded:${S.id}`, 'found', `${who || 'Nybyggerne'} grunnla ${S.name}.`, { x: S.x, y: S.y });
}

export function storyRoute(state, A, Bs) {
  const a = A.id === 'first' ? 'Den første byen' : A.name, b = Bs.id === 'first' ? 'Den første byen' : Bs.name;
  chronicle(state, `route:${A.id}|${Bs.id}`, 'route', `Stien mellom ${a} og ${b} er blitt en fast handelsvei.`, { x: (A.x + Bs.x) / 2, y: (A.y + Bs.y) / 2 });
}

export function storyStage(state, S, stage) {
  const name = S.id === 'first' ? 'Den første bosettingen' : S.name;
  const text = { Grend: `${name} er blitt en grend.`, Landsby: `${name} er blitt en landsby.`, 'Voksende landsby': `${name} vokser: flere hjem og felles arbeid.`, 'Tidlig by': `${name} er blitt en tidlig by.`, By: `${name} er blitt en by.`, Storby: `${name} er blitt en storby.` }[stage];
  if (text) chronicle(state, `stage:${S.id}:${stage}`, 'stage', text, { x: S.x, y: S.y });
}

export function storyFestival(state, n, at) {
  if (n === 1 || n % 5 === 0) chronicle(state, `festival:${n}`, 'festival', n === 1 ? 'Den første høstfesten ble feiret ved ildstedet.' : `Høstfest nummer ${n} ble feiret.`, at);
}

export function storyWorld(state, kind, region, memberIds = []) {
  const who = nameList(state, memberIds, 2);
  if (kind === 'discovered') chronicle(state, `region:${region.id}`, 'explore', `${who || 'Utforskerne'} kom tilbake fra ${region.name} og fortalte om landet.`, null);
  else if (kind === 'outpost') chronicle(state, `outpost:${region.id}`, 'outpost', `${who || 'Nybyggerne'} reiste en utpost i ${region.name}.`, null);
  else if (kind === 'established') chronicle(state, `established:${region.id}`, 'outpost', `Utposten i ${region.name} er blitt et etablert land.`, null);
  else if (kind === 'caravan') chronicle(state, `caravan:${region.id}`, 'route', `Den første karavanen kom hjem fra ${region.name}.`, null);
}

export function storyMilestone(state, m) {
  chronicle(state, `milestone:${m.id}`, 'milestone', `${m.title}.`, null);
}

export { nameOf };
