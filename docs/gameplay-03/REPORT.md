# GAMEPLAY-03 — Den levende landsbyen

Gren: `feature/gameplay-03-living-village` · Baseline: `feature/gameplay-02-camp-to-village`.

## Resultat

Landsbyen fortsetter nå å fortelle hva menneskene gjør også når spilleren ikke griper inn. De samler, bærer og bygger som før, men tar i en ferdig landsby også korte, usynkroniserte pauser ved ildstedet og små vedlikeholdsbesøk ved hjem, lager og fellesplass. Byggeplasser beholder høyeste prioritet.

Gangsporene følger fremdeles virkelig bevegelse. Leveringer, byggearbeid og returen hjem sliter bakken raskere enn tilfeldig vandring, slik at forbindelser mellom lager, ildsted, hjem, skog og byggesider blir tydeligere over tid uten at spilleren legger en eneste vei. Slitasjen beholder den eksisterende jordnære, ujevne kanten og cached wear-laget.

Etter «Den første landsbyen» kan spilleren velge **Utforskertrang**. Valget koster 64 trevirke og 44 stein og lar én ledig innbygger gå ut i tilgjengelig terreng, oppholde seg kort der og vende hjem igjen. Reisen lager bare svake, faktiske fotspor. Oppdagelsen utløser milepælen **De første stiene**.

## Faktiske bilder

Bildene er tatt fra den kjørende Canvas-versjonen med fast seed og debug-scenene i `tools/capture-gui.mjs` (`GAMEPLAY_03=1`). De er ikke mockups.

1. `01-starting-world.jpg` — urørt start med ingen etablert landsbyaktivitet.
2. `02-first-camp.jpg` — de første autonome samlerne ved bål og ly.
3. `03-growing-settlement.jpg` — større bosetting med lager under bygging og synlig arbeid.
4. `04-established-village.jpg` — fullført landsby med vedlikeholdsbesøk, bæring, ildsteder og brukt mark.
5. `05-village-area-paths.jpg` — områdeutsnitt av den samlede strukturen og interne forbindelser.
6. `06-exploration.jpg` — nærere utsnitt der en innbygger er på vei fra den levende landsbyen mot området utenfor.

## Kontroll

- `npm test`: **38/38** bestått, inkludert ny deterministisk GAMEPLAY-03-flyt for vedlikehold, Utforskertrang, én utforsker om gangen, retur og milepæl.
- Hodeløs Edge-capture: seks bilder skrevet uten konsollfeil. Den eksisterende GUI-røykprøven besto **33/33** kontroller.
- Visuell gjennomgang: områdebildet leser fortsatt hjem, lager, to ildsteder, mennesker og jordspor som ett samlet sted. Utforskningsbildet holder figuren synlig mot terreng og trær, uten nye effekter eller påtrengende UI.
- Ragnarok-regelen er uendret: en ny syklus oppretter fortsatt samme seedede, rene startverden; utforskningsstatusen lever bare i den pågående syklusen.

## Bevisst avgrensning og begrensninger

- Utforskning avdekker ikke kart, produserer ingen ny ressurs og danner ikke en ny bosetting eller økonomi.
- Bevegelse bruker fortsatt den eksisterende enkle direkte ruten; dette passet legger ikke til pathfinding rundt bygg.
- En utgående sti er med hensikt svak og tar flere turer å lese tydelig. Den er et tegn på mulig videre vekst, ikke en ferdig vei.
