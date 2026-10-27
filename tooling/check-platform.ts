import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** Platform repository boundary checks. */
const root = resolve(import.meta.dirname, '..')
const errors: string[] = []

for (const entry of readdirSync(join(root, 'packages'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const dir = join(root, 'packages', entry.name)
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
    name: string
    private?: boolean
    exports?: Record<string, string>
    dependencies?: Record<string, string>
  }
  const deps = new Set(Object.keys(pkg.dependencies ?? {}))

  if (pkg.private !== true) {
    errors.push(`packages/${entry.name}: shared packages must stay private`)
  }
  for (const target of Object.values(pkg.exports ?? {})) {
    if (!target.startsWith('./src/')) {
      errors.push(`packages/${entry.name}: exports must point into src/ (got ${target})`)
    }
  }

  for (const file of listTs(join(dir, 'src'))) {
    const source = readFileSync(file, 'utf8')
    const relative = file.slice(root.length + 1)
    for (const spec of imports(source)) {
      if (spec.startsWith('@mg/') && spec !== pkg.name && !deps.has(packageRoot(spec))) {
        errors.push(`${relative}: imports ${spec}, which is not a declared dependency`)
      }
      if (spec.includes('/games/') || spec.startsWith('games/')) {
        errors.push(`${relative}: platform packages must not import games (${spec})`)
      }
    }
    if (source.includes('PokiSDK') && pkg.name !== '@mg/platform') {
      errors.push(`${relative}: only @mg/platform may touch PokiSDK`)
    }
    if (source.includes('CrazyGames') && pkg.name !== '@mg/platform') {
      errors.push(`${relative}: only @mg/platform may touch CrazyGames`)
    }
    if (source.includes('localStorage.') && pkg.name !== '@mg/core') {
      errors.push(`${relative}: only @mg/core may touch localStorage directly`)
    }
  }
}

if (errors.length > 0) {
  console.error(
    `platform boundary check failed:\n${errors.map((error) => `  - ${error}`).join('\n')}`,
  )
  process.exit(1)
}
console.log('platform boundaries ok')

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
