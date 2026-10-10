# OPUS-02 — Implementasjonsrapport

Gren: `feature/opus-02-civilization-worth-watching` (forgrenet fra `feature/opus-01-living-world-transformation` @ `8acf4fd`, verifisert). Ikke slått sammen med `main`. `References/` er ikke rørt; `package-lock.json` er fortsatt utracket.

## 1. Hva som er gjort, hvorfor og hvor

### Simulering (alle deterministiske, testet)

| Funksjon | Hvorfor | Filer |
|---|---|---|
| **Byplan** — ny innsikt. Folket bygger selv brønner, bolighus (opptil 8 i hovedstaden), varehus og flere hytter i bygdene når det er overskudd. Én post om gangen per bosetting, reservegrense for innsiktene, tomt fra samme deterministiske søk. | Byen skulle vokse og se viktig ut uten manuell plassering. Bolighus gir faktisk flere mennesker (78 mot 39 ved slutt). | `sim/urban.js`, `data/upgrades.js`, `data/balance.js`, `sim/economy.js` |
| **Tettere, gate-orientert tomtevalg**: 9 enheter mellom bygg; hus legger seg ved siden av rutene mot andre bosettinger. | Walkable lanes og tettere kjerne. | `sim/construction.js` |
| **Takkoffer** — PP-sluk, 6 avtagende nivåer, reiser helligdommen i seks stykker; PrP `round(7·√n)` ved Ragnarok; ingen spillbonus. | PP hopet seg opp (OPUS-01: ~780 ubrukt). | `data/upgrades.js`, `sim/legacy.js`, `sim/construction.js` |
| **Navn, kronikk, aktivitet**. Egen generator (ingen `rand`-trekk), bounded (90 poster), nøkler hindrer duplikater også etter lasting. Aktiv «hva gjør de nå». | Tilknytning til individer; historien fra ekte hendelser. | `sim/chronicle.js`, `sim/story.js`, `sim/activity.js`, `data/names.js`, `sim/population.js`, hooks i `construction/realm/regional/civilization/worldmap/settlements/game` |
| **Bygderydding** (trær felles rundt nye bygg i bygder, og frø spres ikke inn over bygder) og **flere åkre** i matbygda. | Landskapet skal huske sivilisasjonen. | `sim/nature.js`, `sim/world.js`, `sim/regional.js` |
| **Brønn og helligdom som møteplasser**; folk bærer bøtte/kurv/bok der de går. | Hverdagsliv fra ekte tilstand. | `sim/humans.js`, `render/people.js` |
| **Døgnklokke** (`state.time`, 480 s/døgn) felles for planeten og nærbildet. | Samme tidsmodell på alle skalaer. | `view/daylight.js`, `data/balance.js` |
| **Elver** (priority-flood, fuktighetsvektet vannføring, Chaikin + slyng). | Rivers must follow terrain. | `sim/hydrology.js` |

### Presentasjon

- **Bygg**: brønn, varehus, tømmerstue (hytte i by), helligdom ×6 (`render/civic.js`); bolighus med variasjon (tak, vegg, skodder, markise); klokketårn på hallen (`render/city.js`). Byens hytter bygges visuelt om fra halm til tømmer ved trinnet *By*, med støvskyll.
- **Gatenett** avledet av dørene: Kruskal over kandidatkanter som ikke krysser bygg, grus fra *Tidlig by*, stein i kjernen fra *By* og overalt i *Storby*, lykter (`render/streets.js`).
- **Gårdsplasser og spesialisering** fra faktisk produksjon (`render/yards.js`): tømmer- og plankestabler som vokser med `made`, bruddhull ved steinhoggeriet, neper og fugleskremsel ved åkre, banner ved hallen, byprops, lykter, skinnstativ ved de første lyene, og vimpler/lykt rundt det første lyet i byen (det forblir synlig viktig).
- **Dyrket mark** (`render/farmland.js`): teiger med furer og avling som følger høstesyklusen.
- **Natt/skumring**: multiply-tone + additive vinduer/lykter/bål/verksteder; skyggenes lengde og styrke følger sola (`render/renderer.js`).
- **Planeten** (`render/planetTexture.js`, `render/globe.js`, `sim/planet.js`): fjellkjeder (rygger), domene-forvrengte kyster, uregelmessige landegrenser og avlange fjellrike i stedet for sirkler, elver, skogtetthet fra landskapet, svakere hjemmeflekk-tone (rund, støyet), blåere natt som ikke er svart, nattlys i forhold til folketall, veier i overflaten og svake buede ruter, utviklet land rundt bosettinger.
- **UI**: Kronikk-fane (klikk → kamera til stedet), små meldinger bare for stille hendelser, hover på folk, bedre smal-skjerm-layout.
- **Lyd** (`audio/scene.js`, `audio/ambience.js`): lag fra det som er synlig. **Ikke lyttet til.**
- **Ytelse**: pikselpass i bakkelaget fordelt over bilder; planetbaking med flate Float32Array.

### Verktøy
`tools/snapshots.mjs` (ekte bot-tilstander), `capture-opus02.mjs`, `receiver.mjs`, `bakeplanet.mjs` (+ `?debug&planet=…`-krok), `planetmap.mjs`, `playthrough-multi.mjs`, `sprites.html`.

## 2. Implementert vs foreslått

Implementert: alle punkt merket **Gjort** i `DESIGN_REVIEW.md`. Foreslått, ikke implementert: bemannede verksteder, bekk i hjemmeregionen, distrikter, vær/hendelser, malte planetveier fra bruk (se `FUTURE_IDEAS.md`).

## 3. Testdekning

`npm test`: 122 tester, alle grønne (OPUS-01: 106; ny `tests/opus02.test.js` med 18 tester + tilpasset planettest). Dekker: Byplan (låst/reserve/overlapp/negative), mål etter trinn, kronikk/navn (determinisme, duplikater, lengde, tid), lagring + gamle lagringer, Takkoffer, gatenett, elver (determinisme, nedover, utenfor hjemmeflekk, tre frø), dagklokke, lydbilde, aktivitet, lagring midt i byvekst, Ragnarok-start. **Ikke** automatisk testet: selve tegningen (verifisert med bilder), lyd (kun kjørt uten feil), UI-klikk (manuelt i panelet).

## 4. Kjente begrensninger

- Ingen menneskelig spilltest og ingen lyttetest.
- `tools/gui-smoke.js`: 32 av 33 kontroller bestått i det skjulte panelet; «panelet fanger pekeren» avhenger av en sanntids CSS-overgang som ikke kjører pålitelig i skjult panel (ikke sammenlignet mot OPUS-01 i et fritt vindu).
- Headless Edge klarte ikke å fullføre planetbakingen i nettleseren (arbeideren ble aldri ferdig); planetbildene er tatt i appens panel med forhåndsbakte teksturer (`?planet=`), bakt i Node. Selve bakingen i en vanlig nettleser (arbeider) er verifisert tidligere i panelet, men ikke i headless Edge.
- Elvene krysser ikke hjemmeflekken; de ender i hjemmeområdet eller starter ved kanten av det.
- Planetens «ruter» i overflaten er svake, rette storsirkelbuer med svak slyng — ikke terrengfølgende.
- Skogmassen rundt hjemmet ved region-zoom er mørkere enn omgivelsene og har en ujevn ytterkant (gate G delvis).
- Stikanter i bakkelaget er blokkete ved aller nærmeste zoom (wear-oppløsning 4 enheter per piksel).
