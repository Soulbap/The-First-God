// Provisoriske balanseverdier for Genesis-01. Alle tider er i spillsekunder.
// Justeres her — ikke i simulering eller UI.
export const BALANCE = {
  dt: 1 / 60,
  world: { width: 3600, height: 2400 }, // OPUS-11: større hjemmeregion (var 2400 × 1600), samme 3:2-forhold (planetprojeksjonen er uendret)
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
    maxTrees: 520,
    minSpacing: 32,
  },
  // Løse steiner bærer den første byggingen; større forekomster er fortsatt verdifulle senere.
  // OPUS-11: flere tidlige steiner (12 → 18, hvorav 9 nær leiren) og steinutspring i steinrike soner (se landscape.js).
  rock: { regenSeconds: 35, maxGatherers: 2, earlyDeposits: 18, earlyNear: 9, earlyRadius: 430 },
  // OPUS-11 · landskap: bekkens bredde/avstand mellom ledd, hvor langt unna leiren bekk, innsjø og steinutspring legges.
  landscape: { areaScale: 1.6, streamWidth: 13, streamClear: 330, lakeClear: 520, outcropClear: 240 },
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
    // OPUS-11: lagertak for tre og stein (grunnnivå + per innbygger). Over taket sanker ikke folk den varen.
    stockCap: { wood: 700, stone: 600, perPerson: 12, satelliteShare: 0.45, satelliteMineral: 36, mineralReach: 520 },
    foodHarvestSeconds: 16,
    foodPerHarvest: 3,
    foodForGrowth: 2,
    foodPerPersonSecond: 0.0014, // OPUS-12: folk spiser; en bosetting uten mat stagnerer
    eatSeconds: 8,
    foodStore: { base: 80, perPerson: 14 }, // maksimalt matlager i en bosetting (base + per innbygger)
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
    mine: { radius: 28, work: 34, minRing: 150 },
    charcoal_kiln: { radius: 24, work: 28, minRing: 145 },
    smelter: { radius: 32, work: 42, minRing: 145 },
    dock: { radius: 30, work: 38, minRing: 135 },
    boatyard: { radius: 34, work: 44, minRing: 145 },
    watermill: { radius: 38, work: 52, minRing: 150 },
    windmill: { radius: 36, work: 50, minRing: 170 },
    coal_mine: { radius: 32, work: 42, minRing: 160 },
    steam_engine: { radius: 36, work: 52, minRing: 145 },
    metalworks: { radius: 46, work: 64, minRing: 160 },
    locomotive_workshop: { radius: 44, work: 60, minRing: 160 },
    rail_terminal: { radius: 28, work: 34, minRing: 140 },
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
    // OPUS-12: allmenning (landsby) og park (by) er åpne møteplasser — folk samles der i stedet for alltid ved bålet.
    commons: { radius: 30, work: 14, minRing: 50 },
    park: { radius: 36, work: 26, minRing: 80 },
    // OPUS-08: elektrisitet, petroleum og motorisering.
    generator: { radius: 36, work: 58, minRing: 150 },
    grid_station: { radius: 24, work: 30, minRing: 150 },
    oil_well: { radius: 30, work: 44, minRing: 170 },
    refinery: { radius: 46, work: 70, minRing: 240 },
    combustion_engine: { radius: 34, work: 50, minRing: 150 },
    motor_depot: { radius: 44, work: 60, minRing: 165 },
    // OPUS-09: presisjon, flyverksted og flyplass.
    precision_works: { radius: 40, work: 62, minRing: 150 },
    aircraft_works: { radius: 50, work: 80, minRing: 240 },
    airfield: { radius: 60, work: 96, minRing: 420 },
    // OPUS-10: elektronikk, kommunikasjon og vitenskap.
    electronics_works: { radius: 38, work: 66, minRing: 160 },
    telegraph: { radius: 22, work: 34, minRing: 150 },
    research_institute: { radius: 48, work: 84, minRing: 165 },
  },
  // Boligkapasitet per bygg (tidlig sivilisasjon brukte 2 per hjem).
  housing: { shelter: 2, hut: 2, townhouse: 4 },
  // Boligplass per trinn (OPUS-11): ly 2, halmhytte 2, tømmerstue 3, steinhus 4, bygård 6, moderne blokk 8.
  housingByTier: [2, 2, 3, 4, 6, 8],
  // Foredling: autonome sykluser. Råvaren trekkes først når det finnes mer enn `reserve`,
  // slik at vanlige byggeprosjekter aldri sultes av sagbruket.
  production: {
    sawmill: { inputs: { wood: 3 }, outputs: { planks: 1 }, seconds: 10, reserve: 24, cap: 50 },
    mason: { inputs: { stone: 3 }, outputs: { cutstone: 1 }, seconds: 12, reserve: 18, cap: 36 },
    minPopulation: 2,
    marketCapMultiplier: 2, // torget gir større lagerplass for foredlede varer
    warehouseCapMultiplier: 1.5, // varehuset gir enda mer (OPUS-02)
  },
  // OPUS-04: få, lesbare materialer. Tallene er bevisst små nok til at kjeden
  // blir synlig før den fyller hele byen med industri.
  materials: {
    discoverKnowledge: 18, mineReserve: { wood: 34, stone: 18 }, kilnReserve: { wood: 26, stone: 12 }, smelterReserve: { wood: 38, stone: 26, planks: 4 },
    carry: 2, gatherSeconds: 2.1, charcoal: { wood: 3, out: 1, seconds: 9 },
    copper: { ore: 2, fuel: 1, out: 1, seconds: 12 }, bronze: { copper: 2, tin: 1, fuel: 1, out: 1, seconds: 15 }, iron: { ore: 2, fuel: 2, out: 1, seconds: 17 },
    storageCap: 40, tradeSecondsPerStep: 38, maxTrade: 3,
    // Malmbudsjett: kobber/tinn/jern-årer ~100 enheter hver (tidligere 22–34). Iron krever 2 malm per jern,
    // så jern fra én åre er ca. 50; industrikjeden trenger flere hundre jern totalt, og handel gir resten.
    oreReserve: 100, oreSpread: 40,
    // OPUS-11 · Ressursgeografi: antall årer, avstand fra bygdens hjerte, rikdom per frø og hvor stor del senere årer har.
    // Industrikjeden bruker til sammen flere hundre jern; derfor flere årer enn én, og kull og olje er dimensjonert etter forbruk.
    veins: {
      copperOre: { count: 3, dist: [380, 1000], reserve: 100, spread: 40, richness: [0.8, 1.3], laterShare: 0.9 },
      tinOre: { count: 2, dist: [700, 1100], reserve: 100, spread: 40, richness: [0.8, 1.3], laterShare: 0.8 },
      ironOre: { count: 5, dist: [650, 1200], reserve: 125, spread: 50, richness: [0.9, 1.35], laterShare: 1 },
      coal: { count: 3, dist: [520, 1100], reserve: 700, spread: 160, richness: [0.8, 1.25], laterShare: 0.9 },
    },
    // Neste åre av samme mineral blir kjent når alle kjente årer er under denne andelen av opprinnelig mengde.
    prospectBelow: 0.55,
    // Folk fortsetter å hente malm til lageret når denne summen er under målet (tidligere 18: stoppet for tidlig).
    oreStockTarget: 40,
    // Lagermål per vare (OPUS-11). Utvinning og smelting styres av relativ mangel; vekt > 1 gir kull og jern forrang.
    stockTargets: { coal: 60, ironOre: 40, ironOreEarly: 12, copperOre: 24, tinOre: 12, copper: 30, bronze: 12, iron: 60, weight: { coal: 1.4, ironOre: 1.2 } },
  },
  // Kunnskap kommer bare fra faktisk virksomhet: foredling, verksteder og kunnskapshallen.
  knowledge: { perCycle: 0.25, workshopSeconds: 14, workshopYield: 0.25, hallSeconds: 8, hallYield: 0.5, hallPerPerson: 0.08, hallPopCap: 10, cityBonus: 1.25 },
  city: { minPopulation: 12, minFoodStock: 4, minFields: 2, minDeliveries: 6, minInfrastructure: 5 },
  // OPUS-11 · Boligtrinn (se src/sim/renovation.js): krav per trinn (bosettingens trinn og kunnskap), kostnad og tid, og plassbehov.
  renovation: {
    requires: { 2: { rank: 3 }, 3: { rank: 4, upgrade: 'construction_methods' }, 4: { rank: 4, upgrade: 'factory_manufacture' }, 5: { rank: 5, upgrade: 'electric_power' } },
    tiers: {
      2: { cost: { wood: 18, stone: 10, planks: 2 }, seconds: 30 },
      3: { cost: { wood: 24, stone: 30, planks: 6, cutstone: 8 }, seconds: 50 },
      4: { cost: { planks: 12, cutstone: 10, iron: 1 }, seconds: 70 },
      5: { cost: { planks: 14, cutstone: 12, copper: 1 }, seconds: 90 },
    },
    radius: { 3: 34, 4: 36, 5: 38 },
    // OPUS-12C.2: et eksisterende, ikke-vernet hjem kan gjenoppføres på en
    // bedre gateparsell. Det gamle står til arbeidet er ferdig; litt materiale
    // berges ved kontrollert riving. Tallene er provisoriske.
    restructuring: {
      minOccupancy: 0.66, minScore: 18, seconds: 96,
      cost: { wood: 24, stone: 22, planks: 6, cutstone: 5 },
      salvage: { wood: 4, stone: 4 },
    },
  },
  // OPUS-11: ekstra luft mellom bygg i samme bosetting etter trinn (Leir, Grend, Landsby, Voksende landsby, Tidlig by, By, Storby).
  // Landsbyen beholder luft; fra tidlig by fylles tomter langs eksisterende gater tettere.
  spacing: { byStage: [20, 18, 13, 7, 2, 0, 0] },
  realm: {
    maxSettlements: 4, foundingCooldown: 70, checkSeconds: 8, party: 3,
    supplies: { wood: 36, stone: 22 }, minFood: 6, minFoodHarvests: 3, minCapitalSurplus: 3,
    routeEstablishedTrips: 3, minSiteSpacing: 780, minSiteDistance: 820, maxSiteDistance: 1500,
  },
  // Verdens-regioner: avstand i «ruter». Reisetid er abstrakt (ingen individuell simulering utenfor kartet).
  globe: { cols: 5, rows: 3, expeditionSecondsPerStep: 55, outpostSecondsPerStep: 70, caravanSeconds: 46, caravanSpeed: 46, maxCaravans: 4,
    expedition: { wood: 30, food: 8 }, outpost: { wood: 60, stone: 30, planks: 8, food: 8 }, outpostParty: 3, outpostGrowSeconds: 55, outpostCap: 8, establishedPop: 6,
    // OPUS-11 · regionale lagre: forekomstens størrelse (tung = malm/kull/olje), uttak per person per sekund, lagerplass,
    // bolig (grunnplass + per hus), og byggematerialer for ett nytt hus fra regionens eget lager.
    depositHeavy: 70, extractPerPop: 0.045, stockCap: 90, landCapacity: 14, baseHousing: 4, housingPerHome: 2, maxHomes: 6, homeMaterials: 26, homeSeconds: 70 },
  navigation: { dock: { wood: 34, stone: 12, planks: 8 }, boat: { wood: 18, planks: 6 }, sail: { wood: 28, planks: 12 }, surveySeconds: 72, maxVessels: 3 },
  // OPUS-06: kapasitet, ikke et globalt nett. Én mølle dekker sin egen bosettings
  // tre lokale foredlingsspor; effekt og slitasje er aggregert og deterministisk.
  mechanical: {
    components: { wood: 4, metal: 1, out: 2, seconds: 16 },
    watermill: { wood: 44, stone: 28, planks: 8, mechanicalComponents: 3 },
    windmill: { wood: 38, stone: 20, planks: 10, mechanicalComponents: 3 },
    minDemand: 2, power: 3, craftMultiplier: 1.65, foodMultiplier: 1.3, ironReserve: 12,
    wearPerSecond: 0.0012, repairAt: 0.42, repair: { wood: 2, mechanicalComponents: 1 },
  },
  industrial: {
    // Kullbudsjett (dokumentert i docs/opus-08-10/REPORT.md): reserve ≈ 6 timer industri før nye felt eller handel.
    coalReserve: 800, coalReserveSpread: 160,
    coalMine: { wood: 46, stone: 34, planks: 10, iron: 2 },
    // coalPerSecond brukes når det finnes forbruk; standbyCoalPerSecond når dampmaskinen bare står klar.
    engine: { cost: { wood: 34, stone: 24, planks: 12, iron: 4, mechanicalComponents: 4 }, minCoal: 4, coalPerSecond: 0.025, standbyCoalPerSecond: 0.002, power: 5, wearPerSecond: 0.0015, repairAt: 0.44, repair: { wood: 2, mechanicalComponents: 1 } },
    // electric: strøm per sekund når fabrikken kjører på strøm i stedet for mekanisk kraft (OPUS-08).
    factories: {
      metalworks: { cost: { wood: 62, stone: 48, planks: 18, iron: 5, mechanicalComponents: 4 }, inputs: { iron: 1, coal: 1 }, outputs: { industrialMachinery: 1 }, seconds: 18, power: 1, electric: 1.5, cap: { industrialMachinery: 8 } },
      locomotive_workshop: { cost: { wood: 54, stone: 38, planks: 16, iron: 4, mechanicalComponents: 3 }, inputs: { industrialMachinery: 1, iron: 1 }, outputs: { railwayComponents: 1 }, seconds: 20, power: 1, electric: 1.5, cap: { railwayComponents: 4 } },
      // OPUS-08: raffinering og lastebilbygging bruker de samme reglene for innsatsvarer og kraft.
      refinery: { cost: { wood: 50, stone: 36, planks: 12, iron: 6, industrialMachinery: 2 }, inputs: { crudeOil: 2 }, outputs: { fuel: 1 }, seconds: 14, power: 1, electric: 1.5 },
      // cap: verkstedet slutter å bygge når flåten er full, slik at jern ikke tømmes på lastebiler som ingen trenger.
      motor_depot: { cost: { wood: 40, stone: 24, planks: 14, iron: 6, industrialMachinery: 2 }, inputs: { iron: 2, industrialMachinery: 1, planks: 4 }, outputs: { truck: 1 }, seconds: 24, power: 1, electric: 1.5, cap: { truck: 3 } },
      // OPUS-09: presisjonskomponenter er en gruppert mellomvare; flyverket bygger fly bare av slike komponenter.
      precision_works: { cost: { wood: 44, stone: 30, planks: 12, iron: 8, industrialMachinery: 2 }, inputs: { iron: 1, industrialMachinery: 1, copper: 1 }, outputs: { precisionComponents: 1 }, seconds: 22, power: 1, electric: 1.5, cap: { precisionComponents: 12 } },
      // OPUS-10: elektronikk krever elektrisk kraft alene (ingen mekanisk reserve) og gir styringskomponenter.
      electronics_works: { cost: { wood: 40, stone: 26, planks: 14, copper: 10, iron: 6, industrialMachinery: 2 }, inputs: { precisionComponents: 1, copper: 1, industrialMachinery: 1 }, outputs: { electronics: 1 }, seconds: 30, power: 0, electricOnly: true, electric: 1.5, cap: { electronics: 6 } },
      aircraft_works: { cost: { wood: 60, stone: 40, planks: 22, iron: 10, precisionComponents: 4, industrialMachinery: 2 }, inputs: { precisionComponents: 3, planks: 6, iron: 2 }, outputs: { aircraft: 1 }, seconds: 40, power: 1, electric: 1.5, cap: { aircraft: 2 } },
    },
    rail: { cost: { wood: 70, planks: 24, iron: 8, railwayComponents: 2 }, maxDistance: 1700, travelSeconds: 28, load: 12 },
    locomotive: { wood: 20, iron: 6, industrialMachinery: 2, railwayComponents: 2 },
  },
  // OPUS-08: elektrisk kraft er kapasitet, ikke lager. Generatoren krever damp eller
  // forbrenningskraft i sin bosetning; nettstasjonen dekker bare den bosettingen (ingen overføring).
  electric: {
    generator: { cost: { wood: 40, stone: 26, planks: 12, iron: 6, copper: 4 }, steamPower: 4, output: 6 },
    grid: { cost: { planks: 14, copper: 6, iron: 4 } },
    speed: 1.35, // elektriske fabrikker arbeider raskere enn mekaniske (ingen global bonus)
  },
  // OPUS-08: petroleum er en begrenset åre (oljefelt) som pumpes av en brønn og raffineres.
  petroleum: {
    well: { cost: { wood: 40, stone: 20, planks: 10, iron: 4, industrialMachinery: 1 }, crudePerSecond: 0.05, reach: [70, 200] },
    // OPUS-11: to felt (tidligere ett på 30–44). Raffinering krever 2 olje per drivstoff; motorer og lastebiler brenner drivstoff i timevis.
    field: { reserve: 260, spread: 100, secondShare: 0.6 },
  },
  // OPUS-08: forbrenningsmotor er kraftkilde som bruker raffinert drivstoff; lastebiler frakter planker på land.
  combustion: {
    engine: { cost: { wood: 20, iron: 6, industrialMachinery: 2, mechanicalComponents: 2 }, power: 4, fuelPerSecond: 0.02, standbyFuelPerSecond: 0.0015, wearPerSecond: 0.0012, repairAt: 0.44, repair: { iron: 1, planks: 2 } },
    road: { maxDistance: 1500, load: 4, cargo: 'planks', reserve: 40, fuelPerTrip: 1, travelSeconds: 20, tripsBeforeService: 3, service: { iron: 1, planks: 2 } },
  },
  // OPUS-09: fly er lokale oppdrag, ikke et globalt flysystem. Hver flyvning bruker drivstoff og tid,
  // har begrenset rekkevidde og gir kartkunnskap bare over steder som allerede er kjent.
  aviation: {
    airfield: { cost: { planks: 40, stone: 30, cutstone: 12, iron: 4, industrialMachinery: 1 } },
    flight: { maxSteps: 3, fuelPerStep: 1, secondsPerStep: 30, serviceAfter: 2, service: { precisionComponents: 1, iron: 1 } },
    // Den første flyvningen gir en lesbar kronikk; luftmålinger teller bare når de faktisk er fullført.
    surveysForCamera: 3,
  },
  // OPUS-10: kommunikasjon og forskning. Telegrafen dekker bare sin bosetting og krever strøm; flyoppdrag
  // koordineres bare via en aktiv telegraf. Forskningsinstituttet bruker strøm og gir den eksisterende kunnskapen.
  science: {
    telegraph: { cost: { copper: 6, electronics: 1, planks: 6 }, electric: 0.3 },
    institute: { cost: { planks: 40, stone: 30, cutstone: 14, copper: 8, electronics: 2, industrialMachinery: 2 }, electric: 1, knowledgePerSecond: 0.35, minPopulation: 20 },
  },
  // OPUS-01 · Høstfest: overskuddsmat blir en samling ved ildstedet med dobbel bønn. Automatisk (idle), aldri tvunget.
  festival: { minFood: 30, base: 10, perPerson: 0.8, interval: 110, duration: 28, prayerMultiplier: 2, joinChance: 0.7 },
  settlement: { clearRadius: 150, localHomeCapacity: 2 },
  // OPUS-12 · Flytting: sjekkes jevnlig; bare ledig bolig og mat trekker, og bare trangboddhet eller langvarig sult presser.
  migration: { cooldown: 900, joblessMargin: 4, checkSeconds: 24, maxInFlight: 2, hungerSeconds: 90, minFoodToReceive: 8, maxDistance: 1700 },
  // OPUS-12 · Handel: hovedstaden importerer under `capitalLow`; en satellitt eksporterer bare over `satelliteKeep` (mineraler: alt).
  // Mat fra hovedstaden til en sultende satellitt først når hovedstaden har minst `capitalFoodSurplus`.
  trade: { checkSeconds: 4, maxQueued: 10, minBatch: 2, capitalLow: { wood: 100, stone: 80, planks: 16, cutstone: 12, food: 20 }, satelliteKeep: { wood: 120, stone: 90, planks: 20, cutstone: 14, food: 16 }, capitalFoodSurplus: 40, satelliteFoodLow: 6 },
  // OPUS-02 · Byplan: folket bygger selv videre når byen har overskudd. `reserve` er det som alltid blir igjen til innsikter.
  urban: { checkSeconds: 6, reserve: { wood: 140, stone: 100, planks: 14, cutstone: 10 } },
  // OPUS-02 · Takkoffer: PP-sluk. Hvert nivå reiser ett stykke av helligdommen; PrP ved Ragnarok vokser med kvadratrot (avtagende).
  offering: { max: 6, prpScale: 4 },
  // OPUS-02 · Dagklokke: ett døgn i spilltid. Brukes av både planeten og nærbildet (ingen offline-tid).
  day: { seconds: 480, startPhase: 0.3 },
  stats: { productionWindow: 60 },
  wear: { cell: 12, perSecondWalking: 0.22, transportMultiplier: 1.45, explorationMultiplier: 0.48, decayPerSecond: 0.0009 },
};
