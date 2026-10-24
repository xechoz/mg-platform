import type { Lang } from '@mg/platform'

export { createGame } from './app/createGame'
export { onAppHidden } from './app/lifecycle'
export {
  createServices,
  type GameDefinition,
  type GameServices,
  getServices,
  type SaveConfig,
} from './app/services'
export { AudioManager, type SfxName } from './audio/AudioManager'
export { DebugOverlay } from './debug/DebugOverlay'
export { coreI18n } from './i18n/core'
export { type Dictionary, I18n, resolveLang } from './i18n/I18n'
export { createRng, type Rng, randomSeed } from './rng'
export { BootScene } from './scenes/BootScene'
export { PreloadScene } from './scenes/PreloadScene'
export { SaveStore, type SaveStoreOptions } from './storage/SaveStore'
export { type Settings, SettingsStore } from './storage/settings'
export { Button, type ButtonOptions, type ButtonVariant } from './ui/Button'
export { Modal, type ModalAction, type ModalOptions } from './ui/Modal'
export { createPanel } from './ui/panel'
export { cssColor, defaultTheme, type Theme, textStyle } from './ui/theme'
export type { Lang }
