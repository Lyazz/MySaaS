import type { ShipmentProvider, ShipmentStatus } from '@prisma/client'
import type {
    CreateShipmentInput,
    CreateShipmentResult,
    DeliveryProvider,
    ProviderCommune,
    ProviderPickupPoint,
    QuoteOption,
    QuoteRequest,
    TrackingEvent
} from '../types'
import { MaystroClient } from '../maystro/maystro.client'
import { MaystroPickupPointService } from '../maystro/maystro-pickup-point.service'
import { normalizeLocationName } from '../shared/normalize-location-name'

export class MaystroProvider implements DeliveryProvider {
    provider: ShipmentProvider = 'MAYSTRO'
    private client: MaystroClient | null
    private sampleCommuneByWilaya = new Map<string, string>()
    private wilayaIdByInput = new Map<string, number>()
    private communesByWilayaId = new Map<number, Array<{ id: number; name: string }>>()

    private apiToken: string | null = null
    private pickupPoints = new MaystroPickupPointService()

    constructor(opts?: { apiToken?: string }) {
        const apiToken = typeof opts?.apiToken === 'string' ? opts.apiToken.trim() : ''
        this.apiToken = apiToken || null
        this.client = apiToken ? new MaystroClient({ apiToken }) : null
    }

    private async resolveWilayaId(wilayaInput: string): Promise<number | null> {
        const trimmed = String(wilayaInput || '').trim()
        if (!trimmed) return null

        const cached = this.wilayaIdByInput.get(trimmed.toLowerCase())
        if (cached) return cached

        const numeric = Number.parseInt(trimmed, 10)
        if (Number.isFinite(numeric)) {
            this.wilayaIdByInput.set(trimmed.toLowerCase(), numeric)
            return numeric
        }

        if (!this.client) return null
        const wilayas = await this.client.request<any[]>({ method: 'GET', path: '/base/wilayas/' })
        const match = (Array.isArray(wilayas) ? wilayas : []).find(
            (w) => normalizeLocationName(w?.name ?? w?.name_lt ?? w?.name_ar ?? '') === normalizeLocationName(trimmed)
        )
        const id = Number(match?.id ?? match?.code ?? match?.display_id ?? NaN)
        if (!Number.isFinite(id)) return null
        this.wilayaIdByInput.set(trimmed.toLowerCase(), id)
        return id
    }

    private async listCommunesForWilaya(wilayaId: number): Promise<Array<{ id: number; name: string }>> {
        const cached = this.communesByWilayaId.get(wilayaId)
        if (cached) return cached
        if (!this.client) return []
        const communes = await this.client.request<any[]>({
            method: 'GET',
            path: '/base/communes/',
            params: { wilaya: wilayaId }
        })
        const normalized = (Array.isArray(communes) ? communes : [])
            .map((c) => ({ id: Number(c?.id), name: String(c?.name ?? '') }))
            .filter((c) => Number.isFinite(c.id) && c.name.trim().length > 0)
        this.communesByWilayaId.set(wilayaId, normalized)
        return normalized
    }

    async quote(input: QuoteRequest): Promise<QuoteOption[]> {
        if (!this.client) return []

        const deliveryType = input.deliveryMode === 'home' ? 1 : 2

        try {
            const wilayaKey = String(input.destination.wilayaCode || '').trim()
            const wilayaId = await this.resolveWilayaId(wilayaKey)
            if (!wilayaId) return []

            let communeId: string | null = null

            const rawCommune = typeof input.destination.communeCode === 'string' ? input.destination.communeCode.trim() : ''
            if (rawCommune) {
                const numericCommune = Number.parseInt(rawCommune, 10)
                if (Number.isFinite(numericCommune)) {
                    communeId = String(numericCommune)
                } else {
                    const communes = await this.listCommunesForWilaya(wilayaId)
                    const match = communes.find((c) => normalizeLocationName(c.name) === normalizeLocationName(rawCommune))
                    if (match) communeId = String(match.id)
                }
            }

            if (!communeId) {
                const cached = this.sampleCommuneByWilaya.get(wilayaKey)
                if (cached) {
                    communeId = cached
                } else {
                    const communes = await this.listCommunesForWilaya(wilayaId)
                    const firstId = communes[0]?.id != null ? String(communes[0].id) : ''
                    if (!firstId) return []
                    this.sampleCommuneByWilaya.set(wilayaKey, firstId)
                    communeId = firstId
                }
            }

            const data = await this.client.request<any>({
                method: 'GET',
                path: '/base/delivery-prices/',
                params: { commune: communeId, delivery_type: deliveryType }
            })

            const price = Number(data?.delivery_price ?? data?.price ?? 0)
            if (!Number.isFinite(price) || price <= 0) return []

            return [
                {
                    provider: this.provider,
                    serviceLevel: input.serviceLevel,
                    price,
                    currency: 'DZD',
                    source: 'provider'
                }
            ]
        } catch {
            return []
        }
    }

    async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
        // Shipment creation is handled via the Orders Management API with product sync.
        // The DeliveryService orchestrates this flow to enforce tenant/product mapping rules.
        return {
            providerShipmentId: undefined,
            status: 'PENDING' as ShipmentStatus,
            raw: { error: 'Maystro shipment creation is orchestrated by DeliveryService' }
        }
    }

    async track(): Promise<TrackingEvent[]> {
        // Maystro does not expose a simple tracking endpoint; rely on stored events + webhooks.
        return []
    }

    async listCommunes(wilayaCode: string): Promise<ProviderCommune[]> {
        const wilayaId = await this.resolveWilayaId(wilayaCode)
        if (!wilayaId) return []
        const communes = await this.listCommunesForWilaya(wilayaId)
        return communes.map((c) => ({ id: String(c.id), name: c.name }))
    }

    async listPickupPoints(input: { wilayaCode: string; communeCode?: string }): Promise<ProviderPickupPoint[]> {
        if (!this.apiToken) return []

        const wilayaId = await this.resolveWilayaId(input.wilayaCode)
        if (!wilayaId) return []

        const communes = await this.listCommunesForWilaya(wilayaId)
        const communeName = new Map(communes.map((c) => [c.id, c.name]))

        const raw = String(input.communeCode ?? '').trim()
        let communeId: number | null = null
        if (raw) {
            const numeric = Number.parseInt(raw, 10)
            communeId = Number.isFinite(numeric)
                ? numeric
                : communes.find((c) => normalizeLocationName(c.name) === normalizeLocationName(raw))?.id ?? null
        }

        // Maystro keys pickup points by commune, so without one there is nothing to
        // ask for; fall back to the nearby walk the storefront already relies on.
        const points = communeId
            ? await this.pickupPoints.listActivePickupPointsNearby({
                  apiToken: this.apiToken,
                  commune: communeId,
                  wilaya: wilayaId
              })
            : []

        return points.map((p) => ({
            id: String(p.pickup_point || p.commune),
            name: p.name || communeName.get(p.commune) || String(p.commune),
            communeId: String(p.commune),
            communeName: communeName.get(p.commune)
        }))
    }
}
