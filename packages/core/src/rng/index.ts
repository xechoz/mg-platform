/**
 * Deterministic RNG (mulberry32). Lives in its own subpath so pure game logic
 * can import it without pulling Phaser into unit tests.
 */
export interface Rng {
  next(): number
  int(maxExclusive: number): number
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive)

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('Cannot pick from an empty array')
    return items[int(items.length)] as T
  }

  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
      const j = int(i + 1)
      const tmp = result[i] as T
      result[i] = result[j] as T
      result[j] = tmp
    }
    return result
  }

  return { next, int, pick, shuffle }
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0
}
