// OPUS-12 · Hvor oppholder folk seg? Teller steder (bygningstype) for mennesker som er knyttet til et sted, per bosetting. Ekte simulering og bot.
import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';
import { BOUND } from '../src/sim/community.js';
const [seedArg, secArg] = process.argv.slice(2);
const s = createGame(Number(seedArg || 20261009)), bot = makeBot();
const N = Math.round(Number(secArg || 7200) * 60), tally = {}, per = {};
for (let i = 0; i < N; i++) {
  step(s); bot.act(s); if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone');
  if (i % 600 === 0 && s.time > 3600) for (const h of s.humans) if (BOUND.has(h.state) && h.destId != null) {
    const b = s.buildings.find((q) => q.id === h.destId); if (!b) continue;
    const k = b.type; tally[k] = (tally[k] || 0) + 1; per[h.settlementId] = (per[h.settlementId] || 0) + 1;
  }
}
console.log(JSON.stringify({ tally, per, pop: s.humans.length, buildings: Object.entries(s.buildings.reduce((m, b) => (m[b.type] = (m[b.type] || 0) + 1, m), {})) }));
