// Ember Valley — WebAudio synth sound effects. No audio files.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }
  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  tone(freq, dur, type = 'sine', vol = 0.16, when = 0, slideTo = 0) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  click() { this.tone(660, 0.06, 'triangle', 0.08); }
  found() {
    // two-note chime: E5 -> A5
    this.tone(659, 0.14, 'sine', 0.2);
    this.tone(880, 0.22, 'sine', 0.2, 0.09);
  }
  miss() {
    // low buzz
    this.tone(140, 0.28, 'sawtooth', 0.12, 0, 90);
  }
  hint() { this.tone(1175, 0.18, 'sine', 0.12); this.tone(1568, 0.2, 'sine', 0.1, 0.07); }
  star() { this.tone(1047, 0.12, 'triangle', 0.14); }
  win() {
    // C5 E5 G5 C6 arpeggio
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.24, 'triangle', 0.16, i * 0.11));
  }
  fail() {
    this.tone(330, 0.2, 'triangle', 0.14, 0, 220);
    this.tone(220, 0.3, 'triangle', 0.14, 0.15, 160);
  }
}
