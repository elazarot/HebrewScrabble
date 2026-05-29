/**
 * Sound Service for שבץ נא (Hebrew Scrabble)
 * Uses the Web Audio API to dynamically synthesize realistic board game sound effects:
 * - Wood Clack (tile placement)
 * - Wood Slide (recalling or shuffling tiles)
 * - Gentle Chime (success / valid move)
 * - Soft Buzz (error / invalid move)
 *
 * 100% offline, zero-dependency, and extremely lightweight.
 */

class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Load mute preference
    const storedMute = localStorage.getItem('scrabble_mute');
    this.isMuted = storedMute === 'true';
  }

  /** Lazy-initializes the AudioContext to comply with browser autoplay policies */
  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume context if suspended by browser security policy
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    localStorage.setItem('scrabble_mute', String(mute));
  }

  public getMute(): boolean {
    return this.isMuted;
  }

  /**
   * Generates a realistic wooden clack sound
   * Mimics the high-frequency impact transient and the low-frequency body resonance of a solid wooden tile.
   */
  public playTilePlace() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // 1. High-frequency click transient (noise burst)
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1000, now);
      noiseFilter.Q.setValueAtTime(8, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      // 2. Low-frequency body resonance (Sine wave)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now); // Body resonance frequency
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);

      oscGain.gain.setValueAtTime(0.3, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      // Start & Stop
      noiseNode.start(now);
      noiseNode.stop(now + 0.04);
      
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {
      console.warn('Failed to play place sound:', e);
    }
  }

  /**
   * Plays a wood sliding/scrape sound
   * Mimics multiple tiles being scooped or recalled back into the rack.
   */
  public playTileRecall() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const duration = 0.25;

      // Noise generator
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      // Sweep the filter frequency down to simulate a slide/scrape
      filter.frequency.linearRampToValueAtTime(400, now + duration);
      filter.Q.setValueAtTime(3, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.08); // Slight rise as tiles hit each other
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch (e) {
      console.warn('Failed to play recall sound:', e);
    }
  }

  /**
   * Plays a wooden shuffling effect (a sequence of 3 rapid clacks)
   */
  public playShuffle() {
    if (this.isMuted) return;
    const clacks = 3;
    for (let i = 0; i < clacks; i++) {
      setTimeout(() => {
        this.playTilePlace();
      }, i * 75);
    }
  }

  /**
   * Plays a beautiful success chime chord
   */
  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (C Major)

      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.05); // Arpeggiated entry

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + index * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.05 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.05);
        osc.stop(now + index * 0.05 + 0.6);
      });
    } catch (e) {
      console.warn('Failed to play success sound:', e);
    }
  }

  /**
   * Plays a warm, soft buzz representing a placement error or invalid word
   */
  public playError() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const duration = 0.22;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Lower pitch triangle wave for a softer warning buzz
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, now);
      // Fast vibrato
      osc.frequency.linearRampToValueAtTime(115, now + 0.08);
      osc.frequency.linearRampToValueAtTime(135, now + 0.16);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Failed to play error sound:', e);
    }
  }
}

export const soundService = new SoundService();
