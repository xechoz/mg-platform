export interface DesignSize {
  width: number
  height: number
  orientation: 'landscape' | 'portrait'
}

/**
 * Keeps split-screen and ultra-wide viewports from producing absurd design
 * spaces. Outside this range the canvas letterboxes instead of stretching.
 */
const MIN_ASPECT = 0.38
const MAX_ASPECT = 2.6

/**
 * The design space always matches the viewport aspect ratio, so `Scale.FIT`
 * fills the screen without bars. Design units stay comparable across devices
 * because the short side is fixed.
 */
export function computeDesignSize(
  viewportWidth: number,
  viewportHeight: number,
  base: number,
): DesignSize {
  const width = Math.max(1, viewportWidth)
  const height = Math.max(1, viewportHeight)
  const aspect = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, width / height))

  if (aspect >= 1) {
    return { width: Math.round(base * aspect), height: base, orientation: 'landscape' }
  }
  return { width: base, height: Math.round(base / aspect), orientation: 'portrait' }
}
