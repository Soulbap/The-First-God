// Utviklerverktøy: baker planetteksturene i Node og lagrer dem som snap/planet-<frø>.bin, slik at skjermbildeverktøy kan
// hoppe over bakingen i nettleseren (?debug&planet=/snap/planet-<frø>.bin). Ikke del av spillet.
import fs from 'node:fs';
import { createGame } from '../src/sim/game.js';
import { bakePlanet } from '../src/render/planetTexture.js';
const seed = Number(process.argv[2]) || 20261009;
const s = createGame(seed);
const plain = s.globe.regions.map((r) => ({ id: r.id, col: r.col, row: r.row, biome: r.biome, home: r.home }));
const t0 = Date.now(), o = bakePlanet(seed, plain);
const head = Buffer.alloc(20); head.writeUInt32LE(o.global.w, 0); head.writeUInt32LE(o.global.h, 4); head.writeUInt32LE(o.local.w, 8); head.writeFloatLE(o.local.span, 12);
fs.mkdirSync('snap', { recursive: true });
fs.writeFileSync(`snap/planet-${seed}.bin`, Buffer.concat([head, Buffer.from(o.global.data.buffer), Buffer.from(o.local.data.buffer)]));
console.log(`bakt på ${Date.now() - t0} ms → snap/planet-${seed}.bin`);
