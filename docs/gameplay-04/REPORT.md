# GAMEPLAY-04 — Bortenfor den første landsbyen

Gren: `feature/gameplay-04-beyond-first-village` · Baseline: GAMEPLAY-03.

## Resultat

Den første landsbyen kan nå bli begynnelsen på en region. Etter **Utforskertrang** åpner **Nye horisonter** for én målrettet reise til en deterministisk lysning. Når stedet er oppdaget, lar **Grunnleggelse** tre eksisterende innbyggere gå dit, danne en byggeplass, reise en hytte og tenne et lite ildsted. De beholder sine vanlige autonome bevegelser, mens den første landsbyen fortsetter å virke.

Lysningen velges fra et fast kandidatnett med enkel score for avstand, tørr grunn, fri plass og lokale naturressurser. Lang reise styrer rundt tjernet ved et enkelt mellompunkt; dette holder ruten stabil uten å innføre et nytt navigasjonssystem. Faktisk vandring er fortsatt eneste kilde til forbindelsen i bakken.

## Faktiske bilder

Bildene er tatt fra den kjørende Canvas-versjonen med fast seed og GAMEPLAY-04-debugscener. De er ikke mockups.

1. `01-original-village.jpg` — den etablerte første landsbyen.
2. `02-explorer-journey.jpg` — utforskeren på vei mot mulig nytt land.
3. `03-discovered-clearing.jpg` — lysningen etter oppdagelsen.
4. `04-founding-party.jpg` — grunnleggerne på vandring.
5. `05-second-settlement.jpg` — den unge bosettingen med første hytte og ild.
6. `06-first-region.jpg` — begge steder og deres voksende forbindelse i regional ramme.

## Kontroll

- `npm test`: **39/39** bestått, inkludert den nye komplette flyten fra utforsking til en aktiv andre bosetting.
- Hodeløs Edge-capture: seks GAMEPLAY-04-bilder skrevet. GUI-røykprøve: **33/33**. Ingen konsollfeil.
- Regional scene: målt til 12,97 ms/bilde i den faste capture-situasjonen.
- Ragnarok bruker fortsatt `createGame(SEED)`: begge bosettingene, grunnleggere, oppdagelse og slitasje opprettes på nytt og den deterministiske startverdenen er urørt.

## Bevisst avgrensning

Det finnes én delt ressursbeholdning, én ny bosetting og ingen handel, mat, kart eller flere kolonier. Den andre bosettingen er med hensikt yngre: første hytte, lite ildsted og lokale bevegelser. Videre arbeid bør være spilltesting av reise- og ventetid, særlig hvor raskt den interregionale slitasjen blir lesbar i vanlig spill.
