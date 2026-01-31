import { Buffer } from 'node:buffer'
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import type { ShipmentProvider, ShipmentStatus } from '@prisma/client'
import type {
    CreateShipmentInput,
    CreateShipmentResult,
    DeliveryProvider,
    QuoteOption,
    QuoteRequest,
    TrackingEvent
} from '../types'

const DEFAULT_BASE_URL = 'https://backend.maystro-delivery.com/api'

const statusFromCode = (code: any): ShipmentStatus => {
    const n = typeof code === 'string' ? parseInt(code, 10) : code
    if (n === 50 || code === 'cancelled') return 'CANCELLED'
    if (n === 40 || code === 'delivered') return 'DELIVERED'
    if (n === 30 || code === 'in_transit' || code === 'in-transit') return 'IN_TRANSIT'
    if (n === 20 || code === 'confirmed') return 'CONFIRMED'
    if (n === 10 || code === 'requested') return 'REQUESTED'
    return 'PENDING'
}

export class MaystroProvider implements DeliveryProvider {
    provider: ShipmentProvider = 'MAYSTRO'
    private http: AxiosInstance

    constructor(opts?: { apiKey?: string; baseURL?: string }) {
        const apiKey = opts?.apiKey || process.env.MAYSTRO_API_KEY
        const baseURL = opts?.baseURL || process.env.MAYSTRO_BASE_URL || DEFAULT_BASE_URL
        this.http = axios.create({
            baseURL,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10_000
        })
    }

    async quote(input: QuoteRequest): Promise<QuoteOption[]> {
        try {
            const response = await this.http.post('/shared/delivery_price/', {
                wilaya_code: input.destination.wilayaCode,
                commune_code: input.destination.communeCode,
                total_weight: input.weight || 1
            })

            const price = Number(response.data?.delivery_price ?? response.data?.price ?? 0)
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
            // Swallow errors to allow caller to fall back to local rates
            return []
        }
    }

    async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
        const payload = {
            instance_uuid: input.orderId,
            receiver_name: input.contactName,
            receiver_phone: input.contactPhone,
            wilaya_code: input.wilayaCode,
            commune_code: input.communeCode,
            address: input.addressLine1,
            address_complement: input.addressLine2,
            notes: input.notes,
            // Optionally include service level mapping if supported
            service_level: input.serviceLevel
        }

        const response = await this.http.post('/stores/orders/', payload)
        const data = response.data || {}

        return {
            providerShipmentId: data.instance_uuid || data.id,
            status: statusFromCode(data.status),
            labelUrl: data.label_url,
            trackingUrl: data.tracking_url,
            price: data.delivery_price ? Number(data.delivery_price) : input.price,
            currency: 'DZD',
            raw: data
        }
    }

    async track(): Promise<TrackingEvent[]> {
        // Maystro does not expose a simple tracking endpoint in the provided docs; rely on stored events + webhooks.
        return []
    }

    async handleWebhook(payload: any) {
        // Maystro webhooks arrive as base64 twice per docs. Accept already-decoded JSON as well.
        let decoded: any = payload
        if (typeof payload === 'string') {
            try {
                const once = Buffer.from(payload, 'base64').toString('utf8')
                decoded = JSON.parse(Buffer.from(once, 'base64').toString('utf8'))
            } catch (error) {
                return null
            }
        }

        const eventStatus = statusFromCode(decoded?.payload?.status ?? decoded?.status)
        const shipmentId = decoded?.instance_uuid || decoded?.payload?.instance_uuid

        return {
            shipmentId,
            status: eventStatus,
            events: [
                {
                    status: eventStatus,
                    code: decoded?.event || decoded?.payload?.status?.toString(),
                    description: decoded?.payload?.status_label || 'Status updated',
                    raw: decoded,
                    eventTime: decoded?.payload?.updated_at ? new Date(decoded.payload.updated_at) : new Date()
                }
            ]
        }
    }
}
