// Små, dempede effekter: flis, løv, støv, røyk, gnister, bønnelys og ressurser som flyr til lageret.
import { clamp } from './paint.js';

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
      case 'smoke': p.vx = (opts.wind || 0) * 4 + (rand() - 0.5) * 2; p.vz = 7 + rand() * 4; p.max = 4 + rand() * 2.5; p.size = 1.5 + rand(); p.color = opts.light ? '170,166,160' : '120,116,110'; p.alpha = opts.alpha || 0.22; break;
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
      ctx.fillStyle = `rgba(${p.color},${(p.alpha * Math.sin(Math.PI * Math.min(1, k * 1.3 + 0.05))).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
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

// Levende bål: glød på bakken, flammer og gnister.
export function drawFireGlow(ctx, x, y, t, strength = 1) {
  const flick = 0.85 + Math.sin(t * 7.3) * 0.06 + Math.sin(t * 13.1) * 0.05;
  const g = ctx.createRadialGradient(x, y - 3, 2, x, y, 70);
  g.addColorStop(0, `rgba(255,170,80,${(0.28 * flick * strength).toFixed(3)})`);
  g.addColorStop(0.4, `rgba(255,130,50,${(0.09 * flick * strength).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 70, y - 70, 140, 140);
}

export function drawFlames(ctx, x, y, t) {
  const tongues = [[-2.2, 0.9, 6.5], [1.8, 1.3, 7.5], [0, 2.1, 10], [-0.6, 3.1, 6], [2.6, 0.4, 5]];
  for (const [ox, ph, h] of tongues) {
    const hh = h * (0.75 + 0.25 * Math.sin(t * 9 + ph * 3) + 0.12 * Math.sin(t * 17 + ph));
    const sway = Math.sin(t * 5 + ph) * 1.2;
    const g = ctx.createLinearGradient(0, y, 0, y - hh);
    g.addColorStop(0, 'rgba(255,236,170,0.95)');
    g.addColorStop(0.35, 'rgba(255,170,70,0.85)');
    g.addColorStop(1, 'rgba(200,70,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + ox - 2, y - 0.5);
    ctx.quadraticCurveTo(x + ox - 2.2 + sway * 0.3, y - hh * 0.5, x + ox + sway, y - hh);
    ctx.quadraticCurveTo(x + ox + 2.2 + sway * 0.3, y - hh * 0.5, x + ox + 2, y - 0.5);
    ctx.closePath();
    ctx.fill();
  }
}
