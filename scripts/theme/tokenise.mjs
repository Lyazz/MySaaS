/**
 * Rewrites a template's hardcoded hexes to its token scale.
 *
 *   node scripts/theme/tokenise.mjs nour --dry
 *   node scripts/theme/tokenise.mjs nour
 *
 * Three kinds of occurrence, three rewrites:
 *
 *   bg-[#FAF3EA]        -> bg-nr-bg
 *   border-[#C9A24B]/35 -> border-nr-accent/35     (the reason tokens are
 *                                                    declared as rgb channels)
 *   #FAF3EA in <style>  -> var(--nr-bg)
 *
 * The map comes from the theme's own `theme.tokens.ts`, so the rewrite is
 * lossless by construction: every hex resolves back to the same value at
 * runtime. Anything the manifest does not name is left alone and reported —
 * an unmapped hex is a missing token, not a licence to guess.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'components/storefront/templates'
/**
 * Sorted longest-first so `ring-offset-[#fff]` is not claimed by `ring`, and
 * `border-t-[#fff]` not by `border`.
 */
const COLOR_UTILITIES = [
  'ring-offset', 'divide-x', 'divide-y',
  'border-x', 'border-y', 'border-t', 'border-b',
  'border-l', 'border-r', 'border-s', 'border-e',
  'placeholder', 'decoration', 'outline', 'stroke',
  'accent', 'border', 'divide', 'shadow', 'caret',
  'fill', 'from', 'ring', 'text', 'via', 'bg', 'to'
].sort((a, b) => b.length - a.length)

const kebab = (value) => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const walk = (dir) => readdirSync(dir).flatMap((entry) => {
  const path = join(dir, entry)
  return statSync(path).isDirectory() ? walk(path) : [path]
})

/**
 * Pulls `hex -> token` out of a manifest by reading it as text.
 *
 * Parsing the source rather than importing it keeps this script free of the
 * Nuxt `~` alias and the TypeScript loader, so it runs under plain node.
 */
const loadMap = (key) => {
  const source = readFileSync(join(ROOT, key, 'theme.tokens.ts'), 'utf8')

  const prefix = /prefix:\s*'([^']+)'/.exec(source)?.[1]
  if (!prefix) throw new Error(`${key}: manifest has no prefix`)

  const section = (name) => {
    const start = source.indexOf(`${name}: {`)
    if (start === -1) return ''
    let depth = 0
    for (let i = start + name.length + 1; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1
      if (source[i] === '}') {
        depth -= 1
        if (depth === 0) return source.slice(start, i)
      }
    }
    return ''
  }

  const map = new Map()
  const collisions = []

  for (const block of [section('color'), section('extra')]) {
    for (const match of block.matchAll(/(\w+):\s*'(#[0-9a-fA-F]{6})'/g)) {
      const hex = match[2].toLowerCase()
      const token = `${prefix}-${kebab(match[1])}`
      if (map.has(hex) && map.get(hex) !== token) {
        collisions.push(`${hex} claimed by both ${map.get(hex)} and ${token}`)
        continue
      }
      map.set(hex, token)
    }
  }

  // Neutral families the manifest folds onto its ramp. Chromatic families are
  // never listed: those classes carry fixed meanings a tenant may not repaint,
  // so the stock palette is where they belong.
  const familiesMatch = /rampFamilies:\s*\[([^\]]*)\]/.exec(source)
  const rampFamilies = familiesMatch
    ? [...familiesMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
    : []

  return { prefix, map, collisions, rampFamilies }
}

const tokenise = (key, { dry }) => {
  const { prefix, map, collisions, rampFamilies } = loadMap(key)
  const dir = join(ROOT, key)
  const files = walk(dir).filter((file) => /\.vue$/.test(file))

  const utilityPattern = new RegExp(
    '\\b(' + COLOR_UTILITIES.join('|') + ')-\\[(#[0-9a-fA-F]{6})\\](/\\d+)?',
    'g'
  )

  const rampPattern = rampFamilies.length
    ? new RegExp(
      '\\b(' + COLOR_UTILITIES.join('|') + ')-(' + rampFamilies.join('|') + ')-(\\d{2,3})\\b(/\\d+)?',
      'g'
    )
    : null

  const declarations = []
  let rampRewrites = 0
  let rewritten = 0
  let touched = 0
  const unmapped = new Map()

  for (const file of files) {
    const original = readFileSync(file, 'utf8')
    let next = original

    // Utility classes, with or without an opacity modifier.
    next = next.replace(utilityPattern, (whole, utility, hex, opacity) => {
      const token = map.get(hex.toLowerCase())
      if (!token) {
        unmapped.set(hex.toLowerCase(), (unmapped.get(hex.toLowerCase()) || 0) + 1)
        return whole
      }
      rewritten += 1
      return `${utility}-${token}${opacity || ''}`
    })

    // Default-Tailwind neutral classes fold onto the theme's ramp, keeping the
    // step so `slate-400` and `gray-400` both become `ramp-400`. Opacity
    // modifiers survive because the ramp is declared in channel form too.
    if (rampPattern) {
      next = next.replace(rampPattern, (whole, utility, family, shade, opacity) => {
        rampRewrites += 1
        return `${utility}-${prefix}-ramp-${shade}${opacity || ''}`
      })
    }

    // Inline style attributes, static and bound alike. `chrono` keeps most of
    // its colour here rather than in classes, and Vue assigning
    // `el.style.color = 'var(--ch-brand)'` resolves the same as a stylesheet
    // would. Scoped to the attribute so hexes in <script> — a picker default,
    // a seeded value — are never touched.
    next = next.replace(/(:?style=")([^"]*)"/g, (whole, attribute, body) => {
      const rewrittenBody = body.replace(/#[0-9a-fA-F]{6}\b/g, (hex) => {
        const token = map.get(hex.toLowerCase())
        if (!token) {
          unmapped.set(hex.toLowerCase(), (unmapped.get(hex.toLowerCase()) || 0) + 1)
          return hex
        }
        rewritten += 1
        return `var(--${token})`
      })
      return `${attribute}${rewrittenBody}"`
    })

    // Bare hexes inside <style> blocks become var() references — except where
    // the hex is the value of a custom property declaration. Rewriting those
    // produces `--emb-ink: var(--emb-ink)`, a cycle that makes the property
    // guaranteed-invalid and silently unstyles everything reading it. The
    // manifest owns those declarations now, so they are reported for deletion
    // rather than rewritten.
    const styleStart = next.indexOf('<style')
    if (styleStart !== -1) {
      const head = next.slice(0, styleStart)
      const tail = next.slice(styleStart).replace(
        /(--[a-z0-9-]+\s*:\s*)?(#[0-9a-fA-F]{6})\b/g,
        (whole, declaration, hex) => {
          if (declaration) {
            declarations.push(`${file.slice(dir.length + 1)}: ${declaration.trim()} ${hex}`)
            return whole
          }

          const token = map.get(hex.toLowerCase())
          if (!token) {
            unmapped.set(hex.toLowerCase(), (unmapped.get(hex.toLowerCase()) || 0) + 1)
            return whole
          }
          rewritten += 1
          return `var(--${token})`
        }
      )
      next = head + tail
    }

    if (next !== original) {
      touched += 1
      if (!dry) writeFileSync(file, next, 'utf8')
    }
  }

  console.log('')
  console.log(`===== ${key} (${prefix}) ${dry ? '— DRY RUN' : ''} =====`)
  console.log(`  ${rewritten} occurrences rewritten across ${touched} files`)

  if (rampFamilies.length) {
    const families = rampFamilies.join(', ')
    console.log(`  ${rampRewrites} neutral-scale classes folded onto the ramp (${families})`)
  }

  if (collisions.length) {
    console.log('  manifest collisions:')
    for (const line of collisions) console.log(`    ! ${line}`)
  }

  if (declarations.length) {
    console.log('  custom property declarations left in place (the manifest owns these now):')
    for (const line of declarations) console.log(`    ${line}`)
  }

  if (unmapped.size) {
    console.log('  unmapped hexes (add these to the manifest):')
    for (const [hex, count] of [...unmapped].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${hex}  x${count}`)
    }
  } else {
    console.log('  no unmapped hexes')
  }

  return { rewritten, unmapped: unmapped.size }
}

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const targets = args.filter((arg) => !arg.startsWith('--'))

if (!targets.length) {
  console.error('usage: node scripts/theme/tokenise.mjs <theme> [<theme>...] [--dry]')
  process.exit(1)
}

for (const target of targets) tokenise(target, { dry })
