// Provisoriske balanseverdier for Genesis-01. Alle tider er i spillsekunder.
// Justeres her — ikke i simulering eller UI.
export const BALANCE = {
  dt: 1 / 60,
  world: { width: 2400, height: 1600 },
  manual: { woodPerClick: 1, stonePerClick: 1 },
  tree: {
    maxWood: { birch: 12, spruce: 14 },
    harvestMinGrowthManual: 0.3,  // spilleren kan hugge unge trær
    harvestMinGrowthHuman: 0.6,   // mennesker lar unge trær stå
    growthPerSecond: 1 / 120,     // ca. 2 minutter fra spire til fullvoksen
    stumpRegrowSeconds: 30,
    saplingStartGrowth: 0.04,
    seedIntervalSeconds: 12,
    seedChance: 0.75,
    maxTrees: 130,
    minSpacing: 32,
  },
  rock: { regenSeconds: 35, maxGatherers: 2 },
  human: {
    speed: 30,
    gatherSeconds: 1.3,
    carry: 3,
    buildRate: 1,
    maxBuilders: 2,
    restEveryDeliveries: 3,
    restSeconds: [6, 10],
    prayerPP: 1,
    idleSeconds: [1.5, 3.5],
    villageRestEveryDeliveries: 2,
    maintenanceSeconds: [2.5, 5],
    explorationSeconds: [5, 9],
    explorationCooldown: 42,
    foundingParty: 3,
    regionalDelivery: 4,
    regionalPopulationSeconds: 34,
  },
  building: {
    shelter: { radius: 26, work: 16, divine: true, minRing: 60 },
    fire: { radius: 14, work: 8, minRing: 20 },
    hut: { radius: 30, work: 26, minRing: 110 },
    storage: { radius: 32, work: 32, minRing: 105 },
    hearth: { radius: 25, work: 24, minRing: 52 },
  },
  settlement: { clearRadius: 150, localHomeCapacity: 2 },
  stats: { productionWindow: 60 },
  wear: { cell: 12, perSecondWalking: 0.22, transportMultiplier: 1.45, explorationMultiplier: 0.48, decayPerSecond: 0.0009 },
};
