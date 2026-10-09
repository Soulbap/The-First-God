# OPUS-01 — Gjennomspilling og tempo

> **Viktig:** Alle gjennomspillinger her er **automatiske** (`tools/bot.js`: klikker de første 40 sekundene og kjøper alt som er tilgjengelig, grådig, i datarekkefølge). **Ingen menneskelig spilltest er gjort** i OPUS-01. Boten setter aldri milepælsflagg og gir seg aldri ressurser. Et menneske kjøper senere og ser mer, og vil trolig bruke 20–40 % lengre tid.

## 1. Før og etter (seed 20261009)

| Milepæl | Før (baseline `8159882`) | Etter (OPUS-01) |
|---|---|---|
| Første hjem / Første ild | 0:24 / 0:44 | 0:24 / 0:44 |
| Sammenhengende bosetting | 4:09 | 4:09 |
| Den første landsbyen | 13:01 | 11:50 |
| De første stiene | 15:02 | 13:59 |
| Nytt land i sikte | 19:18 | 16:42 |
| De første bosettingene | 22:52 | 19:30 |
| En levende region | 29:41 | 26:43 |
| Stabil matforsyning | 33:03 | 30:18 |
| **Den første høstfesten** (ny) | — | 32:27 |
| Den første byen | 43:31 | 37:28 |
| Sivilisasjonens morgen | 44:53 | 38:45 |
| En by reiser seg | 61:48 | 51:01 |
| Kunnskapens tidsalder | 71:41 | 58:50 |
| Et sammenhengende rike (planeten avsløres) | 96:15 | 73:46 |
| **Verdens første sivilisasjon** | **113:36** | **88:08** |

Ressurser ved slutt: før 1032 PP og 2572 mat ubrukt; etter 779 PP (alle velsignelser på maks) og 821 mat (festene har brukt resten).

## 2. Sju frø

| Frø | Før (rapportert i GAMEPLAY-07..10) | Etter | Lengste venting mellom to hendelser (etter) |
|---|---|---|---|
| 20261009 | 113:36 | 88:08 | 8:28 (venter på 3./4. bosetting, før Kunnskapens lys nivå 3) |
| 1 | 103–158 (spenn for alle) | 85:05 | 6:30 (utposter vokser før sluttmilepælen) |
| 7 | | 83:27 | 7:08 |
| 34 | | 84:16 | 6:35 |
| 100 | | 86:20 | 6:36 |
| 2026 | | 80:11 | 6:44 |
| 31337 | | 96:35 | 6:44 |

Alle sju når sluttmilepælen; ingen fastlåsing. Ingen ressurs blir noen gang negativ (sjekket per steg for tre frø gjennom hele spillet).

## 3. Tempoanalyse

**Tidlig spill (0–15 min).** Klikk → ly → vekkelse → bål → hjem. Uendret; fungerte allerede. Ny: den første velsignelsen (Regnets velsignelse) blir tilgjengelig ~5 min inn, slik at spilleren tidlig lærer at bønn har en virkning. Kjøp kommer omtrent hvert 1–2 minutt.

**Region (15–40 min).** Utforskning, grunnleggelse, leveranser. Litt raskere fordi stein ikke lenger «forsvinner» i negative reservasjoner og fordi Steinens gave demper steinflaskehalsen — det var baseline-rapportens flaskehals nr. 1. Høstfesten (~32 min) gir et synlig, gjenkjennelig øyeblikk midt i fasen.

**By og kunnskap (40–60 min).** Sagbruk → steinhoggeri → bolighus → torg → hall. Jevn strøm av kjøp; tettere byplassering gjør at byen faktisk *ser* ut som den vokser.

**Rike (60–75 min).** Den tidligere dødtiden (74 → 96 min, ~21 min uten kjøp mens trevirket hopet seg opp) er redusert til et par hull på 5–8 min. Det gjenstår noe venting på tredje/fjerde bosetting (mat-, folk- og ro-krav). Det er tydelig forklart i Rike-panelet.

**Verden (75–90 min).** Avsløringen av planeten markerer starten. Ventingen før sluttmilepælen (~6–7 min) er utposter som vokser og karavaner som kommer — det er nå noe å se på: planeten med ruter, ekspedisjonsprikk og nattlys.

**Skille mellom bevisst idle-tempo og uinteressant venting.** De gjenværende hullene på 5–8 min er perioder der verden synlig arbeider (bygging, karavaner, ekspedisjoner) og der et tilbud (velsignelse/innsikt) vanligvis venter på PP eller kunnskap. Det vurderes som akseptabelt idle-tempo. Det ~21 min lange hullet før var uinteressant venting og er fjernet.

**Risiko for trivialisering.** Velsignelsene er sterke (særlig Steinens gave og Vandrerens letthet). Tallene er provisoriske. Hvis menneskelig spilltest viser at mellomspillet føles for raskt, er første justering å øke `costGrowth` for velsignelsene (2,2–2,4 → 2,8).

## 4. Ragnarok-verifikasjon

| Kontroll | Resultat | Hvordan |
|---|---|---|
| Forhåndsvisning viser tap, beholdning, tildeling og varig avtrykk | OK | Nettleser (skjermbilde `09-ragnarok-after.jpg`) |
| Ekko kan velges før bekreftelse; budsjettet synker | OK (323 → 268 PrP) | Nettleser, `?debug` |
| Avbryt forkaster valgene | OK (budsjett tilbake til 323) | Nettleser |
| Bekreft gir ren ny syklus: tid 0, 0 mennesker, 0 bygg, 0 ressurser, ingen oppdagede land, ikke planetvisning | OK | Nettleser |
| Bare valgt ekko er aktivt (Gamle røtter nivå 1 → +1 per klikk) | OK | Nettleser + `tests/opus.test.js` |
| Minnestein ved tjernet i ny syklus | OK | Nettleser, skjermbilde over |
| Startverdenen er identisk med ekko (samme trær, stein, landskap) | OK | `tests/opus.test.js` |
| Planeten er den samme, bare hjemmet kjent | OK | `tests/planet.test.js` |
| Rike/planet-røykprøven: Ragnarok fra planeten gir ny syklus uten planet/Rike/verdensknapp | OK | `tools/gui-smoke-realm.js` |

## 5. Samhandlingsfunn underveis (rettet)

- Rulling i planetvisningen kansellerte utgangen den selv ba om (fant røykprøven) — rettet.
- Områdezoomen åpnet seg bare ved selve milepælshendelsen; en lastet verden satt fast i nærbildet — rettet (følger tilstanden).
- Velsignelser kunne være kjøpbare før de var synlige — rettet (krav = oppdagelse).

## 6. Hva en menneskelig spilltest bør se etter

Se `PLAYTEST.md` (seksjonen OPUS-01). Særlig: om avsløringen føles som et høydepunkt, om ukjent land er forståelig, om velsignelsene merkes, og om 1,5 timer er en god syklus.
