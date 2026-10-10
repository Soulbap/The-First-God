# Endringslogg — THE FIRST GOD

Alle merkbare prosjektendringer dokumenteres her av AI-en som utfører endringen. Filen er en menneskelesbar historikk, ikke en erstatning for Git-historikk eller tekniske commit-meldinger.

## AI-praksis (obligatorisk)

Ved **hver** endring av kode, innhold, design, ressurser, konfigurasjon eller dokumentasjon skal AI:

1. oppdatere denne filen i samme arbeidsøkt,
2. legge en kort oppføring under `## [Unreleased]`,
3. gruppere oppføringen under riktig kategori,
4. beskrive både hva som ble endret og hvorfor når hvorfor ikke er åpenbart,
5. nevne gjennomført kontroll/test når den er relevant,
6. aldri omskrive eller fjerne tidligere versjonerte oppføringer uten eksplisitt instruks.

Små rettelser skal også logges, men kan slås sammen til én presis punktlinje når de hører til samme arbeid. Ren lesing/inspeksjon uten filendring skal ikke logges.

### Kategorier

- `Added` — ny funksjon, innhold eller dokument.
- `Changed` — endret oppførsel, balanse eller design.
- `Fixed` — feilretting.
- `Removed` — fjernet funksjon, innhold eller avhengighet.
- `Docs` — dokumentasjonsendring når den ikke hører tydeligere hjemme over.
- `Tests` — nye eller endrede tester/verifikasjon.

### Format

Bruk formatet under. Dato er lokal prosjektdato (`YYYY-MM-DD`). Ikke finn på versjonsnummer, testresultater eller brukeropplevelse.

```md
## [Unreleased]

### Docs
- La til den kanoniske dokumentasjonspakken for kontinuerlig sivilisasjonsutvikling fra første ly til første vellykkede orbitale ferd: masterdesign, teknologiavhengigheter, ressurs-/industrikjeder, visuell verdensguide og avhengighetsbasert veikart. Avklarer at teknologier gir evner og synlige konsekvenser uten harde aldersgater; kart, besøk og planetkamera er ulike evner; PP og PrP er ulike ressurser; og orbital ferd er ikke gravitasjonsflukt. Ingen spillkode er endret.

### Added
- **OPUS-03 · verden verd å oppdage**: Tidlig stein er mer pålitelig, bytomter rydder trær og bruker bygg-avhengig klarering, og det første lyet blir et minnested når hovedstaden når bystadiet.
- **OPUS-03 · kart før planet**: Et verdenskart over kjente land åpnes ved sammenhengende rike; karttegning og Luftmåling er en senere, eksplisitt vei til planetkameraet.
- **OPUS-03 · besøkbare land**: Klikk på et oppdaget land i verdenskartet for en deterministisk detaljvisning. Utposter projiseres fra regionens faktiske status og befolkning, uten en ekstra økonomi eller falske innbyggere.

### Changed
- **OPUS-03 · arv**: PrP bruker nå avtagende uttelling for materialer, bønn og kunnskap; ekko er dyrere slik at én første syklus gir valg, ikke hele treet.

### Tests
- **OPUS-03**: La til regressjoner for tidlig stein, urban skog, funksjonell klarering, PrP-tak, kart/planet-gating og besøkstilstand. `npm test`: 128/128 bestått.
- **OPUS-03 · regionprojeksjon**: Testet determinisme, utpost-projeksjon, ingen ressurs-/befolkningsduplisering, v2-migrering og ressursbetalt hytterenovasjon.

### Added
- **GAMEPLAY-06 · sivilisasjonens morgen**: Mat er en ny, synlig ressurs fra autonome åkre. Den brukes bare når en ny innbygger kan komme til et ledig hjem; tom beholdning stopper dermed vekst uten dødsfall eller økonomisk kollaps.
- **GAMEPLAY-06 · utviklede bosettinger**: Bosettingene leses nå som Leir, Grend, Landsby, Voksende landsby eller Tidlig by ut fra befolkning, hjem, infrastruktur og regionale forbindelser. Roller oppstår uten spillerordre fra dyrket mark, verksted eller lokale skog-/steinforekomster.
- **GAMEPLAY-06 · infrastruktur og region**: Åker og verksted bruker den eksisterende autonome byggeflyten og gyldig tomtesøk. Regional logistikk bygger videre med fysiske leveranser, først til den unge bosettingens åker og deretter verksted.
- **GAMEPLAY-06 · progresjon**: Frøets løfte, Arbeidets deling og Regional utveksling leder fra En levende region til Stabil matforsyning, Den første byen og Sivilisasjonens morgen.
- **GAMEPLAY-06 · bevis**: Seks faktiske Edge-skjermbilder og rapport under `docs/gameplay-06/`. (Kontroll: `npm test` 44/44; Edge-capture uten konsollfeil.)

### Docs
- La til `docs/HOME_PC_HANDOFF.md` for synkronisert hjemme-PC-overlevering: aktiv spillbar gren, commit, grenoversikt, teststatus, begrensninger, lokale referansefiler og Windows-kommandoer. (Kontroll: `npm test` 41/41 bestått.)

### Added
- **GAMEPLAY-05 · den levende regionen** (`src/sim/regional.js`, `src/sim/humans.js`, `src/sim/construction.js`): Den andre bosettingen får en avgrenset autonom vekstsløyfe. Materialer reserveres fra den felles beholdningen ved avreise, bæres fysisk til lysningen og brukes først der ved ankomst. Lokalt lager, hjem og fellesplass bygges trinnvis; befolkningsvekst er deterministisk og begrenset av ferdige hjem.
- **GAMEPLAY-05 · synlig regional utvikling** (`src/render/renderer.js`, `src/data/upgrades.js`): Voksende slekter, Mellom ildstedene og Faste ferdselsårer har lesbare følger i verden. Gjentatte fullførte leveranser forsterker en ujevn jordsti og den unge bosettingen får tydeligere brukt mark. Milepælen **En levende region** krever faktiske prosjekter, leveranser og regional slitasje.

### Tests
- **GAMEPLAY-05** (`tests/regional.test.js`): dekker reservering og levering uten frie ressurser, lokalt prosjekt etter ankomst, boligbegrenset vekst og ren ny syklus. (Kontroll: `npm test` 41/41 bestått.)

### Docs
- `docs/gameplay-05/REPORT.md` og ti reproduserbare Canvas-bilder dokumenterer regional flyt; `tools/capture-gui.mjs` gjentar dem med `GAMEPLAY_05=1`. (Kontroll: Edge-røykprøve 33/33, ingen konsollfeil.)

### Added
- **GAMEPLAY-04 · bortenfor den første landsbyen**: «Nye horisonter» lar utforskeren velge en deterministisk, tørr lysning; «Grunnleggelse» sender tre virkelige innbyggere dit. De bygger første hytte og et beskjedent ildsted, blir en aktiv ung bosetting og sliter fram en naturlig forbindelse til den første landsbyen. Milepælene **Nytt land i sikte** og **De første bosettingene** gir lesbar progresjon og bredere regional kameraramme. (Kontroll: ny målrettet flyttest, `npm test`.)

### Added
- **GAMEPLAY-03 · levende landsby** (`src/sim/humans.js`, `src/data/balance.js`, `src/render/people.js`): Leveringer og byggearbeid skaper sterkere slitasje enn tilfeldig gange, mens menneskene etter ferdig landsbyildsted veksler mellom produktivt arbeid, korte sosiale pauser og små vedlikeholdsbesøk ved hjem, lager og ildsted. Arbeid på uferdige bygg beholder prioritet; spilleren får ingen arbeidsordre eller plassering. (Kontroll: målrettet simuleringsflyt.)
- **GAMEPLAY-03 · Utforskertrang** (`src/data/upgrades.js`, `src/sim/economy.js`, `src/sim/world.js`): En valgfri, datadrevet innsikt etter «Den første landsbyen» slipper én autonom utforsker ut på tørt, tilgjengelig terreng og tilbake igjen. «De første stiene» viser den eksisterende ikke-blokkerende milepælspresentasjonen; ingen ny ressurs, kartoppdagelse, bosetting eller zoomnivå er lagt til.

### Tests
- **GAMEPLAY-03** (`tests/genesis.test.js`): ny deterministisk flyt dekker landsbyens vedlikeholdsrytme, låsing/opplåsing av Utforskertrang, én utforsker om gangen, retur og milepæl. (Kontroll: `npm test` 38/38 bestått.)

### Docs
- `GAME_DESIGN.md`: dokumenterer GAMEPLAY-03 som en avgrenset, observerbar vekstetappe og markerer utforskningens strenge grense mot neste fase.
- `docs/gameplay-03/REPORT.md` og seks deterministiske Canvas-bilder dokumenterer start, leir, vekst, daglig landsbyliv, områdeoversikt og utforskning. `tools/capture-gui.mjs` kan gjenta dem med `GAMEPLAY_03=1`. (Kontroll: Edge-røykprøve 33/33, ingen konsollfeil.)

### Added
- **GAMEPLAY-02 · fra leir til landsby** (`src/data/upgrades.js`, `src/sim/`, `src/render/`): Felles lager, Ordnet arbeid og Landsbyildsted gir én komplett, menybasert vekstetappe. Menneskene bygger selv, leverer nå til ferdig lager og samles ved ildstedet. De nye byggene har egne painterly silhuetter og synlige byggetrinn; eksisterende slitasje og materialspor følger aktiviteten. (Kontroll: `npm test` 37/37.)
- **GAMEPLAY-02 · første landsby** (`src/data/upgrades.js`, `src/main.js`, `src/ui/`): Milepælen «Den første landsbyen» krever fire hjem, åtte mennesker, lager og ildsted. Den viser en ikke-blokkerende norsk melding og et områdeutsnitt av hele bosettingen; redusert bevegelse respekteres. Ragnarok og den seedede startverdenen er uendret. (Kontroll: målrettet simuleringsflyt og eksisterende Ragnarok-test.)
- **GAMEPLAY-02 · skjermbilder og rapport** (`docs/gameplay-02/`, `tools/capture-gui.mjs`): seks deterministiske nettleserscener dekker start, bebodd leir, bygging, voksende bosetting, landsbymilepæl og bredt landsbyutsnitt.
- **VISUAL-03 · levende bosetting** (`src/render/renderer.js`, `src/render/decor.js`): bruksavhengig, ujevn markslitasje ved innganger, lager og bål, med diskrete forbindelser mellom virkelige samlingspunkter. Byggeavfall er nå mest synlig under arbeid og går over i få bruksspor når leiren tas i bruk. Lysningskanten får busker og enkelte unge trær som ren presentasjon; økonomi, kollisjon og menneskelig atferd er urørt. (Kontroll: `npm test` 36/36; hodeløs Edge-røykprøve 33/33; ingen konsollfeil.)
- **VISUAL-03 · bilder og rapport** (`docs/visual-03/`): ni faste nettleserbilder viser urørt landskap, første ly, første mennesker, bosetting, områdezoom og Ragnarok, med kort visuell vurdering.
- **VISUAL-02 · skogstruktur og levende miljø** (`src/sim/world.js`, `src/sim/ecology.js`, `src/render/environment.js`, `src/render/terrain.js`, `src/render/renderer.js`): deterministiske, artsdominerte lunder rammer inn en spillbar, uregelmessig startlysning. Et avledet miljølag leser trær, stubber og bygg og fornyer skogbunn/eksponert jord høyst hvert tiende spillsekund uten å endre spillregler.
- **VISUAL-02 · kontroll og bilder** (`tests/visual.test.js`, `tools/capture-gui.mjs`, `docs/visual-02/`): to miljø-/plasseringstester, kjørbar Edge-røyktest og ni faste browserbilder. (Kontroll: `npm test` 36/36; GUI-røykprøve 33/33; ingen konsollfeil.)

### Docs
- `docs/visual-02/REPORT.md`: teknisk avgrensning, bildeoversikt, faktisk nettleserkontroll, begrensninger og anbefaling for visuell gjennomgang.

### Added
- **GUI-02 · evolusjonsfeedback** (`src/ui/presentation.js`): en liten, deterministisk presentasjonskø samordner oppdagelser, valg og milepæler. Den viser aldri overlappende meldinger, prioriterer milepæler, avviser dubletter, begrenser ventende informasjon og tømmes ved Ragnarok. (Kontroll: 4 nye enhetstester.)
- **GUI-02 · visuell gjennomgang** (`docs/gui-02/`): faste før/etter-bilder, rapport og dokumentert kontroll av kortlesbarhet ved lyst terreng.

### Changed
- **GUI-02 · innsiktskort** (`src/ui/tokens.css`, `src/ui/style.css`): større titler og lesbarere verdenskonsekvens, mer luft og mindre ikonflis gir tydeligere rekkefølge fra effekt til konsekvens, kostnad og handling, uten å endre panelbredden eller økonomien.
- **GUI-02 · oppdagelser og milepæler** (`src/ui/hud.js`, `src/main.js`): første ly, Vekkelse og Felles ild presenteres som betydningsfulle oppdagelser; bosettingsmilepælen får en sterkere, gjenbrukbar variant. Animasjoner følger redusert-bevegelse-innstillingen.

### Tests
- **GUI-02**: `tests/presentation.test.js` og utvidet `tools/gui-smoke.js` dekker varslingsprioritet, deduplisering, Ragnarok-opprydding og grunnleggende varsling/faner. (Kontroll: `npm test` 34/34 bestått.)

### Added
- **VISUAL-01 · miljøfelt** (`src/render/environment.js`): deterministisk rutenett (fukt, kronedekke, bart jordsmonn) avledet fra seed, trær, stein og tjern. Terreng og dekor leser det, så bakken henger sammen med skogen, vannet og leiren. (Kontroll: enhetstester for determinisme, verdiområde og at feltet speiler verden.)
- **VISUAL-01 · bakkedetalj**: terrenget males nå med lagdelte strøk, barnåler/løv/kvister etter kronedekke, mose i fuktige skyggepartier, bart jord i uregelmessige flekker og småstein i grupper (2 px/enhet). Et sømløst finkornslag (`buildGrain`) holder bakken levende ved nærzoom, og terrenget har mip-nivåer (2×, 1×, 0,5×) slik at utzoomet visning er rask og uskarp-fri.
- **VISUAL-01 · dekor**: bregner i skyggen, kvister, steingrupper, lyng/ener/bærbusker på skogkanten, falne stammer og opptil 240 unge trær som undervegetasjon; gress i flekker som tynnes under tett skog og i leiren. Alt plasseres deterministisk fra miljøfeltet.
- **VISUAL-01 · bosettingen preger bakken**: slitasje fra gange tegnes nå som ujevn, bar jord (høyere oppløsning, kornet kant), og bygg, bål og lager gir i tillegg bar jord rundt seg. Spon, kvister og avkapp samler seg ved lageret (følger totalt innhøstet trevirke/stein), rundt byggeplasser og ved stubber.
- **VISUAL-01 · verktøy**: `tools/scenes.js` kjører en fast sekvens (scene A–E) og sender canvas-bildet til en lokal mottaker for før/etter-sammenligning; `TFG.renderStats` og `TFG.renderer` i `?debug`. Skjermbilder i `docs/visual-01/`, vurdering i `docs/visual-01/REPORT.md`.
- **Tests**: `tests/visual.test.js` (7 tester): miljøfelt, deterministisk dekor, ingen dekor i vann/oppå trær/midt i leiren, bregner i skygge, sortering, lagerhauger og trevarianter.

### Changed
- **VISUAL-01 · trær**: gran og bjørk har nå 8 utseender (simuleringens variant 0–3 utvidet med id, uten å endre simuleringens tilfeldighet). Gran varierer i bredde, profil, kransetetthet, nakne stammepartier, hengende grener, døde greiner, krumning og fargetone; unge trær er lysere og smalere. Bjørk har asymmetriske, luftige kroner langs grenene med hengende bladstrenger i stedet for kuler, tre fargetoner og synlige grener.
- **VISUAL-01 · bygg**: ly med paneler av ulik hudtone, regnstriper, sot og smusset kant; hytte med stråtak i kurser, frynset takkant, mose og steinfundament; bålplass med bar jord, aske, sot og forkullet ved; steinring med sot og mose.
- **VISUAL-01 · lager**: vedhaugen består av enkeltstokker (side- og endevisning, synlige kappflater, ujevn stabling), steinhaugen av fasetterte steiner med kontaktskygge. Posisjonene er faste pr. indeks, så haugen vokser uten å stokkes om og fortsatt speiler beholdningen.
- **VISUAL-01 · bål**: tre lag flammer, glør i asken, varm lyspytt som lander flatt på bakken, mykere røyk (forhåndstegnet puff) og færre gnister.
- **VISUAL-01 · mennesker**: kontur og lyskant, belte, valgfri skinnkappe, tre hårfasonger, omvikling og sko, større øks-/hammerhode, tyngre vedbyrde, hvilende holdning med vektforskyvning eller hånd på hoften; blant annet utledet fra id (urørt simulering).
- **VISUAL-01 · lys og dybde**: lange, myke kastskygger mot nedre høyre i stedet for runde flekker, tettere kontaktskygge ved foten, svakt varmt løft rundt leiren og svak nedtoning av ytterskogen. Fjernet skyskygge-flekkene; vignetten er svakere (0,3 → 0,18).
- **VISUAL-01 · felling**: felte trær blir liggende med krone og greiner og går så over i en kappet stokk med kappflate og greinstubber (før: tynn «lanse»). Stubber har rotfeste og årringer.
- **VISUAL-01 · ytelse**: sprites tegnes med bilineær filtrering ved vanlig zoom, gress/bregner bruker forhåndsskjærte svairammer, trær svaier via aksejusterte skiver, og binærsøk på y begrenser dekortegningen. Målt i forhåndsvisningen: område-zoom ~71 → ~14 ms/bilde; nær ~12 → ~13 ms; terrengbilde 3600×2400 → 4800×3200 (+~25 MB).

### Docs
- `docs/visual-01/REPORT.md`: audit (Fase A), tekniske valg, før/etter-sammenligning og gjenstående begrensninger. `AGENTS.md` §10 nevner scene-verktøyet.


### Added
- Kort, konkret beskrivelse av nyheten og dens hensikt. (Kontroll: ...)
```

Når en utgivelse opprettes, flyttes `Unreleased`-punkter til en datert versjonsseksjon. Versjonsnavn avgjøres av prosjektets faktiske releasepraksis.

## [Unreleased]

### Added
- **OPUS-02 · Byplan** (`src/sim/urban.js`, `src/data/upgrades.js`): ny innsikt etter «Sivilisasjonens morgen». Folket bygger selv brønner, flere bolighus og varehus når en bosetting har overskudd (reservegrense for innsiktene); bygdene får flere hytter. Spilleren velger aldri tomt. Varehus gir større lager for foredlede varer.
- **OPUS-02 · Takkoffer** (PP-sluk): seks avtagende nivåer reiser en helligdom (offerstein, varde, bautastein, ildskål, tretempel, stavkirke). Gir bare PrP ved Ragnarok (kvadratrot) — ingen spillbonus.
- **OPUS-02 · Navn og kronikk** (`src/sim/chronicle.js`, `story.js`, `activity.js`): norske navn til alle innbyggere (egen generator, ingen rng), en Kronikk-fane med ekte hendelser (grunnleggelser, ruter, utposter, høstfester, trinn), hover viser navn og hva noen gjør.
- **OPUS-02 · Døgnklokke** (`src/view/daylight.js`): felles klokke for planetens sol og nærbildet; varm skumring, lesbar natt, lysende vinduer, lykter og bål.
- **OPUS-02 · Gatenett, gårdsplasser og dyrket mark** (`render/streets.js`, `yards.js`, `farmland.js`, `civic.js`): gater avledet av dørene, tømmerstuer i byen, bolighus med eget preg, klokketårn på hallen, rekvisitter etter faktisk produksjon, åkerteiger som følger høstesyklusen.
- **OPUS-02 · Planet**: elver (`src/sim/hydrology.js`), fjellkjeder, skogtetthet fra landskapet, svake buede ruter, veier i overflaten og lys etter folketall.
- **OPUS-02 · Lydbilde** (`src/audio/scene.js`, `ambience.js`): tjern, skogsus, sirisser/ugle, sag og meisel, torgmumling, byhumring. Ikke lyttet til av et menneske.
- **OPUS-02 · verktøy**: `tools/bakeplanet.mjs` + `?debug&planet=` (forhåndsbakt planet), `tools/receiver.mjs`, `tools/playthrough-multi.mjs`; `tools/snapshots.mjs`, `tools/capture-opus02.mjs`, `tools/sprites.html`, `tools/planetmap.mjs`; dokumenter under `docs/opus-02/`.

### Changed
- Tomtevalget er tettere (9 mellom bygg) og hus legger seg langs rutene mot andre bosettinger; folk rydder tomta i bygdene og skogen gror ikke inn over dem; matbygda får en ekstra åker.
- Bakkelagets pikselpass fordeles over flere bilder (ingen enkeltstående pause); stikanter er jevnere. Planetteksturens alfa bærer nå skogtetthet (vann ≈ 64, land 160–255).
- Hovedmenyen får en femte knapp (Kronikk) og løftes over kontrollene på smale vinduer.
- Rusling i bygdene trekker mål i en ellipse (samme antall rng-trekk) i stedet for et rektangel, og mettet slitasje jevnes ut før tegning: slutt på flate, rettkantede jordplattformer rundt bygdene.
- Planetnatten er blå og dempet i stedet for svart; hjemmetonen er rund og støyet i stedet for rektangulær; skogmassen rundt hjemmet er lysere.

### Tests
- `tests/opus02.test.js`: Byplan, byvekst uten overlapp, Takkoffer, kronikk/navn (determinisme, ingen duplikater, lagring), gatenett, elver, dagklokke, lydbilde, aktivitet, lagring midt i byvekst, Ragnarok-start.
- `tests/planet.test.js` tilpasset ny alfakodning.

### Added
- **OPUS-01 · planeten** (`src/sim/planet.js`, `src/render/globe.js`, `src/render/planetTexture.js`, `src/render/planetWorker.js`, `src/view/globe.js`): Den rektangulære kortoversikten er erstattet av en deterministisk planet med kontinenter, hav, fjell, skyer, atmosfære, dag/natt og nattlys. Hjemmeregionen er en ekte flekk på kula med et levende øyeblikksbilde av den detaljerte verdenen; nabolandene ligger på ekte geografi i nøyaktig den retningen karavaner og ekspedisjoner bruker ved kartkanten. Zoom går sammenhengende Nær → Område → Region → Kontinent → Planet og tilbake uten hopp (samme fokus og bredde ved overgangen). Kjent land vises i farger, ukjent land dempet; utposter, ruter og ekspedisjoner vises på kloden. WebGL 1 uten avhengigheter; reserve uten WebGL er den gamle kartoversikten.
- **OPUS-01 · planetavsløringen**: Ved «Et sammenhengende rike» og ved sluttmilepælen løfter kameraet seg selv fra byen til kontinentet og hele kloden. All input avbryter; redusert bevegelse gir kort overgang.
- **OPUS-01 · velsignelser** (`src/data/upgrades.js`): PP får endelig en bruk. Fire varige velsignelser med tre nivåer og stigende pris — **Regnets velsignelse** (trevekst), **Steinens gave** (steinfornyelse), **Vandrerens letthet** (gangfart, også karavaner) og **Kunnskapens lys** (kunnskap). Hver gir et synlig svar i verden (regnskur og spirer, glimt i bruddene, medvind med løv, lys over verkstedene). Idle-vennlig: ingen aktive mirakler å klikke på.
- **OPUS-01 · høstfest** (`src/sim/civilization.js`): Når lagrene er fulle, samles folket ved ildstedet; maten brukes og bønnen teller dobbelt. Ny milepæl **Den første høstfesten**.
- **OPUS-01 · Ragnarok med arv** (`src/data/prestige.js`, `src/sim/legacy.js`): PrP kan brukes på fem valgfrie ekko (Gamle røtter, Ekko av bønner, Hendenes minne, Glemselens vennlighet, Stjernekart i asken) som velges i Ragnarok-dialogen og gjelder fra neste syklus. Startverdenen er identisk; skapelsen må fortsatt gjøres. Hver avsluttet syklus etterlater en minnestein ved tjernet.
- **OPUS-01 · lagring** (`src/sim/save.js`): Syklusen og metaprogresjonen lagres i nettleseren (hvert 20. s og når siden skjules) og lastes ved oppstart. **Ingen offline-fremgang** — verden fortsetter nøyaktig der den ble forlatt. `?fresh` starter rent; `?debug` lagrer ikke.
- **OPUS-01 · lyd** (`src/audio/ambience.js`): Prosedyrisk stemning uten lydfiler: vind, fuglesang i nærbildet, knitring ved bål, hammerslag ved bygging og en dempet klang i planetvisningen. Lydknapp og tasten M; valget huskes.

### Changed
- **OPUS-01 · bosettingens soner** (`src/sim/construction.js`, `src/data/balance.js`): Menneskene velger fortsatt tomt selv, men foretrekker en tett kjerne (ildsted, lager, torg, hall), hjem i klynger, verksteder vendt mot råvaren og åker i utkanten. Litt kortere avstand mellom bygg. Byer blir kompakte i stedet for jevne ringer.
- **OPUS-01 · bakken husker** (`src/render/renderer.js`): De mest brukte stiene modnes til lyse grusveier; byer får brolagt torg rundt marked, hall og ildsted, og storbyen steinlagte hovedgater. Bare presentasjon, avledet av faktisk slitasje.
- **OPUS-01 · møteplasser**: Folk besøker torget og hallen mellom arbeidsøktene.
- **OPUS-01 · grensesnitt**: «Verden»-knappen heter nå **Planet**; en diskret etikett viser hvilken skala man ser på; Ragnarok-dialogen viser arv og ekko.
- **OPUS-01 · tempo**: Gjennomspilling med boten tar nå 80–97 min (sju frø) mot 103–158 min før; lengste venting mellom to hendelser er 6–8 min mot ~21 min. Se `docs/opus-01/PLAYTEST_REPORT.md`.

### Fixed
- Regionale leveranser reserverte materialer uten å sjekke beholdningen, så stein kunne bli negativ (−1 ved 30:00 i baseline). Nå bæres bare det som finnes.
- Zoomgrensen for områdevisning følger tilstanden, ikke bare milepælshendelsen (riktig etter lasting).
- Rulling i planetvisningen avbrøt ikke lenger utgangen den selv ba om.
- Smale skjermer (1280–1400 px): bunnmenyen og fart/zoom-linjen overlappet etter at Planet- og lydknappen kom til. Lydknappen står nå for seg selv nede til venstre, og linjen er mer kompakt. Ragnarok-knappene holdes synlige når dialogen ruller.
- Ytelse: slitasjelaget (stier, grus, torg) tegnes uten funksjonskall per piksel — 80 → 25 ms per oppdatering i sent spill (baseline uten grus/torg: 32 ms). Målt i nettleser.

### Tests
- `tests/planet.test.js` (12): deterministisk planet, landskap per land for sju frø, retning lik kartkanten, verden ↔ planet, sømløst kamera, projeksjon, visningsmodell, tekstur, lagring (rundtur, avvisning, utfylling).
- `tests/opus.test.js` (8): velsignelser (låst/kjøpbar/aktivert, nivåer, effekt), høstfest (start, forbruk, bønn, aldri negativ, milepæl), Ragnarok-arv (tildeling, kjøp, grenser, identisk startverden) og soner.
- `tools/gui-smoke-realm.js` følger nå den sammenhengende planetzoomen (27 kontroller). (Kontroll: `npm test` 106/106; GUI-røykprøve 33/33; Rike/planet-røykprøve 27/27; ingen konsollfeil.)

### Docs
- `docs/opus-01/`: RESEARCH, DESIGN_REVIEW, PLANET_ARCHITECTURE, IMPLEMENTATION_REPORT, FUTURE_IDEAS, PLAYTEST_REPORT og før/etter-skjermbilder.

### Added
- **GAMEPLAY-07 · byenes tid** (`src/sim/settlements.js`, `src/sim/production.js`, `src/render/city.js`): Nye trinn **By** og **Storby** avledes av syv uavhengige krav (folk, boligkapasitet, bolighus, mat, infrastruktur, sagbruk/steinhoggeri/torg, foredlede varer og fullførte leveranser) — aldri av én terskel. To nye råvarer, **planker** og **tilhugget stein**, lages autonomt av **Sagbruk** og **Steinhoggeri** (3 tre → 1 planke, 3 stein → 1 blokk), med reserve og lagertak så vanlige byggeprosjekter aldri sultes. **Bolighus** (4 plasser) og **Torg** (større leveranser og dobbelt lagerrom for foredlede varer) bygges av menneskene selv. Milepælen **En by reiser seg**.
- **GAMEPLAY-08 · den organiserte sivilisasjonen**: **Kunnskap** er en ny ressurs som bare oppstår av faktisk virksomhet (sagbruk, steinhoggeri, verksteder og den nye **Kunnskapshallen**, mer med flere folk). Fem fremskritt (Organisert håndverk, Bedre jordbruk, Byggemetoder, Delt kunnskap, Samfunnsorden) gir målbare evner. Roller (Kunnskapssete, Bysenter, Sagbruksbygd, Steinhoggerbygd, Matbygda, Håndverksbygd, Skogbygd, Steinbygd) gir målbare fordeler (`ROLE_EFFECTS`). Milepælen **Kunnskapens tidsalder**.
- **GAMEPLAY-09 · det voksende riket** (`src/sim/realm.js`, `src/sim/regional.js`): **Flere ildsteder** lar folk autonomt grunnlegge opptil fire bosettinger når mat, folk, materialer, ledige hender og ro er på plass. Tomtevalget er deterministisk (tørt land, avstand, trygg vei utenom tjernet, fritt areal, lokale ressurser, mangel på roller) og bosettingene vokser fra én hytte via de eksisterende fysiske leveransene, med planer for skog, stein eller jord. Handelsruter oppstår av fullførte turer (`state.network`). **Handelsveier** øker lasten. Milepælen **Et sammenhengende rike**.
- **GAMEPLAY-10 · verdens daggry** (`src/sim/worldmap.js`, `src/sim/civstage.js`, `src/view/overview.js`, `src/render/overview.js`): En deterministisk 5×3 verdensmodell der hjemmeregionen er den detaljerte verdenen og fjerne land bare er tilstand og tidtakere. **Hinsides de kjente landene** sender ekspedisjoner fysisk ut over kartkanten; **Den store ekspedisjonen** lar nybyggere reise utposter som sender **karavaner** (ekte figurer) inn til lageret; **En forbundet verden** forsterker dem. **Verden-oversikten** (knapp, tasten V eller zoom forbi område) viser bosettinger, ruter, land, ekspedisjoner og mulige mål. Sivilisasjonstrinn avledes av milepæler. Milepælen **Verdens første sivilisasjon**.
- **UI**: Rike-panelet (sivilisasjonstrinn, kunnskap, bosettinger og roller, byens og utvidelsens krav, forbindelser, verden), nye ressurser i ressurslinjen (tettere visning ved mange), fem nye bygg med malte sprites og arbeidseffekter, bosettingsetiketter for alle bosettinger, nye ikoner og kategoriene Kunnskap og Rike.
- **Verktøy**: `tools/bot.js` (spillerbot uten snarveier), `tools/playthrough.mjs` (full gjennomspilling i Node), `tools/gui-smoke-realm.js` (Rike/oversikt-røykprøve, `REALM_SMOKE=1`), og scenene `GAMEPLAY_07_10=1` i `tools/capture-gui.mjs`.
- **Bevis**: Rapporter og faktiske Edge-skjermbilder under `docs/gameplay-07/` … `docs/gameplay-10/` og `docs/gameplay-07-10/INTEGRATION_REPORT.md`.

### Changed
- **Regional logistikk** er generalisert fra «den andre bosettingen» til et vilkårlig antall (maks to samtidige prosjekter). Leveringer bærer også planker og tilhugget stein.
- **Boligkapasitet** er per bygg (`B.housing`); sivilisasjonsveksten gjelder alle bosettinger og tar hensyn til rollen. Folk i unge bosettinger bygger først, deretter veksler de mellom sanking og livet ved ilden (tidligere kunne den som startet på 0 leveranser vandre uendelig).
- **«En levende region»** krever nå en etablert rute (tre fullførte turer) i stedet for målt slitasje ≥ 0,35. Slitasjen forfaller og kunne stå på null for enkelte frø, noe som stoppet hele progresjonen.
- **Steinhoggeri og Byggemetoder** får stein til å vokse tilbake raskere (steinmangel var flaskehalsen i bysegmentet).
- **Ragnarok** viser og nullstiller alt nytt; PrP-formelen belønner kunnskap, bosettinger og utposter (fortsatt plassholder, aldri straffende).

### Fixed
- Mennesker kunne gå i evig sløyfe rundt tjernet når målet lå på den andre siden: omveien legges nå bare én gang per mål.
- Følger (grunnleggelse og ekspedisjon) som ikke kommer fram, oppløses etter seks minutter og forsyningene gis tilbake.
- Røykprøven `panelet fanger pekeren (ikke canvas)` var en tidsfeil i testen (panelet glir inn i sanntid); testen venter nå på overgangen. 33/33.
- `package-lock.json` (uten avhengigheter) kom ved en feil med i en tidligere commit og er fjernet fra indeksen igjen.

### Tests
- **GAMEPLAY-07..10**: `tests/city.test.js`, `knowledge.test.js`, `realm.test.js`, `world.test.js`, `realm-ui.test.js` (42 nye tester) dekker bykrav, foredling og tak, bolighus, kunnskapskilder, fremskritt, roller, tomtevalg, grunnleggelse uten duplikater, ruter, leveringsregnskap, verdenskart, ekspedisjon og utpost, karavaner, oversiktsmatematikk, sluttmilepælens krav, Ragnarok-nullstilling, deterministisk gjentakelse og fire frø som spilles hele veien. (Kontroll: `npm test` 86/86; Edge: GUI-røykprøve 33/33, Rike-røykprøve 22/22, ingen konsollfeil.)

### Added
- **GUI-01 · progressiv oppdagelse** (`src/sim/discovery.js`, `discover` i `src/data/upgrades.js`): innsikter blir synlige først når de er relevante, og oppdagelsen er varig i syklusen (`state.discovered`, hendelsen `discovered`). Første ly dukker opp ved første sanking, Vekkelse når lyet står, Felles ild/Hendene husker etter Vekkelse og Nytt hjem når bålet står. Kjøpskrav, kostnader og effekter er uendret. (Kontroll: `tests/gui.test.js`)
- **GUI-01 · visningsmodell** (`src/ui/insights.js`): ren, DOM-fri utvelgelse av aktive kort (skjult/for dyr/kjøpbar/bygges), manglende ressurser («Mangler 4 trevirke og 2 stein»), fremdrift mot kjøp, kategorier, epokestadium og ressurslinje.
- **GUI-01 · designsystem** (`src/ui/tokens.css`): Genesis-paletten, 8 px-avstand, radier, typografi (Palatino Linotype til titler, Segoe UI til funksjonell tekst), bevegelse og `prefers-reduced-motion`. Epoker kan overstyre fargene via `data-epoch` uten å endre oppsettet.
- **GUI-01 · ikonfamilie** (`src/ui/icons.js`): én 24 px SVG-familie (trevirke, stein, folk, PP, innsikt, milepæl, Ragnarok, ly, vekkelse, ild, øks, hytte, spire, kontroller). Ingen emoji.
- **GUI-01 · presentasjonsdata** (`src/data/gui.js`): ressursnavn, kategoriene Liv/Bosetning/Tro og Genesis-stadier («Skapelsens morgen» → «Den første bosetningen»).
- **GUI-01 · verktøy**: `tools/capture-gui.mjs` tar fullskjermbilder (verden + HUD) av faste scener via hodeløs Edge og DevTools-protokollen; `tools/gui-smoke.js` kjører 30 samhandlingskontroller i nettleseren. Skjermbilder og rapport i `docs/gui-01/`.

### Changed
- **GUI-01 · nytt grensesnitt** (`index.html`, `src/ui/hud.js`, `src/ui/style.css`): ressurslinje øverst til venstre (Trevirke, Stein, Folk når de finnes; produksjon når menneskene sanker), egen Bønn (PP)-flate øverst til høyre først når bålet står, bunnmeny (Innsikter, Milepæler når første milepæl er nådd, Ragnarok), fart/utsnitt/zoom nederst til høyre og et uttrekkbart Innsikter-panel med undertittel etter stadium, kategorifaner først når to kategorier har innhold, kort med ikon, effekt, «i verden», kostnad, forklarende deaktivert knapp og fremdriftslinje, «NY»-merke og diskret «Ny innsikt»-melding. Fullførte engangsvalg forsvinner fra listen; det finnes ingen historikk.
- **GUI-01 · Milepæler**: nådde milepæler kan leses i samme panel. Verden-knappen fra konseptet er utelatt fordi det ikke finnes et system bak den ennå.
- **GUI-01 · samhandling**: Escape lukker panel/dialog, fokus flyttes til panelet og tilbake, synlig fokusring, mellomrom på en knapp pauser ikke lenger spillet, Ragnarok-dialogen kan lukkes ved klikk utenfor. Nye −/+ zoomknapper bruker eksisterende kamerazoom. Panelet glir inn på 250 ms og pauser ikke simuleringen.
- **GUI-01 · krav-type** `{ gathered: n }` i `requirementMet` (totalt sanket trevirke + stein), brukt kun til oppdagelse.
- Genesis-01 vertikal prototype som spillbar 2D-verden i nettleser (vanilla JavaScript + Canvas 2D, ingen avhengigheter). Start med `start.bat` eller `npm start` → http://localhost:5173. (Kontroll: kjørt og inspisert i forhåndsvisning)
- Simulering adskilt fra presentasjon (`src/sim/`): seedet startverden med bjørk, gran, steinblokker og tjern; fast tidssteg (1/60 s) uavhengig av bildefrekvens; deterministisk tilfeldighet.
- Organisk vegetasjon: trær vokser fra spire til fullvoksen (~2 min), hogst lager hogstskår, uttømte trær felles (fallanimasjon, stokk, stubbe) og vokser opp igjen; modne trær sprer frø til ledige plasser (tak: 130 trær). Steinblokker brytes ned blokk for blokk og fornyes sakte.
- Manuell sanking ved klikk på det faktiske treet/steinen med dempet tilbakemelding: risting, flis/løv/støv, liten «+1», og ressursen flyr til lageret.
- Synlig lager: vedstabel og steinhaug ved leirplassen vokser og krymper med beholdningen.
- Datadrevne oppgraderinger (`src/data/upgrades.js`): Første ly, Vekkelse, Felles ild, Hendene husker, Nytt hjem (3 ganger). Alle viser kostnad, effekt, «I verden» og krav, med tilstandene Låst / For dyrt ennå / Tilgjengelig / Bygges / Fullført.
- Automatisk tomtevalg og byggetrinn: lavvo (steinring → stenger → huddekke → dør) og rundhus (fundament → stolper → flettverk → takstoler → stråtak → dør); materialhaug som minker. Første ly bygges av guddommelig kraft, senere bygg av menneskene.
- Autonome mennesker med enkel tilstandsmaskin (finn oppgave → gå → hugg/bryt/bygg → bær → lever → hvil og be ved bålet), reservasjon av ressurser og trygg håndtering når målet forsvinner. Synlig gange, hogst, steinbryting, bygging, bæring og bønn.
- Felles ild med flammer, glød, gnister og røyk; mennesker hviler ved bålet og ber → bønnepoeng (PP). Ferdige hjem har røyk fra taket.
- Stier: der mennesker går ofte slites gresset bort til synlige jordstier.
- Milepæler (Første hjem, Første ild, Sammenhengende bosetting) med diskret melding; den siste låser opp områdezoom og glir kameraet jevnt ut (4,5 s) over samme verden.
- Kamera med zoom rundt markøren, panorering ved å dra, Nær/Område-knapper og sikker retur. Semantisk zoom: gress og småtall skjules i områdevisning, og en etikett viser boplassens størrelse.
- UI: ressurslinje med faktisk produksjon per sekund, Innsikter-skuff som åpner seg første gang noe kan kjøpes, veiledende hint, fartskontroll (pause/1×/2×/4×, tastatur mellomrom/1/2/3).
- Frivillig Ragnarok-demonstrasjon: forhåndsvisning av tap/bevaring/PrP, kan avbrytes; bekreftelse starter identisk grunnverden og beholder PrP. Permanente bonuser og varig avtrykk er plassholdere.
- Feilsøkingskroker ved `?debug` (spole frem, gi ressurser, kjøpe, styre kamera) for skjermbilder og manuell testing.
- La til prosjektets tre kanoniske Markdown-dokumenter: masterdesigndokument, endringslogg og agentinstruksjoner, slik at videre utvikling har et tydelig felles grunnlag. (Kontroll: innholdsgjennomgang)

### Fixed
- 2026-10-09: Innsikter-menyen ble først oppdatert ett sekund etter et kjøp, slik at kjøpt kort et øyeblikk fortsatt så kjøpbart ut. Menyen oppdateres nå i neste bilde. (Kontroll: kortet viser «Bygges» i bildet etter kjøp; 12/12 tester bestått)

### Tests
- **GUI-01**: `tests/gui.test.js` (11 tester): ingenting synlig ved start, oppdagelse ved første sanking (én hendelse), for dyrt kort med manglende ressurser og fremdrift og avvist kjøp, Vekkelse skjult til lyet står, kategorifaner, Nytt hjem gjentakbart til maks, hele tidligspillet uten skjulte kjøpbare valg (ingen softlock), ressurslinje/PP-synlighet, stadier og milepæler, ny syklus uten oppdagelser, tallformat. (Kontroll: `npm test` 30/30 bestått)
- **GUI-01**: `tools/gui-smoke.js` i forhåndsvisningen 30/30: åpne/lukke via knapp, Escape og lukkeknapp, fokusretur, NY-merke, kjøp via knappen med nøyaktig kostnad, fullført kort forsvinner, faner filtrerer, Milepæler, Ragnarok avbryt/bekreft og HUD-nullstilling, pekeren fanges av panelet og verden er klikkbar når det er lukket. Ingen konsollfeil. Kontrast målt mot sammensatte flater (se rapporten).
- 12 målrettede tester (`npm test`, Node sin innebygde testløper): klikk gir ressurser, uttømming/felling/gjenvekst, unge trær og steinfornyelse, oppgraderingsstatus og kostnadstrekk, byggetrinn, autonom sanking og at vist produksjon stemmer med leveranser, gjenoppretting når mål forsvinner, ingen vranglås uten ressurser, bygg uten overlapp og uten flytting, milepæl → zoom, determinisme, 40 minutters stabilitetskjøring og kameraets koordinat-rundtur/zoom. (Kontroll: 12/12 bestått)
- Visuell kontroll med skjermbilder i forhåndsvisning: startverden, delvis høstet tre, lavvo under bygging, ferdig ly med første mennesker, menneske som bryter stein på nært hold, utviklet leir med bål og hytte under bygging, områdezoom etter milepæl, utviklet boplass med stier, samt Ragnarok-dialog. Funn som ble rettet underveis: harde skyggeellipser, flekkete skyskygger, glisne bjørkekroner, for sterkt lysdryss, usynlige stier, hytte for nær trekrone.

### Docs
- **GUI-01**: `docs/gui-01/REPORT.md` (plan, tokens, oppdagelseslogikk, før/etter-skjermbilder, kontrast, begrensninger, forslag til GUI-02); `GAME_DESIGN.md` §13 beskriver grensesnittprinsippene; `AGENTS.md` §10 og `README.md` nevner nye verktøy og kontroller.
- 2026-10-09: Prosjektet er koblet til GitHub (`Soulbap/The-First-God`, gren `main`) oven på depotets eksisterende første commit; `.gitignore` lagt til.
- 2026-10-09: `README.md` erstatter plassholderen «# Incremental» med prosjektbeskrivelse, Genesis-01-omfang, forutsetninger, start, tester, kjente begrensninger og lenker til styringsdokumentene.
- 2026-10-09: `PLAYTEST.md` med kort sjekkliste for spilltesting (verden, mennesker, bosetting, kamera, spillfølelse).
- 2026-10-09: `AGENTS.md` §10 Teknisk arbeidsflyt: kommandoer, `?debug`-kroker, Git-regler (ingen force push), godkjenning av nye avhengigheter, og at spilltest kommer før Genesis-02.
- La til implementasjonsstatus for Genesis-01 i `GAME_DESIGN.md` §12 med antakelser merket som åpne.
- Definerte obligatorisk praksis for at AI oppdaterer denne endringsloggen ved alle prosjektendringer.

## [0.1.0] — 2026-10-09

### Added
- Etablerte det dokumenterte konseptgrunnlaget for THE FIRST GOD: realistisk painterly 2.5D, autonom sivilisasjon, synlig organisk vekst, semantisk zoom, frivillig Ragnarok og valgfri prestisje.
