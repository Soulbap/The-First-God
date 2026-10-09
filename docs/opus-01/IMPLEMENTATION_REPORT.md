# OPUS-01 — Implementasjonsrapport

Gren: `feature/opus-01-living-world-transformation` (fra `feature/gameplay-07-10-world-expansion`, `8159882`). Ikke slått sammen med `main`. Ingen nye avhengigheter. `References/` finnes ikke i arbeidskopien og er ikke berørt; `package-lock.json` (uvedkommende, usporet) er ikke lagt til.

Tegnforklaring: **Implementert** = i koden; **Testet** = kontrollert med automatisk test eller faktisk nettleserkjøring (står hvilken); **Foreslått** = bare dokumentert.

## 1. Hva som er implementert

| Område | Endring | Filer | Testet |
|---|---|---|---|
| **Planet** | Deterministisk planetgeografi; hjemmeregionen som tangentflekk; land plassert i samme retning som ved kartkanten; overflate bakt i Web Worker | `src/sim/planet.js`, `src/render/planetTexture.js`, `src/render/planetWorker.js` | `tests/planet.test.js`; nettleser |
| **Planetvisning** | WebGL 1-shader (stråle–kule), levende øyeblikksbilde av verdenen, kjent/ukjent land, sol og nattlys, skyer, atmosfære, overlegg med navn/ruter/ekspedisjoner, valg med pekeren | `src/render/globe.js` | Nettleser (skjermbilder, røykprøve), visningsmodell i test |
| **Kamera og overganger** | Én høydeparameter fra region til planet; eksakt bredde ↔ høyde; sømløs inn- og utgang; glid, dra, klikk; avsløring ved riket og sluttmilepælen; reserve uten WebGL | `src/view/globe.js`, `src/main.js` | Test (projeksjon, overgang), nettleser |
| **Lagring** | Hele syklusen + meta i `localStorage`, hvert 20. s og ved skjuling; ingen offline-fremgang; versjon, frøkontroll, utfylling av manglende felt | `src/sim/save.js`, `src/main.js` | Test (rundtur gir identisk forløp), nettleser |
| **Velsignelser** | Fire varige PP-velsignelser, tre nivåer, synlige svar | `src/data/upgrades.js`, `src/sim/{nature,humans,worldmap,economy}.js`, `src/render/renderer.js` | `tests/opus.test.js`; bot kjøper alle |
| **Høstfest** | Matoverskudd → samling ved ildstedet, dobbel bønn, milepæl | `src/sim/civilization.js`, `src/sim/humans.js`, `src/data/{balance,upgrades}.js` | `tests/opus.test.js` |
| **Ragnarok-arv** | PrP-tildeling i simuleringen, fem ekko, kjøp i dialogen (avbryt forkaster), minnesteiner | `src/data/prestige.js`, `src/sim/legacy.js`, `src/sim/game.js`, `src/ui/hud.js`, `src/main.js` | `tests/opus.test.js`; nettleser (full flyt) |
| **Bosettingens soner** | Kjerne, boligklynger, verksteder mot råvaren, åker i utkanten | `src/sim/construction.js`, `src/data/balance.js` | `tests/opus.test.js`; skjermbilder |
| **Bakken husker** | Grusveier av mye brukte stier; brolagt torg; steinlagte gater i storbyen | `src/render/renderer.js` | Skjermbilder |
| **Møteplasser** | Folk besøker torg og hall | `src/sim/humans.js` | Indirekte (gjennomspilling, skjermbilder) |
| **Lyd** | Prosedyrisk vind, fugler, knitring, hammer, planetklang; M og knapp | `src/audio/ambience.js`, `src/main.js`, `index.html` | Nettleser: starter uten feil. **Ikke lyttet til.** |
| **Grensesnitt** | «Planet»-knapp, skalaetikett, lydknapp nede til venstre, kompakt bunnlinje på smale skjermer, Ragnarok-dialog med ekko og knapper som alltid er synlige | `index.html`, `src/ui/{hud,style,icons,insights}.js/css` | Skjermbilder 1920/1366/1280; GUI-røykprøve |
| **Rettelser** | Negativ beholdning ved regionale leveranser; zoomgrense etter tilstand; rulling avbrøt egen utgang | `src/sim/regional.js`, `src/main.js` | Gjennomspilling (minimum ≥ 0 for alle ressurser), røykprøve |
| **Ytelse** | Slitasjelaget (grus/torg) omskrevet uten funksjonskall per piksel | `src/render/renderer.js` | Målt i nettleser (se §4) |

## 2. Spilleffekter

- PP har en bruk fra ~5 min; mat har en bruk fra ~30 min; PrP har en bruk ved hver Ragnarok.
- Bot-gjennomspilling 80–97 min (sju frø) mot 103–158 min; ingen hull over 8,5 min (før ~21 min). Detaljer: `PLAYTEST_REPORT.md`.
- Ingen milepæl eller innsikt er fjernet. Alle 36 innsikter kjøpes og alle 16 milepæler nås i en vanlig gjennomspilling (test).

## 3. Visuelle endringer (vurdert mot faktiske skjermbilder)

Før/etter i `docs/opus-01/screenshots/` (`*-before.jpg` fra `8159882`, `*-after.jpg` fra denne grenen; samme scene, samme bot, samme frø).

| Scene | Vurdering |
|---|---|
| 01 tidlig bosetting | Lik før/etter (bevisst — åpningen var allerede god). |
| 02 utviklet landsby | Tettere: hyttene i klynge rundt ildstedet, lageret nær. |
| 03 første by | Kompakt kjerne, brolagt torg, folk på torget; verksteder samlet mot skogen. Før: jevn ring med stor åpen lysning. |
| 04 moden by | Tydelig bysentrum med grusveier ut; fortsatt noe stor tråkket flate. |
| 05 regionalt nettverk | Byen leses som sentrum med veier mot satellittene. |
| 06 planet | **Før:** 15 rektangulære kort. **Etter:** en klode med hav, kontinenter, fjell, skyer og atmosfære; hjemmet og rutene til utpostene på riktig sted. |
| 07 utforskning | Kontinentet med navngitte land på ekte geografi, ekspedisjonen som prikk på vei, «?» der den kan dra. |
| 08 milepæl | Milepælsmeldingen over kontinentet (før: over kortene). |
| 09 Ragnarok | Dialogen viser tildeling, varig avtrykk og ekko; knappene alltid synlige. |
| t1–t5 overgang | Samme sted fra 2D-område via region og kontinent til hele planeten (første planetbilde = siste 2D-bilde). |
| s-1366/1280 | Ingen overlapp i bunnlinjen; dialog og planet lesbare. |

Visual quality gates (GAME_DESIGN §9): 1–4 og 7 vurderes som oppfylt i skjermbildene; 5 (zoom-kontinuitet) er nå oppfylt også på verdensnivå; 6 (stilmessig samsvar) **delvis** — planeten er dempet og malerisk i fargene, men kontinentnivået er mykere/uskarpere enn den detaljerte verdenen, og lundmønsteret kan leses som et repeterende mønster.

## 4. Ytelse (målt)

| Mål | Verdi | Hvor |
|---|---|---|
| Planet, hel kloden, inkl. GPU (`gl.finish`) | 4,5 ms/bilde | Nettleserpanel 1024×768 |
| Planet, kontinent / region | 5,6 / 7,8 ms/bilde | samme |
| 2D nær / område (rendrer) | 4,4–9,9 / 3,2–7,4 ms/bilde (spenn over tre kjøringer; variasjon fra andre prosesser på maskinen) | Hodeløs Edge 1920×1080 (røykprøve) |
| 4× fart i hovedløkka | under 16 ms/bilde (bestått) | røykprøve |
| Slitasjelaget, sent spill | 25 ms (før optimalisering 80 ms; baseline uten grus/torg 32 ms) | Nettleserpanel; kjøres hvert 0,5 s |
| Øyeblikksbilde for planeten | ~12 ms, hvert 1,2 s når planeten er nær | samme |
| Planetteksturer | ~5,8 s én gang per side, i Web Worker | Node |
| Simulering | ~2,5 s for en hel gjennomspilling i Node | `tools/playthrough.mjs` |

Kjent: slitasjelaget gir fortsatt en liten topp hvert 0,5 s i sent spill (eksisterte før; nå mindre).

## 5. Testresultater

- `npm test`: **106/106** (86 eksisterende + 12 planet/lagring + 8 OPUS). To eksisterende tester ble oppdatert fordi oppførselen bevisst endret seg: listen over kjente kravtyper (`ppTotal`, `festivals` lagt til) og milepælsteksten («Verden-oversikten» → «planetvisningen»). Ingen test ble svekket.
- Hodeløs Edge: **GUI-røykprøve 33/33**, **Rike/planet-røykprøve 27/27** (oppdatert til sammenhengende zoom: rull ut → planet, rull inn → tilbake over hjemmet, Område/Nær/V, Ragnarok fra planeten, 1× = 4×, ytelse), **ingen konsollfeil** i noen av kjøringene (før og etter).
- Ragnarok-flyten (forhåndsvisning, ekko, avbryt, bekreft, ren ny syklus, minnestein) er kjørt i nettleseren; se `PLAYTEST_REPORT.md` §4.

## 6. Begrensninger

- Planeten er en **visning**, ikke en planetsimulering; fjerne land er fortsatt et rutenett av tidtakere.
- Hjemmeflekken er et flatt bilde av 2D-verdenen; ingen 3D-bygg på planeten.
- Ingen WebGL → den gamle kartoversikten (ingen planet).
- Byggenes sprites er ikke tegnet på nytt.
- Lyden er ikke vurdert ved lytting.
- Balansetallene (velsignelser, fest, ekko, PrP) er provisoriske; ingen menneskelig spilltest.
- PP hoper seg opp når alle velsignelser er på maks.
- Solsystem/galakse finnes ikke ennå (arkitekturen er beskrevet).

## 7. Commits

Se `git log 8159882..HEAD`. Logiske steg: planet + lagring → spill og verden → lyd/kamera/tester → dokumentasjon og skjermbilder → polering og ytelse.
