export interface Theme {
  font: string
  bg: number
  board: number
  boardAlt: number
  boardLine: number
  accent: number
  accentHover: number
  accentText: string
  text: string
  textMuted: string
  panel: number
  panelStroke: number
  danger: number
  dangerHover: number
  overlay: number
  radius: number
}

export const defaultTheme: Theme = {
  font: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  bg: 0x0b1020,
  board: 0x101a2e,
  boardAlt: 0x0e1729,
  boardLine: 0x1b2a45,
  accent: 0x34d399,
  accentHover: 0x6ee7b7,
  accentText: '#04211a',
  text: '#e8eefc',
  textMuted: '#8b9bb4',
  panel: 0x151f36,
  panelStroke: 0x26385c,
  danger: 0xd9534f,
  dangerHover: 0xef6b66,
  overlay: 0x05070d,
  radius: 14,
}

export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

export function textStyle(
  theme: Theme,
  size: number,
  color: string = theme.text,
  bold = false,
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: theme.font,
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal',
  }
}
