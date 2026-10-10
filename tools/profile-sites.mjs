// Teller og tidtar tomtesøk (findBuildSite / siteIsValid) under en ekte, avgrenset kjøring.
// Bruk: node tools/profile-sites.mjs <frø> <sekunder>
import * as C from '../src/sim/construction.js';
import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';
const [seed = 20261009, secs = 3600] = process.argv.slice(2).map(Number);
const s = createGame(seed), b = makeBot();
const t0 = Date.now(); let last = t0;
for (let i = 0; i < secs * 60; i++) {
  step(s); b.act(s);
  if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone');
  if (i % 36000 === 35999) { console.log(`t=${Math.round(s.time)}s wall+${((Date.now() - last) / 1000).toFixed(1)}s bld=${s.buildings.length} nodes=${s.nodes.length} folk=${s.humans.length}`); last = Date.now(); }
}
console.log('total wall', ((Date.now() - t0) / 1000).toFixed(1));
