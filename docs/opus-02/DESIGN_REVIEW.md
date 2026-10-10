# OPUS-02 — Designgjennomgang

Skrevet før og under implementasjonen. Skiller tydelig mellom **funn** (det jeg faktisk så i koden, skjermbildene og simuleringen), **vurderinger** (mine egne designvalg) og **resultater** (se `IMPLEMENTATION_REPORT.md` og `VISUAL_REVIEW.md`).

## 1. Utgangspunkt (funn)

Verifisert tilstand: grenen `feature/opus-01-living-world-transformation` (HEAD `8acf4fd`), 106 grønne tester. OPUS-02 ble forgrenet derfra til `feature/opus-02-civilization-worth-watching`.

Faktisk observert i OPUS-01-skjermbildene (`docs/opus-01/screenshots/`) og i en egen gjennomspilling med seed `20261009`:

| Styrke | Svakhet |
|---|---|
| Tre, folk, stier og bål er malt og animert med omhu; stemningen er riktig. | Hovedstaden på «Storby» er 3 bolighus, 2–3 halmhytter og en stor, jevn brolagt sirkel — den ligner en landsby med brosteinsplass. |
| Planeten er lik fra nær til fjern, uten kart-kort. | Kontinentet er en myk grønn flate med gjentatte mørke skogsirkler (lundene styres av jevn støy, og landene er sirkulære gauss-flekker). |
| Sivilisasjonstrinnene kommer av faktisk tilstand. | Satellittbosettingene (3–6 mennesker) ser like ut; rollene (sagbruksbygd, steinhoggerbygd, matbygd) ligger i tall og ikke i landskapet. |
| Ruter, utposter og nattlys finnes på planeten. | Rutene er lange, lysende gullinjer fra hovedstaden (leses som et feilsøkingsoverlegg); nattlysene er like store for 5 som for 60 mennesker. |
| Byvekst, handel og blessings fungerer autonomt. | Spillet ender med ~2 500 trevirke og ~1 700 stein ubrukt og ~780 PP uten avløp: ingenting å bruke overskuddet på. |
| | Ingen navn, ingen historie; døgnet finnes bare på planeten. Alle bolighus er identiske. |

## 2. Forslag, rangert

Rangering = (spillerverdi × synlighet) / (kostnad × risiko). Alle forslag er mine egne vurderinger; kildene i `RESEARCH.md` støtter bare noen av dem.

| # | Forslag | Spiller | Visuell | Kost | Ytelsesrisiko | Passer økonomien | Fremtidig nytte | Valg |
|---|---|---|---|---|---|---|---|---|
| 1 | **Autonom byvekst («Byplan»)**: brønner, flere bolighus, varehus bygges av folket når byen har overskudd; bygdene får flere hytter | Høy | Høy | Middels | Lav | God (reservegrense) | Høy | **Gjort** |
| 2 | **Gatenett** avledet av byggenes dører (grus → stein etter trinn), hus langs rutene mot andre bosettinger | Høy | Høy | Middels | Lav–middels | Nøytral | Middels | **Gjort** |
| 3 | **Byggestiler**: hver bygg-id får eget preg (tak, vegg, skodder, markise); hyttene i byen er tømmerstuer; hallen får klokketårn | Høy | Høy | Lav | Lav | Nøytral | Middels | **Gjort** |
| 4 | **Døgnklokke i nærbildet** (felles med planeten): varm skumring, lesbar natt, lysende vinduer/lykter/bål | Høy | Høy | Middels | Lav | Nøytral | Høy | **Gjort** |
| 5 | **Gårdsplasser/spesialisering** fra faktisk produksjon (tømmerstabler, plankehauger, bruddhull, neper) | Høy | Høy | Middels | Lav | Nøytral | Middels | **Gjort** |
| 6 | **Dyrket mark**: teiger rundt åker, flere med innhøstinger, avling som følger høstesyklusen | Middels | Høy | Lav | Middels (bakkelag) | Nøytral | Middels | **Gjort** |
| 7 | **Navngitte folk og kronikk** (kun ekte hendelser, begrenset lengde, ingen rng) | Høy | Lav | Lav | Ingen | Nøytral | Høy | **Gjort** |
| 8 | **Takkoffer**: avtagende PP-sluk som reiser helligdommen stykke for stykke; litt PrP | Middels | Høy | Middels | Lav | God | Middels | **Gjort** |
| 9 | **Elver** (priority-flood + vannføring) og **fjellkjeder/skogbelter** i planetteksturen | Høy | Høy | Høy | Lav (bake i worker) | Nøytral | Høy | **Gjort** |
| 10 | **Ruter som sti i landskapet**; svak buet overlay, tonet etter zoom; lys etter folketall | Middels | Høy | Lav | Lav | Nøytral | Middels | **Gjort** |
| 11 | **Hverdagsliv**: bøtte, kurv, bok; brønn/helligdom som møteplasser; hover viser navn og hva de gjør | Middels | Middels | Lav | Lav | Nøytral | Lav | **Gjort** |
| 12 | **Lydbilde** fra det synlige (tjern, verksted, torg, natt) | Middels | – | Middels | Lav | Nøytral | Lav | **Gjort** (ikke lyttet til) |
| 13 | Bakkelaget: delt pikselpass, jevnere stikanter | – | Middels | Lav | Reduserer risiko | Nøytral | – | **Gjort** |
| 14 | Bygderydding: folk feller trær rundt nye bygg i bygdene | Middels | Middels | Lav | Lav | Nøytral | Lav | **Gjort** |
| 15 | Individuelle arbeidere som faktisk bemanner sagbruk/steinhoggeri (egen oppgavetilstand) | Middels | Middels | Høy | Lav | **Endrer økonomien** | Middels | Utsatt (kan svekke sanking; krever designbeslutning) |
| 16 | Bekk i hjemmeregionen som kobles til planetens elvenett | Middels | Høy | Høy | Lav | Krever kryssing/bruer for folk | Middels | Utsatt (mikrostyring av stier/bruer; AGENTS §8) |
| 17 | Vær/negative hendelser (storm, sykdom) | Middels | Middels | Høy | Lav | Åpent designspørsmål 4 | – | Avvist her |
| 18 | Nye kvartaler (egne «distrikter» med egne regler) | Høy | Høy | Høy | Middels | Ny tung produksjonskjede | Høy | Avvist (AGENTS §8) |
| 19 | Planetens veier malt inn i teksturen fra faktisk bruk | Middels | Høy | Høy | Lav | – | Høy | Delvis: veiene tegnes i shaderen, ikke bakt |

## 3. Valg og begrunnelse (vurdering)

Kjernen i OPUS-02 er at **fremgang skal kunne leses i verden**. Derfor valgte jeg tiltak som både har en simuleringsårsak og et synlig resultat (1, 2, 5, 6, 8, 14), og tiltak som bare er presentasjon men leser ekte tilstand (3, 4, 9–11). Forslag som endrer økonomien på tvers av faser (15) eller krever en ny tung kjede (18) er utsatt etter AGENTS.md §8. Det er ikke lagt til noen manuell plassering, arbeidsfordeling eller nedkjølingsmirakler.

**Byplan** er en vanlig innsikt (kjøpes av spilleren etter «Sivilisasjonens morgen»), så den nye utviklingen er et synlig valg og ikke en skjult endring av tidligere faser. En reservegrense (`BALANCE.urban.reserve`) beskytter innsiktene mot at byen spiser opp råvarer.

## 4. Avviste og utsatte idéer — kort

- Bekk/elv i hjemmeregionen: ville krevd at folk krysset vann (bruer eller vadesteder) og dermed ny sti-/hinderlogikk.
- Distrikter, mer enn fire bosettinger, negative hendelser: designbeslutninger for prosjektansvarlig.
- Arbeidere som står fast på et verksted: ville tatt sankere bort fra økonomien. Dagens løsning viser i stedet tilstanden (aktiv/ledig) og lar folk besøke steder.
