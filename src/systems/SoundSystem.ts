/** Procedural SFX using Web Audio API — no asset files needed */
export class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private get out(): GainNode {
    this.getCtx();
    return this.masterGain!;
  }

  // --- Player attacks ---
  playerSlash(): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    // Swoosh: filtered noise burst
    const dur = 0.12;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2000, t);
    hp.frequency.linearRampToValueAtTime(6000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + dur);
    src.connect(hp).connect(g).connect(this.out);
    src.start(t);
  }

  // --- Hit impact ---
  hitImpact(heavy = false): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    // Thud: low freq oscillator + noise
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(heavy ? 80 : 150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(heavy ? 0.5 : 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(g).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.1);

    // Click
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
    const ns = ctx.createBufferSource();
    ns.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.2, t);
    ng.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
    ns.connect(ng).connect(this.out);
    ns.start(t);
  }

  // --- Enemy death ---
  enemyDeath(): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(g).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // --- Dash ---
  dash(): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(g).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // --- Player hurt ---
  playerHurt(): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(g).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // --- Room clear ---
  roomClear(): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + i * 0.1);
      g.gain.linearRampToValueAtTime(0.2, t + i * 0.1 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.3);
      osc.connect(g).connect(this.out);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.3);
    });
  }

  // --- Reward select ---
  rewardSelect(): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(900, t + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(g).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // --- Boss appear ---
  bossAppear(): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.linearRampToValueAtTime(40, t + 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.linearRampToValueAtTime(0.01, t + 0.8);
    osc.connect(g).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.8);
  }

  // --- Game over ---
  gameOver(): void {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    [392, 349, 330, 262].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + i * 0.2);
      g.gain.linearRampToValueAtTime(0.2, t + i * 0.2 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.2 + 0.4);
      osc.connect(g).connect(this.out);
      osc.start(t + i * 0.2);
      osc.stop(t + i * 0.2 + 0.4);
    });
  }
}

// Global singleton
export const sound = new SoundSystem();
