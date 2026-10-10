// Verdensoversikten: ren layout- og projeksjonsmatematikk (testbar uten nettleser).
// Zoom ut forbi områdevisningen er en endring i meningsnivå: den detaljerte hjemmeregionen blir
// én rute på kartet, og nabolandene, rutene og ekspedisjonene blir synlige.
import { BALANCE as B } from '../data/balance.js';

export const OVERVIEW = { topPad: 118, bottomPad: 104, sidePad: 40, gap: 10 };

export function overviewLayout(state, sw, sh) {
  const { cols, rows } = B.globe, { topPad, bottomPad, sidePad, gap } = OVERVIEW;
  const availW = Math.max(200, sw - sidePad * 2), availH = Math.max(150, sh - topPad - bottomPad);
  let cw = (availW - (cols - 1) * gap) / cols, ch = (cw * 2) / 3; // samme sideforhold som hjemmeregionen (3:2)
  if (ch * rows + (rows - 1) * gap > availH) { ch = (availH - (rows - 1) * gap) / rows; cw = ch * 1.5; }
  const gridW = cw * cols + (cols - 1) * gap, gridH = ch * rows + (rows - 1) * gap;
  const ox = (sw - gridW) / 2, oy = topPad + (availH - gridH) / 2;
  const cells = new Map();
  for (const r of state.globe.regions) cells.set(r.id, { id: r.id, x: ox + r.col * (cw + gap), y: oy + r.row * (ch + gap), w: cw, h: ch });
  const home = cells.get(state.globe.regions.find((r) => r.home).id);
  return { cw, ch, ox, oy, gridW, gridH, cells, home, sw, sh };
}

// Hjemmeregionens verdenskoordinater → skjermposisjon i hjemmeruten.
export const worldToOverview = (layout, state, wx, wy) => ({
  x: layout.home.x + (wx / state.world.width) * layout.home.w,
  y: layout.home.y + (wy / state.world.height) * layout.home.h,
});

export function regionAt(layout, state, sx, sy) {
  for (const r of state.globe.regions) {
    const c = layout.cells.get(r.id);
    if (sx >= c.x && sx <= c.x + c.w && sy >= c.y && sy <= c.y + c.h) return r;
  }
  return null;
}

// Hvilke regioner som er mulige ekspansjonsmål akkurat nå (inntil kjent land).
export function frontierIds(state) {
  const set = new Set();
  for (const r of state.globe.regions) {
    if (r.state !== 'ukjent') continue;
    const near = state.globe.regions.some((q) => q !== r && Math.abs(q.col - r.col) <= 1 && Math.abs(q.row - r.row) <= 1 && (q.home || q.state !== 'ukjent'));
    if (near) set.add(r.id);
  }
  return set;
}

// Signatur for den statiske bakgrunnen: endres bare når kartet faktisk har endret seg.
export const overviewSignature = (state, layout) =>
  `${Math.round(layout.sw)}x${Math.round(layout.sh)}|${state.globe.regions.map((r) => r.state + r.knowledge).join('')}|${state.settlements.length}`;
