import { afterEach, describe, expect, it, vi } from 'vitest'
import { SaveStore } from './SaveStore'

function fakeStorage(): Storage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SaveStore', () => {
  it('returns the initial value when storage is empty', () => {
    vi.stubGlobal('window', { localStorage: fakeStorage() })
    const store = new SaveStore({ key: 'test', version: 1, initial: () => ({ best: 0 }) })
    expect(store.read()).toEqual({ best: 0 })
  })

  it('persists values across store instances', () => {
    const storage = fakeStorage()
    vi.stubGlobal('window', { localStorage: storage })

    const first = new SaveStore({ key: 'test', version: 1, initial: () => ({ best: 0 }) })
    first.write({ best: 42 })

    const second = new SaveStore({ key: 'test', version: 1, initial: () => ({ best: 0 }) })
    expect(second.read()).toEqual({ best: 42 })
  })

  it('migrates older versions', () => {
    const storage = fakeStorage()
    storage.setItem('test', JSON.stringify({ version: 1, data: { score: 7 } }))
    vi.stubGlobal('window', { localStorage: storage })

    const store = new SaveStore({
      key: 'test',
      version: 2,
      initial: () => ({ best: 0 }),
      migrate: (data) => {
        const old = data as { score: number }
        return { best: old.score }
      },
    })
    expect(store.read()).toEqual({ best: 7 })
  })

  it('resets when the old version cannot be migrated', () => {
    const storage = fakeStorage()
    storage.setItem('test', JSON.stringify({ version: 1, data: { score: 7 } }))
    vi.stubGlobal('window', { localStorage: storage })

    const store = new SaveStore({ key: 'test', version: 2, initial: () => ({ best: 0 }) })
    expect(store.read()).toEqual({ best: 0 })
  })

  it('survives a throwing localStorage', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked')
      },
    })
    const store = new SaveStore({ key: 'blocked-test', version: 1, initial: () => ({ best: 1 }) })
    store.write({ best: 2 })
    expect(store.read()).toEqual({ best: 2 })
  })
})
