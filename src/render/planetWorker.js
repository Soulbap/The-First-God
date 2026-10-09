// Bakgrunnsarbeider: maler planetteksturene uten å stanse hovedløkka.
import { bakePlanet } from './planetTexture.js';

self.onmessage = (e) => {
  const { seed, regions } = e.data;
  const out = bakePlanet(seed, regions);
  self.postMessage(out, [out.global.data.buffer, out.local.data.buffer]);
};
