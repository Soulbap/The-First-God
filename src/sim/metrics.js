// OPUS-12 · Målinger av menneskeatferd (rene spørringer, ingen sideeffekter). Brukes av tester og verktøy.
// Et «kluster» er mennesker som står innen `radius` fra hverandre; et stort kluster utenfor en byggeplass er patologisk trengsel.
export function crowding(state, { radius = 22 } = {}) {
  const hs = state.humans.filter((h) => h.state !== 'away');
  let maxCluster = 0, clustered = 0;
  const seen = new Set();
  for (const h of hs) {
    let n = 0;
    for (const q of hs) if (q !== h && Math.abs(q.x - h.x) < radius && Math.abs(q.y - h.y) < radius && Math.hypot(q.x - h.x, q.y - h.y) < radius) n++;
    if (n + 1 > maxCluster) maxCluster = n + 1;
    if (n >= 3) { clustered++; seen.add(h.id); }
  }
  const fires = state.buildings.filter((b) => b.complete && (b.type === 'fire' || b.type === 'hearth'));
  let atFire = 0;
  for (const h of hs) if (fires.some((f) => Math.hypot(f.x - h.x, f.y - h.y) < 52)) atFire++;
  const byState = {};
  for (const h of hs) byState[h.state] = (byState[h.state] || 0) + 1;
  // Samme punkt: mennesker som står på nesten identisk koordinat.
  let stacked = 0;
  for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) if (Math.abs(hs[i].x - hs[j].x) < 3 && Math.abs(hs[i].y - hs[j].y) < 3) stacked++;
  return { n: hs.length, maxCluster, clusteredShare: hs.length ? clustered / hs.length : 0, atFireShare: hs.length ? atFire / hs.length : 0, stacked, byState };
}
