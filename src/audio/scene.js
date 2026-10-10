// OPUS-02 · Lydbildet leses fra det spilleren faktisk ser: hvilke bygg som arbeider i utsnittet, om tjernet er i nærheten,
// hvor mye skog og folk det er, om det er natt. Ren funksjon (ingen Web Audio) så den kan testes.
import { stageRank } from '../sim/settlements.js';
import { lightAt } from '../view/daylight.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function audioScene(state, cam, phase, { globe = false } = {}) {
  const w = cam.w, h = cam.w * (cam.screenH / cam.screenW);
  const x0 = cam.x - w / 2, x1 = cam.x + w / 2, y0 = cam.y - h / 2, y1 = cam.y + h / 2;
  const inView = (x, y, m = 0) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
  const near = globe ? 0 : 1 - clamp((cam.w - 650) / 1500);
  const pond = state.world.pond;
  const waterD = Math.hypot(cam.x - pond.x, cam.y - pond.y);
  const water = near * clamp(1 - (waterD - pond.rx) / (w * 0.8 + 60));
  let sawing = 0, masons = 0, market = 0, hall = 0, rank = 0, fires = 0, builders = 0, wells = 0;
  for (const b of state.buildings) {
    if (!b.complete || !inView(b.x, b.y, 60)) continue;
    if (b.type === 'sawmill' && b.active) sawing++;
    else if (b.type === 'mason' && b.active) masons++;
    else if (b.type === 'market') market++;
    else if (b.type === 'hall') hall++;
    else if (b.type === 'fire' || b.type === 'hearth') fires++;
    else if (b.type === 'well') wells++;
  }
  for (const h2 of state.humans) if (h2.state === 'build' && inView(h2.x, h2.y)) builders++;
  for (const s of state.settlements) if (inView(s.x, s.y, 200)) rank = Math.max(rank, stageRank(s.stage || 'Leir'));
  let crowd = 0;
  for (const b of state.buildings) if (b.type === 'market' && b.complete && inView(b.x, b.y)) for (const q of state.humans) if (Math.hypot(q.x - b.x, q.y - b.y) < 130) crowd++;
  let trees = 0;
  for (const n of state.nodes) if (n.kind === 'tree' && n.state === 'alive' && n.growth > 0.5 && inView(n.x, n.y)) trees++;
  const L = lightAt(phase);
  return {
    near, water, sawing, masons, builders, fires, wells,
    market: market ? clamp(0.25 + crowd / 7) : 0, hall: hall ? 1 : 0, town: clamp((rank - 2) / 4),
    forest: near * clamp(trees / 70), night: L.night, twilight: L.twilight, festival: state.time < (state.civilization?.festivalUntil ?? -Infinity) ? 1 : 0,
  };
}
