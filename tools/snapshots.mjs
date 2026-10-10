// Ekte bot-gjennomspilling (ingen snarveier) som lagrer tilstanden ved faste milepæler til snap/<seed>-<navn>.json.
// Brukes til matchede før/etter-skjermbilder: bruk `TFG.loadFrom` etter å ha lagt filen i localStorage (se tools/shot.md).
// Bruk: node tools/snapshots.mjs [seed] [utmappe]
import fs from 'node:fs';
import { createGame, step } from '../src/sim/game.js';
import { makeBot } from './bot.js';
import { serialize } from '../src/sim/save.js';

const seed = Number(process.argv[2]) || 20261009, out = process.argv[3] || 'snap';
fs.mkdirSync(out, { recursive: true });
const POINTS = [
  ['shelter', (s) => s.milestones.first_home != null],
  ['village', (s) => s.milestones.first_village != null],
  ['town', (s) => s.milestones.first_town != null],
  ['city', (s) => s.milestones.city_rises != null],
  ['knowledge', (s) => s.milestones.age_of_knowledge != null],
  ['realm', (s) => s.milestones.connected_realm != null],
  ['world', (s) => s.milestones.first_world_civilization != null],
];
const s = createGame(seed), bot = makeBot();
let k = 0;
const stamp = (s) => `${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, '0')}`;
for (let i = 0; i < 60 * 9000 && k < POINTS.length; i++) {
  step(s);
  if (s.events.length > 256) s.events = s.events.filter((e) => e.type === 'milestone');
  bot.act(s);
  while (k < POINTS.length && POINTS[k][1](s)) {
    // La verden «sette seg» noen sekunder så byggene rundt milepælen er ferdige.
    const save = POINTS[k][0];
    fs.writeFileSync(`${out}/${seed}-${save}.json`, serialize(s));
    console.log(`${save} @ ${stamp(s)} folk ${s.humans.length} bygg ${s.buildings.length}`);
    k++;
  }
}
// Mer tid etter slutten: modent rike.
for (let i = 0; i < 60 * 300; i++) { step(s); if (s.events.length > 256) s.events = []; bot.act(s); }
fs.writeFileSync(`${out}/${seed}-mature.json`, serialize(s));
console.log(`mature @ ${stamp(s)} folk ${s.humans.length} bygg ${s.buildings.length}`);
