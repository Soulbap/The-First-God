# OPUS-01 — Designgjennomgang

Kritisk vurdering av THE FIRST GOD slik spillet sto på `feature/gameplay-07-10-world-expansion` (`8159882`), med prioriterte forbedringer og hva som ble valgt, utsatt eller avvist. Grunnlag: kodegjennomgang, faktiske skjermbilder fra `docs/gameplay-07..10/`, en målt baseline-gjennomspilling (seed 20261009) og researchen i `RESEARCH.md`.

## 1. Hva som allerede virket

- **Den nære verdenen.** Malerisk, dempet palett, forankrede sprites, trær som vokser, hugges og vokser igjen, røyk og ildlys. Visual quality gates 1–4 var stort sett oppfylt.
- **Ekte årsak → virkning.** Leveranser, karavaner og ekspedisjoner er faktiske figurer som går. Stiene er menneskenes egen slitasje — ikke tegnede linjer.
- **Autonomi uten mikrostyring.** Ingen byggplassering; tomtevalg, grunnleggelse og ruter oppstår av seg selv.
- **Progressiv avdekking** i grensesnittet (GUI-01/02): ingen døde knapper, ingen grå fremtidskort.
- **Determinisme og testbarhet.** Simuleringen kan spilles helt gjennom i Node på sekunder; 86 tester.

## 2. Hva som var svakt

| Problem | Hvorfor det betyr noe | Bevis |
|---|---|---|
| **Verdensnivået var rektangulære kort.** | Bryter pilar 4 «Skala uten brudd»: det største øyeblikket (å se at alt ligger på én verden) ble en statistikkskjerm. Kortene hadde ingen geografisk sammenheng med hjemmet. | `docs/gameplay-10/07..09` |
| **PP hadde ingen bruk.** | Bønn er relasjonen mellom folket og guden. 1032 PP lå ubrukt ved slutt. Gudefantasien manglet. | Baseline-gjennomspilling |
| **Mat hopet seg opp.** | 2572 mat ved slutt; ingen beslutning, ingen synlig følge av overskudd. | Samme |
| **Prestisje var en teller.** | PrP kunne ikke brukes; Ragnarok ga ingen grunn til ny syklus og ingen spor i verden. | `main.js` (gammel), GAME_DESIGN «Antakelser» |
| **Ingen lagring.** | En syklus på ~2 timer forsvant ved sideoppdatering. | README «Kjente begrensninger» |
| **Spredte bosettinger.** | Bygg i jevne ringer rundt bålet med stor åpen lysning; hjem, verksted og åker blandet. Byen så ikke ut som en by. | `docs/gameplay-07/01-developed-city.jpg` |
| **Stier modnet aldri.** | Ønskelinjer stoppet på «brun jord». Byens sentrum så ut som landsbyens. | Samme |
| **Dødtid 74 → 96 min.** | Spilleren ventet på tredje/fjerde bosetting mens trevirket hopet seg opp (318 → 1484). | Baseline |
| **Negativ beholdning.** | Stein sto på −1 ved 30:00 — regionale leveranser reserverte uten å sjekke. | Baseline |
| **Ingen lyd.** | Verden var stum. | — |

## 3. Forslag (minst ti), rangert

Skala 1–5 (5 = best for prioritering: høy effekt, lav innsats, lav risiko, høy kompatibilitet, høy langsiktig verdi).

| # | Forslag | Spillereffekt | Innsats (5 = lav) | Teknisk risiko (5 = lav) | Kompatibilitet | Langsiktig verdi | Beslutning |
|---|---|---|---|---|---|---|---|
| 1 | **Ekte planet + sømløs zoom fra den levende verdenen** | 5 | 2 | 3 | 4 | 5 | **Implementert** |
| 2 | **Velsignelser for PP (varige, med nivåer)** | 5 | 5 | 5 | 5 | 4 | **Implementert** |
| 3 | **Lagring uten offline-fremgang** | 5 | 4 | 4 | 5 | 5 | **Implementert** |
| 4 | **Ragnarok-ekko (PrP-butikk) + minnesteiner** | 4 | 4 | 4 | 5 | 5 | **Implementert** |
| 5 | **Sonevis bosetting (kjerne, boliger, verksted, åker)** | 4 | 4 | 3 | 4 | 4 | **Implementert** |
| 6 | **Ønskelinjer → grusvei; brolagt torg i byen** | 4 | 5 | 5 | 5 | 3 | **Implementert** |
| 7 | **Høstfest (matoverskudd → samling → dobbel bønn)** | 3 | 4 | 4 | 5 | 3 | **Implementert** |
| 8 | **Planetavsløring ved Et sammenhengende rike** | 5 | 5 | 4 | 5 | 4 | **Implementert** |
| 9 | **Prosedyrisk lyd med demping** | 3 | 4 | 5 | 5 | 3 | **Implementert (grunnlag)** |
| 10 | **Torg og hall som møteplasser** | 2 | 5 | 5 | 5 | 2 | **Implementert** |
| 11 | Rette negativ beholdning | 3 | 5 | 5 | 5 | 3 | **Implementert** |
| 12 | Dag/natt i nærbildet (vinduslys) | 4 | 3 | 3 | 4 | 4 | Lovende eksperiment (planeten har allerede dag/natt og nattlys) |
| 13 | Elver og veier på planeten mellom utposter | 3 | 3 | 3 | 5 | 3 | Senere |
| 14 | Synlige utposter som egne små scener | 3 | 2 | 3 | 4 | 3 | Senere |
| 15 | Navngitte innbyggere og «kronikk» over hendelser | 4 | 3 | 4 | 4 | 4 | Senere (stor tilknytningsgevinst) |
| 16 | Solsystemnivå | 4 | 1 | 2 | 4 | 5 | Senere — arkitekturen er forberedt |
| 17 | Negative hendelser (storm, sykdom) | 3 | 3 | 3 | 2 | 3 | Utsatt — krever designbeslutning (åpent spørsmål 4) |
| 18 | Aktive mirakler med nedkjøling | 3 | 4 | 4 | 2 | 2 | **Avvist** — prosjektansvarlig: «hovedsakelig et idle incremental game» |
| 19 | Offline-fremgang | 3 | 4 | 4 | 3 | 3 | **Avvist** av prosjektansvarlig |

## 4. Begrunnelse for de viktigste valgene

**Planeten (1, 8).** Det er spillets identitet. Valget falt på én WebGL-shader med analytisk kule fremfor Three.js (ingen ny avhengighet) og fremfor Canvas 2D per piksel (for tregt og uten sømløs overgang). Hjemmeregionen er en virkelig flekk på kulen, og planetkameraet starter med nøyaktig samme utsnitt som 2D-kameraet; se `PLANET_ARCHITECTURE.md`. Planeten viser *det folket vet*: kjent land i farger, ukjent land dempet — guden ser hele kloden, folket bare sitt hjørne. Ingen ny forvaltningssløyfe ble lagt til (lærdommen fra Spore).

**Velsignelser (2) i stedet for mirakler.** Idle-sjangeren belønner varige investeringer, ikke klikk. Hver velsignelse er en vanlig innsikt i Tro-kategorien, betales med PP, har tre nivåer med stigende pris (×2,2–2,4) og en synlig følge: regnskur og spirer, steinglimt i bruddene, medvind med løv, lys over verkstedene. Regn er billigst og kommer først (~5 min), slik at spilleren tidlig lærer at bønn betyr noe.

**Høstfest (7).** Lukker en åpen sløyfe: mat → fest → bønn → velsignelser. Den er automatisk (idle) og skjer bare når lagrene er fulle; den stanser aldri bygging (bygging har fortsatt prioritet).

**Ragnarok (4).** PrP kjøper fem valgfrie ekko (to fra GAME_DESIGN 6.3 — Gamle røtter, Ekko av bønner, Glemselens vennlighet, Stjernekart i asken — og Hendenes minne). Alle virker bare gjennom modifikatorer; startverdenen er identisk, og treet, steinen og det første lyet må fortsatt skapes. Ekkoene velges i Ragnarok-dialogen og gjelder først ved bekreftelse; avbryt forkaster valgene. Hver syklus etterlater en minnestein ved tjernets nordbredd — et varig avtrykk som ikke påvirker simuleringen.

**Bosettingens soner (5).** Spilleren velger fortsatt aldri sted. Tomtesøket er det samme deterministiske ringsøket, men blant de gyldige tomtene i de nærmeste ringene vinner den som passer sonen: hjem nær andre hjem og kjernen, verksteder mot råvaren (sagbruk mot skogens tyngdepunkt, steinhoggeri mot steinene), åker i utkanten nær annen åker, torg og hall så nær sentrum som mulig. Avstandskravet mellom bygg ble 14 i stedet for 18 og ringene for hjem/lager/bolighus starter nærmere.

**Tempo.** Fjerning av dødtid og de nye velsignelsene korter boten fra 113:36 til omtrent 80–90 min (se `PLAYTEST_REPORT.md`). Det største hullet mellom to hendelser er nå ~6 min (utposter som vokser), mot ~21 min før. Det er bevisst: idle-tempo med jevnlige små beslutninger, ikke en kortere opplevelse for enhver pris. En menneskelig spiller kjøper ikke alt i det øyeblikket det blir mulig, og bruker trolig 100–130 min.

## 5. Hva som bevisst ikke ble gjort

- Ingen nye ressurser, ingen nye produksjonskjeder, ingen negative hendelser.
- Ingen manuell plassering, områdemarkering eller arbeidsordre.
- Ingen ny avhengighet (heller ikke for WebGL eller lyd).
- Spritene for de enkelte byggene er ikke tegnet på nytt; lesbarheten ble forbedret gjennom komposisjon og bakke (soner, torg, veier) fordi det ga mest per innsatstime. Se `FUTURE_IDEAS.md`.
