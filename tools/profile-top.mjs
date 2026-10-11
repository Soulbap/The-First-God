// OPUS-12 · Viser de dyreste funksjonene i en .cpuprofile (selvtid), gruppert per funksjon og fil.
//   node --cpu-prof --cpu-prof-dir=<mappe> tools/progression-report.mjs 20261009 7200 --json   (lager en profil)
//   node tools/profile-top.mjs <profil.cpuprofile> [antall]
import fs from 'node:fs';
const [file, nArg] = process.argv.slice(2);
const prof = JSON.parse(fs.readFileSync(file, 'utf8'));
const byId = new Map(prof.nodes.map((n) => [n.id, n]));
const self = new Map();
for (let i = 0; i < prof.samples.length; i++) self.set(prof.samples[i], (self.get(prof.samples[i]) || 0) + (prof.timeDeltas[i] || 0));
const agg = new Map();
let total = 0;
for (const [id, t] of self) {
  const n = byId.get(id), f = n.callFrame, key = `${f.functionName || '(anonym)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`;
  agg.set(key, (agg.get(key) || 0) + t); total += t;
}
const top = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(nArg || 15));
for (const [k, t] of top) console.log(`${(t / 1000).toFixed(0).padStart(7)} ms  ${(100 * t / total).toFixed(1).padStart(5)} %  ${k}`);
console.log(`total ${(total / 1000).toFixed(0)} ms`);
