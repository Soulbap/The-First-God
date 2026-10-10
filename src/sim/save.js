// Lagring av en syklus (OPUS-01). Ren serialisering — ingen DOM. Nettleserens localStorage brukes av main.js.
// Bevisst valg (prosjektansvarlig): ingen offline-fremgang. En lastet verden fortsetter nøyaktig der den ble lagret.
import { createWorld } from './world.js';

export const SAVE_VERSION = 7;

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
  const fresh = createWorld(s.seed);
  fillDefaults(s, fresh);
  s.events = [];
  return s;
}
