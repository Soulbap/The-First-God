// Mennesker tegnes levende hvert bilde: gange, hogst, steinbryting, bygging, bæring, hvile og bønn.
// Proporsjoner: ca. 7,5 hodelengder; 16 verdensenheter ≈ 1,7 m.
import { clamp } from './paint.js';

const TUNICS = ['#8a7d66', '#6b5139', '#86653a', '#5d634c', '#7a4a38'];
const SKINS = ['#c49a7c', '#a8795a', '#d3ab8e', '#8f6347'];
const HAIRS = ['#2e241c', '#4b3a2a', '#6e5539', '#2a2522'];
const LEGS = '#4a3f33';

function limb(ctx, x0, y0, x1, y1, x2, y2, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// Vinkel → håndposisjon for en arm fra skulderen.
const handAt = (sx, sy, a, len) => ({ x: sx + Math.sin(a) * len, y: sy + Math.cos(a) * len });

function tool(ctx, hx, hy, a, kind) {
  const L = kind === 'axe' ? 5.2 : 4.4;
  const ex = hx + Math.sin(a) * L, ey = hy + Math.cos(a) * L;
  ctx.strokeStyle = '#6a5038';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(hx - Math.sin(a) * 0.8, hy - Math.cos(a) * 0.8);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.fillStyle = kind === 'axe' ? '#5a5650' : '#7c766a';
  ctx.beginPath();
  if (kind === 'axe') {
    const px = Math.cos(a), py = -Math.sin(a);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + px * 1.9 - Math.sin(a) * 0.9, ey + py * 1.9 - Math.cos(a) * 0.9);
    ctx.lineTo(ex + px * 1.9 + Math.sin(a) * 0.5, ey + py * 1.9 + Math.cos(a) * 0.5);
    ctx.closePath();
  } else {
    ctx.ellipse(ex, ey, 1.2, 0.95, a, 0, Math.PI * 2);
  }
  ctx.fill();
}

export function drawHumanShadow(ctx, h) {
  ctx.fillStyle = 'rgba(18,14,10,0.32)';
  ctx.beginPath();
  ctx.ellipse(h.x + 1.2, h.y + 0.4, 4.2, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHuman(ctx, h, ctxInfo) {
  const { time, gatherInterval, renderTime } = ctxInfo;
  const L = h.look;
  const age = time - h.born;
  const alpha = clamp(age / 1.2);
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.scale(h.dir * L.height, L.height);
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const moving = h.state === 'toNode' || h.state === 'toStore' || h.state === 'toSite' || h.state === 'toFire' || h.state === 'wander' || h.state === 'arriving';
  const sitting = h.state === 'rest';
  const working = h.state === 'gather' || h.state === 'build';
  const tunic = TUNICS[L.tunic], skin = SKINS[L.skin], hair = HAIRS[L.hair];
  const phase = h.walk * 0.42;
  const bob = moving ? Math.abs(Math.sin(phase)) * 0.5 : Math.sin(renderTime * 1.6 + h.id) * 0.12;
  let hipY = -8 - bob, shoulderY = -13.2 - bob, lean = 0;
  if (sitting) { hipY = -3.2; shoulderY = -8.4; }
  if (h.state === 'build') { hipY = -6.2; shoulderY = -11.2; lean = 1.0; }
  if (h.state === 'gather' && h.gatherKind === 'stone') { lean = 1.3; shoulderY += 0.6; }

  // Bein.
  if (sitting) {
    limb(ctx, 0, hipY, 4, hipY - 1.6, 5, 0, 1.6, LEGS);
    limb(ctx, -0.4, hipY, 3.4, hipY - 1.2, 4.2, 0, 1.6, '#3e352b');
  } else if (moving) {
    const s = Math.sin(phase), c = Math.cos(phase);
    limb(ctx, 0, hipY, s * 1.4, -4 + Math.max(0, -c) * 0.8, s * 2.4, -Math.max(0, c) * 0.9, 1.6, '#3e352b');
    limb(ctx, 0, hipY, -s * 1.4, -4 + Math.max(0, c) * 0.8, -s * 2.4, -Math.max(0, -c) * 0.9, 1.6, LEGS);
  } else {
    const kneel = h.state === 'build' ? 1.5 : 0;
    limb(ctx, -0.6, hipY, -1 + kneel, -4 + kneel * 0.5, -1.4, 0, 1.6, '#3e352b');
    limb(ctx, 0.6, hipY, 1 + kneel * 1.6, -4 + kneel, 1.2 + kneel, 0, 1.6, LEGS);
  }

  // Kropp (kjortel) med lys fra venstre.
  const sx = lean;
  ctx.fillStyle = tunic;
  ctx.beginPath();
  ctx.moveTo(sx - 1.8, shoulderY);
  ctx.lineTo(sx + 1.8, shoulderY);
  ctx.lineTo(2.5, sitting ? hipY + 0.6 : -5.2);
  ctx.lineTo(-2.5, sitting ? hipY + 0.6 : -5.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.moveTo(sx + 0.4, shoulderY);
  ctx.lineTo(sx + 1.8, shoulderY);
  ctx.lineTo(2.5, sitting ? hipY + 0.6 : -5.2);
  ctx.lineTo(0.6, sitting ? hipY + 0.6 : -5.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,20,0.7)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-2.1, hipY - 1.2);
  ctx.lineTo(2.1, hipY - 1.2);
  ctx.stroke();

  // Armer og redskap.
  const shX = sx, shY = shoulderY + 0.4;
  const arm = (a, len = 5.6, col = tunic) => {
    const e = handAt(shX, shY, a * 0.6, len * 0.5);
    const hnd = handAt(shX, shY, a, len);
    limb(ctx, shX, shY, e.x, e.y, hnd.x, hnd.y, 1.15, col);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hnd.x, hnd.y, 0.55, 0, Math.PI * 2);
    ctx.fill();
    return hnd;
  };
  if (h.state === 'gather') {
    const u = clamp(h.timer / gatherInterval);
    // Vinkel: 0 = rett ned, π/2 = fremover, π = rett opp. Løft sakte, slag raskt — slaget treffer når sanketikken skjer.
    const low = h.gatherKind === 'wood' ? 1.25 : 0.75, high = 3.35;
    const ang = u < 0.72
      ? low + (high - low) * (1 - Math.pow(1 - u / 0.72, 2))
      : high - (high - low) * Math.pow((u - 0.72) / 0.28, 2);
    const hnd = arm(ang, 5.2);
    arm(ang - 0.15, 5.0, 'rgba(0,0,0,0.25)');
    tool(ctx, hnd.x, hnd.y, ang, h.gatherKind === 'wood' ? 'axe' : 'hammer');
  } else if (h.state === 'build') {
    const u = (renderTime * 1.7 + h.id * 0.37) % 1;
    const ang = 0.9 + (u < 0.7 ? u / 0.7 : 1 - (u - 0.7) / 0.3) * 1.5;
    const hnd = arm(ang, 5.0);
    tool(ctx, hnd.x, hnd.y, ang, 'hammer');
    arm(0.5, 5.0, 'rgba(0,0,0,0.25)');
  } else if (sitting) {
    const praying = h.timer < 1.6;
    if (praying) { arm(2.5, 5.4); arm(2.8, 5.4, 'rgba(0,0,0,0.2)'); } else { arm(0.9, 5.0); arm(0.6, 5.0, 'rgba(0,0,0,0.2)'); }
  } else if (h.carry.amount > 0 && h.carry.type === 'wood') {
    arm(2.7, 5.0);
    const n = Math.min(5, h.carry.amount);
    for (let i = 0; i < n; i++) {
      const y = shoulderY - 1.6 - (i % 2) * 1.1 - Math.floor(i / 2) * 0.4;
      ctx.strokeStyle = '#5c4430';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.moveTo(-4.2 + (i % 3) * 0.5, y + 0.6);
      ctx.lineTo(3.6 - (i % 2) * 0.6, y - 0.4);
      ctx.stroke();
      ctx.fillStyle = '#b89870';
      ctx.beginPath();
      ctx.arc(3.6 - (i % 2) * 0.6, y - 0.4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    arm(-0.3 + Math.sin(phase) * 0.3, 5.4, 'rgba(0,0,0,0.2)');
  } else if (h.carry.amount > 0 && h.carry.type === 'stone') {
    const n = Math.min(5, h.carry.amount);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#7a756a' : '#8d887c';
      ctx.beginPath();
      ctx.ellipse(2.4 + (i % 2) * 0.8, shoulderY + 4.4 - Math.floor(i / 2) * 1.1, 1.4, 1.0, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    arm(1.1, 4.8);
    arm(1.3, 4.6, 'rgba(0,0,0,0.25)');
  } else {
    const sw = moving ? Math.sin(phase) * 0.45 : 0.05;
    arm(-sw, 5.6, 'rgba(0,0,0,0.25)');
    arm(sw, 5.6);
  }

  // Hode.
  const hx = sx + 0.15, hy = shoulderY - 1.75;
  ctx.fillStyle = skin;
  ctx.fillRect(hx - 0.45, shoulderY - 1.0, 0.9, 1.1);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 1.05, 1.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(hx - 0.25, hy - 0.35, 1.12, 0.95, -0.3, Math.PI * 0.95, Math.PI * 2.15);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(hx + 0.35, hy + 0.1, 0.6, 1.0, 0, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.restore();
}
