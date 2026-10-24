import Phaser from 'phaser'
import { drawIcon, type IconName } from './icons'
import { mixColor, type Theme, textStyle } from './theme'

export type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger'

export interface ButtonOptions {
  width?: number
  height?: number
  variant?: ButtonVariant
  fontSize?: number
  icon?: IconName
  onClick: () => void
}

const OUTLINE = 3

export class Button extends Phaser.GameObjects.Container {
  private readonly theme: Theme
  private readonly background: Phaser.GameObjects.Graphics
  private readonly label: Phaser.GameObjects.Text
  private readonly zone: Phaser.GameObjects.Zone
  private readonly buttonWidth: number
  private readonly buttonHeight: number
  private readonly fontSize: number
  private readonly variant: ButtonVariant
  private readonly iconGraphics?: Phaser.GameObjects.Graphics
  private iconName?: IconName
  private enabled = true
  private hovered = false
  private pressed = false
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
    this.fontSize = options.fontSize ?? 20
    this.variant = options.variant ?? 'primary'
    this.iconName = options.icon
    this.onClickHandler = options.onClick

    this.background = new Phaser.GameObjects.Graphics(scene)
    this.label = new Phaser.GameObjects.Text(
      scene,
      0,
      0,
      text,
      textStyle(theme, this.fontSize, this.labelColor(), true),
    ).setOrigin(0.5)

    if (options.icon) {
      this.iconGraphics = new Phaser.GameObjects.Graphics(scene)
    }

    this.zone = new Phaser.GameObjects.Zone(scene, 0, 8, this.buttonWidth, this.buttonHeight + 12)
    this.zone.setInteractive({ useHandCursor: true })

    const children: Phaser.GameObjects.GameObject[] = [this.background]
    if (this.iconGraphics) children.push(this.iconGraphics)
    children.push(this.label, this.zone)
    this.add(children)
    this.redraw()

    const canHover = window.matchMedia('(hover: hover)').matches
    this.zone.on('pointerover', () => {
      if (!canHover) return
      this.hovered = true
      this.redraw()
      scene.tweens.add({ targets: this, scale: 1.02, duration: 90, ease: 'Quad.out' })
    })
    this.zone.on('pointerout', () => {
      this.hovered = false
      this.cancelPress()
      this.redraw()
      scene.tweens.add({ targets: this, scale: 1, duration: 90, ease: 'Quad.out' })
    })
    this.zone.on('pointerupoutside', () => this.cancelPress())
    this.zone.on('pointerdown', () => {
      this.pressed = true
      this.redraw()
      scene.tweens.add({ targets: this, scale: 0.98, duration: 60, ease: 'Quad.out' })
    })
    this.zone.on('pointerup', () => {
      if (!this.enabled || !this.pressed) return
      this.pressed = false
      this.redraw()
      scene.tweens.add({ targets: this, scale: this.hovered ? 1.02 : 1, duration: 90 })
      this.onClickHandler()
    })

    scene.add.existing(this)
  }

  setText(text: string): this {
    this.label.setText(text)
    this.layoutContent()
    return this
  }

  setIcon(icon: IconName): this {
    if (!this.iconGraphics) return this
    this.iconName = icon
    this.redraw()
    return this
  }

  setOnClick(handler: () => void): this {
    this.onClickHandler = handler
    return this
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled
    this.pressed = false
    this.setAlpha(enabled ? 1 : 0.45)
    if (enabled) this.zone.setInteractive({ useHandCursor: true })
    else this.zone.disableInteractive()
    return this
  }

  private cancelPress(): void {
    if (!this.pressed) return
    this.pressed = false
    this.redraw()
    this.scene.tweens.add({ targets: this, scale: this.hovered ? 1.02 : 1, duration: 90 })
  }

  private labelColor(): string {
    if (this.variant === 'primary') return this.theme.accentText
    if (this.variant === 'danger') return '#fff9ec'
    return this.theme.text
  }

  private iconColor(): number {
    if (this.variant === 'danger') return 0xfff9ec
    return this.theme.ink
  }

  private faceColor(): number {
    switch (this.variant) {
      case 'primary':
        return this.hovered ? this.theme.accentHover : this.theme.accent
      case 'danger':
        return this.hovered ? this.theme.dangerHover : this.theme.danger
      case 'soft':
        return this.hovered ? this.theme.surfaceAlt : this.theme.surface
      case 'ghost':
        return this.hovered ? this.theme.surface : this.theme.panel
    }
  }

  private redraw(): void {
    const width = this.buttonWidth
    const height = this.buttonHeight
    const radius = Math.min(this.theme.radius, height / 2)
    const lip = this.pressed ? 2 : 6
    const face = this.faceColor()
    const lipColor = mixColor(face, this.theme.ink, this.variant === 'soft' ? 0.1 : 0.26)

    this.background.clear()
    this.background.fillStyle(this.theme.shadow, 0.16)
    this.background.fillRoundedRect(
      -width / 2,
      -height / 2 + (this.pressed ? 4 : 10),
      width,
      height,
      radius,
    )
    this.background.fillStyle(this.theme.ink, 1)
    this.background.fillRoundedRect(
      -width / 2 - OUTLINE,
      -height / 2 - OUTLINE,
      width + OUTLINE * 2,
      height + lip + OUTLINE * 2,
      radius + OUTLINE,
    )
    this.background.fillStyle(lipColor, 1)
    this.background.fillRoundedRect(-width / 2, -height / 2 + lip, width, height, radius)
    this.background.fillStyle(face, this.variant === 'ghost' ? 0.82 : 1)
    this.background.fillRoundedRect(-width / 2, -height / 2, width, height, radius)
    this.background.fillStyle(0xffffff, 0.16)
    this.background.fillRoundedRect(
      -width / 2 + 10,
      -height / 2 + 7,
      width - 20,
      Math.max(6, height * 0.14),
      Math.max(4, radius * 0.45),
    )

    this.layoutContent()
  }

  private layoutContent(): void {
    const offset = this.pressed ? 3 : 0
    const icon = this.iconGraphics
    const name = this.iconName
    if (!icon || !name) {
      this.label.setPosition(0, offset)
      return
    }

    const iconSize = Math.round(this.fontSize * 1.02)
    const gap = Math.round(this.fontSize * 0.3)
    const groupWidth = iconSize + gap + this.label.width
    const left = -groupWidth / 2
    icon.setPosition(left + iconSize / 2, offset)
    this.label.setPosition(left + iconSize + gap + this.label.width / 2, offset)
    drawIcon(icon, name, iconSize, this.iconColor())
  }
}
