import Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene'
import { cssColor } from '../ui/theme'
import { bindAdInputLock } from './adInputLock'
import { computeDesignSize } from './designSize'
import { KEYBOARD_CAPTURE } from './keyboardCapture'
import { computeRenderMetrics, setRenderMetrics } from './renderMetrics'
import { createServices, type GameDefinition, type GameServices } from './services'
import { installResponsiveViewport } from './viewport'

export function createGame(def: GameDefinition): Phaser.Game {
  const services = createServices(def)
  installPageStyles(services)
  installPageScrollGuard()
  installAudioUnlock(services)

  const initial = computeDesignSize(window.innerWidth, window.innerHeight, def.design.base)
  const initialMetrics = computeRenderMetrics(
    window.innerWidth,
    window.innerHeight,
    initial.width,
    initial.height,
    window.devicePixelRatio || 1,
  )
  setRenderMetrics(initialMetrics)

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: initialMetrics.canvasWidth,
    height: initialMetrics.canvasHeight,
    backgroundColor: cssColor(services.theme.bg),
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: initialMetrics.canvasWidth,
      height: initialMetrics.canvasHeight,
      fullscreenTarget: 'game',
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
    input: {
      activePointers: 2,
      keyboard: { capture: [...KEYBOARD_CAPTURE] },
    },
    disableContextMenu: true,
    banner: false,
    autoFocus: true,
    scene: [BootScene, ...def.scenes],
  })

  bindAdInputLock(game.input, services.ads)
  installResponsiveViewport(game, def.design.base)
  return game
}

function installPageStyles(services: GameServices): void {
  const bg = cssColor(services.theme.bg)
  document.body.style.backgroundColor = bg
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)

  if (document.getElementById('mg-page-style')) return
  const style = document.createElement('style')
  style.id = 'mg-page-style'
  style.textContent = `
    html, body {
      margin: 0; padding: 0; width: 100%; height: 100%;
      overflow: hidden; overscroll-behavior: none; background: ${bg};
    }
    body {
      height: 100dvh; -webkit-tap-highlight-color: transparent;
      touch-action: none; user-select: none;
      -webkit-user-select: none; -webkit-touch-callout: none;
    }
    #game { position: fixed; inset: 0; }
    #game:fullscreen, #game:-webkit-full-screen { background: ${bg}; }
    #game::backdrop { background: ${bg}; }
    #game canvas { display: block; }
  `
  document.head.appendChild(style)
}

let audioUnlockInstalled = false

/**
 * Browsers only start audio inside a user gesture. The first tap or key press
 * unlocks the context, so menu feedback works without a dedicated start gate.
 */
function installAudioUnlock(services: GameServices): void {
  if (audioUnlockInstalled) return
  audioUnlockInstalled = true

  const unlock = (): void => {
    services.audio.unlock()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

let pageScrollGuardInstalled = false

/**
 * Poki embeds games in an iframe, so the wheel must never scroll the host page.
 * Keyboard scrolling is suppressed by Phaser itself through
 * `input.keyboard.capture` (see KEYBOARD_CAPTURE): a capture-phase listener
 * here would mark arrow keys as `defaultPrevented` before Phaser processes
 * them, which disables directional input entirely.
 */
function installPageScrollGuard(): void {
  if (pageScrollGuardInstalled) return
  pageScrollGuardInstalled = true

  window.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) return
      event.preventDefault()
    },
    { passive: false },
  )
}
