// Utviklerverktøy: samhandlingskontroll av HUD-en i en ekte nettleser (?debug). Ikke del av spillet.
// Konsoll: await (await import('/tools/gui-smoke.js')).run()
// Returnerer { pass, fail, results } og endrer spilltilstanden (last siden på nytt etterpå).
export async function run() {
  const T = window.TFG;
  const $ = (s) => document.querySelector(s);
  const results = [];
  const ok = (name, cond) => results.push({ name, ok: !!cond });
  const key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k, bubbles: true }));
  const settle = (s = 0.3) => T.tick(s);
  const drawerOpen = () => $('#drawer').classList.contains('open');
  const navIns = $('[data-nav="insights"]');

  T.setSpeed(0);
  if (T.hud.panel) T.hud.openPanel(null);
  settle();

  ok('panel lukket ved start', !drawerOpen() && $('#drawer').inert);
  ok('ingen Historikk i grensesnittet', !/histor/i.test(document.getElementById('hud').innerText));
  ok('Milepæler skjult før første milepæl', $('[data-nav="milestones"]').hidden);
  ok('Verden-knapp finnes ikke (ingen død navigasjon)', !$('[data-nav="world"]'));

  navIns.click(); settle();
  ok('Innsikter-knappen åpner panelet', drawerOpen() && navIns.getAttribute('aria-expanded') === 'true');
  ok('tom tilstand forklarer hva som skal til', !$('#insight-empty').hidden && $('#insight-list').children.length === 0);
  navIns.click(); settle();
  ok('Innsikter-knappen lukker panelet igjen', !drawerOpen());

  const tree = T.state.nodes.find((n) => n.kind === 'tree' && n.growth === 1);
  for (let i = 0; i < 3; i++) T.click(tree.id);
  T.advance(0.1); settle();
  navIns.click(); settle();
  const shelter = $('.card[data-id="first_shelter"]');
  ok('Første ly oppdaget etter sanking', !!shelter && shelter.classList.contains('is-unaffordable'));
  ok('NY-merke på nyoppdaget kort', shelter && !shelter.querySelector('.chip-new').hidden);
  ok('deaktivert knapp med forklaring', shelter.querySelector('.btn').disabled && /Mangler 7 trevirke og 5 stein/.test(shelter.innerText));
  ok('bare oppdagede kort vises', document.querySelectorAll('.card').length === 1);
  ok('ny innsikt vises som én betydningsfull melding', document.querySelectorAll('#toasts .toast').length <= 1);

  key('Escape'); settle();
  ok('Escape lukker panelet', !drawerOpen());
  ok('fokus tilbake til Innsikter-knappen', document.activeElement === navIns);
  navIns.click(); settle();
  ok('NY forsvinner når kortet er sett', $('.card[data-id="first_shelter"] .chip-new').hidden);

  T.give(20, 20); settle();
  const btn = $('.card[data-id="first_shelter"] .btn');
  ok('kjøpbart kort har aktiv gullknapp', !btn.disabled && btn.classList.contains('btn-gold') && btn.textContent === 'Bygg');
  ok('merke viser antall valg', $('[data-nav="insights"] .badge').textContent === '1');
  btn.click(); settle();
  ok('kjøp via knappen starter bygging', T.state.buildings.length === 1 && $('.card[data-id="first_shelter"]').classList.contains('is-building'));
  ok('kostnaden trukket nøyaktig', T.state.resources.wood === 13 && T.state.resources.stone === 15);
  T.advance(25); settle(0.5);
  ok('fullført engangsvalg forsvinner, Vekkelse dukker opp', !$('.card[data-id="first_shelter"]:not(.leave)') && !!$('.card[data-id="awakening"]'));
  ok('Milepæler-knappen dukker opp etter første milepæl', !$('[data-nav="milestones"]').hidden);

  T.give(40, 40); settle();
  $('.card[data-id="awakening"] .btn').click(); T.advance(1); settle();
  ok('faner vises når to kategorier har innhold', !$('#drawer-tabs').hidden && document.querySelectorAll('.tab').length === 3);
  $('.tab[data-tab="tro"]').click(); settle();
  const visible = [...document.querySelectorAll('.card:not(.leave)')].filter((c) => !c.hidden).map((c) => c.dataset.id);
  ok('Tro-fanen filtrerer kortene', visible.join() === 'common_fire');
  $('.tab[data-tab="all"]').click(); settle();
  ok('aktiv kategori faller tilbake når innholdet endrer seg', $('#drawer-tabs').querySelector('[aria-selected="true"]') != null);

  $('[data-nav="milestones"]').click(); settle();
  ok('Milepæler bytter innhold i samme panel', drawerOpen() && $('#drawer-title').textContent === 'Milepæler' && $('#milestone-list').children.length >= 1);
  $('#drawer-close').click(); settle();
  ok('lukkeknappen lukker panelet', !drawerOpen());

  $('[data-nav="ragnarok"]').click(); settle();
  ok('Ragnarok åpner frivillig forhåndsvisning', !$('#dialog').hidden && document.activeElement === $('#ragnarok-cancel'));
  key('Escape'); settle();
  ok('Escape avbryter Ragnarok uten å nullstille', $('#dialog').hidden && T.state.humans.length === 2);

  // Pekerhendelser lekker ikke gjennom panelet til verden.
  navIns.click(); settle();
  // Panelet glir inn med en CSS-overgang i sanntid; treffsjekken må vente til den er ferdig (ellers ligger panelet fortsatt utenfor skjermen).
  for (let i = 0; i < 40 && $('#drawer').getBoundingClientRect().right > innerWidth - 4; i++) await new Promise((res) => setTimeout(res, 50));
  const r = $('#drawer').getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + 40);
  ok('panelet fanger pekeren (ikke canvas)', hit && hit.closest('#drawer'));
  key('Escape'); settle();
  const c = document.getElementById('world');
  const mid = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  ok('verden er klikkbar når panelet er lukket', mid === c);

  $('[data-nav="ragnarok"]').click(); settle();
  $('#ragnarok-confirm').click(); settle();
  ok('bekreftet Ragnarok gir ny syklus i samme verden', T.state.humans.length === 0 && T.state.buildings.length === 0 && Object.keys(T.state.discovered).length === 0);
  ok('HUD nullstilt: ingen kort, Folk/PP/Milepæler skjult', document.querySelectorAll('.card:not(.leave)').length === 0 && !$('[data-res="people"]') && $('#divine').hidden && $('[data-nav="milestones"]').hidden);
  ok('Ragnarok rydder synlige varsler', document.querySelectorAll('#toasts .toast').length <= 1);

  return { pass: results.filter((x) => x.ok).length, fail: results.filter((x) => !x.ok).map((x) => x.name), results };
}
