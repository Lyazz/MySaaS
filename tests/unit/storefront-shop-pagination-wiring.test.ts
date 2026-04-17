import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const templatesDir = path.resolve(process.cwd(), 'components/storefront/templates')

describe('storefront shop pagination wiring', () => {
  it('applies pagination to every template Shop.vue', () => {
    const templateDirs = fs
      .readdirSync(templatesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    for (const templateName of templateDirs) {
      const shopPath = path.join(templatesDir, templateName, 'Shop.vue')
      if (!fs.existsSync(shopPath)) continue

      const source = fs.readFileSync(shopPath, 'utf8')

      expect(source).toContain('useProductPagination(filteredProducts, 12)')
      expect(source).toContain('<StorefrontProductPagination')
      expect(source).not.toContain('v-for="product in filteredProducts"')
      expect(source).not.toContain('v-for="(product, index) in filteredProducts"')
    }
  })
})
