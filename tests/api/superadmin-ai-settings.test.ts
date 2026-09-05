import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import { signAccessToken } from '../../backend/src/lib/jwt'
import app from '../../backend/src/app'
import {
    AI_SETTINGS_KEY,
    getAiSettings,
    resetPlatformSettingsCache
} from '../../backend/src/lib/platform-settings'
import { resolvePlan, resetPlanLimitsCache } from '../../backend/src/lib/plan-limits'
import { BillingService } from '../../backend/src/modules/billing/billing.service'

/**
 * Platform AI administration.
 *
 * Two things are load-bearing here and both are covered below: only a super
 * admin may touch these settings, and what the operator saves is what the
 * merchant-facing code actually reads — a settings screen that writes a row
 * nobody consults is worse than no settings screen.
 */
describe('Super admin AI administration', () => {
    const stamp = Date.now()
    let tenantId: string
    let superToken: string
    let ownerToken: string

    const savedEnv = {
        model: process.env.AI_DOCUMENT_MODEL,
        maxPages: process.env.AI_DOCUMENT_MAX_PAGES,
        enabled: process.env.AI_DOCUMENTS_ENABLED
    }

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({
            data: { name: 'AI Admin Tenant', slug: `ai-admin-${stamp}`, publishedAt: new Date() }
        })
        tenantId = tenant.id

        const owner = await prisma.user.create({
            data: {
                email: `ai-owner-${stamp}@test.com`,
                passwordHash: 'hashed',
                role: 'owner',
                tenantId
            }
        })
        const superAdmin = await prisma.user.create({
            data: {
                email: `ai-super-${stamp}@test.com`,
                passwordHash: 'hashed',
                role: 'owner',
                isSuperAdmin: true,
                tenantId
            }
        })

        ownerToken = signAccessToken({ userId: owner.id, tenantId, role: 'owner' } as any)
        superToken = signAccessToken({ userId: superAdmin.id, tenantId, role: 'owner' } as any)
    })

    afterAll(async () => {
        await prisma.planOverride.deleteMany({})
        await prisma.platformSetting.deleteMany({ where: { key: AI_SETTINGS_KEY } })
        await prisma.user.deleteMany({ where: { tenantId } })
        await prisma.tenant.deleteMany({ where: { id: tenantId } })

        process.env.AI_DOCUMENT_MODEL = savedEnv.model
        process.env.AI_DOCUMENT_MAX_PAGES = savedEnv.maxPages
        process.env.AI_DOCUMENTS_ENABLED = savedEnv.enabled
        resetPlatformSettingsCache()
        resetPlanLimitsCache()
    })

    beforeEach(async () => {
        await prisma.planOverride.deleteMany({})
        await prisma.platformSetting.deleteMany({ where: { key: AI_SETTINGS_KEY } })
        delete process.env.AI_DOCUMENT_MODEL
        delete process.env.AI_DOCUMENT_MAX_PAGES
        delete process.env.AI_DOCUMENTS_ENABLED
        resetPlatformSettingsCache()
        resetPlanLimitsCache()
    })

    describe('access control', () => {
        it('refuses an anonymous caller', async () => {
            await request(app).get('/api/super-admin/ai/settings').expect(401)
        })

        it('refuses a tenant owner who is not a super admin', async () => {
            const res = await request(app)
                .get('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${ownerToken}`)
            expect(res.status).toBe(403)
        })

        it('refuses a tenant owner writing settings', async () => {
            const res = await request(app)
                .put('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ enabled: false })
            expect(res.status).toBe(403)

            resetPlatformSettingsCache()
            expect((await getAiSettings()).enabled).toBe(true)
        })

        it('refuses a tenant owner reading cross-tenant usage', async () => {
            const res = await request(app)
                .get('/api/super-admin/ai/usage')
                .set('Authorization', `Bearer ${ownerToken}`)
            expect(res.status).toBe(403)
        })
    })

    describe('engine settings', () => {
        it('reports the built-in defaults when nothing is set anywhere', async () => {
            const res = await request(app)
                .get('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${superToken}`)
                .expect(200)

            expect(res.body.settings.model).toBe('claude-opus-5')
            expect(res.body.settings.maxPagesPerJob).toBe(10)
            expect(res.body.settings.enabled).toBe(true)
            expect(res.body.settings.sources).toEqual({
                enabled: 'default',
                model: 'default',
                maxPagesPerJob: 'default'
            })
        })

        it('prefers the environment over the built-in default', async () => {
            process.env.AI_DOCUMENT_MODEL = 'claude-sonnet-5'
            process.env.AI_DOCUMENT_MAX_PAGES = '4'
            resetPlatformSettingsCache()

            const res = await request(app)
                .get('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${superToken}`)
                .expect(200)

            expect(res.body.settings.model).toBe('claude-sonnet-5')
            expect(res.body.settings.maxPagesPerJob).toBe(4)
            expect(res.body.settings.sources.model).toBe('env')
        })

        it('lets a saved value win over the environment, and takes effect immediately', async () => {
            process.env.AI_DOCUMENT_MODEL = 'claude-sonnet-5'
            resetPlatformSettingsCache()

            await request(app)
                .put('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ model: 'claude-haiku-4-5-20251001', maxPagesPerJob: 3 })
                .expect(200)

            // No cache reset: saving must bust the writing process's own cache.
            const settings = await getAiSettings()
            expect(settings.model).toBe('claude-haiku-4-5-20251001')
            expect(settings.maxPagesPerJob).toBe(3)
            expect(settings.sources.model).toBe('db')
        })

        it('merges a patch instead of replacing the row', async () => {
            await request(app)
                .put('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ model: 'claude-sonnet-5' })
                .expect(200)

            await request(app)
                .put('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ maxPagesPerJob: 7 })
                .expect(200)

            const settings = await getAiSettings()
            expect(settings.model).toBe('claude-sonnet-5')
            expect(settings.maxPagesPerJob).toBe(7)
        })

        it('rejects a model outside the catalogue', async () => {
            const res = await request(app)
                .put('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ model: 'gpt-4' })
            expect(res.status).toBe(400)

            resetPlatformSettingsCache()
            expect((await getAiSettings()).model).toBe('claude-opus-5')
        })

        it('rejects an out-of-range page ceiling', async () => {
            await request(app)
                .put('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ maxPagesPerJob: 0 })
                .expect(400)

            await request(app)
                .put('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ maxPagesPerJob: 5000 })
                .expect(400)
        })

        it('resets every field back to the environment', async () => {
            process.env.AI_DOCUMENT_MODEL = 'claude-sonnet-5'
            resetPlatformSettingsCache()

            await request(app)
                .put('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ model: 'claude-haiku-4-5-20251001', enabled: false })
                .expect(200)

            await request(app)
                .post('/api/super-admin/ai/settings/reset')
                .set('Authorization', `Bearer ${superToken}`)
                .expect(200)

            const settings = await getAiSettings()
            expect(settings.model).toBe('claude-sonnet-5')
            expect(settings.sources.model).toBe('env')
            expect(settings.enabled).toBe(true)
        })

        it('writes an audit line naming the change', async () => {
            await request(app)
                .put('/api/super-admin/ai/settings')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ enabled: false })
                .expect(200)

            const log = await prisma.auditLog.findFirst({
                where: { action: 'SUPERADMIN_AI_SETTINGS_UPDATED' },
                orderBy: { createdAt: 'desc' }
            })
            expect(log).toBeTruthy()
            expect(log?.details).toContain('"enabled":false')
        })

        it('ignores a malformed stored row rather than taking AI down', async () => {
            await prisma.platformSetting.create({
                data: { key: AI_SETTINGS_KEY, value: { model: 42, maxPagesPerJob: 'ten', junk: true } as any }
            })
            resetPlatformSettingsCache()

            const settings = await getAiSettings()
            expect(settings.model).toBe('claude-opus-5')
            expect(settings.maxPagesPerJob).toBe(10)
            expect(settings.enabled).toBe(true)
        })
    })

    describe('plan quotas', () => {
        it('lists every plan with its code default and no override', async () => {
            const res = await request(app)
                .get('/api/super-admin/ai/plan-quotas')
                .set('Authorization', `Bearer ${superToken}`)
                .expect(200)

            const professional = res.body.plans.find((p: any) => p.planCode === 'professional')
            expect(professional).toMatchObject({ aiScansPerMonth: null, default: 400 })
        })

        it('overrides a quota and feeds the same number to enforcement', async () => {
            await request(app)
                .put('/api/super-admin/ai/plan-quotas/beginner')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ aiScansPerMonth: 55 })
                .expect(200)

            expect((await resolvePlan('beginner')).aiScansPerMonth).toBe(55)
        })

        it('shows the override on the tenant billing meter too', async () => {
            // Enforcement and display must move together; a meter that still
            // reads 20 while uploads are refused at 9 is a support ticket.
            await request(app)
                .put('/api/super-admin/ai/plan-quotas/basic')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ aiScansPerMonth: 9 })
                .expect(200)

            const snapshot = await new BillingService().getTenantBillingSnapshot(tenantId)
            expect(snapshot.usage.aiScans.limit).toBe(9)
            expect(snapshot.plan.aiScansPerMonth).toBe(9)
            expect((await resolvePlan('basic')).aiScansPerMonth).toBe(9)
        })

        it('clears an override with null, returning the plan to its default', async () => {
            await request(app)
                .put('/api/super-admin/ai/plan-quotas/merchant')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ aiScansPerMonth: 1 })
                .expect(200)
            expect((await resolvePlan('merchant')).aiScansPerMonth).toBe(1)

            await request(app)
                .put('/api/super-admin/ai/plan-quotas/merchant')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ aiScansPerMonth: null })
                .expect(200)

            expect((await resolvePlan('merchant')).aiScansPerMonth).toBe(100)
            expect(await prisma.planOverride.findUnique({ where: { planCode: 'merchant' } })).toBeNull()
        })

        it('rejects an unknown plan and a negative quota', async () => {
            await request(app)
                .put('/api/super-admin/ai/plan-quotas/enterprise')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ aiScansPerMonth: 10 })
                .expect(400)

            await request(app)
                .put('/api/super-admin/ai/plan-quotas/basic')
                .set('Authorization', `Bearer ${superToken}`)
                .send({ aiScansPerMonth: -1 })
                .expect(400)
        })
    })

    describe('usage report', () => {
        it('aggregates the month a super admin asks for', async () => {
            const now = new Date()
            const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

            await prisma.aiDocumentJob.create({
                data: {
                    tenantId,
                    kind: 'PURCHASE_INVOICE',
                    status: 'READY',
                    documentRef: 'local://none',
                    mimeType: 'image/png',
                    pageCount: 3,
                    model: 'claude-opus-5',
                    inputTokens: 1200,
                    outputTokens: 340
                }
            })

            const res = await request(app)
                .get(`/api/super-admin/ai/usage?month=${month}`)
                .set('Authorization', `Bearer ${superToken}`)
                .expect(200)

            expect(res.body.month).toBe(month)
            expect(res.body.totals.pages).toBeGreaterThanOrEqual(3)

            const row = res.body.byTenant.find((r: any) => r.tenantId === tenantId)
            expect(row).toMatchObject({ pages: 3, inputTokens: 1200, outputTokens: 340 })
            expect(row.tenantName).toBe('AI Admin Tenant')

            await prisma.aiDocumentJob.deleteMany({ where: { tenantId } })
        })

        it('returns an empty month rather than failing', async () => {
            const res = await request(app)
                .get('/api/super-admin/ai/usage?month=2001-01')
                .set('Authorization', `Bearer ${superToken}`)
                .expect(200)

            expect(res.body.totals).toMatchObject({ jobs: 0, pages: 0 })
            expect(res.body.byTenant).toEqual([])
        })
    })
})
