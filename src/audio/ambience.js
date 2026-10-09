// Stemningslyd (OPUS-01): alt lages i Web Audio av støy og enkle oscillatorer — ingen lydfiler, ingen avhengigheter.
// Lyden følger verden: vind alltid, fugler i nærbildet om dagen, knitring ved bål, hammerslag der det bygges,
// en dempet, luftig klang i planetvisningen. Lyden starter først etter en brukerhandling (nettleserregel).
// Kosmetisk tilfeldighet (Math.random) påvirker aldri simuleringen.

export function createAmbience({ muted = false, volume = 0.55 } = {}) {
  let ctx = null, master = null, wind = null, windFilter = null, pad = null, padGain = null;
  let started = false, last = { near: 0, fires: 0, builders: 0, globe: 0, active: 1 };
  let nextBird = 0, nextCrackle = 0, nextKnock = 0;
  const state = { muted, volume };

  function noiseBuffer(seconds, brown = false) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; } else d[i] = w; }
    return buf;
  }

  function start() {
    if (started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    started = true;
    master = ctx.createGain(); master.gain.value = state.muted ? 0 : state.volume; master.connect(ctx.destination);
    // Vind: brun støy gjennom et lavpassfilter som puster sakte.
    wind = ctx.createBufferSource(); wind.buffer = noiseBuffer(6, true); wind.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'lowpass'; windFilter.frequency.value = 420; windFilter.Q.value = 0.6;
    const wg = ctx.createGain(); wg.gain.value = 0.16;
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain(); lfo.frequency.value = 0.07; lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(windFilter.frequency); lfo.start();
    wind.connect(windFilter).connect(wg).connect(master); wind.start();
    // Planetklang: to svakt forstemte toner gjennom et mykt filter.
    padGain = ctx.createGain(); padGain.gain.value = 0;
    const pf = ctx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 900;
    pad = [110, 164.8, 220.6].map((f) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(pf); o.start(); return o; });
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
  function burst(t, { gain, freq, q = 1, dur = 0.04, type = 'bandpass' }) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(dur + 0.02);
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
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

  return {
    start,
    get muted() { return state.muted; },
    setMuted(m) {
      state.muted = m;
      if (master) master.gain.setTargetAtTime(m ? 0 : state.volume, ctx.currentTime, 0.15);
      if (!m) start();
    },
    // Kalles jevnlig med en enkel beskrivelse av hva spilleren ser. Ingen spillregler leses her.
    update({ near = 0, fires = 0, builders = 0, globe = 0, active = 1 }) {
      if (!started || !ctx || state.muted) return;
      if (ctx.state === 'suspended') ctx.resume();
      last = { near, fires, builders, globe, active };
      const now = ctx.currentTime;
      windFilter.Q.value = 0.6;
      padGain.gain.setTargetAtTime(globe * 0.035, now, 1.2);
      const life = (1 - globe) * active;
      if (now >= nextBird) {
        if (near > 0.3 && life > 0) chirp(now + 0.02, 0.012 * near * life);
        nextBird = now + 2.5 + Math.random() * 6 / Math.max(0.3, near);
      }
      if (now >= nextCrackle) {
        if (fires > 0 && life > 0) for (let i = 0; i < 3; i++) burst(now + Math.random() * 0.3, { gain: 0.02 * near * life * Math.min(1.5, fires), freq: 2500 + Math.random() * 3000, q: 2, dur: 0.02 });
        nextCrackle = now + 0.35 + Math.random() * 0.5;
      }
      if (now >= nextKnock) {
        if (builders > 0 && life > 0) knock(now + 0.01, 0.03 * near * life);
        nextKnock = now + Math.max(0.35, 1.6 / (1 + builders)) + Math.random() * 0.4;
      }
    },
    get debug() { return { started, ...state, ...last }; },
  };
}
