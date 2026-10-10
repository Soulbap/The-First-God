# OPUS-02 — Spilltestrapport

**Viktig:** alt under er **bot-test og automatiserte kontroller**. Ingen menneske har spilt denne versjonen. «Spillfølelse» (tempo, om natten er pen, om lyden er god) er ikke vurdert av et menneske.

## 1. Bot-gjennomspilling, seks frø

`node tools/playthrough-multi.mjs` — boten klikker i starten og kjøper bare det som er tilgjengelig (ingen milepælsflagg, ingen injiserte ressurser). Resultater er lagret i `multi-seed-results.txt`. Tider i spillminutter (simulert).

| frø | første landsby | første by | en by reiser seg | kunnskapens tidsalder | sammenhengende rike | verdens første sivilisasjon |
|---|---|---|---|---|---|---|
| 20261009 (referanse) | 13:15 | 40:23 | 57:11 | 63:30 | 69:34 | **84:47** |
| 1 | 14:17 | 41:22 | 55:45 | 63:48 | 69:36 | 85:12 |
| 7 | 12:28 | 40:28 | 55:18 | 62:44 | 68:08 | 84:06 |
| 34 | 12:46 | 39:48 | 53:30 | 61:39 | 71:16 | 86:08 |
| 100 | 15:03 | 42:14 | 58:34 | 65:12 | 73:00 | 86:39 |
| 2026 | 11:40 | 37:25 | 51:34 | 59:43 | 67:20 | 82:34 |

- Alle seks frø når sluttmilepælen (82,5–86,7 min; OPUS-01 rapporterte 80–97 min). Tiden er *ikke* optimalisert; den økte litt for referansefrøet (83:47 → 84:47) fordi byen nå bruker ressurser på hus, brønner, varehus og helligdom, og befolkningen er større (75–78 mot 39 på slutten).
- Etter målet (5 min videre): 75–78 folk, 58–59 bygg, 19 byvekstbygg, 4–5 av 6 helligdomsstykker, 29–31 høstfester, kronikken full (90 poster, øvre grense), lagring/lasting ga samme bygg-antall.
- **Negative beholdninger: 0** (kontrollert hvert sekund). **Lengste periode uten endring** i milepæler/bygg/folk/oppdagelser/innsikter: 3,0–3,8 min — ventetid mellom bygg/leveranser, ingen fastlåsing.
- Alle fire bosettinger utvikler seg (hovedstad *Storby*, tre bygder *Tidlig by*). Hovedstaden får bolighus 8, brønner 2, varehus 2.

## 2. Økonomi og PP

- Slutten har fortsatt stort overskudd av trevirke/stein (~3 000 / ~2 000). Byplanens reservegrense (140/100) beskytter innsiktene; overskuddet er et bevisst, ikke løst, funn (neste idé: flere sluk).
- **Takkoffer** brukes av boten (4–5 av 6 nivåer). PP på slutten 141–684, altså ikke lenger ubegrenset opphopning (OPUS-01: ~780 uten bruk). Nivå 6 koster 734 PP.
- PrP-tildeling: helligdom gir `round(7·√n)` (7, 10, 12, 14, 16, 17 for 1–6) — avtagende, ellers ingen spillbonus (testet).

## 3. Prestige/Ragnarok (testet i kode, ikke spilt av menneske)

- Ny syklus: samme startverden (noder identiske), tom kronikk, Byplan av, 0 bygg, minnesteiner bevart (test). Skjermbilde: `14-ragnarok-aftermath`.
- `ragnarokAward` teller bare ferdige helligdomsstykker.

## 4. Lagring

- Rundtur midt i byvekst (bygg under oppføring) + 120 s videre gir identisk tilstand (bygg, ressurser, kronikk, navn).
- Gamle lagringer uten `urban`/`chronicle` lastes med standardverdier. Navn tildeles lat for gamle folk, i rekkefølge.

## 5. Nettlesertest (Edge/Chromium, headless og i appens panel)

Utført: laste ekte bot-tilstander, zoom/kamera via `TFG.view`, planetvisning og tilbake, Kronikk-panelet (90 poster, klikkbar), hover-etikett, lydstart og -oppdatering uten feil, mute-knapp finnes fra før, dag/natt-faser, `?debug`-hooks.
**Ikke** utført med ekte mus og tastatur over lengre tid, ikke med skjermleser, ikke på ekte touch. Redusert bevegelse: ingen nye raske animasjoner; dag/natt skifter sakte (8 min). WebGL-reserve: uendret kode (kartoversikt); ikke kjørt i dette arbeidet.

## 6. Ytelse (målt i et skjult nettleserpanel, programvare-tegning — støyende)

| mål | OPUS-01 (`8acf4fd`) | OPUS-02 |
|---|---|---|
| `R.render` median, moden by | 5,5 ms | ~7 ms |
| bilder > 20 ms av 240 | 38 | ~37 |
| bakkelagets pikselpass | ~8 ms i ett bilde | ~1 ms + ~7 ms fordelt over 2–3 bilder |
| simuleringssteg | – | < 0,5 ms (maks) |

Konklusjon: ingen merkbar regresjon; de tilfeldige 20–90 ms-bildene finnes i begge versjonene og skyldes sannsynligvis miljøet (skjult panel, programvare-tegning). Det kjente «bakkeslitasje-hakket» er redusert, ikke løst bevist på ekte maskinvare.

Planetbakingen bruker nå flate Float32Array i stedet for ett objekt per piksel (to ganger 4 M objekter før), noe som felte en lavminne-nettleser under testing.

## 7. Bot mot menneske

Boten spiller ikke «interessant». Den sier ingenting om om kronikken leses, om navnene skaper tilknytning, om Byplan-kjøpet føles meningsfullt, eller om natten er for mørk. Dette må en person vurdere.
