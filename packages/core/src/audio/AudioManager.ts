export type SfxName = 'click' | 'eat' | 'die' | 'turn' | 'start' | 'pause' | 'boost' | 'slow'

/** Bundled sample URLs per effect; effects without samples stay fully synthesised. */
export type SfxSampleUrls = Partial<Record<SfxName, string | readonly string[]>>

type OscType = 'sine' | 'square' | 'triangle' | 'sawtooth'

export interface SfxOptions {
  /** Frequency multiplier for every layer of the effect (1 = as designed). */
  pitch?: number
  /** Linear volume multiplier for this play only (1 = as designed). */
  gain?: number
}

interface ToneOptions {
  type?: OscType
  gain?: number
  delay?: number
  endFrequency?: number
  pitch?: number
}

interface NoiseOptions {
  gain?: number
  delay?: number
  frequency?: number
  q?: number
}

const NOISE_SECONDS = 0.12
/** Peak of a bundled sample is normalised to -6 dBFS, so this lands near the synth SFX. */
const SAMPLE_GAIN = 0.25

/**
 * Zero-asset sound effects generated with Web Audio. Real sound files can be
 * added later without changing the call sites.
 */
export class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private readonly sampleUrls = new Map<SfxName, readonly string[]>()
  private readonly samples = new Map<SfxName, AudioBuffer[]>()
  private samplesLoading = false
  private enabled: boolean

  constructor(enabled: boolean, sampleUrls: SfxSampleUrls = {}) {
    this.enabled = enabled
    for (const [name, urls] of Object.entries(sampleUrls) as Array<
      [SfxName, string | readonly string[]]
    >) {
      this.sampleUrls.set(name, typeof urls === 'string' ? [urls] : urls)
    }
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
    this.loadSamples()
  }

  play(name: SfxName, { pitch = 1, gain = 1 }: SfxOptions = {}): void {
    if (!this.enabled) return
    if (!this.ctx) return
    if (this.ctx.state === 'suspended') void this.ctx.resume()

    const buffers = this.samples.get(name)
    if (buffers) {
      this.playSample(buffers, pitch, gain)
      return
    }

    switch (name) {
      case 'click':
        this.tone(520, 0.05, { type: 'square', gain: 0.04 * gain })
        break
      case 'turn':
        this.tone(320, 0.03, { type: 'square', gain: 0.025 * gain })
        break
      case 'eat':
        // Filtered noise gives the bite its transient; the pop carries the score cue.
        this.noise(0.05, { gain: 0.05 * gain, frequency: 1800 * pitch, q: 1.3 })
        this.tone(520, 0.07, { type: 'triangle', gain: 0.05 * gain, endFrequency: 780, pitch })
        this.tone(1560, 0.055, { type: 'sine', gain: 0.015 * gain, delay: 0.02, pitch })
        break
      case 'die':
        this.tone(250, 0.35, { type: 'sawtooth', gain: 0.08 * gain, endFrequency: 60 })
        break
      case 'pause':
        this.tone(440, 0.08, { type: 'sine', gain: 0.04 * gain, endFrequency: 300 })
        break
      case 'start':
        this.tone(523, 0.08, { type: 'triangle', gain: 0.05 * gain, delay: 0 })
        this.tone(659, 0.08, { type: 'triangle', gain: 0.05 * gain, delay: 0.08 })
        this.tone(784, 0.12, { type: 'triangle', gain: 0.05 * gain, delay: 0.16 })
        break
      case 'boost':
        this.tone(620, 0.08, { type: 'square', gain: 0.045 * gain, endFrequency: 940 })
        this.tone(940, 0.14, { type: 'triangle', gain: 0.05 * gain, delay: 0.07 })
        break
      case 'slow':
        this.tone(430, 0.2, { type: 'sine', gain: 0.05 * gain, endFrequency: 190 })
        break
    }
  }

  /** Fetches and decodes bundled samples once the audio context exists. */
  private loadSamples(): void {
    const ctx = this.ctx
    if (!ctx || this.samplesLoading) return
    this.samplesLoading = true
    for (const [name, urls] of this.sampleUrls) {
      for (const url of urls) {
        void fetch(url)
          .then((response) => response.arrayBuffer())
          .then((data) => ctx.decodeAudioData(data))
          .then((buffer) => {
            const buffers = this.samples.get(name) ?? []
            buffers.push(buffer)
            this.samples.set(name, buffers)
          })
          .catch(() => undefined)
      }
    }
  }

  private playSample(buffers: readonly AudioBuffer[], pitch: number, gainMultiplier: number): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = buffers[Math.floor(Math.random() * buffers.length)]
    source.playbackRate.value = pitch
    gain.gain.value = SAMPLE_GAIN * gainMultiplier
    source.connect(gain)
    gain.connect(master)
    source.start()
  }

  private tone(
    frequency: number,
    duration: number,
    { type = 'sine', gain = 0.05, delay = 0, endFrequency, pitch = 1 }: ToneOptions,
  ): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    const start = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const envelope = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency * pitch, start)
    if (endFrequency !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, endFrequency * pitch),
        start + duration,
      )
    }

    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    osc.connect(envelope)
    envelope.connect(master)
    osc.start(start)
    osc.stop(start + duration + 0.02)
  }

  /** Band-passed noise burst: the "bite" texture oscillators cannot produce. */
  private noise(
    duration: number,
    { gain = 0.05, delay = 0, frequency = 1800, q = 1.1 }: NoiseOptions,
  ): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    const start = ctx.currentTime + delay
    const source = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const envelope = ctx.createGain()

    source.buffer = this.getNoiseBuffer(ctx)
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(frequency, start)
    filter.Q.value = q

    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.004)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    source.connect(filter)
    filter.connect(envelope)
    envelope.connect(master)
    source.start(start)
    source.stop(start + duration + 0.02)
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const frames = Math.ceil(ctx.sampleRate * NOISE_SECONDS)
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let index = 0; index < frames; index += 1) {
        data[index] = Math.random() * 2 - 1
      }
      this.noiseBuffer = buffer
    }
    return this.noiseBuffer
  }
}
