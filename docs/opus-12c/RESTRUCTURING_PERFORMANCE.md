# OPUS-12C.2 — ytelse for byvev og omstrukturering

## Status: PARTIAL

Tre CPU-profiler er tatt fra ekte, deterministiske botkjøringer og ligger i `profiles/restructuring/`: `early.cpuprofile`, `industrial.cpuprofile` og `modern.cpuprofile`. De representerer henholdsvis 1 200, 6 000 og 13 800 simulerte sekunder. Profilene måler én prosess; åttefrøtabellens veggtider er fra parallell belastning og er ikke en sammenlignbar benchmark.

| Fase | Simulert tid | Veggtid | Viktigste funn |
|---|---:|---:|---|
| Tidlig | 1 200 s | 1,4 s | Ingen byvev- eller omstruktureringsfunksjon blant de 15 største kostnadene. |
| Industri | 6 000 s | 29,1 s | `restructuringAnalysis` 2,5 % og `siteIsValid` 2,2 % av CPU-utvalgene. |
| Moderne | 13 800 s | 135,2 s | `restructuringAnalysis` 3,5 % og `siteIsValid` 2,6 %; menneske-, industri-, bevegelses- og produksjonssystemene er fortsatt større enkeltkostnader. |

OPUS-12B dokumenterte omtrent 1,4 / 25,8 / 104,3 sekunder for tilsvarende faser. Tilstandene er ikke bit-for-bit identiske etter at byformen og progresjonen endret seg, så forskjellen kan ikke tilskrives én funksjon alene. Den moderne kjøringen er likevel tydelig tregere, og den nye analysen har en målbar andel. Porten kan derfor ikke settes til PASS.

Byvevet er hurtigbufret per bosetting og bygges bare på nytt når gatenettet eller bygningssettet endres. Omstruktureringssøket er deterministisk og kandidatlisten er avgrenset; det utfører ingen full verdensskanning per menneske. En prøvd fast vurderingskadens reduserte antall analyser, men endret ressursrekkefølgen og fjernet naturlig omstrukturering i ett referansefrø uten å forbedre samlet veggtid. Forsøket ble derfor forkastet.

I den endelige åttefrøkjøringen var planleggerkostnaden synligst i frø med mange avviste tomter. Dette er ikke en progresjonsstans: alle åtte nådde Institutt. Det er likevel et klart optimaliseringspunkt før flere regler legges på samme planleggingssløyfe.

Den endelige nettleserserien målte gjennomsnittlig tegnetid til 3,99 ms per ramme og miljøoppdatering til 175,60 ms. GUI-røykprøven bestod 33/33 uten konsollfeil. Renderer-porten består; den samlede ytelsesporten er **PARTIAL** på grunn av simuleringskostnaden i moderne fase.
