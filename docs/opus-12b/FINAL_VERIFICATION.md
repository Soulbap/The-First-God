# OPUS-12B — sluttverifikasjon

Dato: 2026-10-11  
Gren: `feature/opus-12b-urban-structure-performance`

## Kvalitetsporter

| Port | Resultat | Grunnlag |
|---|---|---|
| Full testpakke | PASS | `npm test`: 231/231 bestått |
| GUI-røykprøve | PASS | 33/33, ingen konsollfeil |
| Åtte frø når instituttet | PASS | 8/8; 3,588–3,955 t |
| Ressurs-/befolkningsbevaring ved konsolidering | PASS (test), PARTIAL (løpsbevis) | Enhetstest dekker bevaring; én naturlig fullføring observert |
| Konsolidering skjer naturlig | PASS | Frø 77: 1 start, 1 fullføring |
| Konsolidering er representativt synlig | FAIL | 1/8 frø og ingen samme-tomt før/etter-bilde |
| Moderne byform og tetthet | FAIL | Høye bygg står fortsatt spredt i landskap; ingen lesbar kvartalsstruktur |
| Torgets sosialitet | PASS | Synlig gruppe ved markedet |
| Industriell lesbarhet | PARTIAL | Egen industriell silhuett, men fortsatt mye åpent terreng |
| Historisk bevaring og døgnlys | PASS | Halmhytte bevart; kveld/natt lesbar |
| Ytelse | PASS med oppfølgingspunkt | Ingen klar regresjon; moderne CPU-profil peker på mennesker/industri, ikke konsolidering |

## Anbefaling: B — ikke merge til `main` ennå

Den tekniske endringen er testbar, konservativ og når hele progresjonskjeden på alle kontrollfrø. Den oppfyller imidlertid ikke hovedambisjonen for OPUS-12B: moderne bosettinger leses ikke som kompakte byer, og den nye tomtekonsolideringen er for sjelden til å være en synlig drivkraft. Før merge bør en ny, avgrenset iterasjon prioritere faktisk kvartals-/gatefronttetthet, og gi konsolidering en målt, forsvarlig frekvens eller en deterministisk visuell testscene. Dette er en vurdering, ikke en endring av spillregler i denne verifikasjonen.

Se `VISUAL_QA.md`, `PROGRESSION_RESULTS.md` og `PERFORMANCE.md` for rågrunnlag og begrensninger.
