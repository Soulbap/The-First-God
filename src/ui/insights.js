// Ren visningsmodell for Innsikter-panelet og ressurslinjen. Leser spilltilstand; endrer den aldri.
// Kan testes uten DOM. Simuleringen eier regler (economy.js) og oppdagelse (discovery.js).
import { UPGRADES, MILESTONES } from '../data/upgrades.js';
import { RESOURCES, CATEGORIES, CATEGORY_RULES, EPOCHS } from '../data/gui.js';
import { upgradeStatus, currentCost, upgradeCount, requirementMet } from '../sim/economy.js';
import { isDiscovered } from '../sim/discovery.js';
import { productionRate } from '../sim/stats.js';

// Tall: heltall under 10 000, deretter «12,3k». Desimalkomma (bokmål).
export function fmtAmount(v) {
  const n = Math.max(0, Math.floor(v));
  if (n < 10000) return String(n);
  if (n < 1e6) return (n / 1000).toFixed(1).replace('.', ',') + 'k';
  return (n / 1e6).toFixed(1).replace('.', ',') + 'M';
}
export const fmtRate = (r) => '+' + r.toFixed(1).replace('.', ',') + '/s';

function listJoin(parts) {
  if (parts.length < 2) return parts.join('');
  return parts.slice(0, -1).join(', ') + ' og ' + parts[parts.length - 1];
}

// Én innsikt slik panelet skal vise den, eller null når den ikke skal vises (uoppdaget eller fullført).
export function insightCard(state, def) {
  const status = upgradeStatus(state, def); // 'locked' | 'unaffordable' | 'available' | 'building' | 'done'
  if (status === 'done' || !isDiscovered(state, def)) return null;
  const cost = Object.entries(currentCost(state, def)).map(([res, need]) => {
    const have = Math.floor(state.resources[res]);
    return { res, need, have, ok: have >= need, missing: Math.max(0, need - have) };
  });
  const shortfall = cost.filter((c) => !c.ok);
  const progress = cost.length ? Math.min(...cost.map((c) => Math.min(1, c.have / c.need))) : 1;
  const site = state.buildings.find((b) => b.source === def.id && !b.complete);
  const builds = def.actions.some((a) => a.type === 'construct');
  return {
    id: def.id,
    name: def.name,
    icon: def.icon,
    category: def.category,
    effect: def.effect,
    world: def.world,
    status,
    cost,
    progress,
    missingText: shortfall.length ? 'Mangler ' + listJoin(shortfall.map((c) => `${c.missing} ${RESOURCES[c.res].unit}`)) : '',
    requireText: status === 'locked' ? def.requireText || 'Ikke tilgjengelig ennå' : '',
    buildProgress: site ? site.progress : null,
    level: def.max > 1 ? { count: upgradeCount(state, def.id), max: def.max } : null,
    verb: builds ? 'Bygg' : 'Lås opp',
    discoveredAt: state.discovered[def.id] ?? null,
  };
}

// Aktive innsikter i dataenes rekkefølge (stabil — kort hopper ikke når ressurser endres),
// og kategorifaner bare når minst to kategorier har innhold.
export function selectInsights(state) {
  const cards = UPGRADES.map((def) => insightCard(state, def)).filter(Boolean);
  const categories = CATEGORIES.map((c) => ({ ...c, count: cards.filter((k) => k.category === c.id).length })).filter((c) => c.count > 0);
  return {
    cards,
    categories,
    showTabs: categories.length >= CATEGORY_RULES.minForTabs,
    availableCount: cards.filter((c) => c.status === 'available').length,
  };
}

export function selectResources(state) {
  const rate = productionRate(state);
  const auto = state.humans.length > 0;
  const out = [
    { id: 'wood', value: state.resources.wood, rate: auto ? rate.wood : null },
    { id: 'stone', value: state.resources.stone, rate: auto ? rate.stone : null },
  ];
  if (state.humans.length) out.push({ id: 'people', value: state.humans.length, rate: null });
  if (state.civilization?.foodUnlocked || state.resources.food > 0) out.push({ id: 'food', value: state.resources.food, rate: null });
  return out;
}

// PP vises først når bønn faktisk er mulig (bål står) eller det finnes PP.
export function selectDivine(state) {
  const visible = state.buildings.some((b) => b.type === 'fire' && b.complete) || state.resources.pp > 0;
  return visible ? { id: 'pp', value: state.resources.pp } : null;
}

export function currentEpoch(state) {
  const epoch = EPOCHS[0]; // Senere: velg epoke etter progresjon.
  let stage = epoch.stages[0];
  for (const s of epoch.stages) if (s.when.every((r) => requirementMet(state, r))) stage = s;
  return { id: epoch.id, name: epoch.name, stage: stage.title };
}

export function reachedMilestones(state) {
  return MILESTONES.filter((m) => state.milestones[m.id] != null)
    .sort((a, b) => state.milestones[a.id] - state.milestones[b.id])
    .map((m) => ({ id: m.id, title: m.title, text: m.text, opens: (m.unlock === 'zoomArea' || m.unlock === 'villageView') ? 'Viser bosettingen i områdevisning' : '' }));
}
