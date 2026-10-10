// OPUS-02: matchede før/etter-skjermbilder fra samme frø. Tilstandene kommer fra EKTE bot-gjennomspilling
// (tools/snapshots.mjs → snap/<frø>-<navn>.json), ikke fra snarveier. Skriptene bruker bare kroker som finnes i begge versjonene.
//
//   node tools/capture-opus02.mjs <url> <utmappe> <suffiks> [scener]
//   f.eks. node tools/capture-opus02.mjs http://localhost:5181 docs/opus-02/screenshots after
//          CAPTURE_SEED=20261009 BROWSER_PATH=... node tools/capture-opus02.mjs http://localhost:5180 docs/opus-02/screenshots before 01,02,03
//
// Serveren må tjene snap/-mappen til versjonen den måler (generer med `node tools/snapshots.mjs 20261009 snap` i samme mappe).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [base = 'http://localhost:5181', outDir = 'docs/opus-02/screenshots', suffix = 'after', only = ''] = process.argv.slice(2);
const SEED = process.env.CAPTURE_SEED || '20261009';
const BROWSER = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = Number(process.env.CAPTURE_PORT) || 9344;
const W = Number(process.env.CAPTURE_W) || 1600, H = Number(process.env.CAPTURE_H) || 900;

const SETUP = `
  const T = window.TFG;
  const load = async (name) => { localStorage.setItem('tfg.dev.cap', await (await fetch('/snap/${SEED}-' + name + '.json?' + Date.now())).text()); T.loadFrom('cap'); T.setSpeed(0); T.state.events.length = 0; if (T.hud && T.hud.reset) T.hud.reset(); };
  const day = (p) => { if (T.setDay) T.setDay(p); };
  const settle = (n = 4) => { for (let i = 0; i < n; i++) T.tick(0.5); };
  const bySettlement = (role) => T.state.settlements.find((s) => s.role === role) || T.state.settlements[1];
  const close = () => { if (T.hud && T.hud.openPanel) T.hud.openPanel(null); };
  const planetAt = async (h, dlat = 0) => { await T.planetReady(); T.enterGlobe(false); const P = T.planet; T.globeView(P.home.lat + dlat, P.home.lon, h); for (let i = 0; i < 12; i++) T.tick(0.5); };
`;
const near = (w) => `const C = T.state.settlements[0]; T.view(C.x - 10, C.y + 20, ${w});`;
const SCENES = [
  ['01-first-shelter', `await load('shelter'); day(0.42); const C = T.state.settlement.center; T.view(C.x - 10, C.y - 30, 560); settle();`],
  ['02-growing-village', `await load('village'); day(0.45); const C = T.state.settlement.center; T.view(C.x - 10, C.y - 10, 760); settle();`],
  ['03-first-town', `await load('town'); day(0.45); ${near(860)} settle();`],
  ['04-first-city', `await load('city'); day(0.45); ${near(940)} settle();`],
  ['05-mature-city', `await load('mature'); day(0.45); ${near(1000)} settle();`],
  ['06-forestry-settlement', `await load('mature'); day(0.45); const s = bySettlement('Sagbruksbygd'); T.view(s.x, s.y + 30, 820); settle();`],
  ['07-stone-settlement', `await load('mature'); day(0.45); const s = bySettlement('Steinhoggerbygd'); T.view(s.x, s.y + 30, 820); settle();`],
  ['08-regional-network', `await load('mature'); day(0.45); T.view(1200, 840, 2250); settle();`],
  ['09a-transition-near', `await load('world'); day(0.5); const C = T.state.settlement.center; T.view(C.x + 40, C.y - 20, 1400); settle();`],
  ['09b-transition-area', `await load('world'); day(0.5); const C = T.state.settlement.center; T.view(C.x + 40, C.y - 20, 2300); settle();`],
  ['09c-transition-region', `await load('world'); day(0.5); await planetAt(0.11);`],
  ['09d-transition-continent-near', `await load('world'); day(0.5); await planetAt(0.3);`],
  ['10-continent', `await load('world'); day(0.5); await planetAt(0.8);`],
  ['11-planet-early-exploration', `await load('knowledge'); day(0.5); await planetAt(3.1, -0.05);`],
  ['12-planet-established', `await load('world'); day(0.5); await planetAt(3.1, -0.05);`],
  ['13-planet-night', `await load('world'); day(0.0); await planetAt(2.2, -0.05);`],
  ['14-ragnarok-aftermath', `await load('world'); day(0.45); document.querySelector('[data-nav="ragnarok"]').click(); settle(1); document.getElementById('ragnarok-confirm').click(); settle(2); close(); const C = T.state.settlement.center; T.view(C.x - 200, C.y + 160, 700); settle(3);`],
  ['15a-day-dawn', `await load('mature'); day(0.27); ${near(1000)} settle();`],
  ['15b-day-noon', `await load('mature'); day(0.5); ${near(1000)} settle();`],
  ['15c-day-dusk', `await load('mature'); day(0.72); ${near(1000)} settle();`],
  ['15d-day-night', `await load('mature'); day(0.0); ${near(1000)} settle();`],
];
const active = only ? SCENES.filter(([n]) => only.split(',').some((p) => n.startsWith(p.trim()))) : SCENES;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function connect() {
  for (let i = 0; i < 60; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const page = list.find((t) => t.type === 'page'); if (page) return page.webSocketDebuggerUrl; } catch { /* starter */ }
    await sleep(200);
  }
  throw new Error('Fant ikke DevTools-porten');
}
const errors = [];
function client(url) {
  const ws = new WebSocket(url); let id = 0; const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  };
  const ready = new Promise((r) => { ws.onopen = r; });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result))); ws.send(JSON.stringify({ id: n, method, params })); });
  return { ready, send, close: () => ws.close() };
}
const evaluate = async (cdp, expression) => {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tfg-cap2-'));
const browser = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--force-color-profile=srgb', '--no-first-run', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
fs.mkdirSync(outDir, { recursive: true });
try {
  const cdp = client(await connect());
  await cdp.ready;
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
  for (const [name, js] of active) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.navigate', { url: `${base}/?debug` });
    for (let i = 0; i < 300; i++) { if (await evaluate(cdp, '!!window.TFG').catch(() => false)) break; await sleep(100); }
    try {
      await evaluate(cdp, `(async () => { ${SETUP} ${js} })()`);
    } catch (e) { console.log('FEIL i scene', name, String(e).slice(0, 200)); continue; }
    await sleep(500);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 86 });
    const file = path.join(outDir, `${name}-${suffix}.jpg`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log('lagret', file);
  }
  cdp.close();
  console.log(errors.length ? `Konsollfeil:\n${[...new Set(errors)].join('\n')}` : 'Ingen konsollfeil.');
} finally { browser.kill(); }
