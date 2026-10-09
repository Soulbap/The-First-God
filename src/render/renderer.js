// Verdenspresentasjon: oversetter spilltilstand til et levende, dybdesortert bilde.
// Leser tilstanden, men eier ingen spilleregler.
import { makeCanvas, drawSprite, clamp, smooth, taper } from './paint.js';
import { buildTerrain, TERRAIN_SCALE } from './terrain.js';
import { generateDecor, decorSprites } from './decor.js';
import { treeSprite, growthLevels, treeHeight } from './trees.js';
import { rockSprite, visibleBoulders } from './rocks.js';
import { buildingSprite, woodPileSprite, stonePileSprite, materialSprite, pileCount } from './buildings.js';
import { drawHuman, drawHumanShadow } from './people.js';
import { createFx, emit, flyToPile, popup, shake, updateFx, shakeAngle, drawParticles, drawArcs, drawFireGlow, drawFlames } from './fx.js';
import { zoomOf, viewH, screenToWorld, worldToScreen, VIEW } from '../view/camera.js';
import { gatherInterval } from '../sim/humans.js';
import { treeCapacity } from '../sim/nature.js';
import { wearAt } from '../sim/wear.js';

export const wind = (x, t) => 0.6 * Math.sin(t * 0.9 + x * 0.003) + 0.4 * Math.sin(t * 2.1 + x * 0.009 + 1.3);

// Myk, rund skyggeflekk som skaleres til ellipser.
const SOFT = (() => {
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(14,12,6,0.5)');
  grad.addColorStop(0.55, 'rgba(14,12,6,0.32)');
  grad.addColorStop(1, 'rgba(14,12,6,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
})();

const WOOD_PILE_OFFSET ={ x: -13, y: 0 }, STONE_PILE_OFFSET = { x: 15, y: 2 };

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const R = { ctx, terrain: null, decor: null, wearCanvas: null, wearImg: null, wearTimer: 0, fx: createFx(), clouds: [], emitTimers: new Map() };

  R.reset = (state) => {
    R.terrain = buildTerrain(state);
    R.decor = generateDecor(state);
    decorSprites();
    R.wearCanvas = makeCanvas(state.wear.cols, state.wear.rows);
    R.wearImg = R.wearCanvas.getContext('2d').createImageData(state.wear.cols, state.wear.rows);
    R.fx = createFx();
    R.clouds = [0, 1, 2, 3, 4].map((i) => ({ x: (i / 5) * state.world.width, y: 200 + ((i * 677) % 1200), r: 380 + (i % 3) * 120 }));
  };

  // ---------- Hendelser fra simuleringen → visuelle reaksjoner ----------
  R.handleEvents = (state, events, cam) => {
    const fx = R.fx;
    const detailed = cam.w < VIEW.semanticAreaW;
    for (const e of events) {
      if (e.type === 'hit') {
        shake(fx, e.nodeId);
        const n = state.nodes.find((x) => x.id === e.nodeId);
        if (e.res === 'wood') {
          emit(fx, 'chip', e.x, e.y - 1, e.by === 'player' ? 6 : 3, { spread: 3, z: 6 });
          if (n && Math.random() < 0.7) emit(fx, 'leaf', e.x, e.y, 2, { spread: 22, z: treeHeight(n.species, n.growth) * 0.65 });
        } else {
          emit(fx, 'dust', e.x, e.y, e.by === 'player' ? 4 : 2, { spread: 10, z: 3 });
          emit(fx, 'chip', e.x, e.y, 3, { spread: 8, z: 6 });
          fx.parts.slice(-3).forEach((p) => { p.color = '#8d887c'; });
        }
      } else if (e.type === 'gain') {
        const sp = state.stockpile;
        const off = e.res === 'wood' ? WOOD_PILE_OFFSET : STONE_PILE_OFFSET;
        if (e.manual) {
          flyToPile(fx, e.res, { x: e.x, y: e.y - 10 }, { x: sp.x + off.x, y: sp.y + off.y - 6 });
          if (detailed) popup(fx, e.x, e.y - 18, `+${e.amount}`, e.res);
        } else if (detailed) {
          popup(fx, sp.x + off.x, sp.y - 16, `+${e.amount}`, e.res);
        }
      } else if (e.type === 'treeFelled') {
        fx.falls.push({ ...e, dir: e.x % 2 > 1 ? 1 : -1, t: 0, dusted: false });
      } else if (e.type === 'sprout') {
        emit(fx, 'sprout', e.x, e.y, 6, { spread: 4, z: 2 });
      } else if (e.type === 'prayer') {
        emit(fx, 'mote', e.x, e.y, 4, { spread: 3, z: 12 });
      } else if (e.type === 'constructionComplete') {
        emit(fx, 'dust', e.x, e.y, 10, { spread: 40, spreadY: 14, z: 2 });
        emit(fx, 'mote', e.x, e.y, 10, { spread: 30, spreadY: 10, z: 16 });
      } else if (e.type === 'constructionStarted') {
        emit(fx, 'dust', e.x, e.y, 6, { spread: 30, spreadY: 10, z: 2 });
      } else if (e.type === 'tooYoung') {
        shake(fx, e.nodeId);
      }
    }
  };

  const every = (key, interval, dt) => {
    const t = (R.emitTimers.get(key) || 0) + dt;
    if (t >= interval) { R.emitTimers.set(key, t % interval); return true; }
    R.emitTimers.set(key, t);
    return false;
  };

  // Kontinuerlig liv: røyk, gnister, byggestøv og guddommelig byggelys.
  R.update = (state, dt, simDt, renderTime) => {
    const fx = R.fx;
    updateFx(fx, dt);
    for (const f of fx.falls) {
      if (!f.dusted && f.t > 1.3) {
        f.dusted = true;
        const len = treeHeight(f.species, f.growth) * 0.7;
        emit(fx, 'dust', f.x + f.dir * len * 0.6, f.y + 2, 10, { spread: len * 0.7, spreadY: 6, z: 2 });
      }
    }
    const w = wind(0, renderTime);
    for (const b of state.buildings) {
      if (b.type === 'fire' && b.complete) {
        if (every('smoke' + b.id, 0.28, dt)) emit(fx, 'smoke', b.x, b.y - 9, 1, { spread: 2, wind: w, z: 0, alpha: 0.24 });
        if (every('spark' + b.id, 0.5, dt)) emit(fx, 'spark', b.x, b.y - 4, 1, { spread: 3 });
      } else if (b.complete && simDt > 0) {
        if (every('chimney' + b.id, 1.4, dt)) emit(fx, 'smoke', b.x, b.y - 40, 1, { spread: 1.5, wind: w, light: true, alpha: 0.13 });
      } else if (!b.complete && b.divine) {
        if (every('divine' + b.id, 0.1, dt)) emit(fx, 'mote', b.x, b.y, 1, { spread: 40, spreadY: 14, z: 4 });
      } else if (!b.complete && simDt > 0 && b.builders.length) {
        if (every('build' + b.id, 0.6, dt)) emit(fx, 'dust', b.x, b.y, 2, { spread: 30, spreadY: 10, z: 3 });
      }
    }
  };

  R.updateWear = (state) => {
    const d = state.wear.data, px = R.wearImg.data;
    for (let i = 0; i < d.length; i++) {
      const a = Math.min(1, d[i] * 1.6);
      px[i * 4] = 108; px[i * 4 + 1] = 92; px[i * 4 + 2] = 66; px[i * 4 + 3] = a * 200;
    }
    R.wearCanvas.getContext('2d').putImageData(R.wearImg, 0, 0);
  };

  // ---------- Treffsjekk for klikking ----------
  R.pick = (state, cam, sx, sy) => {
    const p = screenToWorld(cam, sx, sy);
    const pad = 4 / zoomOf(cam);
    let best = null;
    for (const n of state.nodes) {
      let hit = false;
      if (n.kind === 'tree') {
        if (n.state !== 'alive') continue;
        const h = treeHeight(n.species, n.growth);
        const hw = Math.max(5, h * (n.species === 'spruce' ? 0.2 : 0.3)) + pad;
        hit = p.x > n.x - hw && p.x < n.x + hw && p.y > n.y - h - pad && p.y < n.y + 4 + pad;
      } else {
        const dx = (p.x - n.x) / (n.radius * 1.15 + pad), dy = (p.y - (n.y - n.radius * 0.35)) / (n.radius * 0.8 + pad);
        hit = dx * dx + dy * dy < 1;
      }
      if (hit && (!best || n.y > best.y)) best = n;
    }
    return best;
  };

  // ---------- Tegning ----------
  R.render = (state, cam, renderTime, hoverId) => {
    const dpr = cam.dpr || 1;
    const z = zoomOf(cam);
    const S = dpr * z;
    const E = dpr * (cam.screenW / 2) - cam.x * S, F = dpr * (cam.screenH / 2) - cam.y * S;
    const { width: W, height: H, pond } = state.world;
    const vh = viewH(cam);
    const vx0 = cam.x - cam.w / 2, vx1 = cam.x + cam.w / 2, vy0 = cam.y - vh / 2, vy1 = cam.y + vh / 2;
    const inView = (x, y, mx = 70, up = 150) => x > vx0 - mx && x < vx1 + mx && y > vy0 - 20 && y < vy1 + up;
    const detailed = cam.w < VIEW.semanticAreaW;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2c3222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(S, 0, 0, S, E, F);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Terreng og stier.
    const TS = TERRAIN_SCALE;
    const sx0 = clamp(vx0 - 4, 0, W), sy0 = clamp(vy0 - 4, 0, H), sx1 = clamp(vx1 + 4, 0, W), sy1 = clamp(vy1 + 4, 0, H);
    ctx.drawImage(R.terrain, sx0 * TS, sy0 * TS, (sx1 - sx0) * TS, (sy1 - sy0) * TS, sx0, sy0, sx1 - sx0, sy1 - sy0);
    ctx.drawImage(R.wearCanvas, 0, 0, W, H);

    // Lysglimt på vannet.
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39 + renderTime * 0.03;
      const x = pond.x + Math.cos(a) * pond.rx * 0.6 * ((i % 4) / 4 + 0.2);
      const y = pond.y + Math.sin(a * 1.3) * pond.ry * 0.55;
      ctx.fillStyle = `rgba(200,214,210,${(0.05 + 0.05 * Math.sin(renderTime * 1.3 + i)).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 6 + (i % 3) * 3, 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gress (kun i nær lesning — semantisk detaljnivå).
    const { tufts: tuftS, bushes: bushS } = decorSprites();
    const blockers = state.buildings;
    const sp = state.stockpile;
    if (z * dpr > 1.1) {
      for (const t of R.decor.tufts) {
        if (!inView(t.x, t.y, 20, 20)) continue;
        const wr = wearAt(state, t.x, t.y);
        const alpha = 1 - clamp(wr * 1.5);
        if (alpha < 0.05) continue;
        let hidden = Math.abs(t.x - sp.x) < 30 && Math.abs(t.y - sp.y) < 10;
        for (const b of blockers) if (Math.abs(t.x - b.x) < b.radius * 0.8 && Math.abs(t.y - b.y) < b.radius * 0.45) { hidden = true; break; }
        if (hidden) continue;
        const s = tuftS[t.v];
        const sk = wind(t.x, renderTime + t.phase * 0.1) * 0.22;
        const k = S * t.s;
        ctx.setTransform(k, 0, k * -sk, k, E + t.x * S, F + t.y * S);
        ctx.globalAlpha = alpha;
        ctx.drawImage(s.canvas, -s.ax, -s.ay, s.w, s.h);
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(S, 0, 0, S, E, F);
    }

    // Kontaktskygger (lys fra øvre venstre).
    // Myk skygge fra kronen + en tettere kontaktskygge ved foten.
    for (const n of state.nodes) {
      if (n.kind !== 'tree' || n.state !== 'alive' || !inView(n.x, n.y)) continue;
      const h = treeHeight(n.species, n.growth);
      const rx = h * (n.species === 'spruce' ? 0.3 : 0.4), ry = 3 + h * 0.08;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(SOFT, n.x + h * 0.18 - rx, n.y + 1 - ry, rx * 2, ry * 2);
      ctx.globalAlpha = 0.6;
      ctx.drawImage(SOFT, n.x - 3 - h * 0.03, n.y - 1.2, 7 + h * 0.06, 3);
    }
    ctx.globalAlpha = 0.7;
    for (const b of state.buildings) {
      if (b.type === 'fire' || b.progress < 0.5) continue;
      ctx.drawImage(SOFT, b.x + 8 - b.radius * 1.1, b.y + 3 - b.radius * 0.4, b.radius * 2.2, b.radius * 0.8);
    }
    ctx.globalAlpha = 1;
    for (const h of state.humans) if (inView(h.x, h.y)) drawHumanShadow(ctx, h);

    // Dybdesorterte objekter.
    const list = [];
    const fx = R.fx;
    for (const n of state.nodes) {
      if (!inView(n.x, n.y)) continue;
      list.push({ y: n.y, draw: () => (n.kind === 'tree' ? drawTree(n) : drawRock(n)) });
    }
    for (const b of R.decor.bushes) {
      if (!inView(b.x, b.y) || blockers.some((q) => Math.hypot(q.x - b.x, q.y - b.y) < q.radius + 8)) continue;
      list.push({ y: b.y, draw: () => drawSprite(ctx, bushS[b.v], b.x, b.y) });
    }
    for (const b of state.buildings) {
      list.push({ y: b.y, draw: () => drawBuilding(b) });
      if (!b.complete) {
        const n = Math.ceil((1 - b.progress) * 5);
        list.push({ y: b.y + 8, draw: () => drawSprite(ctx, materialSprite(n), b.x + b.radius + 4, b.y + 8) });
      }
    }
    list.push({ y: sp.y + WOOD_PILE_OFFSET.y, draw: () => drawSprite(ctx, woodPileSprite(pileCount(state.resources.wood)), sp.x + WOOD_PILE_OFFSET.x, sp.y + WOOD_PILE_OFFSET.y) });
    list.push({ y: sp.y + STONE_PILE_OFFSET.y, draw: () => drawSprite(ctx, stonePileSprite(pileCount(state.resources.stone)), sp.x + STONE_PILE_OFFSET.x, sp.y + STONE_PILE_OFFSET.y) });
    const hInfo = { time: state.time, gatherInterval: gatherInterval(state), renderTime };
    for (const h of state.humans) if (inView(h.x, h.y)) list.push({ y: h.y, draw: () => drawHuman(ctx, h, hInfo) });
    for (const f of fx.falls) list.push({ y: f.y + 0.5, draw: () => drawFall(f) });
    list.sort((a, b) => a.y - b.y);
    for (const o of list) o.draw();

    // Partikler og lys.
    drawParticles(ctx, fx, false);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of state.buildings) {
      if (b.type !== 'fire' || !b.complete) continue;
      drawFireGlow(ctx, b.x, b.y, renderTime);
      drawFlames(ctx, b.x, b.y - 1, renderTime);
    }
    drawParticles(ctx, fx, true);
    ctx.globalCompositeOperation = 'source-over';
    drawArcs(ctx, fx);

    // Skyskygger som driver over landskapet.
    for (const c of R.clouds) {
      const x = ((c.x + renderTime * 6) % (W + 800)) - 400;
      const g = ctx.createRadialGradient(x, c.y, 0, x, c.y, c.r);
      g.addColorStop(0, 'rgba(20,26,30,0.05)');
      g.addColorStop(1, 'rgba(20,26,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - c.r, c.y - c.r, c.r * 2, c.r * 2);
    }

    // Skjermrom: fargetone, vignett, små gevinsttall og områdeetikett.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sw = cam.screenW, sh = cam.screenH;
    ctx.fillStyle = 'rgba(255,214,160,0.05)';
    ctx.fillRect(0, 0, sw, sh);
    const vg = ctx.createRadialGradient(sw / 2, sh / 2, Math.min(sw, sh) * 0.35, sw / 2, sh / 2, Math.max(sw, sh) * 0.75);
    vg.addColorStop(0, 'rgba(10,8,4,0)');
    vg.addColorStop(1, 'rgba(10,8,4,0.3)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, sw, sh);

    ctx.textAlign = 'center';
    ctx.font = '600 13px Georgia, "Palatino Linotype", serif';
    for (const p of fx.popups) {
      const s = worldToScreen(cam, p.x, p.y);
      const a = 1 - clamp((p.age - 0.7) / 0.6);
      ctx.fillStyle = `rgba(20,14,8,${(0.5 * a).toFixed(3)})`;
      ctx.fillText(p.text, s.x + 1, s.y - p.age * 22 + 1);
      ctx.fillStyle = p.res === 'wood' ? `rgba(240,214,170,${a.toFixed(3)})` : `rgba(222,222,214,${a.toFixed(3)})`;
      ctx.fillText(p.text, s.x, s.y - p.age * 22);
    }

    const areaK = smooth(VIEW.semanticAreaW * 0.9, VIEW.semanticAreaW * 1.25, cam.w);
    if (areaK > 0 && state.buildings.length) {
      const C = state.settlement.center;
      const s = worldToScreen(cam, C.x, C.y - 120);
      const pop = state.humans.length, homes = state.buildings.filter((b) => b.complete && b.type !== 'fire').length;
      ctx.globalAlpha = areaK;
      ctx.font = 'italic 15px Georgia, "Palatino Linotype", serif';
      ctx.fillStyle = 'rgba(16,12,8,0.55)';
      ctx.fillText('Den første boplassen', s.x + 1, s.y + 1);
      ctx.fillStyle = '#efe4cc';
      ctx.fillText('Den første boplassen', s.x, s.y);
      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(236,226,204,0.85)';
      ctx.fillText(`${pop} mennesker · ${homes} hjem`, s.x, s.y + 17);
      ctx.globalAlpha = 1;
    }

    // --- lokale tegnefunksjoner ---
    function drawTree(n) {
      if (n.stump) drawStump(n);
      if (n.state !== 'alive') return;
      const { k, f } = growthLevels(n.growth);
      const s0 = treeSprite(n.species, n.variant, k), s1 = treeSprite(n.species, n.variant, k + 1);
      const sk = wind(n.x, renderTime) * 0.012 * (0.4 + n.growth) + shakeAngle(fx, n.id);
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.transform(1, 0, -sk, 1, 0, 0);
      if (n.id % 2) ctx.scale(-1, 1);
      if (hoverId === n.id) ctx.filter = 'brightness(1.16)';
      drawSprite(ctx, s0, 0, 0);
      if (f > 0.02) drawSprite(ctx, s1, 0, 0, f);
      ctx.filter = 'none';
      ctx.restore();
      if (n.chopped > 0) {
        // Hogstskår i stammen: dypere jo mer som er hugget.
        const cap = Math.max(1, treeCapacity(n));
        const depth = clamp(n.chopped / cap) * (1 + n.growth * 4.5) * 0.9;
        ctx.fillStyle = '#2a2018';
        ctx.beginPath();
        ctx.moveTo(n.x + 0.2, n.y - 3.4);
        ctx.lineTo(n.x + 0.2 + depth, n.y - 2.3);
        ctx.lineTo(n.x + 0.2, n.y - 1.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d8bc8c';
        ctx.fillRect(n.x + 0.2, n.y - 3, Math.max(0.3, depth * 0.6), 0.5);
      }
    }
    function drawStump(n) {
      const g = n.fellGrowth || 0.6;
      const r = 1 + g * 2.6;
      const h = 2 + g * 1.5;
      ctx.fillStyle = n.species === 'birch' ? '#a8a294' : '#5c4432';
      ctx.fillRect(n.x - r, n.y - h, r * 2, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(n.x + r * 0.2, n.y - h, r * 0.8, h);
      ctx.fillStyle = '#c9ab7e';
      ctx.beginPath();
      ctx.ellipse(n.x, n.y - h, r, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,90,60,0.6)';
      ctx.lineWidth = 0.25;
      ctx.beginPath();
      ctx.ellipse(n.x, n.y - h, r * 0.55, r * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    function drawRock(n) {
      const s = rockSprite(n, visibleBoulders(n));
      const sa = shakeAngle(fx, n.id) * 18;
      if (hoverId === n.id) ctx.filter = 'brightness(1.18)';
      drawSprite(ctx, s, n.x + sa, n.y);
      ctx.filter = 'none';
    }
    function drawBuilding(b) {
      const s = buildingSprite(b);
      drawSprite(ctx, s, b.x, b.y);
    }
    function drawFall(f) {
      const T = 1.3;
      const len = treeHeight(f.species, f.growth);
      if (f.t < T) {
        const { k } = growthLevels(f.growth);
        const s = treeSprite(f.species, f.variant, Math.min(k + 1, 11));
        const a = Math.pow(f.t / T, 2.2) * (Math.PI / 2) * f.dir * 0.92;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(a);
        drawSprite(ctx, s, 0, 0);
        ctx.restore();
      } else {
        const alpha = 1 - clamp((f.t - 6) / 3);
        ctx.globalAlpha = alpha;
        const L = len * 0.62;
        taper(ctx, f.x + f.dir * 3, f.y + 1, f.x + f.dir * (3 + L), f.y + 2.5, 1.2 + f.growth * 4, 0.6, f.species === 'birch' ? '#cfc9bb' : '#6a4c36');
        taper(ctx, f.x + f.dir * 3, f.y + 1.8, f.x + f.dir * (3 + L), f.y + 3, (1.2 + f.growth * 4) * 0.4, 0.3, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = '#d4b688';
        ctx.beginPath();
        ctx.ellipse(f.x + f.dir * 3, f.y + 1, 0.4 + f.growth * 0.8, 0.6 + f.growth * 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  };

  return R;
}
