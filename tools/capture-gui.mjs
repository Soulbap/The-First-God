// Utviklerverktøy: tar fullskjermbilder (verden + HUD) av faste spilltilstander via hodeløs Edge/Chrome og
// DevTools-protokollen. Ingen avhengigheter (Node 22+ har global WebSocket). Ikke del av spillet.
//
//   node tools/capture-gui.mjs <url> <utmappe> [suffiks]
//   f.eks. node tools/capture-gui.mjs http://localhost:5173 docs/gui-01 after
//
// Scenene bruker bare ?debug-krokene (TFG.*) og fungerer derfor også mot eldre versjoner av spillet.
// Simuleringen kjøres med TFG.advance (fast tidssteg) og farten settes til 0, så tilstanden er deterministisk.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [base = 'http://localhost:5173', outDir = 'docs/gui-01', suffix = ''] = process.argv.slice(2);
const smokeOnly = process.env.GUI_SMOKE_ONLY === '1';
const BROWSER = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333;

// Hver scene: navn, viewport og et skript som kjøres i siden. Skriptet kan returnere data som logges.
const SETUP = `
  const T = window.TFG; T.setSpeed(0);
  const C = T.state.settlement.center;
  const tree = T.state.nodes.find((n) => n.kind === 'tree' && n.growth === 1);
  const rock = T.state.nodes.find((n) => n.kind === 'rock');
  const open = (m) => { if (T.hud && T.hud.openPanel) T.hud.openPanel(m); else { const t = document.getElementById('drawer-toggle'); if (t && !t.hidden) t.click(); } };
  const close = () => { if (T.hud && T.hud.openPanel) T.hud.openPanel(null); else { const c = document.getElementById('drawer-close'); if (c) c.click(); } };
  const settle = (s = 1) => T.tick(s);
  const quiet = () => { document.getElementById('toasts').innerHTML = ''; };
  const until = (pred, max = 240) => { for (let i = 0; i < max * 2 && !pred(); i++) T.advance(0.5); };
  const gather = (w, s) => { for (let i = 0; i < w; i++) T.click(tree.id); for (let i = 0; i < s; i++) T.click(rock.id); };
  const set = (w, s) => { T.state.resources.wood = w; T.state.resources.stone = s; };
  const camp = () => T.view(C.x - 10, C.y - 30, 600);
`;
const DEFAULT_SCENES = [
  { name: '01-start-closed', w: 1920, h: 1080, js: `camp(); settle(1); quiet(); close();` },
  { name: '02-start-open', w: 1920, h: 1080, js: `camp(); gather(4, 2); settle(1); open('insights'); settle(0.5);` },
  { name: '03-unaffordable', w: 1920, h: 1080, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(7, 2); settle(1); quiet(); open('insights'); settle(0.5);` },
  { name: '04-first-humans', w: 1920, h: 1080, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); T.advance(45); settle(1); quiet(); open('insights'); settle(0.5);` },
  { name: '05-settlement', w: 1920, h: 1080, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening');
      T.advance(20); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete));
      set(30, 20); T.buy('new_home'); until(() => T.state.buildings.filter((b) => b.type === 'hut' && b.complete).length === 1); T.advance(30);
      set(44, 29); T.buy('new_home'); T.advance(8); set(14, 17); settle(1); quiet(); open('insights'); settle(0.5);` },
  { name: '06-milestones', w: 1920, h: 1080, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening');
      T.advance(20); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); T.advance(20); settle(1); quiet(); open('milestones'); settle(0.5);` },
  { name: '07-1366x768', w: 1366, h: 768, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening');
      T.advance(20); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete));
      set(30, 20); T.buy('new_home'); T.advance(10); set(25, 9); settle(1); quiet(); open('insights'); settle(0.5);` },
  { name: '08-1280x720', w: 1280, h: 720, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening');
      T.advance(20); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete));
      set(30, 20); T.buy('new_home'); T.advance(10); set(25, 9); settle(1); quiet(); open('insights'); settle(0.5);` },
  { name: '09-ragnarok', w: 1920, h: 1080, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); T.advance(30); settle(1); quiet();
      const b = document.querySelector('[data-nav="ragnarok"]') || document.getElementById('ragnarok-btn'); b.click(); settle(0.5);` },
];

// GAMEPLAY-02: faktiske, deterministiske progresjonsbilder — ikke arrangerte mockups.
const GAMEPLAY_02_SCENES = [
  { name: '01-initial-world', w: 1920, h: 1080, js: `camp(); settle(1); quiet(); close();` },
  { name: '02-inhabited-camp', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); T.advance(35); quiet(); close(); settle(1);` },
  { name: '03-storage-under-construction', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(52, 26); T.buy('shared_storage'); T.advance(9); quiet(); close(); settle(1);` },
  { name: '04-growing-settlement', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(900, 900); for (let i = 0; i < 2; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.advance(45); quiet(); close(); settle(1);` },
  { name: '05-first-village-milestone', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(900, 900); T.buy('hands_remember'); for (let i = 0; i < 3; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.buy('organized_labor'); T.state.events.length = 0; T.hud.reset(); T.buy('village_hearth'); until(() => T.state.milestones.first_village != null); camp(); settle(0.5);` },
  { name: '06-first-village-area', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(900, 900); T.buy('hands_remember'); for (let i = 0; i < 3; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.buy('organized_labor'); T.buy('village_hearth'); until(() => T.state.milestones.first_village != null); T.state.events.length = 0; T.hud.reset(); T.view(C.x, C.y - 40, 1850); T.advance(50); close(); settle(1);` },
];
// GAMEPLAY-03: samme ekte, deterministiske forløp, med landsbyliv og utforskning.
const GAMEPLAY_03_SCENES = [
  { name: '01-starting-world', w: 1920, h: 1080, js: `camp(); settle(1); quiet(); close();` },
  { name: '02-first-camp', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); T.advance(35); quiet(); close(); settle(1);` },
  { name: '03-growing-settlement', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(900, 900); T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); T.buy('shared_storage'); T.advance(12); quiet(); close(); settle(1);` },
  { name: '04-established-village', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(1200, 1200); T.buy('hands_remember'); for (let i = 0; i < 3; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.buy('organized_labor'); T.buy('village_hearth'); until(() => T.state.milestones.first_village != null); T.advance(130); quiet(); close(); camp(); settle(1);` },
  { name: '05-village-area-paths', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(1200, 1200); T.buy('hands_remember'); for (let i = 0; i < 3; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.buy('organized_labor'); T.buy('village_hearth'); until(() => T.state.milestones.first_village != null); T.advance(170); T.view(C.x, C.y - 30, 1800); quiet(); close(); settle(1);` },
  { name: '06-exploration', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(1400, 1400); T.buy('hands_remember'); for (let i = 0; i < 3; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.buy('organized_labor'); T.buy('village_hearth'); until(() => T.state.milestones.first_village != null); T.buy('explorer_urge'); until(() => T.state.humans.some((h) => h.state === 'toExplore' || h.state === 'explore')); T.advance(10); const h = T.state.humans.find((q) => q.state === 'toExplore' || q.state === 'explore'); T.state.events.length = 0; T.hud.reset(); T.view((C.x + h.x) / 2, (C.y + h.y) / 2 - 30, 900); quiet(); close(); settle(1);` },
];
const SCENES = process.env.GAMEPLAY_03 === '1' ? GAMEPLAY_03_SCENES : process.env.GAMEPLAY_02 === '1' ? GAMEPLAY_02_SCENES : DEFAULT_SCENES;
const ACTIVE_SCENES = process.env.CAPTURE_SCENES
  ? SCENES.filter((s) => process.env.CAPTURE_SCENES.split(',').some((name) => s.name.startsWith(name.trim())))
  : SCENES;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* nettleseren starter */ }
    await sleep(200);
  }
  throw new Error('Fant ikke nettleserens DevTools-port');
}

const errors = [];
function client(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(msg.params.entry.text);
  };
  const ready = new Promise((r) => { ws.onopen = r; });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  return { ready, send, close: () => ws.close() };
}

async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tfg-capture-'));
const browser = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--force-color-profile=srgb', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
fs.mkdirSync(outDir, { recursive: true });
try {
  const cdp = client(await connect());
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');
  for (const s of (smokeOnly ? [] : ACTIVE_SCENES)) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.navigate', { url: `${base}/?debug` });
    for (let i = 0; i < 300; i++) {
      if (await evaluate(cdp, `!!window.TFG`).catch(() => false)) break;
      await sleep(100);
    }
    await evaluate(cdp, `(async () => { ${SETUP} ${s.js}; T.setSpeed(1); T.tick(0.2); })()`); // vis normal fart i bildet
    await sleep(400); // la CSS-overganger bli ferdige
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
    const file = path.join(outDir, `${s.name}${suffix ? '-' + suffix : ''}.jpg`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log('lagret', file);
  }
  // Den samme ekte Edge-siden kjører den utvidede samhandlingskontrollen. Dette
  // holder nettleser-røyktesten repeterbar uten å gjøre den til en Node-/DOM-test.
  await cdp.send('Page.navigate', { url: `${base}/?debug` });
  for (let i = 0; i < 300; i++) {
    if (await evaluate(cdp, `!!window.TFG`).catch(() => false)) break;
    await sleep(100);
  }
  const smoke = await evaluate(cdp, `(async () => await (await import('/tools/gui-smoke.js')).run())()`);
  console.log(`GUI-røykprøve: ${smoke.pass}/${smoke.results.length}; feil: ${smoke.fail.join(', ') || 'ingen'}`);
  const renderStats = await evaluate(cdp, `({ frameMs: window.TFG.renderStats.frameMs, ecologyRefreshMs: window.TFG.renderStats.ecologyRefreshMs })`);
  console.log(`Rendermåling (nåværende scene): ${renderStats.frameMs.toFixed(2)} ms/bilde; miljøoppdatering ${renderStats.ecologyRefreshMs.toFixed(2)} ms.`);
  cdp.close();
  console.log(errors.length ? `Konsollfeil:\n${errors.join('\n')}` : 'Ingen konsollfeil.');
} finally {
  browser.kill();
}
