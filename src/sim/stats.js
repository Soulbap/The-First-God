// Faktisk autonom produksjon målt fra leveranser — samme kilde som økonomien.
import { BALANCE as B } from '../data/balance.js';

export function recordAuto(state, res, amount) {
  state.stats.log.push({ t: state.time, res, amount });
}

export function pruneStats(state) {
  const log = state.stats.log;
  const cutoff = state.time - B.stats.productionWindow;
  let i = 0;
  while (i < log.length && log[i].t < cutoff) i++;
  if (i > 0) log.splice(0, i);
}

export function productionRate(state) {
  const out = { wood: 0, stone: 0, planks: 0, cutstone: 0, knowledge: 0 };
  if (state.stats.autoStart == null) return out;
  const span = Math.max(1, Math.min(B.stats.productionWindow, state.time - state.stats.autoStart));
  const cutoff = state.time - B.stats.productionWindow;
  for (const e of state.stats.log) if (e.t >= cutoff && out[e.res] != null) out[e.res] += e.amount;
  for (const k of Object.keys(out)) out[k] /= span;
  return out;
}
