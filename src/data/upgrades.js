// Datadrevne oppgraderinger og milepæler. UI og simulering leser herfra.
// requires/when: {upgrade}, {built}, {builtCount:{types,n}}, {noPending}, {all:[...]}
export const UPGRADES = [
  {
    id: 'first_shelter',
    name: 'Første ly',
    cost: { wood: 10, stone: 5 },
    requires: [],
    effect: 'Gir de første menneskene et sted å våkne.',
    world: 'Et ly reises ved leirplassen — steinring, stenger og dekke, steg for steg.',
    actions: [{ type: 'construct', building: 'shelter' }],
  },
  {
    id: 'awakening',
    name: 'Vekkelse',
    cost: { wood: 12, stone: 6 },
    requires: [{ built: 'shelter' }],
    requireText: 'Første ly må stå ferdig',
    effect: '+2 mennesker som sanker trevirke og stein på egen hånd.',
    world: 'To mennesker våkner i lyet og går ut til trærne og steinene.',
    actions: [{ type: 'spawnHumans', count: 2, at: 'shelter' }],
  },
  {
    id: 'common_fire',
    name: 'Felles ild',
    cost: { wood: 15, stone: 10 },
    requires: [{ upgrade: 'awakening' }],
    requireText: 'Krever Vekkelse',
    effect: 'Menneskene hviler ved bålet og ber — gir bønnepoeng (PP).',
    world: 'Menneskene bygger et bål midt i leiren. Røyk, varmt lys og folk som samles.',
    actions: [{ type: 'construct', building: 'fire' }],
  },
  {
    id: 'hands_remember',
    name: 'Hendene husker',
    cost: { wood: 20, stone: 14 },
    requires: [{ upgrade: 'awakening' }],
    requireText: 'Krever Vekkelse',
    effect: 'Sanking 60 % raskere. Bærer 5 i stedet for 3.',
    world: 'Folk hugger i raskere takt og bærer tyngre bører til lageret.',
    actions: [{ type: 'modify', key: 'gatherSpeed', mult: 1.6 }, { type: 'modify', key: 'carry', add: 2 }],
  },
  {
    id: 'new_home',
    name: 'Nytt hjem',
    cost: { wood: 30, stone: 20 },
    costGrowth: 1.45,
    max: 3,
    requires: [{ built: 'fire' }, { noPending: 'hut' }],
    requireText: 'Krever Felles ild',
    effect: '+2 mennesker når hjemmet står ferdig.',
    world: 'Menneskene velger selv et sted og bygger en ny hytte. Leiren vokser utover.',
    actions: [{ type: 'construct', building: 'hut', onComplete: { spawnHumans: 2 } }],
  },
];

export const MILESTONES = [
  { id: 'first_home', title: 'Første hjem', text: 'Lyet står. Verden har fått et sted for liv.', when: { built: 'shelter' } },
  { id: 'first_fire', title: 'Første ild', text: 'Røyken stiger. Menneskene samles — og ber.', when: { built: 'fire' } },
  {
    id: 'settlement',
    title: 'Sammenhengende bosetting',
    text: 'Leiren er blitt en boplass. Verden åpner seg for blikket ditt.',
    when: { all: [{ built: 'fire' }, { builtCount: { types: ['shelter', 'hut'], n: 2 } }] },
    unlock: 'zoomArea',
  },
];

export const upgradeById = (id) => UPGRADES.find((u) => u.id === id);
