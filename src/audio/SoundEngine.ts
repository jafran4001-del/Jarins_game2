/**
 * Procedural Web Audio API Sound & Music Synthesizer
 * Generates dynamic apocalyptic synthwave background music and retro game SFX without any external asset dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  
  public isMuted: boolean = false;
  public musicVolume: number = 0.45;
  public sfxVolume: number = 0.7;
  
  private isMusicPlaying: boolean = false;
  private musicTimer: number | null = null;
  private musicStep: number = 0;
  private tempo: number = 118; // BPM
  private isBossMode: boolean = false;
  
  // Coin pitch escalation combo tracker
  private lastCoinTime: number = 0;
  private coinPitchMultiplier: number = 1.0;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1, this.ctx.currentTime);
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx && !this.isMuted) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx && !this.isMuted) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  public setBossMode(boss: boolean) {
    this.isBossMode = boss;
  }

  // ==================== BACKGROUND MUSIC SYSTEM ====================

  public startMusic() {
    this.init();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.musicStep = 0;
    this.scheduleNextBeat();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleNextBeat() {
    if (!this.isMusicPlaying || !this.ctx) return;

    const stepDuration = (60 / this.tempo) / 4; // 16th notes
    const time = this.ctx.currentTime + 0.05;

    this.playMusicStep(this.musicStep, time);

    this.musicStep = (this.musicStep + 1) % 64; // 4 bars loop (64 16th steps)

    this.musicTimer = window.setTimeout(() => {
      this.scheduleNextBeat();
    }, stepDuration * 1000);
  }

  private playMusicStep(step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;

    // Bassline in D Minor / Apocalyptic synth (D1 = 36.7Hz, F1 = 43.65Hz, G1 = 48.99Hz, Bb1 = 58.27Hz, A1 = 55Hz)
    const bassNotes = [
      // Bar 1: D
      36.71, 36.71, 73.42, 36.71,  36.71, 73.42, 36.71, 36.71,
      36.71, 36.71, 73.42, 36.71,  43.65, 48.99, 36.71, 73.42,
      // Bar 2: F -> G
      43.65, 43.65, 87.31, 43.65,  43.65, 87.31, 43.65, 48.99,
      48.99, 48.99, 97.99, 48.99,  55.00, 58.27, 48.99, 36.71,
      // Bar 3: Bb -> A
      58.27, 58.27, 116.54, 58.27, 58.27, 116.54, 58.27, 55.00,
      55.00, 55.00, 110.00, 55.00, 55.00, 48.99, 43.65, 36.71,
      // Bar 4: Tension build
      36.71, 36.71, 73.42, 36.71,  43.65, 36.71, 48.99, 36.71,
      55.00, 58.27, 65.41, 73.42,  87.31, 97.99, 110.0, 116.54
    ];

    // 1. Synth Bass Note
    if (step % 2 === 0 || this.isBossMode) {
      const freq = bassNotes[step % bassNotes.length];
      this.synthBassNote(freq, time, 0.14);
    }

    // 2. Drums: Kick on beats 0, 4, 8, 12... (quarter notes)
    if (step % 4 === 0) {
      this.synthDrumKick(time);
    }

    // 3. Drums: Snare / Clap on beats 4, 12 of each 16 steps
    if (step % 8 === 4) {
      this.synthDrumSnare(time);
    }

    // 4. Hi-hat on every off-beat (step % 2 === 1)
    if (step % 2 === 1) {
      this.synthDrumHiHat(time, step % 4 === 2 ? 0.08 : 0.04);
    }

    // 5. Arp melody (eerie dark arpeggio)
    if (step % 2 === 0) {
      const arpNotes = [
        293.66, 349.23, 440.00, 523.25, 440.00, 349.23, 293.66, 220.00,
        329.63, 392.00, 493.88, 587.33, 493.88, 392.00, 329.63, 246.94
      ];
      const arpFreq = arpNotes[(step / 2) % arpNotes.length];
      this.synthArpNote(arpFreq, time);
    }

    // 6. Boss warning sirens / high drone
    if (this.isBossMode && step % 16 === 0) {
      this.synthBossDrone(time);
    }
  }

  private synthBassNote(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.isBossMode ? 700 : 420, time);
    filter.Q.setValueAtTime(4, time);

    gain.gain.setValueAtTime(0.32, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthDrumKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);

    gain.gain.setValueAtTime(0.65, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private synthDrumSnare(time: number) {
    if (!this.ctx || !this.musicGain) return;
    // Noise buffer
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.12);
  }

  private synthDrumHiHat(time: number, vol: number) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.04);
  }

  private synthArpNote(freq: number, time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private synthBossDrone(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.linearRampToValueAtTime(95, time + 1.2);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.linearRampToValueAtTime(0.001, time + 1.2);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 1.2);
  }

  // ==================== SOUND EFFECTS (SFX) ====================

  /**
   * Sparkling metallic chime for coin collection with pitch ramping on combos
   */
  public playCoinSound() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = performance.now();
    if (now - this.lastCoinTime < 400) {
      this.coinPitchMultiplier = Math.min(2.0, this.coinPitchMultiplier + 0.1);
    } else {
      this.coinPitchMultiplier = 1.0;
    }
    this.lastCoinTime = now;

    const baseFreq = 987.77 * this.coinPitchMultiplier; // B5
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2.0, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 3.0, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(this.ctx.currentTime);
    osc2.start(this.ctx.currentTime);
    osc1.stop(this.ctx.currentTime + 0.18);
    osc2.stop(this.ctx.currentTime + 0.18);
  }

  /**
   * Weapon gunshot sounds customized per weapon type
   */
  public playGunshot(type: string) {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const time = this.ctx.currentTime;

    switch (type) {
      case 'shotgun': {
        // Heavy boom & pellet blast
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.22);
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + 0.25);
        this.synthNoiseBurst(0.18, 0.45, 1200);
        break;
      }
      case 'smg': {
        // High pitched snappy crack
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, time);
        osc.frequency.exponentialRampToValueAtTime(70, time + 0.06);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + 0.07);
        break;
      }
      case 'plasma': {
        // Sci-fi laser zap
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, time);
        osc.frequency.exponentialRampToValueAtTime(120, time + 0.14);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + 0.15);
        break;
      }
      case 'rocket': {
        // Rocket launch whoosh & deep thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, time);
        osc.frequency.linearRampToValueAtTime(300, time + 0.15);
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + 0.25);
        break;
      }
      case 'rifle': {
        // Sharp tactical rifle shot
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.1);
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + 0.12);
        this.synthNoiseBurst(0.07, 0.3, 2200);
        break;
      }
      default: {
        // Standard Pistol
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.09);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + 0.1);
        break;
      }
    }
  }

  private synthNoiseBurst(duration: number, vol: number, filterFreq: number) {
    if (!this.ctx || !this.sfxGain) return;
    const time = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(time);
    noise.stop(time + duration);
  }

  public playZombieHit() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.08);
  }

  public playZombieDeath() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.linearRampToValueAtTime(35, time + 0.18);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  public playPlayerHurt() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, time);
    osc.frequency.linearRampToValueAtTime(30, time + 0.2);

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  public playPowerup() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const time = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + idx * 0.06);
      gain.gain.setValueAtTime(0.2, time + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.06 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time + idx * 0.06);
      osc.stop(time + idx * 0.06 + 0.15);
    });
  }

  public playExplosion() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const time = this.ctx.currentTime;
    
    // Sub-bass thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, time);
    osc.frequency.exponentialRampToValueAtTime(20, time + 0.6);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.65);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + 0.65);

    // Rumble noise
    this.synthNoiseBurst(0.6, 0.6, 600);
  }

  public playWaveStart() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const time = this.ctx.currentTime;
    [220, 277.18, 329.63, 440].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time + idx * 0.1);
      gain.gain.setValueAtTime(0.18, time + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.1 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time + idx * 0.1);
      osc.stop(time + idx * 0.1 + 0.2);
    });
  }

  public playWaveComplete() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const time = this.ctx.currentTime;
    [329.63, 440, 554.37, 659.25, 880].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + idx * 0.08);
      gain.gain.setValueAtTime(0.25, time + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time + idx * 0.08);
      osc.stop(time + idx * 0.08 + 0.25);
    });
  }

  public playPurchase() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, time); // D5
    osc.frequency.setValueAtTime(880, time + 0.08); // A5

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.25);
  }
}

export const soundEngine = new SoundEngine();
