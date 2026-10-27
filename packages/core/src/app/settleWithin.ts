/**
 * Waits at most `ms` for `promise` to settle. Returns `true` when it settled in
 * time, `false` when the deadline won; the promise keeps running either way.
 *
 * Boot uses this to bound how long host SDK initialization may delay the first
 * interactive screen. Some host SDKs wait for their portal handshake for
 * several seconds before disabling themselves on other hosts.
 */
export function settlesWithin<T>(promise: Promise<T>, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms)
    const settle = (): void => {
      clearTimeout(timer)
      resolve(true)
    }
    promise.then(settle, settle)
  })
}
