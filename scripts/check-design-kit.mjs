/*
 * Design-kit scale check for the admin surfaces.
 *
 * `.eslintrc.cjs` bans the raw palette classes, but `vue/no-restricted-class`
 * only accepts literal class names. The three rules that need patterns live
 * here: the type scale, the radius scale, and static inline styles.
 *
 * Run by `npm run lint`. See docs/design-system.md for the scales themselves.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const SCOPE_DIRS = [
  'pages/admin',
  'pages/super-admin',
  'components/admin',
  'components/super-admin',
  'components/ui',
  // Rendered only inside the admin shell (POS screen, cash drawer).
  'components/cash',
  'components/pos'
]
const SCOPE_FILES = ['layouts/admin.vue', 'layouts/super-admin.vue']

/*
 * Marketing and preview shells keep their own oversized radii on purpose, and
 * the template builder embeds storefront markup it does not own.
 */
const EXEMPT = [
  'pages/admin/template-builder.vue',
  'pages/admin/template-builder-preview.vue',
  'pages/admin/preview.vue',
  'pages/admin/preview-iframe.vue',
  'pages/admin/marketing/landing-page/new.vue'
]

const RULES = [
  {
    id: 'type-scale',
    pattern: /(?<![\w:./-])text-\[\d[\d.]*px\]/g,
    message:
      'one-off font size — use the named scale: text-micro, text-mini, text-xs, ' +
      'text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl'
  },
  {
    id: 'palette-variant',
    /*
     * `vue/no-restricted-class` compares whole class names, so a variant
     * prefix (`dark:text-slate-100`) or an opacity modifier (`bg-white/20`)
     * walks straight past it. Those are the same mistake.
     *
     * Translucent BLACK is deliberately excluded: `bg-black/60` is a modal
     * scrim or a photo overlay, and a scrim is black in both themes.
     */
    pattern:
      /(?<![\w./-])(?:[a-z-]+:)+(?:text|bg|border)-(?:white|slate|gray|zinc|neutral)(?:-\d+)?(?:\/\d+)?(?![\w./-])|(?<![\w./-])(?:text|bg|border)-(?:white|slate|gray|zinc|neutral)(?:-\d+)?\/\d+(?![\w./-])/g,
    message:
      'hardcoded palette colour behind a variant or opacity modifier — the token ' +
      'utilities already resolve per theme, so this pins the wrong colour in one of them'
  },
  {
    id: 'radius-scale',
    pattern: /(?<![\w:./-])rounded(-[sebtl])?-(sm|md|3xl)(?![\w./-])|(?<![\w:./-])rounded-\[[^\]]+\]/g,
    message:
      'off-scale radius — use rounded-lg (controls), rounded-xl (inner panels), ' +
      'rounded-2xl (cards and modals) or rounded-full'
  },
  {
    id: 'inline-style',
    /*
     * A static `style="…"` (never `:style`) that does nothing a utility class
     * does not already do. Deliberately narrow: composite styles — gradients,
     * color-mix, one-off shadows — are legitimate and must not be flagged, or
     * the check gets ignored.
     */
    pattern: new RegExp(
      String.raw`(?<![:\w-])style="\s*(?:` +
        [
          String.raw`color:\s*var\(--(?:text-(?:primary|secondary|tertiary|muted)|brand|brand-contrast)\)`,
          String.raw`background(?:-color)?:\s*var\(--(?:surface-[123]|admin-(?:content|sidebar|topbar)-bg|surface-border)\)`,
          String.raw`border(?:-top|-bottom|-right|-left)?:\s*1px solid var\(--(?:surface-border|admin-sidebar-border|admin-topbar-border)\)`,
          String.raw`border-color:\s*var\(--surface-border\)`
        ].join('|') +
        String.raw`)\s*;?\s*"`,
      'g'
    ),
    message:
      'static inline style that a utility already covers — use the class instead ' +
      '(text-primary, text-muted, surface-2, bg-sidebar, border-line, …). ' +
      'Reserve :style for values computed at runtime'
  }
]

function collect(dir, out) {
  let entries
  try {
    entries = readdirSync(path.join(ROOT, dir))
  } catch {
    return out
  }
  for (const entry of entries) {
    const rel = `${dir}/${entry}`
    if (statSync(path.join(ROOT, rel)).isDirectory()) collect(rel, out)
    else if (entry.endsWith('.vue')) out.push(rel)
  }
  return out
}

const files = [...SCOPE_DIRS.flatMap((d) => collect(d, [])), ...SCOPE_FILES].filter(
  (f) => !EXEMPT.includes(f)
)

let failures = 0
for (const file of files) {
  const source = readFileSync(path.join(ROOT, file), 'utf8')
  // Only the template half; <style> blocks and scripts are out of scope.
  const template = source.split('<style')[0]
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0
    const hits = [...template.matchAll(rule.pattern)]
    for (const hit of hits) {
      const line = template.slice(0, hit.index).split('\n').length
      console.error(`${file}:${line}  ${rule.id}  ${hit[0].slice(0, 60)}`)
      console.error(`    ${rule.message}`)
      failures += 1
    }
  }
}

if (failures) {
  console.error(`\n${failures} design-kit violation(s). See docs/design-system.md.`)
  process.exit(1)
}
console.log(`design-kit: ${files.length} admin files on scale`)
