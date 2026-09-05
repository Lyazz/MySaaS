import request from 'supertest'
import { describe, it, expect, afterEach, afterAll } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { DEFAULT_PROMO_CODE_PRESETS, seedDefaultPromoCodes } from '../../backend/src/modules/promo-codes/presets'

/**
 * The 6 demo codes every tenant should land on in Marketing > Codes promo —
 * seeded at tenant creation (self-registration and super-admin creation) and
 * backfilled onto existing tenants by scripts/seed-default-promo-codes.mjs.
 * Always inactive: they exist to show the range of options, not to discount
 * a real order until the merchant turns one on.
 */
describe('Default promo code presets', () => {
    const createdTenantIds: string[] = []

    const cleanupTenant = async (tenantId: string) => {
        await prisma.promoCode.deleteMany({ where: { tenantId } })
        await prisma.tenantStaffRolePermission.deleteMany({ where: { tenantId } })
        await prisma.tenantStaffRole.deleteMany({ where: { tenantId } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId } })
        // Both reference Cashbox through a composite (tenantId, cashboxId) FK.
        // Postgres SetNull on a composite FK nulls every column of it, including
        // tenantId — so both must go before the cashbox, not after.
        await prisma.storeSettings.deleteMany({ where: { tenantId } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.cashbox.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })
    }

    afterEach(async () => {
        // Each test owns exactly the tenants it created.
        const ids = [...createdTenantIds]
        createdTenantIds.length = 0
        for (const id of ids) await cleanupTenant(id)
    })

    afterAll(async () => {
        for (const id of createdTenantIds) await cleanupTenant(id)
    })

    it('seeds all 6 presets, inactive, for a brand-new tenant', async () => {
        const slug = `preset-seed-${Date.now()}`
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Preset Seed', slug } })
        createdTenantIds.push(tenant.id)

        await prisma.$transaction((tx) => seedDefaultPromoCodes(tx, tenant.id))

        const codes = await prisma.promoCode.findMany({
            where: { tenantId: tenant.id },
            orderBy: { code: 'asc' }
        })

        expect(codes).toHaveLength(DEFAULT_PROMO_CODE_PRESETS.length)
        expect(codes.every((code) => code.isActive === false)).toBe(true)
        expect(codes.map((code) => code.code).sort()).toEqual(
            [...DEFAULT_PROMO_CODE_PRESETS.map((preset) => preset.code)].sort()
        )

        // Each of the 6 discount shapes is represented, so the merchant sees the
        // full range rather than six variations on one type.
        const types = new Set(codes.map((code) => code.discountType))
        expect(types).toEqual(new Set(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']))

        const capped = codes.find((code) => code.code === 'VIP50')
        expect(Number(capped?.maxDiscountAmount)).toBe(1000)

        const minOrder = codes.find((code) => code.code === 'GROSSEPCOMMANDE')
        expect(Number(minOrder?.minOrderAmount)).toBe(5000)

        const limited = codes.find((code) => code.code === 'PREMIERSCLIENTS')
        expect(limited?.usageLimit).toBe(50)
        expect(limited?.usageLimitPerCustomer).toBe(1)
    })

    it('is idempotent: running it again on the same tenant creates nothing new', async () => {
        const slug = `preset-idem-${Date.now()}`
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Preset Idempotent', slug } })
        createdTenantIds.push(tenant.id)

        await prisma.$transaction((tx) => seedDefaultPromoCodes(tx, tenant.id))
        await prisma.$transaction((tx) => seedDefaultPromoCodes(tx, tenant.id))

        const count = await prisma.promoCode.count({ where: { tenantId: tenant.id } })
        expect(count).toBe(DEFAULT_PROMO_CODE_PRESETS.length)
    })

    it('does not touch a code the merchant already renamed onto one of the preset strings', async () => {
        const slug = `preset-preserve-${Date.now()}`
        const tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Preset Preserve', slug } })
        createdTenantIds.push(tenant.id)

        // A merchant-owned code that happens to collide with a preset's code string.
        await prisma.promoCode.create({
            data: {
                tenantId: tenant.id,
                code: 'WELCOME10',
                description: 'Merchant-authored, not a demo',
                discountType: 'FIXED',
                discountValue: 999,
                isActive: true
            }
        })

        await prisma.$transaction((tx) => seedDefaultPromoCodes(tx, tenant.id))

        const welcome = await prisma.promoCode.findFirst({ where: { tenantId: tenant.id, code: 'WELCOME10' } })
        expect(welcome?.discountValue ? Number(welcome.discountValue) : null).toBe(999)
        expect(welcome?.isActive).toBe(true)

        // The other 5 presets still land normally.
        const count = await prisma.promoCode.count({ where: { tenantId: tenant.id } })
        expect(count).toBe(DEFAULT_PROMO_CODE_PRESETS.length)
    })

    it('scopes presets to the tenant that owns them', async () => {
        const slugA = `preset-scope-a-${Date.now()}`
        const slugB = `preset-scope-b-${Date.now()}`
        const tenantA = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Preset Scope A', slug: slugA } })
        const tenantB = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Preset Scope B', slug: slugB } })
        createdTenantIds.push(tenantA.id, tenantB.id)

        await prisma.$transaction((tx) => seedDefaultPromoCodes(tx, tenantA.id))

        const onB = await prisma.promoCode.count({ where: { tenantId: tenantB.id } })
        expect(onB).toBe(0)
    })

    it('seeds the presets when a tenant self-registers', async () => {
        const previousGate = process.env.REGISTER_PHONE_LOCK_ENABLED
        process.env.REGISTER_PHONE_LOCK_ENABLED = 'false'

        const slug = `preset-register-${Date.now()}`

        try {
            const res = await request(app)
                .post('/api/register')
                .set('X-Forwarded-Host', 'localhost:3000')
                .send({ name: slug, slug, email: `owner-${slug}@example.com`, password: 'password123' })

            expect(res.status).toBe(200)
            const tenantId = res.body.tenant.id as string
            createdTenantIds.push(tenantId)

            const codes = await prisma.promoCode.findMany({ where: { tenantId } })
            expect(codes).toHaveLength(DEFAULT_PROMO_CODE_PRESETS.length)
            expect(codes.every((code) => code.isActive === false)).toBe(true)
        } finally {
            if (previousGate === undefined) delete process.env.REGISTER_PHONE_LOCK_ENABLED
            else process.env.REGISTER_PHONE_LOCK_ENABLED = previousGate
        }
    })
})
