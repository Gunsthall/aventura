/* =============================================
   AUDIO - Sound Effects (Web Audio API)
   ============================================= */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.3;
  }

  _ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  _playTone(freq, duration, type = 'sine', gainVal = null) {
    if (!this.enabled) return;
    this._ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime((gainVal ?? this.volume) * 0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Page turn - soft chime
  pageTurn() {
    if (!this.enabled) return;
    this._ensureContext();
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.3, 'sine'), i * 80);
    });
  }

  // Correct answer - sparkly ascending
  correct() {
    if (!this.enabled) return;
    this._ensureContext();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.4, 'sine'), i * 100);
    });
  }

  // Wrong answer - gentle descending
  wrong() {
    if (!this.enabled) return;
    this._ensureContext();
    const notes = [392, 349]; // G4, F4
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.3, 'triangle'), i * 150);
    });
  }

  // Choice hover - subtle click
  hover() {
    if (!this.enabled) return;
    this._playTone(800, 0.05, 'sine', 0.1);
  }

  // Choice click
  click() {
    if (!this.enabled) return;
    this._playTone(600, 0.1, 'sine', 0.2);
  }

  // Ending fanfare
  fanfare() {
    if (!this.enabled) return;
    this._ensureContext();
    const melody = [
      [523, 0.2], [523, 0.2], [523, 0.2], [523, 0.4],
      [415, 0.4], [466, 0.4], [523, 0.2], [466, 0.15], [523, 0.6]
    ];
    let time = 0;
    melody.forEach(([freq, dur]) => {
      setTimeout(() => this._playTone(freq, dur + 0.1, 'sine'), time * 1000);
      time += dur;
    });
  }

  // Magical sparkle
  sparkle() {
    if (!this.enabled) return;
    this._ensureContext();
    for (let i = 0; i < 5; i++) {
      const freq = 1000 + Math.random() * 2000;
      setTimeout(() => this._playTone(freq, 0.15, 'sine', 0.1), i * 60);
    }
  }

  // Connection sound
  connected() {
    if (!this.enabled) return;
    this._ensureContext();
    this._playTone(440, 0.15, 'sine');
    setTimeout(() => this._playTone(554, 0.15, 'sine'), 120);
    setTimeout(() => this._playTone(659, 0.3, 'sine'), 240);
  }
}

// Global instance
window.audioManager = new AudioManager();
