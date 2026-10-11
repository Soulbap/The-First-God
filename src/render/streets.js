// OPUS-02 · Gatenettet, OPUS-12: tegningen leser nå bosettingens faktiske gatenett (`S.net`, src/sim/streets.js) i stedet for å
// utlede et nytt hver gang. Gatene har vokst fram av byggene og beholder sin historie; dekket (lv) kommer fra utført veiarbeid.
// Ren avledning av tilstanden — ingen spillerinput, ingen sideeffekter.
import { stageRank } from '../sim/settlements.js';
import { doorOf, edgePoints } from '../sim/streets.js';

export { doorOf };

// Lykter langs gatene: jevnt fordelt langs hver gate med grusvei eller bedre i byer (trinn «By» og oppover), minst 56 enheter fra hverandre.
export function lampPosts(nets) {
  const out = [];
  for (const net of nets) {
    if (net.rank < 5) continue;
    for (const e of net.edges) {
      if (e.len < 40 || e.lv < 2) continue;
      const mid = e.pts[Math.floor(e.pts.length / 2)], nxt = e.pts[Math.min(e.pts.length - 1, Math.floor(e.pts.length / 2) + 1)];
      const dx = nxt.x - mid.x, dy = nxt.y - mid.y, l = Math.hypot(dx, dy) || 1;
      const p = { x: mid.x - dy / l * 9, y: mid.y + dx / l * 9 + 2, settlementId: net.settlementId };
      if (!out.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 56)) out.push(p);
    }
  }
  return out;
}

// Gir {settlementId, rank, edges:[{a,b,core,len,lv,pts}]} per bosetting med et gatenett.
export function buildStreets(state) {
  const out = [];
  for (const S of state.settlements) {
    const net = S.net;
    if (!net?.edges.length) continue;
    const byId = new Map(state.buildings.filter((b) => b.complete && (b.settlementId || 'first') === S.id).map((b) => [b.id, b]));
    const core = new Set(['market', 'hall', 'hearth', 'well', 'fire', 'commons', 'park']);
    const edges = [];
    for (const e of [...net.edges].sort((p, q) => p.a - q.a || p.b - q.b)) {
      const A = byId.get(e.a), C = byId.get(e.b); if (!A || !C) continue;
      const da = doorOf(A), dc = doorOf(C);
      edges.push({ a: e.a, b: e.b, core: core.has(A.type) || core.has(C.type), len: Math.hypot(da.x - dc.x, da.y - dc.y), lv: e.lv, pts: edgePoints(da, dc, [e.a, e.b]) });
    }
    out.push({ settlementId: S.id, rank: stageRank(S.stage), edges });
  }
  return out;
}
