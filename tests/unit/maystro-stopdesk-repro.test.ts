import { describe, expect, it, vi, afterEach } from 'vitest'
import { MaystroProvider } from '../../backend/src/modules/delivery/providers/maystro.provider'
import { MaystroPickupPointService } from '../../backend/src/modules/delivery/maystro/maystro-pickup-point.service'
import { MaystroLocationService } from '../../backend/src/modules/delivery/maystro/maystro-location.service'

// Exactly what Maystro returns: a stop desk carries pickup_point=null, a relay a real id.
const STOP_DESK_RAW = [
    { name_lt: 'Stop Desk Alger', commune: 1605, pickup_point: null, delivery_type: 2, active: true }
]
const RELAY_RAW = [
    { name_lt: 'Relais Kouba', commune: 1606, pickup_point: 901, delivery_type: 3, active: true }
]

const mockCarrier = (rows: any[]) => {
    vi.spyOn(MaystroPickupPointService.prototype as any, 'listActivePickupPoints').mockImplementation(
        async (input: any) => {
            const points = rows
                .map((p: any) => ({
                    name: p?.name_lt ?? undefined,
                    name_lt: p?.name_lt ?? undefined,
                    commune: Number(p?.commune),
                    pickup_point: p?.pickup_point != null ? Number(p.pickup_point) : 0,
                    delivery_type: Number(p?.delivery_type),
                    active: Boolean(p?.active)
                }))
                .filter((p) => p.commune === Number(input.commune))
            return input.deliveryType ? points.filter((p) => p.delivery_type === input.deliveryType) : points
        }
    )
}

const providerFor = (communes: Array<{ id: number; name: string }>) => {
    const provider = new MaystroProvider({ apiToken: 't' })
    vi.spyOn(provider as any, 'listCommunesForWilaya').mockResolvedValue(communes)
    return provider
}

afterEach(() => vi.restoreAllMocks())

describe('Maystro stop desk pickup point', () => {
    it('never hands out a commune id as a pickup point id', async () => {
        mockCarrier(STOP_DESK_RAW)
        const provider = providerFor([{ id: 1605, name: 'Alger Centre' }])

        const points = await provider.listPickupPoints({ wilayaCode: '16', communeCode: '1605' })

        expect(points).toHaveLength(1)
        expect(points[0].kind).toBe('desk')
        // The key is synthetic and clearly not a carrier id...
        expect(points[0].id).toBe('desk:1605')
        // ...and there is no carrier id to send, which is the whole point.
        expect(points[0].carrierPointId).toBeNull()
        expect(points[0].communeId).toBe('1605')
    })

    it('still exposes a relay by its real carrier id', async () => {
        mockCarrier(RELAY_RAW)
        const provider = providerFor([{ id: 1606, name: 'Kouba' }])

        const points = await provider.listPickupPoints({ wilayaCode: '16', communeCode: '1606' })

        expect(points).toHaveLength(1)
        expect(points[0].kind).toBe('relay')
        expect(points[0].id).toBe('901')
        expect(points[0].carrierPointId).toBe('901')
        expect(points[0].communeId).toBe('1606')
    })

    it('validates a relay against the commune the relay sits in, not the shopper\'s', async () => {
        mockCarrier(RELAY_RAW)
        const svc = new MaystroPickupPointService()

        // The relay lives in 1606 and validates there.
        await expect(
            svc.assertPickupPointValid({ apiToken: 't', commune: 1606, pickupPoint: 901 })
        ).resolves.toBeUndefined()

        // Against the shopper's own commune it would still fail — which is exactly why the
        // order now addresses the parcel to the relay's commune instead.
        await expect(
            svc.assertPickupPointValid({ apiToken: 't', commune: 1605, pickupPoint: 901 })
        ).rejects.toThrow('Invalid pickup_point for commune')
    })

    it('never treats a stop desk as something that carries a pickup_point', async () => {
        mockCarrier(STOP_DESK_RAW)
        const svc = new MaystroPickupPointService()

        // A desk has no id, so nothing may validate against it — only delivery_type=3 does.
        await expect(
            svc.assertPickupPointValid({ apiToken: 't', commune: 1605, pickupPoint: 1605 })
        ).rejects.toThrow('Invalid pickup_point for commune')

        const points = await svc.listActivePickupPoints({ apiToken: 't', commune: 1605 })
        expect(points[0].delivery_type).toBe(2)
        expect(points[0].pickup_point).toBe(0)
    })
})

describe('a commune Maystro does not know by that name', () => {
    // Our commune list merges several carriers plus a static dataset, so it carries
    // spellings Maystro does not use: Béjaïa's "Aït Maouche" is Maystro's "Beni Maouch",
    // and Tamanrasset is its "Tamanghasset". Neither normalizes to the other.
    const BEJAIA = 6
    const CENTER_COMMUNE = 178

    const mockWilayaWithDeskOnly = (provider: MaystroProvider) => {
        vi.spyOn(provider as any, 'listCommunesForWilaya').mockResolvedValue([
            { id: CENTER_COMMUNE, name: 'Bejaia' },
            { id: 201, name: 'Adekar' },
            { id: 227, name: 'Beni Maouch' }
        ])
        vi.spyOn(MaystroLocationService.prototype, 'listWilayas').mockResolvedValue([
            { id: BEJAIA, name: 'Bejaia', centerCommune: CENTER_COMMUNE }
        ] as any)
        // The nearby walk builds its own location service to enumerate the wilaya.
        vi.spyOn(MaystroLocationService.prototype, 'listCommunes').mockResolvedValue([
            { id: CENTER_COMMUNE, wilaya: BEJAIA, name: 'Bejaia' },
            { id: 201, wilaya: BEJAIA, name: 'Adekar' },
            { id: 227, wilaya: BEJAIA, name: 'Beni Maouch' }
        ] as any)
        mockCarrier([
            { name_lt: 'Bejaia - Stop desk Maystro', commune: CENTER_COMMUNE, pickup_point: null, delivery_type: 2, active: true }
        ])
    }

    it('still offers the wilaya stop desk for a spelling Maystro does not have', async () => {
        const provider = new MaystroProvider({ apiToken: 't' })
        mockWilayaWithDeskOnly(provider)

        // "Aït Maouche" matches no Maystro commune at all.
        const points = await provider.listPickupPoints({ wilayaCode: '6', communeCode: 'Aït Maouche' })

        // The wilaya has one desk and it serves the whole wilaya, so an unplaceable
        // commune must not come back empty — that is what made it look unavailable.
        expect(points).toHaveLength(1)
        expect(points[0].kind).toBe('desk')
        expect(points[0].carrierPointId).toBeNull()
        expect(points[0].communeId).toBe(String(CENTER_COMMUNE))
    })

    it('gives a known spelling the same answer', async () => {
        const provider = new MaystroProvider({ apiToken: 't' })
        mockWilayaWithDeskOnly(provider)

        const known = await provider.listPickupPoints({ wilayaCode: '6', communeCode: 'Beni Maouch' })
        expect(known).toHaveLength(1)
        expect(known[0].id).toBe(`desk:${CENTER_COMMUNE}`)
    })

    it('returns nothing when the wilaya genuinely has no collection point', async () => {
        const provider = new MaystroProvider({ apiToken: 't' })
        vi.spyOn(provider as any, 'listCommunesForWilaya').mockResolvedValue([{ id: 900, name: 'Nowhere' }])
        vi.spyOn(MaystroLocationService.prototype, 'listWilayas').mockResolvedValue([
            { id: 99, name: 'Nowhere', centerCommune: 900 }
        ] as any)
        vi.spyOn(MaystroLocationService.prototype, 'listCommunes').mockResolvedValue([
            { id: 900, wilaya: 99, name: 'Nowhere' }
        ] as any)
        mockCarrier([])

        expect(await provider.listPickupPoints({ wilayaCode: '99', communeCode: 'Unknown' })).toEqual([])
    })
})
