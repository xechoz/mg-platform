import type { Lang } from '@mg/platform'

/** Native language names: never use flags for a language picker. */
export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
  es: 'Español',
  tr: 'Türkçe',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  pt: 'Português',
  ru: 'Русский',
}

export const LANG_SHORT: Record<Lang, string> = {
  en: 'EN',
  fr: 'FR',
  it: 'IT',
  de: 'DE',
  es: 'ES',
  tr: 'TR',
  zh: '中',
  ja: '日',
  ko: '한',
  pt: 'PT',
  ru: 'RU',
}

const HTML_LANG: Record<Lang, string> = {
  en: 'en',
  fr: 'fr',
  it: 'it',
  de: 'de',
  es: 'es',
  tr: 'tr',
  zh: 'zh-CN',
  ja: 'ja',
  ko: 'ko',
  pt: 'pt-BR',
  ru: 'ru',
}

export function htmlLang(lang: Lang): string {
  return HTML_LANG[lang]
}
