// Procedural WebAudio: ambience (wind, birds, crickets, river), footsteps and combat sfx. No audio files.
export class Audio {
  constructor() { this.ctx = null; this.muted = localStorage.getItem('pr_mute') === '1'; this.vol = 0.8; this.bindUnlock(); }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC(); this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : this.vol; this.master.connect(c.destination);
    const len = c.sampleRate * 2; const nb = c.createBuffer(1, len, c.sampleRate); const d = nb.getChannelData(0); let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; } this.brown = nb;
    const wb = c.createBuffer(1, len, c.sampleRate); const wd = wb.getChannelData(0); for (let i = 0; i < len; i++) wd[i] = Math.random() * 2 - 1; this.white = wb;
    // wind bed
    this.wind = this.loop(this.brown, 'lowpass', 500, 0.0); this.river = this.loop(this.white, 'bandpass', 900, 0.0); this.river.f.Q.value = 0.6;
    this.amb = { day: 1, river: 0 }; this.nextBird = 0; this.nextCricket = 0;
  }
  loop(buf, type, freq, gain) { const c = this.ctx; const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = c.createGain(); g.gain.value = gain; s.connect(f); f.connect(g); g.connect(this.master); s.start(); return { s, f, g }; }
  setMuted(m) { this.muted = m; localStorage.setItem('pr_mute', m ? '1' : '0'); if (this.master) this.master.gain.value = m ? 0 : this.vol; }
  env(g, t0, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dcy); }
  noise(dur, type, freq, peak, q = 1, buf) { const c = this.ctx; if (!c || this.muted) return; const t = c.currentTime; const s = c.createBufferSource(); s.buffer = buf || this.white; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); this.env(g, t, 0.005, peak, dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.1); return f; }
  tone(freq, dur, type = 'sine', peak = 0.2, a = 0.01, slide) { const c = this.ctx; if (!c || this.muted) return; const t = c.currentTime; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur); const g = c.createGain(); this.env(g, t, a, peak, dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + a + dur + 0.05); }
  update(dt, { day = 1, riverD = 999, wind = 0.5, inTown = false } = {}) {
    const c = this.ctx; if (!c || this.muted) return; const t = c.currentTime;
    this.wind.g.gain.setTargetAtTime(0.05 + wind * 0.07, t, 0.5); this.wind.f.frequency.setTargetAtTime(300 + wind * 500 + Math.sin(t * 0.3) * 120, t, 0.8);
    this.river.g.gain.setTargetAtTime(Math.max(0, 1 - riverD / 30) * 0.09, t, 0.4);
    if (day > 0.5 && t > this.nextBird) { this.nextBird = t + 1.5 + Math.random() * (inTown ? 6 : 3); this.bird(); }
    if (day < 0.5 && t > this.nextCricket) { this.nextCricket = t + 0.4 + Math.random() * 0.8; for (let i = 0; i < 3; i++) setTimeout(() => this.tone(4200 + Math.random() * 300, 0.03, 'sine', 0.012), i * 60); }
  }
  bird() { const base = 2200 + Math.random() * 1800; const n = 2 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) setTimeout(() => this.tone(base * (0.9 + Math.random() * 0.25), 0.07 + Math.random() * 0.05, 'sine', 0.025, 0.01, base * (1.1 + Math.random() * 0.3)), i * (90 + Math.random() * 60)); }
  // footsteps: two procedural layers (heel thump + surface texture), varied per surface and pace; tiny random pitch/level so no two steps match
  step(surface = 'grass', loud = 0.6, pace = 'jog') {
    const c = this.ctx; if (!c || this.muted || c.state !== 'running') return; const t = c.currentTime, r = () => 0.88 + Math.random() * 0.24; const L = loud * (0.85 + Math.random() * 0.3);
    const burst = (dt, dur, type, f, q, peak, buf = this.white) => { const s = c.createBufferSource(); s.buffer = buf; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(peak, t + dt + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + dur); s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t + dt, Math.random() * 1.5); s.stop(t + dt + dur + 0.05); };
    const thump = (f, dur, peak) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * r(), t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05); };
    const run = pace === 'sprint' ? 1 : 0;
    if (surface === 'grass') { thump(85, 0.07, 0.07 * L); burst(0.005, 0.09 + run * 0.03, 'bandpass', 2600 * r(), 0.7, 0.05 * L); burst(0.03, 0.07, 'highpass', 4200 * r(), 0.5, 0.025 * L); }
    else if (surface === 'path') { thump(95, 0.06, 0.08 * L); for (let i = 0; i < 4 + run * 2; i++) burst(0.004 + i * (0.011 + Math.random() * 0.012), 0.03, 'bandpass', (1700 + Math.random() * 1800), 2.2, (0.06 - i * 0.008) * L); }
    else if (surface === 'stone') { thump(140, 0.05, 0.09 * L); burst(0, 0.035, 'bandpass', 3200 * r(), 3, 0.08 * L); burst(0.02, 0.05, 'highpass', 5200, 0.8, 0.03 * L); }
    else if (surface === 'wood') { thump(110, 0.11, 0.13 * L); const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 230 * r(); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045 * L, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.12); burst(0.003, 0.04, 'bandpass', 1500 * r(), 1.5, 0.04 * L); }
    else if (surface === 'water') { burst(0, 0.18, 'lowpass', 700 * r(), 0.8, 0.09 * L, this.brown); burst(0.02, 0.14, 'bandpass', 1600 * r(), 1.2, 0.05 * L); }
    else { thump(90, 0.06, 0.08 * L); burst(0, 0.06, 'bandpass', 1000, 1, 0.06 * L); }
  }
  // breathing: soft in/out breaths when sprinting or low on stamina; effort 0..1 sets loudness and rate (called by the game each frame)
  breathe(dt, effort) {
    const c = this.ctx; if (!c || this.muted || c.state !== 'running') return; this._br = (this._br ?? 0) - dt; if (effort < 0.05 || this._br > 0) return;
    const period = 1.25 - effort * 0.6; this._br = period; this._brIn = !this._brIn; const t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.white; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = this._brIn ? 1100 : 750; f.Q.value = 0.9; const g = c.createGain(); const pk = (0.012 + effort * 0.03) * (this._brIn ? 0.8 : 1);
    const d = period * (this._brIn ? 0.38 : 0.48); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + d * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + d + 0.05);
  }
  // iOS / Android: an AudioContext only starts inside a user gesture. Resume + play one silent sample on the first touch/click/key.
  bindUnlock() {
    const go = () => { this.init(); const c = this.ctx; if (!c) return; if (c.state !== 'running') c.resume?.(); try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (_) { }
      if (c.state === 'running') for (const e of evs) removeEventListener(e, go, true); };
    const evs = ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'click', 'keydown']; for (const e of evs) addEventListener(e, go, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.ctx && this.ctx.state !== 'running') this.ctx.resume?.(); });
  }
  swing(p = 1) { this.noise(0.18, 'bandpass', 900 * p + 400, 0.12, 1.4); }
  whoosh() { this.noise(0.3, 'lowpass', 700, 0.16); }
  hit(heavy) { this.tone(heavy ? 90 : 130, 0.14, 'sine', 0.35, 0.002, 50); this.noise(0.08, 'lowpass', 1800, 0.25); }
  block() { this.tone(520, 0.2, 'triangle', 0.12, 0.002, 380); this.noise(0.05, 'highpass', 3000, 0.12); }
  parry() { this.tone(1250, 0.5, 'sine', 0.15, 0.002); this.tone(1880, 0.35, 'sine', 0.08, 0.002); }
  hurt() { this.tone(180, 0.18, 'sawtooth', 0.06, 0.005, 110); this.noise(0.1, 'lowpass', 900, 0.15); }
  growl() { const c = this.ctx; if (!c || this.muted) return; const f = this.noise(0.6, 'lowpass', 220, 0.18, 6, this.brown); if (f) f.frequency.linearRampToValueAtTime(380, c.currentTime + 0.5); }
  grunt() { this.tone(110, 0.25, 'sawtooth', 0.08, 0.01, 70); this.noise(0.2, 'lowpass', 400, 0.12, 2, this.brown); }
  pickup() { this.tone(880, 0.08, 'sine', 0.08); setTimeout(() => this.tone(1320, 0.12, 'sine', 0.07), 70); }
  coin() { this.tone(1600, 0.08, 'square', 0.03); setTimeout(() => this.tone(2100, 0.12, 'square', 0.025), 60); }
  click() { this.tone(660, 0.04, 'triangle', 0.05); }
  level() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, 'triangle', 0.07, 0.02), i * 120)); }
  choir() { const c = this.ctx; if (!c || this.muted) return; const t = c.currentTime; for (const f of [220, 277.2, 329.6, 440]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 1.003; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2); o.connect(g); o2.connect(g); g.connect(this.master); o.start(t); o2.start(t); o.stop(t + 2.4); o2.stop(t + 2.4); } }
  bell(dist = 0) { const v = Math.max(0.02, 0.2 * (1 - dist / 260)); for (const [m, d] of [[1, 3.5], [2.0, 2.5], [2.4, 2], [3.0, 1.6], [4.2, 1.2]]) this.tone(196 * m, d, 'sine', v / m, 0.005); }
}
