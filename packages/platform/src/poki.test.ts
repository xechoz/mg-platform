import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { PokiAdChannel, PokiPlatform, PokiRuntime } from './poki'

interface FakeSdk {
  init: Mock<() => Promise<void>>
  gameLoadingFinished: Mock<() => void>
  gameplayStart: Mock<() => void>
  gameplayStop: Mock<() => void>
  commercialBreak: Mock<(onStart?: () => void) => Promise<void>>
  rewardedBreak: Mock<(onStart?: () => void) => Promise<boolean>>
  happyTime: Mock<() => void>
  getLanguage: Mock<() => string>
}

function fakeSdk(): FakeSdk {
  return {
    init: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    gameLoadingFinished: vi.fn<() => void>(),
    gameplayStart: vi.fn<() => void>(),
    gameplayStop: vi.fn<() => void>(),
    commercialBreak: vi.fn<(onStart?: () => void) => Promise<void>>().mockResolvedValue(undefined),
    rewardedBreak: vi.fn<(onStart?: () => void) => Promise<boolean>>().mockResolvedValue(true),
    happyTime: vi.fn<() => void>(),
    getLanguage: vi.fn<() => string>().mockReturnValue('en'),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PokiRuntime', () => {
  it('initializes the SDK and exposes rewarded availability', async () => {
    const sdk = fakeSdk()
    const runtime = new PokiRuntime(() => sdk)

    expect(runtime.rewardedAvailable).toBe(false)
    await runtime.init()
    await runtime.init()

    expect(sdk.init).toHaveBeenCalledTimes(1)
    expect(runtime.rewardedAvailable).toBe(true)
  })

  it('stays usable when the SDK is missing', async () => {
    const runtime = new PokiRuntime(() => undefined)

    await runtime.init()
    runtime.gameplayStart()
    runtime.loadingFinished()

    expect(runtime.rewardedAvailable).toBe(false)
    await expect(runtime.rewardedBreak()).resolves.toBe(false)
  })

  it('stays usable when init fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sdk = fakeSdk()
    sdk.init.mockRejectedValue(new Error('blocked'))
    sdk.getLanguage.mockReturnValue('fr-FR')
    const runtime = new PokiRuntime(() => sdk)

    await runtime.init()

    expect(runtime.rewardedAvailable).toBe(false)
    expect(runtime.lang()).toBe('fr')
  })

  it('reads the host language before init and normalizes it', () => {
    const sdk = fakeSdk()
    const runtime = new PokiRuntime(() => sdk)

    sdk.getLanguage.mockReturnValue('en-US')
    expect(runtime.lang()).toBe('en')
    sdk.getLanguage.mockReturnValue('zh-CN')
    expect(runtime.lang()).toBe('zh')
    sdk.getLanguage.mockReturnValue('pt-BR')
    expect(runtime.lang()).toBe('pt')
    sdk.getLanguage.mockReturnValue('sv-SE')
    expect(runtime.lang()).toBeNull()
    sdk.getLanguage.mockReturnValue('')
    expect(runtime.lang()).toBeNull()
  })

  it('does not fire duplicate gameplay events', async () => {
    const sdk = fakeSdk()
    const runtime = new PokiRuntime(() => sdk)
    await runtime.init()

    runtime.gameplayStart()
    runtime.gameplayStart()
    expect(sdk.gameplayStart).toHaveBeenCalledTimes(1)

    runtime.gameplayStop()
    runtime.gameplayStop()
    expect(sdk.gameplayStop).toHaveBeenCalledTimes(1)
  })

  it('fires loading and happy-time events once', async () => {
    const sdk = fakeSdk()
    const runtime = new PokiRuntime(() => sdk)
    await runtime.init()

    runtime.loadingFinished()
    runtime.loadingFinished()
    runtime.happyTime()

    expect(sdk.gameLoadingFinished).toHaveBeenCalledTimes(1)
    expect(sdk.happyTime).toHaveBeenCalledTimes(1)
  })

  it('passes the ad start callback to the SDK exactly once', async () => {
    const sdk = fakeSdk()
    sdk.rewardedBreak.mockImplementation((onStart) => {
      onStart?.()
      return Promise.resolve(true)
    })
    sdk.commercialBreak.mockImplementation((onStart) => {
      onStart?.()
      return Promise.resolve()
    })
    const runtime = new PokiRuntime(() => sdk)
    await runtime.init()
    const onStart = vi.fn<() => void>()

    await runtime.rewardedBreak(onStart)
    await runtime.interstitialBreak(onStart)

    expect(onStart).toHaveBeenCalledTimes(2)
  })

  it('blocks host events while an ad is active', async () => {
    const sdk = fakeSdk()
    let resolveAd!: (value: boolean) => void
    sdk.rewardedBreak.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveAd = resolve
        }),
    )
    const runtime = new PokiRuntime(() => sdk)
    await runtime.init()
    runtime.gameplayStart()

    const ad = runtime.rewardedBreak()
    runtime.gameplayStart()
    runtime.gameplayStop()
    runtime.happyTime()

    expect(sdk.gameplayStart).toHaveBeenCalledTimes(1)
    expect(sdk.gameplayStop).not.toHaveBeenCalled()
    expect(sdk.happyTime).not.toHaveBeenCalled()

    resolveAd(true)
    await expect(ad).resolves.toBe(true)

    runtime.gameplayStop()
    expect(sdk.gameplayStop).toHaveBeenCalledTimes(1)
  })

  it('blocks host events while an interstitial is active', async () => {
    const sdk = fakeSdk()
    let resolveAd!: () => void
    sdk.commercialBreak.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAd = resolve
        }),
    )
    const runtime = new PokiRuntime(() => sdk)
    await runtime.init()
    runtime.gameplayStart()

    const ad = runtime.interstitialBreak()
    runtime.gameplayStart()
    runtime.gameplayStop()
    runtime.happyTime()

    expect(sdk.gameplayStart).toHaveBeenCalledTimes(1)
    expect(sdk.gameplayStop).not.toHaveBeenCalled()
    expect(sdk.happyTime).not.toHaveBeenCalled()

    resolveAd()
    await ad

    runtime.gameplayStop()
    expect(sdk.gameplayStop).toHaveBeenCalledTimes(1)
  })

  it('returns false when the rewarded ad throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sdk = fakeSdk()
    sdk.rewardedBreak.mockRejectedValue(new Error('no fill'))
    const runtime = new PokiRuntime(() => sdk)
    await runtime.init()

    await expect(runtime.rewardedBreak()).resolves.toBe(false)
  })

  it('delegates the host and channel wrappers to the shared runtime', async () => {
    const sdk = fakeSdk()
    const runtime = new PokiRuntime(() => sdk)
    const platform = new PokiPlatform(runtime)
    const channel = new PokiAdChannel(runtime)

    await platform.init()
    platform.gameplayStart()

    expect(channel.rewardedAvailable).toBe(true)
    expect(sdk.gameplayStart).toHaveBeenCalledTimes(1)
    await expect(channel.rewardedBreak('revive')).resolves.toBe(true)
  })
})
