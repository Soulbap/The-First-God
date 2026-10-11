# OPUS-12B — visuell kvalitetssikring

## Status: PARTIAL

Faktiske Edge-bilder ble tatt 2026-10-11 med `OPUS_12=1 node tools/capture-gui.mjs http://localhost:5173 docs/opus-12b/shots/verification after`. GUI-røykprøven besto 33/33 uten konsollfeil. Renderprøvene ga 4,24 og 3,91 ms per bilde (miljøoppdatering 154–165 ms).

| Krav | Resultat | Evidens |
|---|---|---|
| Tidlig leir og landsby leses | PASS | `01-primitive-settlement-after.jpg`, `03-developed-village-after.jpg` |
| Torget har synlig aktivitet | PASS | `08-market-and-civic-gathering-after.jpg` har en lesbar gruppe ved bodene |
| Industri skiller seg ut | PARTIAL | `10-industrial-district-after.jpg` viser fabrikkformene, men fortsatt med store åpne grøntflater |
| Historiske bygg bevares | PASS | `14-historic-structures-after.jpg` beholder halmhytten blant senere bygg |
| Kveld/natt er lesbar | PASS | `act-a5-evening-after.jpg`, `act-a6-night-after.jpg` har dempet, lesbar belysning |
| Moderne byer leses som tett byvev | FAIL | `06-modern-city-after.jpg` og `09-residential-neighborhood-after.jpg`: høye bygg er spredt mellom trær, gress og bar grunn; ingen tydelige kvartaler/gatevegger |
| Ombygging er visuelt dokumentert | FAIL | `16a-redevelopment-before-after.jpg` og `16b-redevelopment-after-after.jpg` viser forskjellig vekststadium, ikke samme tomt før/etter konsolidering |

Ingen åpenbare spritedefekter, orienteringsfeil eller tekstartefakter ble observert i de inspiserte scenene. Hovedsvikten er byform: resultatet leses fortsatt mer som landskap med enkeltstående blokker enn som en urban helhet.

Alle filer ligger i `docs/opus-12b/shots/verification/`.
