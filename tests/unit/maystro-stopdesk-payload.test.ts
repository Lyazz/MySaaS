import { describe, expect, it, vi, afterEach } from 'vitest'
import { MaystroOrderService } from '../../backend/src/modules/delivery/maystro/maystro-order.service'
import { MaystroLocationService } from '../../backend/src/modules/delivery/maystro/maystro-location.service'
import { MaystroPickupPointService } from '../../backend/src/modules/delivery/maystro/maystro-pickup-point.service'
import { MaystroProductService } from '../../backend/src/modules/delivery/maystro/maystro-product.service'

// Alger: the wilaya's single stop desk sits in commune 579 (Djasr Kasentina), which is
// also where relay 8 sits. A shopper in Hydra (commune 561) is offered both.
const WILAYA = 16
const SHOPPER_COMMUNE = 561
const DESK_COMMUNE = 579
const RELAY_POINT = 8

const ORDER = {
    id: '11111111-2222-3333-4444-555555555555',
    tenantId: 'tenant-1',
    totalAmount: 4200,
    items: [
        {
            productId: 'prod-1',
            quantity: 2,
            price: 2100,
            product: { title: 'Sac à dos' },
            variant: null
        }
    ]
}

const fakePrisma = {
    order: { findFirst: async () => ORDER },
    maystroProductMapping: {
        findMany: async () => [
            { localProductId: 'prod-1', localVariantId: '', maystroProductId: 'maystro-prod-1', syncStatus: 'SYNCED' }
        ]
    }
} as any

const buildFor = async (extra: Record<string, unknown>) => {
    const svc = new MaystroOrderService(fakePrisma) as any
    return svc.buildPayload({
        tenantId: 'tenant-1',
        apiToken: 'token',
        storeId: 'store-1',
        localOrderId: ORDER.id,
        customerName: 'Amine',
        customerPhone: '0550123456',
        destinationText: 'Hydra, Alger',
        wilaya: String(WILAYA),
        commune: 'Hydra',
        ...extra
    })
}

const mockCarrier = () => {
    vi.spyOn(MaystroProductService.prototype, 'ensureOrderProductsSynced').mockResolvedValue(undefined as any)

    vi.spyOn(MaystroLocationService.prototype, 'validateWilayaAndCommune').mockResolvedValue({
        wilaya: WILAYA,
        commune: SHOPPER_COMMUNE,
        centerCommune: DESK_COMMUNE
    } as any)

    // Used to turn a recorded relay commune name back into its id.
    vi.spyOn(MaystroLocationService.prototype, 'resolveWilayaAndCommune').mockResolvedValue({
        wilayaId: WILAYA,
        wilayaName: 'Alger',
        communeId: DESK_COMMUNE,
        communeName: 'Djasr Kasentina',
        centerCommuneId: DESK_COMMUNE
    } as any)

    // Relay 8 exists in commune 579 and nowhere else.
    vi.spyOn(MaystroPickupPointService.prototype, 'listActivePickupPoints').mockImplementation(
        async (input: any) =>
            Number(input.commune) === DESK_COMMUNE
                ? ([{ commune: DESK_COMMUNE, pickup_point: RELAY_POINT, delivery_type: 3, active: true }] as any)
                : ([] as any)
    )
}

afterEach(() => vi.restoreAllMocks())

describe('Maystro order payload for collection points', () => {
    it('sends a stop desk as delivery_type=2 with no pickup_point, addressed to the center commune', async () => {
        mockCarrier()
        const { payload } = await buildFor({ deliveryType: 2 })

        expect(payload.delivery_type).toBe(2)
        // The whole defect: a stop desk carries no pickup_point at all. Sending one — and it
        // used to be a commune id — is what came back as "Invalid pickup_point for commune".
        expect(payload.pickup_point).toBeUndefined()
        // Maystro refuses delivery_type=2 outside the wilaya's center commune (error 45).
        expect(payload.commune).toBe(DESK_COMMUNE)
        expect(payload.wilaya).toBe(WILAYA)
    })

    it('addresses a relay parcel to the relay commune, not the shopper\'s', async () => {
        mockCarrier()
        const { payload } = await buildFor({
            deliveryType: 3,
            pickupPoint: RELAY_POINT,
            pickupPointCommune: 'Djasr Kasentina'
        })

        expect(payload.delivery_type).toBe(3)
        expect(payload.pickup_point).toBe(RELAY_POINT)
        // Not SHOPPER_COMMUNE: the parcel travels to the relay, and the id is only valid there.
        expect(payload.commune).toBe(DESK_COMMUNE)
    })

    it('accepts the relay commune as a bare id too', async () => {
        mockCarrier()
        const { payload } = await buildFor({
            deliveryType: 3,
            pickupPoint: RELAY_POINT,
            pickupPointCommune: String(DESK_COMMUNE)
        })

        expect(payload.commune).toBe(DESK_COMMUNE)
        expect(payload.pickup_point).toBe(RELAY_POINT)
    })

    it('still refuses a relay id that the carrier does not know in that commune', async () => {
        mockCarrier()
        await expect(
            buildFor({ deliveryType: 3, pickupPoint: 999, pickupPointCommune: String(DESK_COMMUNE) })
        ).rejects.toThrow('Invalid pickup_point for commune')
    })

    it('leaves a home delivery untouched', async () => {
        mockCarrier()
        const { payload } = await buildFor({ deliveryType: 1 })

        expect(payload.delivery_type).toBe(1)
        expect(payload.pickup_point).toBeUndefined()
        expect(payload.commune).toBe(SHOPPER_COMMUNE)
    })
})
