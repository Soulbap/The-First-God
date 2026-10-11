# OPUS-12 — visuell kvalitetssikring

Alle bilder er ekte spill: `OPUS_12=1 node tools/capture-gui.mjs http://localhost:5173 docs/opus-12/shots after` (headless Edge, boten spiller hele forløpet uten snarveier, sjekkpunkter lagres og bildene tas fra dem; døgnfasen følger den ekte klokka). Frø 20261009. Bildene ligger i `docs/opus-12/shots/`. OPUS-11-bildene («før») ligger i `docs/opus-11/screenshots/`. Vurderingen er utviklerens egen; ingen menneskelig spilltest er gjort.

| Scene | Fil | Observasjon |
|---|---|---|
| 1 Leir | `01-primitive-settlement-after` | Halmhytter, to bål, stier slitt av trafikk; ingen gater ennå. OK. |
| 2 Tidlig landsby | `02-early-village-after` | Folk spredt mellom bål, lager og hytter. OK. |
| 3 Utviklet landsby | `03-developed-village-after` | Stier mot brønn, åker og verksted. |
| 4 By med gater | `04-town-with-streets-after` | Allmenning og park (fontene) synlige; tømmer-/steinhus i variasjon. Åpne mellomrom mellom bygg er fortsatt store. |
| 5 Industriby | `05-industrial-town-after` | Gatelykter, jordveier/grusveier, kraftlinjer. |
| 6 Moderne by | `06-modern-city-after` | Brolagt gatenett, blokker med ulik høyde, tak og fasade, park, brønner. Bålplassene brukes av få. |
| 7 Natt | `07-modern-city-night-after` | Vinduer lyser bare der nettet leverer strøm; folk ved hjem og bål. |
| 8 Torg/sivilt | `08-market-and-civic-gathering-after` | **Kritikk:** torget er nesten tomt ved middagstid (én kjøpmann); samlingene ses heller ved bål, hjem og park. |
| 9 Boligstrøk | `09-residential-neighborhood-after` | Tre blokker med tydelig ulike etasjer, tak (loft, pult), fasade (betong, panel). |
| 10 Industri | `10-industrial-district-after` | Metallverk med skorstein og lager. |
| 11a/b | `11a/11b-satellite-economy-*` | To satellitter med ulikt preg (se tabell i økonomidokumentet). |
| 11c | `11c-realm-panel-after` | Rike-panelet viser trinn, identitet, områder, gatedekke og arbeidsplasser per bosetting, og handel/flytting. |
| 12 Regional | `12-regional-trade-infrastructure-after` | Gatenett i hver by; jernbane går nå ut fra stasjon i bykanten, ikke gjennom sentrum. Hovedstaden er «Storby». |
| 13 Fjern bosetting | `13-remote-settlement-local-zoom-after` | Teglbygårder med mansard/saltak, pusset hus, gatelykter, vindmølle, åker, park. Leses som en industriby fra 1800-tallet. |
| 14 Historie | `14-historic-structures-after` | Halmhytte (bevart minnested) ved siden av nyere bygg. |
| 15 Arbeid | `15-people-working-after` | Folk ved sagbruk og lager. |
| 16 Ombygging | `16a/16b-redevelopment-*` | Samme kamera tidlig og sent: halmhytter/stuer → blokker og bygårder. |
| Døgn | `act-a1…a6-*` | Morgen, arbeid, middag, sosialt, kveld, natt: folk i små grupper ved ulike steder; ingen klump. |

## Mot OPUS-11 (`11-mature-settlement-roads-districts`)
OPUS-11 viste ca. 60 personer samlet rundt ett bål og seks nesten like blokker. OPUS-12 viser små grupper fordelt på bål, brønner, park, åker, hjem og torg, og blokker med ulik høyde og fasade.

## Kvalitetsporter
- Sunn avstand mellom bygg: **PARTIAL** (ingen overlapp, men store åpne flater).
- Gater forbinder meningsfulle mål: **PASS** (nett av dører, ikke gjennom bygg; testet).
- Gjenkjennelige boligstrøk/industri: **PARTIAL** (områder avledes og vises i panelet, ikke som synlig tegning).
- Variasjon i moderne bygg: **PASS** (scene 9, 13).
- Historiske bygg bevart: **PASS** (scene 14).
- Folk fordelt naturlig: **PASS** (sceneserien «act»); torget er likevel lite brukt (scene 8).
- Teknologi synes i arkitekturen: **PASS**.
