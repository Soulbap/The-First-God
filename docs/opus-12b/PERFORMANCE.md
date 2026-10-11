# OPUS-12B — ytelsesmåling

## Status: PARTIAL

| Måling | Veggtid | Simulert tid | Folk | Bygg |
|---|---:|---:|---:|---:|
| OPUS-12-baseline (20261009, dokumentert) | 100,6 s | 3,94 t | 240 | 118 |
| OPUS-12B (20261009) | 93,6 s | 3,825 t | 233 | 119 |

Kommando: `node tools/progression-report.mjs 20261009 21600 --json --until=institute`.

Instituttet nås etter 13 770 s simulert tid. Målingen er ca. 7 % raskere enn dokumentert OPUS-12-baseline, men ikke en kontrollert identisk-arbeidsmengde-benchmark siden byform og folketall også avviker.

Tomtekonsolidering vurderes bare i den eksisterende ombyggingspasseringen og bare under boligpress; den legger ikke inn en ny per-steg global skanning.
