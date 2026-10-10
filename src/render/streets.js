// OPUS-02 · Gatenettet. Ren avledning av bosettingens bygg — ingen spilltilstand, ingen spillerinput.
// Idé: gatene vokser ut av de samme stedene folk faktisk går (inngangene), bundet sammen på kortest mulig vis,
// og de blir først grus og så stein etter hvert som bosettingen vokser fra landsby til by.
// Algoritme: Kruskal på kandidatkanter mellom innganger (kun kanter som ikke går gjennom andre bygg),
// med et lite deterministisk sideskift så gatene ikke blir linjaler.
import { stageRank } from '../sim/settlements.js';

const NODE_TYPES = new Set(['hut', 'townhouse', 'shelter', 'market', 'hall', 'hearth', 'fire', 'well', 'warehouse', 'sawmill', 'mason', 'workshop', 'storage', 'sanctuary']);
export const doorOf = (b) => ({ x: b.x, y: b.y + Math.max(3, b.radius * 0.18) });

// Fotavtrykk for kryssing (ellipse rundt bygget).
const blocks = (b, x, y) => {
  if (b.type === 'fire' || b.type === 'well') return false;
  const rx = b.radius * 0.78, ry = b.radius * 0.42;
  const dx = (x - b.x) / rx, dy = (y - (b.y - b.radius * 0.12)) / ry;
  return dx * dx + dy * dy < 1;
};

function crosses(buildings, a, b, skip) {
  const n = Math.max(3, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
  for (let i = 1; i < n; i++) {
    const x = a.x + (b.x - a.x) * (i / n), y = a.y + (b.y - a.y) * (i / n);
    for (const q of buildings) if (!skip.has(q.id) && blocks(q, x, y)) return true;
  }
  return false;
}

// Lykter langs gatene: jevnt fordelt langs hver gate i byer (trinn «By» og oppover), minst 56 enheter fra hverandre.
export function lampPosts(nets) {
  const out = [];
  for (const net of nets) {
    if (net.rank < 5) continue;
    for (const e of net.edges) {
      if (e.len < 40) continue;
      const mid = e.pts[Math.floor(e.pts.length / 2)], nxt = e.pts[Math.min(e.pts.length - 1, Math.floor(e.pts.length / 2) + 1)];
      const dx = nxt.x - mid.x, dy = nxt.y - mid.y, l = Math.hypot(dx, dy) || 1;
      const p = { x: mid.x - dy / l * 9, y: mid.y + dx / l * 9 + 2, settlementId: net.settlementId };
      if (!out.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 56)) out.push(p);
    }
  }
  return out;
}

// Gir {settlementId, rank, edges:[{a,b,core,len,pts}]} per bosetting med minst «Tidlig by».
export function buildStreets(state) {
  const out = [];
  for (const S of state.settlements) {
    const rank = stageRank(S.stage);
    if (rank < 4) continue;
    const bs = state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === S.id && NODE_TYPES.has(b.type));
    if (bs.length < 3) continue;
    const doors = bs.map((b) => ({ b, ...doorOf(b) }));
    const cand = [];
    for (let i = 0; i < doors.length; i++) for (let j = i + 1; j < doors.length; j++) {
      const len = Math.hypot(doors[i].x - doors[j].x, doors[i].y - doors[j].y);
      if (len > 170) continue;
      const skip = new Set([doors[i].b.id, doors[j].b.id]);
      if (crosses(bs, doors[i], doors[j], skip)) continue;
      cand.push({ i, j, len });
    }
    cand.sort((p, q) => p.len - q.len || p.i - q.i || p.j - q.j);
    const parent = doors.map((_, i) => i);
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const edges = [];
    for (const c of cand) {
      const ra = find(c.i), rb = find(c.j);
      if (ra === rb) continue;
      parent[ra] = rb;
      const A = doors[c.i], B = doors[c.j];
      // Svak bue: et deterministisk sideskift midt på strekningen.
      const bend = (((A.b.id * 31 + B.b.id * 17) % 7) - 3) * 1.6;
      const nx = -(B.y - A.y) / c.len, ny = (B.x - A.x) / c.len;
      const pts = [];
      const n = Math.max(2, Math.ceil(c.len / 9));
      for (let k = 0; k <= n; k++) {
        const t = k / n, w = Math.sin(t * Math.PI) * bend;
        pts.push({ x: A.x + (B.x - A.x) * t + nx * w, y: A.y + (B.y - A.y) * t + ny * w });
      }
      const core = ['market', 'hall', 'hearth', 'well', 'fire'].includes(A.b.type) || ['market', 'hall', 'hearth', 'well', 'fire'].includes(B.b.type);
      edges.push({ a: A.b.id, b: B.b.id, core, len: c.len, pts });
    }
    out.push({ settlementId: S.id, rank, edges });
  }
  return out;
}
