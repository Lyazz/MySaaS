/**
 * Reports the default-Tailwind palette classes a template leans on, so they can
 * be assigned to roles the same way its hexes were.
 *
 *   node scripts/theme/scan-scale.mjs modern
 *   node scripts/theme/scan-scale.mjs --all
 *
 * Ten of the fifteen templates express most of their colour as `text-slate-400`
 * rather than `text-[#94a3b8]`. Those are fixed values a tenant cannot repaint,
 * so the creator needs them behind roles too — but unlike the hexes, deciding
 * whether `slate-400` is `inkFaint` or `inkSoft` is a judgement about the
 * design. This script narrows it: it groups by the utility each class appears
 * under and sorts by luminance within the group, which is nearly always enough
 * to read the intended ladder straight off.
 *
 * `--brand` families are excluded; those already follow the tenant.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const palette = require('tailwindcss/colors')

const ROOT = 'components/storefront/templates'

// Touching these prints a v2-rename warning per access, and they are aliases of
// families already in the list. Skipping them keeps the report readable.
const DEPRECATED = new Set(['lightBlue', 'warmGray', 'trueGray', 'coolGray', 'blueGray'])

/** Families that carry structure: type, grounds, rules. */
const NEUTRALS = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone'])

/** Families that carry a fixed meaning, whatever shade they appear in. */
const SEMANTIC = {
  red: 'danger',
  rose: 'sale',
  pink: 'sale',
  amber: 'warning',
  yellow: 'warning',
  orange: 'warning',
  emerald: 'success',
  green: 'success',
  lime: 'success',
  teal: 'success'
}

const FAMILIES = Object.keys(palette).filter(
  (name) => !DEPRECATED.has(name) && palette[name] && typeof palette[name] === 'object' && palette[name][500]
)
const UTILITIES = [
  'ring-offset', 'divide', 'placeholder', 'decoration', 'outline',
  'stroke', 'border', 'shadow', 'accent', 'caret', 'fill',
  'from', 'ring', 'text', 'via', 'bg', 'to'
].sort((a, b) => b.length - a.length)

const CLASS_PATTERN = new RegExp(
  '\\b(' + UTILITIES.join('|') + ')-(' + FAMILIES.join('|') + ')-(\\d{2,3})\\b(/\\d+)?',
  'g'
)

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

const TYPE_UTILITIES = new Set(['text', 'fill', 'stroke', 'decoration', 'placeholder'])
const GROUND_UTILITIES = new Set(['bg', 'from', 'via', 'to'])
const RULE_UTILITIES = new Set(['border', 'divide', 'ring', 'outline', 'ring-offset'])

/**
 * Assign roles across the whole theme at once.
 *
 * Doing this per-colour does not work: `slate-500` and `slate-600` are both
 * "a secondary grey", and which is `inkSoft` depends on what else the template
 * uses. So the neutrals are bucketed by the utility that dominates them, then
 * ranked by luminance within the bucket and handed the role ladder in order.
 * Chromatic families skip all of that — a red is a red at any shade.
 */
const assignRoles = (rows, scheme) => {
  const dark = scheme === 'dark'
  const bucket = { type: [], ground: [], rule: [] }

  for (const row of rows) {
    if (!NEUTRALS.has(row.family)) {
      row.suggested = SEMANTIC[row.family] || 'accent?'
      continue
    }
    if (TYPE_UTILITIES.has(row.dominant)) bucket.type.push(row)
    else if (GROUND_UTILITIES.has(row.dominant)) bucket.ground.push(row)
    else if (RULE_UTILITIES.has(row.dominant)) bucket.rule.push(row)
    else row.suggested = '?'
  }

  // Type runs darkest-to-lightest on a light theme and the reverse on a dark
  // one; either way the most contrasting weight is `ink`.
  const typeLadder = ['ink', 'inkSoft', 'inkFaint']
  bucket.type.sort((a, b) => (dark ? b.luminance - a.luminance : a.luminance - b.luminance))
  bucket.type.forEach((row, index) => {
    row.suggested = typeLadder[Math.min(index, typeLadder.length - 1)]
    if (index >= typeLadder.length) row.suggested += ' (extra)'
  })

  // Grounds run the other way: the most extreme is the page, then surfaces.
  const groundLadder = ['bg', 'surface', 'bgAlt', 'surfaceAlt']
  bucket.ground.sort((a, b) => (dark ? a.luminance - b.luminance : b.luminance - a.luminance))
  bucket.ground.forEach((row, index) => {
    row.suggested = groundLadder[Math.min(index, groundLadder.length - 1)]
    if (index >= groundLadder.length) row.suggested += ' (extra)'
  })

  const ruleLadder = ['border', 'borderStrong']
  bucket.rule.sort((a, b) => (dark ? a.luminance - b.luminance : b.luminance - a.luminance))
  bucket.rule.forEach((row, index) => {
    row.suggested = ruleLadder[Math.min(index, ruleLadder.length - 1)]
    if (index >= ruleLadder.length) row.suggested += ' (extra)'
  })

  return rows
}

export const scanScale = (key, scheme = 'light') => {
  const dir = join(ROOT, key)
  const files = walk(dir).filter((file) => /\.(vue|ts)$/.test(file))
  const hits = new Map()

  for (const file of files) {
    for (const match of readFileSync(file, 'utf8').matchAll(CLASS_PATTERN)) {
      const [, utility, family, shade, opacity] = match
      const hex = palette[family]?.[shade]
      if (!hex) continue

      const id = `${family}-${shade}`
      if (!hits.has(id)) {
        hits.set(id, { id, family, shade, hex, total: 0, opacityUses: 0, utilities: {} })
      }
      const entry = hits.get(id)
      entry.total += 1
      if (opacity) entry.opacityUses += 1
      entry.utilities[utility] = (entry.utilities[utility] || 0) + 1
    }
  }

  const rows = [...hits.values()].map((entry) => ({
    ...entry,
    dominant: Object.entries(entry.utilities).sort((a, b) => b[1] - a[1])[0][0],
    luminance: Number(luminance(entry.hex).toFixed(3)),
    suggested: '?'
  }))

  assignRoles(rows, scheme)

  return rows.sort((a, b) => b.total - a.total)
}

const report = (key, scheme) => {
  const rows = scanScale(key, scheme)
  const uses = rows.reduce((sum, row) => sum + row.total, 0)

  console.log('')
  console.log(`===== ${key} (${scheme}) — ${rows.length} scale colours, ${uses} uses =====`)
  console.log('  count  lum    hex       class          dominant   suggested       breakdown')
  for (const row of rows) {
    const breakdown = Object.entries(row.utilities)
      .sort((a, b) => b[1] - a[1])
      .map(([utility, count]) => `${utility}:${count}`)
      .join(' ')
    console.log(
      `  ${String(row.total).padStart(5)}  ${String(row.luminance).padEnd(6)} ${row.hex}   ` +
      `${row.id.padEnd(14)} ${row.dominant.padEnd(10)} ${row.suggested.padEnd(15)} ${breakdown}`
    )
  }
}

const args = process.argv.slice(2)
const scheme = args.includes('--dark') ? 'dark' : 'light'
const named = args.filter((arg) => !arg.startsWith('--'))
const targets = args.includes('--all')
  ? readdirSync(ROOT).filter((entry) => statSync(join(ROOT, entry)).isDirectory())
  : named

for (const target of targets) report(target, scheme)
