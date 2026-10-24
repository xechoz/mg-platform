import { createGame } from '@mg/core'
import { gameI18n } from './i18n'
import { PlaceholderScene } from './scenes/PlaceholderScene'

createGame({
  id: '__NAME__',
  design: { base: 720 },
  backgroundColor: 0x0b1020,
  defaultLang: 'zh',
  i18n: gameI18n,
  menuScene: 'Menu',
  scenes: [PlaceholderScene],
})
