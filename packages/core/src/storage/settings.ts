import { isLang, type Lang } from '@mg/platform'
import { SaveStore } from './SaveStore'

export interface Settings {
  sound: boolean
  lang: Lang
  /** True only after the player explicitly picked a language. */
  langChosen: boolean
}

const SETTINGS_VERSION = 2

/**
 * Old settings always stored a language, but could not distinguish a real
 * choice from the game default. Treat them as explicit so existing players
 * keep the language they are used to.
 */
export function migrateSettings(
  data: unknown,
  fromVersion: number,
  defaultLang: Lang,
): Settings | null {
  if (fromVersion !== 1) return null
  const old = (data ?? {}) as Partial<Settings>
  return {
    sound: typeof old.sound === 'boolean' ? old.sound : true,
    lang: isLang(old.lang) ? old.lang : defaultLang,
    langChosen: true,
  }
}

export class SettingsStore {
  private readonly store: SaveStore<Settings>

  constructor(defaultLang: Lang) {
    this.store = new SaveStore<Settings>({
      key: 'mg:settings:v1',
      version: SETTINGS_VERSION,
      initial: () => ({ sound: true, lang: defaultLang, langChosen: false }),
      migrate: (data, fromVersion) => migrateSettings(data, fromVersion, defaultLang),
    })
  }

  get value(): Settings {
    return this.store.read()
  }

  update(patch: Partial<Settings>): Settings {
    return this.store.update((current) => ({ ...current, ...patch }))
  }
}
