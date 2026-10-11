# OPUS-12C.2 — visuell QA

## Status: PARTIAL

Alle bildene under er ekte spillrammer fra frø 701. Den nye serien bruker spillerboten og ordinære regler; den injiserer ikke ressurser, teknologi, mennesker eller bygg. GUI-røykprøven var 33/33, uten konsollfeil. Bildene er inspisert enkeltvis, ikke bare generert.

## Bilder

| Krav | Fil | Observasjon |
|---|---|---|
| OPUS-12C moderne baseline | `shots/restructuring/01-opus-12c-baseline-modern-city.jpg` | Høyhus som frittstående objekter i store åpne flater; gaten er ikke en lesbar fasaderekke. |
| OPUS-12C.2 moderne by | `shots/restructuring/02-modern-city-after-final.jpg` | Tydeligere bebygd kjerne og flere grupper på 3–5 boliger; fremdeles åpne brudd mellom gruppene. |
| Boligområde før | `shots/restructuring/03a-residential-district-before.jpg` | Spredte moderne boliger fra OPUS-12C. |
| Boligområde etter | `shots/restructuring/03-residential-district-after-final.jpg` | En strammere boliggruppe ved felles gate/bruksspor; randsonen er fortsatt grønn og åpen. |
| Historisk sentrum | `shots/restructuring/04-historical-center-final.jpg` | Tidlig hjem, hall/ildsteder og senere bygg kan leses samtidig; minnestedet er ikke erstattet. |
| Utviklet gatefront | `shots/restructuring/05-developed-street-frontage-final.jpg` | Flere fasader står med likt tilbakeslag og lesbare innganger langs samme korridor. |
| Kompakt frontklynge | `shots/restructuring/06-coherent-block-final.jpg` | Minst én liten, blandet klynge er lesbar, men den er en åpen frontgruppe, ikke en lukket kvartalsgård. |
| Industridistrikt | `shots/restructuring/07-industrial-district-final.jpg` | Industriens større fotavtrykk og arbeidsrom bevares; boligfortetting trenger seg ikke inn på transportarealet. |
| Utkant | `shots/restructuring/08-settlement-outskirts-final.jpg` | Skarpere overgang fra utviklet mark til skog og produksjonslandskap, uten hard sonegrense. |
| Ombygging før | `shots/restructuring/09-redevelopment-before-final.jpg` | Samme kamera og tidspunkt rett før den første naturlige omstruktureringen. |
| Ombygging aktiv | `shots/restructuring/10-redevelopment-active-final.jpg` | Gammelt hjem står og materialer er trukket; i dette vide utsnittet er fundament/stillas fortsatt for subtilt til å få egen visuell PASS. |
| Ombygging ferdig | `shots/restructuring/11-redevelopment-after-final.jpg` | Samme kamera etter ferdigstillelse; ny bolig står og den gamle parsellen er frigjort. |
| Vid byoversikt | `shots/restructuring/12-wide-city-overview-final.jpg` | Kjerne, historisk område, industri, boligrand og natur er lesbare i samme bilde. |

`00-prepare-final.jpg` er kun kvitteringsrammen fra forberedelsen og brukes ikke som visuelt bevis.

## Akseptkriterier

| Kriterium | Resultat | Evidens |
|---|---|---|
| Gjenkjennelig bebygd sentrum | PASS | 02 og 12 viser konsentrasjon av boliger, samfunnsbygg, lys og aktivitet. |
| Flere sammenhengende gatefronter | PARTIAL | 05 og 06 viser ekte flerbyggsfronter, men ikke gjennom hele kjernen. |
| Minst én lesbar blokk/frontklynge | PASS | 06 viser en liten faktisk klynge; målingene bekrefter medlemmene. |
| Færre isolerte moderne bygg sentralt | PARTIAL | Klyngene er større enn baseline, men flere moderne bygg står fortsatt alene. |
| Mindre meningsløs åpenmark i kjernen | PARTIAL | 02 er tettere enn 01, men vide åpne felt består. |
| Historie integrert | PASS | 04 og 12 viser bevart tidlig struktur blant senere lag. |
| Naturlig overgang til utkant | PASS | 08 og 12. |
| Ingen åpenbare overlapp | PASS | Alle nærbilder kontrollert; boligklaringen reserverer også senere maksimal radius. |
| Fungerende vei og innganger | PASS | 03, 05 og 06 viser frie korridorer og innganger; rute-/geometritestene består. |

## Kritikk

Uten HUD leses scenen nå som en moderne småby med et historisk opphav, industri og boligrand, men ikke konsekvent som en tett by. Det er en reell forbedring fra baseline, særlig i frontklyngene og transformasjonen av eksisterende tomter, men de store arvede mellomrommene er fortsatt visuelt dominerende i enkelte utsnitt.

Den sentrale visuelle kvalitetsporten er derfor **PARTIAL**. Et fremtidig PASS krever at flere av de eksisterende frontene bindes sammen gjennom legitim gateforlengelse og flere naturlige omstruktureringer, uten å ofre parker, industrielt arbeidsrom eller det historiske sentrum.
