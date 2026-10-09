# THE FIRST GOD — Masterdesigndokument

> Status: Arbeidsgrunnlag v0.1  
> Språk: Norsk  
> Dette dokumentet skiller mellom **bekreftede prinsipper** og **åpne designspørsmål**. Bekreftede prinsipper skal ikke endres uten eksplisitt beslutning.

## 1. Spillidentitet

**THE FIRST GOD** er et rolig, visuelt taktilt incremental-/god game om å vekke liv, bygge sivilisasjon og utvide en verden til kosmisk skala. Spilleren er en skapergud, men kontrollerer ikke innbyggerne direkte: spilleren gir impulser, ressurser og velsignelser; menneskene velger, bygger, samler og former samfunnet autonomt.

Spillets særpreg er at **synlig, kontinuerlig organisk vekst er like viktig som tallvekst**. En ressursmåler må alltid ha en tydelig konsekvens i verden: et spirerikt landskap, flere stier, røyk fra ildsteder, hus, dyrket mark, bylys eller kosmiske strukturer.

### 1.1 Spillerfantasi

«Jeg starter som en ensom skapende kraft ved et tre og en stein. Med små inngrep blir verden levende, selvdrivende og til slutt kosmisk — uten at jeg mister muligheten til å vende tilbake og se den første leiren.»

### 1.2 Designpilarer — bekreftet

1. **Verden før paneler.** Tall forklarer fremgang; miljøet beviser den.
2. **Lett guddommelig styring.** Spilleren setter retning og tempo, ikke arbeidsordrer til enkeltpersoner.
3. **Lett å lese, rikt å observere.** Enkle valg med synlige konsekvenser.
4. **Skala uten brudd.** Samme verden leses fra leir til galakse gjennom semantisk zoom.
5. **Nye sykluser, kjent begynnelse.** Hver syklus begynner i samme grunnverden, men utvikles ulikt gjennom valg.
6. **Ingen unødig kompleksitet.** Hvis en mekanikk ikke skaper et tydelig valg, en visuell endring eller en sterk følelse, skal den forenkles eller fjernes.

## 2. Presentasjon og kameraregler

### 2.1 Visuell retning — bekreftet

- **Realistisk painterly 2.5D.** Natur, lys og materialer skal føles maleriske og jordnære, ikke blanke, leketøyaktige eller sterkt cartoony.
- **Skrått ovenfra-terrenget.** Kameraet ser ned på en lesbar vinkel; terrenget gir dybde med høydekart, skygger, vegetasjon og stier.
- **Oppreiste sprites/figurer.** Mennesker, dyr, trær og enkelte objekter står visuelt opp fra terrenget for klar silhuett og liv, mens de fortsatt forankres med kontaktsskygge og fotplassering.
- **Dempet naturpalett.** Jord, stein, mose, tre, røyk og varmt ildlys dominerer tidlig. Mer intens farge brukes sparsomt for guddommelig kraft, viktige valg og sene kosmiske fenomener.
- **Bevegelse skal fortelle.** Små figurer går, bærer, hugger, samler, bygger og samles. Vind, vann, røyk, skyer og lys gir verden kontinuitet.

### 2.2 Kamera og semantisk zoom — bekreftet

Zoom er ikke bare optikk; den skifter hva spilleren kan forstå og gjøre.

| Nivå | Synlig skala | Primær lesning | Eksempler på synlig endring |
|---|---|---|---|
| Nær | Tre, stein, mennesker, leir | Direkte skapelse og tidlig innsamling | Små spirer, vedhauger, bål, første hytte |
| Område | Leir, marker, skog, nærområder | Samfunnets rytme og oppgraderingsutfall | Stier, åkrer, verksteder, handel |
| Verden | Kontinenter og klima | Sivilisasjonens fotavtrykk | Byklynger, skoger, veier, lys om natten. **Bekreftet implementasjon (GAMEPLAY-10):** verdensoversikt over et grovt kart; hjemmeregionen er én rute |
| Planet | Hel klode | Planetarisk helse og epoke | Biomfordeling, hav, polarlys, nattlys |
| Solsystem | Planeter og baner | Ekspansjon og større mål | Kolonier/objekter, lysfenomener |
| Galakse | Stjernesystemer | Kosmisk arv og syklusens sluttbilde | Stjernenett, guddommelige spor |

Retur fra alle nivåer skal være umiddelbar og bevare spillerens kontekst. Spilleren skal alltid kunne vende tilbake til detaljvisningen og se resultatet av den første leiren.

## 3. Kjernespilløkke

1. **Observer:** Spilleren ser ressurser, mennesker og verdens tilstand.
2. **Grip inn:** I starten klikkes naturressurser manuelt; senere velges oppgraderinger, velsignelser eller langsiktige retninger i menyer.
3. **Menneskene handler:** Autonome mennesker samler, transporterer, bygger og former mønstre i verden.
4. **Verden svarer:** Tall øker, men viktigere: terreng, bebyggelse, aktivitet og lyd/lys endres kontinuerlig.
5. **Velg retning:** Nye menyvalg forsterker en spillestil eller låser opp en synlig transformasjon.
6. **Utvid perspektivet:** Milepæler åpner neste semantiske zoomnivå, uten å fjerne tilgang til tidligere nivåer.

### 3.1 Tidlig spill: den første handlingen — bekreftet

Spillet åpner tett på **et tre og en stein**. Spilleren klikker manuelt på disse for å frembringe de første basale ressursene, for eksempel trevirke og stein. De første menneskene oppdager eller mottar ressursene og begynner å samle og bruke dem.

Målet er ikke en lang clicker-fase. Manuell clicking etablerer en fysisk forbindelse til skapelsen; autonomi skal overta raskt når spilleren har gitt verden et startgrunnlag.

### 3.2 Hva spillet ikke er — bekreftet

- Ingen byggplassering på rutenett eller fri plassering av enkelthus.
- Ingen områdemarkering for arbeidssoner.
- Ingen direkte mikrostyring av individuelle mennesker.
- Ingen omfattende produksjonskjeder med mange mellomprodukter uten tydelig visuell og strategisk verdi.
- Ingen krav om optimalisering for å oppleve verdens vekst.

## 4. Ressurser, mennesker og handlinger

### 4.1 Ressursmodell

Tidlig versjon skal ha få, lett forståelige ressurser.

| Ressurs | Kilde | Bruk | Visuell manifestasjon |
|---|---|---|---|
| Trevirke | Klikking, autonome sankere, skog | Ild, hytter, enkle konstruksjoner | Felte stokker, bål, trebygninger |
| Stein | Klikking, autonome sankere, berg | Fundament, forbedringer, monumenter | Steinlagre, murer, brudd |
| Mat | Natur og senere jordbruk | Befolkningsvekst, utholdenhet | Sankere, åkrer, dyrking |
| Kunnskap | Aktivt samfunn og milepæler | Teknologiske/åndelige valg | Samlingssteder, symboler, verksteder |
| Prayer Points (PP) | Menneskers bønn og tillit | Guddommelige, midlertidige eller strategiske inngrep | Lys, ritualer, oppadgående glød |
| Prestige Points (PrP) | Avsluttet Ragnarok-syklus | Valgfrie permanente bonuser | Varig tegn i metaprogressen |

Tall og navn kan justeres under implementasjon, men ressurslisten skal holdes kort. Ny ressurs må begrunnes med et nytt forståelig valg og et synlig resultat.

### 4.2 Autonome mennesker — bekreftet

Mennesker er ikke bare en teller. De er synlige aktører med en enkel beslutningsmodell:

- De søker nærliggende nyttige oppgaver: samle, transportere, spise, hvile, bygge eller be.
- De velger ikke eksakt optimal oppførsel; små variasjoner gjør leiren organisk.
- De bygger når fellesskapet har ressurser og en relevant oppgradering/utvikling er aktivert.
- De ber når liv, trygghet, undring eller guddommelig innflytelse utløser det.
- Spilleren påvirker prioritet indirekte gjennom oppgraderinger og velsignelser, ikke via ordre til individer.

### 4.3 Prayer Points — bekreftet

Prayer Points skapes av mennesker, ikke ved passiv venting alene. PP skal føles som en relasjon mellom menneskene og guden: flere trygge, håpefulle eller forundrede mennesker gir flere anledninger til bønn.

PP brukes på avgrensede guddommelige handlinger, eksempelvis en kort fruktbarhetsvelsignelse, inspirasjon, værskifte eller beskyttelse. Effekter må vises i verden og ikke bare som skjulte prosentbonuser.

## 5. Progresjon og valg

### 5.1 Menybaserte oppgraderinger — bekreftet

Oppgraderinger tilbys i en tydelig meny. De representerer guddommelige innsikter, velsignelser eller samfunnsretninger. En oppgradering skal minst gjøre én av følgende:

- endre en synlig del av verden,
- gi menneskene en ny autonom handling,
- åpne en ny skala eller milepæl,
- skape et reelt, enkelt valg mellom spillestiler.

Unngå oppgraderinger som kun sier «+5 %» uten en lesbar følge.

### 5.2 Eksempeloppgraderinger

| Fase | Oppgradering | Effekt | Synlig følge |
|---|---|---|---|
| Genesis | **Vekkelse** | De første menneskene våkner og kan samle | Leiren får bevegelse og første bål |
| Genesis | **Gavmild jord** | Mat blir lettere tilgjengelig, flere overlever | Spirende vegetasjon og sankere |
| Leir | **Hendene husker** | Innsamling blir delvis autonom | Folk bærer ved og stein til lager |
| Leir | **Felles ild** | Mennesker samles; bønn blir mulig | Bål, røk og kveldslys |
| Bygdevekst | **Frøets løfte** | Jordbruk og stabil mat | Åkerlapper, gjerder, sesongfarge |
| Bygdevekst | **Steinens løfte** | Mer solide bygg og monumenter | Fundamenter, steinbygg, arbeidere |
| Verden | **Veier mellom oss** | Raskere flyt og større bosettingsnettverk | Stier utvikles til veier |
| Planet | **Den blå eden** | Planetarisk forvaltning/helse | Synlige biomer og renere hav/luft |

Tallbalanse og endelig trestruktur er åpent. Prototypen skal bruke få valg for å teste om hvert valg er forståelig og visuelt tilfredsstillende.

### 5.3 Milepæler

| Milepæl | Utløser | Spillopplevelse | Åpner |
|---|---|---|---|
| Første ild | Nok trevirke + mennesker | Leiren føles bebodd | PP og fellesskapsvalg |
| Første hjem | Ressurser + autonom bygging | Synlig trygghet og stabilitet | Befolkningsvekst |
| Første åker | Mat-/utviklingsvalg | Landskapet formes av mennesker | Bygdevekst |
| Sammenhengende bosetting | Flere samfunnsmilepæler | Områdevisning blir meningsfull | Verdenskart/zoom |
| Den første landsbyen | Fire hjem, åtte mennesker, felleslager og landsbyildsted | Leiren leses som et hjem for mange | Videre bygdevekst (åpen) |
| Planetbevissthet | Sivilisasjonsmål | Hele kloden kan leses | Planetvisning |
| Stjernealder | Sent progresjonsmål | Solsystemet blir relevant | Kosmisk ekspansjon |
| Galaktisk arv | Langsiktig mål | Syklusen leses i enorm skala | Valgfri Ragnarok/Prestige |

## 6. Sykluser, Ragnarok og Prestige

### 6.1 Samme start, ulike verdener — bekreftet

Hver ny syklus starter i identisk grunnverden: samme tre, samme stein, samme topografi og samme introduksjon. Det gir sammenlignbarhet og en tydelig skapelsesmyte.

Utfallene skal likevel divergere gjennom spillerens valg: for eksempel naturorientert, fellesskapsorientert, kunnskapsorientert eller ekspansjonsorientert utvikling. Divergens skal primært vises i landskapet og samfunnets silhuett, ikke bare i statistikk.

### 6.2 Ragnarok — bekreftet

Ragnarok er en **frivillig, tidlig tilgjengelig** avslutning av en syklus når spilleren opplever stagnasjon eller ønsker en ny retning. Det er ikke en straff og ikke en skjult «game over».

Før bekreftelse skal spilleren se en enkel oppsummering: hva som går tapt, hva som beholdes, hvilke Prestige Points som tildeles og hvilket varig avtrykk syklusen etterlater. Bekreftelsen må være bevisst og reversibel frem til siste valg.

### 6.3 Prestige Points og permanente bonuser — bekreftet

Prestige Points er metaressursen fra avsluttede sykluser. Permanente bonuser er **valgfrie**; spilleren skal kunne starte en ny syklus uten å kjøpe dem.

Eksempler:

- **Gamle røtter:** Første trevirke kommer litt raskere.
- **Glemselens vennlighet:** Første autonome samler låses opp tidligere.
- **Ekko av bønner:** Første PP oppnås raskere etter første ild.
- **Stjernekart i asken:** Et senere zoommål introduseres litt tidligere.

Permanente bonuser skal forkorte etablering eller åpne stilvalg — ikke gjøre alle tidligere valg irrelevante.

## 7. Genesis-01: vertikal prototype

### 7.1 Formål

Genesis-01 er en liten, komplett vertikal skive som beviser kjernefølelsen før bredere innhold bygges. Den skal kunne demonstreres fra tom start til en levende første leir på få minutter.

### 7.2 Innhold

- Én fast kartscene med tre, stein, gress, enkel høyde og lys.
- Manuell clicking på tre og stein.
- To til fem synlige mennesker som våkner og går autonomt.
- Basale tellere for trevirke, stein og mennesker.
- Minst tre menyvalg: Vekkelse, Hendene husker og Felles ild.
- Autonom innsamling etter relevant oppgradering.
- Bål, enkel hytte eller begge som synlige resultater.
- Enkel PP-generering fra menneskelig aktivitet ved bålet.
- Nær- og områdezoom, inkludert sømløs retur.
- Én demonstrasjonsknapp for frivillig Ragnarok med oppsummering; permanent bonus kan være en placeholder i første iterasjon.

### 7.3 Utenfor Genesis-01

- Full planet-, solsystem- og galaksesimulering.
- Mange ressurstyper eller avanserte produksjonskjeder.
- Komplette biomer, handel, krig, diplomati eller fiender.
- Innhold som krever byggplassering eller detaljstyring.

### 7.4 Akseptansekriterier

Genesis-01 lykkes når en ny spiller uten forklaring kan:

1. forstå at treet og steinen kan klikkes,
2. se at menneskene faktisk bruker det som skapes,
3. velge en oppgradering fra en enkel meny,
4. oppdage minst to tydelige endringer i verden,
5. zoome ut og tilbake uten å miste sted eller mening,
6. forstå Ragnarok som et frivillig syklusskifte.

## 8. Implementasjonsarkitektur

Arkitekturen skal holde modell, simulering, presentasjon og innhold adskilt slik at en ny funksjon ikke trenger å endre alt.

| Lag | Ansvar | Eksempler |
|---|---|---|
| Domenemodell | Autoritativ spilltilstand og regler | Ressurser, mennesketilstand, oppgraderinger, syklus |
| Simulering | Diskrete/tidsbaserte oppdateringer | Finn oppgave, gå, samle, lever, bygg, be |
| Progresjon | Krav, belønning, valg og milepæler | Oppgraderingstre, PP, PrP, Ragnarok |
| Verdenspresentasjon | Oversetter tilstand til synlig verden | Sprites, terrengvariasjon, bygg, VFX, lys |
| Kamera/zoom | Skalanivå og kontekstbevaring | Nær/område/verden/planet/system/galakse |
| UI | Målrettede handlinger og tydelig feedback | Ressurslinje, oppgraderingsmeny, milepælpanel |
| Persistens | Lagre/lese stabil spilltilstand | Versjonert save-format, migreringer |

### 8.1 Data- og innholdsregler

- Oppgraderinger og milepæler skal være datadrevne der det er praktisk: id, navn, kostnad, krav, effekter, visuell følge og tekst.
- Presentasjon skal observere spilltilstand; den skal ikke eie økonomiske regler.
- Simulering skal kunne testes uten renderer.
- Tilfeldighet skal være seedet eller injiserbar når den påvirker spillregler, slik at feil kan gjenskapes.
- Legg til nye systemer først når Genesis-01s kjerneopplevelse fortsatt er tydelig.

## 9. Visual quality gates

En funksjon er ikke visuelt klar bare fordi den finnes i data/UI. Følgende porter gjelder ved relevante endringer:

1. **Lesbar silhuett:** Mennesker, ressurser og hovedbygg kan skilles fra terreng ved normal zoom.
2. **Forankring:** Oppreiste sprites har troverdige kontaktpunkter/skygger og «flyter» ikke visuelt.
3. **Årsak → virkning:** En oppgradering, bønn eller ressursendring har en synlig reaksjon innen rimelig tid.
4. **Kontinuerlig liv:** Scenen har rolig bakgrunnsbevegelse og autonome handlinger; den føles ikke som en statisk tavle.
5. **Zoom-kontinuitet:** Overgang og retur beholder spillerens orientering, og viktig informasjon blir ikke bare borte.
6. **Stilmessig samsvar:** Painterly, realistisk og dempet uttrykk bevares; ny grafikk vurderes opp mot referansescenen.
7. **UI-tilbakeholdenhet:** Panelet konkurrerer ikke med verden om oppmerksomhet.

## 10. Bekreftet vs. åpent

### Bekreftet

- Realistisk painterly 2.5D med skrått ovenfra-terrenget og oppreiste sprites.
- Organisk, kontinuerlig synlig vekst er like sentral som incremental-tall.
- Starter tett på tre/stein med manuell clicking.
- Menybaserte oppgraderinger; ingen byggplassering, områdemarkering eller mikrostyring.
- Autonome mennesker bygger og samler.
- Semantisk zoom fra leir til planet, solsystem og galakse, med retur til detaljvisning.
- Identisk startverden per syklus, men ulike utviklingsvalg.
- Ragnarok er frivillig og tilgjengelig tidlig ved stagnasjon.
- Prestige Points og valgfrie permanente bonuser.
- Prayer Points kommer fra mennesker.
- Lav systemkompleksitet er en aktiv designregel.
- (GAMEPLAY-07..10) Byer, kunnskap, flere bosettinger og en flermåls verdensmodell med utposter er bygget uten byggplassering, mikrostyring eller obligatorisk Ragnarok.

### Åpne designspørsmål

1. Hva er den eksakte begrunnelsen/narrativen for at mennesker ber og at spilleren er «den første guden»?
2. Hvor lenge bør en tilfredsstillende syklus vare i aktiv spilletid?
3. Hvilke fire til seks utviklingsretninger skal være tydeligst i første fullversjon?
4. Skal negative hendelser eksistere, og hvordan kan de gi dramatikk uten å bli frustrerende mikrostyring?
5. Hvilke planet- og kosmoshandlinger er meningsfulle videreføringer av den nære leiropplevelsen?
6. Hvordan skaleres lyd og musikk med zoom og vekst?
7. Hvilke permanente bonuser bevarer valgfrihet best uten å skape obligatoriske meta-optimaliseringer?

Åpne spørsmål skal ikke løses ved å legge til systemer på forhånd. Beslutning tas når en prototype eller test viser behovet.

## 11. Prinsipp for videre utvikling

Hver ny endring må kunne besvare: «Hva kan spilleren se i verden som følge av dette?» Hvis svaret bare er et større tall, må endringen få en synlig følge, kombineres med en annen effekt eller avvises. Den minste helhetlige iterasjonen er alltid foretrukket.

## 12. Genesis-01 — implementasjonsstatus (2026-10-09)

Prototypen finnes og er spillbar. Denne seksjonen beskriver hva som er bygget og hvilke antakelser som ble gjort. Bekreftede prinsipper over er ikke endret.

### GAMEPLAY-02 — fra leir til landsby (bekreftet implementasjon)

- **Felles lager**, **Ordnet arbeid** og **Landsbyildsted** er menyvalg med synlige, autonome følger. Lageret blir nytt leveringspunkt; ordnet arbeid øker sanking og bygging; ildstedet blir nytt hvilested og bønnesenter.
- Bosettingen velger fortsatt tomter selv, i deterministiske ringer rundt leirens sentrum. Bygg har avstandskrav mot hverandre, trær, stein og tjern; spilleren velger aldri plassering eller arbeidsordre.
- **Den første landsbyen** oppnås av faktisk utvikling: fire hjem (inkludert første ly), minst åtte mennesker, ferdig lager og ferdig ildsted. Den gir en kort norsk milepælsmelding og rolig områdezoom uten å stanse simuleringen. Redusert bevegelse hopper over den ikke-essensielle kameraglidningen.
- Bekreftet (GAMEPLAY-04): Etter **De første stiene** kan **Nye horisonter** la én utforsker finne en deterministisk, tørr lysning med lokale ressurser. **Grunnleggelse** flytter tre virkelige innbyggere dit; de reiser første hytte og ildsted med den delte ressursbeholdningen. Den unge bosettingen bruker samme menneske- og slitasjesimulering som den første, og den gjentatte reisen lar en forbindelse vokse fram uten veiordre.
- Bekreftet (GAMEPLAY-05): **Voksende slekter** åpner langsom, boligbegrenset lokal vekst. **Mellom ildstedene** bruker fortsatt den lesbare, felles beholdningen, men reserverer materialer når en bærer drar og lar dem først telle for den unge bosettingens prosjekt ved fysisk ankomst. Lager, hjem og fellesplass bygges etter tur uten plassering eller arbeidsordre. Dette er logistikk, ikke et handelsmarked eller lokale økonomier.
- Bekreftet (GAMEPLAY-05): Fullførte regionale leveranser forsterker bare den jordstien de faktiske bærerne går. Det er fortsatt nøyaktig to bosettinger; skog, jordbruk, markeder og videre kolonisering er utenfor denne fasen.

### GAMEPLAY-03 — den levende landsbyen (bekreftet implementasjon)

- Leveranser, byggereiser og returer sliter bakken mer enn tilfeldig gange. De samme, faktiske reisene bygger gradvis opp smale, ujevne jordspor; ildsted, lager og hjem har fortsatt bare diskret brukt mark rundt inngangene.
- Etter at lager og landsbyildsted står, veksler menneskene mellom produktive oppgaver, korte hvil ved ilden og korte vedlikeholdsbesøk ved hjem, lager eller ildsted. Uferdig bygging har alltid prioritet, og ingen arbeidsordre gis av spilleren.
- **Utforskertrang** er en valgfri innsikt etter **Den første landsbyen**. Én ledig innbygger går av og til ut på tilgjengelig terreng, blir kort borte og vender tilbake; den lette slitasjen gjør de første utgående sporene synlige. Dette utløser **De første stiene**.
- Avgrensning: Utforskning avslører ikke kart eller nye ressurser. GAMEPLAY-04 bygger videre med nøyaktig én andre bosetting og en regional kameraramme, ikke et verdenskart eller en koloniseringssløyfe.

### GAMEPLAY-06 — sivilisasjonens morgen (bekreftet implementasjon)

- **Frøets løfte** åpner den første autonome åkeren og en delt matbeholdning. Mat blir høstet med jevne mellomrom og brukes bare til boligbegrenset vekst; lav beholdning bremser fremgang uten å fjerne innbyggere eller allerede bygd innhold.
- **Arbeidets deling** gjør en bosettings identitet lesbar uten spillerstyring: åker gir Matbygda, verksted gir Håndverksbygd, mens øvrige bosettinger beskrives ut fra nærmeste skog eller stein. **Regional utveksling** lar den samme, fysiske leveringsflyten finansiere åker og verksted i den unge bosettingen.
- Bosettingenes stadium avledes av befolkning, ferdige hjem, funksjonell infrastruktur og regional forbindelse: Leir, Grend, Landsby, Voksende landsby og Tidlig by. Det finnes fortsatt ingen byggplassering, arbeidsordre eller handelsmarked.
- Nye milepæler er **Stabil matforsyning**, **Den første byen** og **Sivilisasjonens morgen**. Denne første implementasjonen holder fortsatt to bosettinger og en delt beholdning, med en bevisst liten økonomi.

### GAMEPLAY-07 — byenes tid (bekreftet implementasjon)

- **By** og **Storby** er nye bosettingstrinn. De kommer av ti målbare krav (folk, boligkapasitet, bolighus, mat, infrastruktur, sagbruk, steinhoggeri, torg, foredlede varer, fullførte leveranser) og aldri av én ressursterskel. Rike-panelet viser hva som mangler.
- **Planker** og **tilhugget stein** er de eneste nye råvarene. Sagbruk og steinhoggeri arbeider av seg selv når bosettingen har folk, med reserve (vanlig bygging sultes aldri) og lagertak (torget dobler taket). De brukes til bolighus, torg, hall og senere prosjekter.
- **Bolighus** rommer fire; kapasiteten styrer all befolkningsvekst. Ingen eksponentiell vekst: én innbygger per runde per bosetting, bundet av mat og bolig.
- Milepælen **En by reiser seg**. Bygg velges og plasseres fortsatt av menneskene.

### GAMEPLAY-08 — den organiserte sivilisasjonen (bekreftet implementasjon)

- **Kunnskap** kommer bare fra virksomhet: foredling (sagbruk/steinhoggeri), verksted og **Kunnskapshallen** (mer med flere folk). Roller og fremskritt multipliserer.
- Fem fremskritt (**Organisert håndverk**, **Bedre jordbruk**, **Byggemetoder**, **Delt kunnskap**, **Samfunnsorden**) låser opp målbare evner. Ingen stort teknologitre.
- Roller avledes av bygg og lokale forhold (Kunnskapssete, Bysenter, Sagbruksbygd, Steinhoggerbygd, Matbygda, Håndverksbygd, Skogbygd, Steinbygd) og har små, målbare fordeler. Ingen manuell rollevelger.
- Milepælen **Kunnskapens tidsalder**: fire fremskritt, hall og kunnskap bygget opp.

### GAMEPLAY-09 — det voksende riket (bekreftet implementasjon)

- Opptil **fire** bosettinger. **Flere ildsteder** åpner autonom grunnleggelse; hver gang kreves matsikkerhet, folkeoverskudd, materialer, ledige hender, ro siden sist, en forrige bosetting som har begynt å vokse og et gyldig sted. Spilleren velger aldri sted. Forsyningene for reisen brukes opp, følget (tre mennesker) går fysisk og bosettingen starter som én hytte.
- Tomtevalg er deterministisk: tørt land, avstand, trygg vei utenom tjernet, fritt areal, nærliggende skog/stein/vann og et bonusledd for roller riket mangler (skog → sagbruk, stein → steinhoggeri, jord → åker).
- **Handelsruter** er avledet av fullførte turer (hovedstadens leveranser og satellittenes sanketurer). En rute er etablert etter tre turer. Stiene i landskapet er fortsatt menneskenes faktiske slitasje.
- Milepælen **Et sammenhengende rike**: fire bosettinger, by, leveranser, tre ulike roller, tre ruter og Handelsveier.

### GAMEPLAY-10 — verdens daggry (bekreftet implementasjon)

- **Flermålsmodell** (ærlig, ikke en simulert planet): hjemmeregionen er den detaljerte verdenen (ekte mennesker, bygg, ruter). 14 fjerne land er deterministisk tilstand (ukjent → oppdaget → utpost → etablert) med enkle tidtakere. Ingen enkeltpersoner simuleres utenfor hjemmeregionen.
- **Hinsides de kjente landene**: følger går ut over kartkanten og kommer hjem med kunnskap. **Den store ekspedisjonen**: nybyggere forlater hjemmeregionen for godt; utposten vokser og sender **karavaner** (ekte figurer som går inn over kanten og leverer). **En forbundet verden**: tyngre karavaner og flere utposter (opptil fire).
- **Verden-oversikten** låses opp av Et sammenhengende rike. Zoom forbi områdevisningen åpner den, zoom inn eller Område/Nær gir sikker retur.
- Sivilisasjonstrinn (Spirende samfunn → Regional → Organisert → Sammenhengende rike → Verdensbevisst → Verdens første sivilisasjon) avledes av milepæler og verdenstilstand.
- Milepælen **Verdens første sivilisasjon** krever virkelig utforskning (fire land), to utposter og seks karavaneleveranser.

### Spillflyt slik den er bygget

1. Spilleren klikker på bjørka og steinen (og andre trær/steiner) for trevirke og stein.
2. **Første ly** (10 trevirke, 5 stein): en lavvo reises steg for steg av guddommelig kraft.
3. **Vekkelse** (12/6, krever ferdig ly): to mennesker våkner i lyet og sanker selv.
4. **Felles ild** (15/10) og **Hendene husker** (20/14): menneskene bygger et bål, hviler og ber der (PP); sanking blir raskere og børene større.
5. **Nytt hjem** (30/20, ×1,45 per kjøp, maks 3): menneskene bygger et rundhus; to nye mennesker vandrer inn når det står.
6. Milepælen **Sammenhengende bosetting** (bål + to hjem) låser opp områdezoom og glir kameraet ut over samme verden.
7. Etter **Den første landsbyen** kan spilleren velge **Utforskertrang** (64 trevirke, 44 stein). En autonom utforsker går periodisk utenfor bosettingen og vender hjem; milepælen **De første stiene** markerer retningen videre.

### Antakelser — åpne

- **GAMEPLAY-07..10 (nye antakelser):** Alle byinfrastrukturen bygges i hovedstaden (første bosetting) — andre bosettinger får spesialbygg gjennom planen sin. Kunnskap, planker og tilhugget stein er felles beholdninger (som tre og stein). Utposter og ekspedisjoner er en abstrakt tidtaker, ikke en simulering. Tallbalansen (tider, kostnader, tak) er provisorisk; hele reisen tar ca. 115 min for en grådig bot og er ikke spilltestet av mennesker.
- **Første ly og Nytt hjem** er lagt til ved siden av designets tre navngitte valg for å vise bygging og bosettingsvekst. Vekkelse er beholdt som eget valg etter lyet.
- **Stein fornyes sakte** (1 per 35 s per blokk) slik at økonomien ikke stopper. Det er ikke naturtro, og kan erstattes av nye steinkilder senere.
- **PP har foreløpig ingen bruk.** De vises og skapes av mennesker ved bålet; guddommelige handlinger kommer senere.
- **Ragnarok** er en demonstrasjon: forhåndsvisning, frivillig bekreftelse og samme startverden. PrP-formelen og varig avtrykk er plassholdere; permanente bonuser kan ikke kjøpes ennå.
- Alle balanseverdier i `src/data/balance.js` og `src/data/upgrades.js` er provisoriske.
- **Teknisk grunnlag:** vanilla JavaScript + Canvas 2D med prosedyralt malt grafikk og ingen avhengigheter. Pakking som portabel Windows-app (Electron) er ikke gjort.
- **VISUAL-02 · levende miljølag:** skogbunn og forstyrret jord avledes fra gjeldende trær, bygg og slitasje, og oppdateres høyst hvert tiende spillsekund. Det er bare presentasjon: ressursøkonomi, kollisjon, tomtevalg og menneskenes oppgaver endres ikke.
- **VISUAL-03 · bosettingen setter spor:** bygg gir først beskjedne, ujevne arbeidsmerker; marken ved innganger, lager og bål blir gradvis mer brukt når mennesker, leveranser og samlingssteder finnes. Menneskenes faktiske gange er fortsatt hovedkilden til stier. Ingen vei-bygging, arbeidsordrer eller ny navigasjon er lagt til; se `docs/visual-03/REPORT.md`.

### Kjent avstand til visuell målsetting

Grafikken er prosedyralt malt i koden, ikke håndmalte assets. Den står opp mot «realistisk painterly 2.5D» i tone, palett og forankring, men terrenget blir mykt/uskarpt på nært hold, felte stokker er enkle former, og menneskene er forenklede figurer. Visual quality gate 6 (stilmessig samsvar) regnes derfor som **delvis oppfylt**.

## 13. Grensesnitt — guddommelig minimalisme (GUI-01, 2026-10-09)

Grensesnittet skal oppleves som en stille, guddommelig intelligens som observerer og leder. Verden er fortsatt blikkfanget. Tekniske detaljer og skjermbilder: `docs/gui-01/REPORT.md`.

### Bekreftet (prosjektansvarlig, GUI-01-spesifikasjonen)

- **Progressiv oppdagelse.** Innsikter som ikke er relevante ennå, er helt skjult — ingen grå kort, plassholdere eller fremtidige priser. En oppdaget innsikt forblir synlig i syklusen; for dyre kort er fullt lesbare og viser hva som mangler.
- **Ingen historikk.** Fullførte engangsvalg forlater listen; effektene står igjen i verden. Det finnes ingen historikkknapp eller arkiv over kjøpte valg.
- **Faste plasseringer på tvers av epoker:** ressurser øverst til venstre, guddommelig kraft øverst til høyre, hovedmeny nederst i midten, fart/zoom nederst til høyre, Innsikter som panel fra høyre. Senere epoker endrer uttrykk (farger, ikoner, kategorier), ikke oppsett.
- **Ingen døde knapper.** Navigasjon vises bare når et system står bak (Milepæler etter første milepæl; «Verden» er utelatt til det finnes et verdenskart).
- Panelet pauser ikke simuleringen. Ragnarok er alltid frivillig og kan avbrytes.
- **GUI-02 · evolusjonsfeedback.** Oppdagelser og milepæler presenteres som korte, ikke-blokkerende HUD-meldinger. Én melding vises om gangen; milepæler prioriteres foran vanlige oppdagelser, og Ragnarok fjerner foreldede meldinger. Første ly, Vekkelse og Felles ild er betydningsfulle oppdagelser; Sammenhengende bosetting er en større milepæl. Kamera og simulering avbrytes ikke.

### Antakelser — åpne

- **Oppdagelsesutløsere:** Første ly ved første sanking; Vekkelse når lyet står; Felles ild og Hendene husker etter Vekkelse; Nytt hjem når bålet står. Ellers gjelder kjøpskravene.
- **Kategorier** (Liv, Bosetning, Tro) vises som faner først når minst to har aktive innsikter. Tildelingen per innsikt står i `src/data/upgrades.js`.
- **Undertittel etter stadium:** Skapelsens morgen → Det første lyet → Den første leiren → Den første bosetningen.
- Merket på Innsikter-knappen teller valg som kan kjøpes nå; «NY» markerer innsikter spilleren ikke har sett i panelet.
- Typografi bruker systemfonter (Palatino Linotype / Segoe UI) for å unngå nye avhengigheter; en lisensiert visningsfont kan vurderes senere.
