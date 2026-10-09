# GAMEPLAY-06 — Fra landsbyer til sivilisasjon

Gren: `feature/gameplay-06-early-civilization` · Baseline: GAMEPLAY-05.

## Resultat

Den levende regionen kan nå bli begynnelsen på en sivilisasjon. Spilleren velger **Frøets løfte**, **Arbeidets deling** og **Regional utveksling**; menneskene rydder åker, høster, bygger og frakter selv.

Mat samles i en synlig delt beholdning og brukes bare når en ny innbygger har ledig bolig. Mangel bremser dermed vekst uten dødsfall, tap eller økonomisk kollaps. Stadier kommer fra befolkning, hjem, infrastruktur og regionale forbindelser — aldri fra en timer alene.

## Progresjon

1. **En levende region** → **Frøets løfte**.
2. Første landsby bygger åker og høster mat.
3. Ferdig åker → **Arbeidets deling**; roller oppstår fra mark, verksted og lokal natur.
4. To innhøstinger → **Regional utveksling**; åker og verksted i den unge bosettingen bygges med de eksisterende fysiske leveransene.
5. **Stabil matforsyning**, **Den første byen** og **Sivilisasjonens morgen** er de nye milepælene.

## Faktiske skjermbilder

1. `01-early-settlement.jpg` — etablert landsby før sivilisasjonsvalgene.
2. `02-first-food-production.jpg` — første åker og matproduksjon.
3. `03-growing-infrastructure.jpg` — yngre bosetting med ny infrastruktur.
4. `04-regional-exchange.jpg` — en fysisk regional levering.
5. `05-first-town.jpg` — moden første bosetting med åker og boliger.
6. `06-civilization-region.jpg` — regional oversikt.

## Kontroll

- `npm test`: **44/44** bestått. Nye tester dekker deterministisk mat, mangel uten kollaps, avledede stadier/roller og Ragnarok-nullstilling.
- Hodeløs Edge-capture: seks skjermbilder, ingen konsollfeil. Siste regionale scene: **3,70 ms/bilde**, miljøoppdatering **32,90 ms**.
- Browser-røykprøve: **32/33**. Den uavklarte kontrollen er `panelet fanger pekeren (ikke canvas)`, en DOM-treffkontroll som bør repeteres i en uavbrutt interaktiv økt.

## Begrensninger og neste steg

- Roller er bevisst lette: Matbygda gir litt større avling, mens skog-/stein- og håndverksroller gjør lokal retning lesbar. Det finnes ikke marked eller omfattende varekjede.
- Beholdningen er fortsatt delt; leveranser reserveres og flyttes fysisk til regionale byggeprosjekter, men lager er ikke selvstendige inventarer.
- Neste anbefalte fase er normal-hastighets spilltesting av tempo, rollelesbarhet og regional sti.
