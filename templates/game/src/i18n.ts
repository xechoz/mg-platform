import type { Dictionary, Lang } from '@mg/core'

const en = {
  'game.title': '__TITLE__',
  'game.subtitle': 'Template scene · start building your game',
}

export const gameI18n: Record<Lang, Dictionary> = {
  en,
  fr: en,
  it: en,
  de: en,
  es: en,
  tr: en,
  zh: {
    'game.title': '__TITLE__',
    'game.subtitle': '模板场景 · 开始实现你的玩法',
  },
  ja: en,
  ko: en,
  pt: en,
  ru: en,
}
