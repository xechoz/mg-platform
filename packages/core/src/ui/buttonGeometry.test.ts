import { describe, expect, it } from 'vitest'
import { LIP_SIDE_INSET } from './buttonGeometry'

describe('buttonGeometry', () => {
  it('insets the lip past its worst side wedge', () => {
    // Offset stadiums cross with a wedge ~lip²/(2r) wide; 6-unit lip and a
    // 12-unit compact face radius is the worst production case.
    for (const [lip, r] of [
      [6, 12],
      [6, 17],
      [6, 31],
      [6, 48],
      [4, 12],
    ] as const) {
      expect((lip * lip) / (2 * r)).toBeLessThan(LIP_SIDE_INSET)
    }
  })
})
