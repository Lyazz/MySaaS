import { randomBytes } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'

/**
 * The confirmation link the seller sends by hand.
 *
 * It now shares its whole flow with the WhatsApp buttons, so these cases pin the
 * behaviour the storefront page depends on: one confirmation per token, and the
 * same 400s the page already handles.
 */
describe('Public order confirmation link', () => {
    let tenant: any

    beforeAll(async () => {
        tenant = await prisma.tenant.create({ data: { publishedAt: new Date(), name: 'Confirm Link', slug: `confirm-link-${Date.now()}` } })
    })

    afterAll(async () => {
        await prisma.order.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.tenant.deleteMany({ where: { id: tenant.id } })
    })

    const createPendingOrder = async () => {
        const token = randomBytes(32).toString('hex')
        const order = await prisma.order.create({
            data: {
                tenantId: tenant.id,
                customerName: 'Amine',
                customerPhone: '0550123456',
                totalAmount: 3400,
                status: 'PENDING',
                confirmationToken: token,
                confirmationTokenUsed: false
            }
        })
        return { order, token }
    }

    const confirm = (token: unknown) =>
        request(app)
            .post('/api/orders/confirm')
            .set('Host', `${tenant.slug}.swekly.com`)
            .send({ token })

    it('confirms the order and spends the token', async () => {
        const { order, token } = await createPendingOrder()

        const res = await confirm(token)
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ success: true, orderId: order.id })

        const confirmed = await prisma.order.findUnique({ where: { id: order.id } })
        expect(confirmed?.status).toBe('CONFIRMED')
        expect(confirmed?.callStatus).toBe('whatsapp_link_confirmed')
        expect(confirmed?.confirmationTokenUsed).toBe(true)
        expect(confirmed?.internalNotes).toContain('secure link')
    })

    it('refuses a token that was already used', async () => {
        const { token } = await createPendingOrder()

        expect((await confirm(token)).status).toBe(200)

        const replay = await confirm(token)
        expect(replay.status).toBe(400)
        expect(replay.body.message).toBe('Invalid or already used token')
    })

    it('refuses an unknown token', async () => {
        const res = await confirm(randomBytes(32).toString('hex'))
        expect(res.status).toBe(400)
        expect(res.body.message).toBe('Invalid or already used token')
    })

    it('requires a token', async () => {
        const res = await confirm(undefined)
        expect(res.status).toBe(400)
        expect(res.body.message).toBe('Token is required')
    })
})
