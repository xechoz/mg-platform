export interface Theme {
  font: string
  bg: number
  bgAlt: number
  board: number
  boardAlt: number
  ink: number
  accent: number
  accentHover: number
  accentAlt: number
  accentWarm: number
  accentInk: string
  /** Text and icon colour used on top of an accent fill. */
  onAccent: number
  text: string
  textMuted: string
  muted: number
  panel: number
  /** Quiet 1px edge for cards and secondary controls. Never use for text contrast. */
  borderSoft: number
  surface: number
  surfaceAlt: number
  danger: number
  dangerHover: number
  onDanger: number
  highlight: number
  overlay: number
  shadow: number
  radius: number
  radiusLarge: number
}

/**
 * Warm, high-contrast palette for a cheerful arcade look. Games can override
 * any token through `GameDefinition.theme` without touching the shared UI.
 */
export const defaultTheme: Theme = {
  font: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  bg: 0xbfeaff,
  bgAlt: 0xe8faef,
  board: 0xfff9ec,
  boardAlt: 0xeaf9e8,
  ink: 0x332b45,
  accent: 0x38bdf8,
  accentHover: 0x0ea5e9,
  accentAlt: 0x35c77e,
  accentWarm: 0xfff1b8,
  accentInk: '#0b7fae',
  onAccent: 0x332b45,
  text: '#332b45',
  textMuted: '#65627a',
  muted: 0x65627a,
  panel: 0xfff9ec,
  borderSoft: 0xd2d0d6,
  surface: 0xffffff,
  surfaceAlt: 0xfff3d9,
  danger: 0xe8504a,
  dangerHover: 0xf26b64,
  onDanger: 0xfff9ec,
  highlight: 0xffffff,
  overlay: 0x2a2038,
  shadow: 0x332b45,
  radius: 18,
  radiusLarge: 28,
}

export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

export function mixColor(from: number, to: number, t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  const channel = (shift: number): number => {
    const start = (from >> shift) & 0xff
    const end = (to >> shift) & 0xff
    return Math.round(start + (end - start) * clamped)
  }
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
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

/** Chunky display text with an ink outline and a soft hard shadow. */
export function displayTextStyle(
  theme: Theme,
  size: number,
  color: string = theme.text,
  bold = true,
  stroke = Math.round(size * 0.07),
  shadowY = Math.round(size * 0.05),
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    ...textStyle(theme, size, color, bold),
    stroke: cssColor(theme.ink),
    strokeThickness: stroke,
    shadow: {
      offsetX: 0,
      offsetY: shadowY,
      color: 'rgba(51, 43, 69, 0.24)',
      blur: 0,
      stroke: false,
      fill: true,
    },
  }
}
