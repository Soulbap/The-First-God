// OPUS-12 · Hver bosetting eier sitt lager. Hovedstadens lager er `state.resources` (spillets felles ressursfelt, også PP og kunnskap);
// en satellitt har `settlement.stock`. Alle regler som henter, bruker eller leverer varer går gjennom disse funksjonene,
// slik at ingen bosetting kan bruke varer den ikke har (og ingen varer oppstår eller forsvinner).
export const CAPITAL = 'first';

function find(state, id) { return state.settlements.find((s) => s.id === id); }
export function invOf(state, id = CAPITAL) {
  if (id === CAPITAL || id == null) return state.resources;
  const S = find(state, id);
  return S ? (S.stock ??= {}) : null;
}
export const invGet = (state, id, type) => invOf(state, id)?.[type] || 0;
export function invAdd(state, id, type, amount) {
  const inv = invOf(state, id); if (!inv || !(amount > 0)) return 0;
  inv[type] = (inv[type] || 0) + amount; return amount;
}
// Tar høyst `amount` (aldri negativ beholdning). Returnerer det som faktisk ble tatt.
export function invTake(state, id, type, amount) {
  const inv = invOf(state, id); if (!inv || !(amount > 0)) return 0;
  const n = Math.min(amount, inv[type] || 0); inv[type] = (inv[type] || 0) - n; return n;
}
export const invHas = (state, id, cost) => Object.entries(cost).every(([k, n]) => invGet(state, id, k) >= n);
export function invPay(state, id, cost) {
  if (!invHas(state, id, cost)) return false;
  for (const [k, n] of Object.entries(cost)) invTake(state, id, k, n);
  return true;
}
// Sum av en vare på tvers av alle lagre (bevaringstester): hovedlager + bosettingslagre.
export function invTotal(state, type) {
  let n = state.resources[type] || 0;
  for (const S of state.settlements) if (S.id !== CAPITAL) n += S.stock?.[type] || 0;
  return n;
}
