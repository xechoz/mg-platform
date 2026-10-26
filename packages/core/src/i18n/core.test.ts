import type { Lang } from '@mg/platform'
import { describe, expect, it } from 'vitest'
import { coreI18n } from './core'

const LANGS: Lang[] = ['en', 'fr', 'it', 'de', 'es', 'tr', 'zh', 'ja', 'ko', 'pt', 'ru']

describe('core i18n', () => {
  it('has the same keys in every language', () => {
    const expected = Object.keys(coreI18n.en).sort()
    for (const lang of LANGS) {
      expect(Object.keys(coreI18n[lang]).sort(), lang).toEqual(expected)
    }
  })

  it('has no empty strings', () => {
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(coreI18n[lang])) {
        expect(value.trim(), `${lang}.${key}`).not.toBe('')
      }
    }
  })
})
