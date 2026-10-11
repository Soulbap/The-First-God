# OPUS-12B — naturlig progresjon

## Status: PASS (progresjon), PARTIAL (ombyggingsfrekvens)

Ekte spillerbot uten ressursinjeksjon, byggspawning eller tvungne opplåsinger. Kommando: `node tools/opus12b-verification.mjs 2,5,77,701,909,4242,31337,20261009 21600`.

| Frø | Institutt | Simulert tid | Folk | Ferdige bygg | Bosettinger | Konsolidering startet/fullført |
|---:|---|---:|---:|---:|---:|---:|
| 2 | ja | 3,588 t | 207 | 110 | 4 | 0 / 0 |
| 5 | ja | 3,866 t | 219 | 110 | 4 | 0 / 0 |
| 77 | ja | 3,834 t | 201 | 110 | 4 | 1 / 1 |
| 701 | ja | 3,840 t | 221 | 115 | 4 | 0 / 0 |
| 909 | ja | 3,884 t | 212 | 110 | 4 | 0 / 0 |
| 4242 | ja | 3,955 t | 226 | 116 | 4 | 0 / 0 |
| 31337 | ja | 3,811 t | 240 | 118 | 4 | 0 / 0 |
| 20261009 | ja | 3,824 t | 233 | 119 | 4 | 0 / 0 |

Alle åtte frø når instituttet innen 3,588–3,955 timer, innenfor den tidligere OPUS-12-rangen (3,57–4,02 t). Konsolideringsmulighet ble observert i frø 5 (ett sekundsample, uten start) og 77 (902 samples; én start og én fullføring). Avvisningsårsak per forsøk logges ikke av produksjonskoden; observasjonen for frø 5 er derfor bare at betingelsen ikke var stabil fram til ombyggingspasseringen.

Den eksisterende enhetstesten dekker at konsolidering bevarer beboere, ikke senker boligkapasitet og bruker lokale ressurser. Den naturlige fullføringen i frø 77 bekrefter at hendelsen kan oppstå uten snarvei. Én av åtte er likevel for sjelden til å gi representativ visuell effekt i dagens skjermbildesett.
