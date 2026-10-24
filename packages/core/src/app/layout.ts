import Phaser from 'phaser'
import { type Insets, safeAreaInDesign } from './safeArea'

export interface Viewport {
  width: number
  height: number
  insets: Insets
}

export type LayoutListener = (viewport: Viewport) => void

/** Current design space plus the safe-area insets already converted to it. */
export function readViewport(scene: Phaser.Scene): Viewport {
  return {
    width: scene.scale.width,
    height: scene.scale.height,
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
