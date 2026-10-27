import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Builds one game for a distribution flavor and writes the zip to `<repo>/release`.
 * Usage: node tooling/package-game.ts <game> <poki|crazygames-basic|crazygames-full>
 */
type Flavor = 'poki' | 'crazygames-basic' | 'crazygames-full'

const FLAVORS: Record<Flavor, { platform: string; adChannel?: string }> = {
  poki: { platform: 'poki' },
  'crazygames-basic': { platform: 'crazygames' },
  'crazygames-full': { platform: 'crazygames', adChannel: 'crazygames' },
}

const [game, flavorName] = process.argv.slice(2)
if (!game || !(flavorName in FLAVORS)) {
  console.error(
    'usage: node tooling/package-game.ts <game> <poki|crazygames-basic|crazygames-full>',
  )
  process.exit(1)
}
const flavor: Flavor = flavorName as Flavor

const root = fileURLToPath(new URL('..', import.meta.url))
const gameDir = join(root, 'games', game)
const manifestPath = join(gameDir, 'game.manifest.json')
if (!existsSync(manifestPath)) {
  console.error(`[package] unknown game: ${game} (missing ${manifestPath})`)
  process.exit(1)
}

const { name } = JSON.parse(readFileSync(join(gameDir, 'package.json'), 'utf8')) as { name: string }
const distDir = join(gameDir, 'dist')
const outDir = join(root, 'release')
const zipPath = join(outDir, `${game}-${flavorName}.zip`)

const env: NodeJS.ProcessEnv = { ...process.env, VITE_PLATFORM: FLAVORS[flavor].platform }
const adChannel = FLAVORS[flavor].adChannel
if (adChannel) env.VITE_AD_CHANNEL = adChannel
else delete env.VITE_AD_CHANNEL

console.log(`[package] building ${name} (${flavorName})`)
execFileSync('npm', ['run', 'build', '-w', name], { cwd: root, env, stdio: 'inherit' })

if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`[package] build output missing: ${join(distDir, 'index.html')}`)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
rmSync(zipPath, { force: true })
console.log(`[package] zipping ${distDir} -> ${zipPath}`)
try {
  execFileSync('zip', ['-qr', zipPath, '.'], { cwd: distDir, stdio: 'inherit' })
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    console.error('[package] zip not found; install zip or package the dist folder manually')
  } else {
    throw error
  }
  process.exit(1)
}

const size = statSync(zipPath).size
console.log(`[package] ${zipPath} (${(size / 1024).toFixed(0)}K)`)
