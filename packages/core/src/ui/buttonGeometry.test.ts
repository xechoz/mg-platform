import { describe, expect, it } from 'vitest'
import { glossMetrics } from './buttonGeometry'

describe('glossMetrics', () => {
  it('clamps the gloss radius to half the gloss height', () => {
    // Phone-size menu button: face radius 48 would pinch the 13-unit gloss.
    const gloss = glossMetrics(96.1, 48.05)
    expect(gloss.h).toBeCloseTo(13.454, 10)
    expect(gloss.r).toBeCloseTo(gloss.h / 2, 10)
  })

  it('keeps the proportional radius on desktop sizes', () => {
    const gloss = glossMetrics(62, 31)
    expect(gloss.h).toBeCloseTo(8.68, 10)
    expect(gloss.r).toBeCloseTo(4.34, 10)
  })

  it('never overshoots on compact card buttons', () => {
    for (const height of [34, 46, 48, 54, 62, 96.1]) {
      const gloss = glossMetrics(height, height / 2)
      expect(gloss.r).toBeLessThanOrEqual(gloss.h / 2)
    }
  })
})
