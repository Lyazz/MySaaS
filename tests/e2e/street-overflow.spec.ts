import { test, expect } from '@playwright/test'

/**
 * Guards the "street" storefront template against horizontal overflow — a
 * sideways scrollbar on the page body. On failure it also prints which
 * elements stick out past the viewport so the offender is easy to find.
 */

const HOST = process.env.STREET_HOST || 'test.localhost:3000'

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'shop', path: '/products' },
  { name: 'cart', path: '/cart' },
]

const WIDTHS = [
  { label: 'mobile', width: 375, height: 812 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'desktop', width: 1280, height: 900 },
]

const measure = async (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const de = document.documentElement
    const vw = de.clientWidth
    const overflow = de.scrollWidth - vw

    const clipsX = (el: Element) => {
      const s = getComputedStyle(el)
      return /(hidden|clip|scroll|auto)/.test(s.overflowX) || /(hidden|clip|scroll|auto)/.test(s.overflowY)
    }
    // An element only adds to page scroll if nothing between it and <body>
    // clips the horizontal overflow.
    const isClipped = (el: Element) => {
      let p = el.parentElement
      while (p && p !== document.body && p !== de) {
        if (clipsX(p)) return true
        p = p.parentElement
      }
      return false
    }

    const offenders: Array<{ tag: string; cls: string; right: number; left: number; w: number }> = []
    if (overflow > 0) {
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return
        if (r.right <= vw + 1 && r.left >= -1) return
        if (isClipped(el)) return
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 100),
          right: Math.round(r.right),
          left: Math.round(r.left),
          w: Math.round(r.width),
        })
      })
    }
    // the element whose edge is closest to the actual scroll width is
    // usually the real cause; show the most extreme first
    offenders.sort((a, b) => Math.max(b.right, -b.left) - Math.max(a.right, -a.left))
    return { vw, overflow, offenders: offenders.slice(0, 12) }
  })

const assertNoOverflow = async (
  page: import('@playwright/test').Page,
  label: string,
) => {
  const report = await measure(page)
  if (report.overflow > 0) {
    console.log(
      `\n[${label}] viewport=${report.vw}px overflow=${report.overflow}px\n` +
        report.offenders.map((o) => `  <${o.tag}.${o.cls}>  left=${o.left} right=${o.right} w=${o.w}`).join('\n'),
    )
  }
  expect(report.overflow, `horizontal overflow of ${report.overflow}px`).toBeLessThanOrEqual(0)
}

for (const pg of PAGES) {
  for (const vp of WIDTHS) {
    test(`no horizontal overflow: ${pg.name} @ ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(`http://${HOST}${pg.path}`, { waitUntil: 'networkidle' })
      await assertNoOverflow(page, `${pg.name} @ ${vp.label}`)
    })
  }
}

for (const vp of WIDTHS) {
  test(`no horizontal overflow: product @ ${vp.label}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto(`http://${HOST}/products`, { waitUntil: 'networkidle' })
    const href = await page.locator('a[href^="/product/"]').first().getAttribute('href')
    test.skip(!href, 'no product link found on the shop page')
    await page.goto(`http://${HOST}${href}`, { waitUntil: 'networkidle' })
    await assertNoOverflow(page, `product (${href}) @ ${vp.label}`)
  })
}

test('mobile menu drawer opens without a render error', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`http://${HOST}/`, { waitUntil: 'networkidle' })

  // dismiss the clearance announcement modal if it auto-opened
  const clearanceClose = page.locator('.cl-backdrop button').first()
  if (await clearanceClose.isVisible().catch(() => false)) {
    await clearanceClose.click()
    await expect(page.locator('.cl-backdrop')).toHaveCount(0)
  }

  await page.locator('button:has([class*="i-lucide:menu"])').first().click()

  const drawer = page.locator('.fixed.top-0.start-0.bottom-0')
  await expect(drawer).toBeVisible()
  await expect(drawer.locator('nav a').first()).toBeVisible()
  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([])
})
