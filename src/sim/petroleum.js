// OPUS-08: petroleum og motorisering. Oljefeltet er begrenset og pumpes bare av en brønn. Råolje blir
// drivstoff i raffineriet (en fabrikk i industrial.js). Forbrenningsmotoren er en kraftkilde som brenner
// drivstoff mens den går. Lastebilverkstedet lager lastebiler, som reiser på land og bruker drivstoff per tur.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, findBuildSite, siteIsValid } from './construction.js';
import { inBounds, inPond, dist } from './world.js';
import { chronicle } from './chronicle.js';
import { createRng, rand, range } from '../core/rng.js';

const P = B.petroleum, C = B.combustion;
const done = (s, type, id = 'first') => s.buildings.some((b) => b.complete && b.type === type && (b.settlementId || 'first') === id);
const pending = (s, type, id = 'first') => s.buildings.some((b) => !b.complete && b.type === type && (b.settlementId || 'first') === id);
const afford = (s, cost) => Object.entries(cost).every(([k, n]) => (s.resources[k] || 0) >= n);
const spend = (s, cost) => { for (const [k, n] of Object.entries(cost)) s.resources[k] -= n; };

export const oilNodes = (s) => s.nodes.filter((n) => n.kind === 'mineral' && n.mineral === 'oil' && n.amount > 0);

// Oljefeltet opprettes ved petroleumskunnskap, ikke ved verdensstart. Det er seedet via egen generator (verdens
// hovedstrøm forskyves ikke), ligger sørover og er begrenset. Idempotent: et felt opprettes bare én gang.
export function ensureOilField(s) {
  if (s.nodes.some((n) => n.mineral === 'oil')) return;
  const C = s.settlement.center, rng = createRng((s.seed ^ 0x0f1e2d3c) >>> 0);
  let x = C.x + range(rng, -1, 1) * 820, y = C.y + range(rng, 460, 640);
  if (!inBounds(s, x, y, 80) || inPond(s, x, y, 60)) { x = C.x - 760; y = C.y + 520; }
  const F = P.field, add = (px, py, amount) => s.nodes.push({ id: s.nextId++, kind: 'mineral', mineral: 'oil', x: px, y: py, radius: 18, amount, maxAmount: amount, stone: amount, maxStone: amount, discovered: false, reservedBy: [] });
  add(x, y, F.reserve + Math.floor(rand(rng) * F.spread));
  // Et mindre felt østlig eller vestlig, oppdaget først når det første er nesten tomt (se discoverMinerals).
  const side = x < C.x ? 1 : -1;
  let x2 = C.x + side * range(rng, 700, 960), y2 = C.y + range(rng, -140, 260);
  if (!inBounds(s, x2, y2, 80) || inPond(s, x2, y2, 60) || dist(x2, y2, x, y) < 260) { x2 = C.x + side * 640; y2 = C.y - 40; }
  add(x2, y2, Math.round((F.reserve + Math.floor(rand(rng) * F.spread)) * F.secondShare));
}

// Brønnen skal stå nær det oppdagede feltet, men aldri på en ugyldig tomt. Søket er deterministisk.
function wellSite(s, node) {
  const [r0, r1] = P.well.reach;
  for (let r = r0; r <= r1; r += 12) for (let i = 0; i < 24; i++) {
    const a = s.settlement.angleOffset + (i / 24) * Math.PI * 2;
    const x = node.x + Math.cos(a) * r, y = node.y + Math.sin(a) * r * 0.72;
    if (inBounds(s, x, y, 70) && siteIsValid(s, 'oil_well', x, y)) return { x, y };
  }
  return null;
}

function buildPetroleum(s) {
  const I = s.industrial;
  if (I.petroleum && !done(s, 'oil_well') && !pending(s, 'oil_well') && afford(s, P.well.cost)) {
    const node = oilNodes(s).find((n) => n.discovered);
    const site = node && wellSite(s, node);
    if (site) { spend(s, P.well.cost); startConstruction(s, 'oil_well', { source: 'petroleum:oil_well', site, settlementId: 'first' }); }
  }
  if (I.refining && done(s, 'oil_well') && !done(s, 'refinery') && !pending(s, 'refinery') && afford(s, B.industrial.factories.refinery.cost)) {
    const site = findBuildSite(s, 'refinery', 'first');
    if (site) { spend(s, B.industrial.factories.refinery.cost); startConstruction(s, 'refinery', { source: 'petroleum:refinery', site, settlementId: 'first' }); }
  }
  // Motoren bygges først når raffineriet faktisk har levert drivstoff til lageret.
  if (I.combustion && done(s, 'refinery') && s.resources.fuel >= 1 && !done(s, 'combustion_engine') && !pending(s, 'combustion_engine') && afford(s, C.engine.cost)) {
    const site = findBuildSite(s, 'combustion_engine', 'first');
    if (site) {
      spend(s, C.engine.cost); startConstruction(s, 'combustion_engine', { source: 'petroleum:combustion', site, settlementId: 'first' });
    }
  }
  if (I.combustion && done(s, 'combustion_engine') && !done(s, 'motor_depot') && !pending(s, 'motor_depot') && afford(s, B.industrial.factories.motor_depot.cost)) {
    const site = findBuildSite(s, 'motor_depot', 'first');
    if (site) { spend(s, B.industrial.factories.motor_depot.cost); startConstruction(s, 'motor_depot', { source: 'petroleum:motor_depot', site, settlementId: 'first' }); }
  }
}

// Brønnen pumper et begrenset utbytte fra feltet. Uttaket er bundet til feltets gjenværende mengde.
function pump(s, b, dt) {
  const node = oilNodes(s).find((n) => n.discovered) || null;
  if (!node) return;
  const got = Math.min(P.well.crudePerSecond * dt, node.amount);
  node.amount -= got; s.resources.crudeOil += got; s.totals.crudeOil += got; s.industrial.crudeExtracted += got;
  if (got > 0 && !s.industrial.announcedOil) {
    s.industrial.announcedOil = true;
    chronicle(s, 'petroleum:first-well', 'work', 'Brønnen ved oljefeltet pumper råolje.', { x: b.x, y: b.y });
  }
}

// Forbrenningsmotoren krever drivstoff mens den går; uten drivstoff stopper den (ingen gratis kraft).
// OPUS-11: motoren er en reserve for dampmaskinen. Full forbrenning bare når bosettingens dampkraft ikke rekker til generatoren
// (steamPower); ellers går den på tomgang. Før gikk den på fullt hele tiden og tømte drivstoffet som fly og lastebiler trenger.
function operateCombustion(s, b, dt) {
  const cfg = C.engine;
  b.wear ??= 0; b.reliability ??= 1;
  const steam = s.buildings.filter((q) => q.complete && q.type === 'steam_engine' && (q.settlementId || 'first') === (b.settlementId || 'first')).reduce((n, q) => n + (q.availablePower || 0), 0);
  const needed = steam < B.electric.generator.steamPower;
  const burn = (needed ? cfg.fuelPerSecond : cfg.standbyFuelPerSecond) * dt;
  if (s.resources.fuel < burn) { b.availablePower = 0; b.active = false; b.idle = 'drivstoff'; return; }
  s.resources.fuel -= burn; s.industrial.fuelBurned += burn;
  b.availablePower = cfg.power * b.reliability; b.active = true; b.idle = null;
  b.wear += cfg.wearPerSecond * dt;
  if (b.wear >= cfg.repairAt) {
    if (afford(s, cfg.repair)) { spend(s, cfg.repair); b.wear = 0; b.reliability = Math.min(1, b.reliability + .2); s.industrial.repairs++; }
    else b.reliability = Math.max(.45, b.reliability - dt * .006);
  }
}

export function stepPetroleum(s, dt) {
  const I = s.industrial;
  if (!I.enabled) return;
  buildPetroleum(s);
  for (const b of s.buildings) if (b.complete && b.type === 'oil_well') pump(s, b, dt);
  for (const b of s.buildings) if (b.complete && b.type === 'combustion_engine') operateCombustion(s, b, dt);
  if (I.combustion && done(s, 'combustion_engine') && !I.announcedCombustion) {
    I.announcedCombustion = true;
    const b = s.buildings.find((q) => q.complete && q.type === 'combustion_engine');
    chronicle(s, 'petroleum:first-combustion', 'work', 'Menneskene har utviklet en forbrenningsmotor.', { x: b.x, y: b.y });
  }
}
