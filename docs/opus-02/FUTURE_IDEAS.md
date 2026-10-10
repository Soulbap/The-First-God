# OPUS-02 — Fremtidige ideer

Ingen av disse er bekreftede designbeslutninger. Historiske OPUS-01-ideer ligger uendret i `docs/opus-01/FUTURE_IDEAS.md`; punktene som er gjort i OPUS-02 (dag/natt i nærbildet, navn og kronikk, PP-sluk, elver, byggestil) er ikke gjentatt.

## Anbefalt rekkefølge for OPUS-03

1. **Spilltest med et menneske, så en visuell/balanse-runde** (se `PLAYTEST_REPORT.md`: ingen menneskelig test er gjort). Spesielt: er natten for mørk/lys, er Takkoffer verdt det, er kronikken til å leve med, og føles hovedstaden «viktig» nok?
2. **Arbeidere som faktisk bemanner verksteder.** I dag viser sagbrukets rekvisitter produksjonen, men ingen står der. En enkel regel («den som har pause besøker verkstedet, og sagen går bare mens noen er der») ville gjort arbeidet synlig, men endrer økonomien og krever en designbeslutning (AGENTS §8).
3. **Bekk fra tjernet til planetens elvenett.** Planetens elver krysser aldri hjemmeflekken. En bekk i hjemmeregionen ville knyttet nærbildet til planeten (kontinuitet), men krever vadesteder/bruer for folk.
4. **Planetens veier malt i teksturen fra faktisk bruk** (i dag tegnes de i shaderen som svake linjer).
5. **Distrikter** (egen skala for bykvartaler) — ny økonomikjede, krever beslutning.

## Forberedelse til solsystem

- Døgnklokka (`view/daylight.js`) er allerede felles for to skalaer. Neste skala kan bruke samme `state.time`: en planets rotasjon og en banes posisjon som funksjoner av tid, ingen ny tidsløkke.
- Lyd (`audio/scene.js`) leser «hva er i bildet»; en ny skala legger bare til flere felter.
- Planetteksturene er seed-baserte (elver, fjell, skogtetthet i alfa) og har ingen kobling til spillreglene; flere planeter kan bake med samme kode.

## Teknisk gjeld som betyr noe

- `renderer.js` er nå ~900 linjer og har både bakkelag, gatenett, gårdsplasser og lys. Dagslys/natt og gårdsplasser bør flyttes ut til egne moduler (`render/night.js`) før neste utvidelse.
- Planetbakingen (2 × 2048² teksturer i en worker) bruker 10–30 s på treg maskinvare; den kunne bakes i to trinn (grov først).
- Elvene bruker D8 på 384² rutenett; D∞ ville gitt jevnere løp.
- Blandede linjeavslutninger (CRLF/LF) i repoet påvirker verktøyene som redigerer filer; en `.gitattributes` ville hjulpet.
- Lydbildet er aldri lyttet til av et menneske.
