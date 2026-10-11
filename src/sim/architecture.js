// OPUS-12 · Arkitektur som følger av stedet. Hvert bolighus får en deterministisk byggeplan (`b.arch`) når det bygges eller bygges om:
// høyde, bredde (akser), taktype, fasadematerial, inngang og balkonger. Høyden følger det byggegrunnen er verdt (nærhet til sentrum,
// tetthet rundt, bosettingens størrelse og trinn), så en liten bygd får lave hus og en stor by får varierte silhuetter.
// Ren funksjon uten tilfeldighet utover id og frø; tegningen leser bare resultatet.
import { stageRank, isHome } from './settlements.js';

const hash = (a, b) => { let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x7f4a7c15, 0x85ebca6b)) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12; return h >>> 0; };
const pickW = (h, list) => { // vektet valg: list = [[verdi, vekt], ...]
  const tot = list.reduce((a, [, w]) => a + w, 0); let r = (h % 1000) / 1000 * tot;
  for (const [v, w] of list) { r -= w; if (r < 0) return v; }
  return list[list.length - 1][0];
};

// tier: 3 steinhus/bolighus, 4 bygård, 5 moderne blokk. value 0–1: hva byggegrunnen er verdt. rank: bosettingens trinn (0–6).
export function makeArch(tier, seed, id, value = 0.4, rank = 4) {
  const h = hash(seed, id), h2 = hash(h, 7), h3 = hash(h, 13), h4 = hash(h, 29);
  if (tier >= 5) {
    // Bredere, middels høye blokker leses som sammenhengende byfront heller enn enslige tårn.
    const cap = rank >= 6 ? 7 : rank >= 5 ? 6 : 5;
    const floors = Math.max(4, Math.min(cap, 4 + Math.round(value * 2) + (h % 4 === 0 && rank >= 5 ? 1 : 0)));
    return { tier: 5, floors, bays: pickW(h2, [[4, 3], [5, 4], [6, 2]]), roof: pickW(h3, [['flat', 4], ['terrace', 3], ['slant', 2], ['loft', 2]]),
      facade: pickW(h4, [['concrete', 4], ['glass', 2], ['brick', 3], ['panel', 3]]), entrance: pickW(hash(h, 3), [['center', 3], ['side', 2], ['arch', 1]]),
      balcony: pickW(hash(h, 5), [['none', 3], ['alt', 3], ['all', 2]]), tone: h % 4, sig: `5.${h % 997}` };
  }
  if (tier === 4) {
    const floors = Math.max(3, Math.min(5, 3 + (value > 0.45 ? 1 : 0) + (value > 0.7 && h % 2 ? 1 : 0)));
    return { tier: 4, floors, bays: pickW(h2, [[2, 3], [3, 4], [4, 2]]), roof: pickW(h3, [['flat', 4], ['gable', 4], ['mansard', 2]]),
      facade: pickW(h4, [['brick', 5], ['plaster', 3], ['stone', 2]]), entrance: pickW(hash(h, 3), [['center', 3], ['side', 2], ['arch', 1]]),
      balcony: pickW(hash(h, 5), [['none', 3], ['alt', 2]]), tone: h % 4, sig: `4.${h % 997}` };
  }
  return { tier: 3, floors: value > 0.55 && h % 3 === 0 ? 3 : 2, bays: 2 + (h2 % 2), roof: 'gable', facade: pickW(h4, [['stone', 3], ['brick', 3], ['plaster', 3]]), entrance: 'center', balcony: 'none', tone: h % 4, sig: `3.${h % 997}` };
}

// Byggeplanen til et bygg i tilstanden: verdien av grunnen avledes av sentrumsnærhet, tetthet, folketall og trinn.
export function planArchitecture(state, b, S, tier) {
  const heart = state.buildings.find((q) => q.complete && (q.settlementId || 'first') === (b.settlementId || 'first') && (q.type === 'market' || q.type === 'hearth' || q.type === 'fire')) || S;
  const d = Math.hypot(b.x - heart.x, b.y - heart.y);
  const centrality = Math.max(0, Math.min(1, 1 - d / 320));
  let near = 0;
  for (const q of state.buildings) if (q !== b && (q.settlementId || 'first') === (b.settlementId || 'first') && Math.hypot(q.x - b.x, q.y - b.y) < 120) near++;
  const value = 0.5 * centrality + 0.3 * Math.min(1, near / 9) + 0.2 * Math.min(1, S.population.length / 60);
  return makeArch(tier, state.seed, b.id, value, stageRank(S.stage || 'Leir'));
}

export const archOf = (b, tier, seed = 1) => (b.arch && b.arch.tier === tier ? b.arch : makeArch(tier, seed, b.id));
export { isHome };
