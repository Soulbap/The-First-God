// Planetvisning (OPUS-01): WebGL 1, én fullskjerm-trekant og analytisk stråle–kule-skjæring per piksel.
// Teksturer: global ekvirektangulær overflate, høyoppløst lokal flate rundt hjemmet og et levende øyeblikksbilde
// av den detaljerte verdenen (hjemmeregionen). Leser bare tilstand; ingen spillregler.
// Overlegget (navn, ruter, ekspedisjoner) tegnes på det vanlige 2D-lerretet over WebGL-lerretet.
import { globeFrame, projectDir, unprojectScreen, GLOBE } from '../view/globe.js';
import { fromLatLon, angle, dot, norm, offsetDir, PLANET, revealOf } from '../sim/planet.js';
import { BIOMES } from '../sim/worldmap.js';
import { civilizationStage } from '../sim/civstage.js';

const MAX_REGIONS = 16, MAX_LIGHTS = 24, MAX_ROUTES = 8;

const VERT = `attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `precision highp float;
varying vec2 vUv;
uniform vec3 uPos, uFwd, uRight, uUp; uniform vec2 uTan;
uniform sampler2D uGlobal, uLocal, uPatch;
uniform float uLocalSpan, uPatchOn, uDayBlend, uTime, uH, uFogOn;
uniform vec2 uPatchHalf; uniform vec3 uPatchAvg, uLandAvg;
uniform vec3 uHU, uHE, uHN, uSun;
uniform vec4 uRegions[${MAX_REGIONS}]; uniform int uRegionCount; uniform float uRegionRadius;
uniform vec4 uLights[${MAX_LIGHTS}]; uniform int uLightCount;
uniform vec4 uRouteA[${MAX_ROUTES}], uRouteB[${MAX_ROUTES}]; uniform int uRouteCount;
const float PI = 3.14159265;

float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }

vec3 surfaceColor(vec3 p, out float water, out float forest){
  float lat = asin(clamp(p.z, -1.0, 1.0)), lon = atan(p.y, p.x);
  vec4 tc = texture2D(uGlobal, vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI));
  float c = dot(p, uHU);
  if (c > 0.8) {
    vec2 t = vec2(dot(p, uHE), dot(p, uHN)); float r = acos(clamp(c, -1.0, 1.0));
    vec2 loc = length(t) > 1e-7 ? normalize(t) * r : vec2(0.0);
    vec2 q = loc / uLocalSpan;
    float inside = 1.0 - smoothstep(0.82, 0.98, max(abs(q.x), abs(q.y)));
    if (inside > 0.0) tc = mix(tc, texture2D(uLocal, vec2(q.x * 0.5 + 0.5, 0.5 - q.y * 0.5)), inside);
  }
  // Alfa: vann ≈ 0,25; land = 0,63 + skogtetthet × 0,37 (se render/planetTexture.js).
  water = 1.0 - smoothstep(0.36, 0.52, tc.a);
  forest = clamp((tc.a - 0.63) / 0.37, 0.0, 1.0) * (1.0 - water);
  return tc.rgb;
}

void main(){
  vec3 dir = normalize(uFwd + uRight * vUv.x * uTan.x + uUp * vUv.y * uTan.y);
  vec3 o = uPos; float b = dot(o, dir), c = dot(o, o) - 1.0, disc = b * b - c;
  if (disc < 0.0 || -b - sqrt(max(disc, 0.0)) < 0.0) {
    // Rommet: dyp blåsvart, stjerner og atmosfærens glød rundt randen.
    float tc = -b; float closest = length(o + dir * tc);
    float glow = closest > 1.0 && tc > 0.0 ? exp(-(closest - 1.0) * 16.0) : 0.0;
    vec3 rimDir = normalize(o + dir * max(tc, 0.0));
    float lit = mix(0.25, 1.0, smoothstep(-0.3, 0.5, dot(rimDir, uSun)));
    vec3 bg = vec3(0.035, 0.045, 0.06) + vec3(0.02, 0.03, 0.045) * (1.0 - abs(vUv.y));
    float st = hash(floor(dir * 520.0)); float star = step(0.9975, st) * (0.4 + 0.6 * hash(floor(dir * 520.0) + 3.1));
    gl_FragColor = vec4(bg + vec3(star) * 0.75 + vec3(0.42, 0.6, 0.78) * glow * lit * 0.85, 1.0);
    return;
  }
  vec3 p = normalize(o + dir * (-b - sqrt(disc)));
  float water, forestD;
  vec3 col = surfaceColor(p, water, forestD);
  // Fin detalj: bryter opp teksturen når kameraet er nært (tones bort på avstand).
  float near = 1.0 - smoothstep(0.05, 1.1, uH);
  // Skogtak: mørke, ujevne prikker der landet er grønt (malerisk tekstur, ikke enkelttrær).
  float green = smoothstep(0.0, 0.06, col.g - max(col.r, col.b)) * (1.0 - water);
  // Lunder og enger som i den detaljerte verdenen: mørke skogflekker med kronetak i lysere eng.
  // Skogtettheten kommer fra selve landskapet (fuktighet, høyde, elvebredder), ikke fra jevn støy: belter og enger.
  float density = smoothstep(0.12, 0.8, forestD);
  float grove = density < 0.02 ? 0.0 : smoothstep(0.72 - density * 0.5, 0.8 - density * 0.42, fbm(p * 230.0 + 3.0) + density * 0.18);
  float crowns = vnoise(p * 5200.0) * 0.6 + vnoise(p * 1900.0) * 0.4;
  vec3 forestC = col * vec3(0.66, 0.72, 0.64) * (0.8 + crowns * 0.4);
  col = mix(col, mix(col * vec3(1.06, 1.04, 0.98), forestC, grove), green * near);
  col *= 1.0 + (fbm(p * 420.0) - 0.5) * 0.2 * near + (fbm(p * 120.0) - 0.5) * 0.12 * near;
  // Fjell: skarpe rygger og renner i stein og snø i stedet for myke, røykaktige flater.
  float rock = (1.0 - smoothstep(0.03, 0.08, max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b)))) * (1.0 - water);
  float ridge = 1.0 - abs(2.0 * vnoise(p * 700.0) - 1.0);
  ridge = ridge * 0.6 + (1.0 - abs(2.0 * vnoise(p * 2100.0) - 1.0)) * 0.4;
  col *= 1.0 + (ridge - 0.55) * 0.45 * rock * (1.0 - smoothstep(0.1, 1.6, uH));

  // Det kjente og det ukjente: land folket ikke har sett, er dempet og disig (guden ser alt, folket gjør det ikke).
  vec3 local = vec3(dot(p, uHE), dot(p, uHN), dot(p, uHU));
  float known = 0.0;
  for (int i = 0; i < ${MAX_REGIONS}; i++) {
    if (i >= uRegionCount) break;
    vec4 R = uRegions[i];
    if (R.w <= 0.0) continue;
    float d = acos(clamp(dot(p, R.xyz), -1.0, 1.0));
    float edge = uRegionRadius * R.w * (0.8 + 0.45 * fbm(p * 30.0));
    known = max(known, 1.0 - smoothstep(edge * 0.45, edge * 1.1, d));
  }
  if (uFogOn > 0.5) {
    float lum = dot(col, vec3(0.3, 0.55, 0.15));
    vec3 mist = mix(mix(vec3(lum), col, 0.78), vec3(0.58, 0.62, 0.64), 0.12) * 0.96;
    col = mix(mist + (fbm(p * 22.0 + uTime * 0.01) - 0.5) * 0.04, col, known);
  }

  // Hjemmeregionen: levende øyeblikksbilde av den detaljerte verdenen, med myk kant mot planetflaten.
  if (uPatchOn > 0.0 && local.z > 0.98) {
    float r = acos(clamp(local.z, -1.0, 1.0)); vec2 t = local.xy; vec2 loc = length(t) > 1e-8 ? normalize(t) * r : vec2(0.0);
    vec2 q = loc / uPatchHalf;
    // Landet rundt hjemmet glir mot hjemmeregionens egne farger, så det ikke leses som et kort på et kart.
    float m = max(abs(q.x), abs(q.y));
    float tone = (1.0 - smoothstep(0.9, 3.2, m)) * 0.9 * (1.0 - water);
    col *= mix(vec3(1.0), clamp(uPatchAvg / max(uLandAvg, vec3(0.02)), 0.6, 1.8), tone * uPatchOn);
    if (abs(q.x) < 1.0 && abs(q.y) < 1.0) {
      float n = (fbm(p * 420.0) - 0.5) * 0.3;
      float a = (1.0 - smoothstep(0.66 + n, 0.97, abs(q.x))) * (1.0 - smoothstep(0.62 + n, 0.97, abs(q.y)));
      vec3 pc = texture2D(uPatch, vec2(q.x * 0.5 + 0.5, 0.5 - q.y * 0.5)).rgb;
      col = mix(col, pc, a * uPatchOn);
    }
  }

  // Land som sivilisasjonen har formet (OPUS-02): bosettinger gir bart, tråkket land; veier mellom etablerte steder er svake, bølgende stier.
  // Størrelsen følger folketallet (lights.w), så små steder forblir små. Veiene tegnes i selve overflaten og er nesten borte på stor avstand.
  {
    float dev = 0.0;
    for (int i = 0; i < 24; i++) {
      if (i >= uLightCount) break;
      vec4 L = uLights[i];
      float d = acos(clamp(dot(p, L.xyz), -1.0, 1.0));
      float r = 0.006 + 0.012 * L.w;
      dev = max(dev, exp(-(d * d) / (r * r)) * (0.35 + 0.5 * L.w));
    }
    float roadK = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= uRouteCount) break;
      vec3 a = uRouteA[i].xyz, b = uRouteB[i].xyz; float sK = uRouteA[i].w;
      vec3 n = normalize(cross(a, b));
      if (dot(cross(a, p), n) > 0.0 && dot(cross(p, b), n) > 0.0) {
        float wob = (fbm(p * 70.0) - 0.5) * 0.006 + (fbm(p * 240.0) - 0.5) * 0.0016;
        float d = abs(dot(p, n) + wob);
        roadK = max(roadK, sK * (1.0 - smoothstep(0.0004, 0.0013 + 0.00055 * uH, d)));
      }
    }
    float landOnly = 1.0 - water;
    col = mix(col, mix(col, vec3(0.6, 0.53, 0.38), 0.7), clamp(dev, 0.0, 0.8) * landOnly * (1.0 - smoothstep(0.02, 0.9, uH) * 0.5));
    col = mix(col, vec3(0.66, 0.58, 0.42) * (0.9 + 0.2 * fbm(p * 900.0)), roadK * 0.7 * landOnly * (1.0 - smoothstep(1.2, 3.0, uH) * 0.85));
  }

  // Lys: sol + myk himmel; nær overflaten blir lyset flatt (dag), så overgangen fra den detaljerte verdenen stemmer.
  float ndl = dot(p, uSun);
  float day = smoothstep(-0.12, 0.35, ndl);
  float lightF = mix(0.07 + 1.05 * day * (0.55 + 0.45 * max(ndl, 0.0)), 1.0, uDayBlend);
  vec3 lit = col * lightF;
  // Havglans.
  if (water > 0.5) { vec3 hv = normalize(uSun - dir); lit += vec3(0.9, 0.85, 0.7) * pow(max(dot(p, hv), 0.0), 60.0) * 0.35 * day * (1.0 - uDayBlend); }

  // Nattlys fra bosettinger og utposter.
  float night = (1.0 - smoothstep(-0.25, 0.08, ndl)) * (1.0 - uDayBlend);
  if (night > 0.0) {
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      if (i >= uLightCount) break;
      vec4 L = uLights[i];
      float d = acos(clamp(dot(p, L.xyz), -1.0, 1.0));
      float rr = 0.0016 + 0.0028 * L.w;
      lit += vec3(1.0, 0.72, 0.38) * exp(-(d * d) / (rr * rr)) * (0.15 + L.w) * night * 1.3;
    }
  }

  // Skyer: driver sakte; borte når kameraet er helt nede ved bakken.
  float cl = smoothstep(0.6, 0.82, fbm(p * 4.5 + vec3(uTime * 0.004, 0.0, uTime * 0.002)));
  float cloudVis = smoothstep(0.08, 0.5, uH) * 0.6;
  lit = mix(lit, vec3(0.92, 0.93, 0.9) * mix(0.12, 1.0, day), cl * cloudVis);

  // Atmosfære ved randen.
  float fres = pow(1.0 - max(dot(p, -dir), 0.0), 3.0);
  lit += vec3(0.35, 0.52, 0.7) * fres * mix(0.15, 0.8, day) * smoothstep(0.08, 0.6, uH);
  gl_FragColor = vec4(lit, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function texture(gl, unit, { mip = false, repeat = false } = {}) {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40, 60, 50, 255]));
  return { t, unit, mip };
}

export function createGlobeRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true, alpha: false });
  if (!gl) return null;
  const prog = gl.createProgram();
  try {
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.warn('Planetvisning: WebGL-shader feilet, bruker reserve.', err);
    return null;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  const loc = (n) => (U[n] ??= gl.getUniformLocation(prog, n));
  const tex = { global: texture(gl, 0, { mip: true, repeat: true }), local: texture(gl, 1, { mip: true }), patch: texture(gl, 2) };
  gl.uniform1i(loc('uGlobal'), 0); gl.uniform1i(loc('uLocal'), 1); gl.uniform1i(loc('uPatch'), 2);
  let ready = false;

  const upload = (T, img) => {
    gl.activeTexture(gl.TEXTURE0 + T.unit); gl.bindTexture(gl.TEXTURE_2D, T.t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (img.data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.w, img.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(img.data.buffer));
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    if (T.mip) gl.generateMipmap(gl.TEXTURE_2D);
  };

  return {
    gl,
    get ready() { return ready; },
    setSurface(baked) {
      upload(tex.global, baked.global); upload(tex.local, baked.local);
      gl.useProgram(prog); gl.uniform1f(loc('uLocalSpan'), baked.local.span);
      // Gjennomsnittsfargen på land rett rundt hjemmet (for fargetilpasningen mot hjemmeregionen).
      const L = baked.local, c = L.w / 2, rad = Math.round(L.w * 0.08), d = L.data; let r = 0, g = 0, b = 0, n = 0;
      for (let y = c - rad; y < c + rad; y += 2) for (let x = c - rad; x < c + rad; x += 2) { const k = (y * L.w + x) * 4; if (d[k + 3] < 200) continue; r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; }
      gl.uniform3f(loc('uLandAvg'), r / n / 255, g / n / 255, b / n / 255);
      ready = true;
    },
    setPatch(canvasEl) {
      upload(tex.patch, canvasEl);
      // Kantfargen til hjemmeregionen (gjennomsnitt av ytterste ring) brukes til å tone landet rundt.
      const c = document.createElement('canvas'); c.width = 12; c.height = 8;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(canvasEl, 0, 0, 12, 8);
      const d = g.getImageData(0, 0, 12, 8).data; let r = 0, gg = 0, b = 0, n = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) if (x === 0 || y === 0 || x === 11 || y === 7) { const k = (y * 12 + x) * 4; r += d[k]; gg += d[k + 1]; b += d[k + 2]; n++; }
      gl.useProgram(prog); gl.uniform3f(loc('uPatchAvg'), r / n / 255, gg / n / 255, b / n / 255);
    },
    draw(view) {
      const { frame: F, planet, regions, lights, sun, dayBlend, time, h, patchOn, fogOn } = view;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prog);
      gl.uniform3fv(loc('uPos'), F.pos); gl.uniform3fv(loc('uFwd'), F.fwd); gl.uniform3fv(loc('uRight'), F.right); gl.uniform3fv(loc('uUp'), F.up);
      gl.uniform2f(loc('uTan'), F.tx, F.ty);
      const B = planet.home.basis;
      gl.uniform3fv(loc('uHU'), B.up); gl.uniform3fv(loc('uHE'), B.east); gl.uniform3fv(loc('uHN'), B.north);
      gl.uniform2f(loc('uPatchHalf'), planet.patch.w / 2, planet.patch.h / 2);
      gl.uniform1f(loc('uPatchOn'), patchOn); gl.uniform1f(loc('uDayBlend'), dayBlend); gl.uniform1f(loc('uTime'), time); gl.uniform1f(loc('uH'), h);
      gl.uniform1f(loc('uFogOn'), fogOn ? 1 : 0); gl.uniform3fv(loc('uSun'), sun);
      const rf = new Float32Array(MAX_REGIONS * 4);
      regions.slice(0, MAX_REGIONS).forEach((r, i) => rf.set([...r.dir, r.reveal], i * 4));
      gl.uniform4fv(loc('uRegions'), rf); gl.uniform1i(loc('uRegionCount'), Math.min(MAX_REGIONS, regions.length)); gl.uniform1f(loc('uRegionRadius'), PLANET.regionRadius);
      const lf = new Float32Array(MAX_LIGHTS * 4);
      lights.slice(0, MAX_LIGHTS).forEach((l, i) => lf.set([...l.dir, l.w], i * 4));
      gl.uniform4fv(loc('uLights'), lf); gl.uniform1i(loc('uLightCount'), Math.min(MAX_LIGHTS, lights.length));
      const ra = new Float32Array(MAX_ROUTES * 4), rb = new Float32Array(MAX_ROUTES * 4), routes = view.routes || [];
      routes.slice(0, MAX_ROUTES).forEach((r, i) => { ra.set([...r.a, r.w], i * 4); rb.set([...r.b, 0], i * 4); });
      gl.uniform4fv(loc('uRouteA'), ra); gl.uniform4fv(loc('uRouteB'), rb); gl.uniform1i(loc('uRouteCount'), Math.min(MAX_ROUTES, routes.length));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

// ---------- Visningsmodell: hva planeten viser av tilstanden (testbar uten nettleser) ----------
export function planetView(state, planet) {
  const G = state.globe;
  const regions = [];
  const lights = [];
  // Hjemmeregionen er alltid kjent.
  regions.push({ id: 'home', dir: planet.home.dir, reveal: 1.25 });
  for (const r of G.regions) {
    if (r.home) continue;
    const reveal = revealOf(r);
    if (reveal > 0) regions.push({ id: r.id, dir: planet.sites.get(r.id).dir, reveal });
  }
  for (const s of state.settlements) {
    if (s.state === 'founding' && s.id !== 'first') continue;
    // Lysstyrken følger folketallet (kvadratrot): en liten grend er et lite lys, en storby et tydelig, men aldri gigantisk.
    lights.push({ dir: planet.worldToDir(s.x, s.y), w: Math.min(0.8, 0.1 + 0.55 * Math.sqrt(s.population.length / 60)) });
  }
  for (const r of G.regions) {
    if (r.state !== 'utpost' && r.state !== 'etablert') continue;
    lights.push({ dir: planet.sites.get(r.id).dir, w: Math.min(0.6, 0.08 + 0.5 * Math.sqrt(r.pop / 60)) });
  }
  // Etablerte forbindelser: svake veier i landskapet (utposter svakere enn etablerte land).
  const routes = [];
  for (const r of G.regions) {
    if (r.state !== 'utpost' && r.state !== 'etablert') continue;
    routes.push({ a: planet.sites.get(r.id).dir, b: planet.home.dir, w: r.state === 'etablert' ? 1 : 0.5 });
  }
  return { regions, lights, routes };
}

// Storsirkelbue mellom to retninger (n punkter).
export function arc(a, b, n = 28, lift = 0) {
  const w = angle(a, b), out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let p;
    if (w < 1e-6) p = a;
    else { const s0 = Math.sin((1 - t) * w) / Math.sin(w), s1 = Math.sin(t * w) / Math.sin(w); p = norm([0, 1, 2].map((k) => a[k] * s0 + b[k] * s1)); }
    out.push(lift ? p.map((v) => v * (1 + lift * Math.sin(t * Math.PI))) : p);
  }
  return out;
}

// Som arc(), men med en liten sidebue (så stiene ikke er rette hjelpelinjer): forskyvningen er deterministisk per rute.
export function bowArc(a, b, n = 36, bow = 0.012) {
  const pts = arc(a, b, n);
  return pts.map((p, i) => {
    const t = i / n, q = pts[Math.min(n, i + 1)], r = pts[Math.max(0, i - 1)];
    const tan = [q[0] - r[0], q[1] - r[1], q[2] - r[2]];
    const side = [p[1] * tan[2] - p[2] * tan[1], p[2] * tan[0] - p[0] * tan[2], p[0] * tan[1] - p[1] * tan[0]];
    const l = Math.hypot(...side) || 1, k = bow * Math.sin(t * Math.PI) * (0.6 + 0.4 * Math.sin(t * 9));
    return norm([p[0] + side[0] / l * k, p[1] + side[1] / l * k, p[2] + side[2] / l * k]);
  });
}
const sstepG = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const FONT_SERIF = 'Georgia, "Palatino Linotype", serif';
const FONT_UI = '"Segoe UI", system-ui, sans-serif';

function label(ctx, text, x, y, size, { italic = true, color = '#f1e8d0', alpha = 1, font = FONT_SERIF, weight = '' } = {}) {
  ctx.globalAlpha = alpha;
  ctx.font = `${italic ? 'italic ' : ''}${weight}${size}px ${font}`;
  ctx.fillStyle = 'rgba(10,8,6,0.75)'; ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}

// Overlegg på 2D-lerretet: navn, ruter, ekspedisjoner og hjemmets bosettinger. Tegnes i skjermkoordinater.
export function drawGlobeOverlay(ctx, state, planet, g, { sw, sh, dpr, time, hoverId }) {
  const F = globeFrame(g, sw, sh);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, sw, sh);
  ctx.textAlign = 'center';
  const G = state.globe, home = planet.home.dir;
  const P = (dir) => projectDir(F, dir);
  const far = Math.min(1, Math.max(0, (g.h - 0.05) / 0.12)); // overlegg tones inn når hjemmeregionen er liten

  const pathOf = (pts) => { ctx.beginPath(); let on = false; for (const p of pts) { const s = P(p); if (!s || !s.front) { on = false; continue; } if (!on) { ctx.moveTo(s.x, s.y); on = true; } else ctx.lineTo(s.x, s.y); } };
  // Ruter til utposter (OPUS-02): selve veien ligger i planetens overflate (se shaderen). Her ligger bare en svak, buet sti som
  // tones ut i bane og fremheves når pekeren er over landet. Karavaner vises bare der en karavane faktisk går i hjemregionen.
  const near = 1 - sstepG(0.6, 2.4, g.h);
  for (const r of G.regions) {
    if (r.state !== 'utpost' && r.state !== 'etablert') continue;
    const site = planet.sites.get(r.id).dir, pts = bowArc(site, home, 40, 0.01 + (r.col * 3 + r.row) % 4 * 0.003);
    const hot = hoverId === r.id;
    ctx.globalAlpha = far * (hot ? 0.95 : 0.05 + 0.3 * near);
    ctx.strokeStyle = 'rgba(24,18,10,0.5)'; ctx.lineWidth = hot ? 3.6 : 2.4; pathOf(pts); ctx.stroke();
    ctx.strokeStyle = 'rgba(238,218,170,0.95)'; ctx.lineWidth = hot ? 1.8 : 1; ctx.setLineDash(r.state === 'etablert' ? (hot ? [] : [9, 3]) : [2, 6]); pathOf(pts); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  if (g.h < 0.9) {
    for (const c of G.caravans) {
      const s = P(planet.worldToDir(c.x, c.y));
      if (!s?.front) continue;
      ctx.globalAlpha = far; ctx.fillStyle = '#ffe2a0'; ctx.strokeStyle = 'rgba(20,14,8,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  // Ekspedisjon eller nybyggerfølge underveis.
  if (G.mission) {
    const m = G.mission, target = planet.sites.get(m.regionId).dir, pts = arc(home, target);
    ctx.globalAlpha = far;
    ctx.strokeStyle = 'rgba(220,232,214,0.8)'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 6]); pathOf(pts); ctx.stroke(); ctx.setLineDash([]);
    const k = m.phase === 'away' ? Math.min(1, (state.time - m.launchedAt) / Math.max(1, m.eta - m.launchedAt)) : 0.04;
    const s = P(pts[Math.round(k * (pts.length - 1))]);
    if (s?.front) {
      ctx.fillStyle = '#f4ecd4'; ctx.beginPath(); ctx.arc(s.x, s.y, 4 + Math.sin(time * 4) * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,16,10,0.8)'; ctx.lineWidth = 1; ctx.stroke();
      const hs = P(home);
      if (!hs || Math.hypot(hs.x - s.x, hs.y - s.y) > 60) label(ctx, m.kind === 'outpost' ? 'Nybyggere' : 'Ekspedisjon', s.x, s.y - 10, 11, { font: FONT_UI, italic: false });
    }
    ctx.globalAlpha = 1;
  }

  // Land: navn for kjente land, et diskret spørsmålstegn for land som kan nås.
  const reachable = new Set();
  for (const r of G.regions) {
    if (r.state !== 'ukjent') continue;
    if (G.regions.some((q) => q !== r && Math.abs(q.col - r.col) <= 1 && Math.abs(q.row - r.row) <= 1 && (q.home || q.state !== 'ukjent'))) reachable.add(r.id);
  }
  for (const r of G.regions) {
    if (r.home) continue;
    const s = P(planet.sites.get(r.id).dir);
    if (!s || !s.front) continue;
    const hover = hoverId === r.id;
    if (r.state === 'ukjent') {
      if (!G.expeditionsEnabled || !reachable.has(r.id) || g.h > 1.2) continue;
      label(ctx, '?', s.x, s.y + 5, hover ? 19 : 15, { color: 'rgba(226,234,228,0.85)', alpha: far * 0.8 });
      continue;
    }
    const detail = 1 - Math.min(1, Math.max(0, (g.h - 0.9) / 0.6)); // navn bare når landene er store nok i bildet
    ctx.globalAlpha = far; ctx.fillStyle = r.state === 'oppdaget' ? '#e6dcc0' : '#f6d890';
    ctx.beginPath(); ctx.arc(s.x, s.y, r.state === 'oppdaget' ? 2.2 : 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    if (detail <= 0.02 && !hover) continue;
    const sz = Math.max(11, Math.min(15, 9 + 14 / (g.h + 0.4)));
    label(ctx, r.name, s.x, s.y - 4, sz, { alpha: far * Math.max(detail, hover ? 1 : 0) });
    const status = r.state === 'oppdaget' ? BIOMES[r.biome].name : `${r.state === 'etablert' ? 'Etablert' : 'Utpost'} · ${r.pop} folk`;
    label(ctx, status, s.x, s.y + 12, 10.5, { italic: false, font: FONT_UI, color: 'rgba(236,226,204,0.9)', alpha: far * Math.max(detail, hover ? 1 : 0) });
    if ((r.state === 'utpost' || r.state === 'etablert') && detail > 0.02) {
      const n = r.state === 'etablert' ? 3 : 2;
      ctx.globalAlpha = far;
      for (let i = 0; i < n; i++) {
        const hx = s.x + (i - (n - 1) / 2) * 9, hy = s.y - 20;
        ctx.fillStyle = 'rgba(12,10,6,0.55)'; ctx.fillRect(hx - 4, hy + 4, 9, 2);
        ctx.fillStyle = '#b08a5a'; ctx.fillRect(hx - 3.5, hy - 1, 7, 5);
        ctx.fillStyle = '#6a4a34'; ctx.beginPath(); ctx.moveTo(hx - 5, hy - 1); ctx.lineTo(hx, hy - 6); ctx.lineTo(hx + 5, hy - 1); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // Hjemmet: bosettingene som små lys/merker når hjemmeregionen er liten; ellers ser man selve verdenen.
  const cap = state.settlements.find((s) => s.id === 'first');
  const cs = P(planet.worldToDir(cap.x, cap.y));
  if (cs?.front) {
    ctx.globalAlpha = far;
    for (const s of state.settlements) {
      if (s.state === 'founding' && s.id !== 'first') continue;
      if (s.id !== 'first' && g.h > 0.9) continue;
      const q = P(planet.worldToDir(s.x, s.y));
      if (!q?.front) continue;
      ctx.fillStyle = s.id === 'first' ? '#f6dfa0' : '#eadcc0';
      ctx.beginPath(); ctx.arc(q.x, q.y, s.id === 'first' ? 3.6 : 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(30,22,12,0.9)'; ctx.lineWidth = 1; ctx.stroke();
    }
    const name = ['By', 'Storby'].includes(cap.stage) ? 'Den første byen' : state.milestones.first_village != null ? 'Den første landsbyen' : 'Den første boplassen';
    label(ctx, name, cs.x, cs.y - 12, 14, { alpha: far });
    if (g.h < 1.2) label(ctx, 'Hjemlandet', cs.x, cs.y + 20, 10.5, { italic: false, font: FONT_UI, weight: '600 ', color: 'rgba(240,226,184,0.9)', alpha: far * 0.9 });
    ctx.globalAlpha = 1;
  }

  // Tittel: sivilisasjonens trinn og hva planeten viser.
  const stage = civilizationStage(state);
  const known = G.regions.filter((q) => !q.home && q.state !== 'ukjent').length;
  label(ctx, stage.name, sw / 2, 88, 22, { color: '#f0e2b8' });
  label(ctx, `${state.settlements.length} bosettinger · ${known} av ${G.regions.length - 1} naboland kjent · ${G.stats.outposts} utposter`, sw / 2, 108, 12, { italic: false, font: FONT_UI, color: 'rgba(230,222,200,0.85)' });

  // Hover-boks.
  if (hoverId) {
    const r = G.regions.find((q) => q.id === hoverId);
    const s = r && P(planet.sites.get(r.id).dir);
    if (s?.front) {
      const lines = r.state === 'ukjent' ? ['Ukjent land', G.expeditionsEnabled ? 'Ekspedisjonene når hit med tiden' : 'Folket kjenner ikke dette landet ennå'] : [r.name, `${BIOMES[r.biome].name} · ${r.state}`, r.pop ? `${r.pop} folk · ${r.delivered} karavaner hjem` : 'Ingen bosetting ennå'];
      const w = 210, hh = 18 + lines.length * 16;
      const x = Math.max(8, Math.min(sw - w - 8, s.x - w / 2)), y = Math.max(120, Math.min(sh - hh - 96, s.y + 18));
      ctx.fillStyle = 'rgba(24,28,24,0.92)'; ctx.strokeStyle = 'rgba(212,180,119,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x, y, w, hh, 6); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left';
      lines.forEach((t, i) => { ctx.font = i === 0 ? `600 13px ${FONT_UI}` : `12px ${FONT_UI}`; ctx.fillStyle = i === 0 ? '#f0e2b8' : '#d8d0bc'; ctx.fillText(t, x + 10, y + 20 + i * 16); });
      ctx.textAlign = 'center';
    }
  }
}

// Hvilket land (eller hjemmet) ligger under pekeren?
export function pickGlobe(state, planet, g, sw, sh, sx, sy) {
  const F = globeFrame(g, sw, sh);
  const p = unprojectScreen(F, sx, sy);
  if (!p) return null;
  const local = planet.home.basis;
  if (Math.abs(dot(p, local.east)) < planet.patch.w / 2 && Math.abs(dot(p, local.north)) < planet.patch.h / 2 && dot(p, local.up) > 0.99) return { id: 'home' };
  let best = null, bd = PLANET.regionRadius * 1.1;
  for (const r of state.globe.regions) {
    if (r.home) continue;
    const d = angle(p, planet.sites.get(r.id).dir);
    if (d < bd) { bd = d; best = r; }
  }
  return best ? { id: best.id, region: best } : null;
}

// Sola: står over ettermiddagssiden av hjemmet og vandrer sakte rundt kloden (ett døgn ≈ 6 minutter sanntid).
export function sunDir(planet, phase) {
  // Samme døgnklokke som nærbildet (view/daylight.js): fase 0,5 = middag over hjemmet, 0,25/0,75 = soloppgang/-nedgang.
  const b = planet.home.basis, a = 2 * Math.PI * (phase - 0.5);
  return norm([0, 1, 2].map((i) => b.up[i] * Math.cos(a) * 0.9 + b.east[i] * Math.sin(a) * 0.9 + b.north[i] * 0.35 + [0, 0, 0.1][i]));
}

export { GLOBE, fromLatLon, offsetDir };
