import { loadEnv, type Plugin, type UserConfig } from 'vite'
import { ADSENSE_TEST_CLIENT, normalizeAdsenseClient } from './adsense.ts'

const POKI_SDK_URL = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js'
const CRAZYGAMES_SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js'
const ADSENSE_SDK_URL = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
const ADSENSE_SHIM =
  'window.adsbygoogle = window.adsbygoogle || []; var adBreak = adConfig = function(o) { adsbygoogle.push(o); }'

export interface GameConfigOptions {
  port?: number
}

/**
 * Shared Vite config for every game. `base: './'` keeps builds portable to
 * subdirectories (own site) and to Poki's iframe hosting.
 */
export function gameConfig({ port = 5173 }: GameConfigOptions = {}): UserConfig {
  return {
    base: './',
    plugins: [pokiSdkPlugin(), crazyGamesSdkPlugin(), h5GamesAdsPlugin()],
    build: {
      target: 'es2022',
      outDir: 'dist',
      emptyOutDir: true,
      assetsInlineLimit: 4096,
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
    },
    esbuild: {},
    server: {
      port,
      host: true,
      open: false,
    },
    preview: {
      port: port + 1000,
      host: true,
    },
  }
}

/**
 * Poki is the only build allowed to load the Poki SDK. The self-hosted build
 * must stay free of external requests, so the script is injected per build
 * instead of living in index.html.
 */
function pokiSdkPlugin(): Plugin {
  let enabled = false

  return {
    name: 'mg-poki-sdk',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, 'VITE_')
      enabled = (process.env.VITE_PLATFORM ?? env.VITE_PLATFORM) === 'poki'
    },
    transformIndexHtml(html) {
      if (!enabled) return html
      return {
        html,
        tags: [
          {
            tag: 'script',
            attrs: { src: POKI_SDK_URL },
            injectTo: 'head-prepend',
          },
        ],
      }
    },
  }
}

/**
 * CrazyGames is the only build allowed to load the CrazyGames SDK. The
 * self-hosted and Poki builds must stay free of its external script.
 */
function crazyGamesSdkPlugin(): Plugin {
  let enabled = false

  return {
    name: 'mg-crazygames-sdk',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, 'VITE_')
      enabled = (process.env.VITE_PLATFORM ?? env.VITE_PLATFORM) === 'crazygames'
    },
    transformIndexHtml(html) {
      if (!enabled) return html
      return {
        html,
        tags: [
          {
            tag: 'script',
            attrs: { src: CRAZYGAMES_SDK_URL },
            injectTo: 'head-prepend',
          },
        ],
      }
    },
  }
}

/**
 * Google H5 Games Ads is opt-in through `VITE_AD_CHANNEL=h5games`. The shim
 * must run before the async SDK so early `adConfig`/`adBreak` calls are queued.
 * Without a publisher ID the build stays ad-free instead of shipping a broken
 * integration. Test mode is never allowed in a production build.
 */
function h5GamesAdsPlugin(): Plugin {
  let enabled = false
  let client = ''
  let test = false

  return {
    name: 'mg-h5-games-ads',
    configResolved(config) {
      enabled = false
      test = false
      client = ''

      const env = loadEnv(config.mode, config.root, 'VITE_')
      const platform = process.env.VITE_PLATFORM ?? env.VITE_PLATFORM
      const channel = process.env.VITE_AD_CHANNEL ?? env.VITE_AD_CHANNEL
      if (platform === 'poki' || platform === 'crazygames' || channel !== 'h5games') return

      const productionBuild = config.command === 'build' && config.mode === 'production'
      const wantsTest = (process.env.VITE_ADSENSE_TEST ?? env.VITE_ADSENSE_TEST) === 'on'
      if (wantsTest && productionBuild) {
        console.warn('[h5games] ignoring VITE_ADSENSE_TEST=on in a production build')
      }
      test = wantsTest && !productionBuild

      const rawClient = process.env.VITE_ADSENSE_CLIENT ?? env.VITE_ADSENSE_CLIENT
      client = normalizeAdsenseClient(rawClient) ?? (test ? ADSENSE_TEST_CLIENT : '')
      if (!client) {
        console.warn('[h5games] VITE_ADSENSE_CLIENT is missing; building without ads')
        return
      }
      enabled = true
    },
    transformIndexHtml(html) {
      if (!enabled) return html
      return {
        html,
        tags: [
          {
            tag: 'script',
            children: ADSENSE_SHIM,
            injectTo: 'head-prepend',
          },
          {
            tag: 'script',
            attrs: {
              async: true,
              crossorigin: 'anonymous',
              'data-ad-frequency-hint': '30s',
              ...(test ? { 'data-adbreak-test': 'on' } : {}),
              src: `${ADSENSE_SDK_URL}?client=${client}`,
            },
            injectTo: 'head',
          },
        ],
      }
    },
  }
}
