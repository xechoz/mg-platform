import type Phaser from 'phaser'

/**
 * Fullscreen is only worth forcing where the browser chrome actually eats
 * playable space. Desktop users keep their window; embedded builds let the
 * host player decide.
 */
export interface FullscreenPolicy {
  available: boolean
  embedded: boolean
  standalone: boolean
  mobile: boolean
}

export function shouldAutoFullscreen(policy: FullscreenPolicy): boolean {
  return policy.available && !policy.embedded && !policy.standalone && policy.mobile
}

export function isEmbedded(): boolean {
  return window.self !== window.top
}

export function isStandalone(): boolean {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return standalone || fullscreen || iosStandalone
}

export function isMobileDevice(): boolean {
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const mobileUserAgent = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  // iPadOS reports a desktop UA, so fall back to touch points plus Macintosh.
  const ipadDesktopMode = navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)
  return coarsePointer || mobileUserAgent || ipadDesktopMode
}

/**
 * Must run inside a user gesture. The menu's Start button is the earliest
 * deliberate gesture for entering fullscreen; audio unlocks on any first tap.
 */
export function maybeEnterFullscreen(scale: Phaser.Scale.ScaleManager): void {
  if (document.fullscreenElement) return

  const shouldEnter = shouldAutoFullscreen({
    available: scale.fullscreen.available,
    embedded: isEmbedded(),
    standalone: isStandalone(),
    mobile: isMobileDevice(),
  })
  if (!shouldEnter) return

  const target = document.getElementById('game')
  if (target) requestFullscreen(target)
}

function requestFullscreen(target: HTMLElement): void {
  const request = target.requestFullscreen?.bind(target)
  if (request) {
    // A denied request is not a gameplay failure; never let it reach the console.
    void Promise.resolve(request({ navigationUI: 'hide' })).catch(() => {})
    return
  }

  const legacy = target as HTMLElement & { webkitRequestFullscreen?: () => void }
  legacy.webkitRequestFullscreen?.()
}
