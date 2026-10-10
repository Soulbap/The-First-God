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
    foodHarvestSeconds: 16,
    foodPerHarvest: 3,
    foodForGrowth: 2,
    civilizationPopulationSeconds: 42,
  },
  building: {
    shelter: { radius: 26, work: 16, divine: true, minRing: 60 },
    fire: { radius: 14, work: 8, minRing: 20 },
    hut: { radius: 30, work: 26, minRing: 80 },
    storage: { radius: 32, work: 32, minRing: 80 },
    hearth: { radius: 25, work: 24, minRing: 52 },
    field: { radius: 38, work: 22, minRing: 130 },
    workshop: { radius: 34, work: 30, minRing: 125 },
    // GAMEPLAY-07/08: byinfrastruktur og sivilt bygg.
    sawmill: { radius: 38, work: 40, minRing: 120 },
    mason: { radius: 34, work: 40, minRing: 120 },
    townhouse: { radius: 34, work: 36, minRing: 80 },
    market: { radius: 42, work: 48, minRing: 70 },
    hall: { radius: 40, work: 56, minRing: 90 },
    // OPUS-02: byvekst og helligdom.
    well: { radius: 15, work: 18, minRing: 44 },
    warehouse: { radius: 40, work: 50, minRing: 100 },
    sanctuary: { radius: 22, work: 36, minRing: 40 },
  },
  // Boligkapasitet per bygg (tidlig sivilisasjon brukte 2 per hjem).
  housing: { shelter: 2, hut: 2, townhouse: 4 },
  // Foredling: autonome sykluser. Råvaren trekkes først når det finnes mer enn `reserve`,
  // slik at vanlige byggeprosjekter aldri sultes av sagbruket.
  production: {
    sawmill: { inputs: { wood: 3 }, outputs: { planks: 1 }, seconds: 10, reserve: 24, cap: 50 },
    mason: { inputs: { stone: 3 }, outputs: { cutstone: 1 }, seconds: 12, reserve: 18, cap: 36 },
    minPopulation: 2,
    marketCapMultiplier: 2, // torget gir større lagerplass for foredlede varer
    warehouseCapMultiplier: 1.5, // varehuset gir enda mer (OPUS-02)
  },
  // Kunnskap kommer bare fra faktisk virksomhet: foredling, verksteder og kunnskapshallen.
  knowledge: { perCycle: 0.25, workshopSeconds: 14, workshopYield: 0.25, hallSeconds: 8, hallYield: 0.5, hallPerPerson: 0.08, hallPopCap: 10, cityBonus: 1.25 },
  city: { minPopulation: 12, minFoodStock: 4, minFields: 2, minDeliveries: 6, minInfrastructure: 5 },
  realm: {
    maxSettlements: 4, foundingCooldown: 70, checkSeconds: 8, party: 3,
    supplies: { wood: 36, stone: 22 }, minFood: 6, minFoodHarvests: 3, minCapitalSurplus: 3,
    routeEstablishedTrips: 3, minSiteSpacing: 380, minSiteDistance: 420, maxSiteDistance: 1050,
  },
  // Verdens-regioner: avstand i «ruter». Reisetid er abstrakt (ingen individuell simulering utenfor kartet).
  globe: { cols: 5, rows: 3, expeditionSecondsPerStep: 55, outpostSecondsPerStep: 70, caravanSeconds: 46, caravanSpeed: 46, maxCaravans: 4,
    expedition: { wood: 30, food: 8 }, outpost: { wood: 60, stone: 30, planks: 8, food: 8 }, outpostParty: 3, outpostGrowSeconds: 55, outpostCap: 8, establishedPop: 6 },
  // OPUS-01 · Høstfest: overskuddsmat blir en samling ved ildstedet med dobbel bønn. Automatisk (idle), aldri tvunget.
  festival: { minFood: 30, base: 10, perPerson: 0.8, interval: 110, duration: 28, prayerMultiplier: 2, joinChance: 0.7 },
  settlement: { clearRadius: 150, localHomeCapacity: 2 },
  // OPUS-02 · Byplan: folket bygger selv videre når byen har overskudd. `reserve` er det som alltid blir igjen til innsikter.
  urban: { checkSeconds: 6, reserve: { wood: 140, stone: 100, planks: 14, cutstone: 10 } },
  // OPUS-02 · Takkoffer: PP-sluk. Hvert nivå reiser ett stykke av helligdommen; PrP ved Ragnarok vokser med kvadratrot (avtagende).
  offering: { max: 6, prpScale: 7 },
  // OPUS-02 · Dagklokke: ett døgn i spilltid. Brukes av både planeten og nærbildet (ingen offline-tid).
  day: { seconds: 480, startPhase: 0.3 },
  stats: { productionWindow: 60 },
  wear: { cell: 12, perSecondWalking: 0.22, transportMultiplier: 1.45, explorationMultiplier: 0.48, decayPerSecond: 0.0009 },
};
