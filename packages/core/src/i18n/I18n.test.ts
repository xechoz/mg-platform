import { describe, expect, it } from 'vitest'
import { I18n, resolveLang } from './I18n'

const dictionaries = {
  zh: { greet: '你好，{name}', onlyZh: '中文' },
  en: { greet: 'Hello, {name}' },
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

  it('falls back to zh and then to the key', () => {
    const i18n = new I18n(dictionaries, 'en')
    expect(i18n.t('onlyZh')).toBe('中文')
    expect(i18n.t('missing')).toBe('missing')
  })
})

describe('resolveLang', () => {
  it('prefers the URL parameter', () => {
    expect(resolveLang(new URLSearchParams('?lang=en'), 'zh', 'zh')).toBe('en')
  })

  it('uses the stored language next', () => {
    expect(resolveLang(new URLSearchParams(), 'en', 'zh')).toBe('en')
  })

  it('falls back to the game default', () => {
    expect(resolveLang(new URLSearchParams(), undefined, 'zh')).toBe('zh')
  })

  it('ignores invalid URL values', () => {
    expect(resolveLang(new URLSearchParams('?lang=fr'), 'en', 'zh')).toBe('en')
  })
})
