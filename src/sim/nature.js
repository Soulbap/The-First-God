// Vegetasjon og stein: vekst, hogst, felling, gjenvekst, frøspredning og steinfornyelse.
import { BALANCE as B } from '../data/balance.js';
import { rand, range } from '../core/rng.js';
import { isFreeForTree, makeTree } from './world.js';

const T = B.tree;

export const maxWood = (t) => T.maxWood[t.species];
export const treeCapacity = (t) => Math.floor(maxWood(t) * t.growth);
export const treeAvailable = (t) => (t.state === 'alive' ? Math.max(0, treeCapacity(t) - t.chopped) : 0);

export function fellTree(state, t) {
  state.events.push({ type: 'treeFelled', id: t.id, x: t.x, y: t.y, species: t.species, variant: t.variant, growth: t.growth });
  t.state = 'stump';
  t.stump = true;
  t.fellGrowth = t.growth;
  t.timer = T.stumpRegrowSeconds;
  t.chopped = 0;
}

// Folk rydder tomta før de bygger i en bygd: trær rundt det nye bygget felles og blir ikke stående som stubber som gror igjen.
// (Bare presentasjon og plass — ryddingen gir ikke trevirke, så økonomien er uendret.)
export function clearTrees(state, x, y, r) {
  let n = 0;
  for (const t of state.nodes) {
    if (t.kind !== 'tree' || t.state !== 'alive' || Math.hypot(t.x - x, (t.y - y) * 1.2) > r) continue;
    fellTree(state, t);
    t.cleared = true; t.timer = 3 + (t.id % 7); // blir liggende et øyeblikk, så fjernes stubben
    n++;
  }
  return n;
}

export function harvestTree(state, t, amount) {
  const take = Math.min(amount, treeAvailable(t));
  if (take <= 0) return 0;
  t.chopped += take;
  if (treeAvailable(t) === 0) fellTree(state, t);
  return take;
}

export function harvestRock(state, r, amount) {
  const take = Math.min(amount, r.stone);
  if (take <= 0) return 0;
  r.stone -= take;
  if (r.stone === 0) state.events.push({ type: 'rockDepleted', id: r.id, x: r.x, y: r.y });
  return take;
}

export function stepNature(state, dt) {
  for (const n of state.nodes) {
    if (n.kind === 'tree') {
      if (n.state === 'alive') {
        if (n.growth < 1) n.growth = Math.min(1, n.growth + T.growthPerSecond * (state.modifiers.treeGrowth || 1) * n.vigor * (1.15 - 0.3 * n.growth) * dt);
        if (n.stump && n.growth > 0.45) n.stump = false;
      } else {
        n.timer -= dt;
        if (n.timer <= 0 && n.cleared) { n.removed = true; continue; }
        if (n.timer <= 0) {
          n.state = 'alive';
          n.growth = T.saplingStartGrowth;
          n.chopped = 0;
          state.events.push({ type: 'sprout', id: n.id, x: n.x, y: n.y });
        }
      }
    } else if (n.stone < n.maxStone) {
      n.regenTimer += dt;
      if (n.regenTimer >= B.rock.regenSeconds * (state.modifiers.rockRegen || 1)) { n.regenTimer = 0; n.stone++; }
    } else {
      n.regenTimer = 0;
    }
  }
  if (state.nodes.some((n) => n.removed)) state.nodes = state.nodes.filter((n) => !n.removed);
  state.timers.seed -= dt;
  if (state.timers.seed <= 0) {
    state.timers.seed = T.seedIntervalSeconds;
    seedTree(state);
  }
}

// Et modent tre sprer et frø til en ledig plass i nærheten.
export function seedTree(state) {
  const trees = state.nodes.filter((n) => n.kind === 'tree');
  if (trees.length >= T.maxTrees || rand(state.rng) > T.seedChance) return null;
  const parents = trees.filter((t) => t.state === 'alive' && t.growth > 0.85);
  if (!parents.length) return null;
  const p = parents[Math.floor(rand(state.rng) * parents.length)];
  for (let i = 0; i < 6; i++) {
    const a = rand(state.rng) * Math.PI * 2, d = range(state.rng, 40, 110);
    const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.75;
    if (!isFreeForTree(state, x, y)) continue;
    const t = makeTree(state, p.species, x, y, T.saplingStartGrowth);
    state.nodes.push(t);
    state.events.push({ type: 'sprout', id: t.id, x, y });
    return t;
  }
  return null;
}
