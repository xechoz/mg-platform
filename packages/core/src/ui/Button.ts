import Phaser from 'phaser'
import { drawIcon, type IconName } from './icons'
import { cssColor, mixColor, type Theme, textStyle } from './theme'

export type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger'

/**
 * Optional art layered above the button face and below the label. The factory
 * receives the button's design size and returns a GameObject added as a child,
 * so decorations follow hover, press and enable state automatically.
 */
export type ButtonDecoration = (
  scene: Phaser.Scene,
  size: { readonly width: number; readonly height: number },
) => Phaser.GameObjects.GameObject

export interface ButtonOptions {
  width?: number
  height?: number
  variant?: ButtonVariant
  fontSize?: number
  icon?: IconName
  decoration?: ButtonDecoration
  onClick: () => void
}

interface VariantStyle {
  /** Ink outline width. Zero means the control sits back from the sticker layer. */
  outline: number
  /** Extra thickness under the face, the chunky arcade lip. */
  lip: number
  shadowAlpha: number
  shadowOffset: number
  /** Top gloss strength. */
  gloss: number
  /** Draw a quiet 1px edge instead of an ink outline. */
  softEdge: boolean
}

const VARIANT_STYLES: Record<ButtonVariant, VariantStyle> = {
  primary: {
    outline: 3,
    lip: 6,
    shadowAlpha: 0.16,
    shadowOffset: 10,
    gloss: 0.12,
    softEdge: false,
  },
  danger: { outline: 3, lip: 6, shadowAlpha: 0.16, shadowOffset: 10, gloss: 0.12, softEdge: false },
  soft: { outline: 0, lip: 0, shadowAlpha: 0.1, shadowOffset: 4, gloss: 0, softEdge: true },
  ghost: { outline: 0, lip: 0, shadowAlpha: 0, shadowOffset: 0, gloss: 0, softEdge: false },
}

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
    if (options.decoration) {
      children.push(
        options.decoration(scene, { width: this.buttonWidth, height: this.buttonHeight }),
      )
    }
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
    if (this.variant === 'primary') return cssColor(this.theme.onAccent)
    if (this.variant === 'danger') return cssColor(this.theme.onDanger)
    return this.theme.text
  }

  private iconColor(): number {
    if (this.variant === 'primary') return this.theme.onAccent
    if (this.variant === 'danger') return this.theme.onDanger
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
    const style = VARIANT_STYLES[this.variant]
    const width = this.buttonWidth
    const height = this.buttonHeight
    const radius = Math.min(this.theme.radius, height / 2)
    const press = this.pressOffset()
    const lip = this.pressed ? Math.max(0, style.lip - 2) : style.lip
    const face = this.faceColor()

    this.background.clear()

    if (style.shadowAlpha > 0) {
      const offset = Math.max(2, style.shadowOffset - (this.pressed ? 4 : 0))
      this.background.fillStyle(this.theme.shadow, style.shadowAlpha)
      this.background.fillRoundedRect(-width / 2, -height / 2 + offset, width, height, radius)
    }

    if (style.outline > 0) {
      this.background.fillStyle(this.theme.ink, 1)
      this.background.fillRoundedRect(
        -width / 2 - style.outline,
        -height / 2 - style.outline + press,
        width + style.outline * 2,
        height + lip + style.outline * 2,
        radius + style.outline,
      )
    }

    if (lip > 0) {
      this.background.fillStyle(mixColor(face, this.theme.ink, 0.26), 1)
      this.background.fillRoundedRect(-width / 2, -height / 2 + lip + press, width, height, radius)
    }

    if (this.variant === 'ghost') {
      this.background.fillStyle(this.theme.ink, this.hovered ? 0.08 : 0.04)
      this.background.fillRoundedRect(-width / 2, -height / 2, width, height, radius)
    } else {
      this.background.fillStyle(face, 1)
      this.background.fillRoundedRect(-width / 2, -height / 2 + press, width, height, radius)
    }

    if (style.softEdge) {
      const border = this.hovered
        ? mixColor(this.theme.borderSoft, this.theme.ink, 0.3)
        : this.theme.borderSoft
      this.background.lineStyle(1, border, 1)
      this.background.strokeRoundedRect(
        -width / 2 + 0.5,
        -height / 2 + 0.5 + press,
        width - 1,
        height - 1,
        radius,
      )
    }

    if (style.gloss > 0) {
      this.background.fillStyle(this.theme.highlight, style.gloss)
      this.background.fillRoundedRect(
        -width / 2 + 10,
        -height / 2 + 7 + press,
        width - 20,
        Math.max(6, height * 0.14),
        Math.max(4, radius * 0.45),
      )
    }

    this.layoutContent()
  }

  /** Pressing sinks the face into its lip; it never scales the outline. */
  private pressOffset(): number {
    if (!this.pressed) return 0
    return VARIANT_STYLES[this.variant].lip > 0 ? 3 : 1
  }

  private layoutContent(): void {
    const offset = this.pressOffset()
    const icon = this.iconGraphics
    const name = this.iconName
    if (!icon || !name) {
      this.label.setPosition(0, offset)
      return
    }

    const iconSize = Math.round(this.fontSize * 1.02)
    if (this.label.text.length === 0) {
      icon.setPosition(0, offset)
      drawIcon(icon, name, iconSize, this.iconColor())
      return
    }

    const gap = Math.round(this.fontSize * 0.3)
    const groupWidth = iconSize + gap + this.label.width
    const left = -groupWidth / 2
    icon.setPosition(left + iconSize / 2, offset)
    this.label.setPosition(left + iconSize + gap + this.label.width / 2, offset)
    drawIcon(icon, name, iconSize, this.iconColor())
  }
}
