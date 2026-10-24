import { describe, expect, it } from 'vitest'
import { computeDesignSize } from './designSize'

describe('computeDesignSize', () => {
  it('keeps the reference 16:9 design on desktop', () => {
    expect(computeDesignSize(1920, 1080, 720)).toEqual({
      width: 1280,
      height: 720,
      orientation: 'landscape',
    })
  })

  it('extends the long side on phone landscape instead of letterboxing', () => {
    expect(computeDesignSize(844, 390, 720)).toEqual({
      width: 1558,
      height: 720,
      orientation: 'landscape',
    })
  })

  it('flips to a portrait design space when the viewport is taller than wide', () => {
    expect(computeDesignSize(390, 844, 720)).toEqual({
      width: 720,
      height: 1558,
      orientation: 'portrait',
    })
  })

  it('treats square viewports as landscape', () => {
    expect(computeDesignSize(1000, 1000, 720)).toEqual({
      width: 720,
      height: 720,
      orientation: 'landscape',
    })
  })

  it('clamps absurd aspect ratios', () => {
    expect(computeDesignSize(200, 1000, 720)).toEqual({
      width: 720,
      height: 1895,
      orientation: 'portrait',
    })
    expect(computeDesignSize(4000, 1000, 720)).toEqual({
      width: 1872,
      height: 720,
      orientation: 'landscape',
    })
  })

  it('never divides by zero', () => {
    const size = computeDesignSize(0, 0, 720)
    expect(size.width).toBeGreaterThan(0)
    expect(size.height).toBeGreaterThan(0)
    expect(Number.isFinite(size.width)).toBe(true)
    expect(Number.isFinite(size.height)).toBe(true)
  })
})
