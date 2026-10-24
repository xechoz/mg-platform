import Phaser from 'phaser'
import { maybeEnterFullscreen } from '../app/fullscreen'
import { readViewport } from '../app/layout'
import { getServices } from '../app/services'
import { drawIcon } from '../ui/icons'
import { cssColor, displayTextStyle, mixColor, textStyle } from '../ui/theme'

const BAR_WIDTH = 360

/**
 * Loads the game's asset manifest, then shows a tap gate. The tap unlocks
 * audio on iOS and is the earliest gesture available for entering fullscreen.
 */
export class PreloadScene extends Phaser.Scene {
  private loadingText?: Phaser.GameObjects.Text
  private loadingTrack?: Phaser.GameObjects.Graphics
  private loadingBar?: Phaser.GameObjects.Rectangle

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
    const backdrop = this.add.graphics()
    if (services.def.backdrop) services.def.backdrop(backdrop, readViewport(this), theme)
    else this.drawFallbackBackdrop(backdrop, width, height)

    const titleStyle = displayTextStyle(theme, 84, cssColor(theme.accent), true, 8, 8)
    titleStyle.stroke = cssColor(theme.accentInk)
    this.add
      .text(width / 2, height / 2 - 110, services.i18n.t('game.title'), titleStyle)
      .setOrigin(0.5)

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
    const { width, height } = this.cameras.main
    const theme = services.theme

    this.loadingText?.destroy()
    this.loadingTrack?.destroy()
    this.loadingBar?.destroy()
    services.platform.loadingFinished()

    const card = this.add.container(width / 2, height / 2 + 80)
    const panel = this.add.graphics()
    panel.fillStyle(theme.shadow, 0.18)
    panel.fillRoundedRect(-140, -36, 284, 84, 42)
    panel.fillStyle(theme.ink, 1)
    panel.fillRoundedRect(-145, -45, 290, 90, 45)
    panel.fillStyle(theme.surface, 1)
    panel.fillRoundedRect(-142, -42, 284, 84, 42)
    panel.fillStyle(theme.highlight, 0.22)
    panel.fillRoundedRect(-126, -34, 252, 10, 5)

    const playBase = this.add.graphics()
    playBase.fillStyle(theme.accent, 1)
    playBase.fillCircle(-37, 0, 24)
    playBase.lineStyle(3, theme.ink, 1)
    playBase.strokeCircle(-37, 0, 24)

    const playIcon = this.add.graphics()
    playIcon.setPosition(-37, 0)
    drawIcon(playIcon, 'play', 26, theme.onAccent)

    const prompt = this.add
      .text(34, 0, services.i18n.t('core.tapToStart'), textStyle(theme, 28, theme.text, true))
      .setOrigin(0.5)

    card.add([panel, playBase, playIcon, prompt])
    card.setAlpha(0)
    this.tweens.add({ targets: card, alpha: 1, duration: 260, ease: 'Quad.out' })
    this.tweens.add({
      targets: card,
      y: height / 2 + 72,
      duration: 1100,
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
