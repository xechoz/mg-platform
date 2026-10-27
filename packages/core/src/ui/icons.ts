import Phaser from 'phaser'

export type IconName =
  | 'play'
  | 'soundOn'
  | 'soundOff'
  | 'globe'
  | 'pause'
  | 'star'
  | 'home'
  | 'restart'
  | 'video'
  | 'bag'

/**
 * Tiny procedural icon set. Keeps the bundle asset-free while still giving
 * buttons a game-like silhouette. Icons are drawn centred on the origin.
 */
export function drawIcon(
  graphics: Phaser.GameObjects.Graphics,
  name: IconName,
  size: number,
  color: number,
  clear = true,
): void {
  const half = size / 2
  const line = Math.max(2, size * 0.09)

  if (clear) graphics.clear()
  graphics.fillStyle(color, 1)
  graphics.lineStyle(line, color, 1)

  switch (name) {
    case 'play':
      graphics.fillTriangle(-half * 0.4, -half * 0.58, -half * 0.4, half * 0.58, half * 0.62, 0)
      break
    case 'pause':
      graphics.fillRoundedRect(-half * 0.52, -half * 0.62, half * 0.34, half * 1.24, half * 0.1)
      graphics.fillRoundedRect(half * 0.18, -half * 0.62, half * 0.34, half * 1.24, half * 0.1)
      break
    case 'soundOn':
      drawSpeaker(graphics, half)
      graphics.beginPath()
      graphics.arc(half * 0.16, 0, half * 0.36, -0.72, 0.72)
      graphics.strokePath()
      graphics.beginPath()
      graphics.arc(half * 0.16, 0, half * 0.62, -0.72, 0.72)
      graphics.strokePath()
      break
    case 'soundOff':
      drawSpeaker(graphics, half)
      graphics.lineBetween(half * 0.04, -half * 0.36, half * 0.56, half * 0.36)
      graphics.lineBetween(half * 0.56, -half * 0.36, half * 0.04, half * 0.36)
      break
    case 'globe':
      graphics.strokeCircle(0, 0, half * 0.62)
      graphics.strokeEllipse(0, 0, half * 0.64, half * 1.24)
      graphics.lineBetween(-half * 0.62, 0, half * 0.62, 0)
      graphics.lineBetween(-half * 0.48, -half * 0.34, half * 0.48, -half * 0.34)
      graphics.lineBetween(-half * 0.48, half * 0.34, half * 0.48, half * 0.34)
      break
    case 'star': {
      const points: Phaser.Math.Vector2[] = []
      for (let index = 0; index < 10; index += 1) {
        const radius = index % 2 === 0 ? half * 0.68 : half * 0.32
        const angle = -Math.PI / 2 + (index * Math.PI) / 5
        points.push(new Phaser.Math.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius))
      }
      graphics.fillPoints(points, true)
      break
    }
    case 'home':
      graphics.fillTriangle(-half * 0.64, -half * 0.04, 0, -half * 0.62, half * 0.64, -half * 0.04)
      graphics.fillRoundedRect(-half * 0.48, -half * 0.04, half * 0.96, half * 0.58, half * 0.08)
      break
    case 'restart': {
      const radius = half * 0.54
      graphics.beginPath()
      graphics.arc(0, 0, radius, -Math.PI * 0.72, Math.PI * 0.58)
      graphics.strokePath()
      const angle = Math.PI * 0.58
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      graphics.fillTriangle(
        x + half * 0.16,
        y + half * 0.12,
        x - half * 0.18,
        y + half * 0.14,
        x + half * 0.03,
        y - half * 0.22,
      )
      break
    }
    case 'bag':
      graphics.strokeRoundedRect(-half * 0.72, -half * 0.34, half * 1.44, half * 1.16, half * 0.18)
      graphics.beginPath()
      graphics.arc(0, -half * 0.34, half * 0.3, Math.PI, Math.PI * 2)
      graphics.strokePath()
      break
    case 'video':
      graphics.lineStyle(line, color, 1)
      graphics.strokeRoundedRect(-half * 0.74, -half * 0.5, half * 1.48, half * 1.0, half * 0.16)
      graphics.fillStyle(color, 1)
      graphics.fillTriangle(-half * 0.12, -half * 0.26, -half * 0.12, half * 0.26, half * 0.34, 0)
      break
  }
}

function drawSpeaker(graphics: Phaser.GameObjects.Graphics, half: number): void {
  graphics.fillRoundedRect(-half * 0.62, -half * 0.22, half * 0.4, half * 0.44, half * 0.08)
  graphics.fillPoints(
    [
      new Phaser.Math.Vector2(-half * 0.24, -half * 0.22),
      new Phaser.Math.Vector2(half * 0.2, -half * 0.52),
      new Phaser.Math.Vector2(half * 0.2, half * 0.52),
      new Phaser.Math.Vector2(-half * 0.24, half * 0.22),
    ],
    true,
  )
}
