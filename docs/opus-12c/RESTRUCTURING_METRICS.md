# OPUS-12C.2 — byform- og omstruktureringsmålinger

## Metode

Kommandoer:

```text
node tools/urban-metrics.mjs 701 5000 --compact
node tools/urban-metrics.mjs 2,5,77,701,909,4242,31337,20261009 21600 --until=institute --compact
```

Baseline er commit `8b03392` kjørt i et rent arkiv med nøyaktig den samme endelige målemodulen som OPUS-12C.2. Dermed er ikke den tidligere, for vide «gateadgang»-definisjonen brukt som gevinst. Faktiske gatefronter krever passende avstand til gaten; klynger krever minst to frontbygg med nærhet og forenlig retning.

## Samme frø og samme tid: 701 ved 5 000 sekunder

| Mål, hovedstad | OPUS-12C baseline | OPUS-12C.2 | Endring |
|---|---:|---:|---:|
| Folk | 66 | 58 | −8 |
| Ferdige bygg uten åker | 42 | 43 | +1 |
| Boliger / boligplass | 18 / 86 | 19 / 91 | +1 / +5 |
| Utviklet tetthet | 0,29 | 0,38 | +31 % |
| Bygg i kjerne | 13 | 20 | +7 |
| Kjernetetthet | 0,34 | 0,51 | +50 % |
| Boligtetthet i kjerne | 0,13 | 0,36 | +177 % |
| Faktiske frontbygg | 1/33 (3,0 %) | 11/34 (32,4 %) | +10 bygg |
| Sammenhengende frontlengde | 0 | 245 | +245 |
| Frontklynger / størrelser | 0 / – | 2 / 2, 3 | +2 |
| Gjennomsnittlig nærmeste bolignabo | 132,2 | 105,0 | −20,6 % |
| Bevarte / gatetilgjengelige landemerker | 2 / 2 | 2 / 2 | uendret |
| Omstrukturering, forsøkt / ferdig | 0 / 0 | 4 / 3 | +3 ferdige |

Folketallet ved akkurat 5 000 sekunder er lavere, ikke skjult: lokale materialer og arbeid brukes på omstrukturering, og de to kjøringene har ulik bosettingsfordeling på dette tidspunktet. Boligplassen i hovedstaden er likevel større, ingen mennesker slettes, og alle åtte lange løp når instituttet.

## Modne hovedsteder ved instituttet

| Frø | Front | Frontlengde | Klynger (størrelser) | Kjerne-/boligtetthet | Naboavstand | Isolerte frontbygg | Omstr. totalt |
|---:|---:|---:|---|---:|---:|---:|---:|
| 2 | 11/41 (26,8 %) | 363 | 4 (2,2,2,2) | 0,68 / 0,39 | 93,6 | 0 | 5 |
| 5 | 12/41 (29,3 %) | 167 | 2 (2,2) | 0,68 / 0,43 | 102,6 | 4 | 2 |
| 77 | 14/41 (34,1 %) | 415 | 2 (5,4) | 0,57 / 0,39 | 96,1 | 5 | 1 |
| 701 | 14/41 (34,1 %) | 354 | 3 (2,4,2) | 0,48 / 0,32 | 113,3 | 4 | 6 |
| 909 | 15/41 (36,6 %) | 402 | 2 (3,4) | 0,61 / 0,27 | 98,2 | 5 | 8 |
| 4242 | 10/40 (25,0 %) | 182 | 2 (2,2) | 0,58 / 0,30 | 103,5 | 3 | 4 |
| 31337 | 13/41 (31,7 %) | 315 | 2 (3,3) | 0,64 / 0,39 | 107,1 | 5 | 6 |
| 20261009 | 10/41 (24,4 %) | 334 | 3 (3,2,2) | 0,61 / 0,41 | 86,3 | 1 | 3 |

Frontdekning er bevisst strengere enn gammel gateadgang. 38–40 av 40–41 urbane bygg har funksjonell gateadgang i hovedstedene, men bare 24,4–35,0 % har faktisk front. Dette gjør det vanskeligere å «vinne» målingen uten at geometrien endres.

## Omstrukturering

De åtte naturlige løpene fullførte 35 prosjekter (1–8 per frø, gjennomsnitt 4,4). Samlet brutto forbruk var 1 188 trevirke, 1 205 stein, 336 planker, 324 tilhugget stein, 3 jern og 3 kobber; registrert arbeid var 6 720 håndsekunder. Den faste bergingen på 4 trevirke + 4 stein per ferdigstillelse krediteres lokalt etter dette bruttoregnskapet.

Boligkapasiteten ble bevart i alle prosjekter og økte samlet med 1. Omstruktureringens primære gevinst er tomtebruk og front, ikke gratis boligproduksjon. Summert reduksjon i avstand til aktivt sentrum var 1 242,8 verdensenheter; enkelte prosjekter fikk 0 på dette målet fordi gevinsten var en bedre naboklynge, ikke kortere sentrumsavstand.

`rejected` teller avviste planvurderinger, ikke unike tomter. De dominerende årsakene var geometri og manglende effektivitetsgevinst. De høye tallene viser at planleggeren ofte utsetter arbeid framfor å rive et bebodd hus uten en klart bedre og gyldig erstatning.

## Tolkning

Målingene dokumenterer en stor forbedring fra baseline ved samme tid: flere reelle fronter, kortere nabodistanse og høyere kjerne-/boligtetthet. De dokumenterer også begrensningen: bare rundt en fjerdedel til en tredjedel av urbane bygg danner streng front ved instituttet, og noen frø har flere isolerte frontbygg. Derfor støtter tallene **PARTIAL**, ikke visuell fullgodkjenning.
