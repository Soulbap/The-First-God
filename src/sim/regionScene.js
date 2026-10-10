// Deterministisk lokal projeksjon av et fjernt land. Den er kun en visning av den autoritative
// regiontilstanden i worldmap.js: ingen ressurser, mennesker eller bygg skrives tilbake herfra.
import { createWorld } from './world.js';
import { regionById, regionState } from './worldmap.js';
import { BALANCE as B } from '../data/balance.js';

const hash = (seed, r) => ((seed ^ ((r.col + 17) * 73856093) ^ ((r.row + 29) * 19349663)) >>> 0);
const radius = (type) => B.building[type].radius;

function building(scene, type, x, y, id, settlementId = 'outpost') {
  return { id, type, x, y, radius: radius(type), progress: 1, work: B.building[type].work, workNeeded: B.building[type].work, complete: true, divine: false, builders: [], settlementId, source: 'regional-projection' };
}

export function projectRegionScene(state, id) {
  const region = regionById(state, id);
  if (!region || region.home || region.state === regionState.UKJENT) return null;
  const scene = createWorld(hash(state.seed, region));
  const C = scene.settlement.center;
  scene.time = state.time;
  scene.settlement = { center: C, angleOffset: scene.settlement.angleOffset };
  scene.settlements = [{ id: 'outpost', name: region.name, x: C.x, y: C.y, state: 'active', population: [], kind: 'outpost', projectsDone: 0, role: region.biome, stage: region.state === regionState.ETABLERT ? 'Landsby' : 'Leir' }];
  scene.resources = { wood: 0, stone: 0, food: 0, planks: 0, cutstone: 0, copperOre: 0, tinOre: 0, ironOre: 0, charcoal: 0, copper: 0, bronze: 0, iron: 0, knowledge: 0, pp: 0 };
  scene.totals = { ...scene.resources, manualClicks: 0 };
  scene.globe = { ...state.globe, caravans: [], mission: null }; // ingen hjemme-karavaner i et fjernt lands bilde.
  scene.regionProjection = { id: region.id, name: region.name, biome: region.biome, state: region.state, population: region.pop };
  // Biomet former den faktiske lokale ressurslesningen uten å endre den globale økonomien.
  if (region.biome === 'fjell') scene.nodes = scene.nodes.filter((n) => n.kind === 'rock' || n.x % 3 === 0);
  if (region.biome === 'slette') scene.nodes = scene.nodes.filter((n) => n.kind !== 'tree' || n.x % 4 === 0);
  if (region.biome === 'kyst') scene.world.pond = { x: C.x - 310, y: C.y + 80, rx: 300, ry: 130 };
  // Besøket er bare en projeksjon: forekomsten leses fra regionens samme
  // beholdning og skriver aldri tilbake en ny, lokal økonomi.
  for (const mineral of ['copperOre', 'tinOre', 'ironOre']) if ((region.inventory?.[mineral] || 0) > 0) {
    const i = scene.nodes.length;
    scene.nodes.push({ id: scene.nextId++, kind: 'mineral', mineral, x: C.x + (i % 2 ? 180 : -190), y: C.y - 150 + (i % 3) * 72, radius: 18, amount: region.inventory[mineral], maxAmount: region.inventory[mineral], stone: region.inventory[mineral], maxStone: region.inventory[mineral], discovered: true, reservedBy: [] });
  }
  if (region.state === regionState.UTPOST || region.state === regionState.ETABLERT) {
    const n = Math.max(1, region.pop);
    scene.buildings.push(building(scene, 'hut', C.x - 18, C.y + 8, 900001));
    scene.buildings.push(building(scene, 'fire', C.x + 38, C.y + 30, 900002));
    if (region.state === regionState.ETABLERT) {
      scene.buildings.push(building(scene, 'storage', C.x + 84, C.y - 22, 900003));
      scene.buildings.push(building(scene, 'hut', C.x - 86, C.y - 28, 900004));
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + (region.col + region.row) * 0.7;
      const h = { id: 910000 + i, x: C.x + Math.cos(a) * (32 + (i % 3) * 12), y: C.y + Math.sin(a) * 24, tx: C.x, ty: C.y, state: 'idle', away: false, settlementId: 'outpost', carry: { type: null, amount: 0 }, look: { tunic: 2 + (i % 3), skin: i % 4, hair: (i + 1) % 4, height: 0.9 + (i % 3) * 0.06, pace: 1 } };
      scene.humans.push(h); scene.settlements[0].population.push(h.id);
    }
  }
  return scene;
}
