# GAMEPLAY-07 → 10 — Integrasjonsrapport

Gren: `feature/gameplay-07-10-world-expansion` (fra `feature/gameplay-06-early-civilization`, `e1f717d`). Ikke slått sammen med `main`. `References/` er ikke berørt.

Hele forløpet **Genesis → Landsby → Region → Sivilisasjonens morgen → By → Kunnskap → Rike → Verden** er spillbart og gjennomspilt med en bot som kun kjøper det spilleren faktisk kan kjøpe.

## 1. Arkitekturendringer

| Område | Endring |
|---|---|
| `src/sim/settlements.js` (ny) | Trinn (Leir … Storby), roller, `ROLE_EFFECTS`, boligkapasitet per bygg, byens ti krav. Rene spørringer. `regional.js` re-eksporterer for kompatibilitet. |
| `src/sim/production.js` (ny) | Sagbruk/steinhoggeri (sykluser med reserve og tak), kunnskapskilder. |
| `src/sim/regional.js` | Generalisert fra «second» til vilkårlig antall bosettinger; planer per stedstype; handelsruter (`state.network`); leveringsmengde fra torg og fremskritt. |
| `src/sim/realm.js` (ny) | Autonom grunnleggelse, deterministisk tomtevalg, følge, avbrudd med refusjon. |
| `src/sim/worldmap.js` (ny) | Flermåls verdenskart, ekspedisjoner, utposter, karavaner. |
| `src/sim/civstage.js` (ny) | Sivilisasjonstrinn fra milepæler og tilstand. |
| `src/sim/humans.js` | Nye tilstander (`toSettle`, `settleWait`, `toEdge`, `away`, `expReturn`), rolle-/lastfaktorer, fikset tjernomvei og ung-bosetting-bygging først. |
| `src/sim/economy.js` | 13 nye kravtyper og 6 nye handlinger; alt fortsatt data-drevet fra `upgrades.js`. |
| `src/view/overview.js`, `src/render/overview.js`, `src/render/city.js` (nye) | Oversiktsmatematikk, oversiktstegning, byens sprites. |
| UI | Rike-panelet, nye ressurser, nye ikoner og kategorier, Verden-knapp. |
| Verktøy | `tools/bot.js`, `tools/playthrough.mjs`, `tools/gui-smoke-realm.js`, GAMEPLAY-07..10-scener i `capture-gui.mjs`. |

Skille domene/simulering/visning er bevart: simuleringen eier all tilstand og alle regler; `insights.js` bestemmer hva panelet viser (testbart uten DOM); renderer og oversikt leser bare tilstanden. Rekkefølgen i `step()` er `nature → construction → humans → regional → civilization → production → realm → world → roller → wear → ecology → milepæler → oppdagelser`.

## 2. Full progresjonskart

```
Genesis (ly → vekkelse → ild → hjem → lager → ildsted) → Den første landsbyen
  → Utforskertrang → Nye horisonter → Grunnleggelse → [2 bosettinger] → Voksende slekter → Mellom ildstedene
  → En levende region (etablert rute) → Frøets løfte (mat) → Arbeidets deling → Regional utveksling
  → Den første byen → Sivilisasjonens morgen
GAMEPLAY-07  Sagbruk → Steinhoggeri → Bolighus (×3) → Torg → [By]  → «En by reiser seg»
GAMEPLAY-08  Organisert håndverk → Bedre jordbruk / Byggemetoder → Kunnskapshall → Delt kunnskap → Samfunnsorden
             → «Kunnskapens tidsalder»
GAMEPLAY-09  Flere ildsteder → [3. og 4. bosetting, autonomt] → Handelsveier → «Et sammenhengende rike» (låser opp Verden)
GAMEPLAY-10  Hinsides de kjente landene → [ekspedisjoner] → Den store ekspedisjonen → [utposter, karavaner]
             → En forbundet verden → «Verdens første sivilisasjon»
```

Avhengighetskjeden fra oppdraget er bevart: byen (1) låser opp foredling, foredling (2) muliggjør sivile bygg, sivile bygg (3) bærer kunnskap og organisering, organisering (4) åpner utvidelse, utvidelse (5) gir et regionalt nettverk, og nettverket (6) åpner verdens-utforskning.

## 3. Nye ressurser

| Ressurs | Kilde | Brukes til |
|---|---|---|
| **Planker** | Sagbruk (3 tre) | bolighus, torg, hall, fremskritt, regionale prosjekter, ekspedisjoner |
| **Tilhugget stein** | Steinhoggeri (3 stein) | bolighus, torg, hall, fremskritt, ekspedisjoner |
| **Kunnskap** | virksomhet (foredling, verksted, hall), oppdagelse, kystkaravaner | fremskritt og verdensinnsikter |

Alle tre er felles beholdninger. Ingen ny «valuta»: mat, tre og stein er gjenbrukt; PP er uendret.

## 4. Nye bosettings- og sivilisasjonstrinn

Bosetting: Leir → Grend → Landsby → Voksende landsby → Tidlig by → **By** → **Storby** (nye: By, Storby). Roller: Kunnskapssete, Bysenter, Sagbruksbygd, Steinhoggerbygd (nye) + Matbygda, Håndverksbygd, Skogbygd, Steinbygd.
Sivilisasjon: Spirende samfunn → Regional → Organisert → Sammenhengende rike → Verdensbevisst → Verdens første sivilisasjon. Land: ukjent → oppdaget → utpost → etablert.

## 5. Gjennomspilling (seed 20261009, bot — `docs/gameplay-07-10/playthrough-log.txt`)

| Milepæl | Spilltid | Folk | Kunnskap totalt |
|---|---|---|---|
| Den første landsbyen | 13 min | 8 | – |
| Nytt land i sikte / første bosettinger | 19 / 23 min | – | – |
| En levende region | 30 min | – | – |
| Den første byen | 44 min | 12 | – |
| Sivilisasjonens morgen | 45 min | 12 | 0 |
| **En by reiser seg** | 62 min | 19 | 43 |
| **Kunnskapens tidsalder** | 72 min | 27 | 120 |
| **Et sammenhengende rike** | 96 min | 34 | 612 |
| **Verdens første sivilisasjon** | 114 min | 39 | 1013 |

Slutt: 4 bosettinger (Storby/Kunnskapssete 23 folk; Matbygda 4; Sagbruksbygd 6; Steinhoggerbygd 6), 4 oppdagede land, 3 utposter (to etablert), 30 karavaneleveranser, 74 regionale leveranser, 107 turer, 5 etablerte ruter.

**Flaskehalser:** (1) stein (åtte steinblokker; dempet av raskere gjenvekst og lavere kostnader); (2) 44 → 62 min mellom Sivilisasjonens morgen og byen (stein og første foredling), (3) 74 → 87 min før Handelsveier (venter på en tredje bosetting, som igjen venter på mat- og tidskrav), (4) kunnskap er nå en reell port (hele 612 samlet før riket) men hoper seg opp mot slutten.
Boten kjøper grådig i datarekkefølge; mennesker kan være både raskere og tregere. Sju andre frø (1, 7, 11, 34, 100, 2026, 31337) spilles også hele veien (103–158 min); to av dem (34, 100) ligger i testsuiten.

Gjennomspillingen setter aldri milepælsflagg og gir seg aldri ressurser (se `tools/bot.js`). Ragnarok etter sluttmilepælen gir en gyldig, tom startverden (testet i Node og i Edge).

## 6. Ytelse

| Mål | Verdi |
|---|---|
| Simulering, Node | 0,4–0,6 ms per simulert sekund (0,007–0,010 ms/steg) uansett trinn (bygg 14 → 34, folk 4 → 39) |
| 4× fart i hovedløkka, Edge, inkl. tegning | under 16 ms/bilde (smoke-test) |
| Tegnetid, sent spill (Edge, programvare-GPU) | nær 3,5–5 ms; område (2300) 3–12 ms; oversikt 0,1–0,2 ms |
| Miljøoppdatering | 15–35 ms, sjelden (hvert 10. spillsekund) |

Ingen aktive-agent-grense trengtes: folketallet i hjemmeregionen går ikke over ~40, og fjerne land er rene tidtakere (ingen individuell simulering). Kostbart tomtesøk bufres 10 s. Ingen målt hotspot; ingen tungvint optimalisering ble gjort.

## 7. Testresultater

- `npm test`: **86/86** (44 eksisterende uendret + 42 nye i fem filer). Varighet ≈ 16 s.
- Edge, hodeløs: **GUI-røykprøve 33/33**, **Rike-røykprøve 22/22**, **ingen konsollfeil**; ti faktiske skjermbilder.
- Den tidligere rapporterte feilen **«panelet fanger pekeren (ikke canvas)»** (32/33 i GAMEPLAY-06) er undersøkt: den skyldtes at testen målte mens panelet fortsatt gled inn (CSS-overgang i sanntid), så panelet lå utenfor skjermen. Testen venter nå på at overgangen er ferdig. Det er altså en testfeil, ikke en pekerfeil; panelet fanget pekeren i alle repeterte kjøringer etter rettelsen. (Jeg observerte én gang at en full scenekjøring ga 32/33 før ventingen ble gjort robust; etter polling-rettelsen er 33/33 stabilt.)
- Deterministisk gjentakelse: to uavhengige kjøringer gir identisk sluttid, folketall, bosettingssteder og regiontilstander.

## 8. Kjente problemer

- Beholdningen er felles for alle bosettinger; «lager» er ikke selvstendige inventarer.
- Hub-and-spoke: ingen leveranser direkte mellom satellittene.
- Stein er trang; hele reisen kan oppleves for lang (≈ 2 timer) og har dødtid. Ikke spilltestet av mennesker.
- Utposter og ekspedisjoner er abstrakte tidtakere; ingen hendelser eller risiko.
- Kunnskap hoper seg opp mot slutten (ingen sluk utenfor fremskrittene).
- Oversiktsetiketter kan overlappe litt når to bosettinger ligger tett.
- `package-lock.json` ble ved en feil med i en commit midt i økta og er fjernet fra indeksen i en senere commit (historikken beholder den).

## 9. Teknisk gjeld

- `humans.js`, `renderer.js` og `hud.js` er store; byens sprites (`city.js`) og oversikten er bevisst kompakte, men ikke finpusset.
- Sprites for bolighus/sagbruk bruker enkel skrå projeksjon; konsistens med eldre sprites (hytte, lager) bør vurderes.
- `regionalWear`-kravtypen er ubrukt men beholdt.
- Hardkodede rekkefølger (planer per stedstype, region-prioritet) bør bli data.
- Ingen lagring/gjenopptakelse finnes ennå (ingen persistens i prosjektet).

## 10. Anbefalinger til Opus-runden (prioritert)

1. **Visuell polering av byen**: samme malerstil og perspektiv for alle bygg; bolighus-, hall- og torg-detaljer; bakkeslitasje rundt nye bygg; tydeligere skilt/identitet for roller.
2. **Oversiktens uttrykk**: overganger mellom Område og Verden, bedre etikettplassering, kystlinjer og lyssetting, tegne karavane- og ekspedisjonsruter som malte stier.
3. **Fjerne land som steder**: små synlige scener/utsnitt per biom ved utposter (hvis det skal være mer enn kart).
4. **Tempo og balanse** gjennom ekte spilltest: tid per milepæl, stein, kunnskapsflyt, hvor mye 2×/4× brukes.
5. **Kunnskapssluk og flere fremskritt** (stor del av kunnskapen er ubrukt).
6. **Lyd og stemning** for by, hall, karavaner og ekspedisjoner.
7. **UI**: oversiktens hover/hint, en mer lesbar «Veien til by»-visning, ressurser tettere ved mange (nå skjules etikettene ved ≥ 6).
8. **Planet-/solsystemsnivå**: bruk samme mønster (ett nivå opp, ærlig forenkling, trygg retur).
9. Persistens/lagring og meta-bonuser for Ragnarok.
