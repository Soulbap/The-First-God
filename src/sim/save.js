// Lagring av en syklus (OPUS-01). Ren serialisering — ingen DOM. Nettleserens localStorage brukes av main.js.
// Bevisst valg (prosjektansvarlig): ingen offline-fremgang. En lastet verden fortsetter nøyaktig der den ble lagret.
import { createWorld } from './world.js';

export const SAVE_VERSION = 12;

// JSON kan ikke uttrykke Infinity/NaN eller typede arrays; de kodes som små merkeobjekter.
function replacer(key, v) {
  if (typeof v === 'number' && !Number.isFinite(v)) return { $n: String(v) };
  if (v instanceof Float32Array) return { $f32: Array.from(v) };
  return v;
}

function reviver(key, v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    if ('$n' in v) return Number(v.$n);
    if ('$f32' in v) return Float32Array.from(v.$f32);
  }
  return v;
}

export function serialize(state) {
  const { events, ...rest } = state; // hendelser er flyktige (presentasjon)
  return JSON.stringify({ v: SAVE_VERSION, savedAt: Date.now(), state: rest }, replacer);
}

// Felt som finnes i en ny verden men mangler i en eldre lagring, fylles inn (fremoverkompatibelt).
function fillDefaults(target, fresh) {
  for (const [k, v] of Object.entries(fresh)) {
    if (!(k in target)) target[k] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v) && !ArrayBuffer.isView(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) fillDefaults(target[k], v);
  }
}

// Returnerer en spillbar tilstand, eller null når lagringen er ugyldig/ukjent (spillet starter da på nytt).
export function deserialize(text, { seed } = {}) {
  let data;
  try { data = JSON.parse(text, reviver); } catch { return null; }
  if (!data || typeof data !== 'object' || !data.state) return null;
  if (data.v > SAVE_VERSION || data.v < 2) return null; // eldre formater fylles fra en ny seedet verden
  const s = data.state;
  if (seed != null && s.seed !== seed) return null;
  if (!(s.wear?.data instanceof Float32Array) || !Array.isArray(s.humans) || !Array.isArray(s.buildings)) return null;
  // v11: nytt landskap (bekk, innsjøer, soner) finnes bare i nye verdener. En eldre verden beholder sitt kjente landskap.
  if (data.v < 11 && s.world) { s.world.waters = []; s.world.streams = []; s.world.zones = []; }
  const fresh = createWorld(s.seed);
  fillDefaults(s, fresh);
  // v11: satellittbosettinger får eget lager. Det som var levert til et pågående prosjekt (tidligere `delivered`) flyttes dit.
  for (const S of s.settlements || []) if (!S.stock) S.stock = {};
  for (const p of Object.values(s.region?.projects || {})) {
    const S = s.settlements.find((q) => q.id === p.settlementId);
    if (S && p.delivered) { for (const [k, n] of Object.entries(p.delivered)) if (n) S.stock[k] = (S.stock[k] || 0) + n; }
    delete p.delivered;
  }
  // v11 (OPUS-11): regioner får eget lager. Eldre lagringer: tomt lager, boliger etter folketall (ingen varer oppstår).
  for (const r of s.globe?.regions || []) {
    if (!r.stock) r.stock = {};
    if (r.homes == null) r.homes = r.state === 'utpost' || r.state === 'etablert' ? Math.max(1, Math.ceil((r.pop - 4) / 2)) : 0;
    if (r.building === undefined) r.building = null;
    if (r.extracted == null) r.extracted = 0;
    if (r.aerial == null) r.aerial = false;
  }
  // v12 (OPUS-12): gatenett (`S.net`), handelsregnskap, flytting og menneskenes hjem/arbeidssted er nye felt som fylles ved bruk
  // (fillDefaults gir `trade` og `migration`; resten oppstår av simuleringen). Eldre leveranser og tog uten avsender/mottaker leses som hovedstaden.
  for (const d of s.region?.deliveries || []) if (d.source == null) d.source = 'first';
  for (const q of s.industrial?.shipments || []) if (q.rail && q.to == null) { q.from = q.from ?? 'first'; q.to = q.to ?? 'first'; }
  s.events = [];
  return s;
}
