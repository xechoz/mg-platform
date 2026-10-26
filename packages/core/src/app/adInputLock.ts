import type { AdService } from '../ads/AdService'

/** The slice of Phaser's input manager touched by the ad lock. */
export interface ToggleableInput {
  enabled: boolean
}

/**
 * Keeps Phaser input disabled for the whole ad lifecycle. Phaser also listens
 * for mouse and touch events on `window`, so a DOM ad surface can otherwise
 * click through to the scene underneath it.
 */
export function bindAdInputLock(
  input: ToggleableInput,
  ads: Pick<AdService, 'active' | 'onChange'>,
): () => void {
  const apply = (active: boolean): void => {
    input.enabled = !active
  }
  apply(ads.active)
  return ads.onChange(apply)
}
