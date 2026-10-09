// Presentasjonsdata for grensesnittet: ressursnavn, innsiktskategorier og epoker/stadier.
// Ingen spillregler her — krav bruker samme format som upgrades.js og leses via requirementMet.

export const RESOURCES = {
  wood: { name: 'Trevirke', unit: 'trevirke', icon: 'wood' },
  stone: { name: 'Stein', unit: 'stein', icon: 'stone' },
  food: { name: 'Mat', unit: 'mat', icon: 'sprout' },
  people: { name: 'Folk', unit: 'folk', icon: 'people' },
  planks: { name: 'Planker', unit: 'planker', icon: 'planks' },
  cutstone: { name: 'Tilhugget stein', unit: 'tilhugget stein', icon: 'cutstone' },
  knowledge: { name: 'Kunnskap', unit: 'kunnskap', icon: 'book' },
  pp: { name: 'Bønn (PP)', unit: 'PP', icon: 'pp' },
};

// Kategorier vises først når minst `minForTabs` av dem har aktive innsikter.
// Senere epoker legger til egne kategorier her uten å endre panelet.
export const CATEGORIES = [
  { id: 'liv', name: 'Liv', icon: 'sprout' },
  { id: 'bosetning', name: 'Bosetning', icon: 'hut' },
  { id: 'tro', name: 'Tro', icon: 'fire' },
  { id: 'kunnskap', name: 'Kunnskap', icon: 'book' },
  { id: 'rike', name: 'Rike', icon: 'globe' },
];
export const CATEGORY_RULES = { minForTabs: 2 };

// Epoker styrer tema (data-epoch på <html>) og undertittel i panelet. Siste stadium som er oppfylt vinner.
export const EPOCHS = [
  {
    id: 'genesis',
    name: 'Genesis',
    stages: [
      { title: 'Skapelsens morgen', when: [] },
      { title: 'Det første lyet', when: [{ built: 'shelter' }] },
      { title: 'Den første leiren', when: [{ upgrade: 'awakening' }] },
      { title: 'Den første bosetningen', when: [{ builtCount: { types: ['shelter', 'hut'], n: 2 } }, { built: 'fire' }] },
      { title: 'Voksende bosetting', when: [{ built: 'storage' }] },
      { title: 'Den første landsbyen', when: [{ built: 'hearth' }, { people: 8 }] },
      { title: 'Sivilisasjonens morgen', when: [{ milestone: 'stable_food' }] },
      { title: 'En by reiser seg', when: [{ milestone: 'city_rises' }] },
      { title: 'Kunnskapens tidsalder', when: [{ milestone: 'age_of_knowledge' }] },
      { title: 'Et sammenhengende rike', when: [{ milestone: 'connected_realm' }] },
      { title: 'Verdens første sivilisasjon', when: [{ milestone: 'first_world_civilization' }] },
    ],
  },
];
