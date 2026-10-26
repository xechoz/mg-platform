import type { AdChannel } from '@mg/platform'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { AdService } from './AdService'

type VoidSpy = Mock<() => void>

function fakeChannel(overrides: Partial<AdChannel> = {}): AdChannel {
  const base = {
    name: 'test',
    rewardedAvailable: true,
    init: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    rewardedBreak: vi
      .fn<(placement: string, onStart?: () => void) => Promise<boolean>>()
      .mockResolvedValue(true),
  } satisfies AdChannel
  return { ...base, ...overrides }
}

function fakeAudio(): { suspend: VoidSpy; resume: VoidSpy } {
  return { suspend: vi.fn<() => void>(), resume: vi.fn<() => void>() }
}

function fakePlatform(): { gameplayStop: VoidSpy } {
  return { gameplayStop: vi.fn<() => void>() }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AdService', () => {
  it('maps a completed ad to rewarded and records stats', async () => {
    const ads = new AdService(fakeChannel(), fakePlatform(), fakeAudio())

    await expect(ads.showRewarded('revive')).resolves.toBe('rewarded')
    expect(ads.stats().revive).toEqual({ shown: 1, rewarded: 1, skipped: 0, failed: 0 })
  })

  it('forwards the placement name to the channel', async () => {
    const channel = fakeChannel()
    const ads = new AdService(channel, fakePlatform(), fakeAudio())

    await ads.showRewarded('revive')

    expect(channel.rewardedBreak).toHaveBeenCalledWith('revive')
  })

  it('maps a skipped ad to skipped', async () => {
    const channel = fakeChannel({ rewardedBreak: () => Promise.resolve(false) })
    const ads = new AdService(channel, fakePlatform(), fakeAudio())

    await expect(ads.showRewarded('revive')).resolves.toBe('skipped')
    expect(ads.stats().revive).toEqual({ shown: 1, rewarded: 0, skipped: 1, failed: 0 })
  })

  it('maps a channel error to failed without throwing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const channel = fakeChannel({ rewardedBreak: () => Promise.reject(new Error('no fill')) })
    const ads = new AdService(channel, fakePlatform(), fakeAudio())

    await expect(ads.showRewarded('revive')).resolves.toBe('failed')
    expect(ads.stats().revive).toEqual({ shown: 1, rewarded: 0, skipped: 0, failed: 1 })
  })

  it('runs one ad at a time', async () => {
    let resolveAd!: (value: boolean) => void
    const channel = fakeChannel({
      rewardedBreak: vi.fn<(placement: string, onStart?: () => void) => Promise<boolean>>(
        () =>
          new Promise<boolean>((resolve) => {
            resolveAd = resolve
          }),
      ),
    })
    const ads = new AdService(channel, fakePlatform(), fakeAudio())

    const first = ads.showRewarded('revive')
    const second = await ads.showRewarded('revive')
    expect(second).toBe('failed')
    expect(channel.rewardedBreak).toHaveBeenCalledTimes(1)

    resolveAd(true)
    await expect(first).resolves.toBe('rewarded')
    expect(ads.stats().revive).toEqual({ shown: 1, rewarded: 1, skipped: 0, failed: 0 })
  })

  it('stops gameplay, mutes audio and reports active state', async () => {
    const audio = fakeAudio()
    const platform = fakePlatform()
    const ads = new AdService(fakeChannel(), platform, audio)
    const states: boolean[] = []
    ads.onChange((active) => states.push(active))

    await ads.showRewarded('revive')

    expect(platform.gameplayStop).toHaveBeenCalledTimes(1)
    expect(audio.suspend).toHaveBeenCalledTimes(1)
    expect(audio.resume).toHaveBeenCalledTimes(1)
    expect(states).toEqual([true, false])
    expect(ads.active).toBe(false)
  })

  it('does nothing when the channel is unavailable', async () => {
    const channel = fakeChannel({ rewardedAvailable: false })
    const ads = new AdService(channel, fakePlatform(), fakeAudio())

    await expect(ads.showRewarded('revive')).resolves.toBe('failed')
    expect(channel.rewardedBreak).not.toHaveBeenCalled()
    expect(ads.stats().revive).toBeUndefined()
  })

  it('does not impose an internal cooldown', async () => {
    const channel = fakeChannel()
    const ads = new AdService(channel, fakePlatform(), fakeAudio())

    await ads.showRewarded('revive')
    await ads.showRewarded('revive')

    expect(channel.rewardedBreak).toHaveBeenCalledTimes(2)
    expect(ads.stats().revive).toEqual({ shown: 2, rewarded: 2, skipped: 0, failed: 0 })
  })

  it('shows an interstitial and restores gameplay/audio state', async () => {
    const audio = fakeAudio()
    const platform = fakePlatform()
    const interstitialBreak = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const channel = fakeChannel({ interstitialBreak })
    const ads = new AdService(channel, platform, audio)
    const states: boolean[] = []
    ads.onChange((active) => states.push(active))

    await ads.showInterstitial()

    expect(interstitialBreak).toHaveBeenCalledTimes(1)
    expect(platform.gameplayStop).toHaveBeenCalledTimes(1)
    expect(audio.suspend).toHaveBeenCalledTimes(1)
    expect(audio.resume).toHaveBeenCalledTimes(1)
    expect(states).toEqual([true, false])
    expect(ads.active).toBe(false)
  })

  it('does nothing when the channel has no interstitial', async () => {
    const audio = fakeAudio()
    const platform = fakePlatform()
    const ads = new AdService(fakeChannel(), platform, audio)

    await ads.showInterstitial()

    expect(platform.gameplayStop).not.toHaveBeenCalled()
    expect(audio.suspend).not.toHaveBeenCalled()
    expect(audio.resume).not.toHaveBeenCalled()
    expect(ads.active).toBe(false)
  })

  it('swallows interstitial errors and restores state', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const audio = fakeAudio()
    const platform = fakePlatform()
    const ads = new AdService(
      fakeChannel({ interstitialBreak: () => Promise.reject(new Error('no fill')) }),
      platform,
      audio,
    )

    await expect(ads.showInterstitial()).resolves.toBeUndefined()
    expect(audio.resume).toHaveBeenCalledTimes(1)
    expect(ads.active).toBe(false)
  })

  it('runs one interstitial at a time', async () => {
    let resolveAd!: () => void
    const interstitialBreak = vi.fn<() => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          resolveAd = resolve
        }),
    )
    const ads = new AdService(fakeChannel({ interstitialBreak }), fakePlatform(), fakeAudio())

    const first = ads.showInterstitial()
    await ads.showInterstitial()
    expect(interstitialBreak).toHaveBeenCalledTimes(1)
    expect(ads.active).toBe(true)

    resolveAd()
    await first
    expect(ads.active).toBe(false)
  })

  it('delegates channel init', async () => {
    const channel = fakeChannel()
    const ads = new AdService(channel, fakePlatform(), fakeAudio())

    await ads.init()

    expect(channel.init).toHaveBeenCalledTimes(1)
  })
})
