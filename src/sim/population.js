// Nye mennesker: våkner i lyet eller vandrer inn fra skogkanten.
import { rand, range } from '../core/rng.js';

const TUNICS = 5, SKINS = 4, HAIRS = 4;

export function spawnHumans(state, count, { at = 'shelter', building = null } = {}) {
  const C = state.settlement.center;
  const home = building || state.buildings.find((b) => b.type === 'shelter' && b.complete);
  const out = [];
  for (let i = 0; i < count; i++) {
    const h = {
      id: state.nextId++, x: C.x, y: C.y, state: 'idle', timer: 1.5 + i * 0.8,
      targetId: null, tx: 0, ty: 0, carry: { type: null, amount: 0 },
      deliveries: 0, dir: rand(state.rng) < 0.5 ? -1 : 1, walk: 0, anim: 0,
      born: state.time, gatherKind: null,
      look: {
        tunic: Math.floor(rand(state.rng) * TUNICS), skin: Math.floor(rand(state.rng) * SKINS),
        hair: Math.floor(rand(state.rng) * HAIRS), height: range(state.rng, 0.93, 1.06), pace: range(state.rng, 0.92, 1.08),
      },
    };
    if (at === 'edge') {
      // Kommer gående inn fra kanten av det synlige landskapet.
      const a = rand(state.rng) * Math.PI * 2;
      h.x = Math.min(state.world.width - 20, Math.max(20, C.x + Math.cos(a) * 520));
      h.y = Math.min(state.world.height - 20, Math.max(20, C.y + Math.sin(a) * 380));
      h.state = 'arriving';
      h.tx = (building ? building.x : C.x) + range(state.rng, -30, 30);
      h.ty = (building ? building.y + building.radius * 0.6 + 6 : C.y) + range(state.rng, 0, 14);
    } else if (home) {
      h.x = home.x + (i - (count - 1) / 2) * 9;
      h.y = home.y + home.radius * 0.45 + 4;
    }
    state.humans.push(h);
    out.push(h);
  }
  if (state.stats.autoStart == null && out.length) state.stats.autoStart = state.time;
  state.events.push({ type: 'humansArrived', count, at });
  return out;
}
