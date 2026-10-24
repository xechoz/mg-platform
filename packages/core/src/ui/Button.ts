import Phaser from 'phaser'
import type { Theme } from './theme'
import { textStyle } from './theme'

export type ButtonVariant = 'primary' | 'ghost' | 'danger'

export interface ButtonOptions {
  width?: number
  height?: number
  variant?: ButtonVariant
  fontSize?: number
  onClick: () => void
}

export class Button extends Phaser.GameObjects.Container {
  private readonly theme: Theme
  private readonly background: Phaser.GameObjects.Graphics
  private readonly label: Phaser.GameObjects.Text
  private readonly zone: Phaser.GameObjects.Zone
  private readonly buttonWidth: number
  private readonly buttonHeight: number
  private readonly variant: ButtonVariant
  private enabled = true
  private hovered = false
  private onClickHandler: () => void

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    theme: Theme,
    options: ButtonOptions,
  ) {
    super(scene, x, y)
    this.theme = theme
    this.buttonWidth = options.width ?? 220
    this.buttonHeight = options.height ?? 54
    this.variant = options.variant ?? 'primary'
    this.onClickHandler = options.onClick

    this.background = new Phaser.GameObjects.Graphics(scene)
    this.label = new Phaser.GameObjects.Text(
      scene,
      0,
      0,
      text,
      textStyle(theme, options.fontSize ?? 20, this.labelColor(), true),
    ).setOrigin(0.5)

    this.zone = new Phaser.GameObjects.Zone(scene, 0, 0, this.buttonWidth, this.buttonHeight)
    this.zone.setInteractive({ useHandCursor: true })

    this.add([this.background, this.label, this.zone])
    this.redraw()

    this.zone.on('pointerover', () => {
      this.hovered = true
      this.redraw()
      scene.tweens.add({ targets: this, scale: 1.03, duration: 90, ease: 'Quad.out' })
    })
    this.zone.on('pointerout', () => {
      this.hovered = false
      this.redraw()
      scene.tweens.add({ targets: this, scale: 1, duration: 90, ease: 'Quad.out' })
    })
    this.zone.on('pointerdown', () => {
      scene.tweens.add({ targets: this, scale: 0.97, duration: 60, ease: 'Quad.out' })
    })
    this.zone.on('pointerup', () => {
      if (!this.enabled) return
      scene.tweens.add({ targets: this, scale: this.hovered ? 1.03 : 1, duration: 90 })
      this.onClickHandler()
    })

    scene.add.existing(this)
  }

  setText(text: string): this {
    this.label.setText(text)
    return this
  }

  setOnClick(handler: () => void): this {
    this.onClickHandler = handler
    return this
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled
    this.setAlpha(enabled ? 1 : 0.45)
    if (enabled) this.zone.setInteractive({ useHandCursor: true })
    else this.zone.disableInteractive()
    return this
  }

  private labelColor(): string {
    return this.variant === 'primary' ? this.theme.accentText : this.theme.text
  }

  private redraw(): void {
    const radius = Math.min(this.theme.radius, this.buttonHeight / 2)
    const fill =
      this.variant === 'primary'
        ? this.hovered
          ? this.theme.accentHover
          : this.theme.accent
        : this.variant === 'danger'
          ? this.hovered
            ? this.theme.dangerHover
            : this.theme.danger
          : this.hovered
            ? this.theme.panelStroke
            : this.theme.panel

    this.background.clear()
    this.background.fillStyle(fill, 1)
    this.background.fillRoundedRect(
      -this.buttonWidth / 2,
      -this.buttonHeight / 2,
      this.buttonWidth,
      this.buttonHeight,
      radius,
    )

    if (this.variant === 'ghost') {
      this.background.lineStyle(1, this.theme.panelStroke, 1)
      this.background.strokeRoundedRect(
        -this.buttonWidth / 2,
        -this.buttonHeight / 2,
        this.buttonWidth,
        this.buttonHeight,
        radius,
      )
    }
  }
}
