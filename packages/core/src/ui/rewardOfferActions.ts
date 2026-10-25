import type { AdService } from '../ads/AdService'
import type { ModalAction } from './Modal'

export interface RewardOfferOptions {
  ads: AdService
  standard: {
    label: string
    onClick: () => void
  }
  rewarded: {
    label: string
    placement: string
    loadingLabel: string
    onReward: () => void
  }
  standardHeight?: number
  rewardedHeight?: number
}

/**
 * Builds the standard + rewarded action pair required by Poki's review rules:
 * the standard action comes first (above in a column layout) and is larger;
 * the rewarded action is soft (never green) and carries a video icon.
 *
 * Use with `actionsLayout: 'column'`. The modal stays open while the ad is
 * loading; on skip/failure the button re-enables without a custom error.
 */
export function rewardOfferActions(options: RewardOfferOptions): ModalAction[] {
  return [
    {
      label: options.standard.label,
      variant: 'primary',
      height: options.standardHeight ?? 92,
      onClick: options.standard.onClick,
    },
    {
      label: options.rewarded.label,
      variant: 'soft',
      icon: 'video',
      height: options.rewardedHeight ?? 80,
      closeOnClick: false,
      loadingLabel: options.rewarded.loadingLabel,
      onClick: async () => {
        const outcome = await options.ads.showRewarded(options.rewarded.placement)
        if (outcome === 'rewarded') options.rewarded.onReward()
      },
    },
  ]
}
