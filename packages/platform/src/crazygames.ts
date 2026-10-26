import { type AdChannel, isLang, type Lang, type PlatformAdapter } from './types'

export type CrazyGamesAdType = 'midgame' | 'rewarded'

export interface CrazyGamesAdError {
  code: string
  message?: string
}

export interface CrazyGamesAdCallbacks {
  adStarted?: () => void
  adFinished?: () => void
  adError?: (error: CrazyGamesAdError) => void
}

export interface CrazyGamesSettings {
  muteAudio?: boolean
}

/** The subset of the CrazyGames SDK v3 used by this project. */
export interface CrazyGamesSdk {
  init(): Promise<void>
  game: {
    loadingStart(): void
    loadingStop(): void
    gameplayStart(): void
    gameplayStop(): void
    happytime(): void
    settings?: CrazyGamesSettings
    addSettingsChangeListener?(listener: (settings: CrazyGamesSettings) => void): void
    removeSettingsChangeListener?(listener: (settings: CrazyGamesSettings) => void): void
  }
  ad?: {
    requestAd(type: CrazyGamesAdType, callbacks: CrazyGamesAdCallbacks): void
    hasAdblock?(): boolean | Promise<boolean>
  }
  user?: {
    systemInfo?: {
      locale?: string
    }
  }
}

type SdkGetter = () => CrazyGamesSdk | undefined
type MuteListener = (muted: boolean) => void

function readGlobalSdk(): CrazyGamesSdk | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { CrazyGames?: { SDK?: CrazyGamesSdk } }).CrazyGames?.SDK
}

/**
 * Shared state for the CrazyGames host + ad channel. CrazyGames is both the
 * page host and the ad provider, so both adapters must agree on init, gameplay,
 * host mute and ad state.
 */
export class CrazyGamesRuntime {
  private readonly getSdk: SdkGetter
  private readonly muteListeners = new Set<MuteListener>()
  private sdk: CrazyGamesSdk | null = null
  private playing = false
  private loadingStarted = false
  private loadingFinishedFired = false
  private initPromise: Promise<void> | null = null
  private muted = false
  private adsBlocked = false
  private adsDisabled = false
  private adActive = false

  constructor(getSdk: SdkGetter = readGlobalSdk) {
    this.getSdk = getSdk
  }

  get rewardedAvailable(): boolean {
    return this.sdk !== null && this.sdk.ad !== undefined && !this.adsBlocked && !this.adsDisabled
  }

  init(): Promise<void> {
    this.initPromise ??= this.doInit()
    return this.initPromise
  }

  loadingFinished(): void {
    if (!this.sdk || !this.loadingStarted || this.loadingFinishedFired) return
    this.loadingFinishedFired = true
    this.sdk.game.loadingStop()
  }

  gameplayStart(): void {
    if (!this.sdk || this.adActive || this.playing) return
    this.sdk.game.gameplayStart()
    this.playing = true
  }

  gameplayStop(): void {
    if (!this.sdk || !this.playing) return
    this.sdk.game.gameplayStop()
    this.playing = false
  }

  happyTime(): void {
    if (!this.sdk || this.adActive) return
    this.sdk.game.happytime()
  }

  lang(): Lang | null {
    const raw = this.getSdk()?.user?.systemInfo?.locale
    if (!raw) return null
    const base = raw.trim().toLowerCase().split('-')[0]
    return isLang(base) ? base : null
  }

  haptic(ms: number): void {
    if (typeof navigator !== 'undefined') navigator.vibrate?.(ms)
  }

  hostMuted(): boolean {
    return this.muted
  }

  onHostMutedChange(listener: MuteListener): () => void {
    this.muteListeners.add(listener)
    listener(this.muted)
    return () => {
      this.muteListeners.delete(listener)
    }
  }

  /** Shows a rewarded ad. Resolves true only when the ad actually finished. */
  rewardedBreak(onStart?: () => void): Promise<boolean> {
    const ad = this.sdk?.ad
    if (!ad || this.adActive || this.adsBlocked || this.adsDisabled) {
      return Promise.resolve(false)
    }

    this.adActive = true
    return new Promise<boolean>((resolve) => {
      let started = false
      let settled = false
      const start = (): void => {
        if (settled || started) return
        started = true
        onStart?.()
      }
      const finish = (success: boolean): void => {
        if (settled) return
        settled = true
        this.adActive = false
        resolve(success)
      }

      try {
        ad.requestAd('rewarded', {
          adStarted: start,
          adFinished: () => finish(true),
          adError: (error) => {
            this.handleAdError(error)
            finish(false)
          },
        })
      } catch (error) {
        console.warn('[crazygames] rewarded ad failed to start', error)
        finish(false)
      }
    })
  }

  /** Shows a midgame ad at a natural break. Resolves when the break is over. */
  midgameBreak(onStart?: () => void): Promise<void> {
    const ad = this.sdk?.ad
    if (!ad || this.adActive || this.adsBlocked || this.adsDisabled) {
      return Promise.resolve()
    }

    this.adActive = true
    return new Promise<void>((resolve) => {
      let started = false
      let settled = false
      const start = (): void => {
        if (settled || started) return
        started = true
        onStart?.()
      }
      const finish = (): void => {
        if (settled) return
        settled = true
        this.adActive = false
        resolve()
      }

      try {
        ad.requestAd('midgame', {
          adStarted: start,
          adFinished: finish,
          adError: (error) => {
            this.handleAdError(error)
            finish()
          },
        })
      } catch (error) {
        console.warn('[crazygames] midgame ad failed to start', error)
        finish()
      }
    })
  }

  private handleAdError(error: CrazyGamesAdError): void {
    if (error.code === 'adblock') this.adsBlocked = true
    if (error.code === 'adsDisabled') this.adsDisabled = true
    const detail = error.message ? ` (${error.message})` : ''
    console.warn(`[crazygames] ad error: ${error.code}${detail}`)
  }

  private setHostMuted(muted: boolean): void {
    if (this.muted === muted) return
    this.muted = muted
    for (const listener of this.muteListeners) listener(muted)
  }

  private applySettings(settings: CrazyGamesSettings | undefined): void {
    const muted = settings?.muteAudio ?? this.sdk?.game.settings?.muteAudio ?? false
    this.setHostMuted(muted)
  }

  private async doInit(): Promise<void> {
    const sdk = this.getSdk()
    if (!sdk) return
    try {
      await sdk.init()
      this.sdk = sdk
      sdk.game.loadingStart()
      this.loadingStarted = true
      this.applySettings(sdk.game.settings)

      sdk.game.addSettingsChangeListener?.((settings) => {
        this.applySettings(settings)
      })
      await this.detectAdblock(sdk)
    } catch (error) {
      // CrazyGames guidance: the game must remain playable when the SDK fails.
      console.warn('[crazygames] init failed, continuing without SDK', error)
    }
  }

  private async detectAdblock(sdk: CrazyGamesSdk): Promise<void> {
    try {
      const blocked = await sdk.ad?.hasAdblock?.()
      this.adsBlocked = blocked === true
    } catch (error) {
      console.warn('[crazygames] adblock detection failed', error)
    }
  }
}

export class CrazyGamesPlatform implements PlatformAdapter {
  readonly name = 'crazygames'

  constructor(private readonly runtime: CrazyGamesRuntime) {}

  init(): Promise<void> {
    return this.runtime.init()
  }

  loadingFinished(): void {
    this.runtime.loadingFinished()
  }

  gameplayStart(): void {
    this.runtime.gameplayStart()
  }

  gameplayStop(): void {
    this.runtime.gameplayStop()
  }

  happyTime(): void {
    this.runtime.happyTime()
  }

  lang(): Lang | null {
    return this.runtime.lang()
  }

  haptic(ms: number): void {
    this.runtime.haptic(ms)
  }

  hostMuted(): boolean {
    return this.runtime.hostMuted()
  }

  onHostMutedChange(listener: (muted: boolean) => void): () => void {
    return this.runtime.onHostMutedChange(listener)
  }
}

export class CrazyGamesAdChannel implements AdChannel {
  readonly name = 'crazygames'

  constructor(private readonly runtime: CrazyGamesRuntime) {}

  get rewardedAvailable(): boolean {
    return this.runtime.rewardedAvailable
  }

  init(): Promise<void> {
    return this.runtime.init()
  }

  rewardedBreak(_placement: string, onStart?: () => void): Promise<boolean> {
    return this.runtime.rewardedBreak(onStart)
  }

  interstitialBreak(onStart?: () => void): Promise<void> {
    return this.runtime.midgameBreak(onStart)
  }
}
