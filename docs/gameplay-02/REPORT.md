# GAMEPLAY-02 — From Camp to Village

Gren: `feature/gameplay-02-camp-to-village` · Baseline: `feature/visual-03-living-settlement`.

## Resultat

Prototypen kan nå utvikles fra første ly til en lesbar, liten landsby uten byggplassering eller arbeidsordrer. Spilleren åpner muligheter i Innsikter; menneskene velger tomt, samler, bygger, leverer og samles selv.

## Nye innsikter og bygg

- **Felles lager** reiser et lavt tømmer- og stråbygg. Når det står ferdig, går menneskelige leveranser dit i stedet for til den opprinnelige ved- og steinhaugen.
- **Ordnet arbeid** gjør sanking og bygging raskere. Den synlige konsekvensen er hyppigere, målrettede reiser mellom skog, lager og aktive byggeplasser.
- **Landsbyildsted** reiser en steinsatt ildplass med sitteplasser. Mennesker foretrekker den når de tar pauser og ber.

Begge nye bygningsformene har egne former, materialer og byggesteg. Tomtesøket gjenbruker den seedede, ringbaserte strategien rundt bosettingen, med klarering mot andre bygg, naturressurser og tjernet.

## Milepæl

**Den første landsbyen** nås når det står fire hjem (inkludert første ly), minst åtte mennesker lever i bosettingen, og både lager og ildsted er ferdige. Meldingen er ikke-blokkerende; kameraet glir rolig til områdevisning og hopper over denne bevegelsen når redusert bevegelse er valgt.

## Bilder

- `01-initial-world.jpg` — startverden.
- `02-inhabited-camp.jpg` — første bebodde leir med bål.
- `03-storage-under-construction.jpg` — felleslager under autonom bygging.
- `04-growing-settlement.jpg` — lager, hjem, mennesker og bruksspor.
- `05-first-village-milestone.jpg` — landsbyens milepælsøyeblikk.
- `06-first-village-area.jpg` — ferdig landsby i bredere utsnitt.

Bildene lages med `GAMEPLAY_02=1 node tools/capture-gui.mjs http://localhost:5173 docs/gameplay-02`.

## Kontroll

- `npm test`: **37/37** bestått, inkludert hele flyten for lager, ordnet arbeid, ildsted, autonom levering og landsbymilepæl.
- Hodeløs Edge-capture ble brukt for de seks reproduserbare scenene. Den tilhørende GUI-røykprøven besto 33/33 uten konsollfeil; målt i den tomme kontrollscenen: 25,83 ms per bilde.
- Visuell gjennomgang: lager og ildsted er lesbare fra hjemmene ved normalt og bredt utsnitt. Mennesker, byggematerialer, jordspor og ild gir en synlig årsak–virkning-kjede.

## Begrensninger

- Det finnes fortsatt ingen lagring; Ragnarok starter som før en ren, identisk seedet verden.
- Menneskene bruker enkel direkte bevegelse og kan fortsatt gå visuelt gjennom bygg. Dette passet utvider ikke pathfinding.
- «Den første landsbyen» signaliserer neste retning, men åpner ikke en byfase eller nye ressurser ennå.
