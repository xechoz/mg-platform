import Phaser from 'phaser'
import { readViewport } from '../app/layout'
import { Button, type ButtonDecoration, type ButtonVariant } from './Button'
import type { IconName } from './icons'
import { cssColor, displayTextStyle, type Theme, textStyle } from './theme'

export interface ModalAction {
  label: string
  variant?: ButtonVariant
  icon?: IconName
  decoration?: ButtonDecoration
  /** Per-action height; only used by the column layout. */
  height?: number
  fontSize?: number
  /** Keep the modal open while an async action runs (e.g. a rewarded ad). */
  closeOnClick?: boolean
  /** Label shown while the action's promise is pending. */
  loadingLabel?: string
  onClick: () => void | Promise<void>
}

export interface ModalOptions {
  title: string
  /** Draw the accent pill behind the title. Set false for a plain heading. */
  titleRibbon?: boolean
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
  /** Space between actions in a row or column layout. Defaults to 20. */
  actionGap?: number
  titleFontSize?: number
  heroFontSize?: number
  bodyFontSize?: number
}

export class Modal extends Phaser.GameObjects.Container {
  /**
   * The body text, when one was requested. Scenes can anchor decorations to it
   * (e.g. a record crown on the first line). Coordinates are local to the card.
   */
  readonly bodyText?: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, theme: Theme, options: ModalOptions) {
    super(scene, 0, 0)

    const viewport = readViewport(scene)
    const screenWidth = viewport.width
    const screenHeight = viewport.height
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

    const showRibbon = options.titleRibbon ?? true
    const titleSize = options.titleFontSize ?? 28
    const title = new Phaser.GameObjects.Text(
      scene,
      0,
      0,
      options.title,
      textStyle(theme, titleSize, showRibbon ? cssColor(theme.onAccent) : theme.text, true),
    ).setOrigin(0.5)
    const titleBlockHeight = Math.round(titleSize * 1.55)
    const titleY = -height / 2 + 24 + titleBlockHeight / 2

    if (showRibbon) {
      const ribbonWidth = Math.min(width - 40, title.width + Math.round(titleSize * 1.8))
      const ribbon = new Phaser.GameObjects.Graphics(scene)
      ribbon.fillStyle(theme.accent, 1)
      ribbon.fillRoundedRect(
        -ribbonWidth / 2,
        -titleBlockHeight / 2,
        ribbonWidth,
        titleBlockHeight,
        titleBlockHeight / 2,
      )
      ribbon.setPosition(0, titleY)
      card.add(ribbon)
    }
    title.setPosition(0, titleY - 2)
    card.add(title)

    let contentBottom = titleY + titleBlockHeight / 2
    if (options.hero) {
      const hero = new Phaser.GameObjects.Text(
        scene,
        0,
        contentBottom + 12,
        options.hero,
        displayTextStyle(
          theme,
          options.heroFontSize ?? 64,
          cssColor(theme.accentInk),
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
        ...textStyle(theme, options.bodyFontSize ?? 30, theme.text),
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: width - 72 },
      }).setOrigin(0.5, 0)
      card.add(body)
      this.bodyText = body
    }

    const actions = options.actions ?? []
    if (actions.length > 0) {
      const layout = options.actionsLayout ?? 'row'
      const actionFontSize = options.actionFontSize ?? 26

      if (layout === 'column') {
        const actionWidth = Math.min(options.actionWidth ?? width - 80, width - 48)
        const gap = options.actionGap ?? 20
        const heights = actions.map((action) => action.height ?? options.actionHeight ?? 84)
        const total =
          heights.reduce((sum, actionHeight) => sum + actionHeight, 0) + (actions.length - 1) * gap
        let top = height / 2 - 36 - total

        actions.forEach((action, index) => {
          const actionHeight = heights[index] ?? 84
          const button = new Button(scene, 0, top + actionHeight / 2, action.label, theme, {
            width: actionWidth,
            height: actionHeight,
            variant: action.variant ?? 'primary',
            fontSize: action.fontSize ?? actionFontSize,
            icon: action.icon,
            decoration: action.decoration,
            onClick: () => {},
          })
          button.setOnClick(() => this.runAction(button, action))
          card.add(button)
          top += actionHeight + gap
        })
      } else {
        const gap = options.actionGap ?? 20
        const buttonWidth = Math.min(
          options.actionWidth ?? (actions.length > 2 ? 150 : 180),
          Math.floor((width - 48 - (actions.length - 1) * gap) / actions.length),
        )
        const total = actions.length * buttonWidth + (actions.length - 1) * gap
        const startX = -total / 2 + buttonWidth / 2

        actions.forEach((action, index) => {
          const buttonHeight = action.height ?? options.actionHeight ?? 50
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
              fontSize: action.fontSize ?? actionFontSize,
              icon: action.icon,
              decoration: action.decoration,
              onClick: () => {},
            },
          )
          button.setOnClick(() => this.runAction(button, action))
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

  private runAction(button: Button, action: ModalAction): void {
    const closeOnClick = action.closeOnClick !== false
    const result = action.onClick()

    if (!(result instanceof Promise)) {
      if (closeOnClick) this.close()
      return
    }

    // The action may close this modal (and destroy its buttons) before
    // returning its promise, e.g. resuming a game closes the pause dialog
    // synchronously before waiting for an interstitial.
    if (!this.active || !button.active) return

    const originalLabel = action.label
    button.setEnabled(false)
    if (action.loadingLabel) button.setText(action.loadingLabel)
    if (closeOnClick) this.close()

    const restore = (): void => {
      if (!this.active || !button.active) return
      button.setEnabled(true)
      button.setText(originalLabel)
    }
    void result.then(restore, restore)
  }
}
