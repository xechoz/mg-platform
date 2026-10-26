import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

interface Counts {
  files: number
  total: number
  blank: number
  comment: number
  code: number
}

const CATEGORIES = ['游戏', '公共层', '模板', '工具', '测试'] as const
type Category = (typeof CATEGORIES)[number]

const SOURCE_CATEGORIES: readonly Category[] = CATEGORIES.filter((it) => it !== '测试')

function categorize(file: string): Category | undefined {
  if (!file.endsWith('.ts') || file.endsWith('.config.ts')) return undefined
  if (file.endsWith('.test.ts')) return '测试'
  if (file.startsWith('games/')) return '游戏'
  if (file.startsWith('packages/')) return '公共层'
  if (file.startsWith('templates/')) return '模板'
  if (file.startsWith('tooling/')) return '工具'
  return undefined
}

// 逐行近似：块注释结尾接代码的行计入注释，代码后的行尾注释计入代码。
function countLines(text: string): Counts {
  const counts: Counts = { files: 1, total: 0, blank: 0, comment: 0, code: 0 }
  const lines = text.split('\n')
  if (lines.at(-1) === '') lines.pop()

  let inBlock = false
  for (const raw of lines) {
    counts.total++
    const line = raw.trim()
    if (line === '') {
      counts.blank++
      continue
    }
    if (inBlock) {
      counts.comment++
      if (line.includes('*/')) inBlock = false
      continue
    }
    if (line.startsWith('/*')) {
      counts.comment++
      if (!line.slice(2).includes('*/')) inBlock = true
      continue
    }
    if (line.startsWith('//')) {
      counts.comment++
      continue
    }
    counts.code++
  }
  return counts
}

function addCounts(target: Counts, source: Counts): void {
  target.files += source.files
  target.total += source.total
  target.blank += source.blank
  target.comment += source.comment
  target.code += source.code
}

const emptyCounts = (): Counts => ({ files: 0, total: 0, blank: 0, comment: 0, code: 0 })

const root = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const topIndex = args.indexOf('--top')
const topCount = topIndex === -1 ? 10 : Number(args[topIndex + 1])

interface FileStat {
  file: string
  category: Category
  counts: Counts
}

const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter((file) => file !== '')

const stats: FileStat[] = []
const totals = new Map<Category, Counts>(CATEGORIES.map((category) => [category, emptyCounts()]))

for (const file of files) {
  const category = categorize(file)
  if (!category) continue
  const counts = countLines(readFileSync(join(root, file), 'utf8'))
  stats.push({ file, category, counts })
  const bucket = totals.get(category)
  if (bucket) addCounts(bucket, counts)
}

const overall = emptyCounts()
const product = emptyCounts()
for (const [category, counts] of totals) {
  addCounts(overall, counts)
  if (SOURCE_CATEGORIES.includes(category)) addCounts(product, counts)
}

const largest = stats
  .filter(({ category }) => SOURCE_CATEGORIES.includes(category))
  .sort((a, b) => b.counts.code - a.counts.code)
  .slice(0, topCount)
  .map(({ file, counts }) => ({ file, code: counts.code, total: counts.total }))

if (asJson) {
  console.log(
    JSON.stringify({ categories: Object.fromEntries(totals), overall, product, largest }, null, 2),
  )
} else {
  const displayWidth = (text: string): number => {
    let width = 0
    for (const char of text) width += (char.codePointAt(0) ?? 0) > 0x2e80 ? 2 : 1
    return width
  }
  const pad = (text: string, width: number, align: 'left' | 'right' = 'left'): string => {
    const fill = ' '.repeat(Math.max(1, width - displayWidth(text)))
    return align === 'left' ? text + fill : fill + text
  }
  const columns: readonly [string, number, 'left' | 'right'][] = [
    ['类型', 10, 'left'],
    ['文件', 7, 'right'],
    ['总行', 8, 'right'],
    ['空行', 7, 'right'],
    ['注释', 7, 'right'],
    ['代码', 8, 'right'],
  ]
  const row = (label: string, values: readonly number[]): string =>
    [label, ...values.map(String)]
      .map((cell, index) => pad(cell, columns[index][1], columns[index][2]))
      .join('')
      .trimEnd()
  const rule = columns.map(([, width]) => '─'.repeat(width)).join('')

  console.log('源码行数统计（git 跟踪的 TypeScript 源码，不含文档、配置、构建产物与素材）')
  console.log('')
  console.log(
    columns
      .map(([label, width, align]) => pad(label, width, align))
      .join('')
      .trimEnd(),
  )
  console.log(rule)
  for (const category of CATEGORIES) {
    const counts = totals.get(category)
    if (!counts || counts.files === 0) continue
    console.log(
      row(category, [counts.files, counts.total, counts.blank, counts.comment, counts.code]),
    )
  }
  console.log(rule)
  console.log(
    row('合计', [overall.files, overall.total, overall.blank, overall.comment, overall.code]),
  )
  console.log('')
  console.log(
    `产品代码（不含测试）：${product.files} 个文件，${product.total} 行，其中可执行代码 ${product.code} 行`,
  )
  console.log('')
  console.log(`最大源文件 Top ${topCount}（按代码行）`)
  for (const entry of largest) {
    console.log(`${String(entry.code).padStart(5)}  ${entry.file}`)
  }
}
