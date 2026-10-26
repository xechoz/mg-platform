import { describe, expect, it } from 'vitest'
import { KEYBOARD_CAPTURE } from './keyboardCapture'

describe('KEYBOARD_CAPTURE', () => {
  it('captures arrow keys and space so the host page cannot scroll', () => {
    expect([...KEYBOARD_CAPTURE]).toEqual([32, 37, 38, 39, 40])
  })
})
