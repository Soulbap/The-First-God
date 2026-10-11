// OPUS-12 · Menneskeatferd over tid: trengsel, andel ved bål og fordeling på tilstander. Ekte simulering og bot.
//   node tools/behavior-report.mjs 20261009 7200 [sampleSekunder]
import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';
import { crowding } from '../src/sim/metrics.js';

const [seedArg, secArg, everyArg] = process.argv.slice(2);
const seed = Number(seedArg || 20261009), seconds = Number(secArg || 7200), every = Number(everyArg || 600);
const s = createGame(seed), bot = makeBot();
const rows = [];
let next = every;
const N = Math.round(seconds * 60), acc = { n: 0, maxCluster: 0, clustered: 0, atFire: 0, stacked: 0 };
for (let i = 0; i < N; i++) {
  step(s); bot.act(s);
  if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone');
  // Gjennomsnitt over hvert 5. sekund fra tid 300.
  if (i % 300 === 0 && s.time > 300) {
    const c = crowding(s);
    acc.n++; acc.maxCluster = Math.max(acc.maxCluster, c.maxCluster); acc.clustered += c.clusteredShare; acc.atFire += c.atFireShare; acc.stacked += c.stacked;
  }
  if (s.time >= next) {
    next += every;
    const c = crowding(s);
    rows.push({ t: Math.round(s.time), pop: c.n, stage: s.settlements.map((q) => `${q.id}:${q.stage}`).join(','), maxCluster: c.maxCluster, clustered: +c.clusteredShare.toFixed(2), atFire: +c.atFireShare.toFixed(2), stacked: c.stacked, states: c.byState });
  }
}
console.log(JSON.stringify({ seed, seconds, avgClusteredShare: +(acc.clustered / acc.n).toFixed(3), avgAtFireShare: +(acc.atFire / acc.n).toFixed(3), maxCluster: acc.maxCluster, stackedTotal: acc.stacked, samples: acc.n, rows }, null, 1));
