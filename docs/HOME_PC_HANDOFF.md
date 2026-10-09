# THE FIRST GOD — overlevering til hjemme-PC

**Dato:** 2026-10-09

**Repository:** https://github.com/Soulbap/The-First-God

**Arbeidsgren ved overlevering:** `feature/gameplay-05-living-region`
**Siste gameplay-commit:** `61334dd2888e62b314d06a8e75eaad6272acb6ee` — `feat(gameplay): grow settlements into a living region`

## Hva som skal åpnes hjemme

Den nyeste spillbare versjonen ligger på `feature/gameplay-05-living-region`. Den inneholder GAMEPLAY-05, «Den levende regionen», og bygger videre på tidligere GUI-, visuelt- og gameplay-arbeid. Ingen feature-grener er slått sammen i `main`; `main` er fortsatt dokumentasjonsgrunnlaget `2c6752b`.

De ferdige, foreløpig uintegrerte feature-grenene er:

- `feature/gui-01-divine-interface`
- `feature/gui-02-evolution-polish`
- `feature/visual-01-living-world`
- `feature/visual-02-living-ecology`
- `feature/visual-03-living-settlement`
- `feature/gameplay-02-camp-to-village`
- `feature/gameplay-03-living-village`
- `feature/gameplay-04-beyond-first-village`
- `feature/gameplay-05-living-region`

## Implementert spilltilstand

- Klikkbar innsamling av tre og stein i en seedet, painterly 2.5D-verden.
- Autonome innbyggere som samler, bærer, bygger, hviler og ber.
- Innsikter, milepæler, byggesteg, bål, hjem, felleslager og områdezoom.
- Frivillig Ragnarok-demonstrasjon med trygg ny syklus.
- Utforskning, grunnleggelse av en ny lysning, fysiske leveringer, lokale byggeprosjekter, regional befolkningsvekst og tydeligere ferdselsårer.

## Siste kontroll

- `npm test`: **41/41 bestått** (2026-10-09).
- GAMEPLAY-05-rapporten er i `docs/gameplay-05/REPORT.md`; den dokumenterer ti deterministiske Canvas-bilder, GUI-røykprøve 33/33 uten konsollfeil og regional scene på 4,08 ms/bilde.

## Kjente begrensninger

- Ingen lagring ennå; siden starter en ny økt ved lasting.
- Regional beholdning er med hensikt felles; lokale lagre er bygge- og møtepunkter, ikke selvstendige økonomier.
- Én bærer har én levering om gangen, og rutevalg bruker enkel tjern-omvei i stedet for full pathfinding.
- Mennesker kan gå gjennom hytter. PP og permanente Ragnarok-bonuser er fortsatt plassholdere.
- Balanse, regional ventetid og lesbarheten til regionalsti på vanlig skjerm trenger spilltest.

## Kom i gang på Windows

Ny klone:

```powershell
git clone https://github.com/Soulbap/The-First-God.git
Set-Location 'The-First-God'
git switch feature/gameplay-05-living-region
npm install
npm test
npm start
```

Åpne deretter http://localhost:5173 i en moderne nettleser. `npm install` forventes å fullføre uten å legge til nye prosjektavhengigheter; Node.js 22 eller nyere kreves.

Eksisterende klone:

```powershell
Set-Location 'C:\sti\til\The-First-God'
git fetch origin
git switch feature/gameplay-05-living-region
git pull --ff-only
npm install
npm test
npm start
```

## Lokale filer som ikke følger med

`References/` er bevisst holdt lokalt og er ikke lagt til Git. Den inneholder to konseptbilder og tre Visual-01-skjermbilder. Mappen er urørt i denne overleveringen og kommer ikke automatisk med til hjemme-PC-en.

## Anbefalt neste oppgave

**GAMEPLAY-05.1 — Regional Readability & Pacing** (anbefaling, ikke implementert her):

1. Gjøre den andre bosettingen tydelig gjenkjennelig.
2. Gjøre veksten i bosettingene mer synlig.
3. Forbedre lesbarheten til regionale stier.
4. Spillteste progresjon og ressursbalanse.
5. Kontrollere om milepælsvarsler blir stående synlige for lenge.
