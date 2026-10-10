// Utviklerverktøy: maler planetens lokale tekstur (med elver) til en PNG for visuell kontroll.
// Bruk: node tools/planetmap.mjs [frø] [utfil.png] [størrelse] [global]
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createGame } from '../src/sim/game.js';
import { createPlanet } from '../src/sim/planet.js';
import { bakeLocal, bakeGlobal } from '../src/render/planetTexture.js';

const seed = Number(process.argv[2]) || 20261009, out = process.argv[3] || 'snap/planet.png', size = Number(process.argv[4]) || 768, which = process.argv[5] || 'local';
const s = createGame(seed), P = createPlanet(seed, s.globe.regions);
const t0 = Date.now();
import { buildRivers } from '../src/sim/hydrology.js';
const tr = Date.now(); const rivers = buildRivers(P); console.log('elver:', rivers.paths.length, 'løp,', rivers.count, 'punkter på', Date.now() - tr, 'ms');
const tex = which === 'global' ? bakeGlobal(P, size, rivers) : bakeLocal(P, size, rivers);
console.log(`bakt ${which} ${tex.w}x${tex.h} på ${Date.now() - t0} ms`);
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
// Vis vann (alfa) som havfarge-glans og tegn alfa som egen kanal ved siden av? Kun RGB her.
const rgba = new Uint8ClampedArray(tex.data); for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
import path from 'node:path';
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png(tex.w, tex.h, rgba));
console.log('skrev', out);
