import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const errors: string[] = []

const games = readdirSync(join(root, 'games'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const gamePackages = new Map<string, { name: string; deps: Set<string> }>()
for (const game of games) {
  const pkg = JSON.parse(readFileSync(join(root, 'games', game, 'package.json'), 'utf8')) as {
    name: string
    dependencies?: Record<string, string>
  }
  gamePackages.set(game, {
    name: pkg.name,
    deps: new Set(Object.keys(pkg.dependencies ?? {})),
  })
}

for (const game of games) {
  const info = gamePackages.get(game)
  if (!info) continue
  for (const file of listTs(join(root, 'games', game, 'src'))) {
    const source = readFileSync(file, 'utf8')
    const relative = file.slice(root.length + 1)
    for (const spec of imports(source)) {
      if (spec.startsWith('@mg/') && spec !== info.name && !info.deps.has(packageRoot(spec))) {
        errors.push(`${relative}: imports ${spec}, which is not a declared dependency`)
      }
      if (spec.includes('/games/') && !spec.includes(`/games/${game}/`)) {
        errors.push(`${relative}: reaches into another game (${spec})`)
      }
      if (relative.includes('/src/logic/')) {
        if (spec === 'phaser' || (spec.startsWith('@mg/core') && spec !== '@mg/core/rng')) {
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
}

for (const pkgDir of readdirSync(join(root, 'packages'), { withFileTypes: true })) {
  if (!pkgDir.isDirectory()) continue
  const pkg = JSON.parse(
    readFileSync(join(root, 'packages', pkgDir.name, 'package.json'), 'utf8'),
  ) as {
    name: string
    dependencies?: Record<string, string>
  }
  const deps = new Set(Object.keys(pkg.dependencies ?? {}))
  for (const file of listTs(join(root, 'packages', pkgDir.name, 'src'))) {
    const source = readFileSync(file, 'utf8')
    const relative = file.slice(root.length + 1)
    for (const spec of imports(source)) {
      if (spec.startsWith('@mg/') && spec !== pkg.name && !deps.has(packageRoot(spec))) {
        errors.push(`${relative}: imports ${spec}, which is not a declared dependency`)
      }
      if (spec.includes('/games/')) {
        errors.push(`${relative}: packages must not import games (${spec})`)
      }
    }
    if (source.includes('PokiSDK') && pkg.name !== '@mg/platform') {
      errors.push(`${relative}: only @mg/platform may touch PokiSDK`)
    }
    if (source.includes('CrazyGames') && pkg.name !== '@mg/platform') {
      errors.push(`${relative}: only @mg/platform may touch CrazyGames`)
    }
  }
}

if (errors.length > 0) {
  console.error(`boundary check failed:\n${errors.map((error) => `  - ${error}`).join('\n')}`)
  process.exit(1)
}
console.log('boundaries ok')

function packageRoot(spec: string): string {
  const parts = spec.split('/')
  return parts.slice(0, 2).join('/')
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
