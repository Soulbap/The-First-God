// Tegner verdensoversikten: hjemmeregionen (ekte terreng) som én rute i et grovt, malt kart over nabolandene.
// Leser kun tilstand; ingen spillregler. Den statiske bakgrunnen bakes bare når kartet endrer seg.
import { makeCanvas, mulberry, dab, rgba, jitter, clamp } from './paint.js';
import { overviewLayout, worldToOverview, frontierIds, overviewSignature } from '../view/overview.js';
import { BIOMES } from '../sim/worldmap.js';
import { civilizationStage } from '../sim/civstage.js';

const FONT_SERIF = 'Georgia, "Palatino Linotype", serif';
const FONT_UI = '"Segoe UI", system-ui, sans-serif';

// Uregelmessig, avrundet landform for en rute (deterministisk per region).
function blobPath(ctx, c, seed, inset = 0) {
  const rnd = mulberry(seed), N = 30, pts = [];
  const cx = c.x + c.w / 2, cy = c.y + c.h / 2, rx = c.w / 2 - inset, ry = c.h / 2 - inset;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    // Superellipse gir avrundet rektangel; litt støy gir kystlinje.
    const ex = Math.sign(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), 0.42), ey = Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), 0.42);
    const n = 0.93 + rnd() * 0.07;
    pts.push([cx + ex * rx * n, cy + ey * ry * n]);
  }
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const p0 = pts[i % N], p1 = pts[(i + 1) % N], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
  }
  ctx.closePath();
}

function bakeBackground(state, layout, R, dpr) {
  const canvas = makeCanvas(layout.sw * dpr, layout.sh * dpr), ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  // Hav.
  const sea = ctx.createLinearGradient(0, 0, 0, layout.sh);
  sea.addColorStop(0, '#202d2f'); sea.addColorStop(1, '#16201f');
  ctx.fillStyle = sea; ctx.fillRect(0, 0, layout.sw, layout.sh);
  const rs = mulberry(77);
  for (let i = 0; i < 260; i++) dab(ctx, rs() * layout.sw, rs() * layout.sh, 14 + rs() * 40, 2 + rs() * 5, rs() * 0.4, `rgba(${rs() < 0.5 ? '70,96,98' : '30,44,44'},${0.05 + rs() * 0.06})`);
  const frontier = frontierIds(state);
  for (const r of state.globe.regions) {
    const c = layout.cells.get(r.id), seed = (r.col * 31 + r.row * 17 + 5) * 977;
    const known = r.home || r.state !== 'ukjent';
    // Skygge under landet.
    ctx.save(); ctx.translate(2, 4); blobPath(ctx, c, seed, 3); ctx.fillStyle = 'rgba(6,10,10,0.45)'; ctx.fill(); ctx.restore();
    ctx.save();
    blobPath(ctx, c, seed, 3); ctx.clip();
    if (r.home) {
      const mip = R.terrainMips.reduce((a, m) => (Math.abs(m.s - c.w / state.world.width) < Math.abs(a.s - c.w / state.world.width) ? m : a));
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(mip.c, c.x, c.y, c.w, c.h);
      ctx.drawImage(R.wearCanvas, c.x, c.y, c.w, c.h);
    } else if (known) {
      const col = BIOMES[r.biome].color, rnd = mulberry(seed);
      ctx.fillStyle = rgba(col, 1); ctx.fillRect(c.x, c.y, c.w, c.h);
      for (let i = 0; i < 160; i++) dab(ctx, c.x + rnd() * c.w, c.y + rnd() * c.h, 3 + rnd() * 12, 1.5 + rnd() * 5, rnd() * 3, rgba(jitter(col, rnd, 0.35), 0.25));
      // Enkle motiver: åser/trær/vann avhengig av landskap.
      for (let i = 0; i < 26; i++) {
        const x = c.x + 0.08 * c.w + rnd() * c.w * 0.84, y = c.y + 0.12 * c.h + rnd() * c.h * 0.76;
        if (r.biome === 'fjell') { ctx.fillStyle = 'rgba(40,38,34,0.45)'; ctx.beginPath(); ctx.moveTo(x - 7, y + 4); ctx.lineTo(x, y - 8); ctx.lineTo(x + 8, y + 4); ctx.fill(); ctx.fillStyle = 'rgba(224,222,212,0.5)'; ctx.beginPath(); ctx.moveTo(x - 2, y - 4); ctx.lineTo(x, y - 8); ctx.lineTo(x + 2.4, y - 4); ctx.fill(); }
        else if (r.biome === 'skog' || r.biome === 'dal') { ctx.fillStyle = 'rgba(28,48,30,0.55)'; ctx.beginPath(); ctx.moveTo(x - 3.2, y + 3); ctx.lineTo(x, y - 7); ctx.lineTo(x + 3.2, y + 3); ctx.fill(); }
        else if (r.biome === 'kyst') dab(ctx, x, y, 8 + rnd() * 8, 1.4, 0, 'rgba(186,206,206,0.28)');
        else dab(ctx, x, y, 7 + rnd() * 9, 1.4, 0.1, 'rgba(210,196,120,0.3)');
      }
    } else {
      ctx.fillStyle = frontier.has(r.id) ? '#3a4643' : '#2b3534'; ctx.fillRect(c.x, c.y, c.w, c.h);
      const rnd = mulberry(seed);
      for (let i = 0; i < 120; i++) dab(ctx, c.x + rnd() * c.w, c.y + rnd() * c.h, 8 + rnd() * 26, 2 + rnd() * 8, rnd() * 3, `rgba(${frontier.has(r.id) ? '120,134,128' : '70,82,80'},${0.05 + rnd() * 0.08})`);
    }
    // Lys kant øverst til venstre, mørk nederst til høyre: liten lesbar dybde.
    const g = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
    g.addColorStop(0, 'rgba(255,240,200,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.restore();
    blobPath(ctx, c, seed, 3);
    ctx.lineWidth = r.home ? 2 : 1.4;
    ctx.strokeStyle = r.home ? 'rgba(212,180,119,0.85)' : known ? 'rgba(20,24,18,0.7)' : 'rgba(150,164,156,0.45)';
    if (!known) ctx.setLineDash(frontier.has(r.id) ? [6, 5] : [2, 6]);
    ctx.stroke(); ctx.setLineDash([]);
  }
  return canvas;
}

export function drawOverview(ctx, R, state, { sw, sh, dpr, time, hoverId }) {
  const layout = overviewLayout(state, sw, sh);
  const sig = overviewSignature(state, layout) + '|' + dpr;
  if (!R.overviewBg || R.overviewSig !== sig) { R.overviewBg = bakeBackground(state, layout, R, dpr); R.overviewSig = sig; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(R.overviewBg, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textAlign = 'center';

  const G = state.globe, home = layout.home;
  const mapPt = (x, y) => worldToOverview(layout, state, x, y);
  const cap = mapPt(state.settlement.center.x, state.settlement.center.y);

  // Ruter mellom bosettinger: gullfarget når de er etablert av faktiske turer, svak stiplet ellers.
  for (const r of Object.values(state.network.routes)) {
    const a = state.settlements.find((s) => s.id === r.a), b = state.settlements.find((s) => s.id === r.b);
    if (!a || !b) continue;
    const pa = mapPt(a.x, a.y), pb = mapPt(b.x, b.y);
    ctx.strokeStyle = r.established ? 'rgba(236,208,140,0.9)' : 'rgba(236,226,200,0.35)';
    ctx.lineWidth = r.established ? 2 : 1.2; ctx.setLineDash(r.established ? [] : [3, 4]);
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.setLineDash([]);
  }
  // Ruter til fjerne land: fra regionens midte inn til hovedstaden. Bare utposter har faste ruter.
  for (const r of G.regions) {
    if (r.home) continue;
    const c = layout.cells.get(r.id), cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    if (r.state === 'utpost' || r.state === 'etablert') {
      ctx.strokeStyle = 'rgba(236,208,140,0.75)'; ctx.lineWidth = r.state === 'etablert' ? 2.4 : 1.6; ctx.setLineDash(r.state === 'etablert' ? [] : [8, 5]);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cap.x, cap.y); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  // Ekspedisjon/nybygger-følge underveis.
  if (G.mission) {
    const m = G.mission, t = state.globe.regions.find((q) => q.id === m.regionId), c = layout.cells.get(t.id);
    const tx = c.x + c.w / 2, ty = c.y + c.h / 2;
    ctx.strokeStyle = 'rgba(214,226,206,0.7)'; ctx.lineWidth = 1.6; ctx.setLineDash([2, 6]);
    ctx.beginPath(); ctx.moveTo(cap.x, cap.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    if (m.phase === 'away') {
      const k = clamp((state.time - m.launchedAt) / Math.max(1, m.eta - m.launchedAt));
      const px = cap.x + (tx - cap.x) * k, py = cap.y + (ty - cap.y) * k;
      ctx.fillStyle = '#f0e6c8'; ctx.beginPath(); ctx.arc(px, py, 4 + Math.sin(time * 4) * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,16,10,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  // Bosettinger i hjemmeregionen.
  for (const s of state.settlements) {
    if (s.state === 'founding' && s.id !== 'first' && !state.buildings.some((b) => b.settlementId === s.id)) continue;
    const p = mapPt(s.x, s.y), isCap = s.id === 'first';
    const r = isCap ? 6.5 : 4.5;
    ctx.fillStyle = 'rgba(12,10,6,0.55)'; ctx.beginPath(); ctx.arc(p.x + 1, p.y + 1.5, r + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isCap ? '#f2dca0' : '#e8dcc0'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,22,12,0.9)'; ctx.lineWidth = 1.2; ctx.stroke();
    if (['By', 'Storby'].includes(s.stage)) { ctx.fillStyle = '#8a5a3a'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
    const label = isCap ? (['By', 'Storby'].includes(s.stage) ? 'Den første byen' : 'Den første landsbyen') : s.name;
    const below = p.y > home.y + home.h * 0.52, ly = below ? p.y + r + 13 : p.y - r - 5;
    ctx.font = `italic ${isCap ? 12.5 : 11}px ${FONT_SERIF}`;
    ctx.fillStyle = 'rgba(14,10,6,0.75)'; ctx.fillText(label, p.x + 1, ly + 1);
    ctx.fillStyle = '#f1e8d0'; ctx.fillText(label, p.x, ly);
  }
  // Karavaner som går inn til hovedstaden (de er faktiske figurer i hjemmeregionen).
  for (const c of G.caravans) {
    const p = mapPt(c.x, c.y);
    ctx.fillStyle = '#d4b477'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,8,0.8)'; ctx.lineWidth = 0.8; ctx.stroke();
  }

  // Regionnavn, status og utposter.
  for (const r of G.regions) {
    const c = layout.cells.get(r.id), cx = c.x + c.w / 2;
    if (r.home) {
      ctx.font = `600 11px ${FONT_UI}`; ctx.fillStyle = 'rgba(14,10,6,0.7)'; ctx.fillText('HJEMLANDET', cx + 1, c.y + c.h - 8 + 1);
      ctx.fillStyle = 'rgba(240,226,184,0.95)'; ctx.fillText('HJEMLANDET', cx, c.y + c.h - 8);
      continue;
    }
    if (r.state === 'ukjent') {
      const frontier = frontierIds(state).has(r.id);
      ctx.font = `italic ${frontier ? 18 : 14}px ${FONT_SERIF}`; ctx.fillStyle = frontier ? 'rgba(210,222,214,0.7)' : 'rgba(150,166,158,0.4)';
      ctx.fillText('?', cx, c.y + c.h / 2 + 6);
      continue;
    }
    ctx.font = `italic 13px ${FONT_SERIF}`;
    ctx.fillStyle = 'rgba(14,10,6,0.7)'; ctx.fillText(r.name, cx + 1, c.y + 20 + 1);
    ctx.fillStyle = '#f1e8d0'; ctx.fillText(r.name, cx, c.y + 20);
    ctx.font = `11px ${FONT_UI}`; ctx.fillStyle = 'rgba(236,226,204,0.8)';
    const label = r.state === 'oppdaget' ? `${BIOMES[r.biome].name} · oppdaget` : `${r.state === 'etablert' ? 'Etablert' : 'Utpost'} · ${r.pop} folk`;
    ctx.fillText(label, cx, c.y + 35);
    if (r.state === 'utpost' || r.state === 'etablert') {
      const n = r.state === 'etablert' ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const hx = cx + (i - (n - 1) / 2) * 17, hy = c.y + c.h / 2 + 10;
        ctx.fillStyle = 'rgba(12,10,6,0.45)'; ctx.fillRect(hx - 6, hy + 5, 13, 2.5);
        ctx.fillStyle = '#9a7a52'; ctx.fillRect(hx - 5, hy - 2, 10, 7);
        ctx.fillStyle = '#6a4a34'; ctx.beginPath(); ctx.moveTo(hx - 7, hy - 2); ctx.lineTo(hx, hy - 9); ctx.lineTo(hx + 7, hy - 2); ctx.fill();
      }
    }
  }

  // Tittel og bunntekst.
  const stage = civilizationStage(state);
  ctx.font = `italic 22px ${FONT_SERIF}`; ctx.fillStyle = 'rgba(12,10,6,0.65)'; ctx.fillText(stage.name, sw / 2 + 1, 88 + 1);
  ctx.fillStyle = '#f0e2b8'; ctx.fillText(stage.name, sw / 2, 88);
  ctx.font = `12px ${FONT_UI}`; ctx.fillStyle = 'rgba(230,222,200,0.8)';
  const disc = G.regions.filter((q) => !q.home && q.state !== 'ukjent').length;
  ctx.fillText(`${state.settlements.length} bosettinger · ${disc} av ${G.regions.length - 1} land oppdaget · ${G.stats.outposts} utposter`, sw / 2, 108);
  ctx.fillStyle = 'rgba(230,222,200,0.6)';
  ctx.fillText('Rull inn eller velg Område for å gå tilbake til landskapet', sw / 2, sh - 14 - 74);

  // Hover.
  if (hoverId) {
    const r = G.regions.find((q) => q.id === hoverId), c = layout.cells.get(hoverId);
    const lines = r.home ? [`Hjemlandet`, `${state.settlements.length} bosettinger`] : r.state === 'ukjent' ? ['Ukjent land', 'Dra ut en ekspedisjon for å se det'] : [r.name, `${BIOMES[r.biome].name} · ${r.state}`, r.pop ? `${r.pop} folk · ${r.delivered} karavaner` : 'Ingen bosetting ennå'];
    const w = 190, h = 18 + lines.length * 16;
    let x = c.x + c.w / 2 - w / 2, y = c.y + c.h - 6;
    x = clamp(x, 8, sw - w - 8); y = clamp(y, 8, sh - h - 90);
    ctx.fillStyle = 'rgba(24,28,24,0.92)'; ctx.strokeStyle = 'rgba(212,180,119,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    lines.forEach((t, i) => { ctx.font = i === 0 ? `600 13px ${FONT_UI}` : `12px ${FONT_UI}`; ctx.fillStyle = i === 0 ? '#f0e2b8' : '#d8d0bc'; ctx.fillText(t, x + 10, y + 20 + i * 16); });
    ctx.textAlign = 'center';
  }
}
