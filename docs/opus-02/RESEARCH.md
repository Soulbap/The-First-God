# OPUS-02 — Research

Målrettet og kort. Ærlig om hva kildene faktisk sier, og hva som er mine egne slutninger.

## 1. Funn fra eksterne kilder (sekundære, ikke egen spilling)

Alt nedenfor kommer fra nettsøk (to søk i `standard`-modus), ikke fra at jeg har spilt spillene. Kildene er anmeldelser og forumsider; de er ikke offisielle designdokumenter.

- **Foundation (Polymorph)** — gridløst; veier og stier vokser organisk. En anmeldelse beskriver at stier dannes der innbyggerne går oftest og forsvinner igjen når de ikke brukes; en annen at autonomien gir friksjon (innbyggerne tar snarveier gjennom hager). [GINX](https://www.ginx.tv/en/foundation-review-polymorph-games), [Galaxus](https://galaxus.it/en/page/foundation-is-a-brilliantly-chaotic-and-creative-building-game-36583).
  *Slutning (min):* THE FIRST GOD har allerede ønskelinjer i slitasjelaget; OPUS-02 legger gatenett oppå *etter* utviklingstrinn, så stien blir grus og så stein når bygda vokser. Gatene følger dørene (faktiske steder folk går), ikke et rutenett.
- **The Universim** — sivilisasjonen utvikler seg gjennom epoker (steinalder → middelalder → moderne tid → rom), og senere oppdateringer la til tydelige visuelle trekk per epoke (f.eks. stillas ved bygging i moderne tid). [Steam-forum](https://steamcommunity.com/app/352720/discussions/0/1730963192543960583), [GamingOnLinux](https://www.gamingonlinux.com/2019/03/the-universim-continues-to-evolve-the-modern-age-in-the-latest-build/comment_id=150369). Kilden er sekundær og utgivelsesdatoer er inkonsistente mellom sidene — jeg bruker bare poenget om at epoker må *se* forskjellige ut.
  *Slutning (min):* hvert trinn i THE FIRST GOD må ha sin egen arkitektur (halm → tømmerstue/bolighus med tegl, skifer og kalk → hall med tårn → helligdom i stavkirkestil), ikke bare flere like hus.
- **Hydrologi** — «Priority-Flood» (Barnes et al.) fyller/gjennomskjærer forsenkninger og gir D8-strømretninger som alltid når kanten; akkumulert vannføring over en terskel gir elver. Kilden bemerker at D8 gir rutenett-/diagonalstrukturer. [arXiv 1511.04463](https://arxiv.org/pdf/1511.04463), [Landlab](https://landlab.readthedocs.io/en/latest/tutorials/flow_direction_and_accumulation/the_Flow_Director_Accumulator_PriorityFlood.html).
  *Slutning (min):* implementert som fyllende variant med fuktighetsvektet regn, Chaikin-glatting og et svakt slyng på tvers for å bryte rutenettet. D∞/multiflow ble vurdert men ikke valgt (kostnad).

## 2. Kilder jeg ikke fikk brukt

Black & White, WorldBox, Banished og Kingdoms and Castles ble ikke søkt opp i denne runden (ingen kilder hentet). Det jeg sier om dem i `DESIGN_REVIEW.md` (navngitte innbyggere, synlige konsekvenser av guddommelige valg) er *min bakgrunnskunnskap*, ikke et researchfunn, og er ikke grunnlag for noe implementert.

## 3. Tekniske alternativer vurdert (egne vurderinger)

| Problem | Alternativer | Valgt | Hvorfor |
|---|---|---|---|
| Gatenett | Rutenett; rute-tegnet av spiller; MST mellom dører | Kruskal på kandidatkanter som ikke krysser bygg + sideskift | Deterministisk, billig (<1 ms), ingen spillerplassering |
| Døgn | Sanntid; spilltid | Spilltid (`state.time`, 480 s/døgn) | Deterministisk, samme klokke for planeten og nærbildet. Pause stopper sola. |
| Natt i nærbildet | Full lyskartmotor; multiply-tone + additive lys | Multiply-tone og additive vindu/lykt-glød | Lett, alltid lesbar |
| Elver | Støybasert; D8 + priority-flood; full erosjonssimulering | D8 + priority-flood | Elver som følger terrenget og alltid når havet |
| Skogtetthet på planeten | Jevn støy (OPUS-01); landskapsdrevet | Landskapsdrevet (alfakanalen bærer tettheten) | Gir skogbelter og enger i stedet for gjentatte flekker |
| Bakkelagets ytelse | Redusere oppløsning; web worker; progressivt pass | Progressivt pass (3 ms/bilde) | Ingen ny arkitektur, ingen enkeltpause |

## 4. Begrensninger

- Ingen menneskelig spilltest og ingen lyttetest er utført (se `PLAYTEST_REPORT.md`).
- Kildene er sekundære; ingen mekanikk er «kopiert», bare prinsipper (stier fra bruk, epoker som ser ulike ut, elver fra avrenning).
