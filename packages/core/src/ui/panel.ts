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
  const radius = theme.radius
  panel.fillStyle(theme.shadow, 0.1)
  panel.fillRoundedRect(x + 2, y + 6, width, height, radius)
  panel.fillStyle(theme.panel, alpha)
  panel.fillRoundedRect(x, y, width, height, radius)
  panel.lineStyle(1, theme.borderSoft, alpha)
  panel.strokeRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, radius)
  scene.add.existing(panel)
  return panel
}
