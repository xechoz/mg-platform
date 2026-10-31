import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioManager } from './AudioManager'

class FakeGainNode {
  readonly gain = {
    value: 1,
    setTargetAtTime: vi.fn(),
  }
  readonly connect = vi.fn()
}

class FakeSource {
  buffer: unknown = null
  readonly playbackRate = { value: 1 }
  readonly connect = vi.fn()
  readonly start = vi.fn()
  readonly stop = vi.fn()
}

class FakeAudioContext {
  static current: FakeAudioContext | null = null

  readonly currentTime = 0
  readonly state = 'running'
  readonly destination = {}
  readonly gainNode = new FakeGainNode()
  readonly sources: FakeSource[] = []
  readonly createGain = vi.fn(() => this.gainNode)
  readonly createWaveShaper = vi.fn(() => ({
    curve: null,
    oversample: 'none',
    connect: vi.fn(),
  }))
  readonly createOscillator = vi.fn()
  readonly createBufferSource = vi.fn(() => {
    const source = new FakeSource()
    this.sources.push(source)
    return source
  })
  readonly decodeAudioData = vi.fn(async () => ({
    numberOfChannels: 1,
    getChannelData: () => new Float32Array([0.5, -0.5, 0.25, -0.25]),
  }))
  readonly resume = vi.fn()

  constructor() {
    FakeAudioContext.current = this
  }
}

function installAudioContext(): void {
  FakeAudioContext.current = null
  vi.stubGlobal('window', { AudioContext: FakeAudioContext })
}

function currentContext(): FakeAudioContext {
  if (!FakeAudioContext.current) throw new Error('audio context was not created')
  return FakeAudioContext.current
}

function targetGain(context: FakeAudioContext): number | undefined {
  return context.gainNode.gain.setTargetAtTime.mock.lastCall?.[0]
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AudioManager host mute', () => {
  it('creates the audio context already muted when the host asks', () => {
    installAudioContext()
    const audio = new AudioManager(true)

    audio.setHostMuted(true)
    audio.unlock()

    expect(currentContext().gainNode.gain.value).toBe(0)
    expect(audio.hostMuted).toBe(true)
    expect(audio.soundEnabled).toBe(true)
  })

  it('keeps host mute above the player preference', () => {
    installAudioContext()
    const audio = new AudioManager(true)
    audio.unlock()
    const context = currentContext()

    audio.setEnabled(false)
    expect(targetGain(context)).toBe(0)

    audio.setEnabled(true)
    expect(targetGain(context)).toBe(1)

    audio.setHostMuted(true)
    expect(targetGain(context)).toBe(0)

    audio.setEnabled(false)
    audio.setHostMuted(false)
    expect(targetGain(context)).toBe(0)
    expect(audio.soundEnabled).toBe(false)
  })

  it('does not unmute during a suspended ad just because the host unmutes', () => {
    installAudioContext()
    const audio = new AudioManager(true)
    audio.unlock()
    const context = currentContext()

    audio.suspend()
    expect(targetGain(context)).toBe(0)

    audio.setHostMuted(true)
    audio.setHostMuted(false)
    expect(targetGain(context)).toBe(0)

    audio.resume()
    expect(targetGain(context)).toBe(1)
  })

  it('does not create an audio context when the player disabled sound', () => {
    installAudioContext()
    const audio = new AudioManager(false)

    audio.unlock()

    expect(FakeAudioContext.current).toBeNull()
  })

  it('skips synthesis while the host is muted', () => {
    installAudioContext()
    const audio = new AudioManager(true)
    audio.unlock()
    const context = currentContext()

    audio.setHostMuted(true)
    audio.play('click')

    expect(context.createOscillator).not.toHaveBeenCalled()
  })
})

describe('custom sounds', () => {
  it('plays a game-specific sample registered by name', async () => {
    installAudioContext()
    const fetchMock = vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(16) }))
    vi.stubGlobal('fetch', fetchMock)
    const audio = new AudioManager(true, { fishSplash: '/fish-splash.wav' })
    audio.unlock()
    const context = currentContext()

    await vi.waitFor(() => {
      audio.play('fishSplash')
      expect(context.sources.length).toBe(1)
    })
    expect(fetchMock).toHaveBeenCalledWith('/fish-splash.wav')
    expect(context.sources[0]?.start).toHaveBeenCalled()
  })

  it('ignores an unregistered custom sound without synthesising it', () => {
    installAudioContext()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const audio = new AudioManager(true)
    audio.unlock()
    const context = currentContext()

    expect(() => audio.play('notRegistered')).not.toThrow()
    expect(context.createOscillator).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
