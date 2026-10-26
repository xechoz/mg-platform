import type Phaser from 'phaser'
import { getRenderMetrics } from './renderMetrics'

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

/**
 * Reads `env(safe-area-inset-*)` through a throwaway probe, because there is no
 * direct DOM API for it. Returns CSS pixels.
 */
export function readSafeAreaInsets(): Insets {
  const probe = document.createElement('div')
  probe.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:0',
    'height:0',
    'visibility:hidden',
    'pointer-events:none',
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
  ].join(';')
  // In element fullscreen only the fullscreen subtree is rendered; keep the
  // probe inside it so the computed insets stay meaningful.
  const host = document.fullscreenElement ?? document.body
  host.appendChild(probe)

  const style = getComputedStyle(probe)
  const insets: Insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  }

  probe.remove()
  return insets
}

/** Converts the CSS pixel insets into the scene's current design units. */
export function safeAreaInDesign(scene: Phaser.Scene): Insets {
  const insets = readSafeAreaInsets()
  const display = scene.scale.displayScale
  const render = getRenderMetrics()
  // displayScale is backing pixels per CSS pixel; remove the native render
  // scale to get design units per CSS pixel.
  const x = display.x / render.scaleX
  const y = display.y / render.scaleY

  return {
    top: Math.round(insets.top * y),
    right: Math.round(insets.right * x),
    bottom: Math.round(insets.bottom * y),
    left: Math.round(insets.left * x),
  }
}
