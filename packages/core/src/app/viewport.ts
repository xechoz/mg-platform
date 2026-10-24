import Phaser from 'phaser'
import { computeDesignSize } from './designSize'

/**
 * Recomputes the design space whenever the browser reports a new size, then
 * lets `Scale.FIT` scale it. Scenes listen to `onLayoutChange` and re-lay out;
 * nothing restarts, so a running game keeps its state.
 */
export function installResponsiveViewport(game: Phaser.Game, base: number): void {
  let applying = false

  const apply = (): void => {
    if (applying) return
    const { width, height } = game.scale.parentSize
    if (width <= 0 || height <= 0) return

    const next = computeDesignSize(width, height, base)
    if (next.width === game.scale.width && next.height === game.scale.height) return

    applying = true
    game.scale.setGameSize(next.width, next.height)
    applying = false
  }

  game.scale.on(Phaser.Scale.Events.RESIZE, apply)
  apply()
}
