# GUI-01 — The Evolving Divine Interface

Gren: `feature/gui-01-divine-interface`, laget fra `feature/visual-01-living-world` (VISUAL-01 er ikke flettet inn i `main` ennå). GUI-01 endrer ikke rendereren, så grenen kan flyttes over på `main` hvis VISUAL-01 forkastes. Ingenting er flettet inn i `main`.

## 1. Hva er endret

**Plan (skrevet før koding):** behold vanilla JS + Canvas og HUD-en som DOM over canvas. Legg til (1) tokens og ikoner, (2) varig oppdagelse i simuleringen, styrt av data, (3) en ren visningsmodell som avgjør hva panelet viser, (4) ny HUD-markup og -stil, og (5) tester, skjermbildeverktøy og dokumentasjon. Økonomi, kostnader, menneskelig KI, bygging, zoom og Ragnarok er ikke rørt.

- **Ressurslinje** øverst til venstre: Trevirke og Stein fra start. Folk og produksjon per sekund kommer når menneskene finnes. Tallbredden er stabil (tabulære sifre).
- **Bønn (PP)** som egen flate øverst til høyre, men først når bålet står (eller PP finnes). Flaten glir til venstre når panelet åpnes.
- **Bunnmeny:** Innsikter (merket viser antall valg som kan kjøpes nå), Milepæler (dukker opp ved første milepæl) og Ragnarok (alltid tilgjengelig, frivillig).
- **Kontroller** nederst til høyre: pause/1×/2×/4×, Nær/Område og nye −/+ (bruker eksisterende `zoomAt`).
- **Innsikter-panel** fra høyre (250 ms): tittel, undertittel etter stadium, kategorifaner bare når de trengs, og kort med ikon, effekt, «i verden», kostnad, knapp, manglende ressurser og fremdriftslinje. «NY»-merke og en diskret «Ny innsikt»-melding.
- **Milepæler** vises i samme panel. Ragnarok-dialogen har fått ny stil; innholdet er det samme.
- **Ingen historikk** i det synlige grensesnittet.

## 2. Filer

| Fil | Endring |
|---|---|
| `index.html` | Ny HUD-struktur (ressurser, PP, panel, bunnmeny, kontroller, dialog), `data-epoch="genesis"` |
| `src/ui/tokens.css` | **Ny.** Designtokens |
| `src/ui/style.css` | Skrevet om på tokens |
| `src/ui/icons.js` | **Ny.** SVG-ikonfamilie |
| `src/ui/insights.js` | **Ny.** Ren visningsmodell (ingen DOM) |
| `src/ui/hud.js` | Skrevet om: nøklede DOM-oppdateringer, panelmodus, faner, fokus, Escape |
| `src/data/gui.js` | **Ny.** Ressursnavn, kategorier, epoker/stadier |
| `src/data/upgrades.js` | `category`, `icon` og eventuelt `discover` per innsikt (kostnader og krav er uendret) |
| `src/sim/discovery.js` | **Ny.** Varig oppdagelse og `discovered`-hendelser |
| `src/sim/game.js`, `world.js`, `economy.js` | Kaller `checkDiscoveries`, legger til `state.discovered` og kravtypen `{ gathered }` |
| `src/main.js` | Kobler inn `onZoom` og oppdagelsesmeldinger, lar `onBuy` returnere resultatet, og mellomrom på en knapp pauser ikke |
| `tests/gui.test.js` | **Ny.** 11 tester |
| `tools/capture-gui.mjs`, `tools/gui-smoke.js` | **Nye** utviklerverktøy |

## 3. Designtokens

Genesis-paletten er brukt **uendret** fra spesifikasjonen: `--gui-bg-primary #171B19`, `--gui-bg-secondary #292D28`, `--gui-bg-hover #373B34`, `--gui-accent #D4B477`, `--gui-accent-hover #E2C58F`, `--gui-text-primary #F0E9DA`, `--gui-text-secondary #C8BEAA`, `--gui-text-muted #A9AA9F`, `--gui-positive #A8BA98`, `--gui-warning #D58A70`, `--gui-border #635843`, `--gui-shadow rgba(0,0,0,.45)`.

Avledede tokens: panelflate (bakgrunnsfargen med 93 % dekning; ressurslinjen 86 %), kortflate (`#292D28` med 72 %), myk kant (`#635843` med 55 %), gullvask, blekk på gullknapp (`#1E1A12`) og ikonfarger per ressurs.

- **Avstand:** `--space-1…6` = 4/8/12/16/24/32 px.
- **Radier:** 6 / 8 / 10 px.
- **Typografi:** Palatino Linotype til titler, Segoe UI til alt annet. Titler 27 px (24 px på små skjermer), korttitler 17, brødtekst 14, verdier 22, etiketter 15 og metadata 13.
- **Bevegelse:** 150 ms ved hover, 180 ms for kort, 250 ms for panel og meldinger. `prefers-reduced-motion` setter alt til 0.
- **Epoker:** `:root[data-epoch="…"]` overstyrer bare `--gui-*`-fargene. `currentEpoch()` setter attributtet.

## 4. Hvordan oppdagelse fungerer

1. **Definisjon** (`upgrades.js`): `discover` er en liste med krav i samme format som `requires`. Uten `discover` brukes `requires`.
2. **Oppdagelse** (`sim/discovery.js`): `checkDiscoveries` kjører hvert simuleringssteg. Når kravene er oppfylt første gang, lagres `state.discovered[id] = tid` og det sendes en `discovered`-hendelse. Oppdagelsen er varig i syklusen og nullstilles ved Ragnarok, fordi det lages ny tilstand.
3. **Kjøpbarhet** (`economy.js`, uendret): `upgradeStatus` → `locked | unaffordable | available | building | done`.
4. **Effekter** (`economy.js`, uendret).
5. **Presentasjon** (`ui/insights.js`): et kort vises bare hvis innsikten er oppdaget *og* ikke er `done`. Rekkefølgen følger dataene og er derfor stabil. Fanene vises når minst to kategorier har innhold.

| Innsikt | Oppdages | Kategori |
|---|---|---|
| Første ly | første sanking (`gathered: 1`) | Bosetning |
| Vekkelse | lyet står | Liv |
| Felles ild | etter Vekkelse | Tro |
| Hendene husker | etter Vekkelse | Liv |
| Nytt hjem | bålet står (blir stående mens hytta bygges) | Bosetning |

Spesifikasjonens eksempler stemmer med eksisterende rekkefølge, så progresjonen er ikke endret. Testen «hele tidligspillet» sjekker underveis i en hel gjennomspilling at ingen innsikt kan kjøpes uten å være synlig, altså at spillet ikke kan låse seg.

## 5. Bevart spilloppførsel

Kostnader, kostnadsvekst, krav, effekter, menneskelig KI, bygging, tomtevalg, milepæler, zoomopplåsing, hint og Ragnarok-formelen er uendret. Panelet pauser ikke simuleringen, og det åpner seg fortsatt automatisk første gang noe kan kjøpes. Determinismetesten og de 19 eksisterende testene består.

## 6. Skjermbilder

Alle bildene er i `docs/gui-01/`, med suffiksene `-before` (VISUAL-01-HEAD `eb2c049`) og `-after`. De er tatt med `tools/capture-gui.mjs` i hodeløs Edge med samme seed, samme kamera og samme tilstand.

| Scene | Innhold |
|---|---|
| `01-start-closed` | Start, panelet lukket |
| `02-start-open` | Etter fire klikk: én oppdaget innsikt |
| `03-unaffordable` | Lyet står, Vekkelse oppdaget, men for dyr |
| `04-first-humans` | To mennesker, produksjon, fanene Liv/Tro |
| `05-settlement` | Bål og hytte, PP, fanene Liv/Bosetning, Nytt hjem under bygging |
| `06-milestones` | Milepæler-panelet |
| `07-1366x768`, `08-1280x720` | Mindre skjermer med panelet åpent |
| `09-ragnarok` | Ragnarok-dialogen |

## 7. Tester og kontroller

- `npm test` gir **30/30 bestått** (19 eksisterende og 11 nye i `tests/gui.test.js`).
- `tools/gui-smoke.js` i forhåndsvisningen (1920×1080) gir **30/30**: åpne og lukke, Escape, fokusretur, NY-merket, kjøp gjennom selve knappen med nøyaktig kostnadstrekk, at fullførte kort forsvinner, fanefilter, Milepæler, Ragnarok (avbryt og bekreft) med nullstilt HUD, og at pekeren ikke går gjennom panelet.
- Ekte tastatur er prøvd: Tab → Innsikter, Enter åpner, Escape lukker, og fokus kommer tilbake med gullring.
- **Konsoll:** ingen feil i noen av scenene. Grunnlinjen gir en 404 for `favicon.ico`, som nå er dempet med `<link rel="icon" href="data:,">`.
- **Kontrast** (WCAG, beregnet mot panelet lagt over hvit bjørkebark, som er verste tilfelle, og over typisk gress, og kontrollert mot pikselprøver fra skjermbildene, `#1C211B`–`#272924`):

  | Kombinasjon | Laveste |
  |---|---|
  | Hovedtekst / sekundær / dempet tekst | 6,0 / 6,4 / 5,0 |
  | Positiv (rater) | 5,7 |
  | Advarsel (manglende ressurser, på kort) | 5,2 |
  | Gull-aksent (undertittel, valgt fane) | 5,9 |
  | Blekk på gullknapp | 8,7 |
  | Dempet tekst på deaktivert knapp | 6,0 |
  | Kant på aktiv fane/knapp | 3,5 |

  Advarselsfargen ville gitt 4,3 på ressurslinjen over hvit bark, men den brukes ikke der. Kortkantene er dekorative (1,5:1), og tilstand vises alltid med tekst og knapp. Det var ikke nødvendig å justere paletten.

## 8. Visuell sammenligning mot konseptet

**Samsvarer:** plasseringer (ressurser oppe til venstre, PP oppe til høyre, panelet til høyre, sentrert bunnmeny, fart/zoom nede til høyre, merkenavn nede til venstre), mørke kullgrønne paneler med varm, tynn kant, serif-titler med gull undertittel, ikonfaner med gull utvalgt tilstand, kort med ikonflis, lavmettede ressursikoner, gullknapp for handling og rolig deaktivert knapp. Verden er fortsatt blikkfanget, og med lukket panel er bare to små flater oppe og bunnlinjen synlige.

**Gjenstående forskjeller (bevisst eller utenfor omfang):**
- Konseptet har malte miniatyrbilder i kortene. Her er det linjeikoner på mørk flis (spesifikasjon §6.4: ingen dekorative bilder uten tydelig gevinst).
- Konseptet har en historikkdel. Den er utelatt etter spesifikasjonen.
- «Verden» i bunnmenyen er utelatt fordi det ikke finnes et system bak den.
- Ressursikonene er linjeikoner med svak fylling, ikke fargede, fylte glyfer som i konseptet.
- Titlene bruker systemets Palatino i stedet for en spesiallaget serif.
- Panelet er 392 px (spesifikasjonen sier 360–400). Konseptet er bredere i forhold til skjermen.
- Verdensbildet kommer fra VISUAL-01-rendereren, som er mer ovenfra og mindre isometrisk og detaljert enn konseptkunsten. Det er utenfor GUI-01.

## 9. Kjente begrensninger

- DOM-samhandling er ikke en del av `npm test`, fordi det ikke finnes noe DOM-miljø uten avhengigheter. Den kontrolleres med `tools/gui-smoke.js` i nettleseren, som må kjøres manuelt.
- `prefers-reduced-motion` er bare implementert i CSS. Det er ikke prøvd med emulering.
- Ved 1280×720 trenger panelet rulling når to lange kort vises samtidig.
- «Ny innsikt»- og milepælmeldinger kan stables når de utløses samtidig (for eksempel Første ild og Nytt hjem).
- Oppdaget/sett-tilstand lagres ikke, fordi spillet ikke har lagring.
- `tools/capture-gui.mjs` forventer Edge på standardstien. Bruk `BROWSER_PATH` for å velge en annen nettleser.
- GUI-01 bygger på den uflettede VISUAL-01-grenen.
- Observasjon: VISUAL-01-punktene i `CHANGELOG.md` ligger inne i formateksempelet øverst i filen. De er ikke flyttet, fordi historiske poster ikke skal omskrives uten at prosjektansvarlig ber om det.

## 10. Anbefalinger for GUI-02

1. Malte miniatyrbilder per innsikt i samme painterly stil, hvis det tydelig hjelper lesbarheten.
2. Gi PP en bruk (guddommelige handlinger) og la Tro-kategorien vokse med den. PP-flaten kan da vise rate.
3. «Verden»-destinasjon når verdens- og planetzoom finnes.
4. Lagring, slik at oppdaget/sett-tilstand overlever en ny innlasting.
5. Et første temautkast for Civilization-epoken (`data-epoch="civilization"`) for å bekrefte at token-arkitekturen bærer.
6. Valgfri hurtigtast (I) for Innsikter og et kort verktøytips på produksjonsratene.
