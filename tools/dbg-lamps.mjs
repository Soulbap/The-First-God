import { runSeed } from './fastforward.mjs';
import { buildStreets, lampPosts } from '../src/render/streets.js';
const r = runSeed({ seed: 20261009, seconds: 21600, until: 'institute', keepState: true, snapshotEvery: 99999 });
const s = r.final, nets = buildStreets(s);
for (const n of nets) console.log(n.settlementId, n.rank, n.edges.length, JSON.stringify(n.edges.reduce((a, e) => (a[e.lv] = (a[e.lv] || 0) + 1, a), {})));
console.log('lamps', lampPosts(nets).length, 'time', s.time);
