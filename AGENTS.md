# AGENTS.md — THE FIRST GOD

Denne filen er de kanoniske arbeidsinstruksjonene for mennesker og AI-agenter i prosjektet. Navnet er med hensikt `AGENTS.md`: det er den vanlige prosjektkonvensjonen som verktøy og agenter lettere oppdager. Ikke opprett en konkurrerende `agent.md` med mindre prosjektansvarlig uttrykkelig ber om det.

## 1. Oppdrag og prioritering

Bygg **THE FIRST GOD** som et rolig, tilgjengelig incremental-/god game der spilleren ser verden vokse organisk fra en leir til kosmisk skala.

Ved konflikt gjelder denne rekkefølgen:

1. Eksplisitte instruksjoner fra prosjektansvarlig.
2. Sikkerhet, dataintegritet og fungerende spill.
3. Bekreftede prinsipper i `GAME_DESIGN.md`.
4. Denne arbeidsflyten og eksisterende kodekonvensjoner.
5. Åpne designspørsmål — dokumenter antakelsen; ikke presenter den som et bekreftet prinsipp.

## 2. Produktprinsipper som ikke skal uthules

- **Verden er hovedgrensesnittet.** Tall og paneler støtter observasjon; de erstatter den ikke.
- **Synlig konsekvens.** En ny regel, oppgradering eller ressurs skal normalt skape en lesbar endring i verden.
- **Autonomi fremfor mikrostyring.** Mennesker handler selv; spilleren setter retning gjennom begrensede, tydelige valg.
- **Menyvalg fremfor byggplassering.** Ikke innfør rutenett, byggeplassering, arbeidsområder eller individuelle arbeidsordrer uten uttrykkelig designbeslutning.
- **Enkelhet er kvalitet.** Velg den minste løsningen som bevarer følelsen og testbarheten.
- **Skala uten tap av tilhørighet.** Zoom utvider forståelse og skal alltid gi sikker retur til detaljvisning.
- **Frivillig prestisje.** Ragnarok skal aldri være en skjult straff; permanente bonuser er valgfrie og skal ikke bli obligatoriske.
- **Realistisk painterly uttrykk.** Ikke gli inn i blank, leketøyaktig eller sterkt cartoony stil.

## 3. Arbeidsflyt: inspect → plan → implement → test → document

Følg denne prosedyren for enhver endring som er større enn en åpenbar skrivefeil.

### 3.1 Inspect

- Les relevante deler av `GAME_DESIGN.md`, denne filen og eksisterende kode før endring.
- Finn nærmeste eksisterende mønster, modul og test.
- Inspiser arbeidsområdet for pågående, uvedkommende endringer. Ikke overskriv dem.
- Avklar om forespørselen ber om diagnose, forslag eller faktisk implementasjon.

### 3.2 Plan

- Definer den minste vertikale endringen som oppnår målet.
- Skriv mentalt eller i arbeidsnotat: berørte lag, bruker-/spillerflyt, risiko og hvordan resultatet testes.
- Dersom valget endrer et bekreftet designprinsipp eller krever en ny retning, stopp og be om beslutning i stedet for å gjette.
- Ved åpne designspørsmål: velg en reversibel antakelse, merk den i dokumentasjon/changelog og hold omfanget lavt.

### 3.3 Implement

- Hold domenemodell, simulering og presentasjon adskilt.
- Implementer spillregler slik at de kan testes uten renderer når praktisk.
- Legg data- og innholdsverdier i egnede datafiler/konfigurasjon når det reduserer kodeforgreninger.
- Ikke bland urelaterte oppryddinger inn i en funksjonsendring.
- Bevar determinisme der spillregler bruker tilfeldighet: bruk seed eller injiserbar tilfeldighetskilde.
- Unngå teknisk gjeld som gjør neste synlige iterasjon vanskeligere.

### 3.4 Test

Kjør målrettede kontroller som dekker det endringen kan ødelegge. Ikke legg til tunge testlag bare for å oppfylle ritualer.

- Kjør relevante automatiske tester for den endrede domenelogikken og eventuelt den berørte UI-flyten.
- Kjør typekontroll/lint/build når prosjektet tilbyr det og endringen berører den delen av systemet.
- For synlige endringer: inspiser resultatet i spill/preview ved relevant zoomnivå.
- For simulering: kontroller minst én normal flyt og én grense-/feilflyt.
- For persistens: last inn en berørt lagring eller test versjonsmigrering når formatet endres.
- Ikke påstå at noe er testet dersom kontrollen ikke faktisk ble kjørt.

### 3.5 Document

Etter enhver filendring:

1. Oppdater `CHANGELOG.md` under `Unreleased`.
2. Oppdater `GAME_DESIGN.md` dersom spillatferd, en beslutning eller et åpent spørsmål er påvirket.
3. Oppdater denne filen dersom arbeidsreglene må endres.
4. Rapporter kort hva som er endret, hvilke kontroller som er kjørt og eventuelle begrensninger.

## 4. Definisjon av ferdig

En oppgave er ferdig når alle relevante punkter nedenfor er oppfylt:

- Kravet er implementert i den avtalte, minste formen.
- Endringen er forenlig med bekreftede designprinsipper.
- Spilltilstand, simulering og visning har tydelig ansvar; ingen unødvendig sammenblanding er introdusert.
- Normalflyt og relevant grenseflyt er kontrollert med målrettet test eller manuell verifikasjon.
- Visuelle endringer passerer relevante visual quality gates fra `GAME_DESIGN.md`.
- Ingen kjente feil, advarsler eller utestede antakelser skjules; de beskrives tydelig om de gjenstår.
- `CHANGELOG.md` er oppdatert.
- Relevante designdokumenter er oppdatert.

«Koden kompilerer» er ikke alene en definisjon av ferdig når oppgaven berører spillopplevelse eller visuell kommunikasjon.

## 5. Testpolicy

### Mål

Test innsatsen der feil er dyre, usynlige eller lett kan komme tilbake: ressurser, oppgraderingskrav, autonome handlinger, syklusoverganger, lagring og zoomtilstand.

### Minimumskrav per endringstype

| Endring | Minimum |
|---|---|
| Ren tekst/dokumentasjon | Les gjennom endret del og kontroller lenker/filnavn. |
| Regel eller ressursøkonomi | Test normal verdi, grenseverdi og at negativ/umulig tilstand ikke oppstår. |
| Autonom menneskeatferd | Simuler minst oppgavevalg, utførelse og når ingen gyldig oppgave finnes. |
| Oppgradering/milepæl | Test låst, kjøpbar og aktivert tilstand samt synlig følge. |
| UI/kamera/zoom | Manuell preview: lesbarhet, overgang, retur og fravær av blokkerende UI. |
| Lagring | Rundtur (lagre/les) for ny eller endret tilstand; migrering ved formatendring. |
| Ragnarok/prestige | Bekreft forhåndsvisning, tap/bevaring, tildeling og ny syklusstart. |

### Testgrenser

- Ikke bygg ende-til-ende-tester for hver kosmetiske detalj.
- Ikke bruk skjør snapshot-testing som eneste bevis for at en scene er lesbar.
- Ikke endre produksjonskode bare for å tilfredsstille en test dersom en enklere, renere grense kan testes direkte.
- En manglende test kan være akseptabel hvis endringen er lavrisiko og kontrollen forklares i changelog/leveranse.

## 6. Visuell arbeidsstandard

Ved grafikk-, animasjons- eller UI-endringer skal agenten kontrollere:

- Leses tre, stein, mennesker og bygg tydelig mot terrenget?
- Ser oppreiste sprites forankret ut med kontaktsskygge, dybde og riktig skala?
- Har handlinger et synlig årsak–virkningsforløp, for eksempel ressurs → bæring → bygg?
- Bevarer scenen realistisk painterly tone, moderat kontrast og dempet palett?
- Er UI tilbakeholdent nok til at verden fortsatt er blikkfanget?
- Fungerer zoom inn/ut som en endring i meningsnivå, ikke bare som kameradistanse?

Ikke godkjenn visuelt arbeid kun basert på data, kode eller enhetstester. En målrettet preview er nødvendig når renderer eller layout endres.

## 7. Dokumentasjonskontrakt

- `GAME_DESIGN.md` er den produktmessige sannhetskilden. Marker avklarte valg som **bekreftet** og usikre valg som **åpent**.
- `CHANGELOG.md` oppdateres ved hver prosjektendring. Følg format og praksis øverst i filen.
- `AGENTS.md` dokumenterer hvordan arbeidet utføres, ikke en komplett spesifikasjon av alle funksjoner.
- Hold dokumentasjon konkret, kort nok til å brukes og på norsk når den beskriver spillet.
- Ikke omskriv historiske changelog-poster for å få dem til å virke penere.

## 8. Beslutningsregler og eskalering

Arbeid autonomt når endringen er en direkte, reversibel implementasjon av etablert design. Stopp og be om avklaring når en beslutning:

- endrer en bekreftet pilar,
- introduserer byggplassering, områdemarkering eller mikrostyring,
- gjør Ragnarok obligatorisk/straffende,
- krever en ny tung ressurs- eller produksjonskjede,
- endrer progresjonsøkonomi på tvers av flere faser,
- innebærer sletting/overskriving av brukerskapte data,
- eller endrer prosjektets visuelle stil vesentlig.

Når du eskalerer, forklar kort: hva som er usikkert, hvilke alternativer som finnes og hvilken minste beslutning som trengs.

## 9. Første prioritet: Genesis-01

Før større systemer bygges, prioriter den vertikale prototypen definert i `GAME_DESIGN.md`:

1. Tre og stein med manuell clicking.
2. Små autonome mennesker som samler og bygger.
3. Tre enkle menyvalg med tydelige verdensendringer.
4. Første bål/hytte, PP og nær-/områdezoom.
5. En trygg demonstrasjon av frivillig Ragnarok.

Alt som ikke styrker disse punktene, skal vurderes som senere arbeid.

## 10. Teknisk arbeidsflyt (Genesis-01-grunnlaget)

- **Kjøre spillet:** `npm start` (eller `start.bat`) → http://localhost:5173. Ingen avhengigheter skal installeres.
- **Tester:** `npm test` (Node sin innebygde testløper). Alle tester skal bestå før commit.
- **Feilsøking og skjermbilder:** åpne `?debug` for `window.TFG` (`advance`, `give`, `buy`, `click`, `view`, `tick`). Nettleserpanel som er skjult pauser `requestAnimationFrame`; bruk da `TFG.tick(sekunder)` for å drive hovedløkken.
- **Før/etter-skjermbilder:** `tools/scenes.js` kjører faste scener (A–E) og POSTer canvas til en lokal mottaker (se toppen av filen). Sammenlign mot `main` i en egen `git worktree` med `PORT=5180 node tools/serve.mjs`. `TFG.renderStats.frameMs` gir gjennomsnittlig tegnetid.
- **GUI:** farger, avstand og typografi hentes fra `src/ui/tokens.css`; ikoner fra `src/ui/icons.js`. Hva panelet viser, avgjøres i `src/ui/insights.js` (testbart uten DOM), aldri i DOM-koden. `node tools/capture-gui.mjs <url> <mappe> [suffiks]` tar fullskjermbilder (verden + HUD) av faste scener via hodeløs Edge; `await (await import('/tools/gui-smoke.js')).run()` i `?debug` kontrollerer samhandling.
- **Git:** `main` på https://github.com/Soulbap/The-First-God er referansen. Én tydelig commit per sammenhengende endring, aldri force push, og ingen hemmeligheter, `node_modules/` eller byggfiler i repoet.
- **Nye avhengigheter** (f.eks. Electron) krever godkjenning fra prosjektansvarlig først.
- **Neste milepæl** er spilltesting av Genesis-01 (`PLAYTEST.md`). Ikke start Genesis-02 før prototypen er vurdert.
