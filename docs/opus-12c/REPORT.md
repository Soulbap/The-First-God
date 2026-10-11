# OPUS-12C — urban fabric & autonomous densification

## Status: PARTIAL

OPUS-12B feilet visuelt fordi tomtesøket startet i elliptiske ringer rundt ildstedet, mens gatenettet ble laget etter at byggene var plassert. Gatebonusen kunne derfor ikke lage en front; den kunne bare favorisere et tilfeldig ringpunkt nær en gate. Samtidig var konsolidering begrenset til to lavtrinnshytter, som nesten alltid allerede var oppgradert i en moden by.

OPUS-12C legger til et lite, avledet byvev (`src/sim/urban-fabric.js`). Det bygger deterministiske fronttomter fra bosettingens faktiske gatenett, caches til bygg eller nett endrer seg, og brukes bare i modne bosettinger. Nye boliger velger først en gyldig gatefront og beholder en gateorientering. Byplanen kan fylle flere slike tomter når befolkningen faktisk vokser; det er fortsatt ressurs- og arbeidbetalt autonom bygging. Konsolidering kan nå bruke vanlige, ikke-vernede boliger opp til trinn 3.

Det finnes ingen spillerstyrt plassering, regulering eller ny ressurs. Det lagres ingen egen avledet tomtekopi: gatenett og bygg er autoritative, og vevet regnes på nytt bare ved en relevant endring. Dette holder lagring, Ragnarok og determinisme innen eksisterende modell.

## Kontrollert

- Målrettet byvevstest dekker gyldig gatefront, orientering og målbar fronttilknytning.
- `node --test tests/opus12-world.test.js`: 18/18 bestått.
- `npm test` ble kjørt etter endringen; fullføringsoppsummering må gjentas før levering/commit.
- Ekte bot, frø 701, 5 000 simulerte sekunder: hovedstaden nådde Storby med 66 folk, 18 boliger og 52 gater uten snarveier.

## Begrensning

`shots/06-modern-city-after.jpg` viser at denne første passeringen fremdeles ikke dokumenterer en overbevisende kompakt bykjerne. Gatefront- og infillreglene fungerer i simuleringen, men den eldre spredte bygeometrien dominerer fortsatt scenen. Den sentrale visuelle kvalitetsporten er derfor **FAIL**, og denne grenen skal ikke betraktes som ferdig OPUS-12C.
