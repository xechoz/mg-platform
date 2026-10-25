import type { AdChannel, Lang, PlatformAdapter } from './types'

/** The subset of the Poki SDK used by this project. */
export interface PokiSdk {
  init(): Promise<void>
  gameLoadingFinished(): void
  gameplayStart(): void
  gameplayStop(): void
  commercialBreak(onStart?: () => void): Promise<void>
  rewardedBreak(onStart?: () => void): Promise<boolean>
  happyTime(): void
}

type SdkGetter = () => PokiSdk | undefined

function readGlobalSdk(): PokiSdk | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { PokiSDK?: PokiSdk }).PokiSDK
}

/**
 * Shared state for the Poki host + ad channel. Poki is both the page host and
 * the ad provider, so both adapters must agree on init, gameplay and ad state.
 */
export class PokiRuntime {
  private readonly getSdk: SdkGetter
  private sdk: PokiSdk | null = null
  private ready = false
  private playing = false
  private adActive = false
  private initPromise: Promise<void> | null = null

  constructor(getSdk: SdkGetter = readGlobalSdk) {
    this.getSdk = getSdk
  }

  get rewardedAvailable(): boolean {
    return this.ready
  }

  init(): Promise<void> {
    this.initPromise ??= this.doInit()
    return this.initPromise
  }

  loadingFinished(): void {
    if (!this.sdk) return
    this.sdk.gameLoadingFinished()
  }

  gameplayStart(): void {
    if (!this.sdk || this.adActive || this.playing) return
    this.sdk.gameplayStart()
    this.playing = true
  }

  gameplayStop(): void {
    if (!this.sdk || this.adActive || !this.playing) return
    this.sdk.gameplayStop()
    this.playing = false
  }

  happyTime(): void {
    if (!this.sdk || this.adActive) return
    this.sdk.happyTime()
  }

  async rewardedBreak(onStart?: () => void): Promise<boolean> {
    if (!this.sdk || this.adActive) return false
    this.adActive = true
    try {
      onStart?.()
      return await this.sdk.rewardedBreak(onStart)
    } catch (error) {
      console.warn('[poki] rewardedBreak failed', error)
      return false
    } finally {
      this.adActive = false
    }
  }

  async interstitialBreak(onStart?: () => void): Promise<void> {
    if (!this.sdk || this.adActive) return
    this.adActive = true
    try {
      onStart?.()
      await this.sdk.commercialBreak(onStart)
    } catch (error) {
      console.warn('[poki] commercialBreak failed', error)
    } finally {
      this.adActive = false
    }
  }

  lang(): Lang | null {
    return null
  }

  haptic(ms: number): void {
    if (typeof navigator !== 'undefined') navigator.vibrate?.(ms)
  }

  private async doInit(): Promise<void> {
    const sdk = this.getSdk()
    if (!sdk) return
    try {
      await sdk.init()
      this.sdk = sdk
      this.ready = true
    } catch (error) {
      // Poki's guidance: load the game even when init fails.
      console.warn('[poki] init failed, continuing without SDK', error)
    }
  }
}

export class PokiPlatform implements PlatformAdapter {
  readonly name = 'poki'

  constructor(private readonly runtime: PokiRuntime) {}

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
}

export class PokiAdChannel implements AdChannel {
  readonly name = 'poki'

  constructor(private readonly runtime: PokiRuntime) {}

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
    return this.runtime.interstitialBreak(onStart)
  }
}
