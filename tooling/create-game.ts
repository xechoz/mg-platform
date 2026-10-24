import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const name = process.argv[2]

if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('usage: npm run new:game -- <kebab-case-name>')
  process.exit(1)
}

const target = join(root, 'games', name)
if (existsSync(target)) {
  console.error(`games/${name} already exists`)
  process.exit(1)
}

const title = name
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')

cpSync(join(root, 'templates', 'game'), target, { recursive: true })

for (const file of readdirSync(target, { recursive: true })) {
  if (typeof file !== 'string') continue
  if (!/\.(ts|json|html)$/.test(file)) continue
  const path = join(target, file)
  const next = readFileSync(path, 'utf8')
    .replaceAll('__NAME__', name)
    .replaceAll('__TITLE__', title)
  writeFileSync(path, next)
}

console.log(`created games/${name}`)
console.log(`  npm install`)
console.log(`  npm run dev -w @mg/${name}`)
console.log(`  edit games/${name}/src/scenes/PlaceholderScene.ts`)
