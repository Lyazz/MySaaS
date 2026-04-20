import axios from 'axios'
import type { AxiosInstance } from 'axios'
import type { Shipment, ShipmentProvider, ShipmentStatus } from '@prisma/client'
import type {
    CreateShipmentInput,
    CreateShipmentResult,
    DeliveryProvider,
    QuoteOption,
    QuoteRequest,
    TrackingEvent
} from '../types'

const DEFAULT_BASE_URL = 'https://api.yalidine.app/v1'

const normalizeWilayaCode = (code: string | undefined) => {
    if (!code) return undefined
    const n = Number.parseInt(code, 10)
    return Number.isFinite(n) ? String(n) : code
}

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
    private originWilayaCode?: string

    constructor(opts?: { apiId?: string; apiToken?: string; baseURL?: string; originWilayaCode?: string }) {
        const apiId = opts?.apiId ?? ''
        const apiToken = opts?.apiToken ?? ''
        const baseURL = opts?.baseURL || process.env.YALIDINE_BASE_URL || DEFAULT_BASE_URL
        this.originWilayaCode = opts?.originWilayaCode
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
                from_wilaya_code:
                    normalizeWilayaCode(
                        input.originWilayaCode || this.originWilayaCode || process.env.YALIDINE_ORIGIN_WILAYA || '16'
                    ),
                to_wilaya_code: normalizeWilayaCode(input.destination.wilayaCode),
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
            to_wilaya_code: normalizeWilayaCode(input.wilayaCode),
            to_commune_code: input.communeCode,
            address: input.addressLine1,
            address_second: input.addressLine2,
            notes: input.notes,
            product_list: input.metadata?.items ?? [],
            price: input.codAmount ?? input.price,
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

    async track(shipment: Shipment): Promise<TrackingEvent[]> {
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
