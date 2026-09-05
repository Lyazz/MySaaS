import request from 'supertest'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../../backend/src/app'
import { signAccessToken } from '../../backend/src/lib/jwt'
import prisma from '../../backend/src/lib/prisma'

/**
 * The Flutter admin app flushes its offline outbox on reconnect — the moment a
 * request is most likely to be accepted and then lose its response. The client
 * cannot tell that apart from "never arrived", so it resends with the same
 * `Idempotency-Key`. Without the replay cache that resend creates a duplicate.
 */
describe('Idempotent admin writes', () => {
    const stamp = Date.now()
    const slugA = `idem-a-${stamp}`
    const slugB = `idem-b-${stamp}`
    const hostA = `${slugA}.localhost:3000`
    const hostB = `${slugB}.localhost:3000`
    let tenantAId = ''
    let tenantBId = ''
    let tokenA = ''
    let tokenB = ''

    // Customers are unique on (tenantId, phoneNormalized), so every fixture
    // needs its own number or the constraint, not the middleware, is what the
    // assertions end up measuring.
    let phoneCounter = 0
    const customer = (suffix: string) => ({
        name: `Idempotency ${suffix} ${stamp}`,
        phone: `055${String(stamp).slice(-5)}${String(phoneCounter++).padStart(2, '0')}`
    })

    beforeAll(async () => {
        const [tenantA, tenantB] = await Promise.all([
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Idempotency Tenant A', slug: slugA } }),
            prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Idempotency Tenant B', slug: slugB } })
        ])
        tenantAId = tenantA.id
        tenantBId = tenantB.id

        const [adminA, adminB] = await Promise.all([
            prisma.user.create({
                data: { tenantId: tenantAId, email: `idem-a-${stamp}@example.com`, role: 'admin', passwordHash: 'x' }
            }),
            prisma.user.create({
                data: { tenantId: tenantBId, email: `idem-b-${stamp}@example.com`, role: 'admin', passwordHash: 'x' }
            })
        ])
        tokenA = signAccessToken({ userId: adminA.id, email: adminA.email, role: adminA.role, tenantId: tenantAId })
        tokenB = signAccessToken({ userId: adminB.id, email: adminB.email, role: adminB.role, tenantId: tenantBId })
    })

    afterAll(async () => {
        const tenantIds = { in: [tenantAId, tenantBId] }
        await prisma.customer.deleteMany({ where: { tenantId: tenantIds } })
        await prisma.idempotencyKey.deleteMany({ where: { tenantId: tenantIds } })
        await prisma.user.deleteMany({ where: { tenantId: tenantIds } })
        await prisma.tenant.deleteMany({ where: { id: tenantIds } })
    })

    const post = (host: string, token: string, key: string | null, body: unknown) => {
        const req = request(app)
            .post('/api/admin/customers')
            .set('X-Forwarded-Host', host)
            .set('Authorization', `Bearer ${token}`)
        if (key) req.set('Idempotency-Key', key)
        return req.send(body as object)
    }

    it('replays the first response instead of creating a second row', async () => {
        const key = randomUUID()
        const body = customer('replay')

        const first = await post(hostA, tokenA, key, body)
        expect(first.status).toBe(201)
        expect(first.body.id).toBeTruthy()

        // The retry the client sends when the first response never arrived.
        const second = await post(hostA, tokenA, key, body)
        expect(second.status).toBe(201)
        expect(second.body.id).toBe(first.body.id)

        const rows = await prisma.customer.findMany({ where: { tenantId: tenantAId, name: body.name } })
        expect(rows).toHaveLength(1)
    })

    it('replays a retry whose payload was rewritten between attempts', async () => {
        // The Flutter outbox mutates a queued payload before resending it:
        // local ids become the remote ids their parent create returned, local
        // image paths become uploaded URLs. Those retries carry the same key
        // and must still replay — refusing on a changed body would drop the
        // write, which is what the POS suite pins.
        const key = randomUUID()
        const body = customer('rewritten')

        const first = await post(hostA, tokenA, key, body)
        expect(first.status).toBe(201)

        const second = await post(hostA, tokenA, key, { ...body, address: 'Resolved after upload' })
        expect(second.status).toBe(201)
        expect(second.body.id).toBe(first.body.id)

        const rows = await prisma.customer.findMany({ where: { tenantId: tenantAId, name: body.name } })
        expect(rows).toHaveLength(1)
    })

    it('scopes keys to one tenant', async () => {
        // Same key and same body from two tenants. Tenant B must get its own
        // write, never tenant A's stored response.
        const key = randomUUID()
        const body = customer('shared-key')

        const first = await post(hostA, tokenA, key, body)
        expect(first.status).toBe(201)

        const second = await post(hostB, tokenB, key, body)
        expect(second.status).toBe(201)
        expect(second.body.id).not.toBe(first.body.id)

        const rowsB = await prisma.customer.findMany({ where: { tenantId: tenantBId } })
        expect(rowsB).toHaveLength(1)
        expect(rowsB[0].id).toBe(second.body.id)
    })

    it('leaves the key usable after a rejected request', async () => {
        const key = randomUUID()

        // Phone is required, so this never reaches the database.
        const rejected = await post(hostA, tokenA, key, { name: `Idempotency invalid ${stamp}` })
        expect(rejected.status).toBe(400)

        // Nothing was applied, so the corrected write must go through rather
        // than replay the failure for the rest of the retention window.
        const retried = await post(hostA, tokenA, key, customer('after-rejection'))
        expect(retried.status).toBe(201)
    })

    it('leaves writes without a key alone', async () => {
        const before = await prisma.idempotencyKey.count({ where: { tenantId: tenantAId } })

        const created = await post(hostA, tokenA, null, customer('no-key'))
        expect(created.status).toBe(201)

        const after = await prisma.idempotencyKey.count({ where: { tenantId: tenantAId } })
        expect(after).toBe(before)
    })
})
