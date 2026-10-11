// OPUS-12 · Bosettingsrapport: trinn, folk, bygg, gatenett og dekke, økonomisk identitet. Ekte simulering og bot.
//   node tools/city-report.mjs 20261009 7200
import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';
import { roadStats } from '../src/sim/streets.js';
const [seedArg, secArg] = process.argv.slice(2);
const s = createGame(Number(seedArg || 20261009)), bot = makeBot();
const N = Math.round(Number(secArg || 7200) * 60);
for (let i = 0; i < N; i++) { step(s); bot.act(s); if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone'); }
for (const S of s.settlements) {
  const bs = s.buildings.filter((b) => (b.settlementId || 'first') === S.id && b.complete);
  const types = {}; for (const b of bs) types[b.type] = (types[b.type] || 0) + 1;
  console.log(S.id, S.stage, S.role, 'pop', S.population.length, JSON.stringify(types), JSON.stringify(roadStats(S)), S.roadsBuilt || 0, S.identity || '', JSON.stringify(S.districts || {}));
}
