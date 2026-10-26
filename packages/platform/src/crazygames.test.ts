import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import {
  type CrazyGamesAdCallbacks,
  type CrazyGamesAdType,
  CrazyGamesRuntime,
  type CrazyGamesSettings,
} from './crazygames'

interface FakeSdk {
  init: Mock<() => Promise<void>>
  game: {
    loadingStart: Mock<() => void>
    loadingStop: Mock<() => void>
    gameplayStart: Mock<() => void>
    gameplayStop: Mock<() => void>
    happytime: Mock<() => void>
    settings: CrazyGamesSettings
    addSettingsChangeListener: Mock<(listener: (settings: CrazyGamesSettings) => void) => void>
    removeSettingsChangeListener: Mock<(listener: (settings: CrazyGamesSettings) => void) => void>
  }
  ad?: {
    requestAd: Mock<(type: CrazyGamesAdType, callbacks: CrazyGamesAdCallbacks) => void>
    hasAdblock?: Mock<() => boolean | Promise<boolean>>
  }
  user?: {
    systemInfo?: {
      locale?: string
    }
  }
}

function fakeSdk(): FakeSdk {
  return {
    init: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    game: {
      loadingStart: vi.fn<() => void>(),
      loadingStop: vi.fn<() => void>(),
      gameplayStart: vi.fn<() => void>(),
      gameplayStop: vi.fn<() => void>(),
      happytime: vi.fn<() => void>(),
      settings: { muteAudio: false },
      addSettingsChangeListener: vi.fn(),
      removeSettingsChangeListener: vi.fn(),
    },
    ad: {
      requestAd: vi.fn(),
    },
  }
}

function adOf(sdk: FakeSdk): NonNullable<FakeSdk['ad']> {
  if (!sdk.ad) throw new Error('fake SDK has no ad module')
  return sdk.ad
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CrazyGamesRuntime', () => {
  it('initializes once and reports the loading window', async () => {
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)

    await runtime.init()
    await runtime.init()

    expect(sdk.init).toHaveBeenCalledTimes(1)
    expect(sdk.game.loadingStart).toHaveBeenCalledTimes(1)
  })

  it('stays usable when the SDK is missing', async () => {
    const runtime = new CrazyGamesRuntime(() => undefined)

    await runtime.init()
    runtime.gameplayStart()
    runtime.loadingFinished()
    runtime.happyTime()

    expect(runtime.lang()).toBeNull()
    expect(runtime.rewardedAvailable).toBe(false)
  })

  it('stays usable when init fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sdk = fakeSdk()
    sdk.init.mockRejectedValue(new Error('blocked'))
    const runtime = new CrazyGamesRuntime(() => sdk)

    await runtime.init()
    runtime.gameplayStart()
    runtime.loadingFinished()

    expect(sdk.game.loadingStart).not.toHaveBeenCalled()
    expect(sdk.game.gameplayStart).not.toHaveBeenCalled()
    expect(sdk.game.loadingStop).not.toHaveBeenCalled()
    expect(runtime.rewardedAvailable).toBe(false)
  })

  it('normalizes the host locale', () => {
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)

    sdk.user = { systemInfo: { locale: 'en-US' } }
    expect(runtime.lang()).toBe('en')
    sdk.user = { systemInfo: { locale: 'zh-CN' } }
    expect(runtime.lang()).toBe('zh')
    sdk.user = { systemInfo: { locale: 'pt-BR' } }
    expect(runtime.lang()).toBe('pt')
    sdk.user = { systemInfo: { locale: 'sv-SE' } }
    expect(runtime.lang()).toBeNull()
    sdk.user = { systemInfo: { locale: '' } }
    expect(runtime.lang()).toBeNull()
  })

  it('does not fire duplicate gameplay events', async () => {
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)
    await runtime.init()

    runtime.gameplayStart()
    runtime.gameplayStart()
    expect(sdk.game.gameplayStart).toHaveBeenCalledTimes(1)

    runtime.gameplayStop()
    runtime.gameplayStop()
    expect(sdk.game.gameplayStop).toHaveBeenCalledTimes(1)
  })

  it('fires loading stop and happy time at the platform boundary', async () => {
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)
    await runtime.init()

    runtime.loadingFinished()
    runtime.loadingFinished()
    runtime.happyTime()

    expect(sdk.game.loadingStop).toHaveBeenCalledTimes(1)
    expect(sdk.game.happytime).toHaveBeenCalledTimes(1)
  })

  it('applies the host mute setting and follows changes', async () => {
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)
    sdk.game.settings.muteAudio = true

    await runtime.init()

    expect(runtime.hostMuted()).toBe(true)
    const listener = vi.fn<(muted: boolean) => void>()
    const unsubscribe = runtime.onHostMutedChange(listener)
    expect(listener).toHaveBeenCalledWith(true)

    const settingsListener = sdk.game.addSettingsChangeListener.mock.calls[0]?.[0]
    settingsListener?.({ muteAudio: false })
    expect(runtime.hostMuted()).toBe(false)
    expect(listener).toHaveBeenLastCalledWith(false)

    unsubscribe()
    settingsListener?.({ muteAudio: true })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('reports rewarded ads as available only after SDK init', async () => {
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)

    expect(runtime.rewardedAvailable).toBe(false)
    await runtime.init()
    expect(runtime.rewardedAvailable).toBe(true)
  })

  it('resolves rewarded ads only after adFinished', async () => {
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)
    await runtime.init()
    const ad = adOf(sdk)
    ad.requestAd.mockImplementation((_type, callbacks) => {
      callbacks.adStarted?.()
      callbacks.adFinished?.()
    })
    const onStart = vi.fn()

    await expect(runtime.rewardedBreak(onStart)).resolves.toBe(true)
    expect(ad.requestAd).toHaveBeenCalledWith('rewarded', expect.any(Object))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('does not reward ad errors and keeps the channel available for transient failures', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)
    await runtime.init()
    const ad = adOf(sdk)
    ad.requestAd.mockImplementation((_type, callbacks) => {
      callbacks.adError?.('unfilled')
    })

    await expect(runtime.rewardedBreak()).resolves.toBe(false)
    expect(runtime.rewardedAvailable).toBe(true)
  })

  it('disables the channel after an adblock error', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)
    await runtime.init()
    const ad = adOf(sdk)
    ad.requestAd.mockImplementation((_type, callbacks) => {
      callbacks.adError?.('adblock')
    })

    await expect(runtime.rewardedBreak()).resolves.toBe(false)
    expect(runtime.rewardedAvailable).toBe(false)
  })

  it('disables the channel after adsDisabled', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)
    await runtime.init()
    const ad = adOf(sdk)
    ad.requestAd.mockImplementation((_type, callbacks) => {
      callbacks.adError?.('adsDisabled')
    })

    await expect(runtime.rewardedBreak()).resolves.toBe(false)
    expect(runtime.rewardedAvailable).toBe(false)
  })

  it('detects an ad blocker before offering a reward', async () => {
    const sdk = fakeSdk()
    const ad = adOf(sdk)
    ad.hasAdblock = vi.fn<() => boolean | Promise<boolean>>().mockResolvedValue(true)
    const runtime = new CrazyGamesRuntime(() => sdk)

    await runtime.init()

    expect(runtime.rewardedAvailable).toBe(false)
    await expect(runtime.rewardedBreak()).resolves.toBe(false)
    expect(ad.requestAd).not.toHaveBeenCalled()
  })

  it('resolves midgame ads on finish without a reward', async () => {
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)
    await runtime.init()
    const ad = adOf(sdk)
    ad.requestAd.mockImplementation((_type, callbacks) => {
      callbacks.adStarted?.()
      callbacks.adFinished?.()
    })
    const onStart = vi.fn()

    await expect(runtime.midgameBreak(onStart)).resolves.toBeUndefined()
    expect(ad.requestAd).toHaveBeenCalledWith('midgame', expect.any(Object))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('ignores a second ad request while one is active', async () => {
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)
    await runtime.init()
    const ad = adOf(sdk)
    let callbacks: CrazyGamesAdCallbacks | undefined
    ad.requestAd.mockImplementation((_type, next) => {
      callbacks = next
    })

    const first = runtime.rewardedBreak()
    await expect(runtime.rewardedBreak()).resolves.toBe(false)
    callbacks?.adFinished?.()

    await expect(first).resolves.toBe(true)
  })

  it('does not start gameplay while an ad is active', async () => {
    const sdk = fakeSdk()
    const runtime = new CrazyGamesRuntime(() => sdk)
    await runtime.init()
    const ad = adOf(sdk)
    let callbacks: CrazyGamesAdCallbacks | undefined
    ad.requestAd.mockImplementation((_type, next) => {
      callbacks = next
    })

    const adPromise = runtime.midgameBreak()
    runtime.gameplayStart()
    expect(sdk.game.gameplayStart).not.toHaveBeenCalled()

    callbacks?.adFinished?.()
    await adPromise
    runtime.gameplayStart()
    expect(sdk.game.gameplayStart).toHaveBeenCalledTimes(1)
  })
})
