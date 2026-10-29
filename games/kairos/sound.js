// Όλοι οι ήχοι φτιάχνονται με κώδικα (Web Audio) — κανένα αρχείο ήχου.
// Τρία «χαλιά» που σβήνουν/ανάβουν με τον καιρό (βροχή, αέρας χιονιού, πουλάκια)
// και μικρά εφέ: woof, γελάκι, πλατς, καμπανάκια.

export class Sound {
  constructor() { this.ctx = null; this.timers = { chirp: 2, drip: 0.5, tinkle: 3 }; this.levels = { rain: 0, snow: 0, sun: 0 }; }

  // Καλείται μέσα σε άγγιγμα (click) — αλλιώς το iPhone δεν αφήνει ήχο.
  start() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);

    // λευκός θόρυβος 2″ για βροχή, αέρα και πλατς
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // βροχή: θόρυβος μέσα από ζωνοπερατό
    this.rainGain = this.bed([['highpass', 500, 0.5], ['lowpass', 2600, 0.6]]);
    // χιόνι: απαλό «σουσού», φίλτρο που ανεβοκατεβαίνει αργά
    this.snowGain = this.bed([['lowpass', 380, 1.2]], f => {
      const lfo = ctx.createOscillator(), amt = ctx.createGain();
      lfo.frequency.value = 0.13; amt.gain.value = 220;
      lfo.connect(amt).connect(f.frequency); lfo.start();
    });
    this.resume();
  }

  bed(filters, extra) {
    const ctx = this.ctx, src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = this.noise; src.loop = true; g.gain.value = 0;
    let node = src;
    for (const [type, freq, q] of filters) {
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      node.connect(f); node = f;
      if (extra) extra(f);
    }
    node.connect(g).connect(this.master); src.start();
    return g;
  }

  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }

  // rain/snow/sun από 0 ως 1 — ο ήχος ακολουθεί ομαλά
  set(rain, snow, sun) {
    this.levels = { rain, snow, sun };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.rainGain.gain.setTargetAtTime(rain * 0.22, t, 0.4);
    this.snowGain.gain.setTargetAtTime(snow * 0.35, t, 0.6);
  }

  // τυχαία μικρά γεγονότα: κελαηδίσματα, σταγόνες, καμπανάκια
  update(dt) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const L = this.levels, T = this.timers;
    if (L.sun > 0.5 && (T.chirp -= dt) < 0) { this.birdSong(); T.chirp = 2.5 + Math.random() * 4; }
    if (L.rain > 0.3 && (T.drip -= dt) < 0) { this.drip(); T.drip = 0.08 + Math.random() * 0.35; }
    if (L.snow > 0.5 && (T.tinkle -= dt) < 0) { this.tinkle(0.05); T.tinkle = 2 + Math.random() * 3; }
  }

  tone(freq, start, dur, { type = 'sine', vol = 0.2, to = null, attack = 0.01 } = {}) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, start);
    if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.master); o.start(start); o.stop(start + dur + 0.05);
  }

  birdSong() {
    const t = this.ctx.currentTime, base = 2600 + Math.random() * 1400, n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const s = t + i * 0.13;
      this.tone(base, s, 0.09, { vol: 0.05, to: base * 1.35 });
      this.tone(base * 1.3, s + 0.05, 0.06, { vol: 0.035, to: base * 0.95 });
    }
  }

  drip() {
    const t = this.ctx.currentTime, f = 900 + Math.random() * 1500;
    this.tone(f, t, 0.07, { vol: 0.025 + Math.random() * 0.03, to: f * 0.45 });
  }

  tinkle(vol = 0.08) {
    const t = this.ctx.currentTime, notes = [1568, 1760, 2093, 2349, 2637];
    const f = notes[Math.random() * notes.length | 0];
    this.tone(f, t, 1.2, { vol, attack: 0.005 });
  }

  // ήχος για κάθε κουμπί καιρού
  chime(kind) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const seq = { sun: [523, 659, 784, 1047], rain: [784, 659, 523, 392], snow: [1568, 1319, 1175, 1047, 1319] }[kind] || [];
    seq.forEach((f, i) => this.tone(f, t + i * 0.09, 0.5, { vol: 0.12, type: kind === 'rain' ? 'triangle' : 'sine' }));
  }

  // Φουντούκης: δύο απαλά «γαβ»
  woof() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const s of [0, 0.22]) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(420, t + s); o.frequency.exponentialRampToValueAtTime(190, t + s + 0.14);
      f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 4;
      g.gain.setValueAtTime(0.0001, t + s); g.gain.exponentialRampToValueAtTime(0.25, t + s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + s + 0.16);
      o.connect(f).connect(g).connect(this.master); o.start(t + s); o.stop(t + s + 0.2);
    }
  }

  // Πέτρος: χαρούμενο «χοπ» που ανεβαίνει
  hop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(330, t, 0.25, { vol: 0.18, to: 880, type: 'triangle' });
    [988, 1175].forEach((f, i) => this.tone(f, t + 0.18 + i * 0.08, 0.2, { vol: 0.08 }));
  }

  splash() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise; f.type = 'bandpass'; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.4); f.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(f).connect(g).connect(this.master); src.start(t, Math.random()); src.stop(t + 0.5);
  }

  // μαγικό «φσσστ» όταν αλλάζει ρούχα
  sparkle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [1319, 1568, 1976, 2637].forEach((f, i) => this.tone(f, t + 0.25 + i * 0.05, 0.35, { vol: 0.05 }));
  }

  // νανούρισμα για το τέλος, μετά όλα σβήνουν
  goodnight() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [784, 659, 698, 587, 523, 392, 523].forEach((f, i) =>
      this.tone(f, t + i * 0.55, 1.1, { vol: 0.12, attack: 0.05 }));
    this.set(0, 0, 0);
    this.master.gain.setTargetAtTime(0, t + 5, 1.2);
  }
}
