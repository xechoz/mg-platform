import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { CrazyGamesRuntime } from './crazygames'

interface FakeSdk {
  init: Mock<() => Promise<void>>
  game: {
    loadingStart: Mock<() => void>
    loadingStop: Mock<() => void>
    gameplayStart: Mock<() => void>
    gameplayStop: Mock<() => void>
    happytime: Mock<() => void>
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
    },
  }
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
})
