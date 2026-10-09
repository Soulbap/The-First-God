# OPUS-01 — Fremtidige ideer

Ideer fra research og arbeidet som ikke ble implementert i OPUS-01, sortert etter anbefalt rekkefølge. Ingen av disse er bekreftede designbeslutninger.

## A. Nær framtid (høy verdi, passer dagens arkitektur)

1. **Dag/natt i nærbildet.** Planeten har allerede en sol som vandrer og nattlys fra bosettingene. Samme sol kunne gi en mild skumring i 2D-verdenen: varmere lys, lengre skygger, vinduslys i bolighus og hall, bål som lyser mer. Nattlyset i byen ville vise vekst på en ny måte («bylys om natten» i designtabellen). Krav: lesbarheten må bevares — aldri mørkt, bare dempet.
2. **Navngitte innbyggere og en stille kronikk.** Banished viser at tilknytning kommer av individer (se RESEARCH 1.4). En kort, valgfri kronikk («Åse og Brede grunnla Skogbrynet», «Den første karavanen kom fra Høyfjell») gjort av hendelser simuleringen allerede har, og navn på de første menneskene. Ingen ny mekanikk, bare minne.
3. **PP-sluk etter velsignelsene.** Etter at alle velsignelser er på maks, hoper PP seg opp (~780 ved slutt). Forslag: en uendelig, svakt eskalerende «Takkoffer» som gir en liten, synlig ting i verden (et varde, et offersted, en helligdom som vokser) og litt PrP ved Ragnarok.
4. **Planetens veier.** Etablerte ruter til utposter kan males som veier/stier i planetteksturen (ikke bare linjer i overlegget), slik at landskapet også på kontinentnivå «husker» hva sivilisasjonen har gjort.
5. **Utpostscener.** Når kameraet er nært et etablert land, kan en liten prosedyrisk scene (noen hus, røyk, åker) males i planetens lokale tekstur, som hjemmeflekken.
6. **Bedre bygningssprites.** Bolighus, sagbruk og hall har fortsatt enklere skrå projeksjon enn hytta og lageret. En felles tegneregel (lysretning, takvinkel, materialpalett) og en mer særpreget silhuett per funksjon (sagbrukets sagbukk og tømmerhaug, steinhoggeriets blokkrader, hallens lange tak) ville gi lesbarhet uten etiketter.
7. **Lydnivå 2.** Dagens lyd er et grunnlag (vind, fugler, knitring, hammer, planetklang). Neste steg: torgsorl ved markedet, sag og hammer ved verkstedene, vann ved tjernet, og en svært forsiktig musikalsk progresjon per sivilisasjonstrinn (en tone mer per epoke).

## B. Mellomlang sikt

8. **Solsystem som neste skala.** Se `PLANET_ARCHITECTURE.md` §8: samme overgangsprinsipp (skjermradius bevares), ny tilstand som tidtakere, ingen ny forvaltningssløyfe.
9. **Ragnarok-epoker.** Senere sykluser kunne velge et «tema» (naturorientert, fellesskapsorientert, kunnskapsorientert, ekspansjonsorientert — GAME_DESIGN 6.1) som bare endrer rekkefølge og vekting av innsikter, og som vises i landskapet (mer skog, flere ildsteder, flere haller, flere utposter).
10. **Fjerne land med karakter.** Hvert land kunne gi en egen liten følge (fjell → raskere steinhoggeri, kyst → kunnskap fra sjøfart) som vises i hjembyen (nye varer på torget).
11. **Elver.** Planetgeografien har dalfører; en enkel strømning nedover høydefeltet ville gi elver i teksturen og en naturlig grunn for bosettingsvalg senere.

## C. Krever designbeslutning først

12. **Negative hendelser** (storm, sykdom, tørke) — åpent designspørsmål 4. Om de innføres, bør de være sjeldne, synlige og løses av folket selv (aldri mikrostyring), og en velsignelse kan dempe dem.
13. **Mer enn fire bosettinger / flere utposter** — påvirker progresjonsøkonomien over flere faser (AGENTS.md §8).
14. **Persistens på tvers av enheter** (skylagring) — krever server/konto og er utenfor prosjektets lette filosofi.

## D. Vurdert og avvist (for ordens skyld)

- Aktive mirakler med nedkjøling (prosjektansvarlig: idle først).
- Offline-fremgang (prosjektansvarlig: nei).
- Three.js/Babylon for planeten (ny avhengighet, unødvendig for én kule).
- Simulering av individer i fjerne land (ingen synlig gevinst på planetnivå).
