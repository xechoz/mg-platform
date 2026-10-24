import Phaser from 'phaser'
import type { Theme } from './theme'

export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: Theme,
  alpha = 1,
): Phaser.GameObjects.Graphics {
  const panel = new Phaser.GameObjects.Graphics(scene)
  panel.fillStyle(0x000000, 0.18)
  panel.fillRoundedRect(x + 2, y + 5, width, height, theme.radius)
  panel.fillStyle(theme.panel, alpha)
  panel.fillRoundedRect(x, y, width, height, theme.radius)
  panel.lineStyle(1, theme.panelStroke, 1)
  panel.strokeRoundedRect(x, y, width, height, theme.radius)
  scene.add.existing(panel)
  return panel
}
