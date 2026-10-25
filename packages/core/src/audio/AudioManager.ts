export type SfxName = 'click' | 'eat' | 'die' | 'turn' | 'start' | 'pause'

type OscType = 'sine' | 'square' | 'triangle' | 'sawtooth'

interface ToneOptions {
  type?: OscType
  gain?: number
  delay?: number
  endFrequency?: number
}

/**
 * Zero-asset sound effects generated with Web Audio. Real sound files can be
 * added later without changing the call sites.
 */
export class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private enabled: boolean

  constructor(enabled: boolean) {
    this.enabled = enabled
  }

  /** The player's saved sound preference, unaffected by temporary ad muting. */
  get soundEnabled(): boolean {
    return this.enabled
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(enabled ? 0.9 : 0, this.ctx.currentTime, 0.02)
    }
  }

  /** Mutes without touching the player's sound preference (ads, focus loss). */
  suspend(): void {
    if (!this.master || !this.ctx) return
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02)
  }

  /** Restores the master gain according to the saved sound preference. */
  resume(): void {
    if (!this.master || !this.ctx) return
    this.master.gain.setTargetAtTime(this.enabled ? 0.9 : 0, this.ctx.currentTime, 0.02)
  }

  /** Must be called from a user gesture at least once (iOS/Safari). */
  unlock(): void {
    if (!this.enabled) return
    if (!this.ctx) {
      const Ctor = window.AudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.9
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  play(name: SfxName): void {
    if (!this.enabled) return
    if (!this.ctx) return
    if (this.ctx.state === 'suspended') void this.ctx.resume()

    switch (name) {
      case 'click':
        this.tone(520, 0.05, { type: 'square', gain: 0.04 })
        break
      case 'turn':
        this.tone(320, 0.03, { type: 'square', gain: 0.025 })
        break
      case 'eat':
        this.tone(660, 0.09, { type: 'sine', gain: 0.07, endFrequency: 990 })
        break
      case 'die':
        this.tone(250, 0.35, { type: 'sawtooth', gain: 0.08, endFrequency: 60 })
        break
      case 'pause':
        this.tone(440, 0.08, { type: 'sine', gain: 0.04, endFrequency: 300 })
        break
      case 'start':
        this.tone(523, 0.08, { type: 'triangle', gain: 0.05, delay: 0 })
        this.tone(659, 0.08, { type: 'triangle', gain: 0.05, delay: 0.08 })
        this.tone(784, 0.12, { type: 'triangle', gain: 0.05, delay: 0.16 })
        break
    }
  }

  private tone(
    frequency: number,
    duration: number,
    { type = 'sine', gain = 0.05, delay = 0, endFrequency }: ToneOptions,
  ): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    const start = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const envelope = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, start)
    if (endFrequency !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration)
    }

    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    osc.connect(envelope)
    envelope.connect(master)
    osc.start(start)
    osc.stop(start + duration + 0.02)
  }
}
