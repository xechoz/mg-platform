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
  panel.fillStyle(theme.shadow, 0.16)
  panel.fillRoundedRect(x + 2, y + 9, width, height, radius)
  panel.fillStyle(theme.ink, 1)
  panel.fillRoundedRect(x - 3, y - 3, width + 6, height + 6, radius + 3)
  panel.fillStyle(theme.panel, alpha)
  panel.fillRoundedRect(x, y, width, height, radius)
  panel.fillStyle(theme.highlight, 0.18)
  panel.fillRoundedRect(x + 12, y + 8, width - 24, 10, 5)
  scene.add.existing(panel)
  return panel
}
