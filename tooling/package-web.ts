import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Builds the self-hosted web flavor of the current game repository and writes
 * `<id>-web.zip` with `index.html`, assets, `game.manifest.json` and the
 * optional `thumb.png` at the archive root.
 *
 * Run from the game repo root:
 *   node platform/tooling/package-web.ts
 */
const root = resolve(process.cwd())
const manifestPath = join(root, 'game.manifest.json')
if (!existsSync(manifestPath)) {
  console.error(`[package] run this from a game repo root (missing ${manifestPath})`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { id: string }
const distDir = join(root, 'dist')
const outDir = join(root, 'release')
const zipPath = join(outDir, `${manifest.id}-web.zip`)

const env: NodeJS.ProcessEnv = { ...process.env, VITE_PLATFORM: 'web' }

console.log(`[package] building ${manifest.id} (web)`)
execFileSync('npm', ['run', 'build'], { cwd: root, env, stdio: 'inherit' })

if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`[package] build output missing: ${join(distDir, 'index.html')}`)
  process.exit(1)
}

copyFileSync(manifestPath, join(distDir, 'game.manifest.json'))
const thumb = join(root, 'thumb.png')
if (existsSync(thumb)) copyFileSync(thumb, join(distDir, 'thumb.png'))

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
