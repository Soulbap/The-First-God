# OPUS-11 — Fremdriftsresultater

Alle tall er målt med den ekte, autoritative simuleringen (`src/sim/game.js`) og den ekte spillerboten (`tools/bot.js`): ingen ressursgaver, ingen snarveier, ingen milepælsflagg. Kommandoen er

```bash
node tools/progression-report.mjs 701,4242,20261009,5,77,909,31337,2 21600
```

Hver frø kjøres i egen prosess (åtte parallelle prosesser på én maskin, så veggtiden er litt høyere enn for ett frø alene). «t» er timer spilltid. Rapporten er deterministisk: samme frø gir samme tall (testet i `tests/opus11-economy.test.js`).

## Før og etter (OPUS-08/09/10-grunnlaget mot OPUS-11)

Grunnlaget (`62b738c`, uncommittet OPUS-08..10-arbeid fra før) er målt i en egen `git worktree` med samme `tools/fastforward.mjs`:

| Frø | Før: 4 t spilltid | Før: nådde | Etter: 4 t spilltid | Etter: nådde |
|---|---:|---|---:|---|
| 701 | 36 s | industri, damp, metallverk, oljebrønn, raffineri | 62 s | hele kjeden (institutt ved 3,72 t) |
| 4242 | 36 s | industri, damp, metallverk | 59 s | alt til telegraf (institutt ved 4,16 t, like etter 4 timer) |
| 20261009 | **270 s** | bare industri | 61 s | hele kjeden (institutt ved 3,88 t) |

Det er altså mer simulert innhold til lavere veggtid, og kjeden er nå **faktisk gjennomførbar**: før stoppet alle frø midt i kjeden (malmårene tomme, kull og olje bortkastet, tomtesøk som gjentok seg).

## Hvorfor kjeden stoppet, og hva som ble gjort

Diagnosene er funnet ved å kjøre kjeden og lese inaktivitetsgrunnene (`metalworks:råvare`, `refinery:råvare`, …) og ved å spore forbruket av hver vare (en `Proxy` på lageret som loggførte hvem som trakk varen).

| Funn (målt) | Rotårsak | Endring |
|---|---|---|
| 4 timer på frø 20261009 tok 259–270 s | `localSite`/`findBuildSite` skannet hele ringen i hvert steg når det ikke fantes tomt | Mislykkede søk huskes (`state.siteMisses`, lagres), utvides og gjentas aldri i hvert steg |
| Malm tom, lagre med tre og stein på 50 000+ | Hvert mineral hadde én åre på ca. 100; summen av malm og kull under 40 styrte utvinningen (fullt tinnlager stoppet jernhenting); smelteren lagde alltid kobber først | Flere årer per mineral, lagermål per vare, relativ mangel styrer utvinning og smelting |
| Olje tom etter 30–44 enheter | Ett lite felt; forbrenningsmotoren brant fullt hele tiden; lastebiler kjørte planker uten mål | To felt (260–360 og et mindre), motoren på tomgang når dampen rekker, lastebiler bare med oppdrag |
| Flyplass bygde aldri | `stepUrban` trakk planker, tre og stein for «prosjekter» uten tomt (115 for 16 bygg) | Kostnad betales bare når byggingen starter |
| Luftmåling aldri mulig | Skip hadde kartlagt alle land først | Fly måler hvert land én gang (`region.aerial`) |
| Kobber tom før instituttet (frø 909) | Vedlikehold av møller og damp brukte bronse/jern (175 deler på seks timer) | To deler per metall |
| Tre og stein hopet seg opp, skog hogd ned | Folk sanket uten tak | Lagertak med økende grunnivå per innbygger |

## Resultater: åtte frø, seks timer spilltid

Kjøring: 21600 s spilltid per frø, ekte bot, kanonisk steg 1/60 s.

| Frø | veggtid | spilltid/veggsek | folk | bosettinger | bygg | ombygde hjem | utposter | karavaner (hav) |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| 2 | 142.6 s | 151 s | 189 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:25, fourth:Tidlig by:35 | 83 | 64 | 6 | 197 (0) |
| 5 | 147 s | 147 s | 199 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:35 | 84 | 69 | 6 | 189 (160) |
| 77 | 144.7 s | 149 s | 199 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:35 | 83 | 69 | 6 | 192 (0) |
| 701 | 142.5 s | 152 s | 189 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:25, fourth:Tidlig by:35 | 82 | 64 | 6 | 231 (197) |
| 909 | 151.2 s | 143 s | 199 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:35 | 84 | 69 | 6 | 97 (0) |
| 4242 | 148.3 s | 146 s | 199 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:35 | 84 | 69 | 6 | 279 (0) |
| 31337 | 138.2 s | 156 s | 199 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:35 | 84 | 69 | 6 | 273 (261) |
| 20261009 | 141.6 s | 153 s | 199 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:35 | 84 | 69 | 6 | 164 (162) |

**Milepæler (første gang):**

| Milepæl | 2 | 5 | 77 | 701 | 909 | 4242 | 31337 | 20261009 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| industry | 1.07 t | 1.09 t | 1.05 t | 1.17 t | 1.25 t | 1.19 t | 1.16 t | 1.16 t |
| steam | 1.16 t | 1.13 t | 1.09 t | 1.21 t | 1.30 t | 1.27 t | 1.20 t | 1.21 t |
| metalworks | 1.23 t | 1.15 t | 1.17 t | 1.24 t | 1.36 t | 1.34 t | 1.27 t | 1.23 t |
| oilWell | 1.32 t | 1.28 t | 1.28 t | 1.35 t | 1.38 t | 1.43 t | 1.38 t | 1.34 t |
| refinery | 1.52 t | 1.41 t | 1.38 t | 1.57 t | 1.62 t | 1.63 t | 1.57 t | 1.52 t |
| combustion | 1.82 t | 1.57 t | 1.59 t | 1.88 t | 1.95 t | 1.93 t | 1.89 t | 1.79 t |
| generator | 3.03 t | 1.44 t | 1.19 t | 1.58 t | 1.68 t | 3.23 t | 3.18 t | 1.45 t |
| electricity | 3.12 t | 2.11 t | 1.23 t | 2.84 t | 2.33 t | 3.31 t | 3.28 t | 1.47 t |
| precision | 2.18 t | 2.24 t | 2.33 t | 2.11 t | 2.48 t | 2.38 t | 2.34 t | 2.25 t |
| aircraft | 2.63 t | 2.70 t | 2.77 t | 2.56 t | 2.93 t | 2.83 t | 2.79 t | 2.75 t |
| airfield | 2.77 t | 2.84 t | 2.91 t | 2.67 t | 3.08 t | 2.96 t | 2.92 t | 2.89 t |
| survey | 2.79 t | 2.86 t | 2.92 t | 2.69 t | 3.10 t | 2.98 t | 2.93 t | 2.91 t |
| electronics | 3.44 t | 3.28 t | 3.35 t | 3.19 t | 3.52 t | 3.62 t | 3.60 t | 3.33 t |
| telegraph | 3.74 t | 3.59 t | 3.65 t | 3.49 t | 3.82 t | 3.91 t | 3.91 t | 3.64 t |
| institute | 3.98 t | 3.83 t | 3.90 t | 3.72 t | 4.05 t | 4.16 t | 4.15 t | 3.88 t |

**Tilstand ved slutt:**

- **2**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":10,"t3":5}; lagre {"wood":3074,"stone":3184,"coal":67,"iron":40,"copper":21,"ironOre":46,"copperOre":48,"crudeOil":0,"fuel":289,"planks":149,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/298 (3 årer)","tinOre":"81/176 (2 årer)","ironOre":"0/754 (5 årer)","coal":"1419/2059 (3 årer)","oil":"0/530 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2553; lastebilturer 35, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 698, hoppet over 6705.
- **5**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":15}; lagre {"wood":3277,"stone":3189,"coal":91,"iron":40,"copper":21,"ironOre":40,"copperOre":28,"crudeOil":1,"fuel":212,"planks":151,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/343 (3 årer)","tinOre":"230/290 (2 årer)","ironOre":"0/816 (5 årer)","coal":"1525/2195 (3 årer)","oil":"0/507 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2742; lastebilturer 48, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 2129, hoppet over 11081.
- **77**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":15}; lagre {"wood":3419,"stone":3331,"coal":97,"iron":40,"copper":21,"ironOre":57,"copperOre":29,"crudeOil":1,"fuel":231,"planks":151,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/370 (3 årer)","tinOre":"160/240 (2 årer)","ironOre":"0/749 (5 årer)","coal":"1273/1948 (3 årer)","oil":"0/536 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2649; lastebilturer 105, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 1147, hoppet over 26639.
- **701**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":10,"t3":5}; lagre {"wood":3324,"stone":3025,"coal":64,"iron":40,"copper":21,"ironOre":40,"copperOre":27,"crudeOil":0,"fuel":254,"planks":151,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/343 (3 årer)","tinOre":"101/166 (2 årer)","ironOre":"0/676 (5 årer)","coal":"2108/2743 (3 årer)","oil":"0/428 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2884; lastebilturer 35, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 6077, hoppet over 2018029.
- **909**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":15}; lagre {"wood":3252,"stone":3415,"coal":98,"iron":40,"copper":21,"ironOre":48,"copperOre":41,"crudeOil":1,"fuel":95,"planks":150,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/346 (3 årer)","tinOre":"161/251 (2 årer)","ironOre":"11/766 (5 årer)","coal":"1632/2262 (3 årer)","oil":"0/479 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2461; lastebilturer 70, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 685, hoppet over 9467.
- **4242**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":15}; lagre {"wood":3402,"stone":3211,"coal":68,"iron":40,"copper":21,"ironOre":44,"copperOre":35,"crudeOil":1,"fuel":312,"planks":151,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/260 (3 årer)","tinOre":"211/271 (2 årer)","ironOre":"29/811 (5 årer)","coal":"1634/2264 (3 årer)","oil":"0/470 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2328; lastebilturer 70, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 1124, hoppet over 25643.
- **31337**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":15}; lagre {"wood":3462,"stone":3323,"coal":77,"iron":40,"copper":21,"ironOre":56,"copperOre":27,"crudeOil":1,"fuel":330,"planks":151,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/420 (3 årer)","tinOre":"151/251 (2 årer)","ironOre":"13/919 (5 årer)","coal":"2063/2695 (3 årer)","oil":"0/492 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2335; lastebilturer 70, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 2059, hoppet over 8578.
- **20261009**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":15}; lagre {"wood":3469,"stone":3299,"coal":68,"iron":40,"copper":21,"ironOre":43,"copperOre":28,"crudeOil":1,"fuel":108,"planks":150,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/284 (3 årer)","tinOre":"176/236 (2 årer)","ironOre":"0/827 (5 årer)","coal":"1793/2433 (3 årer)","oil":"0/491 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2679; lastebilturer 62, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 103, hoppet over 3735.


## Lesing av resultatene

- **Alle åtte frø når forskningsinstituttet** (3,72–4,16 t), uten snarveier. Tidspunktene varierer med geografi og ressursstrøm: for eksempel kommer strøm ved 1,23 t (frø 77) mot 3,31 t (frø 4242), fordi generatoren avhenger av jern, kobber og dampkraft i riktig rekkefølge.
- **Flaskehalser som fortsatt finnes:** kobber er knapt (alle hjemmeårer er tomme ved slutten, utpostene dekker resten) og jern likeså; kull og tinn er det mest av. Forbruket måles, ikke forstørres: ingen forekomst er uendelig.
- **Utposter** (5–6 per frø) utvinner fra egne forekomster til egne lagre; karavaner (97–279 per kjøring) bærer det hjemmelageret mangler. Sjøfrakt brukes der kysten tillater det (0 for frø uten vannforbindelse).
- **Lastebiler** kjører bare når en satellitt mangler varer til et prosjekt og forbindelsen er innen rekkevidde: 35–105 turer per kjøring i alle åtte frø.
- **Folketallet** (189–199) følger boligplassen. Bosettingenes tall varierer mellom frø, men hovedstaden ender alltid som «Storby» med 94 og satellittene som «Tidlig by». Satellittene når ikke «By».
- **Rapporten viser ikke** menneskelig spilltest; boten spiller den samme rekkefølgen av kjøp hver gang, så tidene er et mål på kjedens gjennomførbarhet, ikke på spillfølelse.

## Gjenskaping

```bash
node tools/progression-report.mjs 701 21600 --json   # rådata for ett frø
node tools/fastforward.mjs 701,4242,20261009 14400   # milepælstider og veggtid (som i «før»-tabellen)
node tools/profile-sites.mjs 20261009 7200           # tomtesøk-ytelse
```
