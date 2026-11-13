// Web Audio API feedback for driver HUD
class SoundManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(freq: number, durationSec: number, delaySec = 0, type: OscillatorType = 'sine', gainVal = 0.2) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime + delaySec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec + 0.02);
    } catch {}
  }

  public playStart() {
    this.playTone(587.33, 0.12, 0, 'triangle', 0.22);
    this.playTone(880, 0.16, 0.11, 'triangle', 0.24);
  }

  public playStop() {
    this.playTone(523.25, 0.12, 0, 'sine', 0.18);
    this.playTone(349.23, 0.18, 0.11, 'sine', 0.16);
  }

  public playAccepted() {
    this.playTone(880, 0.11, 0, 'triangle', 0.25);
    this.playTone(1174.66, 0.18, 0.1, 'triangle', 0.28);
  }

  public playRejected() {
    this.playTone(300, 0.12, 0, 'sawtooth', 0.1);
    this.playTone(220, 0.15, 0.1, 'sawtooth', 0.09);
  }
}

export const soundManager = new SoundManager();
