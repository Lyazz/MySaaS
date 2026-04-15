import { MaystroClient } from './maystro.client'
import { MaystroIntegrationError } from './maystro.errors'
import { MaystroLocationService } from './maystro-location.service'

export type MaystroPickupPoint = {
    name_lt?: string
    name_ar?: string
    commune: number
    pickup_point: number
    delivery_type: number
    active: boolean
}

export class MaystroPickupPointService {
    async listActivePickupPoints(input: { apiToken: string; commune: string | number; deliveryType?: 2 | 3 }) {
        const client = new MaystroClient({ apiToken: input.apiToken })
        const data = await client.request<any[]>({
            method: 'GET',
            path: '/base/pickup-points/',
            params: { commune: input.commune }
        })

        const points: MaystroPickupPoint[] = (Array.isArray(data) ? data : []).map((p: any) => ({
            name_lt: p?.name_lt ? String(p.name_lt) : undefined,
            name_ar: p?.name_ar ? String(p.name_ar) : undefined,
            commune: Number(p?.commune),
            pickup_point: Number(p?.pickup_point),
            delivery_type: Number(p?.delivery_type),
            active: Boolean(p?.active)
        }))

        const active = points.filter((p) => p.active)
        if (input.deliveryType) return active.filter((p) => p.delivery_type === input.deliveryType)
        return active
    }

    async listActivePickupPointsNearby(input: {
        apiToken: string
        commune: string | number
        wilaya: string | number
        deliveryType?: 2 | 3
        maxCommuneAttempts?: number
    }) {
        const direct = await this.listActivePickupPoints({
            apiToken: input.apiToken,
            commune: input.commune,
            deliveryType: input.deliveryType
        })
        if (direct.length > 0) return direct

        const maxAttempts = Math.min(15, Math.max(1, input.maxCommuneAttempts ?? 8))
        const requestedCommuneId = typeof input.commune === 'number' ? input.commune : Number(String(input.commune))

        const location = new MaystroLocationService()
        const communes = await location.listCommunes({ apiToken: input.apiToken, wilaya: input.wilaya })
        if (!communes.length) return []

        const ranked = communes
            .slice()
            .sort((a, b) => {
                if (!Number.isFinite(requestedCommuneId)) return a.id - b.id
                return Math.abs(a.id - requestedCommuneId) - Math.abs(b.id - requestedCommuneId)
            })
            .slice(0, maxAttempts)

        for (const candidate of ranked) {
            const points = await this.listActivePickupPoints({
                apiToken: input.apiToken,
                commune: candidate.id,
                deliveryType: input.deliveryType
            })
            if (points.length > 0) return points
        }

        return []
    }

    async assertPickupPointValid(input: { apiToken: string; commune: string | number; pickupPoint: number }) {
        const points = await this.listActivePickupPoints({ apiToken: input.apiToken, commune: input.commune })
        if (!points.some((p) => p.pickup_point === input.pickupPoint)) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'Invalid pickup_point for commune' })
        }
    }
}
