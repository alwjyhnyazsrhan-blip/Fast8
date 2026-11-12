// Web Audio API feedback for driver HUD - 100% Muted / Silent by user request
class SoundManager {
  // All audio playback methods are permanently muted / no-op
  public playStart() {
    // Silent mode - no sound
  }

  public playStop() {
    // Silent mode - no sound
  }

  public playAccepted() {
    // Silent mode - no sound
  }

  public playRejected() {
    // Silent mode - no sound
  }
}

export const soundManager = new SoundManager();
