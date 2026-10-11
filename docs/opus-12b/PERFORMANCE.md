# OPUS-12B — ytelsesmåling

## Status: PASS med oppfølgingspunkt

CPU-profiler ble tatt på frø 20261009 med den ekte spillerboten. Profilfilene ligger i `docs/opus-12b/profiles/`.

| Fase | Simulert tid | Veggtid | Fremdrift | Dominerende arbeid |
|---|---:|---:|---:|---|
| Tidlig | 0,333 t | 1,4 s | 0,245 t/s | `step` 17,7 %, natur 14,0 %, økonomikrav 7,6 %, mennesker 6,6 % |
| Industri | 1,667 t | 25,8 s | 0,065 t/s | mennesker 13,3 %, `step` 10,4 %, flytting 6,8 %, industri 6,4 % |
| Moderne | 3,825 t (til institutt) | 104,3 s | 0,037 t/s | mennesker 11,0 %, industri 10,3 %, `step` 9,2 %, flytting 8,0 % |

Tidligere helkjøring for OPUS-12B (frø 20261009) nådde instituttet etter 3,825 t på 93,6 s, mot dokumentert OPUS-12-baseline 3,94 t på 100,6 s. Dette er ikke en kontrollert lik-arbeidsmengde-benchmark, men det viser ingen åpenbar regresjon.

Tomtekonsolidering vurderes i den eksisterende ombyggingspasseringen under boligpress, ikke ved en separat global skanning hvert simuleringsteg. De målte toppene peker på eksisterende menneske-, flytte- og produksjonsarbeid; ingen ny konsolideringsrelatert topp ble funnet i tidlig- eller industriprofilen.
