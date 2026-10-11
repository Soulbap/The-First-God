# OPUS-12C — performance

Byvevet holder bare en `WeakMap`-cache per bosetting. Den bygges på nytt når antall nettkantene eller bygg endres, ikke per menneske og ikke per tick. Tomtekandidatene er avgrenset til 96 per søk.

Et nytt kontrollert CPU-sammenligningsløp er fortsatt nødvendig før en ytelsesport kan settes til PASS.
