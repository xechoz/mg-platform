export const ADSENSE_TEST_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX'

/** Accepts both `pub-...` and `ca-pub-...`; returns the script form. */
export function normalizeAdsenseClient(raw: string | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  return value.startsWith('ca-pub-') ? value : `ca-pub-${value.replace(/^pub-/, '')}`
}

/** `ads.txt` uses the publisher ID without the `ca-` prefix. */
export function adsTxtLine(client: string): string {
  return `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0`
}
