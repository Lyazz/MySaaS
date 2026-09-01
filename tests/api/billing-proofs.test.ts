import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'
import prisma from '../../backend/src/lib/prisma'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { getPlanByCode, quotePlan } from '../../shared/pricing/plans'

describe('Billing proof uploads (private)', async () => {
    // Ensure local fallback works in test runs even if S3/MinIO isn't available.
    process.env.S3_FALLBACK_LOCAL = 'true'
    process.env.NODE_ENV = 'test'

    await setup({ setupTimeout: 900_000, teardownTimeout: 900_000 })

    const slugA = `proof-a-${Date.now()}`
    const emailA = `owner-${slugA}@example.com`

    const slugB = `proof-b-${Date.now()}`
    const emailB = `owner-${slugB}@example.com`

    let tenantAId = ''
    let tenantBId = ''
    let ownerAToken = ''
    let ownerBToken = ''
    let superAdminToken = ''
    let paymentId = ''

    const buildMultipart = (args: { filename: string; contentType: string; data: Buffer }) => {
        const boundary = `----mysaas-test-${crypto.randomBytes(8).toString('hex')}`
        const header =
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${args.filename}"\r\n` +
            `Content-Type: ${args.contentType}\r\n\r\n`
        const footer = `\r\n--${boundary}--\r\n`

        return {
            body: Buffer.concat([Buffer.from(header, 'utf8'), args.data, Buffer.from(footer, 'utf8')]),
            contentType: `multipart/form-data; boundary=${boundary}`
        }
    }

    const createTestPng = () =>
        Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
            0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
            0x42, 0x60, 0x82
        ])

    it('registers two tenants', async () => {
        const resA = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Proof A',
                slug: slugA,
                email: emailA,
                password: 'password123'
            })
        })
        expect(resA.status).toBe(200)

        const resB = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Proof B',
                slug: slugB,
                email: emailB,
                password: 'password123'
            })
        })
        expect(resB.status).toBe(200)

        const ownerA = await prisma.user.findFirst({ where: { email: emailA } })
        const ownerB = await prisma.user.findFirst({ where: { email: emailB } })
        expect(ownerA).toBeTruthy()
        expect(ownerB).toBeTruthy()

        tenantAId = ownerA!.tenantId
        tenantBId = ownerB!.tenantId

        const secret = process.env.JWT_SECRET!
        ownerAToken = jwt.sign({ userId: ownerA!.id }, secret, { expiresIn: '1h' })
        ownerBToken = jwt.sign({ userId: ownerB!.id }, secret, { expiresIn: '1h' })

        await prisma.user.update({ where: { id: ownerA!.id }, data: { isSuperAdmin: true } })
        superAdminToken = jwt.sign({ userId: ownerA!.id }, secret, { expiresIn: '1h' })
    })

    it('uploads a private billing proof and stores it on payment', async () => {
        const png = createTestPng()
        const mp = buildMultipart({ filename: 'receipt.png', contentType: 'image/png', data: png })

        const uploadRes = await fetch('/api/admin/billing/proofs/upload', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${ownerAToken}`,
                'Content-Type': mp.contentType
            },
            body: mp.body
        })

        const uploadBody = await uploadRes.json()
        expect(uploadRes.status).toBe(200)
        expect(typeof uploadBody.url).toBe('string')
        expect(uploadBody.url).toContain(`tenants/${tenantAId}/`)

        const submitRes = await fetch('/api/admin/billing/payments/submit', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${ownerAToken}`,
                'Content-Type': 'application/json'
            },
            // A paid plan: 'basic' is free, and submitting a payment for it is
            // now rejected rather than writing a made-up amount to the ledger.
            body: JSON.stringify({
                planCode: 'merchant',
                interval: 'month',
                method: 'CCP',
                proofUrl: uploadBody.url
            })
        })

        const payment = await submitRes.json()
        expect(submitRes.status).toBe(200)
        expect(payment).toHaveProperty('id')
        expect(payment).toHaveProperty('proofUrl')
        // Priced from the catalogue, not from the request body.
        expect(payment.amountDzd).toBe(quotePlan(getPlanByCode('merchant')!, 'month').totalDzd)
        paymentId = payment.id
    })

    it('tenant can get a view URL for its own proof', async () => {
        const res = await fetch(`/api/admin/billing/payments/${paymentId}/proof-url`, {
            headers: { Authorization: `Bearer ${ownerAToken}` }
        })
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(typeof body.url).toBe('string')
    })

    it('other tenant cannot get a view URL for another tenant proof', async () => {
        const res = await fetch(`/api/admin/billing/payments/${paymentId}/proof-url`, {
            headers: { Authorization: `Bearer ${ownerBToken}` }
        })
        expect([403, 404]).toContain(res.status)
    })

    it('super-admin can get a view URL for a tenant proof', async () => {
        const res = await fetch(`/api/super-admin/billing/tenants/${tenantAId}/payments/${paymentId}/proof-url`, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        })
        const body = await res.json()
        expect(res.status).toBe(200)
        expect(typeof body.url).toBe('string')
    })

    it('cleans up test data', async () => {
        if (paymentId) await prisma.billingPayment.deleteMany({ where: { id: paymentId } })
        if (tenantAId) await prisma.user.deleteMany({ where: { tenantId: tenantAId } })
        if (tenantBId) await prisma.user.deleteMany({ where: { tenantId: tenantBId } })
        if (tenantAId) await prisma.tenant.deleteMany({ where: { id: tenantAId } })
        if (tenantBId) await prisma.tenant.deleteMany({ where: { id: tenantBId } })

        // Best-effort cleanup local fallback
        if (tenantAId) {
            const dir = path.resolve(process.cwd(), 'private_uploads', 'tenants', tenantAId)
            await fs.rm(dir, { recursive: true, force: true })
        }
    })
})
