import type { Lang } from '@mg/platform'
import { describe, expect, it } from 'vitest'
import { type Dictionary, I18n, resolveLang } from './I18n'

const dictionaries: Record<Lang, Dictionary> = {
  en: { greet: 'Hello, {name}', onlyEn: 'English' },
  fr: {},
  it: {},
  de: {},
  es: {},
  tr: {},
  zh: { greet: '你好，{name}', onlyZh: '中文' },
  ja: {},
  ko: {},
  pt: {},
  ru: {},
}

describe('I18n', () => {
  it('translates and interpolates parameters', () => {
    const i18n = new I18n(dictionaries, 'zh')
    expect(i18n.t('greet', { name: '小明' })).toBe('你好，小明')
  })

  it('switches language', () => {
    const i18n = new I18n(dictionaries, 'zh')
    i18n.setLang('en')
    expect(i18n.t('greet', { name: 'Ada' })).toBe('Hello, Ada')
  })

  it('falls back to English and then to the key', () => {
    const i18n = new I18n(dictionaries, 'fr')
    expect(i18n.t('onlyEn')).toBe('English')
    expect(i18n.t('missing')).toBe('missing')
  })
})

describe('resolveLang', () => {
  it('prefers the URL parameter', () => {
    expect(resolveLang(new URLSearchParams('?lang=de'), 'fr', 'en', 'ja')).toBe('de')
  })

  it('uses the stored language next', () => {
    expect(resolveLang(new URLSearchParams(), 'fr', 'en', 'ja')).toBe('fr')
  })

  it('uses host detection before the fallback', () => {
    expect(resolveLang(new URLSearchParams(), undefined, 'en', 'ja')).toBe('ja')
  })

  it('falls back when nothing matches', () => {
    expect(resolveLang(new URLSearchParams(), undefined, 'en')).toBe('en')
  })

  it('ignores invalid URL values', () => {
    expect(resolveLang(new URLSearchParams('?lang=xx'), undefined, 'en', 'pt')).toBe('pt')
  })

  it('accepts every supported language from the URL', () => {
    for (const lang of ['en', 'fr', 'it', 'de', 'es', 'tr', 'zh', 'ja', 'ko', 'pt', 'ru']) {
      expect(resolveLang(new URLSearchParams(`?lang=${lang}`), undefined, 'en')).toBe(lang)
    }
  })
})
