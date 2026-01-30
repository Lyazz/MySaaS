import axios, { AxiosInstance } from 'axios'
import type { ShipmentProvider, ShipmentStatus } from '@prisma/client'
import type {
    CreateShipmentInput,
    CreateShipmentResult,
    DeliveryProvider,
    QuoteOption,
    QuoteRequest,
    TrackingEvent
} from '../types'

const DEFAULT_BASE_URL = 'https://api.yalidine.app/v1'

const statusFromYalidine = (status: string | number | undefined): ShipmentStatus => {
    const value = typeof status === 'string' ? status.toLowerCase() : status
    if (value === 'delivered' || value === 40) return 'DELIVERED'
    if (value === 'cancelled' || value === 50) return 'CANCELLED'
    if (value === 'returned') return 'RETURNED'
    if (value === 'in_transit' || value === 30) return 'IN_TRANSIT'
    if (value === 'confirmed' || value === 20) return 'CONFIRMED'
    return 'PENDING'
}

export class YalidineProvider implements DeliveryProvider {
    provider: ShipmentProvider = 'YALIDINE'
    private http: AxiosInstance

    constructor(opts?: { apiId?: string; apiToken?: string; baseURL?: string }) {
        const apiId = opts?.apiId || process.env.YALIDINE_API_ID
        const apiToken = opts?.apiToken || process.env.YALIDINE_API_TOKEN
        const baseURL = opts?.baseURL || process.env.YALIDINE_BASE_URL || DEFAULT_BASE_URL
        this.http = axios.create({
            baseURL,
            headers: {
                'X-API-ID': apiId || '',
                'X-API-TOKEN': apiToken || '',
                'Content-Type': 'application/json'
            },
            timeout: 10_000
        })
    }

    async quote(input: QuoteRequest): Promise<QuoteOption[]> {
        try {
            const res = await this.http.post('/fees', {
                from_wilaya_code: process.env.YALIDINE_ORIGIN_WILAYA || '16',
                to_wilaya_code: input.destination.wilayaCode,
                to_commune_code: input.destination.communeCode,
                weight: input.weight || 1
            })

            const price = Number(res.data?.fees?.total || res.data?.fees || 0)
            return [
                {
                    provider: this.provider,
                    serviceLevel: input.serviceLevel,
                    price,
                    currency: 'DZD',
                    source: 'provider'
                }
            ]
        } catch (error) {
            return []
        }
    }

    async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
        const payload = {
            tracking_id: input.orderId,
            first_name: input.contactName,
            phone: input.contactPhone,
            to_wilaya_code: input.wilayaCode,
            to_commune_code: input.communeCode,
            address: input.addressLine1,
            address_second: input.addressLine2,
            notes: input.notes,
            product_list: input.metadata?.items ?? [],
            price: input.price,
            service_level: input.serviceLevel
        }
        const res = await this.http.post('/parcels', payload)
        const data = res.data?.parcel || res.data
        return {
            providerShipmentId: data?.tracking || data?.id,
            status: statusFromYalidine(data?.status),
            trackingUrl: data?.tracking_url,
            price: data?.fees ? Number(data.fees.total) : input.price,
            currency: 'DZD',
            raw: data
        }
    }

    async track(shipment: { providerShipmentId?: string }): Promise<TrackingEvent[]> {
        if (!shipment.providerShipmentId) return []
        const res = await this.http.get(`/parcels/${shipment.providerShipmentId}`)
        const data = res.data?.parcel || res.data
        const events = (data?.history || []).map((e: any) => ({
            status: statusFromYalidine(e.status),
            code: e.status,
            description: e.message,
            eventTime: e.created_at ? new Date(e.created_at) : undefined,
            raw: e
        }))
        return events
    }
}
