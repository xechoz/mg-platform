import Phaser from 'phaser'
import { Button, type ButtonVariant } from './Button'
import { cssColor, displayTextStyle, type Theme, textStyle } from './theme'

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

    const screenWidth = scene.scale.width
    const screenHeight = scene.scale.height
    const width = Math.min(options.width ?? 520, screenWidth - 48)
    const height = Math.min(options.height ?? 300, screenHeight - 48)
    const radius = theme.radiusLarge

    const backdrop = new Phaser.GameObjects.Rectangle(
      scene,
      0,
      0,
      screenWidth,
      screenHeight,
      theme.overlay,
      0.62,
    )
    backdrop.setOrigin(0)
    backdrop.setInteractive()
    backdrop.setAlpha(0)

    const card = new Phaser.GameObjects.Container(scene, screenWidth / 2, screenHeight / 2)
    card.setAlpha(0)
    card.setScale(0.92)

    const panel = new Phaser.GameObjects.Graphics(scene)
    panel.fillStyle(theme.shadow, 0.2)
    panel.fillRoundedRect(-width / 2 + 2, -height / 2 + 12, width, height, radius)
    panel.fillStyle(theme.panel, 1)
    panel.fillRoundedRect(-width / 2, -height / 2, width, height, radius)
    card.add(panel)

    const titleSize = options.titleFontSize ?? 28
    const title = new Phaser.GameObjects.Text(
      scene,
      0,
      0,
      options.title,
      textStyle(theme, titleSize, cssColor(theme.onAccent), true),
    ).setOrigin(0.5)
    const ribbonHeight = Math.round(titleSize * 1.55)
    const ribbonWidth = Math.min(width - 40, title.width + Math.round(titleSize * 1.8))
    const ribbonY = -height / 2 + 24 + ribbonHeight / 2

    const ribbon = new Phaser.GameObjects.Graphics(scene)
    ribbon.fillStyle(theme.accent, 1)
    ribbon.fillRoundedRect(
      -ribbonWidth / 2,
      -ribbonHeight / 2,
      ribbonWidth,
      ribbonHeight,
      ribbonHeight / 2,
    )
    ribbon.setPosition(0, ribbonY)
    title.setPosition(0, ribbonY - 2)
    card.add([ribbon, title])

    let contentBottom = ribbonY + ribbonHeight / 2
    if (options.hero) {
      const hero = new Phaser.GameObjects.Text(
        scene,
        0,
        contentBottom + 12,
        options.hero,
        displayTextStyle(
          theme,
          options.heroFontSize ?? 64,
          cssColor(theme.accent),
          true,
          0,
          Math.round((options.heroFontSize ?? 64) * 0.05),
        ),
      ).setOrigin(0.5, 0)
      card.add(hero)
      contentBottom = hero.y + hero.height
    }

    if (options.body) {
      const body = new Phaser.GameObjects.Text(scene, 0, contentBottom + 14, options.body, {
        ...textStyle(theme, options.bodyFontSize ?? 18, theme.text),
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: width - 72 },
      }).setOrigin(0.5, 0)
      card.add(body)
    }

    const actions = options.actions ?? []
    if (actions.length > 0) {
      const layout = options.actionsLayout ?? 'row'
      const actionFontSize = options.actionFontSize ?? (layout === 'column' ? 26 : 20)

      if (layout === 'column') {
        const actionWidth = Math.min(options.actionWidth ?? width - 80, width - 48)
        const actionHeight = options.actionHeight ?? 84
        const gap = 14
        const total = actions.length * actionHeight + (actions.length - 1) * gap
        const startY = height / 2 - 36 - total + actionHeight / 2

        actions.forEach((action, index) => {
          const button = new Button(
            scene,
            0,
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
          card.add(button)
        })
      } else {
        const gap = 14
        const buttonWidth = Math.min(
          options.actionWidth ?? (actions.length > 2 ? 150 : 180),
          Math.floor((width - 48 - (actions.length - 1) * gap) / actions.length),
        )
        const buttonHeight = options.actionHeight ?? 50
        const total = actions.length * buttonWidth + (actions.length - 1) * gap
        const startX = -total / 2 + buttonWidth / 2

        actions.forEach((action, index) => {
          const button = new Button(
            scene,
            startX + index * (buttonWidth + gap),
            height / 2 - buttonHeight / 2 - 30,
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
          card.add(button)
        })
      }
    }

    this.add([backdrop, card])
    this.setDepth(1000)
    scene.add.existing(this)

    scene.tweens.add({ targets: backdrop, alpha: 0.62, duration: 160, ease: 'Quad.out' })
    scene.tweens.add({
      targets: card,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.out',
    })
  }

  close(): void {
    if (!this.active) return
    this.destroy(true)
  }
}
