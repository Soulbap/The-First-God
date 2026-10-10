# Teknologiavhengigheter

Alle navn er spillerrettede forslag; stabile ID-er brukes først ved implementasjon. Status: **IMPLEMENTERT**, **PARTIAL** eller **PLANLAGT**. Tallkostnader er provisoriske.

## Nettverk

```text
ly -> mat/bygg -> bosetting -> spesialisering -> kunnskap -> kart/navigasjon
malm + brensel -> metall -> maskiner -> presisjon ------------------------+
vann|vind|kull -> mekanisk kraft -> generator -> strøm -> elektronikk ----+-> romprogram -> første bane
olje -> raffinering -> motor -> luftfart -> luftmåling -------------------+
```

## Katalog

| ID / norsk navn / status | Forutsetning og oppdagelse | Evner og verden | Verifikasjon |
|---|---|---|---|
| `foundation.shelter` — Første ly — IMPLEMENTERT | Tre + stein; første impuls. | Ly, autonome innbyggere, fysisk bygging. | Ly bygges med reelle innsatsvarer; folk får gyldige oppgaver. |
| `food.cultivation` — Frøets løfte — IMPLEMENTERT | Stabil bosetting, jord og vannadgang. | Åker, matlager, bondeadferd. | Innhøsting krever åker og kan ikke lage negativt lager. |
| `craft.measurement` — Byggemetoder — IMPLEMENTERT/PARTIAL | Håndverk, planker, tilhugget stein og kunnskap. | Bedre bygg, hall og måling. | Byggehastighet/kapasitet og synlige bygg følger tilstand. |
| `settlement.urban` — Byplan — IMPLEMENTERT | Overskudd og bykrav. | Autonome brønner, boliger, lager og gater. | Én oppgradering av gangen med virkelige ressurser. |
| `knowledge.cartography` — Karttegnernes kunst — IMPLEMENTERT | Oppdagede land + ekspedisjonsnett. | Lesbart verdenskart; kartleggeradferd. | Kart er begrenset til oppdaget kunnskap. |
| `materials.bronze` — Bronsehåndverk — PLANLAGT | Kobber, tinn, varme og smedkompetanse fra gruve-/handelssløyfe. | Bronseverktøy og støperi. | Begge metaller fraktes til støperi; ingen laugshallkrav. |
| `materials.iron` — Jernutvinning — PLANLAGT | Jernmalm, reduktant/brensel, ovn og erfarne smeder. | Jernverktøy, gruve- og jordbruksforbedring. | Malm/brensel forbrukes; slaggspor vises. |
| `materials.steel` — Stålbehandling — PLANLAGT | Jern, kontrollert prosess/varme, kunnskap og kapasitet. | Maskindeler, skinner, presisjonsbygg. | Stål kan ikke oppstå uten jernprosess. |
| `exploration.navigation` — Navigasjon — PLANLAGT | Kart, himmel-/kystobservasjon og fartøy eller landruter. | Sikrere sjø-/fjernreiser, havn og navigatører. | Rute forbedrer tid/risiko, aldri geografien selv. |
| `mechanical.power` — Vann- og vindkraft — PLANLAGT | Maskindeler + egnet elv/vind. | Mølle, mekanisk produksjon og reparasjon. | Lokal mekanisk energi må finnes; mølle skaper ikke råvarer. |
| `industry.steam` — Dampkraft — PARTIAL | Kull, vann, metall og maskindeler etter mekanisk kraft. | Dampmaskin, metallverk, maskinverksted og første jernbanekorridor. | Kull trekkes under drift; motor/fabrikk stanser uten innsats eller kraft. Full regionale lagre kommer senere. |
| `energy.electric` — Elektrisk kraft — PLANLAGT | Generator drevet av mekanisk kilde, ledere og vedlikehold. | Kraftverk, nett, lys og elektriske maskiner. | Kraftproduksjon, nettdekning og forbruk valideres separat. |
| `chemistry.refining` — Raffinering og kjemi — PLANLAGT | Petroleum/råstoff, prosessanlegg, beholdere og energi. | Drivstoff, smøremiddel og kjemigruppe. | Hver prosess bruker feedstock og energi. |
| `transport.combustion` — Forbrenningsmotor — PLANLAGT | Raffinert drivstoff, presisjonsdeler, metall og verksted. | Motoriserte kjøretøy. | Drivstofftilgang og faktisk forbedret logistikk. |
| `manufacturing.precision` — Presisjonsproduksjon — PLANLAGT | Stål/legeringer, måleteknikk, stabil energi og kunnskapsmiljø. | Instrumenter, motor- og rakettdeler. | Kvalifiserte komponenter er en reell flaskehals. |
| `electronics.control` — Elektronikk og styring — PLANLAGT | Elektrisk kraft, rene materialer/komponentgruppe, presisjon. | Kontrollsystemer, radio og måleutstyr. | Produksjon er strøm- og komponentavhengig. |
| `transport.aviation` — Luftfart — PLANLAGT | Motor/fremdrift, presisjon, materialer, drivstoff og flyplass. | Fly, pilot/tekniker, fjernkartlegging og luftfrakt. | Rullebane/hangar og faktisk ny rekkevidde; ikke bilkrav. |
| `exploration.aerial_survey` — Luftmåling — PARTIAL nå / PLANLAGT komplett | Dagens kart + sen milepæl åpner planetkamera; full form krever luftfart eller likeverdig observasjon. | Bedre kartpresisjon og sent planetkamera; ukjent forblir dempet. | Kart, besøk og kamera holdes adskilt; flydata kreves senere. |
| `space.rocket_program` — Rakettprogram — PLANLAGT | Kjemi, energi, avansert metall, presisjon, elektronikk, organisert industri. | Teststativ, suborbital test, romhavn og team. | Alle grener leverer; mislykket test bevarer deterministisk regnskap. |
| `space.first_orbit` — Den første baneferden — PLANLAGT | Kvalifisert rakett, nyttelast, romhavn, kontrollsystem og test. | Autonom orbital oppskyting; framtidig solsysteminngang. | Baneoppnåelse og signal er eksplisitte, ikke likestilt med flukt. |

Hver framtidig teknologioppføring skal spesifisere stabil ID, norsk navn, oppdagelse, material-/kunnskapsvilkår, prosesser, bygg, autonom adferd, synlig følge, utforsknings-/kameraeffekt, milepæl, status og verifikasjon. Teknologi låser mulighet, ikke ferdig kapasitet.
