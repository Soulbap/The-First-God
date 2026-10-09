# VISUAL-02 — Natural Forest Structure & Living Ecology

Gren: `feature/visual-02-living-ecology` · Baseline: `feature/gui-02-evolution-polish`.

## Resultat

Verdensgeneratoren lager nå tolv tydeligere, artsdominerte lunder rundt en uregelmessig og spillbar startlysning. Gran står tettest i mørkere bestand, mens bjørk og unge trær oftere danner lettere kanter. Startbjørka, startsteinen, byggesonene og menneskenes rettlinjede navigasjon er ikke flyttet eller gitt nye regler.

Miljøpresentasjonen leser nå levende trær, stubber og bygg når den lager et lavoppløst, avledet lag med skogbunn, eksponert jord og forstyrret bosettingsjord. Laget fornyes deterministisk høyst hvert tiende spillsekund. Det erstatter ikke det cachede terrenget og påvirker aldri økonomi, kollisjon eller oppgavevalg.

## Kontroll

- `npm test`: **36/36** bestått. De to nye kontrollene bekrefter at bestandene beholder begge treslag og en tilgjengelig startlysning, samt at miljøoppdateringen er avgrenset og ikke tildeler ressurser.
- Hodeløs Edge, `tools/capture-gui.mjs`: **33/33** GUI-samhandlinger bestått (åpning/lukking, kategorier, kjøp, varslinger, milepæler, Ragnarok, tastatur og pekersperre); ingen konsollfeil.
- Fast nettleser-spillsekvens gjennom første ly, Vekkelse, bål, to hjem og Ragnarok ble kjørt ved skjermbildeopptak. Ingen manglende tomt eller konsollfeil ble meldt. Dette er en automatisert browser-smoke, ikke en erstatning for en menneskelig 5–10-minutters spilltest.
- Visuell kontroll: `05-settlement-after.jpg` er inspisert manuelt ved 1920×1080. Leiren, mennesker, bål og tråkket jord er lesbare mot den åpne lysningen; trær holder seg på skogkanten og konkurrerer ikke med bygningene.

## Bilder

Etterbilder fra samme seed og faste sceneskript ligger i denne mappen:

- `01-start-closed-after.jpg` til `06-milestones-after.jpg` — 1920×1080.
- `07-1366x768-after.jpg` og `08-1280x720-after.jpg` — kompakt layout.
- `09-ragnarok-after.jpg` — reset i samme startverden.

GUI-02s før-bilder i `docs/gui-02/` er den godkjente grensesnittbaselinen. VISUAL-02 hadde ikke et separat visuelt før-opptak før denne grenen; derfor fremstilles ikke disse som falske, identiske før/etter-par for skogkomposisjonen.

## Ytelse og begrensninger

Opptaket kjørte i hodeløs Edge på 1920×1080 (programvare-/headless-måling, ikke GPU-representativ). Den målte aktuelle rammen var 10,72 ms; den avgrensede miljøoppdateringen brukte 47,40 ms én gang i ti-sekundersintervallet. VISUAL-02 rebaker ikke baseterrenget i løkka: den ekstra canvasen er 384×256 px og bygges maksimalt én gang per ti spillsekunder. `TFG.renderStats.ecologyRefreshMs` er eksponert for videre maskinspesifikk måling.

Det er fortsatt prosedyregenerert kunst, og terrenget ved svært nær zoom beholder noe mykhet. Miljølaget er globalt cachet per oppdatering, ikke en ekte dirty-region-løsning; det er bevisst valgt fordi den begrensede ti-sekundersoppdateringen er enklere og sikrere for Genesis-01. En lengre manuell spilltest bør fortsatt vurdere estetisk variasjon etter mange hogst-/gjenvekstsykluser.

## Anbefaling

Klar for visuell gjennomgang av Genesis-01: komposisjon, spillbar start og GUI er bevart, og naturen kan nå reagere synlig uten å bli en ny spillmekanikk.
