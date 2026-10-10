# Kontinuerlig sivilisasjonsutvikling — fra første ly til romferd

> Kanonisk langtidsdesign. **IMPLEMENTERT**, **PARTIAL**, **PLANLAGT** og **FREMTID** beskriver faktisk omfang.

## Visjon og faste rammer

**Bekreftet:** Sivilisasjonen utvikles kontinuerlig, ikke i harde «aldre». Historiske navn er bare praktiske beskrivelser. En ny evne oppstår når mennesker har relevante materialer, kunnskap, kapasitet og behov; den må gi både funksjonell og synlig følge. Fjerne bygder kan derfor ha trehus mens et sentrum har strøm. Spilleren velger retning i menyer; mennesker utforsker, transporterer, bygger, oppgraderer og vedlikeholder autonomt.

- Geografi, lokale forekomster, avstand og transport begrenser utvikling.
- Teknologi er en evne, ikke en ferdig bygning eller gratis infrastruktur.
- Kompleksitet introduseres gradvis og skal kunne leses i verden før den blir en ny teller.
- Simulering, tilfeldighet og verdensidentitet er deterministiske og lagres. Oppdagelse endrer aldri den autoritative geografien.
- Ragnarok og PrP akselererer valgfrie nye sykluser, men erstatter aldri materielle eller kunnskapsmessige forutsetninger.
- Første vellykkede autonome **orbitale** ferd er slutten på dette dokumentets omfang. Solsystemspill er **FREMTID**.

## Nåværende grunnlag (OPUS-03)

**IMPLEMENTERT:** tre, stein, mat, planker, tilhugget stein, kunnskap, PP og PrP; autonome mennesker og bygging; jordbruk, verksteder, by, flere bosettinger, roller, ruter, utposter, karttegning, deterministisk besøkbare regioner, lagringsformat v3 og kart før planet. Det første lyet bevares som minnested, og en moden by oppgraderer hytter med reelle ressurser.

**PARTIAL:** Verden har kart-/planetpresentasjon og forenklet fjernregionstilstand. Metall, sjøtransport, mekanisk kraft og en første kull-/damp-/fabrikk-/jernbanesløyfe er implementert, men fjernregioner har ikke egne autoritative lager ennå. `Luftmåling` er i dagens kode en sen kart/planet-gate, ikke luftfart. **PLANLAGT:** elektrisitet, motorisering, luftfart og romsystemene nedenfor.

## Utviklingsklynger

Klyngene organiserer designet, men er aldri globale knapper eller låste tidsaldre.

| Klynge | Kunnskap og motivasjon | Nye evner og materiell | Autonomt liv og synlige følger | Testing |
|---|---|---|---|---|
| Ly, ild og samling | Overlevelse; folk kjenner tre, stein og ild. | Håndredskap, lager, første hus. | Sankere bærer, bygger og samles ved ild; vedstabler, røyk og stier. | Ingen negative lagre; mål forsvinner trygt; ly bygges fysisk. |
| Mat og fast bosetting | Vekst trenger tryggere mat. | Åker, vannadgang, lagring, enkle tekstiler/leire ved behov. | Bønder, byggere og lagring; ryddet mark, gjerder, gårdsveier. | Dårlig jord/vann bremser uten softlock; innhøsting og forbruk balanseres. |
| Håndverk og organisering | Reparerbare bygg og deling av erfaring. | Sagbruk, steinhoggeri, måling, marked, kunnskapshall. | Håndverkere og handelsfolk; tettere hus, torg og verksteder. | Bykrav er flerfoldige; produksjon bruker virkelige innsatsvarer. |
| Metall og urbane nettverk | Bedre redskap og holdbar infrastruktur. | Kobber + tinn → bronse; jernmalm + reduktant → jern; senere stål. | Gruver, smier, murverk, vogntransport; slagghauger og varegårder. | Regional malm-/brenseltilgang, substitusjoner og transportkostnad. |
| Kunnskap, kart og navigasjon | Handel og avstand krever felles mål og oversikt. | Skrift, matematikk, oppmåling, kart, navigasjon. | Karttegnere, lærde og navigatører; målepunkter, kartrom, havner. | Oppdagelse, kartpresisjon og spillerkamera er separate tilstander. |
| Mekanisk arbeid | Arbeidsmengde overstiger håndkraft. | Vann-/vindmøller, tannhjul, forbedrede verktøy. | Møllere og mekanikere; hjul, renner, møller. | Mekanisk kraft krever passende sted og vedlikehold, ikke gratis stein/mat. |
| Industri og damp | Stor produksjon og lang transport krever konsentrert energi. | Kull, kjeler, dampmaskiner, fabrikk, jernbane. | Gruver, fabrikkarbeidere, lokomotivmannskap; skorsteiner, kullgårder, spor. | Kull, vann, maskineri og transport må finnes; utslipp/areal leses. |
| Elektrisitet og forbrenning | Fleksibel kraft og raskere mobilitet. | Generatorer, ledere, nett, raffinering, motorer. | Elektrikere og mekanikere; kraftverk, master, nattlys, kjøretøy. | Generator ≠ nett; forbruk trenger drivstofftilgang eller forsyning. |
| Luftfart og avansert industri | Terreng og avstand begrenser kartlegging og kontakt. | Presisjon, kjemi, flymotorer, flyplasser. | Piloter, teknikere og kartleggere; hangarer, rullebaner, flyspor. | Luftmåling har fly/observasjon, logistikk og vedlikehold — ikke bare UI-gate. |
| Raketter og orbital ferd | Vitenskapelige instrumenter og global kontakt krever romadgang. | Avansert metall, kjemi, elektronikk, testanlegg, flertrinnsrakett. | Forskere og rakettingenører; prøvebenker, utskytingsrampe, kontrollrom. | Suborbital test før orbital oppdrag; nødvendige forsyningsgrener konvergerer. |

## Nettverk av avhengigheter

```text
mat/vann -> bosetting -> overskudd -> spesialisering -> kunnskap
tre/stein -> bygg --------^                              |
malm + brensel -> metall -> maskiner -> presisjon -------|
kart + navigasjon -> handel/utforskning -> regionale varer|
vann|vind|kull -> mekanisk kraft -> generator -> strøm ---|
olje -> raffinerte drivstoff -> motor/luftfart ------------|
kjemi + metall + presisjon + elektronikk + energi -> raketter -> orbital ferd
```

Grenene kan møtes på flere måter: damp er nyttig mekanisk kraft, men er ikke obligatorisk før elektrisitet; vann, vind eller annen mekanisk kilde kan drive generator. Kartografi bygger på oppmåling og innsamlede reiser, ikke på seilas. Luftfart trenger ikke bil. Bronse bygger på kobber/tinn, varme og håndverk — ikke laugshall. Alle tallkostnader er **provisoriske**.

## Energi, bygninger og samfunn

En energikjede uttrykker fire ledd: **kilde** (ved, mat, vind, vann, kull, olje), **konvertering** (ildsted, mølle, kjele/motor, generator), **fordeling** (bærer, vei, rør/ledning) og **forbruk** (ovn, verksted, fabrikk, lys). En dampmaskin er konvertering, ikke brensel; en strømledning er fordeling, ikke kraftverk. Menneskene utvider og reparerer disse autonomt når rute, kapasitet og lager tillater det.

Bygg utvikles lokalt: ly → hytter/lagre → gårder/verksteder/marked → mur- og flerbolighus, gruver og støperier → møller/fabrikker/stasjoner → kraftverk, terminaler og forskning → flyplass og romhavn. Bytt ut eller bygg om når det trengs plass, sikkerhet eller kapasitet; bevar første ly, minner og betydningsfulle bygg som landemerker. Eldre arkitektur lever videre i avsidesliggende eller råvarefattige områder.

Synlige individer reserveres for handlinger spilleren kan lese (samle, bære, bygge, dyrke, reparere, kjøre, fly, teste). Når en by blir stor, representeres yrker som etterspørsel, kapasitet og animerte grupper ved relevant bygg — ikke titusenvis av detaljsimulerte arbeidere.

Transport utvikles fra gange og stier via pakkdyr/kjerrer og veier til elv-/seiltransport, dampbåt/jernbane, motorvei og luftfrakt. Hvert trinn endrer faktisk kapasitet, rekkevidde, reisetid eller tilgjengelighet. Ingen transportlås er kun dekorativ.

## Utforskning og kunnskap

Fem uavhengige lag holdes adskilt: (1) fysisk, seedet geografi; (2) steder menneskene har funnet; (3) nøyaktighet i kartet; (4) steder spilleren kan besøke; (5) tilgjengelige kameraskalaer. OPUS-03s besøkbare regioner bruker (2) som adgang og produserer et deterministisk, lokalt bilde uten å duplisere ressurser eller endre hovedsimuleringen.

Lokal vandring → regionale ruter → oppmåling/kartografi → land- og sjøekspedisjoner → forbedret navigasjon → luftmåling → planetarisk oversikt. Ekspedisjoner oppstår gjennom samfunnets autonomi; spilleren velger ingen koordinat. **Bekreftet:** planetkameraet låses sent av avansert luftmåling eller en likeverdig observasjonsevne, etter kartografi. Det viser fortsatt ikke ukjent geografi som kjent. Dagens `Luftmåling` er derfor en midlertidig, planlagt-tidlig representasjon av denne sene evnen.

## Ragnarok, PP og PrP

PP er bønn innen en aktiv verden og brukes på synlige, syklusinterne velsignelser. PrP oppstår bare ved avsluttet, frivillig Ragnarok og kjøper valgfrie permanente ekko. Ragnarok nullstiller sivilisasjonsinfrastruktur og teknologisk utførelse i ny syklus; det må ikke bli en snarvei som gir metallverk eller romprogram gratis. Ekko forbedrer starttempo, læring, transport eller retning innen provisoriske grenser.

En svært tålmodig spiller skal kunne nå orbital ferd uten Ragnarok. Flere sykluser bør vanligvis være raskere, men ikke obligatoriske. Test på minst én ubrutt langsyklus og flere deterministiske sykluser: mål tid til klynger, tilbudte PrP-valg, mulig softlock og om første syklus fortsatt bare åpner noen få ekko. OPUS-03s rebalanserte, avtagende PrP-formel beholdes til data viser behov for endring.

## Første romferd: kanonisk sluttpunkt

**Bekreftet endpoint:** en autonomt gjennomført, ubemannet **orbital** ferd som når stabil bane rundt planeten og sender tilbake et lesbart signal/bilde. Dette er ikke rømningshastighet eller interplanetarisk ferd.

Rekkefølge: (1) rakettkunnskap, (2) testmotor/prototype, (3) suborbital prøve, (4) romhavn med sikkerhets- og kontrollinfrastruktur, (5) kvalifisert rakett og nyttelast, (6) oppskyting, (7) orbital innsetting og signal. Spilleren ser forsyninger komme til stedet, testflammer og avbrutte tester, nedtelling, oppskyting og en liten lysende bane i planetvisningen. Dette åpner kun et fremtidig solsystemdesign; satellitter, måneferd og flukt fra gravitasjonsbrønnen er **FREMTID**.

Se også [teknologikatalogen](TECHNOLOGY_DEPENDENCIES.md), [ressurskjedene](RESOURCE_AND_INDUSTRY_CHAINS.md), [verdensguiden](WORLD_EVOLUTION_GUIDE.md) og [veikartet](CIVILIZATION_IMPLEMENTATION_ROADMAP.md).
