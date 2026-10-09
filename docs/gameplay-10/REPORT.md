# GAMEPLAY-10 — Verdens daggry

Gren: `feature/gameplay-07-10-world-expansion` · Bygger på GAMEPLAY-09.

## Resultat

Sivilisasjonen har nå et sted å vokse utover. Den har en **verdensoversikt**, et deterministisk **verdenskart**, **ekspedisjoner** som går ut over kartkanten, **utposter** i fjerne land og **karavaner** som faktisk går inn og leverer. Det er en ærlig flermålsmodell, ikke en simulert planet.

## Flermålsmodellen (`src/sim/worldmap.js`)

- **Hjemmeregionen** er den detaljerte verdenen (ekte mennesker, bygg, ruter og terreng).
- **14 fjerne land** (5×3 rutenett med hjemmet i midten) er bare tilstand og tidtakere: *ukjent → oppdaget → utpost → etablert*. Biom (skog, fjell, slette, kyst, dal), rikdom og navn er deterministiske fra verdensfrøet.
- Ingen enkeltpersoner simuleres utenfor hjemmeregionen. Ferder er «borte» en tid som er proporsjonal med avstand (55 s/steg for ekspedisjon, 70 s/steg for utpost). Karavaner er de eneste figurene fra de fjerne landene, maks fire samtidig.

## Ekspansjon

| Innsikt | Krever | Kostnad | Følge |
|---|---|---|---|
| Hinsides de kjente landene | Et sammenhengende rike | 20 mat, 20 planker, 14 blokker, 50 kunnskap | tre ledige folk går ut over kartkanten, er borte, oppdager et naboland (kunnskap) og kommer hjem; 30 tre + 8 mat per ferd |
| Den store ekspedisjonen | to oppdagede land | 200 tre, 90 stein, 28 planker, 30 mat, 70 kunnskap | nybyggere (3) forlater hjemmeregionen for godt; 60 tre/30 stein/8 planker/8 mat per utpost |
| En forbundet verden | en utpost + to karavaner | 30 planker, 24 blokker, 30 mat, 100 kunnskap | karavaner +50 %, utposter kan vokse til 12, opptil fire utposter |

Utposter vokser (+1 folk/55 s, tak 8), blir *etablert* ved 6 og sender karavaner (46 s mellomrom; varer etter biom: skog = tre + planker, fjell = stein + blokker, slette = mat + tre, kyst = mat + kunnskap, dal = blandet). Karavaner går fra kartkanten til lageret og sliter bakken, leverer varene, og lager en rute i `state.network`. Ferder som ikke kommer fram avbrytes etter 6 min med refusjon.

## Oversikt og kamera (`src/view/overview.js`, `src/render/overview.js`)

Oversikten er en egen visning av *samme* spilltilstand: hjemmeregionen (ekte terreng og slitasje) som én rute, nabolandene som malte biomer, ukjente land som tåke (stiplet kant = mulig neste mål), bosettinger med etiketter, etablerte ruter i gull, ferder som en prikk på vei, utposter med små hus og karavaner. Åpnes med knappen **Verden**, tasten **V** eller ved å zoome ut forbi områdevisningen; zoom inn, **Område** eller **Nær** gir umiddelbar, sikker retur. Simuleringen pauses ikke. Kartleggingsmatematikken (rutenett, projeksjon, treff) er ren og testet.

**Sivilisasjonstrinn** (`src/sim/civstage.js`): Spirende samfunn → Regional sivilisasjon → Organisert sivilisasjon → Sammenhengende rike → Verdensbevisst sivilisasjon (≥ 2 land oppdaget og en utpost) → Verdens første sivilisasjon.

**Milepæl: Verdens første sivilisasjon** — Et sammenhengende rike, En forbundet verden, fire oppdagede land, to utposter og seks karavaneleveranser. Krever virkelig utforskning (testet: oppgraderingen alene er ikke nok).

## Tester

`tests/world.test.js` (14): determinisme, nabolagslogikk, ekspedisjonens fulle livssyklus uten tap av folk, utposter (nybyggere borte for godt, folketall i bosettingen følger med, karavaneregnskap, vekst til etablert), begrensninger, kartkantpunkter, oversiktsmatematikk for tre skjermstørrelser, kamera-retur, sluttmilepælens enkeltkrav, fullt spill med deterministisk gjentakelse, robusthet for andre frø, tjernomvei, Ragnarok. Smoke: `tools/gui-smoke-realm.js` 22/22 (knapp, V, hjul, pekersperre, retur, Ragnarok, 1× = 4×).

## Begrensninger

- De fjerne landene har ikke egne scener; de er kart og tall. Ingen konflikt, handelspriser eller klima.
- Ukjente land «oppdages» i fast prioritetsrekkefølge, ikke ved tilfeldig utforskning.
- Overviewen er funksjonell, ikke polert: ingen avanserte overganger, ingen musikk, etiketter kan krasje ved mange bosettinger i en liten rute.
- Neste naturlige steg (planet, solsystem) kan bruke samme mønster: ett nivå opp, ærlig forenkling, retur til detaljen.

## Skjermbilder

7. `07-beyond-start-exploration.jpg` — oversikt med oppdagede land, en ferd underveis og Rike-panelet.
8. `08-caravan-from-outpost.jpg` — en karavane fra et fjernt land går inn mot byen.
9. `09-final-milestone.jpg` — «Verdens første sivilisasjon» i oversikten.
10. `10-ragnarok-late-game.jpg` — Ragnarok-forhåndsvisningen sent i spillet, med alt som går tapt.
