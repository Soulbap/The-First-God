// Slitasje: der mennesker går ofte, slites gresset til stier. Ren verdenstilstand uten økonomisk effekt.
import { BALANCE as B } from '../data/balance.js';

export function addWear(state, x, y, amount) {
  const w = state.wear;
  const cx = Math.floor(x / w.cell), cy = Math.floor(y / w.cell);
  if (cx < 0 || cy < 0 || cx >= w.cols || cy >= w.rows) return;
  const i = cy * w.cols + cx;
  w.data[i] = Math.min(1, w.data[i] + amount);
}

export function stampWear(state, x, y, radius, amount) {
  const c = state.wear.cell;
  for (let yy = y - radius; yy <= y + radius; yy += c) {
    for (let xx = x - radius; xx <= x + radius; xx += c) {
      if (Math.hypot(xx - x, (yy - y) * 1.6) <= radius) addWear(state, xx, yy, amount);
    }
  }
}

export function stepWear(state, dt) {
  state.timers.wearDecay += dt;
  if (state.timers.wearDecay < 1) return;
  const d = B.wear.decayPerSecond * state.timers.wearDecay;
  state.timers.wearDecay = 0;
  const data = state.wear.data;
  for (let i = 0; i < data.length; i++) if (data[i] > 0) data[i] = Math.max(0, data[i] - d);
}

export function wearAt(state, x, y) {
  const w = state.wear;
  const cx = Math.floor(x / w.cell), cy = Math.floor(y / w.cell);
  if (cx < 0 || cy < 0 || cx >= w.cols || cy >= w.rows) return 0;
  return w.data[cy * w.cols + cx];
}
