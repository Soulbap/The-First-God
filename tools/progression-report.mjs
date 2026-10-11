// OPUS-11 · Fremdriftsrapport per frø. Kjører den ekte simuleringen og den ekte spillerboten (ingen snarveier, ingen gaver) og skriver
// en markdown-tabell med milepæler, befolkning, boligtrinn, ressurser, regionale lagre, transport og flaskehalser.
//   node tools/progression-report.mjs 701,4242,20261009 21600 [--json] [--until=institute]
// Hver frø kjører i egen prosess (parallelt). Veggtid og gjennomstrømning måles per frø.
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
import { runSeed, CHAIN } from './fastforward.mjs';
import { tierOf } from '../src/sim/renovation.js';
import { housingCapacity, isHome } from '../src/sim/settlements.js';
import { siteStats } from '../src/sim/construction.js';
import { roadStats } from '../src/sim/streets.js';

function measure(seed, seconds, until) {
  const r = runSeed({ seed, seconds, until, keepState: true, snapshotEvery: 900 });
  const s = r.final;
  const tiers = {};
  for (const b of s.buildings.filter((q) => q.complete && isHome(q))) { const k = `t${tierOf(b)}${b.heritage ? 'H' : ''}`; tiers[k] = (tiers[k] || 0) + 1; }
  const regions = s.globe.regions.filter((q) => q.state === 'utpost' || q.state === 'etablert');
  const res = Object.fromEntries(['wood', 'stone', 'coal', 'iron', 'copper', 'ironOre', 'copperOre', 'crudeOil', 'fuel', 'planks', 'industrialMachinery', 'electronics'].map((k) => [k, Math.round(s.resources[k] || 0)]));
  const veins = {};
  for (const n of s.nodes.filter((q) => q.kind === 'mineral')) { const v = (veins[n.mineral] ||= { left: 0, max: 0, n: 0 }); v.left += n.amount; v.max += n.maxAmount; v.n++; }
  const first = Object.entries(CHAIN).find(([k]) => r.firstAt[k] == null)?.[0] || null;
  const topIdle = Object.entries(r.stalls).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}×${v}`);
  return {
    seed, wallS: +(r.wallMs / 1000).toFixed(1), simH: r.simHours, simHPerWallS: r.simHoursPerWallSec, steps: r.steps,
    firstAt: r.firstAt, unreached: r.unreached, firstUnreached: first, topIdle,
    population: s.humans.length, settlements: s.settlements.map((q) => `${q.id}:${q.stage}:${q.population.length}`), housing: s.settlements.map((q) => housingCapacity(s, q.id)),
    buildings: s.buildings.length, tiers, renovationsDone: s.renovation.done,
    res, veins: Object.fromEntries(Object.entries(veins).map(([k, v]) => [k, `${Math.round(v.left)}/${Math.round(v.max)} (${v.n} årer)`])),
    outposts: regions.map((q) => ({ id: q.id, biome: q.biome, pop: q.pop, homes: q.homes, extracted: Math.round(q.extracted), stock: Object.fromEntries(Object.entries(q.stock).map(([k, v]) => [k, Math.round(v)])) })),
    caravans: s.globe.stats.caravanDeliveries, maritime: s.globe.stats.maritimeDeliveries, discovered: s.globe.stats.discovered,
    rails: s.industrial.rails.length, roadTrips: s.industrial.roadTrips, fuelBurned: Math.round(s.industrial.fuelBurned), flights: s.aviation.flightsDone, surveys: s.aviation.surveys,
    lit: s.industrial.litSettlements, electronics: s.totals.electronics, research: Math.round(s.science.researchKnowledge || 0),
    siteSearches: siteStats.searches, siteSkipped: siteStats.skipped,
    trade: s.trade, stocks: Object.fromEntries(s.settlements.map((q) => [q.id, Object.fromEntries(Object.entries(q.id === 'first' ? s.resources : q.stock || {}).filter(([k, v]) => ['wood', 'stone', 'food', 'planks', 'cutstone', 'coal', 'ironOre', 'copperOre'].includes(k) && v >= 1).map(([k, v]) => [k, Math.round(v)]))])),
    roads: s.settlements.map((q) => `${q.id}:${JSON.stringify(roadStats(q).levels)}`),
  };
}

const fmtT = (t) => (t == null ? '–' : `${(t / 3600).toFixed(2)} t`);
export function markdown(rows, seconds) {
  const keys = Object.keys(CHAIN);
  const lines = [];
  lines.push(`Kjøring: ${seconds} s spilltid per frø, ekte bot, kanonisk steg 1/60 s.\n`);
  lines.push('| Frø | veggtid | spilltid/veggsek | folk | bosettinger | bygg | ombygde hjem | utposter | karavaner (hav) |');
  lines.push('|---|---:|---:|---:|---|---:|---:|---:|---:|');
  for (const r of rows) lines.push(`| ${r.seed} | ${r.wallS} s | ${(r.simH * 3600 / r.wallS).toFixed(0)} s | ${r.population} | ${r.settlements.join(', ')} | ${r.buildings} | ${r.renovationsDone} | ${r.outposts.length} | ${r.caravans} (${r.maritime}) |`);
  lines.push('\n**Milepæler (første gang):**\n');
  lines.push(`| Milepæl | ${rows.map((r) => r.seed).join(' | ')} |`); lines.push(`|---|${rows.map(() => '---:').join('|')}|`);
  for (const k of keys) lines.push(`| ${k} | ${rows.map((r) => fmtT(r.firstAt[k])).join(' | ')} |`);
  lines.push('\n**Tilstand ved slutt:**\n');
  for (const r of rows) {
    lines.push(`- **${r.seed}**: boligtrinn ${JSON.stringify(r.tiers)}; lagre ${JSON.stringify(r.res)}; årer igjen ${JSON.stringify(r.veins)}; lyse bosettinger ${JSON.stringify(r.lit)}; flyvninger ${r.flights}, luftmålinger ${r.surveys}, elektronikk ${r.electronics}, forskningskunnskap ${r.research}; lastebilturer ${r.roadTrips}, jernbaner ${r.rails}; flaskehals: ${r.unreached.length ? `første umåte milepæl «${r.firstUnreached}», mest inaktive: ${r.topIdle.join(', ')}` : 'ingen (hele kjeden nådd)'}; tomtesøk ${r.siteSearches}, hoppet over ${r.siteSkipped}.`);
  }
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [seedsArg, secArg, ...rest] = process.argv.slice(2);
  const seeds = (seedsArg || '701').split(',').map(Number), seconds = Number(secArg || 21600);
  const until = rest.find((a) => a.startsWith('--until='))?.slice(8) || null, json = rest.includes('--json');
  if (process.env.PROGRESS_CHILD) {
    console.log(JSON.stringify(measure(seeds[0], seconds, until)));
  } else {
    let done = 0; const out = [];
    for (const seed of seeds) {
      const child = fork(fileURLToPath(import.meta.url), [String(seed), String(seconds), ...rest], { env: { ...process.env, PROGRESS_CHILD: '1' }, silent: true });
      let buf = '';
      child.stdout.on('data', (d) => { buf += d; });
      child.on('exit', () => {
        out.push(JSON.parse(buf.trim().split('\n').pop()));
        if (++done === seeds.length) { out.sort((a, b) => a.seed - b.seed); console.log(json ? JSON.stringify(out, null, 1) : markdown(out, seconds)); }
      });
    }
  }
}
