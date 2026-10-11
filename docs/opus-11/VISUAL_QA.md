# OPUS-11 — Visuell kvalitetssikring

Alle bilder er **ekte spill**: `tools/bot.js` spiller uten snarveier i en hodeløs Edge, og bare kameraet og klokkeslettet settes. Sett `OPUS_11=1`:

```bash
node tools/capture-gui.mjs http://localhost:5173 docs/opus-11/screenshots            # etter (16 scener)
node tools/capture-gui.mjs http://localhost:5180 docs/opus-11/screenshots before     # grunnlaget (git worktree på 62b738c, `node tools/serve.mjs 5180`)
```

Bildene ligger i `docs/opus-11/screenshots/`. «Før» er grunnlaget `62b738c` (OPUS-08..10 uten OPUS-11). For tre scener finnes ikke et «før», fordi grunnlaget aldri når tilstanden: strøm, forskningsinstitutt og modernisert by (09, 12), og dermed heller ikke mer enn én kjede i scenene 10–11 og 13–15. Det er i seg selv et funn (se `PROGRESSION_RESULTS.md`).

Måling i skjermbildekjøringene: 2,0–4,4 ms per bilde i hodeløs Edge (ingen GPU-akselerasjon garantert), nettleserens røykprøve 33/33, ingen konsollfeil.

## Scenarier, observasjoner og rettelser

| # | Scene (etter) | Før | Observasjon | Utfall |
|---|---|---|---|---|
| 01 | `01-landscape-fresh-world` | `…-before` | Nytt spill, Område-visning. Før: nesten bare åpen slette med noen få trær og ett tjern. Etter: skogsflekker av gran og bjørk, to tjern og en bekk, steinutspring i brune flater. | OK. Første versjon hadde skogen for langt fra leiren på det større kartet og ble rettet (se «Rettet etter bildene»). |
| 02 | `02-resource-rich-early` | `…-before` | Tidlig leir med stein og tre innen rekkevidde. | OK. |
| 03 | `03-early-camp-spacing` | `…-before` | Tidlig landsby: hytter med rom til stier og to ildsteder, ikke stablet. Avstanden mellom hyttene er omtrent som før (den var allerede akseptabel i en liten leir; den ekstra luften på 20 enheter merkes først i større bygder). Forskjellen er skogen som nå står rundt leiren og stedets ryddede flate. | OK, beskjeden forskjell i selve avstanden. |
| 04 | `04-two-settlements-separated` | `…-before` | Før: tre bosettinger i én skjerm, hytter nesten sammenvokst. Etter: to tydelig atskilte samfunn med skog og en elv mellom dem, hver med eget navn og stadium. | OK etter at avstanden ble økt (se under). |
| 05 | `05-architecture-village-to-city` | `…-before` | By-stadiet: steinhus og tømmerstuer mellom halmhytter, det første ly (telt) bevart som minnested. | OK. |
| 06 | `06-industrial-town` | `…-before` | Industriby: bygårder, steinhus, skorsteiner, verksteder øst for kjernen, stier. Før (grunnlaget, samme bot, samme frø, tidsgrense nådd uten metallverk): en by av tømmer- og steinhus, men ingen metallverk, ingen bygårder og ingen kraft, med tre og stein hopet opp til 51 700 og 34 400 og 78 folk. | OK. Bildet viser det kjeden nå klarer og grunnlaget ikke klarte. |
| 07 | `07-industrial-close-oil-refinery` | – | Raffineri: tanker, destillasjonskolonne og fakkel er lesbare som raffineri. | OK. |
| 08 | `08-electrified-city-night` | – | Natt: elektriske gatelys (hvite) og lysende vinduer i blokkene, noen vinduer mørke; industrihus lyser varmt når de er i drift. | OK etter at vindu-lysene ble dempet (se under). |
| 09 | `09-electrified-city-day-modern-homes` | – | Moderne blokker (5 etasjer) mellom en bevart halmhytte, grusvei og jernbane med sviller. | OK. |
| 10 | `10-airfield-and-science` | – | Flyplassen (rullebane, hangar, vindpølse) står utenfor bykjernen i åpent land; forskningsinstituttet med kuppel og antenne. | OK. |
| 11 | `11-mature-settlement-roads-districts` | – | Moden by: bolig i klynger, industri i et eget belte, torg, stier, jernbane, flyplass i utkanten. | OK. |
| 12 | `12-normal-zoom-readable-buildings` | – | Normal nærvisning: bygård og hall leses tydelig mot terrenget, kontaktskygger finnes. | OK. Tett folkemengde rundt hovedildstedet (fest). |
| 13 | `13-remote-region-local-zoom` | – | Besøkt utpost (dal): elv, skog, fire boliger, lager og gruvehode, folk rundt ildstedet. | OK. Viser et sammendrag, ikke veier eller industri. |
| 14 | `14-regional-map-continent` | – | Kontinentvisning med navngitte land og ruter (planetkameraet er åpnet av luftmålingene). | OK. |
| 15 | `15-planet-view` | – | Planetvisning. | OK. |
| 16 | `16-settlement-clearing-no-regrowth` | `…-before` | By i 1,5 timer: bygda er åpen og stiene er ryddet mens skogen står rundt. | OK. |

## Rettet etter bildene

1. **Skogen rundt bygda ble hogd bort / lå for langt unna.** Første versjon av det større kartet la lundene langt fra leiren, og folk hogde bort resten (tre ved 1 time: 19 trær innen 800 enheter). Rettet: nærskog plantes først, tretaket gjelder fjerne lunder, og folk sanker ikke over lagertaket. Nå ca. 250 trær innen 800 enheter gjennom hele en seks-timers kjøring.
2. **To bosettinger for tett i ett utsnitt.** Rettet: minste avstand 640 → 780, første satellitt 800–1250 fra hovedstaden.
3. **Nattlys for kraftig i høye hus.** Alle vinduer lyste likt og skarpt. Rettet: dempet lys, og deterministisk fordelt mørke vinduer.
4. **Flyplass midt i byen** (første versjon). Rettet: `minRing` 420 (flyplass), 240 (raffineri, flyverk).
5. **Moderne blokk for lys og ren.** Dempet tone.
6. **`overview(true)` feilet i skjermbildeverktøyet** før planetkameraet er åpnet; regionkartet tas nå fra kontinentvisningen etter luftmålingene.

## Kjente visuelle mangler

- Bare to treslag, samme trærne i alle biomer; variasjonen kommer fra tetthet og soner.
- Fjerne land vises som et sammendrag (boliger, lager, gruve, folk); ingen veier eller industri der.
- Industribyggene er malt for lesbarhet i normalt utsnitt; ved Område-visning er de små.
- Lastebiler og jernbane tegnes, men er ikke fanget i et eget stillbilde (de er små; veien og skinnene er synlige i 09 og 10).
- Det er ikke tatt «før / etter låst opp / etter bygget»-bilder per teknologi; scenene viser tilstander langs et ekte forløp.
