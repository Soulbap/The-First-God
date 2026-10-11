// OPUS-12C · Reproduserbar byformrapport fra den ekte simuleringen og boten.
// node tools/urban-metrics.mjs 701 21600
import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';
import { isHome } from '../src/sim/settlements.js';
import { urbanFabric } from '../src/sim/urban-fabric.js';
import { roadStats } from '../src/sim/streets.js';

const [seedArg, secondsArg] = process.argv.slice(2);
const state = createGame(Number(seedArg || 701)), bot = makeBot();
const ticks = Math.round(Number(secondsArg || 21600) * 60);
for (let i = 0; i < ticks; i++) { step(state); bot.act(state); if (state.events.length > 256) state.events = state.events.filter((e) => e.type === 'milestone'); }
const rows = state.settlements.filter((S) => S.state === 'active').map((S) => {
  const bs = state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === S.id && b.type !== 'field');
  const homes = bs.filter(isHome), fabric = urbanFabric(state, S), roads = roadStats(S);
  const near = homes.flatMap((a, i) => homes.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y)));
  const xs = bs.map((b) => b.x), ys = bs.map((b) => b.y), area = bs.length ? (Math.max(...xs) - Math.min(...xs) + 80) * (Math.max(...ys) - Math.min(...ys) + 80) : 0;
  // Eldre bygg er koblet med døren på gaten (avstand 0); nye infill-tomter
  // ligger med fasaden litt ved siden av. Begge er meningsfull gateadgang.
  const aligned = fabric.fronts.filter((f) => f.distance <= 92).length;
  return { id: S.id, stage: S.stage, population: S.population.length, buildings: bs.length, homes: homes.length, roads: roads.edges, streetLength: Math.round((S.net?.edges || []).reduce((n, e) => n + e.len, 0)), builtArea: Math.round(area), density: area ? +(bs.length / area * 10000).toFixed(2) : 0, averageHomeSeparation: near.length ? +((near.reduce((a, b) => a + b, 0) / near.length).toFixed(1)) : 0, frontageAligned: `${aligned}/${homes.length}`, frontageCoverage: homes.length ? +(aligned / homes.length * 100).toFixed(1) : 0, frontageClusters: fabric.clusters, redevelopment: state.renovation.consolidated || 0 };
});
console.log(JSON.stringify({ seed: state.seed, simHours: +(state.time / 3600).toFixed(3), institute: state.buildings.some((b) => b.type === 'research_institute' && b.complete), settlements: rows }, null, 2));
