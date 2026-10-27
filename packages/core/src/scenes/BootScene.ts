import Phaser from 'phaser'
import type { GameServices } from '../app/services'
import { getServices } from '../app/services'
import { settlesWithin } from '../app/settleWithin'

/** How long SDK init may delay the menu before boot continues without it. */
const MENU_WAIT_MS = 1200
/** Emitted once the menu scene is running, so the page splash can fade out. */
const READY_EVENT = 'mg:game-ready'

/**
 * Loads the game's asset manifest and initializes platform SDKs behind the
 * page's HTML splash, then starts the menu. There is no Phaser-rendered boot
 * page: the inline splash in index.html stays visible until the menu is up.
 */
export class BootScene extends Phaser.Scene {
  private initPromise!: Promise<PromiseSettledResult<void>[]>

  constructor() {
    super('Boot')
  }

  init(): void {
    const services = getServices()
    this.initPromise = Promise.allSettled([services.platform.init(), services.ads.init()])
  }

  preload(): void {
    const assets = getServices().def.assets
    for (const image of assets?.images ?? []) this.load.image(image.key, image.url)
    for (const audio of assets?.audio ?? []) this.load.audio(audio.key, audio.urls)
    for (const json of assets?.json ?? []) this.load.json(json.key, json.url)
  }

  create(): void {
    void this.enterMenu()
  }

  /**
   * The host SDK must never hold the menu hostage. Some host SDKs wait for a
   * portal handshake for several seconds before giving up on hosts that are
   * not the portal. Wait briefly for the common fast path, then finish SDK
   * bootstrapping with the menu already running.
   */
  private async enterMenu(): Promise<void> {
    const services = getServices()
    const menuKey = services.def.menuScene ?? 'Menu'
    const scenes = this.scene.manager
    const ready = await settlesWithin(this.initPromise, MENU_WAIT_MS)

    if (ready) this.reportFailures(await this.initPromise)
    services.syncPlatformLang()
    services.platform.loadingFinished()
    this.scene.start(menuKey)
    window.dispatchEvent(new Event(READY_EVENT))

    if (!ready) void this.finishSdkInit(menuKey, services, scenes)
  }

  /** Completes a slow SDK init behind the menu and applies its host language. */
  private async finishSdkInit(
    menuKey: string,
    services: GameServices,
    scenes: Phaser.Scenes.SceneManager,
  ): Promise<void> {
    this.reportFailures(await this.initPromise)

    const previousLang = services.i18n.lang
    services.syncPlatformLang()
    services.platform.loadingFinished()

    if (services.i18n.lang === previousLang || !scenes.isActive(menuKey)) return
    scenes.getScene(menuKey).scene.restart()
  }

  private reportFailures(results: PromiseSettledResult<void>[]): void {
    for (const result of results) {
      if (result.status === 'rejected') {
        console.warn('[boot] SDK init failed, continuing without it', result.reason)
      }
    }
  }
}
