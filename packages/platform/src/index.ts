import { CrazyGamesAdChannel, CrazyGamesPlatform, CrazyGamesRuntime } from './crazygames'
import { H5GamesAdChannel } from './h5games'
import { PokiAdChannel, PokiPlatform, PokiRuntime } from './poki'
import {
  type AdChannel,
  type AdChannelKind,
  type AdChannelOptions,
  DevAdChannel,
  type PlatformAdapter,
  type PlatformKind,
  WebPlatform,
} from './types'

export {
  type CrazyGamesAdCallbacks,
  CrazyGamesAdChannel,
  type CrazyGamesAdType,
  CrazyGamesPlatform,
  CrazyGamesRuntime,
  type CrazyGamesSdk,
  type CrazyGamesSettings,
} from './crazygames'
export {
  type H5AdApi,
  type H5AdBreakConfig,
  type H5AdConfig,
  type H5AdType,
  H5GamesAdChannel,
  type H5PlacementInfo,
} from './h5games'
export { PokiAdChannel, PokiPlatform, PokiRuntime, type PokiSdk } from './poki'
export type {
  AdChannel,
  AdChannelKind,
  AdChannelOptions,
  Lang,
  PlatformAdapter,
  PlatformKind,
} from './types'
export { DevAdChannel, isLang, SUPPORTED_LANGS, WebPlatform } from './types'

let sharedPoki: PokiRuntime | null = null

function pokiRuntime(): PokiRuntime {
  sharedPoki ??= new PokiRuntime()
  return sharedPoki
}

let sharedCrazyGames: CrazyGamesRuntime | null = null

function crazyGamesRuntime(): CrazyGamesRuntime {
  sharedCrazyGames ??= new CrazyGamesRuntime()
  return sharedCrazyGames
}

export function createPlatform(kind: PlatformKind = 'web'): PlatformAdapter {
  switch (kind) {
    case 'web':
      return new WebPlatform()
    case 'poki':
      return new PokiPlatform(pokiRuntime())
    case 'crazygames':
      return new CrazyGamesPlatform(crazyGamesRuntime())
  }
}

export function createAdChannel(
  kind: AdChannelKind = 'dev',
  options: AdChannelOptions = {},
): AdChannel {
  switch (kind) {
    case 'dev':
      return new DevAdChannel()
    case 'poki':
      return new PokiAdChannel(pokiRuntime())
    case 'h5games':
      return new H5GamesAdChannel(options)
    case 'crazygames':
      return new CrazyGamesAdChannel(crazyGamesRuntime())
  }
}
