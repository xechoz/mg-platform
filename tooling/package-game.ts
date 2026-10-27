import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Builds the current game repository for a distribution flavor.
 * Run from the game repo root:
 *   node platform/tooling/package-game.ts <poki|crazygames-basic|crazygames-full>
 */
type Flavor = 'poki' | 'crazygames-basic' | 'crazygames-full'

const FLAVORS: Record<Flavor, { platform: string; adChannel?: string }> = {
  poki: { platform: 'poki' },
  'crazygames-basic': { platform: 'crazygames' },
  'crazygames-full': { platform: 'crazygames', adChannel: 'crazygames' },
}

const [flavorName] = process.argv.slice(2)
if (!flavorName || !(flavorName in FLAVORS)) {
  console.error(
    'usage: node platform/tooling/package-game.ts <poki|crazygames-basic|crazygames-full>',
  )
  process.exit(1)
}
const flavor: Flavor = flavorName as Flavor

const root = resolve(process.cwd())
const manifestPath = join(root, 'game.manifest.json')
if (!existsSync(manifestPath)) {
  console.error(`[package] run this from a game repo root (missing ${manifestPath})`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { id: string }
const distDir = join(root, 'dist')
const outDir = join(root, 'release')
const zipPath = join(outDir, `${manifest.id}-${flavorName}.zip`)

const env: NodeJS.ProcessEnv = { ...process.env, VITE_PLATFORM: FLAVORS[flavor].platform }
const adChannel = FLAVORS[flavor].adChannel
if (adChannel) env.VITE_AD_CHANNEL = adChannel
else delete env.VITE_AD_CHANNEL

console.log(`[package] building ${manifest.id} (${flavorName})`)
execFileSync('npm', ['run', 'build'], { cwd: root, env, stdio: 'inherit' })

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
