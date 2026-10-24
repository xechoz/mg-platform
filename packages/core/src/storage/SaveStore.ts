export interface SaveStoreOptions<T> {
  key: string
  version: number
  initial: () => T
  migrate?: (data: unknown, fromVersion: number) => T | null
}

const memoryFallback = new Map<string, string>()

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return memoryFallback.get(key) ?? null
  }
}

function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    memoryFallback.set(key, value)
  }
}

interface Envelope<T> {
  version: number
  data: T
}

/**
 * Versioned, per-game persistent state. Storage failures (private mode,
 * restricted iframe) fall back to memory instead of crashing the game.
 */
export class SaveStore<T> {
  private readonly options: SaveStoreOptions<T>
  private cache: T | null = null

  constructor(options: SaveStoreOptions<T>) {
    this.options = options
  }

  read(): T {
    if (this.cache !== null) return this.cache

    const raw = readRaw(this.options.key)
    if (raw === null) {
      this.cache = this.options.initial()
      return this.cache
    }

    try {
      const parsed = JSON.parse(raw) as Partial<Envelope<unknown>>
      if (typeof parsed.version !== 'number') throw new Error('Missing version')
      if (parsed.version === this.options.version) {
        this.cache = parsed.data as T
        return this.cache
      }
      const migrated = this.options.migrate?.(parsed.data, parsed.version)
      this.cache = migrated ?? this.options.initial()
    } catch {
      this.cache = this.options.initial()
    }
    return this.cache
  }

  write(value: T): void {
    this.cache = value
    writeRaw(this.options.key, JSON.stringify({ version: this.options.version, data: value }))
  }

  update(fn: (current: T) => T): T {
    const next = fn(this.read())
    this.write(next)
    return next
  }

  reset(): T {
    const value = this.options.initial()
    this.write(value)
    return value
  }
}
