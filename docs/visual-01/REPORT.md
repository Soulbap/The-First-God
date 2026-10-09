# VISUAL-01 — Living World Visual Foundation

Gren: `feature/visual-01-living-world` · Baseline: `main` (Genesis-01). Ingen spillregler, ressursverdier eller oppgraderinger er endret.

## 1. Vurdering før arbeidet (Fase A)

**Styrker.** Seed-basert, deterministisk verden. Forhåndsmalte sprites med vekststadier (stammen forlenges, greiner kommer til). Vindsvai, semantisk detaljnivå for gress, tydelig skille simulering/visning. Dempet palett.

**Svakheter (sett i før-bildene).**
- Bakken var lav-frekvente flekker uten finstruktur; terrenget lå på 1,5 px/enhet og ble uskarpt ved nærzoom. Gresstuster var jevnt drysset uten sammenheng med trær eller vann.
- Grantrær var nesten identiske «pagoder»; bjørkekroner var runde kuler.
- Felte trær ble til tynne, uforholdsmessig lange «lanser». Vedhaugen var en pyramide av sirkler.
- Skygger var runde flekker; slitasje var uskarpe brune blobber (200×133 px oppskalert); bålet var flatt, røyken harde skiver.
- Mennesker: enkle former uten kontur, få variasjoner.
- Ytelse: områdezoom ~71 ms/bilde (hele terrengbildet nedskaleres hvert bilde, to sprites pr. tre).

**Tekniske begrensninger.** `variant` (0–3) kommer fra simuleringens RNG og kan ikke endres uten å flytte hele verdens tilfeldighetsstrøm; terrenget males én gang ved reset; alt er Canvas 2D uten avhengigheter (AGENTS.md).

**Valg.** Inkrementell forbedring av eksisterende arkitektur, ikke utskifting: ny modul `environment.js`, utvidet `terrain.js`/`decor.js`/`trees.js`/`buildings.js`/`people.js`/`fx.js`, og en omskrevet tegnesti i `renderer.js` (samme ansvar og grensesnitt).

## 2. Hva ble gjort

| Fase | Løsning |
|---|---|
| B Terreng | Miljøfelt (fukt, kronedekke, bart jord, 16-enhets rutenett) styrer farge, strø, mose, jordflekker, småstein og dekor. Terreng 2 px/enhet + mip + sømløs finkornsflis (768 px / 200 enheter, ordinær blanding). |
| C Skog | 8 utseender pr. art; ny gran- og bjørkegenerator (se CHANGELOG). Undervegetasjon (unge trær, bregner), busker på skogkanten, falne stammer, kvister. Klarer ikke fylle alt: åpen bakke finnes der kronedekket er lavt. |
| D Bosetting | Slitasje/bar jord med kornet kant fra spilltilstand (gange + bygg + bål + lager); spon og kvister vokser med innhøstet mengde; ly/hytte/bålplass med materialdetaljer; ved- og steinhauger som enkeltobjekter. |
| E Mennesker | Kontur, lyskant, belte, kappe, hårfasong, sko, tydeligere redskaper, ny hvilestilling. |
| F Lys | Lange kastskygger, kontaktskygge, bål-lys på bakken, svakt varmt løft i leiren og nedtonet ytterskog; skyflekker fjernet. |
| G Zoom | Mip-nivåer for terreng, gress og småplanter tones ut mellom S≈0,8–1,6 (S = skjermpiksler pr. enhet), bregner/busker/unge trær forsvinner ved områdezoom, vekststadie-blanding hoppes over langt unna. |

## 3. Før/etter (identiske kamerainnstillinger og spilltilstand, samme seed)

Bildene er canvas-uttak (uten HUD) fra `tools/scenes.js`, 1024×768. Se `docs/visual-01/<scene>-before.jpg` / `-after.jpg`.

| Scene | Filer | Vurdering etter inspeksjon |
|---|---|---|
| A Skog | `A-woodland-*` | Bakken har nå finstruktur, tonevariasjon, jordflekker rundt stein og tuster i grupper; granene har ulike silhuetter. Fortsatt: bjørkekronene er luftige/gule og enkelte lyse partier ser «flekkete» ut. |
| B Ly | `B-shelter-*` | Lyet står i en slitt jordring med stein, spon og en synlig vedhaug. Tydeligere materialer (hudpaneler, sot, regnstriper). |
| C Mennesker | `C-humans-*`, `C-humans-close-*` | Mennesker leses mot bakken (kontur, belte, kappe, redskap); hogst- og bæreanimasjon uendret i rytme. Fortsatt små ved normal zoom (~27 px). |
| D Leir | `D-camp-*`, `D-camp-close-*` | Størst forbedring: tråkket jord mellom husene, sti, spon rundt vedhaugen, bålet med flere lag og glør, hytter med kurser og fundament. |
| E Område | `E-area-*` | Detaljer forenkles uten støy; tretyper leses. Svakt: leiren er liten, og lave, brede variasjoner i bakken ser noe «skyet» ut. |

## 4. Verifisering

- `npm test`: 19/19 består (12 eksisterende + 7 nye i `tests/visual.test.js`).
- Nettleser (forhåndsvisning, `?debug`): ingen konsollfeil; scene A–E kjørt og inspisert; nærbilde av mennesker i handling kontrollert (hogst, gange, hvile, bæring).
- Ytelse målt i den skjulte forhåndsvisningen (programvare-rendret canvas, 1024×768; relative tall, ikke en GPU-måling): gjennomsnitt ms/bilde inkl. simulering, minste av 4 kjøringer —

| Zoom | main | VISUAL-01 |
|---|---|---|
| Nær (600) | 11,9 | ~12,5–16 |
| Nærmest (340) | ikke målt | ~7 |
| Område (1850) | 70,7 | ~14 |

  Oppstart (`renderer.reset`): ~0,9 s (baseline ikke målt). Terrengbilder: ~+25 MB.
- Ikke kontrollert: ekte GPU-maskin, 4K/høy-dpi, lagring/migrering (ingen lagringsformat er endret), lange spilløkter.

## 5. Kjente begrensninger (ærlig)

- **Ikke fotorealistisk, men heller ikke ferdig «painterly realism».** Treene er fortsatt algoritmiske strøk; bjørk er luftig og litt blek, gran kan se «hengende» ut nederst.
- **Terrenget bakes én gang.** Når trær vokser eller felles, endres ikke bakkens skygge/strø før neste reset. Slitasje og spon er dynamiske.
- **Skog­komposisjon er visuell.** Lunder, lysninger og alder er fortsatt bestemt av verdensgenereringen i simuleringen (uendret); jeg la heller til undervegetasjon enn å flytte spillbare trær. Å gjøre verdensgenereringen mer organisk (grupper, lysninger) er en egen, bevisst endring.
- **Felte trær i oppspilt tid** kan ligge mange samtidig (hurtigspoling gir mange `treeFelled`-hendelser samtidig); i normal fart er de spredt.
- Fallne bjørkestokker er fortsatt for lyse. Fargen på ytre skog/ områdezoom har lave, brede skyer i terrenget.
- Ingen eksterne ressurser er brukt; alt er kodegenerert (ingen lisenser å dokumentere).

## 6. Anbefaling

Neste mest verdifulle visuelle steg: **få skogen til å bli en strukturert bestand i selve verdensgenereringen** (tette grupper med unge trær rundt moderne trær, tydelige lysninger rundt tjernet og leiren) og la miljøfeltet oppdateres langsomt (f.eks. hvert 10. sekund) når trær vokser eller felles, slik at bakkens skygge følger med. Det krever en bevisst beslutning siden det flytter spillbare trær (jf. AGENTS.md §8).
