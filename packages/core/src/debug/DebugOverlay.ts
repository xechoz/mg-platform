import Phaser from 'phaser'
import { cssColor, type Theme, textStyle } from '../ui/theme'

export class DebugOverlay {
  private readonly text: Phaser.GameObjects.Text
  private frames = 0
  private elapsed = 0
  private fps = 0

  constructor(scene: Phaser.Scene, theme: Theme) {
    this.text = new Phaser.GameObjects.Text(
      scene,
      8,
      6,
      '',
      textStyle(theme, 14, cssColor(theme.accentHover)),
    ).setDepth(2000)
    scene.add.existing(this.text)
  }

  update(delta: number, info: string): void {
    this.frames += 1
    this.elapsed += delta
    if (this.elapsed >= 500) {
      this.fps = Math.round((this.frames * 1000) / this.elapsed)
      this.frames = 0
      this.elapsed = 0
    }
    this.text.setText(`FPS ${this.fps}  ${info}`)
  }
}
