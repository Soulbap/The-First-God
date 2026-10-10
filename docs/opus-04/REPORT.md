# OPUS-04 — Materialenes vei

## Implementert

Tre deterministiske, begrensede malmforekomster (kobber, tinn og jern) opprettes fra verdensfrøet. **Malmens tegn** åpner oppdagelse og autonome beslutninger: når ressursene finnes, reiser folket gruve, kullmile og smelteplass ved normal konstruksjon. Arbeidere henter malm synlig til lageret; forekomstene tømmes.

Kullmilen gjør 3 trevirke til 1 trekkull. Smelteplassen lager 1 kobber av 2 kobbermalm + 1 kull, 1 bronse av 2 kobber + 1 tinnmalm + 1 kull, og etter **Jernets ild** 1 jern av 2 jernmalm + 2 kull. Produksjon stanser uten innsatsvarer eller lagerrom. Bronse gir 18 % og jern 35 % bedre innhøsting.

## Regioner, lagring og visning

Hver region har et seedet varelager. En karavane reserverer ved å trekke varene ved avreise; den leverer bare lasten den faktisk bærer. Regionbesøket viser en avledet mineralprojeksjon fra samme lager og skriver aldri en ny økonomi. Save-formatet er v4 og fyller manglende OPUS-04-felt fra v3-lagringer. Ragnarok lager en ren ny syklus.

Malmårene har fargede steinårer og skygge; arbeidsbygg gjenbruker den eksisterende malte verksted-/ildstedsfamilien. Dette er bevisst en første, nøktern visuell iterasjon: egne gruve- og ovnsprites er fortsatt et forbedringspunkt.

## Kontroller

- `node --test tests/materials.test.js tests/knowledge.test.js` — 11/11 bestått.
- `tests/world.test.js`, `tests/opus03.test.js`, `tests/planet.test.js` og materialtestene passerer i målrettet regressjon.
- Den komplette suiten ble startet, og dens Genesis-/by-/GUI-/kunnskapssegment passerte; kjøringen nådde ikke sluttrapport innen den lokale 30-sekunders kommandogrensen.

## Begrensninger

Off-screen utposter bruker fortsatt en kompakt lagerabstraksjon fremfor individuelle gruvearbeidere. Regional handel velger foreløpig tilgjengelig vare etter enkel mangelprioritet; den er ikke en generell pris- eller ruteoptimalisator.

Den lokale forhåndsvisningen ble inspisert ved normal zoom; den etablerte painterly terreng- og HUD-lesbarheten er intakt. Materialkjeden ble verifisert gjennom simuleringstester, men en komplett, aktiv metallscene ble ikke fanget innen denne gjennomgangen. Den skal behandles som visuell oppfølging, ikke som bestått visuell kvalitetsport.
