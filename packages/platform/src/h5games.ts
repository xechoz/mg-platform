import type { AdChannel, AdChannelOptions } from './types'

export type H5AdType = 'preroll' | 'start' | 'pause' | 'next' | 'browse' | 'reward'

export interface H5AdConfig {
  sound?: 'on' | 'off'
  preloadAdBreaks?: 'on' | 'auto'
  onReady?: () => void
}

export interface H5PlacementInfo {
  breakStatus?: string
  breakName?: string
  breakType?: string
}

export interface H5AdBreakConfig {
  type: H5AdType
  name?: string
  beforeAd?: () => void
  afterAd?: () => void
  beforeReward?: (showAdFn: () => void) => void
  adViewed?: () => void
  adDismissed?: () => void
  adBreakDone?: (placementInfo?: H5PlacementInfo) => void
}

/** The global functions installed by the Google H5 Games Ads shim. */
export interface H5AdApi {
  adConfig?: (config: H5AdConfig) => void
  adBreak?: (config: H5AdBreakConfig) => void
}

type H5ApiGetter = () => H5AdApi

function readH5Api(): H5AdApi {
  if (typeof window === 'undefined') return {}
  const api = window as unknown as H5AdApi
  return { adConfig: api.adConfig, adBreak: api.adBreak }
}

/**
 * Google H5 Games Ads (AdSense for Games).
 *
 * The SDK is callback-based. `beforeReward` fires only when an ad is ready;
 * the player already opted in by clicking the game's reward button, so this
 * channel calls `showAdFn()` immediately. `adViewed` and `adBreakDone` decide
 * whether the reward was earned.
 */
export class H5GamesAdChannel implements AdChannel {
  readonly name = 'h5games'
  private readonly options: AdChannelOptions
  private readonly getApi: H5ApiGetter
  private api: H5AdApi | null = null
  private ready = false
  private initPromise: Promise<void> | null = null

  constructor(options: AdChannelOptions = {}, getApi: H5ApiGetter = readH5Api) {
    this.options = options
    this.getApi = getApi
  }

  get rewardedAvailable(): boolean {
    return this.ready && this.api?.adBreak !== undefined
  }

  init(): Promise<void> {
    this.initPromise ??= this.doInit()
    return this.initPromise
  }

  rewardedBreak(placement: string, onStart?: () => void): Promise<boolean> {
    const api = this.api
    if (!api || !this.ready || !api.adBreak) return Promise.resolve(false)
    const adBreak = api.adBreak

    this.configureSound(api)

    return new Promise<boolean>((resolve) => {
      let settled = false
      let rewarded = false
      const finish = (value: boolean) => {
        if (settled) return
        settled = true
        resolve(value)
      }

      try {
        adBreak({
          type: 'reward',
          name: placement,
          beforeReward: (showAdFn) => {
            try {
              onStart?.()
              showAdFn()
            } catch (error) {
              console.warn('[h5games] rewarded ad failed to start', error)
              finish(false)
            }
          },
          adViewed: () => {
            rewarded = true
          },
          adDismissed: () => {
            rewarded = false
          },
          adBreakDone: (info) => {
            finish(rewarded || info?.breakStatus === 'viewed')
          },
        })
      } catch (error) {
        console.warn('[h5games] adBreak failed', error)
        finish(false)
      }
    })
  }

  private doInit(): Promise<void> {
    const api = this.getApi()
    this.api = api
    if (!api.adConfig) return Promise.resolve()

    try {
      api.adConfig({
        preloadAdBreaks: 'on',
        sound: this.soundSetting(),
        onReady: () => {
          this.ready = true
        },
      })
    } catch (error) {
      console.warn('[h5games] adConfig failed', error)
    }
    return Promise.resolve()
  }

  private configureSound(api: H5AdApi): void {
    if (!api.adConfig) return
    try {
      api.adConfig({ sound: this.soundSetting() })
    } catch (error) {
      console.warn('[h5games] sound config failed', error)
    }
  }

  private soundSetting(): 'on' | 'off' {
    return (this.options.sound?.() ?? true) ? 'on' : 'off'
  }
}
