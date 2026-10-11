// OPUS-12C.2 · Reproduserbar byformrapport fra ekte simulering og spillerbot.
// node tools/urban-metrics.mjs 2,5,77,701,909,4242,31337,20261009 21600
import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';
import { isHome, housingCapacity } from '../src/sim/settlements.js';
import { urbanMetrics, urbanPerf, frontageSites, urbanFabric } from '../src/sim/urban-fabric.js';
import { roadStats } from '../src/sim/streets.js';
import { siteIsValid } from '../src/sim/construction.js';
import { restructuringAnalysis } from '../src/sim/renovation.js';

const [seedArg = '701', secondsArg = '21600'] = process.argv.slice(2);
const seeds = seedArg.split(',').map(Number).filter(Number.isFinite), seconds = Number(secondsArg);
const untilInstitute = process.argv.includes('--until=institute');
const compact = process.argv.includes('--compact');

function settlementRow(state, S) {
  const bs = state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === S.id && b.type !== 'field');
  const homes = bs.filter(isHome), roads = roadStats(S), urban = urbanMetrics(state, S);
  const xs = bs.map((b) => b.x), ys = bs.map((b) => b.y), area = bs.length ? (Math.max(...xs) - Math.min(...xs) + 80) * (Math.max(...ys) - Math.min(...ys) + 80) : 0;
  const vacantDevelopableParcels = frontageSites(state, S, 34).filter((p) => siteIsValid(state, 'townhouse', p.x, p.y, S.id)).length;
  const fabric = urbanFabric(state, S), heritage = bs.filter((b) => b.heritage), analysis = restructuringAnalysis(state, S);
  const accessibleHeritage = heritage.filter((b) => fabric.fronts.find((f) => f.id === b.id)?.access).length;
  return { id: S.id, stage: S.stage, population: S.population.length, buildings: bs.length, homes: homes.length, housing: housingCapacity(state, S.id), roads: roads.edges, streetLength: Math.round((S.net?.edges || []).reduce((n, e) => n + e.len, 0)), developedArea: Math.round(area), developedDensity: area ? +(bs.length / area * 10000).toFixed(2) : 0, ...urban, vacantDevelopableParcels, redevelopmentEligible: analysis.eligible, restructuredParcels: homes.filter((b) => b.restructured).length, preservedLandmarks: heritage.length, accessibleLandmarks: accessibleHeritage };
}

const results = [];
for (const seed of seeds) {
  const state = createGame(seed), bot = makeBot(), ticks = Math.round(seconds * 60), wallStart = performance.now();
  for (let i = 0; i < ticks; i++) {
    step(state); bot.act(state);
    if (state.events.length > 256) state.events = state.events.filter((e) => e.type === 'milestone' || /restruct|consolid/.test(e.type));
    if (untilInstitute && state.buildings.some((b) => b.type === 'research_institute' && b.complete)) break;
  }
  results.push({
    seed, simHours: +(state.time / 3600).toFixed(3), wallSeconds: +((performance.now() - wallStart) / 1000).toFixed(3),
    institute: state.buildings.some((b) => b.type === 'research_institute' && b.complete), population: state.humans.length,
    buildings: state.buildings.filter((b) => b.complete).length,
    redevelopment: { attempted: state.renovation.attempted || 0, completed: state.renovation.restructured || 0, consolidated: state.renovation.consolidated || 0, capacityGained: state.renovation.capacityGained || 0, landEfficiencyGain: +(state.renovation.landEfficiencyGain || 0).toFixed(1), materialsSpent: state.renovation.materialsSpent || {}, labor: +(state.renovation.labor || 0).toFixed(1), rejected: state.renovation.rejected || {} },
    settlements: state.settlements.filter((S) => S.state === 'active').map((S) => settlementRow(state, S)),
  });
}

const planningPerformance = { rebuilds: urbanPerf.rebuilds, rebuildMs: +urbanPerf.rebuildMs.toFixed(3), siteCalls: urbanPerf.siteCalls, siteMs: +urbanPerf.siteMs.toFixed(3), redevelopmentCalls: urbanPerf.redevelopmentCalls, redevelopmentMs: +urbanPerf.redevelopmentMs.toFixed(3) };
const output = compact ? {
  seconds, untilInstitute,
  results: results.map((r) => ({ seed: r.seed, simHours: r.simHours, wallSeconds: r.wallSeconds, institute: r.institute, population: r.population, buildings: r.buildings, redevelopment: r.redevelopment, capital: r.settlements[0] })),
  planningPerformance,
} : { seconds, untilInstitute, results, planningPerformance };
console.log(JSON.stringify(output, null, 2));
