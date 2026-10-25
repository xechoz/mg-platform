import type { Lang } from '@mg/platform'

export {
  type AdActiveListener,
  type AdAudio,
  AdService,
  type AdStats,
  type RewardedOutcome,
} from './ads/AdService'
export { createGame } from './app/createGame'
export { computeDesignSize, type DesignSize } from './app/designSize'
export {
  type FullscreenPolicy,
  isEmbedded,
  isMobileDevice,
  isStandalone,
  maybeEnterFullscreen,
  shouldAutoFullscreen,
} from './app/fullscreen'
export {
  type LayoutListener,
  onLayoutChange,
  readViewport,
  type Viewport,
} from './app/layout'
export { onAppHidden } from './app/lifecycle'
export { type Insets, NO_INSETS, readSafeAreaInsets, safeAreaInDesign } from './app/safeArea'
export {
  createServices,
  type GameDefinition,
  type GameServices,
  getServices,
  type SaveConfig,
} from './app/services'
export { installResponsiveViewport } from './app/viewport'
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
export { drawIcon, type IconName } from './ui/icons'
export { Modal, type ModalAction, type ModalOptions } from './ui/Modal'
export { createPanel } from './ui/panel'
export { RewardedButton, type RewardedButtonOptions } from './ui/RewardedButton'
export { type RewardOfferOptions, rewardOfferActions } from './ui/rewardOfferActions'
export {
  cssColor,
  defaultTheme,
  displayTextStyle,
  mixColor,
  type Theme,
  textStyle,
} from './ui/theme'
export type { Lang }
