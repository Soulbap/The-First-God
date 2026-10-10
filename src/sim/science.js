// OPUS-10: elektronikk, telegraf og forskningsinstitutt. Alt bygges autonomt av ekte innsatsvarer og
// drives av elektrisk kapasitet fra samme bosetting (src/sim/power.js). Forskningen bruker den eksisterende
// kunnskapen (`resources.knowledge`), ikke en egen valuta.
import { BALANCE as B } from '../data/balance.js';
import { startConstruction, findBuildSite } from './construction.js';
import { chronicle } from './chronicle.js';

const S = B.science;
const done = (s, type) => s.buildings.some((b) => b.complete && b.type === type);
const pending = (s, type) => s.buildings.some((b) => !b.complete && b.type === type);
const afford = (s, cost) => Object.entries(cost).every(([k, n]) => (s.resources[k] || 0) >= n);
const spend = (s, cost) => { for (const [k, n] of Object.entries(cost)) s.resources[k] -= n; };

function buildSite(s, type, cost) {
  if (done(s, type) || pending(s, type) || !afford(s, cost)) return;
  const site = findBuildSite(s, type, 'first');
  if (!site) return;
  spend(s, cost);
  startConstruction(s, type, { source: `science:${type}`, site, settlementId: 'first' });
}

function buildScience(s) {
  const Z = s.science;
  if (s.industrial.electronics && done(s, 'precision_works')) buildSite(s, 'electronics_works', B.industrial.factories.electronics_works.cost);
  if (Z.communication && done(s, 'electronics_works')) buildSite(s, 'telegraph', S.telegraph.cost);
  // Institutt krever en befolkning som kan lære og arbeide, ikke bare materialer.
  if (Z.research && done(s, 'telegraph') && s.humans.length >= S.institute.minPopulation) buildSite(s, 'research_institute', S.institute.cost);
}

// Telegrafen og instituttet trekker strøm fra bosettingens kapasitet, samme budsjett som fabrikkene.
function draw(s, perSecond, dt) {
  const budget = s.industrial.electricBudget?.first || 0, need = perSecond * dt;
  if (need <= 0 || budget < need) return false;
  s.industrial.electricBudget.first = budget - need;
  return true;
}

export function stepScience(s, dt) {
  if (!s.industrial?.enabled) return;
  const Z = s.science;
  buildScience(s);
  Z.telegraphActive = false;
  if (done(s, 'telegraph')) Z.telegraphActive = draw(s, S.telegraph.electric, dt);
  if (Z.telegraphActive && !Z.announcedTelegraph) {
    Z.announcedTelegraph = true;
    const t = s.buildings.find((b) => b.complete && b.type === 'telegraph');
    chronicle(s, 'science:telegraph', 'route', 'Telegrafen forbinder bosettingene med ord.', t ? { x: t.x, y: t.y } : null);
  }
  if (!Z.announcedElectronics && s.totals.electronics > 0) {
    Z.announcedElectronics = true;
    chronicle(s, 'science:electronics', 'work', 'Elektroniske styringssystemer forbedrer industrien.', null);
  }
  if (Z.research) for (const b of s.buildings) {
    if (!b.complete || b.type !== 'research_institute') continue;
    if (!draw(s, S.institute.electric, dt)) { b.active = false; b.idle = 'kraft'; continue; }
    const gain = S.institute.knowledgePerSecond * dt;
    b.active = true; b.idle = null;
    s.resources.knowledge += gain; s.totals.knowledge += gain; Z.researchKnowledge += gain;
    if (!Z.announcedResearch) {
      Z.announcedResearch = true;
      chronicle(s, 'science:institute', 'work', 'Et forskningsinstitutt har åpnet dørene.', { x: b.x, y: b.y });
    }
  }
}
