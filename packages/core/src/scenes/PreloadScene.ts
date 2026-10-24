import Phaser from 'phaser'
import { getServices } from '../app/services'
import { cssColor, textStyle } from '../ui/theme'

const BAR_WIDTH = 320

/**
 * Loads the game's asset manifest, then shows a tap gate. The tap is required
 * to unlock audio on iOS, so this scene exists in every game.
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
      .text(width / 2, height / 2 - 80, services.i18n.t('game.title'), {
        ...textStyle(theme, 44, theme.text, true),
        align: 'center',
      })
      .setOrigin(0.5)

    if (assetCount > 0) {
      this.loadingText = this.add
        .text(
          width / 2,
          height / 2 + 76,
          services.i18n.t('core.loading'),
          textStyle(theme, 16, theme.textMuted),
        )
        .setOrigin(0.5)

      this.add.rectangle(width / 2, height / 2 + 40, BAR_WIDTH, 8, theme.panelStroke).setOrigin(0.5)

      const bar = this.add
        .rectangle(width / 2 - BAR_WIDTH / 2, height / 2 + 40, 0, 8, theme.accent)
        .setOrigin(0, 0.5)

      this.load.on('progress', (value: number) => {
        bar.setSize(BAR_WIDTH * value, 8)
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
        height / 2 + 76,
        services.i18n.t('core.tapToStart'),
        textStyle(theme, 20, cssColor(theme.accent), true),
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
      services.audio.unlock()
      services.audio.play('start')
      this.scene.start(services.def.menuScene ?? 'Menu')
    }

    this.input.once('pointerdown', start)
    this.input.keyboard?.once('keydown', start)
  }
}
