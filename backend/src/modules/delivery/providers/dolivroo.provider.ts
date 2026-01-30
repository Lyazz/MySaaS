import axios, { AxiosInstance } from 'axios'
import type { Shipment, ShipmentProvider, ShipmentStatus } from '@prisma/client'
import type {
    CreateShipmentInput,
    CreateShipmentResult,
    DeliveryProvider,
    QuoteOption,
    QuoteRequest,
    TrackingEvent
} from '../types'

const statusFromDolivroo = (status: string | number | undefined): ShipmentStatus => {
    const value = typeof status === 'string' ? status.toLowerCase() : status
    if (value === 'delivered' || value === 40) return 'DELIVERED'
    if (value === 'cancelled' || value === 'canceled' || value === 50) return 'CANCELLED'
    if (value === 'returned') return 'RETURNED'
    if (value === 'in_transit' || value === 'in-transit' || value === 30) return 'IN_TRANSIT'
    if (value === 'confirmed' || value === 20) return 'CONFIRMED'
    if (value === 'requested' || value === 10) return 'REQUESTED'
    return 'PENDING'
}

const PROVIDER_SLUG: Record<ShipmentProvider, string> = {
    MAYSTRO: 'maystro',
    YALIDINE: 'yalidine',
    ECOTRACK: 'ecotrack',
    ZR_EXPRESS: 'zr_express',
    SELF: 'self'
}

export class DolivrooProvider implements DeliveryProvider {
    provider: ShipmentProvider
    private http: AxiosInstance
    private companyCode: string

    constructor(provider: ShipmentProvider, opts?: { apiKey?: string; baseURL?: string }) {
        this.provider = provider
        this.companyCode = PROVIDER_SLUG[provider] || provider.toLowerCase()
        const apiKey = opts?.apiKey || process.env.DOLIVROO_API_KEY
        const baseURL = opts?.baseURL || process.env.DOLIVROO_BASE_URL || 'https://dolivroo.com/api/v1/unified'
        this.http = axios.create({
            baseURL,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 15_000
        })
    }

    async listCompanies(): Promise<{ code: string; name: string }[]> {
        try {
            const res = await this.http.get('/companies')
            const companies = res.data?.companies || res.data || []
            return companies
                .map((c: any) => ({
                    code: c.code || c.slug || c.id || '',
                    name: c.name || c.label || c.title || c.code
                }))
                .filter((c: any) => c.code)
        } catch {
            return []
        }
    }

    async quote(input: QuoteRequest): Promise<QuoteOption[]> {
        const originWilaya = input.originWilayaCode || process.env.DOLIVROO_ORIGIN_WILAYA || 'Alger'
        try {
            const res = await this.http.get('/rates', {
                params: {
                    company_code: this.companyCode,
                    from_wilaya: originWilaya,
                    to_wilaya: input.destination.wilayaCode
                }
            })

            const data = res.data?.rate || res.data
            const price =
                Number(data?.fees?.total) ||
                Number(data?.total) ||
                Number(data?.price) ||
                Number(data?.delivery_price) ||
                0

            return [
                {
                    provider: this.provider,
                    serviceLevel: input.serviceLevel,
                    price,
                    currency: 'DZD',
                    estimatedMinDays: data?.eta_min || data?.etaMin,
                    estimatedMaxDays: data?.eta_max || data?.etaMax,
                    source: 'provider'
                }
            ]
        } catch (error) {
            return []
        }
    }

    async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
        const payload = {
            company_code: this.companyCode,
            order: {
                reference: input.orderId,
                customer: {
                    first_name: input.contactName,
                    last_name: '',
                    phone: input.contactPhone,
                    address: input.addressLine1
                },
                destination: {
                    wilaya: input.wilayaCode,
                    commune: input.communeCode || ''
                },
                package: {
                    products: input.metadata?.products || 'Order items',
                    weight: input.metadata?.weight || input.metadata?.totalWeight || 1
                },
                payment: {
                    amount: input.price ?? input.metadata?.codAmount ?? 0,
                    free_shipping: false
                },
                options: {
                    delivery_type: 'home',
                    notes: input.notes
                }
            }
        }

        const res = await this.http.post('/parcels', payload)
        const data = res.data || {}

        return {
            providerShipmentId: data.tracking_id || data.id,
            status: statusFromDolivroo(data.status),
            trackingUrl: data.tracking_url,
            labelUrl: data.label_url,
            price: data.delivery_price ? Number(data.delivery_price) : input.price,
            currency: 'DZD',
            raw: data
        }
    }

    async track(shipment: Shipment): Promise<TrackingEvent[]> {
        if (!shipment.providerShipmentId) return []
        const res = await this.http.get(`/parcels/${shipment.providerShipmentId}`, {
            params: { company_code: this.companyCode }
        })
        const data = res.data?.parcel || res.data
        const events = (data?.history || data?.events || []).map((e: any) => ({
            status: statusFromDolivroo(e.status),
            code: e.status,
            description: e.message || e.label,
            eventTime: e.created_at ? new Date(e.created_at) : undefined,
            raw: e
        }))
        return events
    }
}
