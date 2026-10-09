// Små, dempede effekter: flis, løv, støv, røyk, gnister, bønnelys og ressurser som flyr til lageret.
import { clamp, makeCanvas } from './paint.js';

// Myk røykpuff (forhåndstegnet), tonet ved tegning.
const PUFF = (() => {
  const c = makeCanvas(48, 48), g = c.getContext('2d');
  const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.4)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 48, 48);
  return c;
})();
const PUFF_TINT = new Map();
const puffTint = (rgb) => {
  let c = PUFF_TINT.get(rgb);
  if (!c) {
    c = makeCanvas(48, 48);
    const g = c.getContext('2d');
    g.drawImage(PUFF, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = `rgb(${rgb})`;
    g.fillRect(0, 0, 48, 48);
    PUFF_TINT.set(rgb, c);
  }
  return c;
};

export function createFx() {
  return { parts: [], arcs: [], popups: [], shakes: new Map(), falls: [] };
}

const rand = Math.random; // Kun kosmetisk; påvirker aldri simuleringen.

export function emit(fx, kind, x, y, n = 1, opts = {}) {
  for (let i = 0; i < n; i++) {
    const p = { kind, x: x + (rand() - 0.5) * (opts.spread || 0), y: y + (rand() - 0.5) * (opts.spreadY || opts.spread || 0), z: opts.z || 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1 };
    switch (kind) {
      case 'chip': p.vx = (rand() - 0.5) * 30; p.vz = 14 + rand() * 18; p.max = 0.7 + rand() * 0.4; p.size = 0.6 + rand() * 0.5; p.color = rand() < 0.5 ? '#c8a878' : '#8a6a48'; break;
      case 'leaf': p.vx = (rand() - 0.5) * 8; p.vz = -3 - rand() * 3; p.max = 2 + rand() * 1.5; p.size = 0.9; p.color = rand() < 0.5 ? '#6f7f3a' : '#9a9a50'; break;
      case 'dust': p.vx = (rand() - 0.5) * 10; p.vz = 4 + rand() * 6; p.max = 0.9 + rand() * 0.4; p.size = 1.5 + rand() * 1.5; p.color = '150,140,122'; break;
      case 'smoke': p.vx = (opts.wind || 0) * 4 + (rand() - 0.5) * 2; p.vz = 7 + rand() * 4; p.max = 4 + rand() * 2.5; p.size = 1.2 + rand() * 0.8; p.color = opts.light ? '176,172,164' : '132,126,118'; p.alpha = opts.alpha || 0.22; break;
      case 'spark': p.vx = (rand() - 0.5) * 6; p.vz = 14 + rand() * 12; p.max = 0.6 + rand() * 0.6; p.size = 0.35; break;
      case 'mote': p.vx = (rand() - 0.5) * 3; p.vz = 7 + rand() * 4; p.max = 2.2 + rand(); p.size = 0.45 + rand() * 0.35; break;
      case 'sprout': p.vx = (rand() - 0.5) * 4; p.vz = 5 + rand() * 4; p.max = 1.4; p.size = 0.5; break;
    }
    fx.parts.push(p);
  }
}

export function flyToPile(fx, res, from, to) {
  fx.arcs.push({ res, x0: from.x, y0: from.y, x1: to.x, y1: to.y, t: 0, dur: 0.75 });
}

export function popup(fx, x, y, text, res) {
  fx.popups.push({ x, y, text, res, age: 0 });
  if (fx.popups.length > 24) fx.popups.shift();
}

export function shake(fx, id) {
  fx.shakes.set(id, 0);
}

export function updateFx(fx, dt) {
  for (const p of fx.parts) {
    p.life += dt;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    if (p.kind === 'chip' || p.kind === 'dust') { p.vz -= (p.kind === 'chip' ? 70 : 8) * dt; if (p.z < 0) { p.z = 0; p.vz = 0; p.vx *= 0.5; } }
    if (p.kind === 'leaf') { p.vx += Math.sin(p.life * 4 + p.y) * 6 * dt; if (p.z < 0) { p.z = 0; p.vz = 0; p.vx = 0; } }
    if (p.kind === 'smoke') { p.size += dt * 2.6; p.vz *= 1 - dt * 0.15; }
    if (p.kind === 'spark') p.vz -= 10 * dt;
  }
  fx.parts = fx.parts.filter((p) => p.life < p.max);
  if (fx.parts.length > 900) fx.parts.splice(0, fx.parts.length - 900);
  for (const a of fx.arcs) a.t += dt / a.dur;
  fx.arcs = fx.arcs.filter((a) => a.t < 1);
  for (const pp of fx.popups) pp.age += dt;
  fx.popups = fx.popups.filter((pp) => pp.age < 1.3);
  for (const [id, t] of fx.shakes) { if (t > 0.45) fx.shakes.delete(id); else fx.shakes.set(id, t + dt); }
  for (const f of fx.falls) f.t += dt;
  fx.falls = fx.falls.filter((f) => f.t < 9);
}

export function shakeAngle(fx, id) {
  const t = fx.shakes.get(id);
  if (t == null) return 0;
  return Math.sin(t * 40) * 0.035 * (1 - t / 0.45);
}

export function drawParticles(ctx, fx, additive) {
  for (const p of fx.parts) {
    const k = p.life / p.max;
    const glow = p.kind === 'spark' || p.kind === 'mote';
    if (glow !== additive) continue;
    const y = p.y - p.z;
    if (p.kind === 'smoke') {
      ctx.globalAlpha = p.alpha * Math.sin(Math.PI * Math.min(1, k * 1.3 + 0.05)) * 1.4;
      const r = p.size * 1.6;
      ctx.drawImage(puffTint(p.color), p.x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    } else if (p.kind === 'dust') {
      ctx.fillStyle = `rgba(${p.color},${(0.35 * (1 - k)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, y, p.size * (1 + k), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'spark') {
      ctx.fillStyle = `rgba(255,190,110,${(1 - k).toFixed(3)})`;
      ctx.fillRect(p.x - p.size / 2, y - p.size / 2, p.size, p.size);
    } else if (p.kind === 'mote') {
      const a = Math.sin(Math.PI * k) * 0.45;
      const g = ctx.createRadialGradient(p.x, y, 0, p.x, y, p.size * 3);
      g.addColorStop(0, `rgba(255,226,160,${a.toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - p.size * 3, y - p.size * 3, p.size * 6, p.size * 6);
    } else if (p.kind === 'sprout') {
      ctx.fillStyle = `rgba(190,220,140,${(0.7 * (1 - k)).toFixed(3)})`;
      ctx.fillRect(p.x, y, 0.6, 0.6);
    } else {
      ctx.globalAlpha = 1 - clamp((k - 0.7) / 0.3);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, y - p.size / 2, p.size, p.size * 0.6);
      ctx.globalAlpha = 1;
    }
  }
}

export function drawArcs(ctx, fx) {
  for (const a of fx.arcs) {
    const t = a.t, e = t * t * (3 - 2 * t);
    const x = a.x0 + (a.x1 - a.x0) * e;
    const y = a.y0 + (a.y1 - a.y0) * e - Math.sin(Math.PI * t) * 26;
    ctx.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 1;
    if (a.res === 'wood') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 5);
      ctx.fillStyle = '#6a4c32';
      ctx.fillRect(-2.2, -0.75, 4.4, 1.5);
      ctx.fillStyle = '#c4a072';
      ctx.fillRect(1.6, -0.75, 0.6, 1.5);
      ctx.restore();
    } else {
      ctx.fillStyle = '#8a857a';
      ctx.beginPath();
      ctx.ellipse(x, y, 1.6, 1.2, t * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// Levende bål: varm lyspytt på bakken, glør, lagdelte flammer og få gnister.
export function drawFireGlow(ctx, x, y, t, strength = 1) {
  const flick = 0.86 + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.1 + 1) * 0.04 + Math.sin(t * 3.1) * 0.03;
  const R = 78;
  ctx.save();
  ctx.translate(x, y - 2);
  ctx.scale(1, 0.72); // lyset lander flatt på bakken
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R);
  g.addColorStop(0, `rgba(255,176,86,${(0.3 * flick * strength).toFixed(3)})`);
  g.addColorStop(0.25, `rgba(255,140,56,${(0.15 * flick * strength).toFixed(3)})`);
  g.addColorStop(0.6, `rgba(240,110,40,${(0.04 * flick * strength).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.restore();
}

// Glør i asken: små, pulserende punkter under flammene.
export function drawEmbers(ctx, x, y, t) {
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4 + 0.7, d = 1.0 + (i % 4) * 1.2;
    const ex = x + Math.cos(a) * d * 1.3, ey = y + Math.sin(a) * d * 0.55;
    const p = 0.55 + 0.45 * Math.sin(t * (2.2 + (i % 3) * 0.9) + i * 1.7);
    ctx.fillStyle = `rgba(255,${110 + (i % 3) * 25},40,${(0.3 + 0.35 * p).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 0.6 + (i % 2) * 0.3, 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Tre lag flammer (ytre rød/oransje, midtre oransje, indre gulhvit) med uavhengig svaiing.
export function drawFlames(ctx, x, y, t) {
  const layers = [
    { s: 1, c0: 'rgba(255,196,104,0.8)', c1: 'rgba(214,84,30,0)', cm: 'rgba(240,120,40,0.62)', w: 2.3 },
    { s: 0.72, c0: 'rgba(255,230,150,0.9)', c1: 'rgba(255,150,50,0)', cm: 'rgba(255,176,70,0.75)', w: 1.8 },
    { s: 0.42, c0: 'rgba(255,248,214,0.95)', c1: 'rgba(255,214,120,0)', cm: 'rgba(255,230,150,0.8)', w: 1.2 },
  ];
  const tongues = [[-2.4, 0.9, 6.2], [1.9, 1.3, 7.2], [0, 2.1, 9.6], [-0.8, 3.1, 5.8], [2.8, 0.4, 4.8]];
  for (const L of layers) {
    for (const [ox, ph, h] of tongues) {
      const hh = h * L.s * (0.74 + 0.22 * Math.sin(t * 8.3 + ph * 3) + 0.1 * Math.sin(t * 17.3 + ph) + 0.05 * Math.sin(t * 31 + ph * 2));
      const sway = Math.sin(t * 4.6 + ph) * 1.1 + Math.sin(t * 9.1 + ph * 2) * 0.4;
      const bx = x + ox * (0.6 + 0.4 * L.s);
      const g = ctx.createLinearGradient(0, y, 0, y - hh);
      g.addColorStop(0, L.c0);
      g.addColorStop(0.45, L.cm);
      g.addColorStop(1, L.c1);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx - L.w, y - 0.4);
      ctx.quadraticCurveTo(bx - L.w * 1.05 + sway * 0.25, y - hh * 0.5, bx + sway, y - hh);
      ctx.quadraticCurveTo(bx + L.w * 1.05 + sway * 0.25, y - hh * 0.5, bx + L.w, y - 0.4);
      ctx.closePath();
      ctx.fill();
    }
  }
}
