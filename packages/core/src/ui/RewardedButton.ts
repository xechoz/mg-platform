import type { AdService, RewardedOutcome } from '../ads/AdService'
import { Button } from './Button'
import type { Theme } from './theme'

export interface RewardedButtonOptions {
  width?: number
  height?: number
  fontSize?: number
  ads: AdService
  placement: string
  loadingLabel: string
  onReward: () => void
  onOutcome?: (outcome: RewardedOutcome) => void
}

/**
 * A soft button with a video icon that runs the full rewarded flow. The
 * standard alternative must still be rendered by the caller, larger and
 * above/next to this button (Poki review requirement).
 */
export class RewardedButton extends Button {
  private readonly ads: AdService
  private readonly placement: string
  private readonly loadingLabel: string
  private readonly originalLabel: string
  private readonly onReward: () => void
  private readonly onOutcome?: (outcome: RewardedOutcome) => void

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    theme: Theme,
    options: RewardedButtonOptions,
  ) {
    super(scene, x, y, label, theme, {
      width: options.width,
      height: options.height,
      fontSize: options.fontSize,
      variant: 'soft',
      icon: 'video',
      onClick: () => {},
    })

    this.ads = options.ads
    this.placement = options.placement
    this.loadingLabel = options.loadingLabel
    this.originalLabel = label
    this.onReward = options.onReward
    this.onOutcome = options.onOutcome
    this.setOnClick(() => {
      void this.run()
    })
  }

  private async run(): Promise<void> {
    this.setEnabled(false)
    this.setText(this.loadingLabel)
    const outcome = await this.ads.showRewarded(this.placement)

    if (this.active) {
      this.setEnabled(true)
      this.setText(this.originalLabel)
    }

    this.onOutcome?.(outcome)
    if (outcome === 'rewarded') this.onReward()
  }
}
