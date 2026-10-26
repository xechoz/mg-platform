import Phaser from 'phaser'
import { getRenderMetrics } from './renderMetrics'
import { type Insets, safeAreaInDesign } from './safeArea'
import { syncSceneViewport } from './viewport'

export interface Viewport {
  width: number
  height: number
  insets: Insets
}

export type LayoutListener = (viewport: Viewport) => void

/**
 * Current design space plus the safe-area insets already converted to it.
 * Also syncs the scene camera and text resolution, so this is the only safe
 * source of layout dimensions: `scene.scale.width` is the backing canvas size.
 */
export function readViewport(scene: Phaser.Scene): Viewport {
  syncSceneViewport(scene)
  const metrics = getRenderMetrics()

  return {
    width: metrics.designWidth,
    height: metrics.designHeight,
    insets: safeAreaInDesign(scene),
  }
}

/**
 * Runs `listener` immediately and again whenever the design space changes.
 * Scenes stay in charge of their own layout; this only saves them from
 * duplicating listener plumbing and cleanup.
 */
export function onLayoutChange(scene: Phaser.Scene, listener: LayoutListener): void {
  const notify = (): void => listener(readViewport(scene))

  notify()
  scene.scale.on(Phaser.Scale.Events.RESIZE, notify)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, notify)
  })
}
