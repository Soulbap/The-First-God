// Stemningslyd (OPUS-01, utvidet i OPUS-02): alt lages i Web Audio av støy og enkle oscillatorer — ingen lydfiler,
// ingen avhengigheter. Lyden følger det spilleren ser (se audio/scene.js):
//   vind alltid · skogsus og fugler om dagen · sirisser og en ugle om natten · bekkelyd ved tjernet ·
//   knitring ved bål · hammerslag der det bygges · sag og meisel ved verkstedene · mumling ved torget ·
//   en dempet byhumring i større byer · en luftig klang i planetvisningen.
// Lyden starter først etter en brukerhandling (nettleserregel), kan slås av (M), og er alltid dempet i bakgrunnen.
// MERK: lydbildet er laget uten å ha blitt lyttet til av et menneske (utviklingsmiljøet har ingen lyd). Nivåene er forsiktige
// på grunn av det, og alt kan justeres i LEVELS. Kosmetisk tilfeldighet (Math.random) påvirker aldri simuleringen.

// Forsiktige toppnivåer (0–1 av masterlyden) for hvert lag.
export const LEVELS = { wind: 0.15, forest: 0.03, water: 0.05, crickets: 0.012, town: 0.022, murmur: 0.04, pad: 0.035, bird: 0.012, saw: 0.03, tink: 0.02, knock: 0.03, crackle: 0.02 };

export function createAmbience({ muted = false, volume = 0.55 } = {}) {
  let ctx = null, master = null, windFilter = null, windGain = null, pad = null, padGain = null;
  let forestGain = null, waterGain = null, waterFilter = null, cricketGain = null, townGain = null, murmurGain = null, murmurFilter = null;
  let started = false, last = { near: 0, fires: 0, builders: 0, globe: 0, active: 1 };
  let nextBird = 0, nextCrackle = 0, nextKnock = 0, nextSaw = 0, nextTink = 0, nextOwl = 0, nextPlop = 0, nextClink = 0;
  const state = { muted, volume };

  function noiseBuffer(seconds, brown = false) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; } else d[i] = w; }
    return buf;
  }
  // En evigløpende støykilde gjennom filter og forsterker (brukes av de rolige, kontinuerlige lagene).
  function bed({ brown = false, type = 'lowpass', freq = 400, q = 0.7, gain = 0, seconds = 5 }) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(seconds, brown); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(master); src.start();
    return { f, g };
  }
  function lfo(rate, depth, target) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rate; g.gain.value = depth;
    o.connect(g).connect(target); o.start();
  }

  function start() {
    if (started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    started = true;
    master = ctx.createGain(); master.gain.value = state.muted ? 0 : state.volume; master.connect(ctx.destination);
    // Vind: brun støy gjennom et lavpassfilter som puster sakte.
    const w = bed({ brown: true, freq: 420, q: 0.6, gain: LEVELS.wind, seconds: 6 });
    windFilter = w.f; windGain = w.g; lfo(0.07, 180, windFilter.frequency);
    // Skogsus: lysere støy som svulmer og ebber.
    const f = bed({ type: 'bandpass', freq: 2400, q: 0.5, gain: 0, seconds: 4 }); forestGain = f.g; lfo(0.11, 0.012, forestGain.gain);
    // Bekk/tjern: bølgende bånd rundt 600 Hz.
    const wt = bed({ type: 'bandpass', freq: 650, q: 0.9, gain: 0, seconds: 4 }); waterFilter = wt.f; waterGain = wt.g; lfo(0.23, 120, waterFilter.frequency);
    // Sirisser: høy tone som pulserer raskt (amplitudemodulert) — bare om natten.
    const co = ctx.createOscillator(); co.type = 'sine'; co.frequency.value = 4300;
    cricketGain = ctx.createGain(); cricketGain.gain.value = 0;
    const cm = ctx.createGain(); cm.gain.value = 0.5; const cl = ctx.createOscillator(); cl.frequency.value = 13; const clg = ctx.createGain(); clg.gain.value = 0.5; cl.connect(clg).connect(cm.gain); cl.start();
    co.connect(cm).connect(cricketGain).connect(master); co.start();
    // Byhumring og torgmumling.
    const t = bed({ brown: true, type: 'bandpass', freq: 170, q: 0.8, gain: 0, seconds: 5 }); townGain = t.g;
    const m = bed({ type: 'bandpass', freq: 520, q: 1.4, gain: 0, seconds: 5 }); murmurGain = m.g; murmurFilter = m.f; lfo(2.6, 90, murmurFilter.frequency); lfo(0.4, 0.015, murmurGain.gain);
    // Planetklang: tre svakt forstemte toner gjennom et mykt filter.
    padGain = ctx.createGain(); padGain.gain.value = 0;
    const pf = ctx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 900;
    pad = [110, 164.8, 220.6].map((fr) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr; o.connect(pf); o.start(); return o; });
    pf.connect(padGain).connect(master);
  }

  // Korte hendelser.
  function chirp(t, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    const f0 = 2600 + Math.random() * 1400, n = 2 + Math.floor(Math.random() * 3);
    o.type = 'sine';
    g.gain.setValueAtTime(0, t);
    for (let i = 0; i < n; i++) {
      const s = t + i * 0.11;
      o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + Math.random() * 0.3), s + 0.06);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(gain, s + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.09);
    }
    o.connect(g).connect(master); o.start(t); o.stop(t + n * 0.11 + 0.1);
  }
  function hoot(t, gain) { // ugle: to myke, lave toner
    for (let i = 0; i < 2; i++) {
      const s = t + i * 0.55, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(i ? 300 : 360, s); o.frequency.exponentialRampToValueAtTime(i ? 250 : 330, s + 0.4);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(gain, s + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.45);
      o.connect(g).connect(master); o.start(s); o.stop(s + 0.5);
    }
  }
  function burst(t, { gain, freq, q = 1, dur = 0.04, type = 'bandpass', sweep = 0 }) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(dur + 0.02);
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.linearRampToValueAtTime(freq * sweep, t + dur); f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur + 0.02);
  }
  function knock(t, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(190 + Math.random() * 60, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.14);
    burst(t, { gain: gain * 0.5, freq: 1800, q: 0.8, dur: 0.03 });
  }
  function tink(t, gain) { // meisel mot stein: lys, kort ring
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 2100 + Math.random() * 700;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.13);
    burst(t, { gain: gain * 0.4, freq: 3500, q: 1.2, dur: 0.02 });
  }
  function plop(t, gain) { // dråpe i vann
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(520 + Math.random() * 260, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.12);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.16);
  }

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  return {
    start,
    get muted() { return state.muted; },
    setMuted(m) {
      state.muted = m;
      if (master) master.gain.setTargetAtTime(m ? 0 : state.volume, ctx.currentTime, 0.15);
      if (!m) start();
    },
    // Kalles jevnlig med en beskrivelse av det spilleren ser (se audio/scene.js). Ingen spillregler leses her.
    update(scene) {
      const { near = 0, fires = 0, builders = 0, globe = 0, active = 1, night = 0, water = 0, forest = 0, sawing = 0, masons = 0, market = 0, town = 0, festival = 0 } = scene;
      if (!started || !ctx || state.muted) return;
      if (ctx.state === 'suspended') ctx.resume();
      last = { near, fires, builders, globe, active, night, water, forest, sawing, masons, market, town };
      const now = ctx.currentTime, life = (1 - globe) * active, day = 1 - night;
      // Kontinuerlige lag glir mykt mot målnivået (ingen klikk).
      windFilter.frequency.setTargetAtTime(night > 0.5 ? 320 : 420, now, 2);
      padGain.gain.setTargetAtTime(globe * LEVELS.pad * (0.7 + 0.3 * day), now, 1.2);
      forestGain.gain.setTargetAtTime(forest * life * LEVELS.forest * (0.5 + 0.5 * day), now, 1.5);
      waterGain.gain.setTargetAtTime(water * life * LEVELS.water, now, 1.2);
      cricketGain.gain.setTargetAtTime(near * night * life * LEVELS.crickets, now, 2.5);
      townGain.gain.setTargetAtTime(town * near * life * LEVELS.town, now, 2);
      murmurGain.gain.setTargetAtTime(market * near * life * LEVELS.murmur * (1 - night * 0.6) * (1 + festival * 0.6), now, 1.5);
      if (now >= nextBird) {
        if (near > 0.3 && life > 0 && day > 0.3) chirp(now + 0.02, LEVELS.bird * near * life * day);
        nextBird = now + 2.5 + Math.random() * 6 / Math.max(0.3, near);
      }
      if (now >= nextOwl) {
        if (near > 0.3 && life > 0 && night > 0.6) hoot(now + 0.05, 0.018 * near * life);
        nextOwl = now + 14 + Math.random() * 22;
      }
      if (now >= nextCrackle) {
        if (fires > 0 && life > 0) for (let i = 0; i < 3; i++) burst(now + Math.random() * 0.3, { gain: LEVELS.crackle * near * life * Math.min(1.5, fires) * (1 + night * 0.5), freq: 2500 + Math.random() * 3000, q: 2, dur: 0.02 });
        nextCrackle = now + 0.35 + Math.random() * 0.5;
      }
      if (now >= nextKnock) {
        if (builders > 0 && life > 0) knock(now + 0.01, LEVELS.knock * near * life);
        nextKnock = now + Math.max(0.35, 1.6 / (1 + builders)) + Math.random() * 0.4;
      }
      if (now >= nextSaw) {
        if (sawing > 0 && life > 0) burst(now + 0.01, { gain: LEVELS.saw * near * life, freq: 900, sweep: 2.4, q: 1.1, dur: 0.38 });
        nextSaw = now + 1.1 + Math.random() * 0.5;
      }
      if (now >= nextTink) {
        if (masons > 0 && life > 0) tink(now + 0.01, LEVELS.tink * near * life);
        nextTink = now + 0.6 + Math.random() * 0.7;
      }
      if (now >= nextPlop) {
        if (water > 0.3 && life > 0) plop(now + 0.02, 0.02 * water * life);
        nextPlop = now + 2 + Math.random() * 5;
      }
      if (now >= nextClink) {
        if (market > 0.2 && life > 0 && day > 0.2) tink(now + 0.02, 0.012 * market * life);
        nextClink = now + 3 + Math.random() * 6;
      }
    },
    get debug() { return { started, ...state, ...last }; },
  };
}
