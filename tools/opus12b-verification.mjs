// OPUS-12B-verifisering: ren diagnostikk for naturlige botløp. Endrer aldri spilltilstand utover vanlig simulering.
// node tools/opus12b-verification.mjs 2,5,77,701,909,4242,31337,20261009 21600
import { performance } from 'node:perf_hooks';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';
import { consolidationPlan } from '../src/sim/renovation.js';
import { housingCapacity } from '../src/sim/settlements.js';

const [seedsArg = '701', secondsArg = '21600'] = process.argv.slice(2);
const seeds = seedsArg.split(',').map(Number), seconds = Number(secondsArg);
const run = (seed) => {
  const s = createGame(seed), bot = makeBot(), counts = { eligibleSamples: 0, started: 0, completed: 0, details: [] }, seen = new WeakSet(), t0 = performance.now();
  let instituteAt = null;
  for (let i = 0, n = Math.round(seconds * 60); i < n; i++) {
    step(s); bot.act(s);
    if (i % 60 === 0 && s.settlements.some((q) => q.state === 'active' && consolidationPlan(s, q))) counts.eligibleSamples++;
    for (const e of s.events) {
      if (seen.has(e)) continue;
      seen.add(e);
      if (e.type === 'consolidationStarted') {
        counts.started++;
        const q = s.settlements.find((settlement) => settlement.id === e.settlementId);
        counts.details.push({ phase: 'start', settlement: e.settlementId, people: q?.population.length, capacity: housingCapacity(s, e.settlementId) });
      }
      if (e.type === 'consolidated') {
        counts.completed++;
        const q = s.settlements.find((settlement) => settlement.id === e.settlementId);
        counts.details.push({ phase: 'complete', settlement: e.settlementId, people: q?.population.length, capacity: housingCapacity(s, e.settlementId) });
      }
    }
    if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone');
    if (s.buildings.some((b) => b.type === 'research_institute' && b.complete)) { instituteAt = s.time; break; }
  }
  return { seed, institute: instituteAt != null, simHours: instituteAt == null ? null : +(instituteAt / 3600).toFixed(3), wallS: +((performance.now() - t0) / 1000).toFixed(1), people: s.humans.length, buildings: s.buildings.filter((b) => b.complete).length, settlements: s.settlements.filter((q) => q.state === 'active').length, consolidations: counts, housing: s.settlements.filter((q) => q.state === 'active').map((q) => [q.id, q.population.length, housingCapacity(s, q.id)]) };
};
if (process.env.OPUS12B_VERIFY_CHILD) {
  console.log(JSON.stringify(run(seeds[0])));
} else {
  const self = fileURLToPath(import.meta.url);
  const rows = await Promise.all(seeds.map((seed) => new Promise((resolve, reject) => {
    const child = fork(self, [String(seed), String(seconds)], { env: { ...process.env, OPUS12B_VERIFY_CHILD: '1' }, silent: true });
    let out = ''; child.stdout.on('data', (d) => { out += d; }); child.on('error', reject);
    child.on('exit', (code) => code ? reject(new Error(`seed ${seed}: ${code}`)) : resolve(JSON.parse(out.trim())));
  })));
  console.log(JSON.stringify(rows.sort((a, b) => a.seed - b.seed), null, 2));
}
