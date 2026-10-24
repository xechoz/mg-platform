import Phaser from 'phaser'
import { maybeEnterFullscreen } from '../app/fullscreen'
import { getServices } from '../app/services'
import { cssColor, textStyle } from '../ui/theme'

const BAR_WIDTH = 420

/**
 * Loads the game's asset manifest, then shows a tap gate. The tap unlocks
 * audio on iOS and is the earliest gesture available for entering fullscreen.
 */
export class PreloadScene extends Phaser.Scene {
  private loadingText?: Phaser.GameObjects.Text

  constructor() {
    super('Preload')
  }

  preload(): void {
    const services = getServices()
    const { width, height } = this.cameras.main
    const theme = services.theme
    const assets = services.def.assets
    const assetCount =
      (assets?.images?.length ?? 0) + (assets?.audio?.length ?? 0) + (assets?.json?.length ?? 0)

    this.cameras.main.setBackgroundColor(theme.bg)

    this.add
      .text(width / 2, height / 2 - 100, services.i18n.t('game.title'), {
        ...textStyle(theme, 72, theme.text, true),
        align: 'center',
      })
      .setOrigin(0.5)

    if (assetCount > 0) {
      this.loadingText = this.add
        .text(
          width / 2,
          height / 2 + 86,
          services.i18n.t('core.loading'),
          textStyle(theme, 24, theme.textMuted),
        )
        .setOrigin(0.5)

      this.add
        .rectangle(width / 2, height / 2 + 42, BAR_WIDTH, 10, theme.panelStroke)
        .setOrigin(0.5)

      const bar = this.add
        .rectangle(width / 2 - BAR_WIDTH / 2, height / 2 + 42, 0, 10, theme.accent)
        .setOrigin(0, 0.5)

      this.load.on('progress', (value: number) => {
        bar.setSize(BAR_WIDTH * value, 10)
      })
    }

    for (const image of assets?.images ?? []) this.load.image(image.key, image.url)
    for (const audio of assets?.audio ?? []) this.load.audio(audio.key, audio.urls)
    for (const json of assets?.json ?? []) this.load.json(json.key, json.url)
  }

  create(): void {
    const services = getServices()
    const { width, height } = this.cameras.main
    const theme = services.theme

    this.loadingText?.destroy()
    services.platform.loadingFinished()

    const prompt = this.add
      .text(
        width / 2,
        height / 2 + 86,
        services.i18n.t('core.tapToStart'),
        textStyle(theme, 30, cssColor(theme.accent), true),
      )
      .setOrigin(0.5)

    this.tweens.add({
      targets: prompt,
      alpha: { from: 1, to: 0.35 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })

    const start = (): void => {
      maybeEnterFullscreen(this.scale)
      services.audio.unlock()
      services.audio.play('start')
      this.scene.start(services.def.menuScene ?? 'Menu')
    }

    // Phaser requires pointerup (not pointerdown) for fullscreen on touch devices.
    this.input.once('pointerup', start)
    this.input.keyboard?.once('keydown', start)
  }
}
