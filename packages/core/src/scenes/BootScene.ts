import Phaser from 'phaser'
import { readViewport } from '../app/layout'
import { getServices } from '../app/services'
import { cssColor, displayTextStyle, mixColor, textStyle } from '../ui/theme'

const BAR_WIDTH = 360

/**
 * Initializes platform SDKs and loads the game's asset manifest, then starts
 * the menu. SDK init and asset loading run in parallel; the splash covers both.
 */
export class BootScene extends Phaser.Scene {
  private initPromise!: Promise<PromiseSettledResult<void>[]>
  private loadingText?: Phaser.GameObjects.Text
  private loadingTrack?: Phaser.GameObjects.Graphics
  private loadingBar?: Phaser.GameObjects.Rectangle

  constructor() {
    super('Boot')
  }

  init(): void {
    const services = getServices()
    this.initPromise = Promise.allSettled([services.platform.init(), services.ads.init()])
  }

  preload(): void {
    const services = getServices()
    const viewport = readViewport(this)
    const { width, height } = viewport
    const theme = services.theme
    const assets = services.def.assets
    const assetCount =
      (assets?.images?.length ?? 0) + (assets?.audio?.length ?? 0) + (assets?.json?.length ?? 0)

    this.cameras.main.setBackgroundColor(theme.bg)
    const backdrop = this.add.graphics()
    if (services.def.backdrop) services.def.backdrop(backdrop, viewport, theme)
    else this.drawFallbackBackdrop(backdrop, width, height)

    const titleLogo = services.def.titleLogo?.(this)
    if (titleLogo) {
      const scale = Math.min(1, (width * 0.62) / titleLogo.width)
      titleLogo.container.setPosition(width / 2, height / 2 - 130).setScale(scale)
    } else {
      const titleStyle = displayTextStyle(theme, 84, cssColor(theme.accent), true, 8, 8)
      titleStyle.stroke = cssColor(theme.accentInk)
      this.add
        .text(width / 2, height / 2 - 110, services.i18n.t('game.title'), titleStyle)
        .setOrigin(0.5)
    }

    if (assetCount > 0) {
      this.loadingText = this.add
        .text(
          width / 2,
          height / 2 + 46,
          services.i18n.t('core.loading'),
          textStyle(theme, 24, theme.textMuted),
        )
        .setOrigin(0.5)

      this.loadingTrack = this.add.graphics()
      this.loadingTrack.fillStyle(theme.surface, 1)
      this.loadingTrack.fillRoundedRect(width / 2 - BAR_WIDTH / 2, height / 2 + 6, BAR_WIDTH, 16, 8)
      this.loadingTrack.lineStyle(1, theme.borderSoft, 1)
      this.loadingTrack.strokeRoundedRect(
        width / 2 - BAR_WIDTH / 2,
        height / 2 + 6,
        BAR_WIDTH,
        16,
        8,
      )

      this.loadingBar = this.add
        .rectangle(width / 2 - BAR_WIDTH / 2 + 4, height / 2 + 14, 0, 8, theme.accentInk)
        .setOrigin(0, 0.5)

      this.load.on('progress', (value: number) => {
        this.loadingBar?.setSize(Math.max(0, BAR_WIDTH * value - 8), 8)
      })
    }

    for (const image of assets?.images ?? []) this.load.image(image.key, image.url)
    for (const audio of assets?.audio ?? []) this.load.audio(audio.key, audio.urls)
    for (const json of assets?.json ?? []) this.load.json(json.key, json.url)
  }

  create(): void {
    const services = getServices()

    this.loadingText?.destroy()
    this.loadingTrack?.destroy()
    this.loadingBar?.destroy()

    void (async () => {
      const results = await this.initPromise
      for (const result of results) {
        if (result.status === 'rejected') {
          console.warn('[boot] SDK init failed, continuing without it', result.reason)
        }
      }
      services.syncPlatformLang()
      services.platform.loadingFinished()
      this.scene.start(services.def.menuScene ?? 'Menu')
    })()
  }

  private drawFallbackBackdrop(
    background: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
  ): void {
    const theme = getServices().theme
    const bands = 28
    for (let index = 0; index < bands; index += 1) {
      background.fillStyle(mixColor(theme.bg, theme.bgAlt, index / (bands - 1)), 1)
      background.fillRect(0, (index * height) / bands, width, height / bands + 1)
    }

    background.fillStyle(theme.accentWarm, 0.32)
    background.fillCircle(width * 0.82, height * 0.16, 96)
    background.fillStyle(theme.accentWarm, 0.9)
    background.fillCircle(width * 0.82, height * 0.16, 48)

    background.fillStyle(theme.highlight, 0.55)
    background.fillCircle(width * 0.16, height * 0.22, 34)
    background.fillCircle(width * 0.22, height * 0.22, 26)
    background.fillRoundedRect(width * 0.1, height * 0.22, width * 0.2, 30, 15)
  }
}
