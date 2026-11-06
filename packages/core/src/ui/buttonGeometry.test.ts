import { describe, expect, it } from 'vitest'
import { glossMetrics, LIP_SIDE_INSET, shadowSteps } from './buttonGeometry'

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

describe('shadowSteps', () => {
  it('spreads the style alpha over near-to-far steps ending at the offset', () => {
    const steps = shadowSteps(10, 0.16)
    expect(steps).toHaveLength(3)
    expect(steps.map((step) => step.dy)).toEqual([4, 7, 10])
    const total = steps.reduce((sum, step) => sum + step.alpha, 0)
    expect(total).toBeCloseTo(0.16, 10)
    for (const step of steps) expect(step.alpha).toBeGreaterThan(0)
  })

  it('keeps the soft variant subtle', () => {
    const steps = shadowSteps(4, 0.1)
    expect(steps[2]?.dy).toBeCloseTo(4, 10)
    expect(steps.reduce((sum, step) => sum + step.alpha, 0)).toBeCloseTo(0.1, 10)
  })
})
