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
| 701 | 36 s | industri, damp, metallverk, oljebrønn, raffineri | 57 s | alt til telegraf (institutt ved 4,00 t) |
| 4242 | 36 s | industri, damp, metallverk | 57 s | hele kjeden (institutt ved 3,77 t) |
| 20261009 | **270 s** | bare industri | 59 s | alt til telegraf (institutt ved 4,00 t) |

Det er altså mer simulert innhold til lavere veggtid, og kjeden er nå **faktisk gjennomførbar**: før stoppet alle frø midt i kjeden (malmårene tomme, kull og olje bortkastet, tomtesøk som gjentok seg).

## Hvorfor kjeden stoppet, og hva som ble gjort

Diagnosene er funnet ved å kjøre kjeden og lese inaktivitetsgrunnene (`metalworks:råvare`, `refinery:råvare`, …) og ved å spore forbruket av hver vare (en `Proxy` på lageret som loggget hvem som trakk varen).

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
| 2 | 137.1 s | 158 s | 164 | first:Storby:94, second:Tidlig by:10, third:Tidlig by:25, fourth:Tidlig by:35 | 83 | 51 | 6 | 195 (0) |
| 5 | 135.1 s | 160 s | 189 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:25 | 84 | 64 | 6 | 205 (183) |
| 77 | 142.6 s | 151 s | 199 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:35 | 84 | 69 | 6 | 195 (0) |
| 701 | 140.5 s | 154 s | 189 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:25 | 84 | 64 | 6 | 247 (207) |
| 909 | 142.7 s | 151 s | 189 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:25 | 84 | 64 | 6 | 98 (0) |
| 4242 | 142.6 s | 151 s | 179 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:25, fourth:Tidlig by:25 | 84 | 59 | 6 | 265 (0) |
| 31337 | 145.9 s | 148 s | 189 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:25 | 84 | 64 | 5 | 222 (211) |
| 20261009 | 140.7 s | 154 s | 199 | first:Storby:94, second:Tidlig by:35, third:Tidlig by:35, fourth:Tidlig by:35 | 84 | 69 | 6 | 165 (159) |

**Milepæler (første gang):**

| Milepæl | 2 | 5 | 77 | 701 | 909 | 4242 | 31337 | 20261009 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| industry | 1.15 t | 1.16 t | 1.09 t | 1.22 t | 1.13 t | 1.21 t | 1.20 t | 1.24 t |
| steam | 1.18 t | 1.21 t | 1.14 t | 1.24 t | 1.16 t | 1.27 t | 1.25 t | 1.27 t |
| metalworks | 1.23 t | 1.23 t | 1.18 t | 1.29 t | 1.26 t | 1.30 t | 1.29 t | 1.37 t |
| oilWell | 1.38 t | 1.34 t | 1.27 t | 1.41 t | 1.47 t | 1.45 t | 1.46 t | 1.38 t |
| refinery | 1.48 t | 1.52 t | 1.46 t | 1.63 t | 1.58 t | 1.52 t | 1.56 t | 1.73 t |
| combustion | 1.57 t | 1.62 t | 1.78 t | 1.73 t | 1.85 t | 1.85 t | 1.72 t | 2.29 t |
| generator | 2.93 t | 3.05 t | 1.40 t | 1.51 t | 3.06 t | 1.56 t | 1.60 t | 1.51 t |
| electricity | 3.02 t | 3.15 t | 1.41 t | 2.27 t | 3.15 t | 1.57 t | 2.23 t | 1.53 t |
| precision | 2.10 t | 2.21 t | 2.27 t | 2.41 t | 2.21 t | 2.14 t | 2.38 t | 1.80 t |
| aircraft | 2.54 t | 2.67 t | 2.72 t | 2.88 t | 2.67 t | 2.65 t | 2.86 t | 2.87 t |
| airfield | 2.68 t | 2.80 t | 2.86 t | 3.01 t | 2.79 t | 2.80 t | 3.00 t | 3.01 t |
| survey | 2.70 t | 2.82 t | 2.88 t | 3.02 t | 2.81 t | 2.82 t | 3.02 t | 3.02 t |
| electronics | 3.34 t | 3.46 t | 3.31 t | 3.45 t | 3.47 t | 3.23 t | 3.45 t | 3.45 t |
| telegraph | 3.64 t | 3.77 t | 3.63 t | 3.77 t | 3.78 t | 3.53 t | 3.76 t | 3.76 t |
| institute | 3.88 t | 4.01 t | 3.86 t | 4.00 t | 4.02 t | 3.77 t | 4.00 t | 4.00 t |

**Tilstand ved slutt:**

- **2**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t2":2,"t1":2,"t3":5,"t4":5}; lagre {"wood":3028,"stone":2658,"coal":83,"iron":40,"copper":21,"ironOre":42,"copperOre":35,"crudeOil":0,"fuel":288,"planks":151,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/298 (3 årer)","tinOre":"96/176 (2 årer)","ironOre":"0/754 (5 årer)","coal":"1404/2059 (3 årer)","oil":"0/530 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2685; lastebilturer 35, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 655, hoppet over 2414.
- **5**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":10,"t3":5}; lagre {"wood":3124,"stone":2937,"coal":85,"iron":40,"copper":21,"ironOre":42,"copperOre":34,"crudeOil":1,"fuel":216,"planks":151,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/343 (3 årer)","tinOre":"225/290 (2 årer)","ironOre":"0/816 (5 årer)","coal":"1555/2195 (3 årer)","oil":"0/507 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2516; lastebilturer 44, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 2494, hoppet over 2761.
- **77**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":15}; lagre {"wood":3463,"stone":2992,"coal":63,"iron":40,"copper":21,"ironOre":63,"copperOre":45,"crudeOil":1,"fuel":267,"planks":151,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/370 (3 årer)","tinOre":"160/240 (2 årer)","ironOre":"0/749 (5 årer)","coal":"1308/1948 (3 årer)","oil":"0/536 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2703; lastebilturer 70, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 2501, hoppet over 4009.
- **701**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":10,"t3":5}; lagre {"wood":3260,"stone":3121,"coal":77,"iron":40,"copper":21,"ironOre":48,"copperOre":33,"crudeOil":0,"fuel":218,"planks":151,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/343 (3 årer)","tinOre":"76/166 (2 årer)","ironOre":"0/676 (5 årer)","coal":"2128/2743 (3 årer)","oil":"0/428 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2522; lastebilturer 70, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 78, hoppet over 397.
- **909**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":10,"t3":5}; lagre {"wood":2994,"stone":3360,"coal":100,"iron":40,"copper":21,"ironOre":77,"copperOre":49,"crudeOil":1,"fuel":130,"planks":150,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/346 (3 årer)","tinOre":"161/251 (2 årer)","ironOre":"0/766 (5 årer)","coal":"1592/2262 (3 årer)","oil":"0/479 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2503; lastebilturer 35, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 641, hoppet over 1271.
- **4242**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":5,"t3":10}; lagre {"wood":3248,"stone":2793,"coal":64,"iron":40,"copper":21,"ironOre":43,"copperOre":39,"crudeOil":0,"fuel":383,"planks":150,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/260 (3 årer)","tinOre":"211/271 (2 årer)","ironOre":"0/811 (5 årer)","coal":"1634/2264 (3 årer)","oil":"0/470 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2805; lastebilturer 0, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 2494, hoppet over 2835.
- **31337**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":10,"t3":5}; lagre {"wood":3176,"stone":3173,"coal":63,"iron":40,"copper":21,"ironOre":54,"copperOre":24,"crudeOil":0,"fuel":273,"planks":149,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/420 (3 årer)","tinOre":"171/251 (2 årer)","ironOre":"23/919 (5 årer)","coal":"2085/2695 (3 årer)","oil":"0/492 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2523; lastebilturer 44, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 1887, hoppet over 2357.
- **20261009**: boligtrinn {"t0H":1,"t1H":1,"t5":10,"t4":15}; lagre {"wood":3366,"stone":3319,"coal":76,"iron":40,"copper":21,"ironOre":41,"copperOre":29,"crudeOil":1,"fuel":103,"planks":151,"industrialMachinery":8,"electronics":6}; årer igjen {"copperOre":"0/284 (3 årer)","tinOre":"171/236 (2 årer)","ironOre":"0/827 (5 årer)","coal":"1803/2433 (3 årer)","oil":"0/491 (2 årer)"}; lyse bosettinger ["first"]; flyvninger 14, luftmålinger 14, elektronikk 22, forskningskunnskap 2522; lastebilturer 70, jernbaner 1; flaskehals: ingen (hele kjeden nådd); tomtesøk 75, hoppet over 0.


## Lesing av resultatene

- **Alle åtte frø når forskningsinstituttet** (3,77–4,02 t), uten snarveier. Tidspunktene varierer med geografi og ressursstrøm: for eksempel kommer strøm ved 1,41 t (frø 77) mot 3,15 t (frø 5), fordi generatoren avhenger av jern, kobber og dampkraft i riktig rekkefølge.
- **Flaskehalser som fortsatt finnes:** kobber er knapt (alle hjemmeårer er tomme ved slutten, utpostene dekker resten) og jern likeså; kull og tinn er det mest av. Forbruket måles, ikke forstørres: ingen forekomst er uendelig.
- **Utposter** (5–6 per frø) utvinner fra egne forekomster til egne lagre; karavaner (98–265 per kjøring) bærer det hjemmelageret mangler. Sjøfrakt brukes der kysten tillater det (0 for frø uten vannforbindelse).
- **Lastebiler** kjører bare når en satellitt mangler varer til et prosjekt og forbindelsen er innen rekkevidde: 35–70 turer, men 0 i frø 4242 (ingen landforbindelse innen rekkevidde).
- **Folketallet** (164–199) følger boligplassen. Bosettingenes tall varierer mellom frø, men hovedstaden ender alltid som «Storby» med 94 og satellittene som «Tidlig by». De satellittene når ikke «By».
- **Rapporten viser ikke** menneskelig spilltest; boten spiller den samme rekkefølgen av kjøp hver gang, så tidene er et mål på kjedens gjennomførbarhet, ikke på spillfølelse.

## Gjenskaping

```bash
node tools/progression-report.mjs 701 21600 --json   # rådata for ett frø
node tools/fastforward.mjs 701,4242,20261009 14400   # milepælstider og veggtid (som i «før»-tabellen)
node tools/profile-sites.mjs 20261009 7200           # tomtesøk-ytelse
```
