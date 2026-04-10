import { MaystroClient } from './maystro.client'
import { MaystroIntegrationError } from './maystro.errors'

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
            path: '/base/pickup-points',
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

    async assertPickupPointValid(input: { apiToken: string; commune: string | number; pickupPoint: number }) {
        const points = await this.listActivePickupPoints({ apiToken: input.apiToken, commune: input.commune })
        if (!points.some((p) => p.pickup_point === input.pickupPoint)) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'Invalid pickup_point for commune' })
        }
    }
}

