export type Lang = 'zh' | 'en'

/**
 * Every external SDK (Poki, CrazyGames, itch.io, ...) is hidden behind this
 * interface. Game code must never touch `window.PokiSDK` directly.
 */
export interface PlatformAdapter {
  readonly name: string

  init(): Promise<void>
  loadingFinished(): void
  gameplayStart(): void
  gameplayStop(): void
  commercialBreak(): Promise<void>
  rewardedBreak(): Promise<boolean>
  happyTime(): void
  lang(): Lang | null
  haptic(ms: number): void
}

export type PlatformKind = 'dev' | 'poki'

export class DevPlatform implements PlatformAdapter {
  readonly name = 'dev'

  init(): Promise<void> {
    return Promise.resolve()
  }

  loadingFinished(): void {}

  gameplayStart(): void {}

  gameplayStop(): void {}

  commercialBreak(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 250))
  }

  rewardedBreak(): Promise<boolean> {
    return new Promise((resolve) => setTimeout(() => resolve(true), 250))
  }

  happyTime(): void {}

  lang(): Lang | null {
    return null
  }

  haptic(ms: number): void {
    navigator.vibrate?.(ms)
  }
}

export function createPlatform(kind: PlatformKind = 'dev'): PlatformAdapter {
  switch (kind) {
    case 'dev':
      return new DevPlatform()
    case 'poki':
      // The Poki adapter is added when the first build is submitted to Poki.
      // Keeping the switch here means game code never changes.
      return new DevPlatform()
  }
}
