// OPUS-01 · Ekko fra tidligere sykluser: valgfrie, varige bonuser kjøpt med Prestige Points (PrP).
// Prinsipp (GAME_DESIGN 6.3): de forkorter etableringen eller gir litt mer rom, men hopper aldri over skapelsen
// (treet og steinen må fortsatt røres, lyet reises fortsatt, og ingen milepæl gis gratis).
// Prisene er satt slik at en full syklus (~300 PrP) kjøper omtrent en tredjedel av alle nivåer.
export const PRESTIGE = [
  {
    id: 'old_roots', name: 'Gamle røtter', cost: 15, growth: 2, max: 3,
    effect: '+1 trevirke og stein per klikk for hvert nivå.',
    world: 'Treet og steinen husker hendene dine fra før.',
    apply: (m, L) => { m.clickBonus += L; },
  },
  {
    id: 'echo_prayers', name: 'Ekko av bønner', cost: 24, growth: 2, max: 3,
    effect: 'Bønn gir 50 % mer PP for hvert nivå.',
    world: 'Gamle bønner henger igjen over ildstedet og løfter de nye.',
    apply: (m, L) => { m.prayerMult *= 1 + 0.5 * L; },
  },
  {
    id: 'remembered_hands', name: 'Hendenes minne', cost: 30, growth: 2, max: 3,
    effect: 'Sanking 15 % raskere for hvert nivå.',
    world: 'Folk finner grepet tidligere, som om de har gjort det før.',
    apply: (m, L) => { m.gatherSpeed *= 1 + 0.15 * L; },
  },
  {
    id: 'kind_oblivion', name: 'Glemselens vennlighet', cost: 40, growth: 2.5, max: 2,
    effect: 'Vekkelse vekker ett menneske til for hvert nivå.',
    world: 'Flere våkner i det første lyet.',
    apply: (m, L) => { m.awakenBonus += L; },
  },
  {
    id: 'ash_starmap', name: 'Stjernekart i asken', cost: 70, growth: 2.5, max: 2,
    effect: 'Ekspedisjoner og nybyggere når fram 25 % raskere for hvert nivå.',
    world: 'Asken etter en gammel verden viser veien over kartkanten.',
    apply: (m, L) => { m.expeditionSpeed *= 1 + 0.25 * L; },
  },
];

export const prestigeById = (id) => PRESTIGE.find((p) => p.id === id);
export const prestigeCost = (def, level) => Math.round(def.cost * Math.pow(def.growth, level));
