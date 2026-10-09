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
  wheel(-120); T.tick(0.3);
  ok('å zoome inn forlater oversikten', !T.isOverview);
  key('v'); T.tick(0.3);
  ok('V åpner oversikten', T.isOverview);
  $('[data-view="area"]').click(); T.tick(0.3);
  ok('Område-knappen gir trygg retur til landskapet', !T.isOverview);
  $('[data-view="near"]').click(); T.tick(0.3);
  ok('Nær-knappen virker etter oversikten', !T.isOverview);
  T.view(T.state.settlement.center.x, T.state.settlement.center.y, 2300); T.tick(0.2);
  wheel(120); T.tick(0.3);
  ok('å zoome ut forbi områdevisningen åpner oversikten', T.isOverview);

  T.overview(false); T.tick(0.3);
  $('[data-nav="ragnarok"]').click(); T.tick(0.3);
  $('#ragnarok-confirm').click(); T.tick(0.5);
  ok('Ragnarok fra oversikten gir en ny syklus uten oversikt, Rike-knapp eller verdensknapp', !T.isOverview && T.state.settlements.length === 1 && $('[data-nav="realm"]').hidden && $('[data-view="world"]').hidden);
  ok('ny syklus: verdenskartet er nullstilt', T.state.globe.regions.filter((q) => !q.home && q.state !== 'ukjent').length === 0 && T.state.resources.knowledge === 0);

  return { pass: results.filter((x) => x.ok).length, fail: results.filter((x) => !x.ok).map((x) => x.name), results };
}
