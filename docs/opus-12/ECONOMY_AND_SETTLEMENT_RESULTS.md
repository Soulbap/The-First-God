# OPUS-12 — økonomi og bosettinger: flerfrøresultater

Ekte simulering og spillerbot (ingen snarveier), kanonisk steg 1/60 s, stopp ved forskningsinstituttet (`node tools/progression-report.mjs <frø> 21600 --json --until=institute`). Rådata: `final-progression.json`; OPUS-11-baseline (3 frø): `baseline-progression.json`.

## Fremdrift

| Frø | institutt (OPUS-12) | institutt (OPUS-11) | folk | bygg | veggtid | flyttinger | tog / lastebil / bærere (varer) |
|---|---:|---:|---:|---:|---:|---:|---|
| 2 | 3.66 t | – | 207 | 110 | 118.8 s | 10 | 81 / 63 / 884 |
| 5 | 3.57 t | – | 209 | 112 | 127.2 s | 23 | 100 / 7 / 1052 |
| 77 | 3.67 t | – | 209 | 112 | 134.8 s | 29 | 138 / 166 / 903 |
| 701 | 3.68 t | 3.72 t | 216 | 115 | 132.7 s | 23 | 9 / 110 / 1000 |
| 909 | 4.02 t | – | 212 | 111 | 131.2 s | 44 | 70 / 180 / 1082 |
| 4242 | 3.95 t | 4.16 t | 226 | 116 | 134.5 s | 42 | 50 / 72 / 972 |
| 31337 | 3.73 t | – | 226 | 114 | 127.6 s | 39 | 49 / 114 / 1017 |
| 20261009 | 3.94 t | 3.88 t | 240 | 118 | 138.1 s | 46 | 78 / 130 / 1197 |

Alle åtte frø når instituttet (3,57–4,02 t); OPUS-11-baseline for 701/4242/20261009 var 3,72/4,16/3,88 t.

## Bosettingsutfall (ved slutt)

| Frø | Bosetting | Trinn | Identitet | Folk/bolig |
|---|---|---|---|---|
| 2 | first | Storby | Hovedstad · Industriby | 94/94 |
| 2 | second | Tidlig by | Gruveby | 44/44 |
| 2 | third | Tidlig by | Steinbrudd | 32/32 |
| 2 | fourth | Tidlig by | Skogsby | 37/37 |
| 5 | first | Storby | Hovedstad · Industriby | 94/94 |
| 5 | second | Tidlig by | Gruveby | 44/44 |
| 5 | third | By | Skogsby | 44/44 |
| 5 | fourth | Tidlig by | Skogsby | 27/27 |
| 77 | first | Storby | Hovedstad · Industriby | 91/94 |
| 77 | second | Tidlig by | Gruveby | 44/44 |
| 77 | third | Tidlig by | Gruveby | 37/37 |
| 77 | fourth | Tidlig by | Steinbrudd | 37/37 |
| 701 | first | Storby | Hovedstad · Industriby | 94/94 |
| 701 | second | Tidlig by | Skogsby | 44/44 |
| 701 | third | Tidlig by | Skogsby | 27/27 |
| 701 | fourth | By | Steinbrudd | 51/51 |
| 909 | first | Storby | Hovedstad · Industriby | 94/94 |
| 909 | second | Tidlig by | Gruveby | 44/44 |
| 909 | third | Tidlig by | Gruveby | 37/37 |
| 909 | fourth | Tidlig by | Skogsby | 37/37 |
| 4242 | first | Storby | Hovedstad · Industriby | 94/94 |
| 4242 | second | Tidlig by | Gruveby | 44/44 |
| 4242 | third | By | Steinbrudd | 44/44 |
| 4242 | fourth | Tidlig by | Skogsby | 44/44 |
| 31337 | first | Storby | Hovedstad · Industriby | 94/94 |
| 31337 | second | Tidlig by | Skogsby | 44/44 |
| 31337 | third | By | Skogsby | 44/44 |
| 31337 | fourth | Tidlig by | Gruveby | 44/44 |
| 20261009 | first | Storby | Hovedstad · Industriby | 94/94 |
| 20261009 | second | Tidlig by | Gruveby | 44/44 |
| 20261009 | third | By | Skogsby | 58/58 |
| 20261009 | fourth | Tidlig by | Gruveby | 44/44 |

Satellittene ender mellom 27 og 58 innbyggere, noen som «By» og andre som «Tidlig by», med ulik identitet (Gruveby, Skogsby, Steinbrudd). OPUS-11: alle tre satellitter «Tidlig by» med 25–35 folk. Hovedstaden er alltid «Storby» med 91–94 folk (boligkapasiteten); dette er fortsatt likt på tvers av frø.

## Handel

Bestillinger, ikke automatikk: toget går bare på en leveranse i kø. Fraktet mengde per transportmåte ligger i tabellen over; ruter og varer per frø i `final-progression.json` (`trade.flows`). Regnskapet bevares (tester i `tests/opus12-economy.test.js`).

## Ytelse (ett frø, 20261009, sekvensielt, samme maskin)

| | veggtid | spilltid | folk | bygg |
|---|---:|---:|---:|---:|
| OPUS-11 | 56,2 s | 3,88 t | 199 | 84 |
| OPUS-12 (før omveisfiks) | 166,9 s | 3,88 t | 244 | 121 |
| OPUS-12 (sluttkode) | 100,6 s | 3,94 t | 240 | 118 |

Simuleringen er ca. 1,8× tregere per spilltid, med ca. 20 % flere folk og 40 % flere bygg. Hotspot funnet med `--cpu-prof`: omveisjekken (`detourAround`) tok 42 % sammen med `moveTo`; den kjøres nå én gang per mål (90 s → 54 s for 2,5 t spilltid). Resten er jevnt fordelt (`stepHuman` 12 %, `stepIndustry` 9 %, `moveTo` 7,5 %). Ikke et mål: OPUS-11-tallene er med samme verktøy, men ikke med samme folketall.
