import { peakAmplitude, peakNormalizationGain } from './normalize'

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
const MASTER_GAIN = 1
/** Soft limiter: effects below this magnitude pass unchanged. */
const SOFT_CLIP_KNEE = 0.9
/** Hard ceiling after the soft knee; stays below 0 dBFS so stacked effects never clip. */
const SOFT_CLIP_CEILING = 0.95

/**
 * WaveShaper curve: identity below the knee, then a smooth tanh shoulder that
 * saturates to the ceiling. A DynamicsCompressorNode was tried first, but its
 * fixed makeup gain swallowed 8-12 dB from short synth transients; this curve
 * leaves normal effects untouched and only rounds off stacked peaks.
 */
function softClipCurve(): Float32Array<ArrayBuffer> {
  const size = 4096
  const curve = new Float32Array(size)
  const span = SOFT_CLIP_CEILING - SOFT_CLIP_KNEE
  for (let index = 0; index < size; index += 1) {
    const input = (index / (size - 1)) * 2 - 1
    const magnitude = Math.abs(input)
    const shaped =
      magnitude <= SOFT_CLIP_KNEE
        ? magnitude
        : SOFT_CLIP_KNEE + span * Math.tanh((magnitude - SOFT_CLIP_KNEE) / span)
    curve[index] = Math.sign(input) * shaped
  }
  return curve
}

/**
 * Peak level per effect, in linear gain, tuned for phone speakers: peaks sit
 * between -9 and -1 dBFS instead of the previous -32…-18 dBFS. Mobile hardware
 * rolls off below ~500 Hz, so the synth voices keep their fundamentals and
 * harmonics above that range rather than relying on low sine tones.
 */
const SFX_LEVELS: Record<SfxName, number> = {
  click: 0.35,
  turn: 0.4,
  eat: 0.9,
  die: 0.9,
  pause: 0.45,
  start: 0.55,
  boost: 0.6,
  slow: 0.6,
}

interface AudioSample {
  buffer: AudioBuffer
  gain: number
}

/**
 * Zero-asset sound effects generated with Web Audio. Real sound files can be
 * added later without changing the call sites.
 */
export class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private readonly sampleUrls = new Map<SfxName, readonly string[]>()
  private readonly samples = new Map<SfxName, AudioSample[]>()
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
      this.master.gain.setTargetAtTime(enabled ? MASTER_GAIN : 0, this.ctx.currentTime, 0.02)
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
    this.master.gain.setTargetAtTime(this.enabled ? MASTER_GAIN : 0, this.ctx.currentTime, 0.02)
  }

  /** Must be called from a user gesture at least once (iOS/Safari). */
  unlock(): void {
    if (!this.enabled) return
    if (!this.ctx) {
      const Ctor = window.AudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = MASTER_GAIN
      const limiter = this.ctx.createWaveShaper()
      limiter.curve = softClipCurve()
      limiter.oversample = '2x'
      this.master.connect(limiter)
      limiter.connect(this.ctx.destination)
    }
    if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') void this.ctx.resume()
    this.loadSamples()
  }

  play(name: SfxName, { pitch = 1, gain = 1 }: SfxOptions = {}): void {
    if (!this.enabled) return
    if (!this.ctx) return
    if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') void this.ctx.resume()

    const buffers = this.samples.get(name)
    if (buffers) {
      this.playSample(buffers, pitch, gain)
      return
    }

    const level = SFX_LEVELS[name] * gain
    switch (name) {
      case 'click':
        this.tone(1100, 0.05, { type: 'square', gain: level })
        break
      case 'turn':
        this.tone(880, 0.04, { type: 'triangle', gain: level })
        break
      case 'eat':
        // Filtered noise gives the bite its transient; the pop carries the score cue.
        // Every layer sits in the phone speaker's usable band (>= 760 Hz).
        this.noise(0.05, { gain: level * 0.45, frequency: 2600 * pitch, q: 1.2 })
        this.tone(760, 0.07, { type: 'triangle', gain: level * 0.6, endFrequency: 1050, pitch })
        this.tone(1520, 0.055, { type: 'sine', gain: level * 0.25, delay: 0.02, pitch })
        break
      case 'die':
        // Keep the falling body for headphones, plus an octave and a noise burst
        // so the death cue survives a phone speaker that cannot reproduce 60 Hz.
        this.tone(250, 0.35, { type: 'sawtooth', gain: level * 0.7, endFrequency: 60 })
        this.tone(500, 0.35, { type: 'sawtooth', gain: level * 0.35, endFrequency: 120 })
        this.noise(0.08, { gain: level * 0.3, frequency: 1200, q: 0.9 })
        break
      case 'pause':
        this.tone(660, 0.08, { type: 'sine', gain: level, endFrequency: 440 })
        break
      case 'start':
        this.tone(659, 0.08, { type: 'triangle', gain: level })
        this.tone(784, 0.08, { type: 'triangle', gain: level, delay: 0.08 })
        this.tone(988, 0.12, { type: 'triangle', gain: level, delay: 0.16 })
        break
      case 'boost':
        this.tone(880, 0.08, { type: 'square', gain: level * 0.6, endFrequency: 1320 })
        this.tone(1320, 0.14, { type: 'triangle', gain: level * 0.5, delay: 0.07 })
        break
      case 'slow':
        this.tone(660, 0.2, { type: 'triangle', gain: level * 0.7, endFrequency: 330 })
        this.tone(220, 0.2, { type: 'sine', gain: level * 0.35, endFrequency: 150 })
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
            const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
              buffer.getChannelData(index),
            )
            const sample: AudioSample = {
              buffer,
              gain: peakNormalizationGain(peakAmplitude(channels)),
            }
            const samples = this.samples.get(name) ?? []
            samples.push(sample)
            this.samples.set(name, samples)
          })
          .catch(() => undefined)
      }
    }
  }

  private playSample(samples: readonly AudioSample[], pitch: number, gainMultiplier: number): void {
    const ctx = this.ctx
    const master = this.master
    const sample = samples[Math.floor(Math.random() * samples.length)]
    if (!ctx || !master || !sample) return

    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = sample.buffer
    source.playbackRate.value = pitch
    gain.gain.value = sample.gain * gainMultiplier
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
