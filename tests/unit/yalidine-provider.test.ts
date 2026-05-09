import { describe, expect, it, vi, afterEach } from 'vitest'
import { YalidineClient } from '../../backend/src/modules/delivery/yalidine/yalidine.client'
import { YalidineProvider } from '../../backend/src/modules/delivery/providers/yalidine.provider'

describe('YalidineProvider', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('quotes documented Yalidine fees by delivery mode and commune', async () => {
        const calls: any[] = []
        vi.spyOn(YalidineClient.prototype, 'request').mockImplementation(async (opts: any) => {
            calls.push(opts)
            expect(opts.method).toBe('GET')
            expect(opts.path).toBe('/fees/')
            expect(opts.params).toEqual({ from_wilaya_id: 16, to_wilaya_id: 5 })
            return {
                oversize_fee: 100,
                per_commune: {
                    '501': {
                        commune_id: 501,
                        commune_name: 'Batna',
                        express_home: 700,
                        express_desk: 500,
                        economic_home: null,
                        economic_desk: null
                    }
                }
            }
        })

        const provider = new YalidineProvider({ apiId: 'api-id', apiToken: 'api-token', originWilayaId: '16' })
        const quotes = await provider.quote({
            tenantId: 'tenant-1',
            provider: 'YALIDINE',
            destination: { wilayaCode: '05', communeCode: '501' },
            deliveryMode: 'office',
            weight: 7
        })

        expect(calls).toHaveLength(1)
        expect(quotes).toEqual([
            {
                provider: 'YALIDINE',
                serviceLevel: undefined,
                price: 700,
                currency: 'DZD',
                source: 'provider'
            }
        ])
    })

    it('creates parcels using the official Yalidine parcel payload', async () => {
        const calls: any[] = []
        vi.spyOn(YalidineClient.prototype, 'request').mockImplementation(async (opts: any) => {
            calls.push(opts)
            if (opts.path === '/wilayas/') {
                return { data: [{ id: 5, name: 'Batna', is_deliverable: 1 }] }
            }
            if (opts.path === '/communes/') {
                expect(opts.params.wilaya_id).toBe(5)
                return { data: [{ id: 501, name: 'Batna', wilaya_id: 5, wilaya_name: 'Batna', is_deliverable: 1 }] }
            }
            if (opts.path === '/parcels/') {
                expect(opts.method).toBe('POST')
                expect(opts.data).toHaveLength(1)
                expect(opts.data[0]).toMatchObject({
                    order_id: 'order-1',
                    from_wilaya_name: 'Alger',
                    firstname: 'Alice',
                    familyname: 'Benali',
                    contact_phone: '0550123456',
                    address: '123 Rue Test',
                    to_commune_name: 'Batna',
                    to_wilaya_name: 'Batna',
                    product_list: '2 x Product A',
                    price: 3200,
                    do_insurance: false,
                    declared_value: 3200,
                    weight: 1,
                    freeshipping: true,
                    is_stopdesk: false,
                    has_exchange: false
                })
                return {
                    'order-1': {
                        success: true,
                        order_id: 'order-1',
                        tracking: 'yal-123',
                        label: 'https://api.yalidine.app/labels/yal-123',
                        message: ''
                    }
                }
            }
            throw new Error(`Unexpected path ${opts.path}`)
        })

        const provider = new YalidineProvider({ apiId: 'api-id', apiToken: 'api-token', originWilayaName: 'Alger' })
        const result = await provider.createShipment({
            tenantId: 'tenant-1',
            provider: 'YALIDINE',
            orderId: 'order-1',
            contactName: 'Alice Benali',
            contactPhone: '0550123456',
            wilayaCode: '5',
            communeCode: '501',
            addressLine1: '123 Rue Test',
            codAmount: 3200,
            currency: 'DZD',
            deliveryMode: 'home',
            metadata: { items: [{ title: 'Product A', quantity: 2 }] }
        })

        expect(calls.map((c) => c.path)).toEqual(['/wilayas/', '/communes/', '/parcels/'])
        expect(result.providerShipmentId).toBe('yal-123')
        expect(result.status).toBe('REQUESTED')
        expect(result.labelUrl).toBe('https://api.yalidine.app/labels/yal-123')
    })
})

