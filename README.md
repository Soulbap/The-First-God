# THE FIRST GOD

Et rolig, visuelt incremental-/god game: du er en skapende kraft som vekker en verden til live. Tall forklarer fremgangen, men selve verden beviser den — trær vokser, mennesker sanker og bygger selv, og leiren vokser til en boplass mens kameraet åpner seg mot et større landskap.

## Status: Genesis-01 (spillbar prototype)

Genesis-01 er den første vertikale skiven:

- En liten painterly 2.5D-verden med bjørk, gran, stein, gress og et tjern.
- Trær vokser synlig, kan hugges ned og vokser opp igjen; steinblokker brytes ned og fornyes sakte.
- Manuell klikking på trær og stein gir de første ressursene (trevirke og stein).
- Fem menyvalg: Første ly, Vekkelse, Felles ild, Hendene husker og Nytt hjem.
- Autonome mennesker som sanker, bærer, bygger, hviler ved bålet og ber (bønnepoeng, PP).
- Bygg reises i synlige byggetrinn på steder spillet velger selv.
- Milepælen «Sammenhengende bosetting» glir kameraet ut fra nær- til områdevisning i samme verden.
- Frivillig Ragnarok som demonstrasjon (forhåndsvisning, kan avbrytes).

## Etter Genesis-01: fra leir til verden (GAMEPLAY-02 → 10)

Spillet har vokst langt forbi den første skiven: landsby, region, tidlig sivilisasjon, **by** (planker, tilhugget stein, bolighus, torg), **kunnskap** og fremskritt, opptil **fire bosettinger** med roller og handelsruter, og en **Verden-oversikt** med ekspedisjoner, utposter og karavaner. Alt skjer autonomt; du velger retning gjennom innsikter. Se `GAME_DESIGN.md` (seksjon 12) og rapportene under `docs/`.

## OPUS-01: den levende verdenen

- **Planeten**: zoom ut forbi områdevisningen (eller trykk **Planet**/V) og kameraet løfter seg fra den samme verdenen til kontinentet og hele kloden. Dra for å snu den, klikk på et land, rull inn eller klikk på hjemlandet for å vende hjem.
- **Velsignelser**: bønn (PP) brukes på varige velsignelser under Innsikter → Tro.
- **Høstfest**, **Ragnarok med arv** (ekko og minnesteiner), **lagring** (ingen offline-fremgang) og **lyd** (M for av/på).
- Se `docs/opus-01/`.

Rask kontroll: `npm test` (106 tester) og `node tools/playthrough.mjs` (spiller hele veien i simuleringen).

## Forutsetninger

- [Node.js](https://nodejs.org/) 22 eller nyere (utviklet med Node 24; testkommandoen krever filmønster-støtte i `node --test`).
- En moderne nettleser (Chrome, Edge eller Firefox).
- Ingen npm-pakker trengs.

## Kjøre spillet

Windows: dobbeltklikk `start.bat`. Den åpner nettleseren og starter en lokal server (la det svarte vinduet stå åpent mens du spiller).

Eller fra terminal:

```bash
npm start
```

Åpne deretter http://localhost:5173.

Kontroller: klikk på trær og stein, åpne **Innsikter** i menyen nederst (Escape lukker), dra for å panorere (på planeten: snu kloden), musehjul eller −/+ for zoom, V for planeten, M for lyd, mellomrom for pause og 1/2/3 for fart. Spillet lagres automatisk; `?fresh` i adressen starter på nytt uten å laste. Nye innsikter dukker opp etter hvert som verden utvikler seg.

## Kjøre tester

```bash
npm test
```

## Kjente begrensninger

- Grafikken er prosedyralt malt i koden, ikke håndmalt: bakken blir uskarp helt inne, felte stokker er enkle former og menneskene er forenklede figurer.
- Mennesker går i rette linjer og kan gå gjennom hytter (ingen hindringsunngåelse).
- Ingen offline-fremgang (bevisst valg): verden står stille mens spillet er lukket.
- Planetvisningen krever WebGL; uten WebGL vises den gamle kartoversikten.
- Stein fornyes sakte av spilløkonomiske grunner (åpent designspørsmål).
- Kjører i nettleser; ikke pakket som Windows-app (.exe).
- Balanseverdiene er provisoriske.

## Dokumenter

- [GAME_DESIGN.md](GAME_DESIGN.md) — autoritativ spilldesign, bekreftede prinsipper og åpne spørsmål.
- [AGENTS.md](AGENTS.md) — obligatoriske arbeidsregler for mennesker og AI-agenter.
- [CHANGELOG.md](CHANGELOG.md) — endringslogg.
- [PLAYTEST.md](PLAYTEST.md) — sjekkliste for spilltesting av Genesis-01.
