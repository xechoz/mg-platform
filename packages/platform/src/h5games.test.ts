import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { type H5AdBreakConfig, type H5AdConfig, H5GamesAdChannel } from './h5games'

interface FakeApi {
  adConfig: Mock<(config: H5AdConfig) => void>
  adBreak: Mock<(config: H5AdBreakConfig) => void>
}

function fakeApi(): FakeApi {
  return {
    adConfig: vi.fn<(config: H5AdConfig) => void>(),
    adBreak: vi.fn<(config: H5AdBreakConfig) => void>(),
  }
}

function readyApi(): FakeApi {
  const api = fakeApi()
  api.adConfig.mockImplementation((config) => {
    config.onReady?.()
  })
  return api
}

async function readyChannel(options: { sound?: () => boolean } = {}): Promise<{
  api: FakeApi
  channel: H5GamesAdChannel
}> {
  const api = readyApi()
  const channel = new H5GamesAdChannel(options, () => api)
  await channel.init()
  return { api, channel }
}

function captureBreak(api: FakeApi): H5AdBreakConfig[] {
  const calls: H5AdBreakConfig[] = []
  api.adBreak.mockImplementation((config) => {
    calls.push(config)
  })
  return calls
}

function breakAt(calls: H5AdBreakConfig[], index: number): H5AdBreakConfig {
  const config = calls[index]
  if (!config) throw new Error(`missing ad break ${index}`)
  return config
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('H5GamesAdChannel', () => {
  it('waits for onReady before exposing rewarded ads', async () => {
    const api = fakeApi()
    let onReady: (() => void) | undefined
    api.adConfig.mockImplementation((config) => {
      onReady = config.onReady
    })
    const channel = new H5GamesAdChannel({}, () => api)

    expect(channel.rewardedAvailable).toBe(false)
    await channel.init()

    expect(api.adConfig).toHaveBeenCalledWith(
      expect.objectContaining({ preloadAdBreaks: 'on', sound: 'on' }),
    )
    expect(channel.rewardedAvailable).toBe(false)

    onReady?.()
    expect(channel.rewardedAvailable).toBe(true)
  })

  it('stays unavailable when the SDK never becomes ready', async () => {
    const api = fakeApi()
    const channel = new H5GamesAdChannel({}, () => api)

    await channel.init()

    expect(channel.rewardedAvailable).toBe(false)
    await expect(channel.rewardedBreak('revive')).resolves.toBe(false)
    expect(api.adBreak).not.toHaveBeenCalled()
  })

  it('initializes only once', async () => {
    const { api, channel } = await readyChannel()

    await channel.init()

    expect(api.adConfig).toHaveBeenCalledTimes(1)
  })

  it('requests a reward break with the placement name', async () => {
    const { api, channel } = await readyChannel()
    const calls = captureBreak(api)

    const promise = channel.rewardedBreak('revive')
    const config = breakAt(calls, 0)

    expect(config.type).toBe('reward')
    expect(config.name).toBe('revive')
    config.adViewed?.()
    config.adBreakDone?.({ breakStatus: 'viewed' })

    await expect(promise).resolves.toBe(true)
  })

  it('rewards after adViewed or a viewed break status', async () => {
    const { api, channel } = await readyChannel()
    const calls = captureBreak(api)

    const viewed = channel.rewardedBreak('revive')
    breakAt(calls, 0).adViewed?.()
    breakAt(calls, 0).adBreakDone?.({ breakStatus: 'viewed' })
    await expect(viewed).resolves.toBe(true)

    const fallback = channel.rewardedBreak('revive')
    breakAt(calls, 1).adBreakDone?.({ breakStatus: 'viewed' })
    await expect(fallback).resolves.toBe(true)
  })

  it('does not reward a dismissed ad', async () => {
    const { api, channel } = await readyChannel()
    const calls = captureBreak(api)

    const promise = channel.rewardedBreak('revive')
    breakAt(calls, 0).adDismissed?.()
    breakAt(calls, 0).adBreakDone?.({ breakStatus: 'dismissed' })

    await expect(promise).resolves.toBe(false)
  })

  it('does not reward a no-fill break', async () => {
    const { api, channel } = await readyChannel()
    const calls = captureBreak(api)

    const promise = channel.rewardedBreak('revive')
    breakAt(calls, 0).adBreakDone?.({ breakStatus: 'noAdPreloaded' })

    await expect(promise).resolves.toBe(false)
  })

  it('calls onStart and shows the ad from beforeReward', async () => {
    const { api, channel } = await readyChannel()
    const calls = captureBreak(api)
    const onStart = vi.fn<() => void>()
    const showAd = vi.fn<() => void>()

    const promise = channel.rewardedBreak('revive', onStart)
    breakAt(calls, 0).beforeReward?.(showAd)

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(showAd).toHaveBeenCalledTimes(1)

    breakAt(calls, 0).adViewed?.()
    breakAt(calls, 0).adBreakDone?.({ breakStatus: 'viewed' })
    await expect(promise).resolves.toBe(true)
  })

  it('resolves false when adBreak throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { api, channel } = await readyChannel()
    api.adBreak.mockImplementation(() => {
      throw new Error('blocked')
    })

    await expect(channel.rewardedBreak('revive')).resolves.toBe(false)
  })

  it('resolves false when showing the ad throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { api, channel } = await readyChannel()
    const calls = captureBreak(api)

    const promise = channel.rewardedBreak('revive')
    breakAt(calls, 0).beforeReward?.(() => {
      throw new Error('blocked')
    })

    await expect(promise).resolves.toBe(false)
  })

  it('passes the sound preference to adConfig', async () => {
    const { api, channel } = await readyChannel({ sound: () => false })
    const calls = captureBreak(api)

    expect(api.adConfig).toHaveBeenNthCalledWith(1, expect.objectContaining({ sound: 'off' }))

    const promise = channel.rewardedBreak('revive')
    expect(api.adConfig).toHaveBeenNthCalledWith(2, { sound: 'off' })
    breakAt(calls, 0).adBreakDone?.({ breakStatus: 'noAdPreloaded' })
    await promise
  })

  it('ignores duplicate adBreakDone callbacks', async () => {
    const { api, channel } = await readyChannel()
    const calls = captureBreak(api)

    const promise = channel.rewardedBreak('revive')
    breakAt(calls, 0).adBreakDone?.({ breakStatus: 'viewed' })
    breakAt(calls, 0).adBreakDone?.({ breakStatus: 'dismissed' })

    await expect(promise).resolves.toBe(true)
  })

  it('stays usable when adConfig throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const api = fakeApi()
    api.adConfig.mockImplementation(() => {
      throw new Error('blocked')
    })
    const channel = new H5GamesAdChannel({}, () => api)

    await channel.init()

    expect(channel.rewardedAvailable).toBe(false)
  })
})
