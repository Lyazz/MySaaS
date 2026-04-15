import { MaystroClient } from './maystro.client'
import { MaystroIntegrationError } from './maystro.errors'
import { MaystroLocationService } from './maystro-location.service'

export type MaystroPickupPoint = {
    name?: string
    name_lt?: string
    name_ar?: string
    commune: number
    pickup_point: number
    delivery_type: number
    active: boolean
}

export type StopDeskCommune = {
    commune: number
    communeName?: string
    pickupPoints: MaystroPickupPoint[]
}

// Module-level cache so results survive across requests within the same process
const stopDeskCommunesCache = new Map<string, { value: StopDeskCommune[]; expiresAt: number }>()

export class MaystroPickupPointService {
    async listActivePickupPoints(input: { apiToken: string; commune: string | number; deliveryType?: 2 | 3 }) {
        const client = new MaystroClient({ apiToken: input.apiToken })
        const data = await client.request<any[]>({
            method: 'GET',
            path: '/base/pickup-points/',
            params: { commune: input.commune }
        })

        const points: MaystroPickupPoint[] = (Array.isArray(data) ? data : []).map((p: any) => ({
            name: p?.name_lt ? String(p.name_lt) : (p?.name_ar ? String(p.name_ar) : (p?.name ? String(p.name) : undefined)),
            name_lt: p?.name_lt ? String(p.name_lt) : undefined,
            name_ar: p?.name_ar ? String(p.name_ar) : undefined,
            commune: Number(p?.commune),
            // delivery_type=2 (stop desk) has pickup_point=null — use 0 as sentinel, commune is the real key
            pickup_point: p?.pickup_point != null ? Number(p.pickup_point) : 0,
            delivery_type: Number(p?.delivery_type),
            active: Boolean(p?.active)
        }))

        const active = points.filter((p) => Number.isFinite(p.commune) && p.commune > 0 && p.active)
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

    /**
     * Returns all communes in a wilaya that have at least one active stop desk pickup point.
     *
     * First tries fetching all pickup points for the wilaya in a single call (Maystro may support
     * a wilaya-level filter). If the API does not return results that way, falls back to iterating
     * through every commune for the wilaya. Results are cached for 1 hour per wilaya+deliveryType.
     */
    async listStopDeskCommunes(input: {
        apiToken: string
        wilaya: string | number
        deliveryType?: 2 | 3
    }): Promise<StopDeskCommune[]> {
        const dt = input.deliveryType ?? 3
        const cacheKey = `${input.wilaya}:${dt}`
        const cached = stopDeskCommunesCache.get(cacheKey)
        if (cached && cached.expiresAt > Date.now()) return cached.value

        const client = new MaystroClient({ apiToken: input.apiToken })
        const location = new MaystroLocationService()

        // Fetch communes upfront so we can attach names in all code paths
        const communes = await location.listCommunes({ apiToken: input.apiToken, wilaya: input.wilaya })
        const communeNameById = new Map(communes.map((c) => [c.id, c.name]))

        const normalizePoint = (p: any): MaystroPickupPoint => ({
            name: p?.name ? String(p.name) : (p?.name_lt ? String(p.name_lt) : (p?.name_ar ? String(p.name_ar) : undefined)),
            name_lt: p?.name_lt ? String(p.name_lt) : undefined,
            name_ar: p?.name_ar ? String(p.name_ar) : undefined,
            commune: Number(p?.commune),
            pickup_point: Number(p?.pickup_point),
            delivery_type: Number(p?.delivery_type),
            active: Boolean(p?.active)
        })

        // Try fetching all pickup points for the wilaya in one call
        let usedBulk = false
        try {
            const allPoints = await client.request<any[]>({
                method: 'GET',
                path: '/base/pickup-points/',
                params: { wilaya: input.wilaya }
            })

            if (Array.isArray(allPoints) && allPoints.length > 0 && allPoints[0]?.commune !== undefined) {
                usedBulk = true
                const grouped = new Map<number, MaystroPickupPoint[]>()
                for (const p of allPoints) {
                    const point = normalizePoint(p)
                    if (!point.active) continue
                    if (point.delivery_type !== dt) continue
                    if (!grouped.has(point.commune)) grouped.set(point.commune, [])
                    grouped.get(point.commune)!.push(point)
                }

                const result: StopDeskCommune[] = Array.from(grouped.entries()).map(([commune, pickupPoints]) => ({
                    commune,
                    communeName: communeNameById.get(commune),
                    pickupPoints
                }))

                stopDeskCommunesCache.set(cacheKey, { value: result, expiresAt: Date.now() + 3_600_000 })
                return result
            }
        } catch {
            // fall through to per-commune approach
        }

        if (usedBulk) {
            // Bulk call succeeded but returned empty — no stop desks for this wilaya
            stopDeskCommunesCache.set(cacheKey, { value: [], expiresAt: Date.now() + 3_600_000 })
            return []
        }

        // Per-commune fallback: iterate every commune and probe for pickup points
        const result: StopDeskCommune[] = []
        for (const commune of communes) {
            try {
                const points = await this.listActivePickupPoints({
                    apiToken: input.apiToken,
                    commune: commune.id,
                    deliveryType: dt
                })
                if (points.length > 0) {
                    result.push({ commune: commune.id, communeName: commune.name, pickupPoints: points })
                }
            } catch {
                // skip communes that fail
            }
        }

        stopDeskCommunesCache.set(cacheKey, { value: result, expiresAt: Date.now() + 3_600_000 })
        return result
    }
}
