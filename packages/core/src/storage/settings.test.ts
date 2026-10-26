import { describe, expect, it } from 'vitest'
import { migrateSettings } from './settings'

describe('migrateSettings', () => {
  it('keeps v1 sound and language and marks the language as chosen', () => {
    expect(migrateSettings({ sound: false, lang: 'fr' }, 1, 'en')).toEqual({
      sound: false,
      lang: 'fr',
      langChosen: true,
    })
  })

  it('repairs an invalid legacy language', () => {
    expect(migrateSettings({ sound: true, lang: 'xx' }, 1, 'en')).toEqual({
      sound: true,
      lang: 'en',
      langChosen: true,
    })
  })

  it('ignores unknown versions', () => {
    expect(migrateSettings({ sound: true, lang: 'en' }, 3, 'en')).toBeNull()
  })
})
