// Web Audio API feedback for driver HUD (single crisp gesture tone, silent on rejection)
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
      gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec + 0.02);
    } catch {}
  }

  public playStart() {
    this.playTone(740, 0.09, 0, 'triangle', 0.2);
  }

  public playStop() {
    this.playTone(440, 0.09, 0, 'sine', 0.16);
  }

  public playAccepted() {
    // Single short tone only (no double/repetitive chime)
    this.playTone(980, 0.085, 0, 'triangle', 0.22);
  }

  public playRejected() {
    // Silent on rejection
  }
}

export const soundManager = new SoundManager();
