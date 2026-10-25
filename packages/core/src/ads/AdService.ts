import type { AdChannel, PlatformAdapter } from '@mg/platform'

export type RewardedOutcome = 'rewarded' | 'skipped' | 'failed'

export interface AdStats {
  readonly shown: number
  readonly rewarded: number
  readonly skipped: number
  readonly failed: number
}

export type AdActiveListener = (active: boolean) => void

/** The slice of the audio manager used during ad playback. */
export interface AdAudio {
  suspend(): void
  resume(): void
}

type MutableAdStats = {
  shown: number
  rewarded: number
  skipped: number
  failed: number
}

/**
 * Channel-agnostic rewarded-ad orchestration.
 *
 * It owns the cross-cutting concerns every game would otherwise reimplement:
 * one ad at a time, muting game audio, stopping gameplay before the ad, and
 * mapping the provider result to a small outcome enum. It deliberately knows
 * nothing about revives, power-ups, coins or per-game limits; those belong to
 * each game's `src/ads.ts` policy.
 */
export class AdService {
  private readonly channel: AdChannel
  private readonly platform: Pick<PlatformAdapter, 'gameplayStop'>
  private readonly audio: AdAudio
  private readonly counters = new Map<string, MutableAdStats>()
  private readonly listeners = new Set<AdActiveListener>()
  private inFlight = false
  private activeState = false

  constructor(channel: AdChannel, platform: Pick<PlatformAdapter, 'gameplayStop'>, audio: AdAudio) {
    this.channel = channel
    this.platform = platform
    this.audio = audio
  }

  get active(): boolean {
    return this.activeState
  }

  get available(): boolean {
    return this.channel.rewardedAvailable
  }

  init(): Promise<void> {
    return this.channel.init()
  }

  /**
   * Shows one rewarded ad. Never runs two at once and never grants a reward
   * itself; the caller applies the reward only for `'rewarded'`.
   *
   * There is intentionally no cooldown or daily cap: the ad provider manages
   * frequency. Game-design limits (e.g. one revive per run) live in the game.
   */
  async showRewarded(placement: string): Promise<RewardedOutcome> {
    if (this.inFlight || !this.channel.rewardedAvailable) return 'failed'

    this.inFlight = true
    const stats = this.statsFor(placement)
    stats.shown += 1

    this.platform.gameplayStop()
    this.audio.suspend()
    this.setActive(true)

    let outcome: RewardedOutcome = 'failed'
    try {
      const success = await this.channel.rewardedBreak(placement)
      outcome = success ? 'rewarded' : 'skipped'
    } catch (error) {
      console.warn(`[ads] ${placement} failed`, error)
      outcome = 'failed'
    } finally {
      if (outcome === 'rewarded') stats.rewarded += 1
      else if (outcome === 'skipped') stats.skipped += 1
      else stats.failed += 1

      this.audio.resume()
      this.setActive(false)
      this.inFlight = false
    }

    return outcome
  }

  stats(): Readonly<Record<string, AdStats>> {
    const snapshot: Record<string, AdStats> = {}
    for (const [placement, stats] of this.counters) snapshot[placement] = { ...stats }
    return snapshot
  }

  onChange(listener: AdActiveListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private statsFor(placement: string): MutableAdStats {
    let stats = this.counters.get(placement)
    if (!stats) {
      stats = { shown: 0, rewarded: 0, skipped: 0, failed: 0 }
      this.counters.set(placement, stats)
    }
    return stats
  }

  private setActive(active: boolean): void {
    if (this.activeState === active) return
    this.activeState = active
    for (const listener of this.listeners) listener(active)
  }
}
