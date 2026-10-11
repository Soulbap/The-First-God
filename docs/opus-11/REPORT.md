# OPUS-11 — Integrasjon, verdensutvikling og kvalitet

**Gren:** `feature/opus-11-civilization-integration` (fra `feature/opus-08-10-modern-civilization`). Ikke slått sammen med `main`; `References/` er ikke rørt; `package-lock.json` er fortsatt uspores og ikke stagget.

**Kort status:** Kjeden fra første ly til forskningsinstitutt er nå **faktisk gjennomførbar uten snarveier for alle åtte testede frø** (3,7–4,2 timer spilltid), tomtesøk-ytelsen er løst, og verden ser og oppfører seg vesentlig annerledes (landskap, avstand, luft, boligtrinn, industri, lys, besøkbare land). To krav er bare delvis oppfylt (full regional økonomi og fullt utbygde fjerne landsbilder); se kvalitetsportene nederst.

## 1. Grunnlag og funn

- **OPUS-08/09/10 var ikke committet.** `HEAD` var OPUS-07 (`5a738a5`); OPUS-08..10 lå som endringer i arbeidstreet (15 endrede og 9 nye filer). De er bevart uendret i en egen commit (`62b738c`, merket som øyeblikksbilde) før noe annet ble gjort. Den tidligere rapporten (`docs/opus-08-10/REPORT.md`) finnes ikke i repoet.
- **Baseline ble målt på nytt:** 178 tester, 175 består; de tre kjente feilene (`full spilling kjøper alt innhold`, `hvert kjent land ligger på land med sitt eget landskap`, `Kunnskapens tidsalder`) ble reprodusert. Full testpakke: 173 s.
- **De tre feilene var ikke «gamle»:** to var en test som spilte til en for tidlig milepæl og en effekttekst-heuristikk som ikke dekket de nye industrielle fremskrittene; den tredje (planetgeografien) var en ekte regresjon, se 4.
- **Arkitekturuoverensstemmelser dokumentert før de ble rørt:** (a) delt hjemmelager for alle bosettinger, (b) satellittbosettinger som fikk byvekst og ombygging betalt direkte fra hovedstaden, (c) lastebiler som fraktet varer mellom bosettinger uten at noe manglet, (d) utposter som sendte varer rett fra forekomsten, (e) luftmåling uten gyldig mål.

## 2. Ytelse (`localSite`)

Rotårsak: `findBuildSite`/`localSite` gjentok en full ringskanning i hvert 1/60-sekundssteg når det ikke fantes tomt. Samme mønster fantes i mølle-, brønn- og kaisøk.

- Mislykkede søk huskes i `state.siteMisses` så lenge verdens oppsett (id-teller, antall bygg og noder) er uendret, gjentas etter en kort ventetid, og søker da bredere (til 1000 enheter) i stedet for å gi opp. Minnet lagres med spillet, fordi radiusen avhenger av antall forsøk; ellers ville lagre/lese gitt et annet forløp. Et funn etter utvidelse beholder radiusen til oppsettet endres, slik at «sjekk, så bygg» alltid gir samme tomt.
- Måling: 4 timer spilltid på frø 20261009: **259–270 s → 61 s** (mens kjeden nå kommer langt lenger). Frø 701 og 4242: 36 s → 57 s for mye mer simulert innhold. Testpakken: 173 s → 82–90 s.
- Ytelsesfeilen avslørte to følgefeil som også er rettet: `stepUrban` trakk kostnaden uten å bygge (115 «prosjekter» for 16 bygg), og et søk som lyktes etter utvidelse ga ikke samme tomt ved neste kall.

Se `docs/opus-11/PROGRESSION_RESULTS.md` for tabellene.

## 3. Verdensgenerering og ressurser

- **Landskap** (`src/sim/landscape.js`, `createWorld(seed, biome, {remote})`): bekk (linje, vises som elv), ekstra innsjø, steinrike høyder, enger og skogsområder; fem biomprofiler (skog, fjell, slette, kyst, dal). Deterministisk per frø og biom. Fjerne land bruker samme generator, og kystland har et hav. Terreng, miljøfelt og vanntegning leser det samme (`terrain.js`, `environment.js`).
- **Kartet er 3600 × 2400** (var 2400 × 1600; på forespørsel fra prosjektansvarlig midt i økten), samme forhold, slik at planetprojeksjonen er uendret. Terrengbildet bruker 1,4 px/enhet (var 2).
- **Tidlig stein:** 18 tidlige steiner (9 nær leiren), plassert før trærne, pluss steinutspring. Test over 60 frø: minst 6 steiner nær leiren og ≥150 stein innen 700 enheter.
- **Ressursgeografi:** jern 5, kobber 3, tinn 2, kull 3 årer og to oljefelt, rikdom per frø, prospektering når kjente årer er under 55 %. Utposter har egen forekomst (stor, men begrenset). Ingenting er uendelig; forbruket måles.
- **Trær:** nærskogen (lunder 260–780 enheter fra leiren) plantes først, så skogsoner og fjerne lunder; tretaket 520. Folk sanker ikke tre og stein over et lagertak (700/600 + 12 per innbygger), så skogen ikke hogges ned (før: tre og stein på 50 000+). Trær har fortsatt bare to arter (bjørk og gran): **PARTIAL** for artsvariasjon.
- **Gjenvekst:** frøspredning og stubbegjenvekst respekterer bygg med klarering, stier fra hvert hus mot bygdens hjerte og jernbanetraseer (`inMaintainedArea`/`inBuiltArea`); stubber i ny tomt fjernes. Testet for bygd, sti, trasé og at skogen vokser utenfor.

## 4. Geografi og vann

«Vestkysten er kyst uten hav» var en ekte regresjon: 11 brudd på 150 frø (kyst uten hav, fjell som slette, land i havet). Landets kjerne og kystbukta festes nå lokalt til sitt landskap (`PIN` i `planet.js`). **0 brudd på 150 frø**; invarianten er en test (`tests/opus11-world.test.js`). Hjemmeregionen: ingen trær, steiner eller årer i vann (testet for 9 frø × 5 biomer), bekken holdes unna leirens hjerte, og mennesker går rundt innsjøer (og krysser bekker ved vadested).

## 5. Bosettinger og arkitektur

- **Avstand:** minste avstand mellom bosettinger 780 (var 380), minste avstand fra nærmeste 820, største 1500 (kartet er større); den første satellitten søker 800–1250 fra hovedstaden. Testet: alle par ≥ `B.realm.minSiteSpacing`.
- **Luft mellom bygg** etter bosettingens trinn (`B.spacing.byStage`: 20, 18, 14, 9, 4, 0, 0): grender har rom til stier og plasser, byer blir tettere. Verksteder med råvareretning (sagbruk, steinhoggeri, gruve) vurderer tomter lenger mot råvaren. Flyplass, raffineri og flyverk legges lenger ut fra bykjernen.
- **Boligtrinn** (`src/sim/renovation.js`): 1 halmhytte → 2 tømmerstue → 3 steinhus → 4 bygård → 5 moderne blokk. Krav: bosettingens trinn og kunnskap (Byggemetoder, Fabrikkhåndverk med industri, Elektrisk kraft med faktisk strøm i bosettingen), materialer, minst to folk og tid (30–90 s). Kostnaden trekkes ved start (ingen dobbel betaling), stillas tegnes, boligplassen øker (2/2/3/4/6/8), og folketallet følger boligplassen. Én ombygging om gangen per bosetting. **Det eldste halmhuset og det første lyet bevares** som minnesteder. Satellitter bruker bare eget lager (se 6) og får bygård først når tung last kan fraktes dit (lastebil innen rekkevidde eller jernbane). Alt lagres og migreres.
- **Sprites:** nye silhuetter for bygård, moderne blokk, oljebrønn, raffineri, generator, nettstasjon, flyplass, institutt, telegraf, gruvehode, dampmaskinhus, stasjon, garasje og rent verksted (`housing.js`, `industry.js`).
- **Strøm og lys:** vinduer og gatelys er elektriske bare der nettet leverer strøm; en bosetting uten generator har ikke elektrisk lys. Natt er verifisert i skjermbilde.
- **Planlegging av layout** bygger på det eksisterende sonesystemet (kjerne, hjem i klynger, verksteder mot råvare, åker i utkanten). Det er ikke innført nye distrikter eller offentlige plasser utover det som fantes: **PARTIAL** for «funksjonelle distrikter».

## 6. Regional økonomi og transport

- **Utposter:** `region.stock` (adskilt fra forekomsten `inventory`). Folk utvinner fra forekomst til lager; lagerplassen er begrenset; boliger bygges av regionens eget lager (konsum) og gir plass til flere folk; karavaner henter bare fra lageret og bærer det hjemmelageret trenger mest (`demandOf`); varen trekkes ved avreise. Bevaring er testet (forekomst + lager + transitt + hjemmelager er konstant over 600 s).
- **Satellittbosettinger:** `settlement.stock`; byvekst, ombygging og planlagte prosjekter er regionale prosjekter som leveres til det lokale lageret (bærere eller lastebil) og bygges først når lageret har alt. Tidligere ble byvekst og ombygging i satellitter betalt direkte fra hovedstadens lager.
- **Lastebil og vei:** lastebiler kjører bare med varer en bosetting faktisk mangler, tar over transporten når motorvogner, drivstoff og landforbindelse finnes (ellers bæres varene), og lasten finnes bare i transitt og havner i bosettingens lager (overlever lagring). Veiene (grusvei) og lastebilene tegnes. Jernbanen har sviller og skinner.
- **Utposter velges etter behov** (jern, kull, kobber, olje), og et ekstra utpost tillates når et uunnværlig mineral ikke er dekket.
- **Begrensning (PARTIAL):** hovedstaden bruker fortsatt det delte hjemmelageret `state.resources`, og folk i satellittene leverer det de sanker dit (ikke til eget lager). Full regional produksjon og forbruk i hver bosetting er ikke gjort. Jernbanen sender fortsatt kull ut av og tilbake til hjemmelageret (bevart, men uten egen nytte).

## 7. Utforskning og kamera

Et oppdaget land kan besøkes (`visitRegion`) og vises som deterministisk lokalt landskap med biomets terreng, vann og skog, regionens boliger (`homes`), lager og gruvehode (når folk faktisk har utvunnet) og folk. Besøket skriver aldri tilbake til økonomien (testet med tilstandsavtrykk), kameraet kan byttes mellom regioner uten å endre simuleringen, og fjerne land utvikler seg utenfor skjermen (utvinning, lager, boliger). Planetkameraet er fortsatt låst bak luftmålinger (tre fullførte flyvninger). **Begrensning (PARTIAL):** fjerne landsbilder viser et sammendrag (boliger, lager, gruve, folk), ikke veier, industri eller en egen simulert befolkning.

## 8. Autonom fremdrift

Åtte frø (701, 4242, 20261009, 5, 77, 909, 31337, 2) når forskningsinstituttet uten snarveier; se `PROGRESSION_RESULTS.md`. Viktigste rettelser (hver funnet ved å kjøre kjeden og lese flaskehalsen):

1. Utvinning og smelting styres av relativ mangel per vare, ikke «nærmeste mineral» og «kobber først».
2. Flere begrensede årer per mineral, to oljefelt, prospektering etter behov.
3. Forbrenningsmotoren på tomgang med mindre dampen ikke rekker; lastebiler bare med oppdrag.
4. Byvekst betaler bare når byggingen starter.
5. Luftmåling uavhengig av sjøkartlegging.
6. Vedlikehold gir to deler per metall (halvert jern-/kobberforbruk).
7. Utposter velges etter hva riket mangler.

Variasjon mellom frø er reell (strøm kommer fra 1,2 til 3,3 timer; folketall 189–199; 35–105 lastebilturer), men hovedstaden ender alltid som «Storby» og satellittene som «Tidlig by» (de når ikke «By»): **hovedstrukturen konvergerer** på tvers av frø.

## 9. Lagring, Ragnarok og determinisme

Lagringsformatet er **v11**. Migreringen fyller regionlager, bosettingslager og boligtrinn og flytter tidligere prosjektleveranser inn i lageret uten å skape varer; eldre verdener beholder sitt landskap (ingen nye vannlegemer). Testet: v10-lagring uten OPUS-11-felt migreres og spillet fortsetter uten negative eller ugyldige verdier; ombygging og lastebil midt i en tur overlever lagring. Ragnarok starter en ren syklus (ingen regionlager, bosettingslager, boligtrinn eller tomtesøk-minne). Simuleringen er deterministisk (to kjøringer og lagre/lese midt i kjøringen gir identisk tilstand).

## 10. Tester

**202 av 202 tester består** (178 fra grunnlaget + 24 nye), `node --test tests/*.test.js`, ca. 86 s. Nye filer: `tests/opus11-world.test.js` (10), `tests/opus11-economy.test.js` (14). Endringer i eksisterende tester er begrunnet i endringsloggen (nye regler: to oljefelt, regionlager i stedet for forekomst, behovsstyrt lastebil, save v11, ombygging som prosess, hele kjeden til siste milepæl i «full spilling», tre tester som var avhengig av en tilfeldig utvikling i verdens layout).

## 11. Skjermbilder og visuell vurdering

Se `docs/opus-11/VISUAL_QA.md` (16 scener, ekte spill, før/etter der grunnlaget kan nå samme tilstand). Rendertid i skjermbildekjøringene: 2,0–3,2 ms/bilde (headless Edge); nettleserens røykprøve 33/33 og ingen konsollfeil.

## 12. Gjenstående begrensninger

- Full regional økonomi (egen produksjon og forbruk per bosetting) er ikke gjort; hovedstaden og folk i satellittene bruker fortsatt hjemmelageret.
- Fjerne land vises som sammendrag; ingen veier eller industri der.
- Bare to treslag; variasjon kommer fra tetthet, soner, vann og steinutspring.
- Satellittene når ikke «By»; hovedstrukturen er lik på tvers av frø.
- Jernbanen flytter kull ut og tilbake uten egen nytte.
- Bosetningsgrunnleggelse bruker fortsatt de samme betingelsene (mat, folk, materialer, kjent sted) pluss større avstand; en egen «befolkningspress»-regel er ikke innført.
- Skjermbildene er vurdert av utvikleren; ingen menneskelig spilltest er gjort (se `PLAYTEST.md`).
- Tre skjermbilder fra grunnlaget («før») finnes ikke (strøm, institutt og modernisert by), fordi grunnlaget aldri når disse tilstandene.

## 13. Kvalitetsporter

| # | Port | Status | Bevis |
|---|---|---|---|
| 1 | Simuleringsytelse | **PASS** | 259–270 s → 61 s for 4 t på frø 20261009; testpakke 173 s → ca. 86 s (`PROGRESSION_RESULTS.md`) |
| 2 | Verdensgenerering | **PASS** | landskap per biom, vann, soner; 5 tester; skjermbilder 01, 13, 14 |
| 3 | Tidlig ressurstilgang | **PASS** | test over 60 frø; tidlig stein plassert før trær |
| 4 | Avstand mellom byer | **PASS** | test (alle par ≥ 780), skjermbilde 04 mot før |
| 5 | Luft mellom bygg | **PASS** | trinnstyrt klarering (test), skjermbilder 03, 05, 11 |
| 6 | Arkitektonisk utvikling | **PASS** | boligtrinn 1–5 med krav, kostnad, tid, lagring, minnesteder; skjermbilder 05, 06, 09, 11 |
| 7 | Gjenvekstregler | **PASS** | 3 tester (bygd, sti, trasé, stubber, åpen mark); skjermbilde 16 |
| 8 | Regionale lagre | **PARTIAL** | utposter og satellitter har eget lager (testet); hovedstaden og satellittenes sankere bruker hjemmelageret |
| 9 | Transportbevaring | **PASS** (med merknad) | karavaner, lastebiler og bærere bevarer varer (tester); jernbanen sirkulerer kull uten egen nytte |
| 10 | Utforskbare oppdagede land | **PARTIAL** | besøk, deterministisk landskap, utvikling utenfor skjerm (tester, skjermbilde 13); sammendrag i stedet for fullt bilde |
| 11 | Naturlig teknologisk fremdrift | **PASS** | 8 frø når instituttet (3,7–4,2 t); full-spilling-testen |
| 12 | Visuell årsak og virkning | **PARTIAL** | boligtrinn, industri, strøm/natt og lastebil vises i ekte spill; ikke et fullt før/etter-sett per teknologi |
| 13 | Lagre/lese | **PASS** | v11-migrering og midt-i-prosess-lagring (tester) |
| 14 | Ragnarok | **PASS** | ren syklus (test) |
| 15 | Determinisme | **PASS** | to kjøringer og lagre/lese gir identisk avtrykk (test) |
| 16 | Full regresjonstest | **PASS** | 202/202 |
| 17 | Visuell verifikasjon i nettleser | **PASS** | 16 scener i headless Edge + live inspeksjon i nettleserpanelet; røykprøve 33/33, ingen konsollfeil |
| 18 | Ytelse i moden verden | **PASS** | 2,0–3,2 ms/bilde i moden by; sim 6 t spilltid på ca. 2 min (se tabell) |

## 14. Commits

Se `git log feature/opus-11-civilization-integration` (ny rekkefølge: øyeblikksbilde av OPUS-08..10, ytelse og ressurser, landskap og geografi, avstand og luft, boligtrinn og sprites, lagertak og verktøy, satellittlager og lastebiler, nærskog og dokumentasjon).
