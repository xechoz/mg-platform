import type { Dictionary } from './I18n'

export const coreI18n: Record<'zh' | 'en', Dictionary> = {
  zh: {
    'core.tapToStart': '开始',
    'core.loading': '加载中…',
    'core.soundOn': '音效：开',
    'core.soundOff': '音效：关',
    'core.language': '语言',
  },
  en: {
    'core.tapToStart': 'Start',
    'core.loading': 'Loading…',
    'core.soundOn': 'Sound on',
    'core.soundOff': 'Sound off',
    'core.language': 'Language',
  },
}
