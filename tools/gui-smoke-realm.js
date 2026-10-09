// Utviklerverktøy: samhandlingskontroll av Rike-panelet og verdensoversikten (GAMEPLAY-07..10) i en ekte nettleser (?debug).
// Spiller med boten (ingen snarveier). Konsoll: await (await import('/tools/gui-smoke-realm.js')).run()
import { makeBot, playTo } from './bot.js';

export async function run() {
  const T = window.TFG;
  const $ = (s) => document.querySelector(s);
  const results = [];
  const ok = (name, cond) => results.push({ name, ok: !!cond });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k, bubbles: true }));
  const wheel = (dy) => $('#world').dispatchEvent(new WheelEvent('wheel', { deltaY: dy, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true, cancelable: true }));
  T.setSpeed(0);
  if (T.hud.panel) T.hud.openPanel(null);
  T.tick(0.3);
  ok('Rike-knappen er skjult tidlig i spillet', $('[data-nav="realm"]').hidden);
  ok('Verden-knappen er skjult før riket henger sammen', $('[data-view="world"]').hidden);
  ok('V gjør ingenting før oversikten er åpnet', (key('v'), T.tick(0.2), !T.isOverview));

  const bot = makeBot();
  playTo(T.state, bot, 'connected_realm', 14400);
  T.tick(0.3); T.cancelGlide(); T.hud.reset(); T.state.events.length = 0; T.tick(0.5); T.hud.openPanel(null); T.cancelGlide();
  ok('Rike-knappen vises etter Sivilisasjonens morgen', !$('[data-nav="realm"]').hidden);
  ok('Verden-knappen vises etter Et sammenhengende rike', !$('[data-view="world"]').hidden);

  // Tegnetid i seks synsvinkler (gjennomsnitt over 90 bilder hver) i et sent spill med fire bosettinger.
  const perf = {};
  const C0 = T.state.settlement.center;
  for (const [name, f] of [['nær (820)', () => { T.overview(false); T.view(C0.x, C0.y, 820); }], ['område (2300)', () => { T.overview(false); T.view(C0.x + 40, C0.y - 20, 2300); }], ['verden (planet)', () => T.overview(true)]]) {
    f(); T.tick(1); T.renderStats.frameMs = 0; T.tick(3);
    perf[name] = Number((name.startsWith('verden') ? (T.isGlobe ? T.renderStats.globeMs : T.renderStats.overviewMs) : T.renderStats.frameMs).toFixed(2));
  }
  T.overview(false); T.view(C0.x, C0.y, 820);
  $('[data-nav="realm"]').click(); T.tick(0.3); await wait(450);
  const txt = $('#realm-panel').innerText;
  ok('Rike-panelet viser sivilisasjonstrinn, bosettinger og forbindelser', /Sammenhengende rike/.test(txt) && /Bosettinger \(4\)/i.test(txt) && /Forbindelser/i.test(txt));
  ok('Rike-panelet viser roller per bosetting', /Kunnskapssete/.test(txt) && /Sagbruksbygd|Steinhoggerbygd|Matbygda/.test(txt));
  const r = $('#drawer').getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + 40);
  ok('panelet fanger pekeren i Rike', hit && hit.closest('#drawer'));
  key('Escape'); T.tick(0.3); await wait(300);
  ok('Escape lukker Rike-panelet', !$('#drawer').classList.contains('open'));

  $('[data-view="world"]').click(); T.tick(0.3);
  ok('Verden-knappen åpner oversikten', T.isOverview && $('[data-view="world"]').classList.contains('on'));
  ok('oversikten pauser ikke spillet og sperrer ikke menyene', !$('#hud').inert && !$('[data-nav="insights"]').disabled);
  const t0 = T.state.time; T.setSpeed(1); T.tick(2); T.setSpeed(0);
  ok('simuleringen går videre i oversikten', T.state.time > t0 + 1.5);
  ok('klikk på verdenskartet klikker ikke bort ressurser (ingen sanking)', (() => { const n = T.state.totals.manualClicks; const c = $('#world'); c.dispatchEvent(new PointerEvent('pointerdown', { clientX: 600, clientY: 400, button: 0, pointerId: 1, bubbles: true })); c.dispatchEvent(new PointerEvent('pointerup', { clientX: 600, clientY: 400, button: 0, pointerId: 1, bubbles: true })); return T.state.totals.manualClicks === n; })());
  // OPUS-01: planetvisningen zoomer sammenhengende; rull inn til kameraet når bakken og den detaljerte verdenen tar over.
  for (let i = 0; i < 60 && T.isOverview; i++) { wheel(-120); T.tick(0.1); }
  T.tick(3);
  ok('å zoome inn forlater planetvisningen (sammenhengende zoom tilbake til landskapet)', !T.isOverview);
  ok('etter retur står kameraet over hjemmet i områdevisning', Math.hypot(T.cam.x - T.state.settlement.center.x, T.cam.y - T.state.settlement.center.y) < 400 && T.cam.w > 1500);
  key('v'); T.tick(0.3);
  ok('V åpner oversikten', T.isOverview);
  ok('V åpner planeten (WebGL)', T.isGlobe === T.hasWebGL);
  T.tick(4); // la kameraet løfte seg
  const hUp = T.globe ? T.globe.h : 0;
  for (let i = 0; i < 4; i++) { wheel(240); T.tick(0.1); }
  ok('rulling ut i planetvisningen løfter kameraet høyere (mot hele kloden)', !T.hasWebGL || T.globe.h > hUp);
  $('[data-view="area"]').click(); T.tick(3.5);
  ok('Område-knappen gir trygg retur til landskapet', !T.isOverview);
  $('[data-view="near"]').click(); T.tick(0.3);
  ok('Nær-knappen virker etter oversikten', !T.isOverview);
  T.view(T.state.settlement.center.x, T.state.settlement.center.y, 2300); T.tick(0.2);
  wheel(120); T.tick(0.3);
  ok('å zoome ut forbi områdevisningen løfter kameraet til planeten', T.isOverview);
  T.tick(4);
  ok('planetvisningen tegner uten feil og bruker under 16 ms per bilde', (T.renderStats.globeMs || 0) < 16);

  T.overview(false); T.tick(0.3);
  ok('debug-retur fra planeten gir landskapet', !T.isOverview);
  $('[data-nav="ragnarok"]').click(); T.tick(0.3);
  $('#ragnarok-confirm').click(); T.tick(0.5);
  ok('Ragnarok fra oversikten gir en ny syklus uten oversikt, Rike-knapp eller verdensknapp', !T.isOverview && T.state.settlements.length === 1 && $('[data-nav="realm"]').hidden && $('[data-view="world"]').hidden);
  ok('ny syklus: verdenskartet er nullstilt', T.state.globe.regions.filter((q) => !q.home && q.state !== 'ukjent').length === 0 && T.state.resources.knowledge === 0);

  // Normal og akselerert fart gir samme simulering (hovedløkka tar bare flere faste steg per bilde).
  const snap = () => { const st = T.state; return JSON.stringify({ t: Math.round(st.time * 60), trees: st.nodes.filter((n) => n.kind === 'tree').length, growth: Math.round(st.nodes.reduce((a, n) => a + (n.growth || 0), 0) * 1000), w: st.resources.wood, st: st.resources.stone }); };
  const play = (speed, seconds) => { T.setSpeed(speed); T.tick(seconds); T.setSpeed(0); return snap(); };
  $('[data-nav="ragnarok"]').click(); T.tick(0.2); $('#ragnarok-confirm').click(); T.tick(0.2);
  const a = play(1, 90);
  $('[data-nav="ragnarok"]').click(); T.tick(0.2); $('#ragnarok-confirm').click(); T.tick(0.2);
  const b = play(4, 22.5);
  ok('1× og 4× gir samme verdenstilstand etter like lang spilltid', a === b);
  $('[data-nav="ragnarok"]').click(); T.tick(0.2); $('#ragnarok-confirm').click(); T.tick(0.2);
  const t1 = performance.now(); T.setSpeed(4); T.tick(30); T.setSpeed(0);
  const perFrame = (performance.now() - t1) / (30 * 30);
  T.__perFrame = perFrame;
  ok(`4× i hovedløkka holder bildetiden under 16 ms (målt ${perFrame.toFixed(1)} ms/bilde inkl. tegning)`, perFrame < 16);

  return { perf, pass: results.filter((x) => x.ok).length, fail: results.filter((x) => !x.ok).map((x) => x.name), results };
}
