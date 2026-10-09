// Felles testhjelp for GAMEPLAY-07..10: ekte spilling med boten (ingen snarveier, ingen milepælsflagg).
import { createGame } from '../src/sim/game.js';
import { makeBot, playTo } from '../tools/bot.js';

const cache = new Map();

// Spiller et nytt spill frem til en milepæl. Resultatet mellomlagres per (seed, milepæl) og skal bare leses.
export function reached(milestone, seed = 20261009) {
  const key = `${seed}:${milestone}`;
  if (!cache.has(key)) {
    const s = createGame(seed), bot = makeBot();
    const ok = playTo(s, bot, milestone, 14400);
    cache.set(key, { s, ok, bot });
  }
  return cache.get(key);
}

// Fullført bygg i en syntetisk tilstand (for enhetstester av enkeltregler).
export function addBuilding(s, type, settlementId = 'first', x = 1000, y = 700, extra = {}) {
  const b = { id: s.nextId++, type, x, y, radius: 30, progress: 1, work: 1, workNeeded: 1, complete: true, divine: false, builders: [], source: null, startedAt: 0, settlementId, ...extra };
  if (type === 'sawmill' || type === 'mason') { b.cycle = 0; b.active = false; b.made = 0; }
  s.buildings.push(b);
  return b;
}

// Legger n voksne mennesker i en bosetting uten å gå via simuleringen.
export function addPeople(s, id, n) {
  const S = s.settlements.find((q) => q.id === id);
  for (let i = 0; i < n; i++) {
    const h = { id: s.nextId++, x: S.x, y: S.y, state: 'idle', timer: 99, targetId: null, tx: 0, ty: 0, carry: { type: null, amount: 0 }, deliveries: 0, dir: 1, walk: 0, anim: 0, born: -10, gatherKind: null, settlementId: id, look: { tunic: 0, skin: 0, hair: 0, height: 1, pace: 1 } };
    s.humans.push(h); S.population.push(h.id);
  }
}
