import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../../backend/src/lib/prisma'
import app from '../../backend/src/app'
import { MaystroPickupPointService } from '../../backend/src/modules/delivery/maystro/maystro-pickup-point.service'

describe('Maystro pickup point selection', () => {
    let tenant: { id: string; slug: string } | null = null
    let host = ''

    beforeAll(async () => {
        const created = await prisma.tenant.create({
            data: {
                name: 'Pickup Selection Tenant',
                slug: `pickup-selection-${Date.now()}`
            }
        })
        tenant = { id: created.id, slug: created.slug }
        host = `${created.slug}.platform.com`

        await prisma.tenantDeliveryAccount.upsert({
            where: { tenantId_provider: { tenantId: created.id, provider: 'MAYSTRO' } },
            create: {
                tenantId: created.id,
                provider: 'MAYSTRO',
                isActive: true,
                config: { apiToken: 'test-token', storeId: 'store-123' }
            },
            update: {
                isActive: true,
                config: { apiToken: 'test-token', storeId: 'store-123' }
            }
        })
    })

    afterAll(async () => {
        vi.restoreAllMocks()
        if (!tenant) return
        await prisma.tenantDeliveryAccount.deleteMany({ where: { tenantId: tenant.id } })
        await prisma.tenant.deleteMany({ where: { id: tenant.id } })
    })

    it('returns only pickup points when both pickup and stop desk exist for the commune', async () => {
        vi.spyOn(MaystroPickupPointService.prototype, 'listActivePickupPoints').mockResolvedValue([
            { commune: 1605, pickup_point: 0, delivery_type: 2, active: true, name_lt: 'Stop Desk Hydra' },
            { commune: 1605, pickup_point: 445, delivery_type: 3, active: true, name_lt: 'Relais Hydra' }
        ])
        const nearbySpy = vi.spyOn(MaystroPickupPointService.prototype, 'listActivePickupPointsNearby')

        const res = await request(app)
            .get('/api/delivery/maystro/pickup-points')
            .set('Host', host)
            .query({ commune: '1605' })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].delivery_type).toBe(3)
        expect(nearbySpy).not.toHaveBeenCalled()
    })

    it('returns stop desk when commune has no pickup points', async () => {
        vi.spyOn(MaystroPickupPointService.prototype, 'listActivePickupPoints').mockResolvedValue([
            { commune: 1605, pickup_point: 0, delivery_type: 2, active: true, name_lt: 'Stop Desk Hydra' }
        ])

        const res = await request(app)
            .get('/api/delivery/maystro/pickup-points')
            .set('Host', host)
            .query({ commune: '1605' })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].delivery_type).toBe(2)
    })

    it('prefers nearby stop desk before nearby pickup when direct commune has no options', async () => {
        vi.spyOn(MaystroPickupPointService.prototype, 'listActivePickupPoints').mockResolvedValue([])
        const nearbySpy = vi.spyOn(MaystroPickupPointService.prototype, 'listActivePickupPointsNearby').mockImplementation(
            async (input: { deliveryType?: 2 | 3 }) => {
                if (input.deliveryType === 2) {
                    return [{ commune: 1606, pickup_point: 0, delivery_type: 2, active: true, name_lt: 'Stop Desk Kouba' }]
                }
                if (input.deliveryType === 3) {
                    return [{ commune: 1606, pickup_point: 901, delivery_type: 3, active: true, name_lt: 'Relais Kouba' }]
                }
                return []
            }
        )

        const res = await request(app)
            .get('/api/delivery/maystro/pickup-points')
            .set('Host', host)
            .query({ commune: '1605', wilaya: '16', nearby: 'true' })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].delivery_type).toBe(2)
        expect(nearbySpy).toHaveBeenCalledTimes(1)
    })
})
