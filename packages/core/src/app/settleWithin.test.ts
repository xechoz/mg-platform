import { afterEach, describe, expect, it, vi } from 'vitest'
import { settlesWithin } from './settleWithin'

afterEach(() => {
  vi.useRealTimers()
})

describe('settlesWithin', () => {
  it('resolves true as soon as the promise settles', async () => {
    vi.useFakeTimers()
    let resolvePromise!: () => void
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })

    const result = settlesWithin(promise, 1000)
    resolvePromise()

    await expect(result).resolves.toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('resolves false at the deadline while the promise keeps running', async () => {
    vi.useFakeTimers()
    let finished = false
    const promise = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      finished = true
    })()

    const result = settlesWithin(promise, 1000)
    await vi.advanceTimersByTimeAsync(1000)

    await expect(result).resolves.toBe(false)
    expect(finished).toBe(false)

    await vi.advanceTimersByTimeAsync(4000)
    expect(finished).toBe(true)
  })

  it('treats rejection as settled', async () => {
    vi.useFakeTimers()
    const promise = Promise.reject(new Error('sdk failed'))
    const result = settlesWithin(promise, 1000)

    await expect(result).resolves.toBe(true)
  })
})
