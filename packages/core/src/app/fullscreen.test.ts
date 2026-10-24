import { describe, expect, it } from 'vitest'
import { type FullscreenPolicy, shouldAutoFullscreen } from './fullscreen'

const mobile: FullscreenPolicy = {
  available: true,
  embedded: false,
  standalone: false,
  mobile: true,
}

describe('shouldAutoFullscreen', () => {
  it('enters on a mobile browser', () => {
    expect(shouldAutoFullscreen(mobile)).toBe(true)
  })

  it('stays windowed when the API is unavailable', () => {
    expect(shouldAutoFullscreen({ ...mobile, available: false })).toBe(false)
  })

  it('stays windowed inside an iframe', () => {
    expect(shouldAutoFullscreen({ ...mobile, embedded: true })).toBe(false)
  })

  it('stays windowed when already installed', () => {
    expect(shouldAutoFullscreen({ ...mobile, standalone: true })).toBe(false)
  })

  it('stays windowed on desktop', () => {
    expect(shouldAutoFullscreen({ ...mobile, mobile: false })).toBe(false)
  })
})
