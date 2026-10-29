import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Creates a standalone game repository from `templates/game-repo` and pins the
 * platform submodule at `--platform-ref`.
 *
 * Usage:
 *   node tooling/create-game-repo.ts <name> [--dir ../<name>] [--title <title>]
 *     [--port 5174] [--platform-ref v4.0.0] [--platform-url <git-url>]
 */
const root = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const name = args[0]

if (!name || name.startsWith('--') || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error(
    'usage: node tooling/create-game-repo.ts <kebab-case-name> [--dir <path>] [--title <title>] [--port <port>] [--platform-ref <ref>] [--platform-url <url>]',
  )
  process.exit(1)
}

const target = resolve(option('dir') ?? join(root, '..', name))
const title = option('title') ?? name.split('-').map(capitalize).join(' ')
const port = option('port') ?? '5173'
const platformRef = option('platform-ref') ?? 'main'
const platformUrl =
  option('platform-url') ?? readOriginUrl() ?? 'https://github.com/xechoz/mg-platform.git'

if (!/^\d+$/.test(port)) {
  console.error(`invalid --port: ${port}`)
  process.exit(1)
}
if (existsSync(target) && readdirSync(target).length > 0) {
  console.error(`target is not empty: ${target}`)
  process.exit(1)
}

cpSync(join(root, 'templates', 'game-repo'), target, { recursive: true })
for (const file of readdirSync(target, { recursive: true })) {
  if (typeof file !== 'string') continue
  if (!/\.(ts|json|html|webmanifest|md|yml|yaml)$/.test(file)) continue
  const path = join(target, file)
  const next = readFileSync(path, 'utf8')
    .replaceAll('__NAME__', name)
    .replaceAll('__TITLE__', title)
    .replaceAll('__PORT__', port)
    .replaceAll('__PLATFORM_REF__', platformRef)
  writeFileSync(path, next)
}

if (!existsSync(join(target, '.git'))) {
  execFileSync('git', ['init', '-b', 'main'], { cwd: target, stdio: 'inherit' })
}

if (!existsSync(join(target, 'platform'))) {
  console.log(`[new-game] adding platform submodule at ${platformRef}`)
  execFileSync('git', ['submodule', 'add', platformUrl, 'platform'], {
    cwd: target,
    stdio: 'inherit',
  })
  execFileSync('git', ['-C', 'platform', 'checkout', platformRef], {
    cwd: target,
    stdio: 'inherit',
  })
  execFileSync('git', ['add', 'platform', '.gitmodules'], { cwd: target, stdio: 'inherit' })
}

const configPath = join(target, 'opencode.json')
if (!existsSync(configPath) && existsSync(join(target, 'platform', 'opencode.json'))) {
  symlinkSync('platform/opencode.json', configPath)
}

console.log(`created ${target}`)
console.log('next steps:')
console.log(`  cd ${target}`)
console.log('  npm install')
console.log(`  npm run dev  # http://localhost:${port}`)
console.log('  implement src/logic first, then src/scenes')
console.log(`  git add . && git commit -m "feat: scaffold ${name}"`)

function option(key: string): string | undefined {
  const index = args.indexOf(`--${key}`)
  if (index < 0) return undefined
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    console.error(`missing value for --${key}`)
    process.exit(1)
  }
  return value
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function readOriginUrl(): string | null {
  try {
    return execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
  } catch {
    return null
  }
}
