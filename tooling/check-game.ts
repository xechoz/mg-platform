import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Game repository boundary checks. Run from a game repo root:
 *   node platform/tooling/check-game.ts
 */
const root = resolve(process.cwd())
const manifestPath = join(root, 'game.manifest.json')
if (!existsSync(manifestPath)) {
  console.error(`[check] run this from a game repo root (missing ${manifestPath})`)
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  name: string
  dependencies?: Record<string, string>
}
const deps = new Set(Object.keys(pkg.dependencies ?? {}))
const errors: string[] = []

for (const file of listTs(join(root, 'src'))) {
  const source = readFileSync(file, 'utf8')
  const relative = file.slice(root.length + 1)
  const logic = relative.includes('/src/logic/')
  for (const spec of imports(source)) {
    if (spec.startsWith('@mg/') && !deps.has(packageRoot(spec))) {
      errors.push(`${relative}: imports ${spec}, which is not a declared dependency`)
    }
    if (spec.includes('/games/') || spec.startsWith('games/')) {
      errors.push(`${relative}: games must not reach into another game (${spec})`)
    }
    if (logic && spec !== '@mg/core/rng') {
      if (spec.startsWith('@mg/') || spec === 'phaser') {
        errors.push(
          `${relative}: pure logic must not import ${spec} (only @mg/core/rng is allowed)`,
        )
      }
    }
  }
  if (source.includes('PokiSDK')) {
    errors.push(`${relative}: talk to Poki through @mg/platform, not window.PokiSDK`)
  }
  if (source.includes('CrazyGames')) {
    errors.push(`${relative}: talk to CrazyGames through @mg/platform, not window.CrazyGames`)
  }
  if (source.includes('localStorage.')) {
    errors.push(`${relative}: use the SaveStore instead of localStorage`)
  }
}

if (errors.length > 0) {
  console.error(`game boundary check failed:\n${errors.map((error) => `  - ${error}`).join('\n')}`)
  process.exit(1)
}
console.log('game boundaries ok')

function packageRoot(spec: string): string {
  return spec.split('/').slice(0, 2).join('/')
}

function imports(source: string): string[] {
  const found: string[] = []
  const pattern = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  for (const match of source.matchAll(pattern)) {
    if (match[1]) found.push(match[1])
  }
  return found
}

function listTs(dir: string): string[] {
  return readdirSync(dir, { recursive: true })
    .filter((entry): entry is string => typeof entry === 'string' && entry.endsWith('.ts'))
    .map((entry) => join(dir, entry))
}
