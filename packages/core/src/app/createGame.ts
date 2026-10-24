import Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene'
import { PreloadScene } from '../scenes/PreloadScene'
import { cssColor } from '../ui/theme'
import { PORTRAIT_BLOCK_QUERY } from './orientation'
import { createServices, type GameDefinition, type GameServices } from './services'

export function createGame(def: GameDefinition): Phaser.Game {
  const services = createServices(def)
  installPageStyles(services)
  installRotateHint(services)

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: def.design.width,
    height: def.design.height,
    backgroundColor: cssColor(services.theme.bg),
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: def.design.width,
      height: def.design.height,
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
    }
    #game { position: fixed; inset: 0; }
    #game canvas { display: block; }
    .mg-rotate-hint {
      position: fixed; inset: 0; display: none; flex-direction: column;
      align-items: center; justify-content: center; gap: 14px;
      background: rgba(5, 7, 13, 0.96); color: #e8eefc; z-index: 10; padding: 24px;
      font: 600 20px/1.5 "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
      text-align: center; pointer-events: auto;
    }
    .mg-rotate-hint::before { content: '⟳'; font-size: 44px; line-height: 1; }
    @media ${PORTRAIT_BLOCK_QUERY} {
      .mg-rotate-hint { display: flex; }
    }
  `
  document.head.appendChild(style)
}

function installRotateHint(services: GameServices): void {
  if (document.querySelector('.mg-rotate-hint')) return
  const hint = document.createElement('div')
  hint.className = 'mg-rotate-hint'
  hint.textContent = services.i18n.t('core.rotate')
  document.body.appendChild(hint)
}
