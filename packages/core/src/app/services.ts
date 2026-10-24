import type { Lang, PlatformAdapter } from '@mg/platform'
import { createPlatform } from '@mg/platform'
import type Phaser from 'phaser'
import { AudioManager } from '../audio/AudioManager'
import { coreI18n } from '../i18n/core'
import { type Dictionary, I18n, resolveLang } from '../i18n/I18n'
import { SaveStore, type SaveStoreOptions } from '../storage/SaveStore'
import { SettingsStore } from '../storage/settings'
import { defaultTheme, type Theme } from '../ui/theme'

export interface GameDefinition {
  id: string
  design: { width: number; height: number }
  scenes: Phaser.Types.Scenes.SceneType[]
  i18n: Record<Lang, Dictionary>
  menuScene?: string
  backgroundColor?: number
  defaultLang?: Lang
  theme?: Partial<Theme>
  debug?: boolean
  assets?: {
    images?: Array<{ key: string; url: string }>
    audio?: Array<{ key: string; urls: string | string[] }>
    json?: Array<{ key: string; url: string }>
  }
}

export interface SaveConfig<T> extends Omit<SaveStoreOptions<T>, 'key'> {
  name: string
}

export interface GameServices {
  readonly def: GameDefinition
  readonly theme: Theme
  readonly i18n: I18n
  readonly settings: SettingsStore
  readonly audio: AudioManager
  readonly platform: PlatformAdapter
  readonly params: URLSearchParams
  readonly debug: boolean
  createSave<T>(config: SaveConfig<T>): SaveStore<T>
  setSound(enabled: boolean): void
  setLang(lang: Lang): void
}

let current: GameServices | null = null

export function createServices(def: GameDefinition): GameServices {
  const theme: Theme = {
    ...defaultTheme,
    ...(def.backgroundColor !== undefined ? { bg: def.backgroundColor } : {}),
    ...def.theme,
  }
  const params = new URLSearchParams(window.location.search)
  const defaultLang = def.defaultLang ?? 'zh'
  const settings = new SettingsStore(defaultLang)
  const i18n = new I18n(mergeI18n(coreI18n, def.i18n), defaultLang)
  const lang = resolveLang(params, settings.value.lang, defaultLang)
  i18n.setLang(lang)
  if (settings.value.lang !== lang) settings.update({ lang })

  const platformKind = import.meta.env.VITE_PLATFORM === 'poki' ? 'poki' : 'dev'
  const audio = new AudioManager(settings.value.sound)

  const services: GameServices = {
    def,
    theme,
    i18n,
    settings,
    audio,
    platform: createPlatform(platformKind),
    params,
    debug: def.debug === true || params.has('debug'),
    createSave<T>(config: SaveConfig<T>): SaveStore<T> {
      return new SaveStore<T>({
        key: `mg:${def.id}:${config.name}`,
        version: config.version,
        initial: config.initial,
        migrate: config.migrate,
      })
    },
    setSound(enabled: boolean): void {
      settings.update({ sound: enabled })
      audio.setEnabled(enabled)
      if (enabled) audio.unlock()
    },
    setLang(next: Lang): void {
      settings.update({ lang: next })
      i18n.setLang(next)
      document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'
      document.title = `${i18n.t('game.title')} · Mini Games`
      const hint = document.querySelector('.mg-rotate-hint')
      if (hint) hint.textContent = i18n.t('core.rotate')
    },
  }

  current = services
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  document.title = `${i18n.t('game.title')} · Mini Games`
  return services
}

export function getServices(): GameServices {
  if (!current) throw new Error('Game services are not initialized. Call createGame() first.')
  return current
}

function mergeI18n(
  core: Record<Lang, Dictionary>,
  game: Record<Lang, Dictionary>,
): Record<Lang, Dictionary> {
  return {
    zh: { ...core.zh, ...game.zh },
    en: { ...core.en, ...game.en },
  }
}
