// Automatisk gjennomspilling av hele spillet (kun simulering, uten nettleser).
// Boten spiller som en spiller: klikker i starten og kjøper innsikter bare når de er tilgjengelige
// (status 'available' — altså oppdaget, krav oppfylt og råd). Den setter aldri milepælsflagg
// og gir seg aldri ressurser. Bruk: node tools/playthrough.mjs [seed] [maksSekunder]
import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';
import { UPGRADES, MILESTONES } from '../src/data/upgrades.js';
import { civilizationStage } from '../src/sim/civstage.js';
import { BALANCE as B } from '../src/data/balance.js';

export function playthrough(opts = {}) {
  const { seed = 20261009, maxSeconds = 7200, log = () => {}, stopAt = 'first_world_civilization' } = opts;
  const s = createGame(seed);
  const timeline = [], bot = makeBot(), bought = {};
  const seenMs = new Set();
  const steps = Math.round(maxSeconds / B.dt);
  for (let i = 0; i < steps; i++) {
    step(s);
    if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone');
    const before = bot.bought.length;
    bot.act(s);
    for (let k = before; k < bot.bought.length; k++) { const d = UPGRADES.find((u) => u.id === bot.bought[k].id); timeline.push({ t: Math.round(s.time), what: `kjøp: ${d.name}` }); log(`${fmt(s.time)} kjøp ${d.id}`); }
    for (const m of MILESTONES) if (s.milestones[m.id] != null && !seenMs.has(m.id)) {
      seenMs.add(m.id); timeline.push({ t: Math.round(s.time), what: `milepæl: ${m.title}` }); log(`${fmt(s.time)} MILEPÆL ${m.id}`);
    }
    if (s.milestones[stopAt] != null) break;
    if (opts.sample && i % (opts.sample * 60) === 0) opts.sample && log(`  [${fmt(s.time)}] ${Object.entries(s.resources).map(([k, v]) => k + ':' + Math.floor(v)).join(' ')} folk:${s.humans.length} bos:${s.settlements.length}`);
  }
  for (const q of bot.bought) bought[q.id] = (bought[q.id] || 0) + 1;
  return { state: s, timeline, bought, stage: civilizationStage(s) };
}
const fmt = (t) => `${String(Math.floor(t / 60)).padStart(3)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

if (process.argv[1] && process.argv[1].endsWith('playthrough.mjs')) {
  const seed = Number(process.argv[2]) || 20261009, max = Number(process.argv[3]) || 7200;
  const t0 = Date.now();
  const { state: s, stage } = playthrough({ seed, maxSeconds: max, log: console.log, sample: Number(process.argv[4]) || 0 });
  const r = s.resources;
  console.log(`\nSlutt ${fmt(s.time)} · trinn: ${stage.name} · folk ${s.humans.length} · bosettinger ${s.settlements.length}`);
  console.log('ressurser', Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.floor(v)])));
  console.log('bosettinger', s.settlements.map((q) => `${q.id}:${q.stage}/${q.role}/${q.population.length}`).join(' | '));
  console.log('regioner', s.globe.regions.filter((q) => !q.home && q.state !== 'ukjent').map((q) => `${q.name}:${q.state}:${q.pop}`).join(' | '));
  console.log(`regnetid ${Date.now() - t0} ms`);
}
