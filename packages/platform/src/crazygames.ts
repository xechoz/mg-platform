import { isLang, type Lang, type PlatformAdapter } from './types'

/** The subset of the CrazyGames SDK v3 used by this project. */
export interface CrazyGamesSdk {
  init(): Promise<void>
  game: {
    loadingStart(): void
    loadingStop(): void
    gameplayStart(): void
    gameplayStop(): void
    happytime(): void
  }
  user?: {
    systemInfo?: {
      locale?: string
    }
  }
}

type SdkGetter = () => CrazyGamesSdk | undefined

function readGlobalSdk(): CrazyGamesSdk | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { CrazyGames?: { SDK?: CrazyGamesSdk } }).CrazyGames?.SDK
}

/**
 * Shared state for the CrazyGames host. The adapter only owns the platform
 * lifecycle events; advertising and custom analytics are separate concerns.
 */
export class CrazyGamesRuntime {
  private readonly getSdk: SdkGetter
  private sdk: CrazyGamesSdk | null = null
  private playing = false
  private loadingStarted = false
  private loadingFinishedFired = false
  private initPromise: Promise<void> | null = null

  constructor(getSdk: SdkGetter = readGlobalSdk) {
    this.getSdk = getSdk
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
    if (!this.sdk || this.playing) return
    this.sdk.game.gameplayStart()
    this.playing = true
  }

  gameplayStop(): void {
    if (!this.sdk || !this.playing) return
    this.sdk.game.gameplayStop()
    this.playing = false
  }

  happyTime(): void {
    if (!this.sdk) return
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

  private async doInit(): Promise<void> {
    const sdk = this.getSdk()
    if (!sdk) return
    try {
      await sdk.init()
      this.sdk = sdk
      sdk.game.loadingStart()
      this.loadingStarted = true
    } catch (error) {
      // CrazyGames guidance: the game must remain playable when the SDK fails.
      console.warn('[crazygames] init failed, continuing without SDK', error)
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
}
