# OPUS-12 — levende sivilisasjon

**Gren:** `feature/opus-12-living-civilization` (fra `feature/opus-11-civilization-integration`, `7e90698`). Ikke slått sammen med `main`; `References/` er ikke rørt; `package-lock.json` er fortsatt uspores.

## 1. Grunnlag
OPUS-11 var på plass (202/202 tester, 90 s). Målt før endring (frø 20261009, 7200 s): 16,5 % av folk i klynger (≥4 innen 22 enheter), største klynge 25, 40 % ved bål, 63 % av folk i `idle`/`wander` sent i spillet. **Rotårsaker:** (a) ingen møteplasser å gå til når oppgavene tok slutt (lagertak) – alle «rusla» rundt bosettingens hjerte; (b) hvile alltid ved bålet (`restEvery`); (c) satellittfolk leverte til hovedstadens lager og gikk dit; (d) vedlikehold valgte fra en liten liste, uten plasser. Baseline-data: `baseline-*.json`.

## 2. Menneskeatferd
`src/sim/community.js`: hjem (`homeId`), arbeidssted (`workId`), steder med kapasitet og plasser (ring/rader), vekter etter trinn, døgn og strøm. Fritid, hvile og vedlikehold bruker `pickPlace`. Folk går langs gatenettet (`routeAlong`) og rundt bygg. Resultat (samme frø/tid): klynger 3,4–4,7 %, største klynge 8–9, ved bål 29–31 %, `stacked` 2951 → 624–948. Arbeidspose ved verksteder og åkre.

## 3. Bosettingsplanlegging, gater, områder
`src/sim/streets.js`: persistent nett (`S.net`), vokser av byggene, aldri gjennom bygg, to forbindelser i ulike retninger gir kvartaler. Veiarbeid: sti → jordvei → grusvei → brolagt, krever trinn, kunnskap, materialer fra eget lager (satellitter bare overskudd), tid og to hender; ingen hopper over nivå. Tomtevalg: gateadgang for hus, fraktadgang for verksteder, bygg ikke på gater eller jernbanetrasé. `src/sim/districts.js`: syv områder og økonomisk identitet. Allmenning og park er nye bygg.

## 4. Arkitektur
`src/sim/architecture.js` + `src/render/housing.js`: byggeplan per hus (etasjer, akser, tak, fasade, inngang, balkong); høyde følger grunnverdi (sentrum, tetthet, folketall, trinn). Vinduslys følger planen; moderne blokker lyser bare med strøm. Mellomformer (3–4 etasjers tegl, puss, stein) dekker overgangen fra tømmer til blokk.

## 5. Regional økonomi og handel
`inventory.js`: hver bosetting eier sitt lager. Gjort lokalt: sanking, åkre/mat, foredling, møller (prosjekt), vedlikehold av møller. `trade.js`: import til hovedstaden under lavvann, matstøtte; prosjekter fra hovedstaden. Bærere, lastebil og tog tar leveranser i kø; last trekkes ved avreise og bevares i transitt (tester). **Jernbanen** sender ikke lenger kull ut og tilbake (OPUS-11-feil); toget går bare på bestilling. Sporet går mellom stasjoner. Folk spiser; matlager har tak.

## 6. Vekst, spesialisering, flytting
`growth.js`: satellitter bygger etter nærmeste ressurser og behov; arbeidsplasser (`jobsOf`) begrenser boligbygging. `migration.js`: flytting én og én mellom bosettinger med bolig, mat og arbeid; sult og arbeidsløshet presser; ingen pendling (hvilepause, fullt hus). Utfall: se `ECONOMY_AND_SETTLEMENT_RESULTS.md`.

## 7. Lagring og Ragnarok
Format **v12**; v11 leses (nye felt fylles). Ragnarok gir en verden uten gater, handel, flytting eller lokale lagre (test).

## 8. Tester
**230/230** (`node --test tests/*.test.js`, 131 s). Nye: `opus12-world.test.js` (16) og `opus12-economy.test.js` (12). Fire eldre tester oppdatert (jernbane/lastebil til bestillingsmodell, lagringsversjon, tilstandsnavn, flyttallsavrunding).

## 9. Ytelse
Frø 20261009, til institutt, sekvensielt: OPUS-11 56,2 s; OPUS-12 100,6 s (først 166,9 s). Omveisjekken stod for 42 % og kjøres nå én gang per mål. OPUS-12 simulerer ca. 20 % flere folk og 40 % flere bygg, så sammenligningen er ikke likt arbeid. **Regresjon: ca. 1,8× tregere per spilltid.** Tomtesøk-minnet fra OPUS-11 er beholdt.

## 10. Begrensninger
- **Sammenslåing/redevelopment** av gamle hus: ikke gjort (kun ombygging på stedet).
- Torget brukes lite ved middagstid; samlinger ses mer ved bål, hjem, park.
- Områder er avledet og vises i panelet, ikke som synlig tegning.
- Satellittfolk kan hente malm uten at gruven står i samme bosetting.
- Hovedstaden ender alltid som «Storby» med 91–94 folk (boligtak) på tvers av frø; variasjonen ligger i satellittene.
- Fjerne regioner utenfor hjemmekartet vises fortsatt som sammendrag.
- Alle nye tall er provisoriske; ingen menneskelig spilltest.

## 11. Kvalitetsporter
| # | Port | Status | Bevis |
|---|---|---|---|
| 1 | Daglig aktivitet | PASS | metrikker før/etter; tester |
| 2 | Naturlig sosial fordeling | PASS | klynger 3–5 %; scene-serien; torg lite brukt |
| 3 | Hjem/arbeid | PASS | `assignHome`/`workId`; tester |
| 4 | Meningsfulle veier | PASS | nett, veiarbeid, ruting; tester |
| 5 | Gjenkjennelige nabolag | PARTIAL | områder avledes, ikke tegnet |
| 6 | Funksjonelle områder | PARTIAL | profil og panel; ingen tegning |
| 7 | Ombygging/redevelopment | PARTIAL | kun på stedet |
| 8 | Arkitektonisk variasjon | PASS | tester, scene 9/13 |
| 9 | Historisk bevaring | PASS | test, scene 14 |
| 10 | Lagerisolasjon | PASS | tester; unntak: mineraler (se 10) |
| 11 | Meningsfull handel | PASS | bestillingsmodell; bevaringstester |
| 12 | Jernbanefrakt | PASS | regresjonstest; stasjonstrasé |
| 13 | Regional spesialisering | PASS | 8 frø, ulik identitet |
| 14 | Ulike vekstmønstre | PARTIAL | satellitter 27–58 folk; hovedstad lik |
| 15 | Migrasjon | PASS | test (bevart folketall); 10–46 flyttinger |
| 16 | Synlig teknologi | PASS | scene 5–7, 13 |
| 17 | Utenfor skjerm | PASS | test |
| 18 | Determinisme | PASS | test (to kjøringer, lagre/lese) |
| 19 | Lagre/lese | PASS | v11-migrering testet |
| 20 | Ragnarok | PASS | test |
| 21 | Naturlig fremdrift | PASS | 8 frø: institutt 3,57–4,02 t |
| 22 | Hodeløs ytelse | PARTIAL | 1,8× tregere enn OPUS-11 |
| 23 | Visuell QA | PASS | `VISUAL_QA.md` |
| 24 | Full testpakke | PASS | 230/230 |
