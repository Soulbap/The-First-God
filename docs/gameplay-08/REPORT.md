# GAMEPLAY-08 — Den organiserte sivilisasjonen

Gren: `feature/gameplay-07-10-world-expansion` · Bygger på GAMEPLAY-07.

## Resultat

Sivilisasjonen blir flinkere av det den gjør. **Kunnskap** oppstår bare der folk faktisk arbeider og samles, fem fremskritt gir målbare evner, en **Kunnskapshall** er det første rene sivile bygget, og bosettingenes roller har nå konkrete følger.

## Kunnskap (`src/sim/production.js`)

Kilder, alle bundet til et ferdig bygg og minst to folk i bosettingen:

- Sagbruk og steinhoggeri: 0,25 per fullført syklus.
- Verksted: 0,25 hvert 14. s.
- Kunnskapshall: 0,5 × (1 + 0,08 × folk, maks 10) hvert 8. s.
- Multiplikatorer: Delt kunnskap ×1,5, rolle (Kunnskapssete ×1,5, Bysenter ×1,25, Håndverksbygd ×1,15).
- Utforskning (GAMEPLAY-10) og kystlandets karavaner gir også litt.

Uten bygg og folk er kunnskapen 0 (testet). Målt rate i spill: ≈ 0,05/s ved byens fødsel, ≈ 0,3/s når hallen står, ≈ 0,45/s på slutten.

## Fremskritt (kategori «Kunnskap»)

| Fremskritt | Krever | Kostnad | Målbar effekt |
|---|---|---|---|
| Organisert håndverk | En by reiser seg | 14 kunnskap, 6 planker | foredling +30 % |
| Bedre jordbruk | Organisert håndverk | 20 kunnskap, 60 tre | +1 mat per åker per innhøsting |
| Byggemetoder | Organisert håndverk | 26 kunnskap, 10 planker, 6 blokker | bygging +25 %, bolighus +1 plass, stein vokser 20 % raskere |
| Delt kunnskap | Kunnskapshall | 40 kunnskap, 8 planker | kunnskap ×1,5 |
| Samfunnsorden | Delt kunnskap | 50 kunnskap, 12 planker, 10 blokker, 10 mat | regionale leveranser +2 per tur |

**Kunnskapshall** (innsikt, kategori Bosetning): 120 tre, 60 stein, 16 planker, 12 blokker, 20 kunnskap, krever Byggemetoder. Autonom bygging; gir kunnskap og gjør byen til et **Kunnskapssete**.

## Sosial organisering (`ROLE_EFFECTS`)

Roller avledes av bygg og lokale forhold (rangert): Kunnskapssete (hall) → Bysenter (By/Storby) → Sagbruksbygd → Steinhoggerbygd → Matbygda (+1 mat per åker) → Håndverksbygd → Skogbygd (+25 % sanking av tre) / Steinbygd (+25 % stein). Byer får kortere vekstintervall (×0,8). Ingen manuell tildeling.

**Milepæl: Kunnskapens tidsalder** — En by reiser seg, fire fremskritt, hall ferdig og ≥ 120 kunnskap totalt.

## Tester

`tests/knowledge.test.js` (8): ingenting uten bygg og folk, hall skalerer med folk, hvert fremskritt endrer akkurat det det sier (inkl. eksakte kostnader og +1 mat per åker), roller og effekter, milepælens krav (hall og fremskritt begge nødvendige), full spilling og Ragnarok-nullstilling.

## Begrensninger

- Fremskrittene er lineære/svakt forgrenet; ingen tekno-tre-visning. Kunnskap hoper seg opp mot slutten (≈ 500 ubrukt): senere sluk (flere fremskritt) er et naturlig neste steg.
- Kunnskapshallen bygges bare i hovedstaden.
- Roller har bare små tallmessige fordeler; visuell rolleidentitet (skilt, bygningsstil) er ikke gjort.

## Skjermbilder

3. `03-civic-infrastructure.jpg` — Kunnskapshallen, bolighus og verksted.
4. `04-knowledge-and-realm-panel.jpg` — Rike-panelet: trinn, kunnskap og fremskritt, bosettinger og roller.
