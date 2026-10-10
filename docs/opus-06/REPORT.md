# OPUS-06 — Den mekaniske revolusjonen

## Status

**PARTIAL — minste integrerte, spillbare skive.** Mekanisk kraft har en reell material- og kapasitetsløkke, men region-for-region-spesialisering og sjøtransport av maskindeler er ennå ikke egne OPUS-06-utvidelser.

## Implementert

- Kunnskapen **Elvens og vindens kraft** følger eksisterende metallurgi og verksted.
- Verkstedet lager den grupperte ressursen **maskindeler** av tre og enten bronse eller jern.
- Vannmølle velges bare på tørr grunn langs hjemmedammens faktiske kant. Vindmølle er en deterministisk reserve når den lokale mølletomten ikke er mulig.
- Bosettingen bygger én mølle autonomt først når den har minst to relevante arbeidsprosesser (åker, sagbruk eller steinhoggeri), alle byggevarer og maskindeler.
- Aktiv mølle gir kun sin egen bosettings sagbruk og steinhoggeri høyere hastighet, samt bedre åkerutbytte. Uten lokal kraft beholdes manuelt tempo.
- Slitasje er aggregert per mølle. Ved terskel bruker folket litt tre og én maskindel på automatisk reparasjon; mangel reduserer drift i stedet for å ødelegge byen.

## Kraftmodell

Kilden er møllen (vann eller vind), kapasiteten er lokalt lagret på den virksomhetsbygningen, og forbruket leses bare av produksjon i samme bosetting. Det finnes ingen overføringslinjer, global kraftkonto eller spillerstyrte nett. Vann- og vindegnethet er en ren seed-/geografifunksjon og varierer ikke per bilde.

## Persistens og Ragnarok

Save-formatet er v6. Lasting av v2–v5 fyller inn mekanisk tilstand og ressursfelt fra en ny, seedet verden uten å endre øvrige data. Infrastrukturen er sykluslokal og nullstilles dermed naturlig ved Ragnarok; Prestige er urørt.

## Kontroller

- `node --test tests/opus06.test.js`: 4/4 bestått.
- `node --test tests/materials.test.js tests/opus05.test.js tests/opus06.test.js`: 10/10 bestått.
- Full testkommando ble startet, men miljøet avbrøt den lange samlede kjøringen. Separat `tests/planet.test.js` har én kjent, urelatert feil (`31337 Vestkysten er kyst uten hav`); OPUS-06 endrer ikke planet-/kartkode.
- `git diff --check`: bestått.
- Visuell kontroll: den eksisterende lokale forhåndsvisningen ble åpnet. Full manuell OPUS-06-spillgjennomspilling og de ti forespurte scenebildene ble ikke ferdigstilt i denne passeringen; de står som **PARTIAL** i stedet for å bli påstått som verifisert.

## Kvalitetsporter

| Port | Status | Notat |
|---|---|---|
| Deterministisk geografi | PASS | Testet for vann og vind. |
| Reelle innsatsvarer / ingen duplisering | PASS | Testet for maskindeler og møllekostnad. |
| Lokal kraft uten fri bonus | PASS | Testet for sagbruk kontra verksted. |
| Vedlikehold og lagring | PASS | Reparasjon og v5-migrering testet. |
| Regional handelsspesialisering | PARTIAL | Eksisterende handel er bevart, men maskindeler får ikke ennå en særskilt regional handelsprioritet. |
| Full visuell dokumentasjon | PARTIAL | Bygg- og driftsrendering er lagt til; komplett scenariofangst gjenstår. |

## Kjente begrensninger

- Vannløpet er prosjektets eksisterende dam-abstraksjon, ikke full hydrologi.
- Hver bosetting har høyst én mekanisk kilde i denne første skiven.
- Kraft er integrert med eksisterende lokale prosesser, ikke med en ny spilleradministrert transmisjonsmodell.
