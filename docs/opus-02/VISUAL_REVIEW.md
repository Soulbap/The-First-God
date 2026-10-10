# OPUS-02 — Visuell gjennomgang

Alle bilder ligger i `docs/opus-02/screenshots/` (`<scene>-before.jpg` = OPUS-01 `8acf4fd`, `<scene>-after.jpg` = OPUS-02). Tilstandene er **ekte bot-gjennomspillinger med samme frø (20261009)** lagret ved milepæler (`tools/snapshots.mjs`) — ikke injiserte ressurser eller flagg. Dag-/natt-fasene er satt med `TFG.setDay` (debug) for å vise bestemte tider; det er ikke en spilltilstand. «Før» fra OPUS-01 bruker en annen sim (39 mot 78 folk) — sammenligningen er derfor *samme trinn, samme seed*, ikke samme øyeblikk.

Bildene ble tatt i 1600 × 900. Planet-/kontinentbildene (09c–13) inneholder bare lerretene (ikke DOM-HUD); de er tatt i appens nettleserpanel med en forhåndsbakt planet (se begrensninger). Alle bilder er faktisk sett av meg.

## Scenene

| # | Scene | Observasjon (etter) |
|---|---|---|
| 01 | Første ly | Lavvo, skinnstativ, en stokk og stein; omgitt av vill natur, én leir. |
| 02 | Voksende landsby | Tre halmhytter og lavvoen rundt to bål, åpent smie-/lagerskur, stier som slites; ingen steinsetting. |
| 03 | Første by (milepæl) | Fortsatt tre halmhytter og lavvoen rundt to bål, åpent skur, åkerteiger med neper og fugleskremsel. Selve byen kommer først med sagbruk, steinhoggeri og bolighus (se 04). |
| 04 | Første «By» | Bolighus i ulike farger, torg, brønn, lykter, markiser; menyen viser de nye innsiktene Byplan og Takkoffer. |
| 05 | Moden by | 8 bolighus (rød tegl, skifer, kalket bindingsverk, brunt tak), hall med klokketårn og vimpler, to varehus, to brønner, markedsplass, helligdomsstykker i nordvest, kjerrer, tønner, tøyvask, lykter. Stener er brolagt i kjernen. |
| 06 | Skogbygd | Åpent sagbruk med tømmer- og plankehauger som vokser med produksjon, halmhytter, brønn, ryddet tomt. |
| 07 | Steinbygd | Steinhoggeri med blokker, rå stein og bruddhull. |
| 08 | Regionen | Hovedstaden som tett by med fargede tak; tre satellitter som halmbygder med åkerstriper (matbygd), sagbruk og steinhoggeri; svake stier mellom. |
| 09a–d | Overgang | Fra nærbildet via område og region til kontinentet; samme fokus. |
| 10 | Kontinent | Fjellkjeder, elver, innsjøer, svake ruter til utposter, hjemmet i en skoglysning. |
| 11–12 | Planet | Klode med elver, snø, hav og utposter; hjemmet som en liten lysning. |
| 13 | Planet om natten | Blå, dempet natt; kontinentene kan leses; markerte lys. |
| 14 | Ragnarok | Ny syklus: samme startverden, ingen bygg, minnestein ved tjernet. |
| 15a–d | Døgn | Samme by ved morgen, middag, skumring og natt. |

## Mot kvalitetsportene

| Port | Vurdering | Begrunnelse |
|---|---|---|
| **A · tidlig verden** | **Oppfylt** | Liten og sårbar leir; det første lyet er i sentrum med skinnstativ og stokk; mye vill natur. |
| **B · landsby** | **Delvis** | Tydelig sentrum med to bål, hytter i klynge, stier. Men landsbyen er fortsatt halmhytter + én bod; «felles rom» leses mest via bålene. |
| **C · by** | **Delvis→mest** | Sammenlignet med før (05 før/etter) er byen tydelig mer avansert: ulike hus, tårn, varehus, gater, lykter og helligdom. Men den er fortsatt en liten by (≈ 20 bygg, 48 folk), ikke en metropol; det er ingen flere etasjer eller murer. |
| **D · regional** | **Delvis** | Satellittene skiller seg tydelig fra hovedstaden og fra hverandre via gårdsplassene (nepehauger, tømmerstabler, bruddhull). Forbindelsene mellom dem er fortsatt svake slitasjestier. |
| **E · kontinentalt landskap** | **Delvis** | Fjellkjeder, elver og innsjøer gir geografi. Lavlandet er fortsatt mykt og noe uten detaljer ved kontinentzoom; fjellene har «kraterhull»-tekstur. |
| **F · planet** | **Oppfylt** | Kloden er fortsatt vakker; rutene er svake; lagnavn bare nær; natten er lesbar. |
| **G · zoomkontinuitet** | **Delvis** | Ingen hopp i kamera/koordinater og ingen rektangulær ramme lenger (tonen rundt hjemmet er rund og støyet), men skogmassen rundt hjemmet er mørkere enn omgivelsene ved region-zoom (09c), og bakken skifter karakter fra «malt» til «tekstur» ved overgangen. |
| **H · levende innbyggere** | **Oppfylt (med forbehold)** | Synlige aktiviteter: felle trær, bryte stein, bære tømmer/stein, bygge, be ved ilden, hente vann (bøtte), handle på torget (kurv), lese i hallen (bok), speide. Alle ekte tilstander. Ingen står fast på verksted. |
| **I · historisk endring** | **Oppfylt** | 01 → 05: fra én lavvo til by med 8 bolighus, hall, torg, lykter; 05 før/etter. |
| **J · stabilitet** | **Oppfylt i testene; ikke fullt visuelt kontrollert** | 122 tester, ingen overlapp/negative beholdninger, 0 konsollfeil i headless-kjøringene; ingen enkeltbilder > 100 ms observert i målingene (se `PLAYTEST_REPORT.md`). |

## Gjenstående visuelle problemer

1. Stier/brolegging i bakkelaget er blokkete ved aller nærmeste zoom (4 enheter per piksel).
2. Bybakken er fortsatt en stor brun slitasjeflate; gater leses best der de er brolagt. Mer variasjon i bakkens farge (plen/jord/grus) ville gitt bedre lesbarhet.
3. Alle hus har samme grunnriss (kun fargevarianter); ingen utsmykninger eller tak med ulike former.
4. Kraterlignende fjelltekstur på planeten.
5. Region-zoom: mørk skogmasse rundt hjemmet.
6. Hovedstadens første ly står som et lavvo midt mellom tegl og skifer — det er ment (det første ly), men leses som en miks av stiler.
