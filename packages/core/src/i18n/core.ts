import type { Dictionary } from './I18n'

export const coreI18n: Record<'zh' | 'en', Dictionary> = {
  zh: {
    'core.tapToStart': '开始',
    'core.loading': '加载中…',
    'core.soundOn': '音效：开',
    'core.soundOff': '音效：关',
    'core.language': '语言',
    'core.ad.watch': '看广告',
    'core.ad.loading': '广告加载中…',
  },
  en: {
    'core.tapToStart': 'Start',
    'core.loading': 'Loading…',
    'core.soundOn': 'Sound on',
    'core.soundOff': 'Sound off',
    'core.language': 'Language',
    'core.ad.watch': 'Watch ad',
    'core.ad.loading': 'Loading ad…',
  },
}
