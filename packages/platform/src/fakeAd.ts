/**
 * Development-only rewarded ad overlay. It exists so the full ad flow can be
 * exercised without a real ad account: reward, skip and failure paths.
 *
 * Forced outcomes (handy for manual QA):
 *   ?ads=reward   auto-complete after a short delay
 *   ?ads=skip     auto-skip after a short delay
 *   ?ads=fail     fail immediately
 *
 * The default is an interactive overlay with a countdown and both buttons.
 */
export function showFakeRewardedAd(): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false)

  const mode = new URLSearchParams(window.location.search).get('ads')
  if (mode === 'fail') return Promise.resolve(false)
  if (mode === 'skip') return delayed(false, 800)
  if (mode === 'reward') return delayed(true, 1600)

  return interactive()
}

function delayed(result: boolean, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(result), ms)
  })
}

function interactive(): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:rgba(18,14,28,0.82)',
      'font-family:system-ui,-apple-system,"Segoe UI",sans-serif',
      'color:#fff',
      'padding:24px',
      'touch-action:manipulation',
    ].join(';')

    // Phaser listens for pointer events on window as well as on the canvas.
    // Stop ad interactions before they reach those listeners or the click
    // that claims the reward also presses the scene button underneath.
    for (const type of [
      'pointerdown',
      'pointerup',
      'pointercancel',
      'mousedown',
      'mouseup',
      'touchstart',
      'touchend',
      'click',
    ]) {
      overlay.addEventListener(type, (event) => event.stopPropagation())
    }

    const card = document.createElement('div')
    card.style.cssText = [
      'width:min(420px,100%)',
      'background:#241d33',
      'border:1px solid rgba(255,255,255,0.16)',
      'border-radius:24px',
      'padding:28px 24px 22px',
      'box-shadow:0 24px 60px rgba(0,0,0,0.45)',
      'text-align:center',
    ].join(';')

    const badge = document.createElement('div')
    badge.textContent = 'DEV'
    badge.style.cssText = [
      'display:inline-block',
      'font-size:12px',
      'font-weight:700',
      'letter-spacing:0.12em',
      'color:#241d33',
      'background:#ffd76a',
      'border-radius:999px',
      'padding:4px 10px',
      'margin-bottom:14px',
    ].join(';')

    const title = document.createElement('div')
    title.textContent = '模拟激励广告'
    title.style.cssText = 'font-size:24px;font-weight:700;margin-bottom:8px'

    const subtitle = document.createElement('div')
    subtitle.textContent = '开发环境 · 3 秒后可领取'
    subtitle.style.cssText = 'font-size:15px;opacity:0.72;margin-bottom:18px'

    const countdown = document.createElement('div')
    countdown.textContent = '3'
    countdown.style.cssText =
      'font-size:64px;font-weight:800;line-height:1;margin:6px 0 22px;color:#ffd76a'

    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex;flex-direction:column;gap:12px'

    const claim = document.createElement('button')
    claim.type = 'button'
    claim.textContent = '领取奖励'
    claim.disabled = true
    claim.style.cssText = buttonStyle(true)

    const skip = document.createElement('button')
    skip.type = 'button'
    skip.textContent = '跳过（无奖励）'
    skip.style.cssText = buttonStyle(false)

    actions.append(claim, skip)
    card.append(badge, title, subtitle, countdown, actions)
    overlay.append(card)
    adHost().append(overlay)

    let remaining = 3
    const timer = window.setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        window.clearInterval(timer)
        countdown.textContent = '✓'
        subtitle.textContent = '广告播放完成'
        claim.disabled = false
        claim.style.opacity = '1'
        claim.style.cursor = 'pointer'
        return
      }
      countdown.textContent = String(remaining)
    }, 1000)

    const finish = (result: boolean): void => {
      window.clearInterval(timer)
      overlay.remove()
      resolve(result)
    }

    claim.addEventListener('click', () => {
      if (!claim.disabled) finish(true)
    })
    skip.addEventListener('click', () => finish(false))
  })
}

/**
 * A body-level overlay is not rendered while `#game` is the fullscreen
 * element, which is exactly how mobile starts a run. Keep the ad inside the
 * active fullscreen tree so it is visible and receives the taps.
 */
function adHost(): Element {
  const webkitFullscreen = (document as Document & { webkitFullscreenElement?: Element | null })
    .webkitFullscreenElement
  return (
    document.fullscreenElement ??
    webkitFullscreen ??
    document.getElementById('game') ??
    document.body
  )
}

function buttonStyle(primary: boolean): string {
  return [
    'appearance:none',
    'border:0',
    'border-radius:14px',
    'padding:14px 18px',
    'font-size:17px',
    'font-weight:700',
    'font-family:inherit',
    'cursor:pointer',
    primary ? 'background:#6e45e8;color:#fff' : 'background:rgba(255,255,255,0.12);color:#fff',
    primary ? '' : 'font-weight:600',
    primary ? 'opacity:0.5' : '',
  ]
    .filter(Boolean)
    .join(';')
}
