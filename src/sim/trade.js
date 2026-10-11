// OPUS-12 · Handel mellom bosettinger. Varer flyttes bare fordi en bosetting mangler noe og en annen har overskudd:
//   • hovedstaden importerer (tre, stein, planker, mat, mineraler) fra en satellitt med overskudd når eget lager er under lavvann,
//   • en satellitt får mat fra hovedstaden når den sulter og hovedstaden har rikelig,
//   • prosjekter og vedlikehold i en satellitt bestilles fra hovedstaden (se regional.js).
// Hver bestilling er en leveranse (`region.deliveries`, status queued) som bærere, lastebil eller tog tar. Varen trekkes fra
// avsenderens lager ved avreise og legges i mottakerens lager ved ankomst; ingenting oppstår eller forsvinner underveis.
import { BALANCE as B } from '../data/balance.js';
import { invGet } from './inventory.js';
import { mineralTarget } from './materials.js';

const OPEN = (d) => d.status !== 'done' && d.status !== 'cancelled';

// Varer underveis eller bestilt til en bosetting (leveranser i kø/underveis og tog/lastebil).
export function inbound(state, id, type) {
  let n = 0;
  for (const d of state.region?.deliveries || []) if (d.destination === id && d.type === type && OPEN(d)) n += d.amount;
  for (const q of state.industrial?.shipments || []) if (q.status === 'traveling' && (q.to ?? 'first') === id && q.type === type) n += q.amount;
  return n;
}
// Varer lovet bort fra en bosetting, men ikke ennå hentet (stå i kø).
export function promised(state, id, type) {
  let n = 0;
  for (const d of state.region?.deliveries || []) if (d.source === id && d.type === type && d.status === 'queued') n += d.amount;
  return n;
}

// Lavvann i hovedstaden: under dette importeres varen hvis en satellitt har overskudd.
export function capitalLow(state, type) {
  const T = B.trade.capitalLow;
  if (type in T) return T[type];
  return mineralTarget(state, type) || 0;
}
export const satelliteKeep = (type) => B.trade.satelliteKeep[type] ?? 0;

export const TRADE_TYPES = () => [...Object.keys(B.trade.capitalLow), 'coal', 'ironOre', 'copperOre', 'tinOre'];

// Handelsregnskap (kun statistikk): bestillinger per årsak og faktisk fraktede mengder per rute og transportmåte.
export function recordFlow(state, from, to, type, amount, mode) {
  const T = (state.trade ??= { orders: {}, flows: {}, modes: {} });
  const k = `${from}>${to}|${type}`;
  T.flows[k] = (T.flows[k] || 0) + amount;
  T.modes[mode] = (T.modes[mode] || 0) + amount;
}

export function queueDelivery(state, d) {
  const R = state.region;
  const T = (state.trade ??= { orders: {}, flows: {}, modes: {} });
  T.orders[d.reason || 'project'] = (T.orders[d.reason || 'project'] || 0) + 1;
  const rec = { id: state.nextId++, project: d.project || null, type: d.type, amount: d.amount, status: 'queued', source: d.source, destination: d.destination, createdAt: state.time, carrierId: null, reason: d.reason || 'project' };
  R.deliveries.push(rec);
  return rec;
}

// Planlegger handel jevnlig. Returnerer antall nye bestillinger (for tester).
export function planTrade(state, bundle = 4) {
  const R = state.region;
  if (!R?.enabled || state.time < (R.nextTradeAt ?? 0)) return 0;
  R.nextTradeAt = state.time + B.trade.checkSeconds;
  const sats = state.settlements.filter((s) => s.id !== 'first' && s.state === 'active');
  if (!sats.length) return 0;
  let made = 0;
  const room = () => R.deliveries.filter((d) => d.status === 'queued').length < B.trade.maxQueued;
  // 1) Hovedstadens import.
  for (const type of TRADE_TYPES()) {
    if (!room()) break;
    const low = capitalLow(state, type);
    if (!low) continue;
    const have = invGet(state, 'first', type) + inbound(state, 'first', type);
    if (have >= low) continue;
    let from = null, best = 0;
    for (const S of sats) {
      const sur = invGet(state, S.id, type) - satelliteKeep(type) - promised(state, S.id, type);
      if (sur >= B.trade.minBatch && sur > best + 1e-9) { from = S; best = sur; }
    }
    if (!from) continue;
    queueDelivery(state, { type, amount: Math.min(bundle, Math.floor(best), Math.ceil(low - have)), source: from.id, destination: 'first', reason: 'import' });
    made++;
  }
  // 2) Mat til en sulten bosetting fra den som har mest overskudd (hovedstaden holder tilbake `capitalFoodSurplus`, en satellitt sitt eget behov).
  const all = [state.settlements.find((q) => q.id === 'first'), ...sats].filter(Boolean);
  const surplus = (P) => invGet(state, P.id, 'food') - promised(state, P.id, 'food') - (P.id === 'first' ? B.trade.capitalFoodSurplus : satelliteKeep('food') + P.population.length * 0.5);
  for (const S of all) {
    if (!room()) break;
    if (S.population.length < 2 || invGet(state, S.id, 'food') + inbound(state, S.id, 'food') >= B.trade.satelliteFoodLow + S.population.length * 0.15) continue;
    let from = null, best = 0;
    for (const P of all) if (P.id !== S.id && P.state === 'active') { const sur = surplus(P); if (sur >= B.trade.minBatch && sur > best + 1e-9) { from = P; best = sur; } }
    if (!from) continue;
    queueDelivery(state, { type: 'food', amount: Math.min(bundle * 2, Math.floor(best)), source: from.id, destination: S.id, reason: 'relief' });
    made++;
  }
  return made;
}
