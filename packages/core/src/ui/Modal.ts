import Phaser from 'phaser'
import { Button, type ButtonVariant } from './Button'
import type { Theme } from './theme'
import { cssColor, textStyle } from './theme'

export interface ModalAction {
  label: string
  variant?: ButtonVariant
  onClick: () => void
}

export interface ModalOptions {
  title: string
  /** Large accent value between the title and the body, e.g. a final score. */
  hero?: string
  body?: string
  actions?: ModalAction[]
  width?: number
  height?: number
  actionsLayout?: 'row' | 'column'
  actionWidth?: number
  actionHeight?: number
  actionFontSize?: number
  titleFontSize?: number
  heroFontSize?: number
  bodyFontSize?: number
}

export class Modal extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, theme: Theme, options: ModalOptions) {
    super(scene, 0, 0)

    const screenWidth = scene.cameras.main.width
    const screenHeight = scene.cameras.main.height
    const width = options.width ?? 520
    const height = options.height ?? 300
    const left = screenWidth / 2 - width / 2
    const top = screenHeight / 2 - height / 2

    const backdrop = new Phaser.GameObjects.Rectangle(
      scene,
      0,
      0,
      screenWidth,
      screenHeight,
      theme.overlay,
      0.72,
    )
    backdrop.setOrigin(0)
    backdrop.setInteractive()

    const panel = new Phaser.GameObjects.Graphics(scene)
    panel.fillStyle(0x000000, 0.3)
    panel.fillRoundedRect(left + 3, top + 6, width, height, theme.radius + 4)
    panel.fillStyle(theme.panel, 1)
    panel.fillRoundedRect(left, top, width, height, theme.radius + 4)
    panel.lineStyle(1, theme.panelStroke, 1)
    panel.strokeRoundedRect(left, top, width, height, theme.radius + 4)

    const title = new Phaser.GameObjects.Text(
      scene,
      screenWidth / 2,
      top + 34,
      options.title,
      textStyle(theme, options.titleFontSize ?? 28, cssColor(theme.accent), true),
    ).setOrigin(0.5, 0)

    this.add([backdrop, panel, title])

    let contentBottom = title.y + title.height
    if (options.hero) {
      const hero = new Phaser.GameObjects.Text(
        scene,
        screenWidth / 2,
        contentBottom + 8,
        options.hero,
        textStyle(theme, options.heroFontSize ?? 64, cssColor(theme.accent), true),
      ).setOrigin(0.5, 0)
      this.add(hero)
      contentBottom = hero.y + hero.height
    }

    if (options.body) {
      const body = new Phaser.GameObjects.Text(
        scene,
        screenWidth / 2,
        contentBottom + 16,
        options.body,
        {
          ...textStyle(theme, options.bodyFontSize ?? 18, theme.text),
          align: 'center',
          lineSpacing: 8,
          wordWrap: { width: width - 72 },
        },
      ).setOrigin(0.5, 0)
      this.add(body)
    }

    const actions = options.actions ?? []
    if (actions.length > 0) {
      const layout = options.actionsLayout ?? 'row'
      const actionFontSize = options.actionFontSize ?? (layout === 'column' ? 26 : 20)

      if (layout === 'column') {
        const actionWidth = options.actionWidth ?? width - 80
        const actionHeight = options.actionHeight ?? 88
        const gap = 16
        const total = actions.length * actionHeight + (actions.length - 1) * gap
        const startY = top + height - 40 - total + actionHeight / 2

        actions.forEach((action, index) => {
          const button = new Button(
            scene,
            screenWidth / 2,
            startY + index * (actionHeight + gap),
            action.label,
            theme,
            {
              width: actionWidth,
              height: actionHeight,
              variant: action.variant ?? 'primary',
              fontSize: actionFontSize,
              onClick: () => {
                this.close()
                action.onClick()
              },
            },
          )
          this.add(button)
        })
      } else {
        const buttonWidth = options.actionWidth ?? (actions.length > 2 ? 150 : 180)
        const buttonHeight = options.actionHeight ?? 50
        const gap = 14
        const total = actions.length * buttonWidth + (actions.length - 1) * gap
        const startX = screenWidth / 2 - total / 2 + buttonWidth / 2

        actions.forEach((action, index) => {
          const button = new Button(
            scene,
            startX + index * (buttonWidth + gap),
            top + height - buttonHeight / 2 - 27,
            action.label,
            theme,
            {
              width: buttonWidth,
              height: buttonHeight,
              variant: action.variant ?? 'primary',
              fontSize: actionFontSize,
              onClick: () => {
                this.close()
                action.onClick()
              },
            },
          )
          this.add(button)
        })
      }
    }

    this.setDepth(1000)
    this.setAlpha(0)
    scene.add.existing(this)
    scene.tweens.add({ targets: this, alpha: 1, duration: 140, ease: 'Quad.out' })
  }

  close(): void {
    if (!this.active) return
    this.destroy(true)
  }
}
