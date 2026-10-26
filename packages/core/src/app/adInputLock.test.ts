import { describe, expect, it } from 'vitest'
import { bindAdInputLock } from './adInputLock'

function createAds(initial: boolean) {
  let active = initial
  const listeners = new Set<(value: boolean) => void>()

  return {
    ads: {
      get active(): boolean {
        return active
      },
      onChange(listener: (value: boolean) => void): () => void {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    },
    setActive(value: boolean): void {
      active = value
      for (const listener of listeners) listener(value)
    },
    get listenerCount(): number {
      return listeners.size
    },
  }
}

describe('bindAdInputLock', () => {
  it('disables input when an ad is already active', () => {
    const input = { enabled: true }
    const fake = createAds(true)

    bindAdInputLock(input, fake.ads)

    expect(input.enabled).toBe(false)
  })

  it('follows ad active changes in both directions', () => {
    const input = { enabled: true }
    const fake = createAds(false)

    bindAdInputLock(input, fake.ads)
    expect(input.enabled).toBe(true)

    fake.setActive(true)
    expect(input.enabled).toBe(false)

    fake.setActive(false)
    expect(input.enabled).toBe(true)
  })

  it('unsubscribes from the ad service', () => {
    const input = { enabled: true }
    const fake = createAds(false)
    const unbind = bindAdInputLock(input, fake.ads)

    unbind()
    fake.setActive(true)

    expect(fake.listenerCount).toBe(0)
    expect(input.enabled).toBe(true)
  })
})
