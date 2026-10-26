import { createGame } from '@mg/core'
import { gameColors } from './colors'
import { gameI18n } from './i18n'
import { PlaceholderScene } from './scenes/PlaceholderScene'

createGame({
  id: '__NAME__',
  design: { base: 720 },
  theme: gameColors.theme,
  defaultLang: 'en',
  i18n: gameI18n,
  menuScene: 'Menu',
  scenes: [PlaceholderScene],
})
