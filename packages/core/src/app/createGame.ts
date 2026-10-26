import Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene'
import { PreloadScene } from '../scenes/PreloadScene'
import { cssColor } from '../ui/theme'
import { computeDesignSize } from './designSize'
import { createServices, type GameDefinition, type GameServices } from './services'
import { installResponsiveViewport } from './viewport'

export function createGame(def: GameDefinition): Phaser.Game {
  const services = createServices(def)
  installPageStyles(services)
  installPageScrollGuard()

  const initial = computeDesignSize(window.innerWidth, window.innerHeight, def.design.base)

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: initial.width,
    height: initial.height,
    backgroundColor: cssColor(services.theme.bg),
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: initial.width,
      height: initial.height,
      fullscreenTarget: 'game',
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
    input: { activePointers: 2 },
    disableContextMenu: true,
    banner: false,
    autoFocus: true,
    scene: [BootScene, PreloadScene, ...def.scenes],
  })

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

let pageScrollGuardInstalled = false

/**
 * Poki embeds games in an iframe: arrow keys, space and wheel must never scroll
 * the host page. Capture phase also covers Phaser's canvas listeners.
 */
function installPageScrollGuard(): void {
  if (pageScrollGuardInstalled) return
  pageScrollGuardInstalled = true

  window.addEventListener(
    'keydown',
    (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return
      }
      if (event.key === ' ' || event.key === 'Spacebar' || event.key.startsWith('Arrow')) {
        event.preventDefault()
      }
    },
    { capture: true },
  )

  window.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) return
      event.preventDefault()
    },
    { passive: false },
  )
}
