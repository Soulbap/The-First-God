// OPUS-02 · Kronikk og navn. Bare hendelser som faktisk har skjedd i simuleringen skrives hit.
// Ingen rng-trekk (navnene stokkes av en egen generator), så kronikken kan ikke endre spillets utfall.
// Tilstanden lagres sammen med syklusen; `keys` hindrer at samme hendelse skrives to ganger (også etter lasting).
import { NAMES } from '../data/names.js';
import { mulberry } from '../core/rng.js';

const MAX_ENTRIES = 90;

export const createChronicle = () => ({ entries: [], keys: {}, nameN: 0 });

function ensure(state) {
  if (!state.chronicle) state.chronicle = createChronicle();
  return state.chronicle;
}

// Fast, seed-avhengig rekkefølge av navnene (Fisher–Yates med egen generator).
const orderCache = new Map();
function nameOrder(seed) {
  let o = orderCache.get(seed);
  if (o) return o;
  const rnd = mulberry((seed ^ 0x9e3779b1) >>> 0);
  o = NAMES.map((_, i) => i);
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  orderCache.set(seed, o);
  return o;
}

// Gir et menneske sitt navn første gang det trengs. Navn tildeles i den rekkefølgen de spørres om,
// som er deterministisk (samme handlinger → samme navn). Eldre lagringer får navn ved første oppslag.
export function nameOf(state, h) {
  if (!h) return '';
  if (!h.name) {
    const C = ensure(state), order = nameOrder(state.seed);
    const n = C.nameN++;
    const base = NAMES[order[n % order.length]];
    h.name = n >= order.length ? `${base} ${['', 'den yngre', 'den tredje'][Math.floor(n / order.length)] || 'den siste'}`.trim() : base;
  }
  return h.name;
}

export function nameList(state, ids, max = 2) {
  const names = ids.map((id) => state.humans.find((q) => q.id === id)).filter(Boolean).slice(0, max).map((h) => nameOf(state, h));
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(', ') + ' og ' + names[names.length - 1];
}

// Skriver en post én gang per nøkkel. `kind` styrer ikonet i panelet; `x,y` lar kameraet gå til stedet.
export function chronicle(state, key, kind, text, at = null) {
  const C = ensure(state);
  if (C.keys[key]) return false;
  C.keys[key] = 1;
  C.entries.push({ t: state.time, kind, text, x: at?.x ?? null, y: at?.y ?? null });
  if (C.entries.length > MAX_ENTRIES) C.entries.splice(0, C.entries.length - MAX_ENTRIES);
  state.events.push({ type: 'chronicle', kind, text, x: at?.x ?? null, y: at?.y ?? null });
  return true;
}
