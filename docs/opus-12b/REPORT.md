# OPUS-12B — urban struktur og ytelse

## Status: PARTIAL

Denne avgrensede integrasjonspassen bygger på OPUS-12 (`4cb9bdf`). Den forbedrer byvekstens mest synlige svakheter uten ny teknologi eller spillerstyrt bygging.

## Implementert

- Boligtomter i byer vekter eksisterende gatefront sterkere enn ren nærhet til ildstedet; tidlige bygder beholder luft.
- Moderne blokker er bredere (4–6 vindusakser) og moderert i høyde (4–7 etasjer), så de leses som byfront fremfor enslige tårn.
- To tette, utdaterte og ikke-vernede hytter kan autonomt konsolideres når en moden bosetting mangler boligplass. Lokale materialer betales, arbeidet tar tid, beboere flyttes og kapasiteten går ikke ned.
- Torget får høyere dagvekt og faktisk kapasitet i modne byer; sen aktivitet ved bål reduseres uten å fjerne naturlige kveldssamlinger.

## Verifisert

- `npm test` — **231/231 bestått**.
- Ny test dekker konsolidering, kostnad, befolkningsbevaring, boligplass og lagre/lese.
- Eksisterende determinisme-, Ragnarok-, regional økonomi-, transport- og gatenett-tester besto.

## Begrensninger

- Åttefrø-matrisen og full bildepakken er ikke kjørt i denne passeringen.
- Konsolidering er sjelden og konservativ for å unngå at byhistorie slettes automatisk.
- Ingen ny generell romlig indeks ble lagt til; målinger av flere vekststadier gjenstår.
