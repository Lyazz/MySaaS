import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import { MatchingService } from '../../backend/src/modules/ai-documents/matching.service'
import { aliasKey } from '../../backend/src/lib/text-match'

/**
 * Match precedence: a printed identifier beats a remembered mapping, which
 * beats a guess at the words. Getting this order wrong is how a scan lands
 * stock on the wrong variant.
 */
describe('AI document line matching', () => {
    const slug = `ai-match-${Date.now()}`
    const service = new MatchingService()

    let tenantId: string
    let supplierId: string
    let chocolateId: string
    let barcodedId: string
    let skuedId: string
    let aliasedId: string

    const makeVariant = async (title: string, sku: string, barcode?: string) => {
        const product = await prisma.product.create({
            data: {
                tenantId,
                title,
                slug: `${slug}-${sku.toLowerCase()}`,
                price: 100,
                stock: 0,
                isActive: true
            }
        })
        const variant = await prisma.productVariant.create({
            data: {
                tenantId,
                productId: product.id,
                sku,
                barcode: barcode ?? null,
                price: 100,
                cost: 60,
                stock: 0,
                isActive: true
            }
        })
        return variant.id
    }

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { publishedAt: new Date(), name: 'AI Match Tenant', slug }
        })
        tenantId = tenant.id

        const supplier = await prisma.supplier.create({
            data: { tenantId, name: 'Fournisseur Test' }
        })
        supplierId = supplier.id

        chocolateId = await makeVariant('Chocolat noir 100g', `CHOCM${String(Date.now()).slice(-5)}`)
        barcodedId = await makeVariant('Produit code-barres', `BARM${String(Date.now()).slice(-5)}`, 'EAN123456')
        skuedId = await makeVariant('Produit reference', 'REFM12345')
        aliasedId = await makeVariant('Nom interne opaque XZ9', `ALSM${String(Date.now()).slice(-5)}`)

        await prisma.supplierProductAlias.create({
            data: {
                tenantId,
                supplierId,
                rawLabel: aliasKey('BIDON XZ9 5L'),
                variantId: aliasedId
            }
        })
    })

    afterAll(async () => {
        await prisma.supplierProductAlias.deleteMany({ where: { tenantId } })
        await prisma.supplier.deleteMany({ where: { tenantId } })
        await prisma.productVariant.deleteMany({ where: { tenantId } })
        await prisma.product.deleteMany({ where: { tenantId } })
        await prisma.tenant.delete({ where: { id: tenantId } })
    })

    it('prefers a printed barcode over everything else', async () => {
        const variants = await service.loadVariants(tenantId)
        const aliases = await service.loadAliases(tenantId, supplierId)

        // Label points at the chocolate, barcode points elsewhere: barcode wins.
        const match = service.matchLine(
            { label: 'Chocolat noir 100g', sku: null, barcode: 'ean123456' },
            variants,
            aliases
        )
        expect(match.matchSource).toBe('barcode')
        expect(match.variantId).toBe(barcodedId)
    })

    it('falls back to a printed SKU when there is no barcode', async () => {
        const variants = await service.loadVariants(tenantId)
        const aliases = await service.loadAliases(tenantId, supplierId)

        const match = service.matchLine(
            { label: 'Chocolat noir 100g', sku: 'refm12345', barcode: null },
            variants,
            aliases
        )
        expect(match.matchSource).toBe('sku')
        expect(match.variantId).toBe(skuedId)
    })

    it('uses alias memory when no identifier is printed', async () => {
        const variants = await service.loadVariants(tenantId)
        const aliases = await service.loadAliases(tenantId, supplierId)

        // Nothing about "BIDON XZ9 5 L" resembles "Nom interne opaque XZ9";
        // only the remembered mapping connects them.
        const match = service.matchLine(
            { label: 'BIDON XZ9 5 L', sku: null, barcode: null },
            variants,
            aliases
        )
        expect(match.matchSource).toBe('alias')
        expect(match.variantId).toBe(aliasedId)
    })

    it('does not apply another supplier\'s alias', async () => {
        const variants = await service.loadVariants(tenantId)
        const aliases = await service.loadAliases(tenantId, null)

        const match = service.matchLine(
            { label: 'BIDON XZ9 5 L', sku: null, barcode: null },
            variants,
            aliases
        )
        expect(match.matchSource).not.toBe('alias')
    })

    it('fuzzy-matches a differently-spelled label', async () => {
        const variants = await service.loadVariants(tenantId)
        const aliases = await service.loadAliases(tenantId, supplierId)

        const match = service.matchLine(
            { label: 'CHOC. NOIR 100 GR', sku: null, barcode: null },
            variants,
            aliases
        )
        expect(match.matchSource).toBe('fuzzy')
        expect(match.variantId).toBe(chocolateId)
    })

    it('offers candidates without pre-selecting when it is not sure', async () => {
        const variants = await service.loadVariants(tenantId)
        const aliases = await service.loadAliases(tenantId, supplierId)

        const match = service.matchLine(
            { label: 'Chocolat', sku: null, barcode: null },
            variants,
            aliases
        )
        expect(match.matchSource).toBe('none')
        expect(match.variantId).toBeNull()
        expect(match.candidates.map((c) => c.variantId)).toContain(chocolateId)
    })

    it('returns nothing for a label that matches no product', async () => {
        const variants = await service.loadVariants(tenantId)
        const aliases = await service.loadAliases(tenantId, supplierId)

        const match = service.matchLine(
            { label: 'Pneu tracteur 18 pouces', sku: null, barcode: null },
            variants,
            aliases
        )
        expect(match.matchSource).toBe('none')
        expect(match.variantId).toBeNull()
    })

    it('ignores an alias pointing at an archived variant', async () => {
        await prisma.productVariant.update({ where: { id: aliasedId }, data: { isActive: false } })

        const variants = await service.loadVariants(tenantId)
        const aliases = await service.loadAliases(tenantId, supplierId)
        const match = service.matchLine(
            { label: 'BIDON XZ9 5 L', sku: null, barcode: null },
            variants,
            aliases
        )
        expect(match.variantId).not.toBe(aliasedId)

        await prisma.productVariant.update({ where: { id: aliasedId }, data: { isActive: true } })
    })

    it('increments hitCount instead of duplicating a remembered alias', async () => {
        await service.rememberAliases(tenantId, supplierId, [
            { label: 'BIDON XZ9 5L', variantId: aliasedId }
        ])
        const rows = await prisma.supplierProductAlias.findMany({
            where: { tenantId, supplierId, rawLabel: aliasKey('BIDON XZ9 5L') }
        })
        expect(rows).toHaveLength(1)
        expect(rows[0]!.hitCount).toBe(2)
    })

    it('keeps a store-wide alias to a single row', async () => {
        await service.rememberAliases(tenantId, null, [{ label: 'GLOBAL LABEL', variantId: chocolateId }])
        await service.rememberAliases(tenantId, null, [{ label: 'Global  label', variantId: chocolateId }])

        const rows = await prisma.supplierProductAlias.findMany({
            where: { tenantId, supplierId: null, rawLabel: aliasKey('GLOBAL LABEL') }
        })
        expect(rows).toHaveLength(1)
        expect(rows[0]!.hitCount).toBe(2)
    })
})
