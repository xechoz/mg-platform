import type { Lang } from '@mg/platform'
import { SaveStore } from './SaveStore'

export interface Settings {
  sound: boolean
  lang: Lang
}

export class SettingsStore {
  private readonly store: SaveStore<Settings>

  constructor(defaultLang: Lang) {
    this.store = new SaveStore<Settings>({
      key: 'mg:settings:v1',
      version: 1,
      initial: () => ({ sound: true, lang: defaultLang }),
    })
  }

  get value(): Settings {
    return this.store.read()
  }

  update(patch: Partial<Settings>): Settings {
    return this.store.update((current) => ({ ...current, ...patch }))
  }
}
