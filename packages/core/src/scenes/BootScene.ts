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
      try {
        await services.platform.init()
      } catch (error) {
        console.warn('[platform] init failed, continuing without SDK', error)
      }
      this.scene.start('Preload')
    })()
  }
}
