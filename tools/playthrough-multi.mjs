// OPUS-02: kjører boten på flere frø og skriver milepælstider, ressursregnskap og avvik (negative beholdninger, fastlåsing).
// Bruk: node tools/playthrough-multi.mjs [frø…]   (standard: seks frø)
import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';
import { MILESTONES } from '../src/data/upgrades.js';
import { serialize, deserialize } from '../src/sim/save.js';

const seeds = process.argv.slice(2).map(Number).filter(Boolean);
if (!seeds.length) seeds.push(20261009, 1, 7, 34, 100, 2026);
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const ids = ['first_village', 'first_town', 'city_rises', 'age_of_knowledge', 'connected_realm', 'first_world_civilization'];
const rows = [];
for (const seed of seeds) {
  const s = createGame(seed), bot = makeBot();
  let negative = 0, maxStall = 0, lastChange = 0, lastSig = '';
  for (let i = 0; i < 60 * 9000 && s.milestones.first_world_civilization == null; i++) {
    step(s);
    if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone');
    bot.act(s);
    if (i % 60 === 0) {
      for (const v of Object.values(s.resources)) if (v < -1e-6) negative++;
      const sig = `${Object.keys(s.milestones).length}|${s.buildings.length}|${s.humans.length}|${s.globe.stats.discovered}|${s.globe.stats.outposts}|${Object.keys(s.upgrades).length}`;
      if (sig !== lastSig) { lastSig = sig; lastChange = s.time; } else maxStall = Math.max(maxStall, s.time - lastChange);
    }
  }
  // Fortsett 5 min etter slutten og test lagring/lasting.
  for (let i = 0; i < 60 * 300; i++) { step(s); if (s.events.length > 256) s.events = []; bot.act(s); }
  const t = deserialize(serialize(s));
  const row = { seed, times: ids.map((id) => (s.milestones[id] != null ? fmt(s.milestones[id]) : '–')), folk: s.humans.length, bygg: s.buildings.length, urban: s.buildings.filter((b) => String(b.source).startsWith('urban:')).length, sanct: s.buildings.filter((b) => b.type === 'sanctuary' && b.complete).length,
    pp: Math.floor(s.resources.pp), wood: Math.floor(s.resources.wood), stone: Math.floor(s.resources.stone), negative, stallMin: (maxStall / 60).toFixed(1), kronikk: s.chronicle.entries.length, festivaler: s.civilization.festivals, load: !!t && t.buildings.length === s.buildings.length };
  rows.push(row);
  console.log(JSON.stringify(row));
}
console.log('\n| frø | ' + ids.join(' | ') + ' | folk | bygg | byvekst | helligdom | PP | maks stillstand (min) | negative | kronikk | festivaler | lagring ok |');
for (const r of rows) console.log(`| ${r.seed} | ${r.times.join(' | ')} | ${r.folk} | ${r.bygg} | ${r.urban} | ${r.sanct} | ${r.pp} | ${r.stallMin} | ${r.negative} | ${r.kronikk} | ${r.festivaler} | ${r.load} |`);
