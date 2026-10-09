// Miljøfelt: et grovt, deterministisk rutenett (fuktighet, kronedekke, bart jordsmonn) avledet
// fra verdens-seed og startobjektene. Terreng og dekor leser det slik at bakken henger sammen med
// skogen, tjernet og leiren. Ingen økologisk simulering — kun visuell sammenheng.
import { makeNoise, fbm, smooth, clamp } from './paint.js';

export const ENV_CELL = 16;

export function buildEnvironment(state) {
  const { width: W, height: H, pond } = state.world;
  const cols = Math.ceil(W / ENV_CELL) + 2, rows = Math.ceil(H / ENV_CELL) + 2;
  const n = cols * rows;
  const canopy = new Float32Array(n), conifer = new Float32Array(n), moisture = new Float32Array(n), soil = new Float32Array(n);
  const nM = makeNoise(state.seed + 701), nS = makeNoise(state.seed + 733);
  const C = state.settlement.center;

  // Kronedekke: hvert modent tre avgir skygge og strø innenfor en radius som vokser med alderen.
  const conSum = new Float32Array(n), allSum = new Float32Array(n), rockInfl = new Float32Array(n);
  for (const t of state.nodes) {
    if (t.kind === 'tree' && t.growth >= 0.25) {
      const r = 22 + t.growth * 54, wgt = 0.45 + t.growth * 0.55;
      const i0 = Math.max(0, Math.floor((t.x - r) / ENV_CELL)), i1 = Math.min(cols - 1, Math.ceil((t.x + r) / ENV_CELL));
      const j0 = Math.max(0, Math.floor((t.y - r) / ENV_CELL)), j1 = Math.min(rows - 1, Math.ceil((t.y + r) / ENV_CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const d = Math.hypot(i * ENV_CELL - t.x, (j * ENV_CELL - t.y) * 1.25) / r;
        if (d >= 1) continue;
        const k = Math.pow(1 - d, 1.4) * wgt;
        allSum[j * cols + i] += k;
        if (t.species === 'spruce') conSum[j * cols + i] += k;
      }
    } else if (t.kind === 'rock') {
      const r = t.radius * 3.2;
      const i0 = Math.max(0, Math.floor((t.x - r) / ENV_CELL)), i1 = Math.min(cols - 1, Math.ceil((t.x + r) / ENV_CELL));
      const j0 = Math.max(0, Math.floor((t.y - r) / ENV_CELL)), j1 = Math.min(rows - 1, Math.ceil((t.y + r) / ENV_CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const d = Math.hypot(i * ENV_CELL - t.x, (j * ENV_CELL - t.y) * 1.4) / r;
        if (d < 1) rockInfl[j * cols + i] += 1 - d;
      }
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i, x = i * ENV_CELL, y = j * ENV_CELL;
      const c = clamp(allSum[k]);
      canopy[k] = c;
      conifer[k] = allSum[k] > 0.02 ? clamp(conSum[k] / allSum[k]) : 0.5;
      const pd = Math.hypot((x - pond.x) / pond.rx, (y - pond.y) / pond.ry);
      const m = fbm(nM, x / 230, y / 230, 3) * 0.75 + smooth(2.8, 1.05, pd) * 0.6 + c * 0.12;
      moisture[k] = clamp((m - 0.2) / 0.7);
      const dc = Math.hypot(x - C.x, (y - C.y) * 1.2);
      // Bart jord: sparsomt kronedekke, tørt, nær stein og i leiren.
      const s = fbm(nS, x / 85 + 11, y / 85, 3) * 0.8 - c * 0.5 - moisture[k] * 0.2 + clamp(rockInfl[k]) * 0.45 + (1 - smooth(40, 170, dc)) * 0.08;
      soil[k] = clamp((s - 0.36) / 0.38);
    }
  }
  return { cols, rows, cell: ENV_CELL, canopy, conifer, moisture, soil };
}

const sample = (env, f, x, y) => {
  const fx = Math.max(0, x / env.cell), fy = Math.max(0, y / env.cell);
  const i = Math.min(env.cols - 2, Math.floor(fx)), j = Math.min(env.rows - 2, Math.floor(fy));
  const u = fx - i, v = fy - j, o = j * env.cols + i;
  const a = f[o], b = f[o + 1], c = f[o + env.cols], d = f[o + env.cols + 1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

export const envAt = (env, x, y) => ({
  canopy: sample(env, env.canopy, x, y),
  conifer: sample(env, env.conifer, x, y),
  moisture: sample(env, env.moisture, x, y),
  soil: sample(env, env.soil, x, y),
});
