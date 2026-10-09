# GAMEPLAY-05 — Den levende regionen

Gren: `feature/gameplay-05-living-region` · Baseline: GAMEPLAY-04.

## Plan og resultat

Den minste vertikale utvidelsen beholder én forståelig felles ressursbeholdning, men gir den andre bosettingen lokale, sekvensielle byggeprosjekter. En levering reserverer trevirke eller stein når en innbygger forlater den første landsbyen; materialet kan ikke brukes igjen før bæreren kommer fram. Etter ankomst teller det bare mot det lokale prosjektet. Dette gir en fysisk, testbar logistikkflyt uten handelsmarked eller ny økonomimotor.

**Voksende slekter** åpner deterministisk befolkningsvekst når et lokalt hjem har kapasitet. **Mellom ildstedene** åpner leveringer og de tre lokale prosjektene lager, hjem og fellesplass. **Faste ferdselsårer** er en liten oppfølging etter to leveranser. «En levende region» krever to fullførte regionale prosjekter, to leveranser og reell slitasje mellom stedene.

## Faktiske Canvas-bilder

Bildene er tatt fra kjørende Canvas med fast seed og `GAMEPLAY_05=1`; de er ikke mockups.

1. `01-first-village.jpg` — etablert opprinnelig landsby.
2. `02-second-founded.jpg` — den unge lysningen straks etter grunnleggelse.
3. `03-first-delivery.jpg` — første bærer på regional reise.
4. `04-delivery-arrival.jpg` — forsyninger kommer til lysningen.
5. `05-construction.jpg` — lokalt byggeprosjekt etter leveranser.
6. `06-grown-settlement.jpg` — lager og nytt hjem gjør lysningen tydeligere.
7. `07-regional-path.jpg` — gjentatt ferdsel styrker jordsporet.
8. `08-living-region.jpg` — begge steder i regional ramme.
9. `09-original-close.jpg` — nærere blikk på den eldre landsbyen.
10. `10-second-close.jpg` — nærere blikk på den yngre bosettingen.

## Kontroll

- `npm test`: **41/41** bestått.
- Hodeløs Edge-capture: ti GAMEPLAY-05-bilder skrevet; verifiseringskjøring ga GUI-røykprøve **33/33**, ingen konsollfeil og **4,08 ms/bilde** i den fangede regionale scenen. Miljøoppdateringen målte **29,10 ms** i samme kjøring.
- Visuell gjennomgang: begge ildsteder, ulik størrelse, brukt mark og forbindelsen er synlige i regionalrammen. Den eldre landsbyen beholder flere hjem og mer åpen mark; lysningen er mindre og tettere omkranset av skog.
- Ragnarok fortsetter å opprette `createGame(SEED)`: leveringer, reservasjoner, lokale prosjekter, ekstra innbyggere, sti og andre bosetting finnes ikke i neste syklus.

## Begrensninger og neste steg

Beholdningen er med hensikt fortsatt delt; lokale lagre er foreløpig bygge- og møtepunkter, ikke selvstendige økonomier. Én bærer kan ha én levering om gangen, og navigasjonen bruker fortsatt den enkle tjern-omveien fremfor full pathfinding. Neste anbefalte steg er spilltest av ventetid, hvor lesbar regionalstien er på vanlig skjerm, og om den lokale veksten oppleves rask nok før flere systemer vurderes.
