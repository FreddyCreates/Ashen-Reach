// Ashen Reach Procedural WebAudio Sound Engine
// Completely procedural zero-asset synthesizers for sci-fi space atmosphere, engines, weapons, and UI.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.engineGain = null;
    this.engineOsc = null;
    this.engineFilter = null;
    this.engineSub = null;
    this.windGain = null;
    this.windFilter = null;
    this.musicNodes = [];
    this.enabled = true;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.45;
    this.initialized = false;
    this.isMusicPlaying = false;
  }

  init() {
    if (this.initialized) return;
    try {
      if (typeof window === 'undefined') return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this._initEngineHum();
      this._initWindSound();
      this.initialized = true;
    } catch (e) {
      console.warn('WebAudio not available', e);
    }
  }

  resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.isMusicPlaying && this.initialized) {
      this.startAmbientMusic();
    }
  }

  _initEngineHum() {
    if (!this.ctx) return;
    // Dual oscillator drone for starship thruster rumble
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(52, this.ctx.currentTime);

    this.engineSub = this.ctx.createOscillator();
    this.engineSub.type = 'sine';
    this.engineSub.frequency.setValueAtTime(26, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineSub.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc.start();
    this.engineSub.start();
  }

  _initWindSound() {
    if (!this.ctx) return;
    // White noise buffer for atmospheric rush and cruise speed
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    noise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxGain);
    noise.start();
  }

  updateEngine(throttle, speedRatio = 0, isCruise = false) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const targetFreq = 45 + throttle * 55 + (isCruise ? 40 : 0);
    const targetFilter = 100 + throttle * 480 + (isCruise ? 350 : 0);
    const targetVolume = Math.min(0.35, Math.max(0.02, throttle * 0.28 + (isCruise ? 0.08 : 0)));

    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
    this.engineSub.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.1);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.15);
    this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.1);

    // Wind / atmospheric drag sound
    if (this.windGain) {
      const windVol = Math.min(0.25, Math.max(0, (speedRatio - 0.2) * 0.3));
      this.windGain.gain.setTargetAtTime(windVol, now, 0.2);
      this.windFilter.frequency.setTargetAtTime(250 + speedRatio * 900, now, 0.2);
    }
  }

  laser(isEnemy = false) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isEnemy ? 'sawtooth' : 'sine';
    const startFreq = isEnemy ? 620 : 880;
    const endFreq = isEnemy ? 180 : 220;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.14);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  impact(isHeavy = false) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = isHeavy ? 0.45 : 0.22;
    // Noise blast + sub oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHeavy ? 110 : 170, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + dur);

    oscGain.gain.setValueAtTime(isHeavy ? 0.6 : 0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.05);

    // White noise pop
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isHeavy ? 600 : 1200, now);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isHeavy ? 0.5 : 0.3, now);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  spiritSummon() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Sacred chord arpeggio: 432Hz harmonic series
    const notes = [432, 540, 648, 864, 1080];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 1.3);
    });
  }

  warpJump() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.9);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + 0.9);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  uiClick(type = 'click') {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const freq = type === 'hover' ? 1200 : type === 'confirm' ? 960 : type === 'back' ? 440 : 750;
    osc.frequency.setValueAtTime(freq, now);
    if (type === 'confirm') {
      osc.frequency.exponentialRampToValueAtTime(1440, now + 0.09);
    } else {
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.04);
    }
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'confirm' ? 0.1 : 0.04));

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  startAmbientMusic() {
    if (!this.initialized || !this.ctx || this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    // Generative ambient chords (deep space ethereal mood)
    // Chords in D Dorian / Aeolian modal space: [D, F, A, C], [G, Bb, D, F], [A, C, E, G], [Bb, D, F, A]
    const chords = [
      [146.83, 220.00, 261.63, 349.23], // Dm7
      [116.54, 174.61, 233.08, 293.66], // Bbmaj7
      [130.81, 196.00, 246.94, 329.63], // Cmaj7
      [98.00, 146.83, 196.00, 261.63]   // Gsus4
    ];
    let chordIndex = 0;

    const playNextChord = () => {
      if (!this.isMusicPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const chord = chords[chordIndex % chords.length];
      chordIndex++;

      chord.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, now);
        filter.frequency.linearRampToValueAtTime(650, now + 3);
        filter.frequency.linearRampToValueAtTime(320, now + 7);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 2.5);
        gain.gain.linearRampToValueAtTime(0.04, now + 5.5);
        gain.gain.linearRampToValueAtTime(0.001, now + 7.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + 8);
      });

      // Schedule next chord in 6.5 seconds for crossfade
      setTimeout(() => {
        if (this.isMusicPlaying) playNextChord();
      }, 6500);
    };

    playNextChord();
  }

  setMuted(muted) {
    if (!this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 1.0, this.ctx.currentTime, 0.05);
  }

  setVolume(sfx, music) {
    if (this.sfxGain) this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
    if (this.musicGain) this.musicGain.gain.setValueAtTime(music, this.ctx.currentTime);
    this.sfxVolume = sfx;
    this.musicVolume = music;
  }
}

export const audio = new SoundEngine();
