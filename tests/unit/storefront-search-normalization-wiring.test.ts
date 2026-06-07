import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const templatesDir = path.resolve(process.cwd(), 'components/storefront/templates')

describe('storefront search normalization wiring', () => {
    it('uses normalizeSearchText on both query and compared product text in every Shop.vue', () => {
        const templateDirs = fs
            .readdirSync(templatesDir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)

        for (const templateName of templateDirs) {
            const shopPath = path.join(templatesDir, templateName, 'Shop.vue')
            if (!fs.existsSync(shopPath)) continue

            const source = fs.readFileSync(shopPath, 'utf8')

            expect(source).toContain("const q = normalizeSearchText(searchQuery.value)")
            expect(source).toContain("normalizeSearchText(p.title).includes(q)")
            expect(source).toContain("normalizeSearchText(p.searchKeywords).includes(q)")
            expect(source).not.toMatch(/p\.title\.toLowerCase\(\)\.includes\(q\)/)
            expect(source).not.toMatch(/p\.searchKeywords\.toLowerCase\(\)\.includes\(q\)/)
        }
    })
})
