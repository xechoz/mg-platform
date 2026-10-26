import Phaser from 'phaser'
import { getServices } from '../app/services'

/** Initializes platform SDKs and settings before any game scene runs. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    const services = getServices()

    void (async () => {
      const results = await Promise.allSettled([services.platform.init(), services.ads.init()])
      for (const result of results) {
        if (result.status === 'rejected') {
          console.warn('[boot] SDK init failed, continuing without it', result.reason)
        }
      }
      services.syncPlatformLang()
      this.scene.start('Preload')
    })()
  }
}
