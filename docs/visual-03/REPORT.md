# VISUAL-03 — Living Settlement & Landscape Cohesion

Gren: `feature/visual-03-living-settlement` · Baseline: `feature/visual-02-living-ecology`.

## Resultat

Lysningen har fått et roligere og mer organisk overgangsbelt: noen busker og unge trær står nå som pionerer mellom skog og åpen mark, men den sentrale leirplassen er fortsatt fri og spillbar.

Bosettingens jordspor følger presentasjonsdata som allerede finnes. Et nytt bygg starter med et svakt, ujevnt arbeidsmerke. Når mennesker, leveranser og bål kommer til, blir marken ved innganger, lager og ildsted gradvis flatere og mer bar. Korte, avbrutte forbindelser mellom disse virkelige samlingspunktene støtter gangslitasjen fra de autonome menneskene; det er ikke lagt til vei-bygging eller ny pathfinding. Byggestøv og avkapp er tydeligst mens noe reises og blir deretter redusert til sparsomt bruksspor.

## Bilder

Etterbilder fra fast seed ligger i denne mappen:

- `01-start-closed-after.jpg` — urørt startverden og åpningen i skogen.
- `03-unaffordable-after.jpg` — første ly/arbeidsområde uten menneskelig bruk.
- `04-first-humans-after.jpg` — de første vandringene og svake spor ved ly/lager.
- `05-settlement-after.jpg` — bål, hjem, lager og tydeligere sammenhengende brukt mark.
- `06-milestones-after.jpg` — bål og leir med aktiv menneskelig rytme.
- `07-1366x768-after.jpg`, `08-1280x720-after.jpg` — kompakte spilleflater.
- `09-ragnarok-after.jpg` — Ragnarok-dialogen før tilbakestilling; den nye syklusen bruker fortsatt identisk, ren startverden.

VISUAL-02s bilder er baselinen. Dette passet har ikke et separat identisk før-opptak, så bildetolkningen fremstilles ikke som en falsk piksel-for-piksel-sammenligning.

## Kontroll

- `npm test`: **36/36** bestått.
- Hodeløs Edge: GUI-røykprøven fullførte **33/33** kontroller uten konsollfeil.
- Bildene over er inspisert ved 1920×1080, inkludert urørt start, første mennesker, bosetting og bredere zoom. Bosettingen er lesbar som fokus uten å skjule trær, stein eller mennesker.
- Ragnarok bruker fortsatt `newCycle()` og rendererens `reset()` med samme seed, som gjenoppretter den rene startverdens tilstand og dens visuelle cacher.

## Bevisste avgrensninger

Spilløkonomi, oppgraderingskrav, GUI, menneskelig beslutningslogikk, kollisjon, kameraregler og Ragnarok-regler er uendret. Det finnes ingen nye bygg, NPC-er, dyr, manuelt plasserte stier eller vedvarende økologisk simulering.

## Begrensninger

Sporene bruker et grovt, eksisterende slitasjerutenett og kan derfor leses mykere enn en håndmalt sti ved svært nær zoom. Overgangsvegetasjonen er prosedyral, og videre kunstpass kan gi mer lokalt særpreg uten å utvide spillmekanikkene.
