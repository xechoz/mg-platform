import { describe, expect, it } from 'vitest'
import {
  computeCanvasSize,
  computeRenderMetrics,
  computeRenderScale,
  MAX_CANVAS_EDGE,
  MAX_RENDER_SCALE,
} from './renderMetrics'

describe('computeRenderScale', () => {
  it('renders a 3x phone at its native resolution', () => {
    expect(computeRenderScale(390, 844, 720, 1558, 3)).toBeCloseTo(1.625, 5)
  })

  it('renders 1080p at 1.5x because the design short side is 720', () => {
    expect(computeRenderScale(1920, 1080, 1280, 720, 1)).toBe(1.5)
  })

  it('renders 4K at 3x', () => {
    expect(computeRenderScale(3840, 2160, 1280, 720, 1)).toBe(3)
  })

  it('caps the backing scale at 3', () => {
    expect(computeRenderScale(7680, 4320, 1280, 720, 1)).toBe(MAX_RENDER_SCALE)
  })

  it('never renders below one backing pixel per design unit', () => {
    expect(computeRenderScale(640, 360, 1280, 720, 1)).toBe(1)
  })

  it('keeps an ultrawide 5K canvas within the edge budget', () => {
    const scale = computeRenderScale(5120, 2880, 1872, 720, 1)
    expect(scale).toBeCloseTo(MAX_CANVAS_EDGE / 1872, 5)
    expect(computeCanvasSize(1872, 720, scale).width).toBeLessThanOrEqual(MAX_CANVAS_EDGE)
  })

  it('falls back to one for invalid input', () => {
    expect(computeRenderScale(0, 0, 1280, 720, 3)).toBe(1)
    expect(computeRenderScale(390, 844, 720, 1558, Number.NaN)).toBeCloseTo(1, 5)
  })
})

describe('computeRenderMetrics', () => {
  it('produces a native 3x phone canvas and keeps design sizes separate', () => {
    const metrics = computeRenderMetrics(390, 844, 720, 1558, 3)

    expect(metrics.canvasWidth).toBe(1170)
    expect(metrics.canvasHeight).toBe(2532)
    expect(metrics.scaleX).toBeCloseTo(1.625, 5)
    expect(metrics.scaleY).toBeCloseTo(2532 / 1558, 5)
    expect(metrics.textResolution).toBeCloseTo(2532 / 1558, 5)
  })

  it('produces a native 4K canvas', () => {
    const metrics = computeRenderMetrics(3840, 2160, 1280, 720, 1)

    expect(metrics.canvasWidth).toBe(3840)
    expect(metrics.canvasHeight).toBe(2160)
    expect(metrics.scaleX).toBe(3)
    expect(metrics.scaleY).toBe(3)
  })

  it('rounds canvas dimensions to whole pixels', () => {
    expect(computeCanvasSize(720, 1558, 1.625)).toEqual({ width: 1170, height: 2532 })
  })
})
