// Seedet tilfeldighet (mulberry32). Tilstanden er et lite objekt slik at den kan lagres i spilltilstanden.
export function createRng(seed) {
  return { s: seed >>> 0 };
}

export function rand(r) {
  r.s = (r.s + 0x6D2B79F5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const range = (r, a, b) => a + (b - a) * rand(r);
export const pick = (r, arr) => arr[Math.floor(rand(r) * arr.length)];

// Ren funksjon for presentasjonslaget: gir en egen generator uten å påvirke simuleringen.
export function mulberry(seed) {
  const r = createRng(seed);
  return () => rand(r);
}
