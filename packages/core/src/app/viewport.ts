import Phaser from 'phaser'
import { computeDesignSize } from './designSize'
import {
  computeRenderMetrics,
  getRenderMetrics,
  type RenderMetrics,
  setRenderMetrics,
} from './renderMetrics'

const cameraVersions = new WeakMap<Phaser.Cameras.Scene2D.Camera, number>()
const sceneTextVersions = new WeakMap<Phaser.Scene, number>()

/**
 * Recomputes the design space and its native-resolution backing store whenever
 * the browser reports a new size, then lets `Scale.FIT` scale the canvas down
 * to the CSS size. Scenes listen to `onLayoutChange` and re-lay out; nothing
 * restarts, so a running game keeps its state.
 */
export function installResponsiveViewport(game: Phaser.Game, base: number): void {
  let applying = false
  let appliedVersion = -1
  let dprQuery: MediaQueryList | null = null

  const apply = (): void => {
    if (applying) return
    const { width, height } = game.scale.parentSize
    if (width <= 0 || height <= 0) return

    const design = computeDesignSize(width, height, base)
    const metrics = setRenderMetrics(
      computeRenderMetrics(
        width,
        height,
        design.width,
        design.height,
        window.devicePixelRatio || 1,
      ),
    )
    const canvasChanged =
      game.scale.width !== metrics.canvasWidth || game.scale.height !== metrics.canvasHeight

    if (!canvasChanged && metrics.version === appliedVersion) return

    appliedVersion = metrics.version
    applying = true
    game.scale.setGameSize(metrics.canvasWidth, metrics.canvasHeight)
    applying = false
  }

  const watchDpr = (): void => {
    dprQuery?.removeEventListener('change', handleDprChange)
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
    dprQuery.addEventListener('change', handleDprChange)
  }

  const handleDprChange = (): void => {
    watchDpr()
    apply()
  }

  game.scale.on(Phaser.Scale.Events.RESIZE, apply)
  watchDpr()
  apply()
}

/**
 * Keeps a scene's main camera aligned with the design space and refreshes text
 * glyph textures when the backing scale changes. Safe to call on every layout:
 * work is keyed by camera and metrics version, so a scene restart gets a fresh
 * camera without resetting intentional camera state on unrelated re-layouts.
 */
export function syncSceneViewport(scene: Phaser.Scene): void {
  const metrics = getRenderMetrics()
  const camera = scene.cameras.main
  if (!camera) return

  if (cameraVersions.get(camera) !== metrics.version) {
    camera.setZoom(metrics.scaleX, metrics.scaleY)
    camera.setScroll(
      (-(metrics.scaleX - 1) * metrics.designWidth) / 2,
      (-(metrics.scaleY - 1) * metrics.designHeight) / 2,
    )
    cameraVersions.set(camera, metrics.version)
  }

  if (sceneTextVersions.get(scene) !== metrics.version) {
    setTextResolution(scene.children.list, metrics.textResolution)
    sceneTextVersions.set(scene, metrics.version)
  }
}

function setTextResolution(
  objects: readonly Phaser.GameObjects.GameObject[],
  resolution: number,
): void {
  for (const object of objects) {
    if (object instanceof Phaser.GameObjects.Text) {
      if (Math.abs(object.style.resolution - resolution) > 0.001) {
        object.setResolution(resolution)
      }
    } else if (object instanceof Phaser.GameObjects.Container) {
      setTextResolution(object.list, resolution)
    }
  }
}

export type { RenderMetrics }
