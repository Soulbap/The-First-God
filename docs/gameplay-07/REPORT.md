# GAMEPLAY-07 — Byenes tid

Gren: `feature/gameplay-07-10-world-expansion` · Baseline: GAMEPLAY-06 (`e1f717d`).

## Resultat

Den første byen er ikke lenger bare et navn på et trinn. Landsbyen kan bli en **By** (og senere **Storby**) bare ved å få folk, tette hus, mat, to foredlingsbygg og et torg, og den produserer to nye råvarer som faktisk brukes videre i spillet. Menneskene velger tomter og bygger selv; spilleren velger bare innsikten.

## Hvordan det virker

**Bytrinn** (`src/sim/settlements.js`, `cityRequirements`). By krever *alle* ti ledd samtidig, så ingen terskel alene låser det opp:

| Krav | Verdi |
|---|---|
| Befolkning | ≥ 12 |
| Boligkapasitet | ≥ befolkning |
| Bolighus | ≥ 1 |
| Mat (to åkre og lager) | ≥ 4 |
| Infrastruktur | ≥ 5 bygg |
| Sagbruk, steinhoggeri, torg | alle tre |
| Foredlede varer produsert | ≥ 4 planker og ≥ 4 blokker totalt |
| Fullførte regionale leveranser | ≥ 6 |

Storby krever i tillegg Kunnskapshall, ≥ 16 folk og Byggemetoder (GAMEPLAY-08). Rike-panelet lister hva som mangler.

**Foredling** (`src/sim/production.js`). Sagbruk: 3 tre → 1 planke (10 s). Steinhoggeri: 3 stein → 1 tilhugget stein (12 s). Bygget arbeider bare med minst to folk i bosettingen, trekker råvaren først ved avsluttet syklus (aldri negativ beholdning), lar en **reserve** (24 tre / 18 stein) stå igjen så ordinære byggeprosjekter ikke sultes, og stopper ved et **lagertak** (50 planker / 36 blokker; Torget dobler det). Hver syklus gir en liten mengde kunnskap (GAMEPLAY-08).

**Nye bygg og innsikter** (alle bygges av menneskene via den eksisterende prosjektflyten):

| Innsikt | Krever | Kostnad | Følge |
|---|---|---|---|
| Sagbruk | Sivilisasjonens morgen | 90 tre, 50 stein | planker |
| Steinhoggeri | Sagbruk ferdig | 80 tre, 70 stein, 4 planker | tilhugget stein; stein vokser tilbake 40 % raskere |
| Bolighus (maks 3) | Sagbruk + steinhoggeri | 40/30 + 8 planker + 4 blokker, ×1,3 | plass til 4 (dobbelt hytte) |
| Torg | Bolighus ferdig | 70/45 + 14 planker + 10 blokker | leveranser +2, dobbelt lagertak |

**Urban befolkning.** Boligkapasitet er nå per bygg (`B.housing`: ly 2, hytte 2, bolighus 4). Veksten er fortsatt én ny innbygger per runde (42 s) per bosetting, bundet av mat og ledig bolig; byer vokser litt raskere via rollen. Ingen eksponentiell vekst: hovedstaden stopper rundt 23 folk (3 bolighus + 4 hjem + Byggemetoder).

**Synlig.** Fem malte sprites (`src/render/city.js`): toetasjes bolighus med steinmur, plankevegg og teglrødt tak; åpent sagbruk med sagramme som går opp og ned og sagflis; steinhoggeri med hogde blokker; belagt torg med boder; plankestabel og blokkstabel ved lageret som speiler beholdningen.

**Milepæl: En by reiser seg** (`stageMin: By`).

## Tester

`tests/city.test.js` (7): bykrav (ett krav av gangen), sagbruk (3→1, reserve, uten folk), lagertak og torgets dobling, bolighus og vekstgrense, oppgraderingskjede med eksakte kostnader, full spilling til milepælen, regionale leveranser uten negative eller tapte reservasjoner. Alle 44 eldre tester består uendret.

## Begrensninger

- Byinfrastrukturen bygges i hovedstaden; andre bosettinger får spesialbygg via sin plan (GAMEPLAY-09).
- Beholdningen er felles; planker/blokker flyttes ikke fysisk fra sagbruket til lageret (bare synlig som stabler).
- Stein er fortsatt flaskehalsen (åtte steinblokker i verdenen; verdensfrøet er bevart). Dempet av raskere gjenvekst og lavere kostnader.
- Bysenter får ingen egen veinett- eller murgrafikk; det er med vilje overlatt til Opus-runden.

## Skjermbilder (faktiske, Edge, 1920×1080)

1. `01-developed-city.jpg` — byen med bolighus, torg, sagbruk, steinhoggeri og lagerstabler.
2. `02-refined-production.jpg` — sagbruket i arbeid (saghakk, sagflis) og stablene av planker og blokker.
