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
