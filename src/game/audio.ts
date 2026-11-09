/**
 * Procedural Web Audio API sound synthesizer for MathCipher 3D
 * Zero external audio files, 100% procedural sound effects
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;
  private humOsc1: OscillatorNode | null = null;
  private humOsc2: OscillatorNode | null = null;
  private isHumming: boolean = false;

  // Sprint / Running whoosh wind effect
  private sprintGain: GainNode | null = null;
  private sprintNoise: AudioBufferSourceNode | null = null;
  private isSprintAudioActive: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(
        muted ? 0 : 0.045,
        this.ctx.currentTime
      );
    }
    if (this.sprintGain && this.ctx) {
      this.sprintGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Starts ambient Backrooms fluorescent light hum
   */
  public startAmbientHum() {
    if (this.isHumming) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : 0.045, now);

      // Low pass filter for muffled eerie hum
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);

      // 60Hz and 120Hz electrical buzz
      this.humOsc1 = this.ctx.createOscillator();
      this.humOsc1.type = 'sawtooth';
      this.humOsc1.frequency.setValueAtTime(60, now);

      this.humOsc2 = this.ctx.createOscillator();
      this.humOsc2.type = 'sine';
      this.humOsc2.frequency.setValueAtTime(120, now);

      // Subtle LFO modulation for flickering realism
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.4, now);
      lfoGain.gain.setValueAtTime(0.015, now);
      lfo.connect(lfoGain.gain);

      this.humOsc1.connect(filter);
      this.humOsc2.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      this.humOsc1.start();
      this.humOsc2.start();
      lfo.start();
      this.isHumming = true;
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public stopAmbientHum() {
    if (!this.isHumming) return;
    try {
      this.humOsc1?.stop();
      this.humOsc2?.stop();
      this.humOsc1?.disconnect();
      this.humOsc2?.disconnect();
      this.ambientGain?.disconnect();
      this.isHumming = false;
    } catch {
      // ignore
    }
  }

  /**
   * Sprint wind whoosh sound effect
   */
  public setSprinting(isSprinting: boolean) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (isSprinting && !this.isSprintAudioActive) {
      try {
        const now = this.ctx.currentTime;

        // Generate pink noise buffer for aerodynamic rushing air
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2) * 0.25;
        }

        this.sprintNoise = this.ctx.createBufferSource();
        this.sprintNoise.buffer = buffer;
        this.sprintNoise.loop = true;

        // Bandpass filter for muffled wind rush
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(320, now);
        filter.Q.setValueAtTime(1.8, now);

        this.sprintGain = this.ctx.createGain();
        this.sprintGain.gain.setValueAtTime(0, now);
        this.sprintGain.gain.linearRampToValueAtTime(0.08, now + 0.25);

        this.sprintNoise.connect(filter);
        filter.connect(this.sprintGain);
        this.sprintGain.connect(this.ctx.destination);

        this.sprintNoise.start(now);
        this.isSprintAudioActive = true;
      } catch {
        // ignore
      }
    } else if (!isSprinting && this.isSprintAudioActive) {
      try {
        const now = this.ctx.currentTime;
        if (this.sprintGain) {
          this.sprintGain.gain.linearRampToValueAtTime(0.001, now + 0.2);
          setTimeout(() => {
            try {
              this.sprintNoise?.stop();
              this.sprintNoise?.disconnect();
              this.sprintGain?.disconnect();
              this.sprintNoise = null;
              this.sprintGain = null;
              this.isSprintAudioActive = false;
            } catch {
              // ignore
            }
          }, 220);
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Procedural footstep on Backrooms carpet / tile
   * Stronger impact and scuff sound when sprinting
   */
  public playFootstep(isSprinting: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Synthesize carpet scuff noise
      const bufferSize = Math.floor(
        this.ctx.sampleRate * (isSprinting ? 0.08 : 0.05)
      );
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isSprinting ? 380 : 220, now);
      filter.Q.setValueAtTime(isSprinting ? 3.5 : 2.5, now);

      // 2. Heavy boot heel impact (thump)
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isSprinting ? 110 : 70, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + (isSprinting ? 0.07 : 0.05));

      // Higher volume and punch when running
      const gain = this.ctx.createGain();
      const volume = isSprinting ? 0.22 : 0.12;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + (isSprinting ? 0.07 : 0.06)
      );

      noise.connect(filter);
      filter.connect(gain);
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      osc.start(now);
      noise.stop(now + 0.09);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  }

  /**
   * UI Click / Interact sound
   */
  public playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // ignore
    }
  }

  /**
   * Terminal boot / open chime
   */
  public playTerminalOpen() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [329.63, 440, 659.25, 880].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.06 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.26);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Access Granted / Password Correct
   */
  public playSuccess() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.15, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.42);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Wrong code buzzer
   */
  public playError() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [140, 130].forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Door opening servo / sliding sound
   */
  public playDoorOpen() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(220, now + 1.2);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.35);
    } catch {
      // ignore
    }
  }
}

export const sound = new SoundEngine();
