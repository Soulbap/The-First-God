// Mennesker tegnes levende hvert bilde: gange, hogst, steinbryting, bygging, bæring, hvile og bønn.
// Proporsjoner: ca. 7,5 hodelengder; 16 verdensenheter ≈ 1,7 m.
// Variasjon (hårfasong, kappe, belte, holdning) avledes av id — simuleringens tilfeldighet er urørt.
import { clamp } from './paint.js';

const TUNICS = ['#9a8a6a', '#7a5c3e', '#a07c48', '#6e6e54', '#8e5a42'];
const SKINS = ['#c49a7c', '#a8795a', '#d3ab8e', '#8f6347'];
const HAIRS = ['#2e241c', '#4b3a2a', '#6e5539', '#2a2522'];
const WRAPS = ['#5a4a38', '#4a4034', '#665440'];
const CLOAKS = ['#4a3a2c', '#5a4632', '#3e3a30'];
const BELTS = ['#3a2c20', '#6a4a30', '#2c2a24'];
const LEGS = '#4e4234', LEGS_FAR = '#3c3228';
const OUTLINE = 'rgba(26,18,10,0.55)';

function limb(ctx, x0, y0, x1, y1, x2, y2, w, color, foot = 0) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  if (foot) {
    ctx.fillStyle = '#2e251c';
    ctx.beginPath();
    ctx.ellipse(x2 + foot * 0.6, y2 - 0.1, 1.15, 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Vinkel → håndposisjon for en arm fra skulderen.
const handAt = (sx, sy, a, len) => ({ x: sx + Math.sin(a) * len, y: sy + Math.cos(a) * len });

function tool(ctx, hx, hy, a, kind) {
  const L = kind === 'axe' ? 5.6 : 4.6;
  const ex = hx + Math.sin(a) * L, ey = hy + Math.cos(a) * L;
  ctx.strokeStyle = '#6c523a';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(hx - Math.sin(a) * 0.8, hy - Math.cos(a) * 0.8);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  if (kind === 'axe') {
    // Steinøks: bred, mørk egg med lys kant slik at redskapet leses mot grønt.
    const px = Math.cos(a), py = -Math.sin(a);
    ctx.fillStyle = '#4e4b46';
    ctx.beginPath();
    ctx.moveTo(ex - Math.sin(a) * 0.4, ey - Math.cos(a) * 0.4);
    ctx.lineTo(ex + px * 2.5 - Math.sin(a) * 1.2, ey + py * 2.5 - Math.cos(a) * 1.2);
    ctx.lineTo(ex + px * 2.5 + Math.sin(a) * 0.9, ey + py * 2.5 + Math.cos(a) * 0.9);
    ctx.lineTo(ex + Math.sin(a) * 0.6, ey + Math.cos(a) * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(206,202,190,0.75)';
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    ctx.moveTo(ex + px * 2.5 - Math.sin(a) * 1.2, ey + py * 2.5 - Math.cos(a) * 1.2);
    ctx.lineTo(ex + px * 2.5 + Math.sin(a) * 0.9, ey + py * 2.5 + Math.cos(a) * 0.9);
    ctx.stroke();
    ctx.strokeStyle = '#3a2c20';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(ex - Math.sin(a) * 0.3 - px * 0.3, ey - Math.cos(a) * 0.3 - py * 0.3);
    ctx.lineTo(ex + Math.sin(a) * 0.5 - px * 0.3, ey + Math.cos(a) * 0.5 - py * 0.3);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#85806f';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 1.45, 1.1, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(214,208,192,0.55)';
    ctx.beginPath();
    ctx.ellipse(ex - 0.35, ey - 0.35, 0.6, 0.4, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Myk kontaktskygge: to lag, forskjøvet mot nedre høyre (lys fra øvre venstre).
export function drawHumanShadow(ctx, h) {
  ctx.fillStyle = 'rgba(18,14,10,0.16)';
  ctx.beginPath();
  ctx.ellipse(h.x + 1.8, h.y + 0.5, 5.6, 1.9, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(18,14,10,0.26)';
  ctx.beginPath();
  ctx.ellipse(h.x + 0.9, h.y + 0.35, 3.4, 1.15, 0.1, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHuman(ctx, h, ctxInfo) {
  const { time, gatherInterval, renderTime } = ctxInfo;
  const L = h.look;
  const age = time - h.born;
  const alpha = clamp(age / 1.2);
  if (alpha <= 0) return;
  const hv = h.id % 6;
  const hairStyle = hv % 3, cloak = hv >= 3, stoop = ((h.id * 13) % 5) / 5 * 0.45;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.scale(h.dir * L.height * (1 + ((h.id * 7) % 5 - 2) * 0.012), L.height);
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const moving = h.state === 'toNode' || h.state === 'toStore' || h.state === 'toSite' || h.state === 'toFire' || h.state === 'toMaintain' || h.state === 'toExplore' || h.state === 'returning' || h.state === 'wander' || h.state === 'arriving' || h.state === 'toDeliver' || h.state === 'toDeliveryPickup' || h.state === 'toFound' || h.state === 'toSettle' || h.state === 'toEdge' || h.state === 'expReturn';
  const sitting = h.state === 'rest';
  const tunic = TUNICS[L.tunic % TUNICS.length], skin = SKINS[L.skin % SKINS.length], hair = HAIRS[L.hair % HAIRS.length];
  const phase = h.walk * 0.42;
  const bob = moving ? Math.abs(Math.sin(phase)) * 0.55 : Math.sin(renderTime * 1.6 + h.id) * 0.12;
  let hipY = -8 - bob, shoulderY = -13.2 - bob, lean = moving ? 0.5 : stoop + Math.sin(renderTime * 0.5 + h.id) * 0.25;
  if (sitting) { hipY = -3.2; shoulderY = -8.4; lean = 0.2; }
  if (h.state === 'build') { hipY = -6.2; shoulderY = -11.2; lean = 1.0; }
  if (h.state === 'gather' && h.gatherKind === 'stone') { lean = 1.3; shoulderY += 0.6; }
  if (h.carry.amount > 0 && h.carry.type === 'stone' && !sitting) lean += 0.6;
  const idleShift = !moving && !sitting && h.state !== 'gather' && h.state !== 'build' ? Math.sin(renderTime * 0.35 + h.id * 1.7) * 0.5 : 0;

  // Bein: omvikling og mørke myke sko; lengre skritt og tydelig bakre bein.
  if (sitting) {
    limb(ctx, 0, hipY, 4, hipY - 1.6, 5, 0, 1.7, LEGS, 1);
    limb(ctx, -0.4, hipY, 3.4, hipY - 1.2, 4.2, 0, 1.7, LEGS_FAR, 1);
  } else if (moving) {
    const s = Math.sin(phase), c = Math.cos(phase);
    limb(ctx, 0, hipY, s * 1.6, -4 + Math.max(0, -c) * 0.9, s * 2.9, -Math.max(0, c) * 1.0, 1.7, LEGS_FAR, 1);
    limb(ctx, 0, hipY, -s * 1.6, -4 + Math.max(0, c) * 0.9, -s * 2.9, -Math.max(0, -c) * 1.0, 1.7, LEGS, 1);
  } else {
    const kneel = h.state === 'build' ? 1.5 : 0;
    limb(ctx, -0.6, hipY, -1 + kneel - idleShift * 0.3, -4 + kneel * 0.5, -1.5 - idleShift * 0.4, 0, 1.7, LEGS_FAR, 1);
    limb(ctx, 0.6, hipY, 1 + kneel * 1.6 + idleShift * 0.2, -4 + kneel, 1.3 + kneel + idleShift * 0.3, 0, 1.7, LEGS, 1);
  }
  // Lysere omvikling nederst på leggene så bena leses mot gresset.
  if (!sitting) {
    ctx.strokeStyle = WRAPS[hv % WRAPS.length];
    ctx.lineWidth = 0.35;
    for (const o of moving ? [0.9, 1.6] : [1.1, 1.8]) { ctx.beginPath(); ctx.moveTo(-1.8, -o - 0.3); ctx.lineTo(1.8, -o); ctx.stroke(); }
  }

  // Kropp (kjortel) med lys fra venstre, utsvunget fald, belte og mørk kontur.
  const sx = lean + idleShift * 0.2;
  const hemY = sitting ? hipY + 0.6 : -4.6, hemW = sitting ? 2.6 : 3.0;
  ctx.beginPath();
  ctx.moveTo(sx - 2.0, shoulderY);
  ctx.lineTo(sx + 2.0, shoulderY);
  ctx.lineTo(hemW, hemY);
  ctx.lineTo(-hemW, hemY);
  ctx.closePath();
  ctx.fillStyle = tunic;
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.beginPath();
  ctx.moveTo(sx + 0.4, shoulderY);
  ctx.lineTo(sx + 2.0, shoulderY);
  ctx.lineTo(hemW, hemY);
  ctx.lineTo(0.6, hemY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,238,200,0.16)';
  ctx.beginPath();
  ctx.moveTo(sx - 2.0, shoulderY);
  ctx.lineTo(sx - 0.8, shoulderY);
  ctx.lineTo(-hemW + 1.0, hemY);
  ctx.lineTo(-hemW, hemY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(30,20,12,0.4)';
  ctx.fillRect(-hemW, hemY - 0.35, hemW * 2, 0.45);
  if (cloak) {
    // Skinnkappe over skuldrene: gir en tydeligere silhuett og tonal variasjon mellom personene.
    ctx.fillStyle = CLOAKS[hv % CLOAKS.length];
    ctx.beginPath();
    ctx.moveTo(sx - 2.3, shoulderY - 0.1);
    ctx.lineTo(sx + 2.3, shoulderY - 0.1);
    ctx.lineTo(sx + 2.8, shoulderY + 3.1);
    ctx.lineTo(sx - 0.2, shoulderY + 2.4);
    ctx.lineTo(sx - 2.6, shoulderY + 3.0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,230,190,0.14)';
    ctx.fillRect(sx - 2.3, shoulderY - 0.1, 4.6, 0.35);
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.38;
  ctx.beginPath();
  ctx.moveTo(sx - 2.0, shoulderY);
  ctx.lineTo(-hemW, hemY);
  ctx.moveTo(sx + 2.0, shoulderY);
  ctx.lineTo(hemW, hemY);
  ctx.stroke();
  const beltY = (shoulderY + hemY) / 2 + 1.1;
  ctx.strokeStyle = BELTS[hv % BELTS.length];
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(-2.4, beltY);
  ctx.lineTo(2.4, beltY);
  ctx.stroke();

  // Armer og redskap.
  const shX = sx, shY = shoulderY + 0.4;
  const armCol = cloak ? CLOAKS[hv % CLOAKS.length] : tunic;
  const arm = (a, len = 5.6, col = tunic) => {
    const e = handAt(shX, shY, a * 0.6, len * 0.5);
    const hnd = handAt(shX, shY, a, len);
    limb(ctx, shX, shY, e.x, e.y, hnd.x, hnd.y, 1.2, col);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hnd.x, hnd.y, 0.6, 0, Math.PI * 2);
    ctx.fill();
    return hnd;
  };
  const far = 'rgba(0,0,0,0.28)';
  if (h.state === 'gather') {
    const u = clamp(h.timer / gatherInterval);
    // Vinkel: 0 = rett ned, π/2 = fremover, π = rett opp. Løft sakte, slag raskt — slaget treffer når sanketikken skjer.
    const low = h.gatherKind === 'wood' ? 1.25 : 0.75, high = 3.35;
    const ang = u < 0.72
      ? low + (high - low) * (1 - Math.pow(1 - u / 0.72, 2))
      : high - (high - low) * Math.pow((u - 0.72) / 0.28, 2);
    arm(ang - 0.15, 5.0, far);
    const hnd = arm(ang, 5.2, armCol);
    tool(ctx, hnd.x, hnd.y, ang, h.gatherKind === 'wood' ? 'axe' : 'hammer');
  } else if (h.state === 'build') {
    const u = (renderTime * 1.7 + h.id * 0.37) % 1;
    const ang = 0.9 + (u < 0.7 ? u / 0.7 : 1 - (u - 0.7) / 0.3) * 1.5;
    arm(0.5, 5.0, far);
    const hnd = arm(ang, 5.0, armCol);
    tool(ctx, hnd.x, hnd.y, ang, 'hammer');
  } else if (sitting) {
    const praying = h.timer < 1.6;
    if (praying) { arm(2.5, 5.4, armCol); arm(2.8, 5.4, far); } else { arm(0.9, 5.0, armCol); arm(0.6, 5.0, far); }
  } else if (h.carry.amount > 0 && h.carry.type === 'wood') {
    // Vedbyrde på skulderen med tydelige kappflater.
    arm(-0.3 + Math.sin(phase) * 0.3, 5.4, far);
    const n = Math.min(5, h.carry.amount);
    for (let i = 0; i < n; i++) {
      const y = shoulderY - 1.5 - (i % 2) * 1.2 - Math.floor(i / 2) * 0.4;
      ctx.strokeStyle = i % 2 ? '#664a32' : '#54402c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-4.4 + (i % 3) * 0.5, y + 0.7);
      ctx.lineTo(3.8 - (i % 2) * 0.6, y - 0.4);
      ctx.stroke();
      ctx.fillStyle = '#c8a678';
      ctx.beginPath();
      ctx.ellipse(3.8 - (i % 2) * 0.6, y - 0.4, 0.45, 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    arm(2.7, 5.0, armCol);
  } else if (h.carry.amount > 0 && h.carry.type === 'stone') {
    arm(1.3, 4.6, far);
    const n = Math.min(5, h.carry.amount);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#7a756a' : '#939083';
      ctx.beginPath();
      ctx.ellipse(2.4 + (i % 2) * 0.8, shoulderY + 4.4 - Math.floor(i / 2) * 1.1, 1.5, 1.05, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    arm(1.1, 4.8, armCol);
  } else {
    const sw = moving ? Math.sin(phase) * 0.5 : 0.05;
    arm(-sw, 5.6, far);
    if (!moving && !sitting && h.id % 3 === 1) {
      // Hånd på hoften i hvile.
      const e = { x: shX + 2.2, y: shY + 2.6 }, hnd = { x: shX + 0.9, y: shY + 4.6 };
      limb(ctx, shX, shY, e.x, e.y, hnd.x, hnd.y, 1.2, armCol);
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(hnd.x, hnd.y, 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else arm(sw, 5.6, armCol);
  }

  // Hode med hårfasong (kort, bundet i nakken eller pannebånd).
  const hx = sx + 0.15 + (moving ? 0.3 : 0), hy = shoulderY - 1.8;
  ctx.fillStyle = skin;
  ctx.fillRect(hx - 0.5, shoulderY - 1.0, 1.0, 1.2);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 1.1, 1.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(hx - 0.25, hy - 0.35, 1.18, 1.0, -0.3, Math.PI * 0.95, Math.PI * 2.15);
  ctx.fill();
  if (hairStyle === 1) {
    ctx.beginPath();
    ctx.ellipse(hx - 1.15, hy + 0.5, 0.55, 1.2, 0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (hairStyle === 2) {
    ctx.strokeStyle = '#8a6a44';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(hx - 1.1, hy - 0.45);
    ctx.lineTo(hx + 1.1, hy - 0.45);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(hx + 0.4, hy + 0.1, 0.62, 1.05, 0, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,18,10,0.4)';
  ctx.lineWidth = 0.25;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 1.1, 1.22, 0, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  ctx.restore();
}
