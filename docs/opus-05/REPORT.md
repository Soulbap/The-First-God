# OPUS-05 — The Age of Discovery

## Status

**PARTIAL.** Dette er en avgrenset, fungerende vertikal skive for navigasjon og kartkunnskap, lagt over OPUS-03/04s region- og varemodell. Den er ikke en full global hydrologi eller separat logistikkmotor.

## Implementert

- Regioner får deterministisk vannadgang (`kyst`, `elv`, `åpent hav`) fra samme frø som resten av verdenskartet.
- Kunnskap er adskilt fra fysisk geografi og besøk: `unknown`, `discovered`, `surveyed`, `charted`. Utforskning er eneste vei til oppdagelse; karttegnere forbedrer bare allerede oppdagede land.
- «Kystens veivisere» lar mennesker bygge en landingsplass ved vannet, bruke tre, stein og planker og sjøsette en båt. «Seil og stjernekart» gir større fartøy.
- Fjernhandel velger land-, elv- eller sjømodus. Sjølast reserverer kildens beholdning ved avreise og krediteres først ved ankomst. Ett fartøy kan bare ha én aktiv last.
- Oversikten toner usurveyert kunnskap ned og bruker blå maritime ruter/last.
- Save v5 fyller inn navigasjonsfelt ved lasting av v2–v4. Planetkameraet har ingen ny navigasjonsgate.

## Kvalitetsporter

| Port | Resultat | Bevis |
| --- | --- | --- |
| Determinisme / rutevaliditet | PASS | `tests/opus05.test.js`; full testsvite |
| Ressursbevaring / last underveis | PASS | Test for sjølast, lagre/lese og ingen duplisering |
| Planetkamera-gate | PASS | Eksisterende OPUS-03-test består; ingen OPUS-05-handling åpner kameraet |
| Autonom kai/båt og kartlegging | PASS | Nye målrettede tester |
| Full gjennomspilling | PARTIAL | Nåværende bot velger ikke de nye valgkortene |
| Visuell kontroll | PARTIAL | Startscenen er inspisert i ekte nettleser. `capture-gui.mjs` hang på top-level await og produserte ingen lagrede bilder; maritime sent-/kartscener må captures i konsolideringsrunden. |

## Kontroller kjørt

- `node --test tests/opus05.test.js` — 3/3 bestått.
- `npm test` — bestått.
- `node tools/playthrough.mjs 20261009 14400 600` — stabil eksisterende progresjon.
- Ekte nettleserinspeksjon av startscenen på `http://localhost:5173/?debug`.

## Kjente begrensninger

- Lokal vannkant er den eksisterende dammen: en bevisst liten, testbar havneplassering, ikke ny terreng-/hydrologisimulator.
- Fjerne fartøy er aggregert som eksisterende karavaner. Lokale detaljerte båt-sprites og komplette, separate havner i fjernregioner er framtidig visuelt arbeid.
- Screenshot-mottakeren må repareres før OPUS-05 kan få den påkrevde varige screenshot-pakken.
