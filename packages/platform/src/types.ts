/** Languages Poki recommends for a global release, in menu order. */
export const SUPPORTED_LANGS = [
  'en',
  'fr',
  'it',
  'de',
  'es',
  'tr',
  'zh',
  'ja',
  'ko',
  'pt',
  'ru',
] as const

export type Lang = (typeof SUPPORTED_LANGS)[number]

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(value)
}

/**
 * Host platform: the page/app that owns the game and its lifecycle events.
 * Advertising is a separate concern; see `AdChannel`.
 */
export interface PlatformAdapter {
  readonly name: string

  init(): Promise<void>
  loadingFinished(): void
  gameplayStart(): void
  gameplayStop(): void
  happyTime(): void
  lang(): Lang | null
  haptic(ms: number): void

  /**
   * Host-level audio mute (for example CrazyGames' `muteAudio` setting).
   * It takes priority over the player's saved sound preference.
   */
  hostMuted?(): boolean
  /** Subscribes to host mute changes and returns an unsubscribe function. */
  onHostMutedChange?(listener: (muted: boolean) => void): () => void
}

/**
 * One advertising provider. Game code never touches this interface directly:
 * `@mg/core` wraps it in `AdService`, which owns muting, input locking and
 * result handling. Implementations live only in `@mg/platform`.
 */
export interface AdChannel {
  readonly name: string
  readonly rewardedAvailable: boolean

  init(): Promise<void>
  rewardedBreak(placement: string, onStart?: () => void): Promise<boolean>
  interstitialBreak?(onStart?: () => void): Promise<void>
}

/** Optional configuration supplied by the game host to an ad channel. */
export interface AdChannelOptions {
  /** Whether the player has game sound enabled; channels use it for ad audio. */
  readonly sound?: () => boolean
}

export type PlatformKind = 'web' | 'poki' | 'crazygames'
export type AdChannelKind = 'dev' | 'poki' | 'h5games' | 'crazygames'

/** No-op host used by the self-hosted site and local development. */
export class WebPlatform implements PlatformAdapter {
  readonly name = 'web'

  init(): Promise<void> {
    return Promise.resolve()
  }

  loadingFinished(): void {}

  gameplayStart(): void {}

  gameplayStop(): void {}

  happyTime(): void {}

  lang(): Lang | null {
    return null
  }

  haptic(ms: number): void {
    if (typeof navigator !== 'undefined') navigator.vibrate?.(ms)
  }
}

/**
 * Development-only rewarded ad simulator. It is compiled out of production
 * builds: Vite replaces `import.meta.env.DEV` with `false`, so the dynamic
 * import of the DOM overlay is removed by tree shaking.
 */
export class DevAdChannel implements AdChannel {
  readonly name = 'dev'

  get rewardedAvailable(): boolean {
    return import.meta.env.DEV
  }

  init(): Promise<void> {
    return Promise.resolve()
  }

  async rewardedBreak(_placement: string, onStart?: () => void): Promise<boolean> {
    if (!import.meta.env.DEV) return false
    const { showFakeRewardedAd } = await import('./fakeAd')
    onStart?.()
    return showFakeRewardedAd()
  }
}
