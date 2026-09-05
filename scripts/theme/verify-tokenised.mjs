/**
 * Confirms a tokenised template still resolves to the colours it had before.
 *
 *   npx tailwindcss -c tailwind.config.ts -i probe.css -o out.css
 *   node scripts/theme/verify-tokenised.mjs nour out.css
 *
 * Two failures are possible after a codemod and both are silent in the
 * browser, which is why this exists:
 *
 *   1. A rewritten class does not exist in the compiled stylesheet, so the
 *      element renders with no colour at all.
 *   2. A class exists but points at a custom property the provider never
 *      emits, so it falls back to `initial`.
 *
 * Checking the compiled CSS catches the first; checking it against the
 * manifest's own var list catches the second.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'components/storefront/templates'

const kebab = (value) => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const walk = (dir) => readdirSync(dir).flatMap((entry) => {
  const path = join(dir, entry)
  return statSync(path).isDirectory() ? walk(path) : [path]
})

const [key, cssPath] = process.argv.slice(2)

if (!key || !cssPath) {
  console.error('usage: node scripts/theme/verify-tokenised.mjs <theme> <compiled.css>')
  process.exit(1)
}

const manifest = readFileSync(join(ROOT, key, 'theme.tokens.ts'), 'utf8')
const prefix = /prefix:\s*'([^']+)'/.exec(manifest)[1]

/** Extract one top-level object literal from the manifest source. */
const section = (name) => {
  const start = manifest.indexOf(`${name}: {`)
  if (start === -1) return ''
  let depth = 0
  for (let i = start + name.length + 1; i < manifest.length; i += 1) {
    if (manifest[i] === '{') depth += 1
    if (manifest[i] === '}') {
      depth -= 1
      if (depth === 0) return manifest.slice(start, i)
    }
  }
  return ''
}

// Every var the provider will emit, derived the same way tokensToCssVars does.
// The ramp is read separately because its keys nest under `ramp` and are bare
// numbers — `50: '#F8FAFC'` becomes `--mo-ramp-50`, not `--mo-50`.
const emitted = new Set()
const rampBlock = section('ramp')

for (const match of manifest.matchAll(/(\w+):\s*'(#[0-9a-fA-F]{6})'/g)) {
  if (rampBlock && rampBlock.includes(match[0])) continue
  emitted.add(`--${prefix}-${kebab(match[1])}-rgb`)
  emitted.add(`--${prefix}-${kebab(match[1])}`)
}

for (const match of rampBlock.matchAll(/(\d+):\s*'(#[0-9a-fA-F]{6})'/g)) {
  emitted.add(`--${prefix}-ramp-${match[1]}-rgb`)
  emitted.add(`--${prefix}-ramp-${match[1]}`)
}

const css = readFileSync(cssPath, 'utf8')
const classPattern = new RegExp('\\b(?:[a-z-]+)-' + prefix + '-[a-z0-9-]+(?:/\\d+)?', 'g')

const used = new Set()
for (const file of walk(join(ROOT, key)).filter((f) => /\.vue$/.test(f))) {
  for (const match of readFileSync(file, 'utf8').matchAll(classPattern)) {
    used.add(match[0])
  }
}

/**
 * Every tokenised utility the stylesheet actually defines.
 *
 * Read off the selectors rather than matched one at a time, because a class
 * written as `hover:bg-nr-ink` compiles to `.hover\:bg-nr-ink:hover` — the
 * variant is part of the selector but not of the name we are checking.
 */
const generated = new Set()
// Tailwind escapes `/` in selectors, so `bg-nr-ink/40` is written
// `.bg-nr-ink\/40`. Unescape before matching or every opacity modifier reads
// as absent.
for (const match of css.replace(/\\\//g, '/').matchAll(classPattern)) {
  generated.add(match[0])
}

/** Theme vars a rule depends on. Tailwind's own `--tw-*` are not our concern. */
const themeVarPattern = new RegExp('var\\((--' + prefix + '-[a-z0-9-]+)', 'g')

const missingClass = []
const missingVar = []

for (const className of [...used].sort()) {
  if (!generated.has(className)) {
    missingClass.push(className)
    continue
  }

  // Tailwind escapes `/` in the selector; find the rule that defines it.
  const selector = '.' + className.replace('/', '\\/')
  const index = css.indexOf(selector)
  if (index === -1) continue

  const body = css.slice(index, css.indexOf('}', index))
  for (const varMatch of body.matchAll(themeVarPattern)) {
    if (!emitted.has(varMatch[1])) missingVar.push(`${className} -> ${varMatch[1]}`)
  }
}

console.log(`${key}: ${used.size} tokenised classes in use`)

if (missingClass.length) {
  console.log(`  MISSING FROM STYLESHEET (${missingClass.length}):`)
  for (const name of missingClass) console.log(`    ${name}`)
}

if (missingVar.length) {
  console.log(`  VAR NOT EMITTED BY PROVIDER (${missingVar.length}):`)
  for (const line of missingVar) console.log(`    ${line}`)
}

if (!missingClass.length && !missingVar.length) {
  console.log('  all classes compile and resolve to emitted custom properties')
}

process.exit(missingClass.length || missingVar.length ? 1 : 0)
