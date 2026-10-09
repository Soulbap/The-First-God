// Kamera i verdenskoordinater. Ren matematikk — testbar uten nettleser.
// Kameraet beskrives med sentrum (x, y) og synlig bredde w i verdensenheter.
export const VIEW = {
  near: { w: 600, minW: 340, maxW: 820 },
  area: { w: 1850, maxW: 2300 },
  semanticAreaW: 1150, // over denne bredden leses verden som «område»
};

export function createCamera(x, y, screenW = 1280, screenH = 720) {
  return { x, y, w: VIEW.near.w, screenW, screenH, minW: VIEW.near.minW, maxW: VIEW.near.maxW, tween: null };
}

export const zoomOf = (cam) => cam.screenW / cam.w;
export const viewH = (cam) => cam.w * (cam.screenH / cam.screenW);

export function screenToWorld(cam, sx, sy) {
  const z = zoomOf(cam);
  return { x: cam.x + (sx - cam.screenW / 2) / z, y: cam.y + (sy - cam.screenH / 2) / z };
}

export function worldToScreen(cam, wx, wy) {
  const z = zoomOf(cam);
  return { x: (wx - cam.x) * z + cam.screenW / 2, y: (wy - cam.y) * z + cam.screenH / 2 };
}

export function setZoomLimits(cam, unlockedArea) {
  cam.maxW = unlockedArea ? VIEW.area.maxW : VIEW.near.maxW;
}

export function clampCamera(cam, worldW, worldH) {
  const maxByHeight = worldH * (cam.screenW / cam.screenH);
  cam.w = Math.max(cam.minW, Math.min(cam.w, cam.maxW, worldW, maxByHeight));
  const hw = cam.w / 2, hh = viewH(cam) / 2;
  cam.x = Math.max(hw, Math.min(worldW - hw, cam.x));
  cam.y = Math.max(hh, Math.min(worldH - hh, cam.y));
}

// Zoom rundt et skjermpunkt: verdenspunktet under markøren blir liggende i ro.
export function zoomAt(cam, sx, sy, factor) {
  const before = screenToWorld(cam, sx, sy);
  cam.w = Math.max(cam.minW, Math.min(cam.maxW, cam.w * factor));
  const after = screenToWorld(cam, sx, sy);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
  cam.tween = null;
}

export function panBy(cam, dsx, dsy) {
  const z = zoomOf(cam);
  cam.x -= dsx / z;
  cam.y -= dsy / z;
  cam.tween = null;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function glideTo(cam, x, y, w, duration = 4.5) {
  cam.tween = { from: { x: cam.x, y: cam.y, w: cam.w }, to: { x, y, w }, t: 0, duration };
}

export function updateCamera(cam, dt) {
  if (!cam.tween) return false;
  const tw = cam.tween;
  tw.t = Math.min(1, tw.t + dt / tw.duration);
  const k = ease(tw.t);
  // Bredden interpoleres logaritmisk så zoomhastigheten oppleves jevn.
  cam.w = Math.exp(Math.log(tw.from.w) + (Math.log(tw.to.w) - Math.log(tw.from.w)) * k);
  cam.x = tw.from.x + (tw.to.x - tw.from.x) * k;
  cam.y = tw.from.y + (tw.to.y - tw.from.y) * k;
  if (tw.t >= 1) cam.tween = null;
  return true;
}
