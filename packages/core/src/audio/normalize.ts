/** Highest absolute sample value across channels; 0 for silence. */
export function peakAmplitude(channels: readonly Float32Array[]): number {
  let peak = 0
  for (const channel of channels) {
    for (const value of channel) peak = Math.max(peak, Math.abs(value))
  }
  return peak
}

export interface PeakTarget {
  /** Ceiling for the loudest sample, in dBFS. */
  peakDb?: number
  /** Upper bound for quiet files, so noise and room tone are not blown up. */
  maxBoostDb?: number
}

/**
 * Gain that lifts a sample's peak to `peakDb`, without boosting quiet files past
 * `maxBoostDb`. Peaks are the right target for one-shot effects: they are short,
 * so RMS would mostly measure the silence around them.
 */
export function peakNormalizationGain(
  peak: number,
  { peakDb = -1, maxBoostDb = 18 }: PeakTarget = {},
): number {
  if (!(peak > 0)) return 0
  const toTarget = 10 ** (peakDb / 20) / peak
  return Math.min(toTarget, 10 ** (maxBoostDb / 20))
}
