import { describe, expect, it } from 'vitest'
import { peakAmplitude, peakNormalizationGain } from './normalize'

const peakDb = (amplitude: number) => 20 * Math.log10(amplitude)

describe('peakAmplitude', () => {
  it('finds the loudest sample across channels', () => {
    const left = Float32Array.from([0.1, -0.3, 0])
    const right = Float32Array.from([0.05, 0.4, -0.2])
    expect(peakAmplitude([left, right])).toBeCloseTo(0.4, 6)
  })

  it('returns zero for silence and empty buffers', () => {
    expect(peakAmplitude([new Float32Array(8)])).toBe(0)
    expect(peakAmplitude([])).toBe(0)
  })
})

describe('peakNormalizationGain', () => {
  it('lifts a quiet sample to the -1 dBFS ceiling', () => {
    const gain = peakNormalizationGain(0.5)
    expect(peakDb(0.5 * gain)).toBeCloseTo(-1, 6)
  })

  it('attenuates samples that decode above full scale', () => {
    const gain = peakNormalizationGain(1.5)
    expect(gain).toBeLessThan(1)
    expect(peakDb(1.5 * gain)).toBeCloseTo(-1, 6)
  })

  it('caps the boost so noise and room tone stay quiet', () => {
    const gain = peakNormalizationGain(0.001)
    expect(peakDb(gain)).toBeCloseTo(18, 6)
  })

  it('leaves silent buffers alone', () => {
    expect(peakNormalizationGain(0)).toBe(0)
  })
})
