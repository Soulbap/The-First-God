# OPUS-12C.2 — bosettingsomstrukturering og organisk byvekst

## Status: PARTIAL

OPUS-12C.2 gjør eldre bosettingsgeometri foranderlig. En moden, belastet bosetting kan nå bruke lokale materialer og tilgjengelige hender til å gjenoppføre et ordinært, ikke-vernet hjem på en bedre gateparsell. Det bebodde huset står til erstatningen er ferdig; deretter flyttes hjemreferansene atomisk, den gamle bygningen fjernes og en liten, eksplisitt berging føres tilbake til samme lokale lager.

Systemet gir målbar og synlig forbedring, men sluttbildet har fremdeles større åpne partier enn en fullt sammenhengende moderne by. Den sentrale visuelle porten settes derfor ikke til PASS.

## Rotårsak

OPUS-12C løste gateadgang, men ikke livsløpet til den eksisterende byen:

- Den tidlige ring-/ellipseplasseringen ble permanent geometri. Gater ble avledet etter byggene og arvet dermed spredningen.
- «Gatefront» telte også svak nærhet til en gateende. 100 % gateadgang kunne derfor eksistere uten én sammenhengende fasaderekke.
- Boligbyggingen stoppet når kapasiteten var tilstrekkelig; ledige sentrale tomter konkurrerte ikke med allerede romslig boligkapasitet.
- Konsolidering krevde et sjeldent par lave boligtrinn. I en moden by var de fleste aktuelle hus allerede oppgradert.
- Klaringsregler beholdt bygdeluft mellom boliger, og trær avviste tomter før en legitim byggehandling kunne rydde dem.
- Det fantes ingen regel som kunne flytte en gammel, gyldig, men dårlig utnyttet boligparsell.

Å øke en poengvekt kunne ikke rette dette; den autoritative bygeometrien måtte kunne endres over tid.

## Implementert atferd

### Avledet byvev

`src/sim/urban-fabric.js` avleder aktivt sentrum, kjerne, gater, faktisk frontvendte bygg, sammenhengende frontklynger, isolerte bygg og ledige frontkandidater fra de virkelige byggene og gatenettet. Dataene caches per bosetting og ugyldiggjøres når bygg eller nett endres. Ingen parallell «dekorby» lagres.

Frontkandidater fyller først gyldige mellomrom og kan forlenge en etablert korridor ett bygg om gangen. Kandidatlisten er deterministisk og avgrenset. Samme definisjoner brukes av simuleringen, tester og rapportverktøyet.

### Autonom omstrukturering

`src/sim/renovation.js` vurderer omstrukturering bare når en bosetting er minst By, har reelt boligbelegg, en ordinær eldre bolig, en bedre gyldig gateparsell, nok lokalt lager og arbeidere. Poengsummen belønner kortere avstand til den aktive kjernen og naboer i samme front. Historiske bygg er utelukket.

Prosessen er synlig og tidsbundet:

1. Kostnaden trekkes fra bosettingens eget lager.
2. Vegetasjon ryddes ved den valgte tomten når arbeidet starter.
3. Fundament og stillas tegnes på den nye tomten, mens gammelt hjem fortsatt fungerer.
4. Arbeidstid registreres fra tilgjengelige lokale hender.
5. Ny bolig opprettes først ved ferdigstillelse.
6. Beboernes `homeId` flyttes, gammel bolig fjernes og berging krediteres én gang.

Dette introduserer ingen spillerstyrt plassering, sonering, arbeidsordre, ny teknologi eller ny ressurskjede.

### Geometri og visning

Modne boliger bruker en tettere klaring som samtidig reserverer største senere boligfotavtrykk; dermed kan en oppgradering ikke skape skjult overlapp. Jernbane, gater, vann, stein, offentlige bygg og arbeidsbygg beholder sine eksisterende sikkerhetsgrenser. En ny bolig kan velges gjennom vegetasjon, men trær fjernes først av den faktiske konstruksjonen.

Omstruktureringsplassen dybdesorteres på sin egen posisjon. Dette er nødvendig når gammel og ny tomt ligger langt fra hverandre, og gjør årsak–virkning synlig uten et nytt panel.

## Avgrensning og ærlig vurdering

- Implementert: byvev, korridortomter, tettere moden boliggeometri, autonom flytting/gjenoppføring, kostnad, arbeid, berging, historisk vern, måling og reproduserbare scener.
- Enhetstestet: planvalg, gyldig front, bevaring av mennesker og kapasitet, lokal materialføring, berging, lagre/lese midt i arbeid, determinisme og vern.
- Naturlig observert: omstrukturering i ekte botkjøringer uten injiserte ressurser, bygg, kunnskap eller mennesker; se `RESTRUCTURING_PROGRESSION.md`.
- Visuelt demonstrert: samme naturlige ombygging før/under/etter, bykjerne, boligområde, historisk kjerne, frontklynge, industri, utkant og områdevisning; se `RESTRUCTURING_VISUAL_QA.md`.

Det største gjenværende problemet er at hovedstadens gamle, vide gatenett fortsatt begrenser hvor raskt nye fronter kan vokse sammen. Resultatet leses tydeligere som by enn OPUS-12C-baseline, men ikke konsekvent som en kompakt moderne by uten støtte fra høyhusene. Videre arbeid bør forbedre korridorvalg og faktisk gateutvidelse, ikke legge inn en universell rutenettplan.

## Kvalitetsporter

| # | Port | Resultat | Evidens |
|---:|---|---|---|
| 1 | Rotårsak forklart og adressert | PASS | Eksisterende geometri kan nå endres; måling skiller gateadgang fra faktisk front. |
| 2 | Sammenhengende gatefronter | PARTIAL | Alle åtte frø får klynger, men streng frontdekning er 24,4–36,6 %. |
| 3 | Minst ett lesbart kvartal/frontmiljø | PARTIAL | Scene 06 viser en kompakt frontklynge, men ikke et lukket kvartal. |
| 4 | Tydelig høyere urban tetthet | PARTIAL | Samme-frø-målingen forbedres klart, men åpne felt er fortsatt visuelt dominerende enkelte steder. |
| 5 | Autonom fortetting uten mikrostyring | PASS | Tomt, arbeidere og tidspunkt velges av simuleringen. |
| 6 | Eksisterende struktur kan omformes | PASS | Bebodd bolig gjenoppføres og gammel tomt frigis atomisk. |
| 7 | Naturlig og representativ frekvens | PASS | 35 ferdige prosjekter, minst ett i hvert av 8/8 frø. |
| 8 | Folk og boligplass bevares | PASS | Enhetstest og åttefrøregnskap; samlet kapasitet +1, aldri lavere ved byttet. |
| 9 | Ressurser og arbeid bevares/regnskapsføres | PASS | Lokalt bruttotrekk, registrert arbeid og engangsberging testes. |
| 10 | Historiske bygg bevares | PASS | Vernet utvalg er utelukket og kontrollert i test og scene 04. |
| 11 | Bosettingsidentitet bevares | PASS | Historisk kjerne, industri, bolig og utkant er fortsatt visuelt forskjellige. |
| 12 | Tilgang, innganger og ferdsel fungerer | PASS | Geometri-/rutetestene består; scenene 03, 05–07 er manuelt kontrollert. |
| 13 | Lagring midt i prosjekt | PASS | Rundtur fortsetter samme omstrukturering uten dobbelt trekk/berging. |
| 14 | Determinisme | PASS | Identisk frø og inngang gir identisk plan og resultat. |
| 15 | Ragnarok/regresjon | PASS | Hele testsuiten dekker fortsatt syklusresettene. |
| 16 | Full progresjon | PASS | 8/8 frø når Institutt uten snarveier eller stans. |
| 17 | Ingen alvorlig ytelsesregresjon | PARTIAL | Renderer er rask; moderne simulering er tregere og ny analyse står for 3,5 % av CPU-utvalgene. |
| 18 | Automatiske og visuelle kontroller | PASS | 234/234 tester og GUI-røykprøve 33/33, ingen konsollfeil. |
| 19 | Moderne byform består helhetsinntrykket | PARTIAL | Tydelig forbedret småby, men ennå ikke konsekvent sammenhengende moderne by. |

Samlet status er **PARTIAL**. Funksjons-, data- og progresjonsportene består, mens sammenhengende byform og moderne simuleringsytelse trenger en senere, målrettet iterasjon. Ingen visuell port er satt til PASS på grunnlag av tall alene.
