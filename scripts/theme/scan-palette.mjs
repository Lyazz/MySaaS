/**
 * Reads a storefront template folder and reports every colour it uses, bucketed
 * by the Tailwind utility it appears under. `text-` hits are ink candidates,
 * `bg-` hits are grounds, `border-`/`ring-` hits are rules.
 *
 * This is the input to role assignment, not a replacement for it: naming a hex
 * `accent` rather than `brand` is a judgement about the design, and the script
 * only narrows the field.
 *
 *   node scripts/theme/scan-palette.mjs nour
 *   node scripts/theme/scan-palette.mjs --all
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'components/storefront/templates'
const UTILITIES = [
  'bg', 'text', 'border', 'ring', 'from', 'via', 'to', 'fill', 'stroke',
  'shadow', 'decoration', 'outline', 'divide', 'accent', 'caret', 'placeholder'
]

const UTILITY_PATTERN = new RegExp(
  '\\b(' + UTILITIES.join('|') + ')-\\[(#[0-9a-fA-F]{6})\\](/\\d+)?',
  'g'
)
const BARE_PATTERN = /#[0-9a-fA-F]{6}\b/g
const IN_ARBITRARY = /-\[$/

const walk = (dir) => readdirSync(dir).flatMap((entry) => {
  const path = join(dir, entry)
  return statSync(path).isDirectory() ? walk(path) : [path]
})

const luminance = (hex) => {
  const channel = (index) => {
    const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
}

export const scanTheme = (key) => {
  const dir = join(ROOT, key)
  const files = walk(dir).filter((file) => /\.(vue|ts)$/.test(file))
  const hits = new Map()

  const record = (hex, utility, file, withOpacity) => {
    const normalised = hex.toLowerCase()
    if (!hits.has(normalised)) {
      hits.set(normalised, {
        hex: normalised,
        total: 0,
        opacityUses: 0,
        utilities: {},
        files: new Set()
      })
    }
    const entry = hits.get(normalised)
    entry.total += 1
    if (withOpacity) entry.opacityUses += 1
    entry.utilities[utility] = (entry.utilities[utility] || 0) + 1
    entry.files.add(file.slice(dir.length + 1))
  }

  for (const file of files) {
    const source = readFileSync(file, 'utf8')

    // Pass 1: hexes carried by a Tailwind utility, which tells us the role.
    for (const match of source.matchAll(UTILITY_PATTERN)) {
      record(match[2], match[1], file, Boolean(match[3]))
    }

    // Pass 2: hexes in <style> blocks or inline styles, role unknown.
    for (const match of source.matchAll(BARE_PATTERN)) {
      const preceding = source.slice(Math.max(0, match.index - 24), match.index)
      if (IN_ARBITRARY.test(preceding)) continue
      record(match[0], 'css', file, false)
    }
  }

  return [...hits.values()]
    .map((entry) => ({
      ...entry,
      files: [...entry.files],
      luminance: Number(luminance(entry.hex).toFixed(3)),
      dominant: Object.entries(entry.utilities).sort((a, b) => b[1] - a[1])[0][0]
    }))
    .sort((a, b) => b.total - a.total)
}

const report = (key) => {
  const rows = scanTheme(key)
  const uses = rows.reduce((sum, row) => sum + row.total, 0)
  const opacity = rows.reduce((sum, row) => sum + row.opacityUses, 0)

  console.log('')
  console.log(`===== ${key} — ${rows.length} colours, ${uses} uses, ${opacity} with opacity =====`)
  console.log('  lum    count  dominant   hex        breakdown')
  for (const row of rows) {
    const breakdown = Object.entries(row.utilities)
      .sort((a, b) => b[1] - a[1])
      .map(([utility, count]) => `${utility}:${count}`)
      .join(' ')
    console.log(
      `  ${String(row.luminance).padEnd(6)} ${String(row.total).padStart(5)}  ${row.dominant.padEnd(9)} ${row.hex}   ${breakdown}`
    )
  }
}

const args = process.argv.slice(2)
const targets = args[0] === '--all'
  ? readdirSync(ROOT).filter((entry) => statSync(join(ROOT, entry)).isDirectory())
  : args

for (const target of targets) report(target)
