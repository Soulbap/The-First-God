// OPUS-12 · Jernbanetrasé mellom stasjonene. Sporet går fra stasjonen (rail_terminal) i den ene bosettingen til stasjonen i den andre —
// ikke fra bosettingens midte, så det ikke skjærer gjennom byen. Mangler en stasjon ennå, brukes bosettingens hjerte.
// Ren funksjon uten importer (brukes av tomtevalg, gjenvekst og tegning).
export function railEnds(state, rail) {
  const end = (id) => {
    const t = state.buildings.find((b) => b.complete && b.type === 'rail_terminal' && (b.settlementId || 'first') === id);
    if (t) return { x: t.x, y: t.y };
    const S = state.settlements.find((q) => q.id === id);
    return S ? { x: S.x, y: S.y } : null;
  };
  const a = end(rail.a), b = end(rail.b);
  return a && b ? { a, b } : null;
}
export function railSegments(state) {
  const out = [];
  for (const r of state.industrial?.rails || []) { const e = railEnds(state, r); if (e) out.push([e.a.x, e.a.y, e.b.x, e.b.y]); }
  return out;
}
