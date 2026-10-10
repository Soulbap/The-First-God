# OPUS-07 — Den industrielle revolusjonen

## Status

**PARTIAL — spillbar, integrert vertikal skive.** Kull, damp, fabrikk og en regional jernbane følger den eksisterende autoritative økonomien, men den nåværende verdensmodellen har fortsatt ett delt varelager i hjemregionen. Regional spesialisering er derfor representert av reelle korridorer og transitlast, ikke fullstendige lager per fjernregion.

## Implementert

- Kull er en deterministisk, begrenset mineralåre per seed. Den oppdages med øvrige geologiske forekomster og kan ikke utvinnes før en autonom kullgruve står ferdig.
- **Dampkraft** er en kunnskapsevne etter mekanisk kraft; den skaper ikke gratis bygg. Gruve, motor og fabrikker oppstår bare når materialer, brensel, plass og mennesker finnes.
- Dampmaskinen bruker kull mens den går, har begrenset lokal effekt og stopper ved kull- eller vannmangel. Slitasje repareres med tre og maskindeler eller reduserer påliteligheten.
- Metallverk lager industrimaskiner av jern og kull; maskinverksted lager jernbanedeler av industrimaskiner og jern. Begge krever dampkraft og folk.
- Jernbane bygges autonomt mellom to gyldige, tørre bosettinger innen en fast maksimal avstand. Den bruker tre, planker, jern og jernbanedeler. Ett lokomotiv har én aktiv kullast om gangen; lasten trekkes ved avreise, ligger i transit og legges tilbake først ved ankomst.
- Nærbildet viser kull som mørk åre, industribygg med skorstein og en diskret skinnekorridor/lokomotiv kun mens en last faktisk er i bevegelse.

## Persistens og Ragnarok

Formatet er v7. v2–v6 fylles med industrielle standardfelt fra samme seed. Kullforekomst, maskiner, spor og transitlast serialiseres med syklusen. Ragnarok bruker ny seedet syklustilstand og fjerner dermed all industri; permanent arv er urørt.

## Kontroller

- `node --test tests/opus07.test.js tests/opus06.test.js tests/materials.test.js`: 12/12 bestått.
- OPUS-07-testene dekker determinisme, uttak/depletion, kullforbruk/stans, reparasjon, fabrikkens bevaring av innsatsvarer, jernbane-trafikk/transit og v6-migrering.

## Kvalitetsporter

| Port | Status | Notat |
|---|---|---|
| Kull og damp bruker reelle varer | PASS | Uttak, forbruk og stans er testet. |
| Lokal dampkraft og fabrikkproduksjon | PASS | Ingen kraft eller råvare gir ingen produksjon. |
| Jernbanelast uten teleportering | PASS | Last finnes i transit før ankomst. |
| Lagre/lese og Ragnarok | PASS | v6-migrering og syklusrenhet er dekket. |
| Full regional spesialisering | PARTIAL | Eksisterende økonomi har delt hjemmelager. |
| Flerfrø-gjennomspilling og skjermbildepakke | PARTIAL | Må tas i den planlagte visuelle/balanse-runden. |

## Kjent begrensning

Den tidligere planetregresjonen «Vestkysten er kyst uten hav» er ikke endret eller markert som løst her.
