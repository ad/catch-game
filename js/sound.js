// Звуки на WebAudio (синтез, без файлов). Уважает Game.soundOn.

const Sound = {
  ctx: null,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    } catch (e) { this.ctx = null; }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  beep(freq, start, dur, type, vol) {
    const t = this.ctx.currentTime + start;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  slide(f1, f2, start, dur, type, vol) {
    const t = this.ctx.currentTime + start;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  noise(start, dur, vol) {
    const t = this.ctx.currentTime + start;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(g).connect(this.ctx.destination);
    src.start(t);
  },

  play(name) {
    if (!Game.soundOn || !this.ctx) return;
    this.resume();
    switch (name) {
      case 'good':    this.beep(660, 0, 0.12, 'triangle', 0.2); this.beep(880, 0.07, 0.12, 'triangle', 0.18); break;
      case 'coin':    this.beep(988, 0, 0.08, 'square', 0.15); this.beep(1319, 0.06, 0.14, 'square', 0.15); break;
      case 'candy':   this.slide(700, 1200, 0, 0.22, 'triangle', 0.18); break;
      case 'cake':    this.beep(523, 0, 0.18, 'triangle', 0.18); this.beep(659, 0, 0.18, 'triangle', 0.14); this.beep(784, 0, 0.22, 'triangle', 0.12); break;
      case 'gift':    [523, 659, 784, 1046].forEach((f, i) => this.beep(f, i * 0.07, 0.16, 'triangle', 0.16)); break;
      case 'bonus':   [784, 1046, 1318].forEach((f, i) => this.beep(f, i * 0.06, 0.14, 'sine', 0.16)); break;
      case 'shield':  this.beep(440, 0, 0.1, 'sine', 0.18); this.beep(660, 0.05, 0.16, 'sine', 0.16); break;
      case 'bad':     this.beep(160, 0, 0.16, 'square', 0.2); break;
      case 'stun':    this.slide(220, 90, 0, 0.3, 'sawtooth', 0.2); break;
      case 'slow':    this.slide(400, 140, 0, 0.28, 'sawtooth', 0.16); break;
      case 'bomb':    this.noise(0, 0.3, 0.3); this.beep(80, 0, 0.3, 'square', 0.2); break;
      case 'brick':   this.beep(90, 0, 0.22, 'square', 0.25); break;
      case 'cracker': this.noise(0, 0.35, 0.25); this.slide(1200, 400, 0, 0.35, 'square', 0.12); break;
      case 'roundwin':[523, 659, 784, 1046, 1318].forEach((f, i) => this.beep(f, i * 0.11, 0.3, 'triangle', 0.2)); break;
      case 'gameover':[440, 330, 247, 165].forEach((f, i) => this.beep(f, i * 0.16, 0.32, 'triangle', 0.2)); break;
      case 'click':   this.beep(880, 0, 0.06, 'square', 0.12); break;
    }
  },
};
