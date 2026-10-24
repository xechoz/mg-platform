import type { UserConfig } from 'vite'

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
