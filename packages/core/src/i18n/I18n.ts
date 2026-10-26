import { isLang, type Lang } from '@mg/platform'

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
    const template = this.dicts[this.current][key] ?? this.dicts.en[key] ?? key
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`))
  }
}

/**
 * URL override > explicit player choice > host detection > game default.
 * Detection comes from the host (Poki), never from navigator sniffing.
 */
export function resolveLang(
  params: URLSearchParams,
  stored: Lang | undefined,
  fallback: Lang,
  detected?: Lang | null,
): Lang {
  const fromUrl = params.get('lang')
  if (isLang(fromUrl)) return fromUrl
  if (stored) return stored
  if (detected) return detected
  return fallback
}
