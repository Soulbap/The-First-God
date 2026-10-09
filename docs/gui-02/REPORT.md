# GUI-02 — Divine Polish & Evolution Feedback

Gren: `feature/gui-02-evolution-polish` (fra GUI-01). GUI-02 bevarer oppsett, kostnader, krav, simulering og Ragnarok-resultat.

## Endringene

- Innsiktskort har nå tydeligere titler (19 px), 16 px luft, en kompakt 46 px ikonflis og lesbarere «I verden»-tekst (14 px). Kostnad, mangeltekst og byggeprogresjon beholder egne, stabile områder.
- En liten `PresentationCoordinator` samler simuleringshendelser før de når HUD-en. Én melding vises om gangen; milepæler går foran innsikter, dubletter ignoreres, maksimalt fire meldinger beholdes, og Ragnarok rydder kø og synlige meldinger.
- Første ly, Vekkelse og Felles ild får kompakt betydningsfull presentasjon med verdenskonsekvens. Vanlige innsikter er korte meldinger. «Sammenhengende bosetting» er en gjenbrukbar, sterkere milepælsvariant.
- Bevegelsen er fortsatt transform/opasitet-basert. Kort: 220 ms; panel: 250 ms; innkommende kort/meldinger: 320 ms. `prefers-reduced-motion` slår av ikke-essensiell bevegelse.

## Bilder

Før-bildene er den faste GUI-01-baselinen med samme seed, kamera og sceneskript. Etter-bildene ble tatt med `tools/capture-gui.mjs` i hodeløs Edge mot lokal server.

| Scene | Før | Etter |
|---|---|---|
| Tidlig verden | `01-start-closed-before.jpg` | `01-start-closed-after.jpg` |
| Første oppdagelse | `02-start-open-before.jpg` | `02-start-open-after.jpg` |
| Bosetting | `05-settlement-before.jpg` | `05-settlement-after.jpg` |
| Kompakt skrivebord (1280×720) | `08-1280x720-before.jpg` | `08-1280x720-after.jpg` |
| Milepæl | `06-milestones-before.jpg` | `06-milestones-after.jpg` |
| Ragnarok | `09-ragnarok-before.jpg` | `09-ragnarok-after.jpg` |

Ekstra etterbilder: `03-unaffordable-after.jpg`, `04-first-humans-after.jpg` og `07-1366x768-after.jpg`.

## Kontroll

- `npm test`: **34/34** bestått. Fire nye tester dekker klassifisering, prioritet/sekvens, deduplisering/køgrense og nullstilling ved Ragnarok.
- Visuell kontroll: `03-unaffordable-after.jpg` ble inspisert manuelt. Kortet har ingen klipping, knapp og kostnader er atskilt, og den gjennomskinnelige flaten er lesbar over lyst gress.
- Skjermbildeverktøyet rapporterte ingen konsollfeil for de ferdige scenene.

## Tilgjengelighet og begrensninger

Eksisterende tastaturnavigasjon, fokusretur, pointer-isolasjon og norske etiketter er bevart. Meldingene er `aria-live="polite"`; de flytter ikke fokus. De nye røykprøvekontrollene er lagt til i `tools/gui-smoke.js`, men den utvidede manuelle nettleserkjøringen ble ikke gjennomført i denne arbeidsøkten.

Meldinger er med hensikt UI-baserte: denne versjonen endrer ikke rendererens verdensankere eller kamerastyring. Dermed kan den gi sikker, ikke-blokkerende evolusjonsfeedback uten å oppfinne posisjoner eller endre menneskenes atferd. Det er fortsatt ingen lagring av «sett»-tilstand.
