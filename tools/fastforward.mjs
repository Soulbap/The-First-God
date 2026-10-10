// Headless fast-forward: kjører den ekte simuleringen (src/sim/game.js) og den ekte spillerboten
// (tools/bot.js) uten rendering, animasjonsrammer eller ventetid. Tidssteget er det kanoniske (1/60 s).
// Bruk som API (runSeed) eller CLI:
//   node tools/fastforward.mjs 701,4242,20261009 14400      (parallelle prosesser, én per frø)
//   node tools/fastforward.mjs 701 14400 --until=refinery   (stopper når målmilepælen er nådd)
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';

// Milepæler i kjeden, i rekkefølge. Målet er å måle når hvert trinn skjer, ikke å tvinge det.
export const CHAIN = {
  industry: (s) => s.industrial.enabled,
  steam: (s) => s.buildings.some((b) => b.complete && b.type === 'steam_engine'),
  metalworks: (s) => s.buildings.some((b) => b.complete && b.type === 'metalworks'),
  oilWell: (s) => s.buildings.some((b) => b.complete && b.type === 'oil_well'),
  refinery: (s) => s.buildings.some((b) => b.complete && b.type === 'refinery'),
  combustion: (s) => s.buildings.some((b) => b.complete && b.type === 'combustion_engine'),
  generator: (s) => s.buildings.some((b) => b.complete && b.type === 'generator'),
  electricity: (s) => (s.industrial.litSettlements?.length || 0) > 0,
  precision: (s) => s.buildings.some((b) => b.complete && b.type === 'precision_works'),
  aircraft: (s) => s.totals.aircraft > 0,
  airfield: (s) => s.buildings.some((b) => b.complete && b.type === 'airfield'),
  survey: (s) => s.aviation.surveys >= 1,
  electronics: (s) => s.totals.electronics > 0,
  telegraph: (s) => s.buildings.some((b) => b.complete && b.type === 'telegraph'),
  institute: (s) => s.buildings.some((b) => b.complete && b.type === 'research_institute'),
};

// Ressurser som gir det beste bildet av stalling (lagerbeholdning ved hvert snapshot).
const WATCH = ['wood', 'stone', 'coal', 'copper', 'iron', 'copperOre', 'ironOre', 'tinOre', 'crudeOil', 'fuel', 'industrialMachinery', 'knowledge'];

// Kjører ett frø. `until` er en milepælsnøkkel fra CHAIN (eller null for full tid). Returnerer nøkkeltall.
export function runSeed({ seed, seconds = 14400, until = null, bot = true, snapshotEvery = 600, keepState = false }) {
  const s = createGame(seed), b = makeBot();
  const firstAt = {}, idle = {}, samples = [];
  const t0 = process.hrtime.bigint();
  let steps = 0, lastCheck = -1, nextSnap = snapshotEvery;
  const N = Math.round(seconds * 60); // kanonisk steg 1/60 s
  for (; steps < N; steps++) {
    step(s); // kanonisk tidssteg; ingen forkortelse av tid
    if (bot) b.act(s);
    if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone');
    const sec = Math.floor(s.time / 30);
    if (sec !== lastCheck) {
      lastCheck = sec;
      for (const [k, f] of Object.entries(CHAIN)) if (firstAt[k] == null && f(s)) firstAt[k] = Math.round(s.time);
    }
    if (s.time >= nextSnap) {
      nextSnap += snapshotEvery;
      const reasons = {};
      for (const x of s.buildings) if (x.complete && x.idle) reasons[`${x.type}:${x.idle}`] = (reasons[`${x.type}:${x.idle}`] || 0) + 1;
      samples.push({ t: Math.round(s.time), res: Object.fromEntries(WATCH.map((r) => [r, +(s.resources[r] || 0).toFixed(1)])), idle: reasons });
    }
    if (until && firstAt[until] != null) break;
  }
  const wallMs = Number(process.hrtime.bigint() - t0) / 1e6;
  // Stalling: en milepæl som ikke er nådd, mens den siste halvtimen ikke ga nye varer i kjeden.
  for (const x of samples) for (const k of Object.keys(x.idle)) idle[k] = (idle[k] || 0) + 1;
  return {
    seed, until, bot, simSeconds: Math.round(s.time), steps, wallMs: Math.round(wallMs),
    simHours: +(s.time / 3600).toFixed(3),
    simHoursPerWallSec: +((s.time / 3600) / (wallMs / 1000)).toFixed(3),
    firstAt, unreached: Object.keys(CHAIN).filter((k) => firstAt[k] == null),
    stalls: idle, lastSnapshot: samples.at(-1) || null,
    state: { folk: s.humans.length, buildings: s.buildings.length, time: s.time },
    ...(keepState ? { final: s } : {}),
  };
}

// Stabil fingeravtrykk av autoritativ tilstand (uten veggklokke og presentasjonshendelser).
export function fingerprint(s) {
  const { events, ...rest } = s;
  return JSON.stringify(rest, (k, v) => (v instanceof Float32Array ? Array.from(v) : v));
}

// CLI: hver seed i sin egen prosess, slik at flere kjerner brukes samtidig.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [seedsArg, secArg, ...rest] = process.argv.slice(2);
  const until = rest.find((a) => a.startsWith('--until='))?.slice(8) || null;
  const seeds = (seedsArg || '701').split(',').map(Number);
  const seconds = Number(secArg || 14400);
  if (seeds.length === 1) {
    console.log(JSON.stringify(runSeed({ seed: seeds[0], seconds, until })));
  } else {
    const t0 = Date.now();
    let done = 0; const out = [];
    for (const seed of seeds) {
      const child = fork(fileURLToPath(import.meta.url), [String(seed), String(seconds), ...(until ? [`--until=${until}`] : [])], { silent: false, stdio: ['ignore', 'pipe', 'inherit', 'ipc'] });
      let buf = '';
      child.stdout.on('data', (d) => { buf += d; });
      child.on('exit', () => {
        out.push(JSON.parse(buf.trim().split('\n').pop()));
        if (++done === seeds.length) {
          console.log(JSON.stringify(out.sort((a, b) => a.seed - b.seed), null, 1));
          console.error(`parallelt wall-tid: ${((Date.now() - t0) / 1000).toFixed(1)} s for ${seeds.length} frø`);
        }
      });
    }
  }
}
