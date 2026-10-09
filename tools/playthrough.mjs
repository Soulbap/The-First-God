// Automatisk gjennomspilling av hele spillet (kun simulering, uten nettleser).
// Boten spiller som en spiller: klikker i starten og kjøper innsikter bare når de er tilgjengelige
// (status 'available' — altså oppdaget, krav oppfylt og råd). Den setter aldri milepælsflagg
// og gir seg aldri ressurser. Bruk: node tools/playthrough.mjs [seed] [maksSekunder]
import { createGame, step, clickNode } from '../src/sim/game.js';
import { purchase, upgradeStatus } from '../src/sim/economy.js';
import { UPGRADES, MILESTONES } from '../src/data/upgrades.js';
import { isDiscovered } from '../src/sim/discovery.js';
import { civilizationStage } from '../src/sim/civstage.js';
import { BALANCE as B } from '../src/data/balance.js';

export function playthrough(opts = {}) {
  const { seed = 20261009, maxSeconds = 7200, log = () => {}, stopAt = 'first_world_civilization' } = opts;
  const s = createGame(seed);
  const timeline = [], bought = {};
  let nextBuy = 0, nextClick = 0;
  const seenMs = new Set();
  const steps = Math.round(maxSeconds / B.dt);
  for (let i = 0; i < steps; i++) {
    // Manuell sanking de første minuttene: noen klikk i sekundet mens spilleren venter på første ly.
    if (s.time < 40 && s.time >= nextClick) {
      nextClick = s.time + 0.5;
      const tree = s.nodes.find((n) => n.kind === 'tree' && n.state === 'alive' && n.growth >= 0.3);
      const rock = s.nodes.find((n) => n.kind === 'rock' && n.stone > 0);
      if (s.resources.wood <= s.resources.stone * 1.6 && tree) clickNode(s, tree.id); else if (rock) clickNode(s, rock.id);
    }
    step(s);
    if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone');
    if (s.time >= nextBuy) {
      nextBuy = s.time + 1;
      for (const def of UPGRADES) {
        if (upgradeStatus(s, def) === 'available' && isDiscovered(s, def)) {
          const r = purchase(s, def.id);
          if (r.ok) { bought[def.id] = (bought[def.id] || 0) + 1; timeline.push({ t: Math.round(s.time), what: `kjøp: ${def.name}` }); log(`${fmt(s.time)} kjøp ${def.id}`); }
        }
      }
    }
    for (const m of MILESTONES) if (s.milestones[m.id] != null && !seenMs.has(m.id)) {
      seenMs.add(m.id); timeline.push({ t: Math.round(s.time), what: `milepæl: ${m.title}` }); log(`${fmt(s.time)} MILEPÆL ${m.id}`);
    }
    if (s.milestones[stopAt] != null) break;
    if (opts.sample && i % (opts.sample * 60) === 0) opts.sample && log(`  [${fmt(s.time)}] ${Object.entries(s.resources).map(([k, v]) => k + ':' + Math.floor(v)).join(' ')} folk:${s.humans.length} bos:${s.settlements.length}`);
  }
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
