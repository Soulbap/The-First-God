# GAMEPLAY-09 — Det voksende riket

Gren: `feature/gameplay-07-10-world-expansion` · Bygger på GAMEPLAY-08.

## Resultat

Fra to til **fire** bosettinger uten at spilleren noen gang velger sted. Nye bosettinger vokser fra en hytte via de samme fysiske leveransene, får en identitet ut fra stedet, og er bundet til hovedstaden av ruter som oppstår av faktiske turer.

## Autonom grunnleggelse (`src/sim/realm.js`)

Innsikten **Flere ildsteder** (krever Kunnskapens tidsalder og Samfunnsorden) slår på autonom grunnleggelse. Hver 8. sekund sjekkes ni krav (alle vises i Rike-panelet):

1. plass under taket (4), 2. forrige bosetting har begynt å vokse (≥ 2 prosjekter), 3. ro siden sist (70 s), 4. trygg mat (≥ 6 mat, ≥ 3 innhøstinger), 5. folkeoverskudd (≥ 8 i hovedstaden), 6. materialer til reisen (36 tre, 22 stein — de brukes opp), 7. tre ledige hender, 8. ingen følge underveis, 9. et gyldig sted.

**Tomtevalg** er deterministisk: gitter à 70 enheter; avslår tjernet (+110), nærhet til bygg og trær, avstand < 380 til andre bosettinger, avstand utenfor 420–1050 til nærmeste, og alle ruter som krysser tjernet. Poengsum: trær og steiner i nærheten (stein veies høyest), vann, passelig avstand, og **bonus for en rolle riket mangler**. Stedet klassifiseres som skog, stein eller jord og bestemmer prosjektplanen: skog → lager, hytte, **sagbruk**, hytte; stein → lager, hytte, **steinhoggeri**, hytte; jord → lager, hytte, åker, hytte. Følget (3 mennesker) går fysisk, stifter bosettingen først når alle er framme (ellers oppløses det etter 6 min og forsyningene gis tilbake), og bygger første hytte selv.

## Regional produksjon og transport

- Regional logistikk (`src/sim/regional.js`) er generalisert fra «den andre bosettingen» til et vilkårlig antall; maks to samtidige prosjekter, ingen global optimalisering. Hovedstaden sender; leveringer reserveres ved avreise og telles først ved ankomst (uendret kontrakt). Planker og blokker kan leveres.
- Satellittenes sankere leverer fortsatt til hovedstadens lager («eksport»), så skog- og steinbygdene fysisk mater byen.
- **Ruter** (`state.network.routes`): hver fullførte tur (levering eller sanketur) teller; etter tre er ruten *etablert*. Stiene i landskapet er fortsatt slitasjen fra menneskenes faktiske gange.
- **Transportkapasitet** øker bare der det er begrunnet: Torget (+2), Samfunnsorden (+2), Handelsveier (+2, krever tre bosettinger).

## Spesialisering med følger

Skogbygd +25 % tre, Steinbygd +25 % stein, Sagbruksbygd/Steinhoggerbygd +25 % foredling, Matbygda +1 mat per åker, Kunnskapssete/Bysenter mer kunnskap og raskere vekst (se GAMEPLAY-08).

**Milepæl: Et sammenhengende rike** — Kunnskapens tidsalder, fire aktive bosettinger, en by, ≥ 14 leveranser, tre ulike roller, tre etablerte ruter og Handelsveier.

## Tester

`tests/realm.test.js` (6) + deler av `world.test.js`: tomtevalg for seks frø er gyldig og identisk ved gjentakelse; hvert grunnleggelseskrav forklares; følget går, brukte forsyninger er nøyaktige og ingen mennesker dupliseres; hele spillet med et annet frø gir fire bosettinger, unike id-er, minst tre roller, tre ruter, ingen negative beholdninger og reservasjoner = leveringer underveis; følge som ikke kommer fram oppløses med refusjon; robusthet over tre frø.

## Begrensninger

- Fire bosettinger er taket i denne fasen (verdensutposter kommer i tillegg i GAMEPLAY-10).
- Hovedstaden er alltid knutepunktet; bosettinger forsynes ikke direkte seg imellom (hub-and-spoke), og beholdningen er felles.
- Tomtevalg kan fortsatt gi sted bak skog hvor lyset er trangt; ingen landsby-/tomteplassering ut over hytte og planlagte bygg.

## Skjermbilder

5. `05-regional-settlement-network.jpg` — områdevisning: byen og tre bygder med etiketter, trinn, rolle og spor mellom dem.
6. `06-overview-network.jpg` — oversikten: fire bosettinger og etablerte ruter i hjemmelandet.
