# OPUS-12C — urban metrics

Kommando: `node tools/urban-metrics.mjs <frø> <sekunder>`.

Verktøyet måler bare autoritativ spilltilstand: ferdige bygg, boliger, gatenettets lengde, avgrenset bebygd areal, gjennomsnittlig boligavstand, gateadgang, frontklynger og fullførte konsolideringer.

| Frø | Tid | Bosetting | Folk | Bygg | Boliger | Gater | Gatelengde | Gateadgang |
|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 701 | 0,833 t | hovedstad | 24 | 17 | 7 | 21 | 2 506 | 7/7 |
| 701 | 1,389 t | hovedstad | 66 | 42 | 18 | 52 | 6 535 | 18/18 |

Tolkning: gateadgang betyr at inngangen/fronten ligger ved eller innenfor lesbar avstand fra en faktisk gate; eldre bygg med dør på gaten telles med. Tallene er støtte for visuell vurdering, ikke en erstatning for den.
