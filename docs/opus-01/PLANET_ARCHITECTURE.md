# OPUS-01 — Planetarkitektur

Hvordan den rektangulære verdensoversikten ble erstattet av en planet som *er* den samme verdenen, og hvordan arkitekturen kan bære solsystem, galakse og univers senere.

## 1. Oversikt

```
Nær ──zoom──▶ Område (2D-verdenen, 2400×1600 enheter)
                    │  rull ut forbi største utsnitt / «Planet» / V
                    ▼
        Region ──▶ Kontinent ──▶ Planet        (WebGL-kule, samme kamera hele veien)
                    ▲
                    │  rull inn til bakken / klikk på hjemlandet / «Område»/«Nær»
```

| Lag | Fil | Ansvar | Testbar uten nettleser |
|---|---|---|---|
| Geografi | `src/sim/planet.js` | Deterministisk planet fra frøet: høyde, fuktighet, temperatur, landskap; hjemmets posisjon; landenes posisjoner; verden ↔ planet | Ja (`tests/planet.test.js`) |
| Overflatemaling | `src/render/planetTexture.js` (+ `planetWorker.js`) | Global ekvirektangulær tekstur (2048×1024) og lokal tekstur rundt hjemmet (2048², ±0,62 rad), bakt én gang per side i en Web Worker | Ja (rene piksel-arrays) |
| Kamera | `src/view/globe.js` | Høyde over et fokuspunkt, projeksjon/tilbakeprojeksjon, eksakt bredde ↔ høyde, glid, dra | Ja |
| Tegning | `src/render/globe.js` | WebGL 1-shader (stråle–kule), overlegg med navn/ruter/ekspedisjoner, valg med pekeren, visningsmodell | Visningsmodellen ja; shaderen via nettleser |
| Kobling | `src/main.js` | Når planeten åpnes/lukkes, øyeblikksbilde av verdenen, input, avsløringen | Nettleser (`tools/gui-smoke-realm.js`) |

Simuleringen er **uendret i skala**: hjemmeregionen simuleres i detalj (mennesker, bygg, slitasje), de 14 fjerne landene er fortsatt tilstand + tidtakere (`worldmap.js`). Planeten leser bare tilstanden.

## 2. Geografi og koordinater

- Enhetsvektorer på kula, z mot nordpolen. Hjemmet ligger på 46–54° N (avledet av frøet).
- **Hjemmeregionen** er et rektangel i tangentplanet ved hjemmet: bredde `PLANET.patchW = 0,08 rad` (~4,6°), høyde etter verdens sideforhold (3:2). Verden (x, y) → lokal (øst, nord) = ((x/W − ½)·bredde, −(y/H − ½)·høyde) → kula via eksponentialavbildningen (`offsetDir`). Øst i verden er øst på planeten; nord er opp.
- **Fjerne land** (5×3-rutenettet i `globe.regions`) plasseres i samme tangentplan: forskyvning `(dx, −dy)·0,17 rad`, der (dx, dy) er rutens avstand fra hjemmeruten. Bare avstanden varierer (±10 %), **retningen er nøyaktig den samme som `edgePoint` bruker** når karavaner og ekspedisjoner går over kartkanten. En karavane som kommer inn fra nordøst i den detaljerte verdenen, kommer fra et land som ligger nordøst på planeten (testet).
- **Landskap**: lagdelt 3D-verdistøy på kula (ingen polsøm), et kontinent rundt hjemmet, og hvert land trekker høyde og fuktighet mot mål for sitt landskap: fjell → høyt og ulendt, skog → fuktig, slette → tørt og flatt, kyst → en havbukt vendt bort fra hjemmet, dal → lav bunn mellom rygger. Testet for sju frø: alle land ligger på land med riktig landskap.

## 3. Rendering

- **Én fullskjermtrekant**; fragmentshaderen regner stråle–kule-skjæring analytisk. Ingen mesh, perfekt kule på alle avstander.
- **Teksturer**: global (mipmappet, gjentas over datolinjen) + lokal høyoppløst rundt hjemmet (blendes inn innenfor ±0,62 rad) + **levende øyeblikksbilde av den detaljerte verdenen** (1536×1024), malt av den vanlige 2D-rendereren uten skjermpynt og fornyet hvert 1,2 s når planeten er nær nok.
- **Kontinuitet**: rundt hjemmeflekken tones planetens farge mot øyeblikksbildets kantfarge (fargeforskyvning, ikke maling over), og kanten av flekken er støyforskjøvet — så hjemmet ikke leses som et kort.
- **Detalj som ikke finnes i teksturen**: lunder/enger og kronetak i grønne områder, fin støy, tonet bort på avstand.
- **Det kjente og det ukjente**: land folket har sett (hjemmet, oppdagede land, utposter) vises i full farge; resten er dempet og disig. Avsløringsradiusen vokser med tilstanden (oppdaget < utpost < etablert).
- **Lys**: sol som vandrer rundt kloden (ett døgn ≈ 6 min sanntid), nattside med **nattlys** fra bosettinger og utposter (styrke etter folketall), havglans, skyer som driver (borte nær bakken), atmosfære ved randen, stjerner.
- **Overlegg** (2D-lerretet over WebGL): navn og status for kjente land, «?» for land ekspedisjonene kan nå, ruter til utposter som storsirkler med karavanelys, ekspedisjonen som en prikk på vei, hovedstaden og bosettingene. Navnene foldes bort ved full planetvisning for å unngå rot.

## 4. Kamera og overganger

- Planetkameraet ser alltid rett ned mot sentrum fra høyden `h` (i planetradier) over et fokus, nord opp, vertikal synsvinkel 35,5°. Ved liten `h` er bildet et nesten flatt kart; ved stor `h` ses hele kloden med ekte krumning — **én kontinuerlig parameter fra region til planet**.
- **Sømløs inngang**: `globeFromWorldCam` setter fokus = 2D-kameraets sentrum og `h` slik at den synlige bredden er nøyaktig lik 2D-kameraets (`heightForSpan`, eksakt for kula: et punkt i buelengde a havner på skjermkanten når sin a / (h + 1 − cos a) = tan(fovX/2)). Første planetbilde viser det samme som siste 2D-bilde (verifisert i nettleser og i test: kantpunktet treffer innen 3 px).
- **Sømløs retur**: under laveste høyde (= 2D-verdenens største utsnitt) overtar 2D-kameraet med samme sentrum og bredde. Står fokus ikke over hjemmet, glir planeten først hjem og ned (ingen hopp).
- **Glid** interpolerer høyden logaritmisk (jevn opplevd fart). Dra flytter fokus slik at overflaten følger pekeren. Klikk på et land glir dit; klikk på hjemlandet går hjem.
- **Lys ved overgangen**: nær bakken er lyset flatt (dag), så 2D-bildet og planetbildet stemmer; dag/natt kommer først når kameraet har løftet seg.
- **Avsløringen**: ved «Et sammenhengende rike» (som låser opp planeten) og ved sluttmilepælen løfter kameraet seg selv fra byen til kontinentet og videre til hele kloden. All brukerinput avbryter. Redusert bevegelse: kort/umiddelbar.
- **Reserve uten WebGL**: den gamle kartoversikten (`render/overview.js`) brukes automatisk.

## 5. Simuleringsskala

| Nivå | Simulering | Visning |
|---|---|---|
| Hjemmeregionen | Full: individer, bygg, slitasje, ruter | 2D-verden og levende øyeblikksbilde på planeten |
| Fjerne land | Aggregert tilstand og tidtakere (ukjent → oppdaget → utpost → etablert) | Avdekket land, navn, utpostikoner, nattlys |
| Ekspedisjoner/karavaner | Tidtaker utenfor kartet; ekte figurer innenfor | Bue og prikk på planeten; figurer i 2D |
| Resten av planeten | Ingen | Ukjent, dempet land |

Planeten, teksturene og landenes posisjoner er rene funksjoner av frøet og rutenettet, så Ragnarok gir samme planet, og lagring trenger ikke å lagre geografi.

## 6. Ytelse (målt)

- Baking: ~5,8 s i Node for begge teksturene; i nettleseren skjer det i en Web Worker ved oppstart, lenge før planeten låses opp (~75–95 min inn i spillet). Synkron reserve finnes.
- Planetbilde: JavaScript-delen ~0,1 ms/bilde (shaderen kjører på GPU; ikke målt separat). Øyeblikksbilde av verdenen: én vanlig 2D-tegning hvert 1,2 s mens planeten er nær.
- Nettlesertest (`tools/gui-smoke-realm.js`, Edge, RTX 3070 via ANGLE): ingen konsollfeil; 4× hovedløkke under 16 ms/bilde.

## 7. Begrensninger (ærlig)

- Planeten er ikke en simulert planet. Det finnes ingen klima-, vann- eller økologisimulering utenfor hjemmeregionen.
- De 14 nabolandene er fortsatt et rutenett i simuleringen; på planeten ligger de på ekte geografi, men utpostene har ingen egen detaljert scene.
- Hjemmeflekken er et flatt øyeblikksbilde av 2D-verdenen; byggene ses ovenfra som i spillet, ikke som 3D.
- Teksturene er bakt én gang; landskapet endres ikke av sivilisasjonen utenfor hjemmeregionen (bare avdekking og nattlys).
- Ingen WebGL → reserveoversikten (ingen planet).

## 8. Videre: solsystem, galakse, univers

Arkitekturen er bygget som «én parameter per skala» der hvert nivå er en ren visningsmodell av tilstanden:

1. **Solsystem**: når `h` passerer `GLOBE.maxH`, kan en ny `SystemCamera` (avstand i AU, fokus = planeten) overta på samme måte som planetkameraet overtar fra 2D: planetens skjermradius i siste planetbilde = planetens radius i første systembilde. Planeten tegnes da som en liten kule med samme shader (lav oppløsning), og banene som linjer i overlegget. Tilstand: `state.system` (planeter, kolonier) som tidtakere, akkurat som `globe.regions` i dag.
2. **Galakse/univers**: samme mønster — en ny visningsmodell + et kamera som starter med solsystemets skjermstørrelse. Stjernene i planetens bakgrunn bør da komme fra den samme deterministiske stjernekatalogen (frøet) som galaksenivået bruker, så stjernehimmelen er den samme verdenen.
3. **Regel videre**: et nytt nivå får bare nye *visninger* av eksisterende verb (se, velge retning, se følgen) — ingen ny forvaltningssløyfe per nivå (lærdommen fra Spore, se `RESEARCH.md`).
4. **Teknisk**: `createGlobeRenderer` bør da generaliseres til en `createSpaceRenderer` med flere kuler og en felles stjernebakgrunn; `planet.js` får søsken (`system.js`), og `scaleOf()` får flere trinn.
