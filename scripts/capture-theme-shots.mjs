/*
 * Captures the /themes gallery images straight from the demo storefronts.
 *
 * The marketing page used to draw each theme as a hand-built mock — a card, a
 * colour and a font picked by hand. That is a guess about what the theme looks
 * like, and it drifts the moment a theme is touched. These are photographs of
 * the real thing: the same pages a visitor reaches through "view the demo
 * store", rendered by the app itself.
 *
 * Demo stores are seeded with slug === theme key (scripts/seed-theme-demo-stores.mjs)
 * and resolved from the Host header, so `modern` lives at `modern.<base>`.
 *
 * Usage:
 *   npm run dev                      # or point --base at a deployed host
 *   npm run themes:shots
 *   node scripts/capture-theme-shots.mjs --base=swekly.com --https
 *   node scripts/capture-theme-shots.mjs --only=modern,street
 *
 * Re-run it whenever a theme's storefront changes; the output is committed so
 * the marketing page does not depend on the demo stores being up.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { chromium } from 'playwright'
import sharp from 'sharp'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`))
    return hit ? hit.slice(name.length + 3) : fallback
}

const BASE = flag('base', 'localhost:3000')
const PROTOCOL = args.includes('--https') ? 'https' : 'http'
const OUT_DIR = flag('out', 'public/themes')
const ONLY = flag('only', '').split(',').map((s) => s.trim()).filter(Boolean)

/* Captured wide, published at half: the shots stay sharp on a 2x display. */
const VIEWPORT = { width: 1440, height: 1080 }
const OUTPUT_WIDTH = 1152

/*
 * The theme list lives in one place. Reading it back out of the catalogue
 * rather than repeating it here is what stops a new theme from shipping with
 * a card and no picture.
 */
const catalogue = readFileSync('shared/storefront/theme/catalogue.ts', 'utf8')
const keys = [...catalogue.matchAll(/^ {4}key: '([a-z]+)'/gm)].map((m) => m[1])
if (!keys.length) {
    console.error('No theme keys found in shared/storefront/theme/catalogue.ts')
    process.exit(1)
}

const targets = ONLY.length ? keys.filter((key) => ONLY.includes(key)) : keys
if (!targets.length) {
    console.error(`--only matched nothing. Known themes: ${keys.join(', ')}`)
    process.exit(1)
}

mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch({
    // Set when the locally installed browser build does not match the package.
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined
})

/*
 * French, because that is what the storefronts are written in and what the
 * Algerian market reads. The gallery shows one language; the demo link behind
 * each card is where a visitor switches.
 */
const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'fr-FR',
    reducedMotion: 'reduce'
})

const failures = []

for (const key of targets) {
    const url = `${PROTOCOL}://${key}.${BASE}/`
    const page = await context.newPage()

    try {
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })
        if (response && !response.ok()) throw new Error(`HTTP ${response.status()}`)

        /* Walk the page once so anything lazy-loaded above the fold has decoded. */
        await page.evaluate(async () => {
            for (let y = 0; y < 3000; y += 600) {
                window.scrollTo(0, y)
                await new Promise((resolve) => setTimeout(resolve, 120))
            }
            window.scrollTo(0, 0)
        })

        /* The dev server's own overlays are not part of the theme. */
        await page.evaluate(() => {
            document
                .querySelectorAll('#nuxt-devtools-container, #vue-tracer-overlay, nuxt-devtools-inspect-panel')
                .forEach((node) => node.remove())
        })

        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(600)

        const png = await page.screenshot({ type: 'png' })
        const webp = await sharp(png)
            .resize({ width: OUTPUT_WIDTH })
            .webp({ quality: 80 })
            .toBuffer()

        const file = path.join(OUT_DIR, `${key}.webp`)
        writeFileSync(file, webp)
        console.log(`${key.padEnd(12)} ${(webp.length / 1024).toFixed(0)} KB  ${file}`)
    } catch (error) {
        failures.push(`${key}: ${error.message}`)
        console.error(`${key.padEnd(12)} FAILED  ${error.message}`)
    } finally {
        await page.close()
    }
}

await browser.close()

if (failures.length) {
    console.error(`\n${failures.length} theme(s) not captured:\n  ${failures.join('\n  ')}`)
    process.exit(1)
}
