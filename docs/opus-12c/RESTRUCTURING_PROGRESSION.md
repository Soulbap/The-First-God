# OPUS-12C.2 — åttefrøprogresjon

## Status: PASS

Alle referansefrø nådde et ferdig forskningsinstitutt med den ekte spillerboten, kanonisk simulering og uten injiserte ressurser, bygg, teknologi eller mennesker.

Kommando: `node tools/urban-metrics.mjs <frø> 21600 --until=institute`.

Kjøringene ble fordelt på isolerte prosesser. Veggtid er derfor reell tid under parallell belastning og skal ikke brukes som en éntrådet regresjonsbenchmark; den kontrollerte ytelsesrapporten gjør den vurderingen.

| Frø | Institutt | Simulert tid | Veggtid | Folk | Ferdige bygg | Hovedstad bolig | Omstrukturering forsøkt/ferdig | Stans |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 2 | ja | 3,724 t | 494,9 s | 262 | 116 | 166 | 5/5 | ingen |
| 5 | ja | 3,985 t | 595,1 s | 298 | 124 | 166 | 2/2 | ingen |
| 77 | ja | 3,710 t | 509,4 s | 291 | 120 | 166 | 1/1 | ingen |
| 701 | ja | 3,834 t | 552,6 s | 288 | 123 | 166 | 6/6 | ingen |
| 909 | ja | 4,101 t | 575,3 s | 298 | 122 | 166 | 8/8 | ingen |
| 4242 | ja | 3,880 t | 540,2 s | 289 | 122 | 157 | 4/4 | ingen |
| 31337 | ja | 3,892 t | 579,6 s | 302 | 125 | 166 | 6/6 | ingen |
| 20261009 | ja | 3,826 t | 580,7 s | 305 | 125 | 166 | 3/3 | ingen |

Frø 5 utførte sine to prosjekter i en satellitt som naturlig nådde By, ikke i hovedstaden. Dette er ønsket evidens for at regelen bruker bosettingens faktiske trinn, lager og geometri fremfor en hovedstads-spesialregel.

Omstrukturering forekom i 8/8 frø og fullførte 35 ganger før instituttet. Frekvensen er høy nok til å påvirke faktisk byform, men fortsatt etterspørsels-, ressurs- og geometridrevet; antallet er ikke tvunget.
