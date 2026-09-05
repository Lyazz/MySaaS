import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import { signAccessToken } from '../../backend/src/lib/jwt'
import {
    catalogExtraction,
    catalogExtractionFor,
    invoiceExtraction,
    lowConfidenceExtraction,
    makeFinalMessage,
    rawText
} from '../fixtures/ai-documents'

/**
 * The Anthropic client is stubbed here, so the suite never spends money and
 * never depends on the network. Everything below the client — the extraction
 * service's parsing, matching, drafting, quota and confirm — is the real code.
 */
const nextResponses: unknown[] = []
const streamCalls: any[] = []

vi.mock('../../backend/src/lib/anthropic', async () => {
    const actual = await vi.importActual<any>('../../backend/src/lib/anthropic')
    return {
        ...actual,
        isAiEnabled: () => true,
        aiDocumentModel: () => 'claude-opus-5',
        getAnthropicClient: () => ({
            beta: {
                messages: {
                    stream: (params: any) => {
                        streamCalls.push(params)
                        const payload = nextResponses.shift() ?? invoiceExtraction
                        return {
                            finalMessage: async () => makeFinalMessage(payload)
                        }
                    }
                }
            }
        })
    }
})

// Imported after the mock so the module graph picks up the stub.
const app = (await import('../../backend/src/app')).default

const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
)

describe('AI document import', () => {
    const slugA = `ai-a-${Date.now()}`
    const slugB = `ai-b-${Date.now()}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`

    let tenantAId: string
    let tenantBId: string
    let userAId: string
    let userBId: string
    let tokenA: string
    let tokenB: string
    let chocolateVariantId: string

    const setPlan = async (tenantId: string, planCode: string) => {
        await prisma.tenantSubscription.upsert({
            where: { tenantId },
            create: {
                tenantId,
                planCode,
                interval: 'month',
                status: 'ACTIVE',
                currentPeriodStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
                currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
            },
            update: { planCode, status: 'ACTIVE' }
        })
    }

    const upload = (host: string, token: string, kind = 'PURCHASE_INVOICE') =>
        request(app)
            .post('/api/admin/ai-documents')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
            .field('kind', kind)
            .attach('file', PNG_1X1, { filename: 'invoice.png', contentType: 'image/png' })

    /** Upload, then wait for the detached extraction to land. */
    const uploadAndWait = async (host: string, token: string, kind = 'PURCHASE_INVOICE') => {
        const res = await upload(host, token, kind)
        expect(res.status).toBe(201)
        const jobId = res.body.jobId as string

        for (let i = 0; i < 100; i += 1) {
            const job = await prisma.aiDocumentJob.findUnique({ where: { id: jobId } })
            if (job && job.status !== 'PENDING' && job.status !== 'EXTRACTING') return { jobId, job }
            await new Promise((r) => setTimeout(r, 50))
        }
        throw new Error('extraction did not finish')
    }

    beforeAll(async () => {
        const [tenantA, tenantB] = await prisma.$transaction([
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'AI Tenant A', slug: slugA } }),
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'AI Tenant B', slug: slugB } })
        ])
        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const [userA, userB] = await prisma.$transaction([
            prisma.user.create({
                data: { tenantId: tenantAId, email: `ai-a-${slugA}@example.com`, role: 'admin', passwordHash: 'x' }
            }),
            prisma.user.create({
                data: { tenantId: tenantBId, email: `ai-b-${slugB}@example.com`, role: 'admin', passwordHash: 'x' }
            })
        ])
        userAId = userA.id
        userBId = userB.id
        tokenA = signAccessToken({ userId: userAId, email: userA.email, role: userA.role, tenantId: tenantAId })
        tokenB = signAccessToken({ userId: userBId, email: userB.email, role: userB.role, tenantId: tenantBId })

        await setPlan(tenantAId, 'professional')
        await setPlan(tenantBId, 'professional')

        // One product that the first invoice line should fuzzy-match.
        const product = await prisma.product.create({
            data: {
                tenantId: tenantAId,
                title: 'Chocolat noir 100g',
                slug: `choc-noir-${Date.now()}`,
                price: 500,
                stock: 0,
                isActive: true
            }
        })
        const variant = await prisma.productVariant.create({
            data: {
                tenantId: tenantAId,
                productId: product.id,
                sku: `CHOC${String(Date.now()).slice(-6)}`,
                price: 500,
                cost: 350,
                stock: 0,
                isActive: true,
                trackInventory: true
            }
        })
        chocolateVariantId = variant.id
    })

    beforeEach(() => {
        nextResponses.length = 0
        streamCalls.length = 0
    })

    afterAll(async () => {
        const tenants = { in: [tenantAId, tenantBId] }
        await prisma.aiDocumentCorrection.deleteMany({ where: { tenantId: tenants } })
        await prisma.aiDocumentJob.deleteMany({ where: { tenantId: tenants } })
        await prisma.supplierProductAlias.deleteMany({ where: { tenantId: tenants } })
        await prisma.purchaseOrderItem.deleteMany({ where: { tenantId: tenants } })
        await prisma.purchaseOrder.deleteMany({ where: { tenantId: tenants } })
        await prisma.supplier.deleteMany({ where: { tenantId: tenants } })
        await prisma.productVariant.deleteMany({ where: { tenantId: tenants } })
        await prisma.product.deleteMany({ where: { tenantId: tenants } })
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenants } })
        await prisma.storeSettings.deleteMany({ where: { tenantId: tenants } })
        await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } })
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } })
    })

    describe('upload validation', () => {
        it('rejects an unsupported mime type', async () => {
            const res = await request(app)
                .post('/api/admin/ai-documents')
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)
                .field('kind', 'PURCHASE_INVOICE')
                .attach('file', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' })

            expect(res.status).toBe(400)
        })

        it('rejects an unknown document kind', async () => {
            const res = await request(app)
                .post('/api/admin/ai-documents')
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)
                .field('kind', 'TAX_RETURN')
                .attach('file', PNG_1X1, { filename: 'invoice.png', contentType: 'image/png' })

            expect(res.status).toBe(400)
        })

        it('rejects a request with no file', async () => {
            const res = await request(app)
                .post('/api/admin/ai-documents')
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)
                .field('kind', 'PURCHASE_INVOICE')

            expect(res.status).toBe(400)
        })
    })

    describe('plan quota', () => {
        it('refuses the feature outright on a plan with no allowance', async () => {
            await setPlan(tenantAId, 'basic')
            const res = await upload(hostA, tokenA)
            expect(res.status).toBe(403)
            expect(res.body.code).toBe('PLAN_FEATURE_UNAVAILABLE')
            await setPlan(tenantAId, 'professional')
        })

        it('429s once the monthly page allowance is spent', async () => {
            await setPlan(tenantAId, 'beginner') // 20 pages/month

            // Burn the allowance with already-recorded jobs rather than 20 uploads.
            await prisma.aiDocumentJob.create({
                data: {
                    tenantId: tenantAId,
                    kind: 'PURCHASE_INVOICE',
                    status: 'CONFIRMED',
                    documentRef: 'local://tenants/x/ai-documents/spent.png',
                    mimeType: 'image/png',
                    pageCount: 20
                }
            })

            const res = await upload(hostA, tokenA)
            expect(res.status).toBe(429)
            expect(res.body.code).toBe('AI_SCAN_LIMIT')

            await prisma.aiDocumentJob.deleteMany({ where: { tenantId: tenantAId } })
            await setPlan(tenantAId, 'professional')
        })

        it('reports scan usage on the billing snapshot', async () => {
            await prisma.aiDocumentJob.create({
                data: {
                    tenantId: tenantAId,
                    kind: 'PURCHASE_INVOICE',
                    status: 'CONFIRMED',
                    documentRef: 'local://tenants/x/ai-documents/metered.png',
                    mimeType: 'image/png',
                    pageCount: 3
                }
            })

            const res = await request(app)
                .get('/api/admin/billing/subscription')
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            expect(res.status).toBe(200)
            expect(res.body.usage.aiScans.used).toBe(3)
            expect(res.body.usage.aiScans.limit).toBe(400)

            await prisma.aiDocumentJob.deleteMany({ where: { tenantId: tenantAId } })
        })
    })

    describe('extraction and drafting', () => {
        it('builds a draft, fuzzy-matches a known product and proposes a margin price', async () => {
            const { jobId, job } = await uploadAndWait(hostA, tokenA)
            expect(job.status).toBe('READY')

            const res = await request(app)
                .get(`/api/admin/ai-documents/${jobId}`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            expect(res.status).toBe(200)
            const draft = res.body.draft
            expect(draft.lines).toHaveLength(2)

            const chocolate = draft.lines[0]
            expect(chocolate.label).toBe('CHOCOLAT NOIR 100G')
            expect(chocolate.variantId).toBe(chocolateVariantId)
            expect(chocolate.matchSource).toBe('fuzzy')
            // Matched: keeps the variant's existing sale price rather than
            // re-deriving one from the margin.
            expect(chocolate.salePrice).toBe(500)

            // Unmatched: cost 1000 + the store default 30% margin.
            const oil = draft.lines[1]
            expect(oil.action).toBe('create')
            expect(oil.variantId).toBeNull()
            expect(oil.salePrice).toBe(1300)

            expect(draft.supplier.create).toBe(true)
            expect(draft.supplier.name).toBe('SARL Distribution Alger')
            expect(draft.marginPercent).toBe(30)

            await prisma.aiDocumentJob.deleteMany({ where: { tenantId: tenantAId } })
        })

        it('never sends the tenant catalogue to the model', async () => {
            await uploadAndWait(hostA, tokenA)
            const sent = JSON.stringify(streamCalls)
            expect(sent).not.toContain('Chocolat noir 100g')
            expect(sent).not.toContain(chocolateVariantId)
            await prisma.aiDocumentJob.deleteMany({ where: { tenantId: tenantAId } })
        })
    })

    describe('tenant isolation', () => {
        let jobId: string

        beforeEach(async () => {
            const created = await uploadAndWait(hostA, tokenA)
            jobId = created.jobId
        })

        it('hides another tenant job from read, draft, url and confirm', async () => {
            const auth = (r: request.Test) =>
                r.set('X-Forwarded-Host', hostB).set('Authorization', `Bearer ${tokenB}`)

            expect((await auth(request(app).get(`/api/admin/ai-documents/${jobId}`))).status).toBe(404)
            expect((await auth(request(app).get(`/api/admin/ai-documents/${jobId}/document-url`))).status).toBe(404)
            expect((await auth(request(app).patch(`/api/admin/ai-documents/${jobId}/draft`)).send({})).status).toBe(404)
            expect((await auth(request(app).post(`/api/admin/ai-documents/${jobId}/confirm`))).status).toBe(404)
            expect((await auth(request(app).delete(`/api/admin/ai-documents/${jobId}`))).status).toBe(404)
        })

        it('omits another tenant job from the list', async () => {
            const res = await request(app)
                .get('/api/admin/ai-documents')
                .set('X-Forwarded-Host', hostB)
                .set('Authorization', `Bearer ${tokenB}`)

            expect(res.status).toBe(200)
            expect(res.body.map((j: any) => j.id)).not.toContain(jobId)
        })
    })

    describe('the review gate', () => {
        it('blocks confirm until low-confidence values are acknowledged', async () => {
            nextResponses.push(lowConfidenceExtraction)
            const { jobId } = await uploadAndWait(hostA, tokenA)

            const blocked = await request(app)
                .post(`/api/admin/ai-documents/${jobId}/confirm`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            expect(blocked.status).toBe(400)
            expect(blocked.body.code).toBe('UNREVIEWED_FIELDS')
            expect(blocked.body.meta.fields).toContainEqual({ index: 0, field: 'quantity' })

            const current = await request(app)
                .get(`/api/admin/ai-documents/${jobId}`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            const patched = await request(app)
                .patch(`/api/admin/ai-documents/${jobId}/draft`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({
                    ...current.body.draft,
                    lines: current.body.draft.lines.map((l: any) => ({
                        ...l,
                        quantity: 1,
                        reviewed: ['quantity']
                    }))
                })

            expect(patched.status).toBe(200)
            expect(patched.body.lines[0].quantity).toBe(1)

            const confirmed = await request(app)
                .post(`/api/admin/ai-documents/${jobId}/confirm`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            expect(confirmed.status).toBe(200)
        })

        it('treats a missing value as absent, not as a low-confidence read', async () => {
            // A catalogue prints no quantities: the schema pairs every null with
            // a confidence of 0, and flagging those would make it unconfirmable.
            // Its own product name, so it cannot match one another test created.
            nextResponses.push(catalogExtractionFor('CAFE MOULU 250G'))
            const { jobId } = await uploadAndWait(hostA, tokenA, 'PRODUCT_CATALOG')

            const res = await request(app)
                .post(`/api/admin/ai-documents/${jobId}/confirm`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            expect(res.status).toBe(200)
        })
    })

    describe('confirm', () => {
        it('creates a DRAFT purchase order, a supplier and the missing product', async () => {
            const { jobId } = await uploadAndWait(hostA, tokenA)

            const res = await request(app)
                .post(`/api/admin/ai-documents/${jobId}/confirm`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            expect(res.status).toBe(200)
            expect(res.body.purchaseOrderId).toBeTruthy()
            expect(res.body.createdProductIds).toHaveLength(1)

            const po = await prisma.purchaseOrder.findUnique({
                where: { id: res.body.purchaseOrderId },
                include: { items: true, supplier: true }
            })

            expect(po?.status).toBe('DRAFT')
            expect(po?.paymentStatus).toBe('UNPAID')
            expect(po?.reference).toBe('FA-2026-0142')
            expect(po?.supplier?.name).toBe('SARL Distribution Alger')
            expect(Number(po?.totalAmount)).toBe(10500)
            expect(po?.items).toHaveLength(2)

            const chocolateItem = po!.items.find((i) => i.variantId === chocolateVariantId)
            expect(chocolateItem).toBeTruthy()
            expect(chocolateItem!.quantityOrdered).toBe(12)
            expect(Number(chocolateItem!.unitCost)).toBe(375)
            // Stock only moves on receive; nothing here touched inventory.
            expect(chocolateItem!.quantityReceived).toBe(0)

            const variant = await prisma.productVariant.findUnique({ where: { id: chocolateVariantId } })
            expect(variant?.stock).toBe(0)
            expect(Number(variant?.cost)).toBe(350)

            const movements = await prisma.inventoryMovement.count({ where: { tenantId: tenantAId } })
            expect(movements).toBe(0)
        })

        it('refuses to confirm the same document twice', async () => {
            const { jobId } = await uploadAndWait(hostA, tokenA)
            const path = `/api/admin/ai-documents/${jobId}/confirm`

            const first = await request(app)
                .post(path)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)
            expect(first.status).toBe(200)

            const second = await request(app)
                .post(path)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)
            expect(second.status).toBe(409)
        })

        it('logs the fields the merchant corrected', async () => {
            const { jobId } = await uploadAndWait(hostA, tokenA)

            const current = await request(app)
                .get(`/api/admin/ai-documents/${jobId}`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            await request(app)
                .patch(`/api/admin/ai-documents/${jobId}/draft`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({
                    ...current.body.draft,
                    lines: current.body.draft.lines.map((l: any, i: number) =>
                        i === 0 ? { ...l, quantity: 15 } : l
                    )
                })

            await request(app)
                .post(`/api/admin/ai-documents/${jobId}/confirm`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            const corrections = await prisma.aiDocumentCorrection.findMany({
                where: { tenantId: tenantAId, jobId }
            })
            const quantity = corrections.find((c) => c.field === 'quantity' && c.lineIndex === 0)
            expect(quantity?.aiValue).toBe('12')
            expect(quantity?.userValue).toBe('15')
        })

        it('remembers the match so the next invoice from that supplier resolves on its own', async () => {
            const first = await uploadAndWait(hostA, tokenA)
            await request(app)
                .post(`/api/admin/ai-documents/${first.jobId}/confirm`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            const aliases = await prisma.supplierProductAlias.findMany({ where: { tenantId: tenantAId } })
            expect(aliases.length).toBeGreaterThan(0)

            // Second scan: the oil line now points at the product the first
            // confirm created, via alias memory rather than a fresh guess.
            const second = await uploadAndWait(hostA, tokenA)
            const res = await request(app)
                .get(`/api/admin/ai-documents/${second.jobId}`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            const oil = res.body.draft.lines[1]
            expect(oil.matchSource).toBe('alias')
            expect(oil.action).toBe('match')
            expect(oil.variantId).toBeTruthy()
        })

        it('imports a catalog as products with no purchase order', async () => {
            nextResponses.push(catalogExtraction)
            const { jobId } = await uploadAndWait(hostA, tokenA, 'PRODUCT_CATALOG')

            const res = await request(app)
                .post(`/api/admin/ai-documents/${jobId}/confirm`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)

            expect(res.status).toBe(200)
            expect(res.body.purchaseOrderId).toBeNull()
            expect(res.body.createdProductIds).toHaveLength(1)

            const variant = await prisma.productVariant.findFirst({
                where: { tenantId: tenantAId, productId: res.body.createdProductIds[0] }
            })
            expect(variant?.sku).toBe('SUC1KG')
            expect(Number(variant?.cost)).toBe(120)
            expect(Number(variant?.price)).toBe(160)
            expect(variant?.stock).toBe(0)
        })
    })

    describe('failure handling', () => {
        it('marks the job FAILED and keeps the message when the model returns junk', async () => {
            nextResponses.push(rawText('Sorry, I could not read that.'))
            const { job } = await uploadAndWait(hostA, tokenA)
            expect(job.status).toBe('FAILED')
            expect(job.errorMessage).toBeTruthy()
        })

        it('refuses to edit or confirm a failed job', async () => {
            nextResponses.push(rawText('Sorry, I could not read that.'))
            const { jobId } = await uploadAndWait(hostA, tokenA)

            const patched = await request(app)
                .patch(`/api/admin/ai-documents/${jobId}/draft`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({})
            expect(patched.status).toBe(409)

            const confirmed = await request(app)
                .post(`/api/admin/ai-documents/${jobId}/confirm`)
                .set('X-Forwarded-Host', hostA)
                .set('Authorization', `Bearer ${tokenA}`)
            expect(confirmed.status).toBe(409)
        })
    })
})
