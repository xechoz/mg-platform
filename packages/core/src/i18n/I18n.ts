import type { Lang } from '@mg/platform'

export type Dictionary = Record<string, string>

export class I18n {
  private readonly dicts: Record<Lang, Dictionary>
  private current: Lang

  constructor(dicts: Record<Lang, Dictionary>, initial: Lang) {
    this.dicts = dicts
    this.current = initial
  }

  get lang(): Lang {
    return this.current
  }

  setLang(lang: Lang): void {
    this.current = lang
  }

  t(key: string, params?: Record<string, string | number>): string {
    const template = this.dicts[this.current][key] ?? this.dicts.zh[key] ?? key
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`))
  }
}

/**
 * URL override > stored choice > game default. No navigator sniffing: a
 * Chinese-first site should stay Chinese until the player picks otherwise.
 */
export function resolveLang(
  params: URLSearchParams,
  stored: Lang | undefined,
  fallback: Lang,
): Lang {
  const fromUrl = params.get('lang')
  if (fromUrl === 'zh' || fromUrl === 'en') return fromUrl
  if (stored === 'zh' || stored === 'en') return stored
  return fallback
}
