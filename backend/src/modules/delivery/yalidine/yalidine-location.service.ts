import { YalidineClient } from './yalidine.client'
import { YalidineIntegrationError } from './yalidine.errors'

export type YalidineWilaya = { id: number; name: string; zone?: number; isDeliverable?: boolean }
export type YalidineCommune = {
    id: number
    name: string
    wilayaId: number
    wilayaName: string
    hasStopDesk?: boolean
    isDeliverable?: boolean
}

export type ResolvedYalidineLocation = {
    wilayaId: number
    wilayaName: string
    communeId: number
    communeName: string
}

type ListEnvelope<T> = { data?: T[] }
type CacheEntry<T> = { value: T; expiresAt: number }

const nowMs = () => Date.now()

const asBoolean = (value: unknown) => value === true || value === 1 || value === '1'

const normalizeComparable = (value: unknown) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

const parsePositiveInt = (value: unknown): number | null => {
    const n = Number.parseInt(String(value ?? '').trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : null
}

const unwrapList = <T>(data: T[] | ListEnvelope<T>): T[] => {
    if (Array.isArray(data)) return data
    return Array.isArray(data?.data) ? data.data : []
}

export class YalidineLocationService {
    private client: YalidineClient
    private wilayasCache: CacheEntry<YalidineWilaya[]> | null = null
    private communesCache = new Map<string, CacheEntry<YalidineCommune[]>>()

    constructor(client: YalidineClient) {
        this.client = client
    }

    private cacheTtlMs() {
        return 60 * 60 * 1000
    }

    async listWilayas(): Promise<YalidineWilaya[]> {
        if (this.wilayasCache && this.wilayasCache.expiresAt > nowMs()) return this.wilayasCache.value

        const data = await this.client.request<any[] | ListEnvelope<any>>({
            method: 'GET',
            path: '/wilayas/',
            params: { page_size: 1000 }
        })

        const wilayas = unwrapList(data)
            .map((w: any) => ({
                id: Number(w?.id),
                name: String(w?.name ?? ''),
                zone: Number.isFinite(Number(w?.zone)) ? Number(w.zone) : undefined,
                isDeliverable: w?.is_deliverable == null ? undefined : asBoolean(w.is_deliverable)
            }))
            .filter((w) => Number.isFinite(w.id) && w.name.trim().length > 0)

        this.wilayasCache = { value: wilayas, expiresAt: nowMs() + this.cacheTtlMs() }
        return wilayas
    }

    async listCommunes(input: { wilayaId?: string | number; hasStopDesk?: boolean } = {}): Promise<YalidineCommune[]> {
        const wilayaId = input.wilayaId == null ? null : parsePositiveInt(input.wilayaId)
        const cacheKey = `${wilayaId ?? 'all'}:${input.hasStopDesk === true ? 'desk' : 'all'}`
        const cached = this.communesCache.get(cacheKey)
        if (cached && cached.expiresAt > nowMs()) return cached.value

        const data = await this.client.request<any[] | ListEnvelope<any>>({
            method: 'GET',
            path: '/communes/',
            params: {
                page_size: 1000,
                wilaya_id: wilayaId ?? undefined,
                has_stop_desk: input.hasStopDesk === true ? true : undefined
            }
        })

        const communes = unwrapList(data)
            .map((c: any) => ({
                id: Number(c?.id),
                name: String(c?.name ?? ''),
                wilayaId: Number(c?.wilaya_id),
                wilayaName: String(c?.wilaya_name ?? ''),
                hasStopDesk: c?.has_stop_desk == null ? undefined : asBoolean(c.has_stop_desk),
                isDeliverable: c?.is_deliverable == null ? undefined : asBoolean(c.is_deliverable)
            }))
            .filter((c) => Number.isFinite(c.id) && c.name.trim().length > 0 && Number.isFinite(c.wilayaId))

        this.communesCache.set(cacheKey, { value: communes, expiresAt: nowMs() + this.cacheTtlMs() })
        return communes
    }

    async resolveWilaya(input: string | number): Promise<{ id: number; name: string }> {
        const raw = String(input || '').trim()
        if (!raw) throw new YalidineIntegrationError({ statusCode: 400, statusMessage: 'Yalidine: wilaya is required' })

        const wilayas = await this.listWilayas()
        const id = parsePositiveInt(raw)
        const match = id
            ? wilayas.find((w) => w.id === id)
            : wilayas.find((w) => normalizeComparable(w.name) === normalizeComparable(raw))

        if (!match) throw new YalidineIntegrationError({ statusCode: 400, statusMessage: 'Yalidine: invalid wilaya' })
        return { id: match.id, name: match.name }
    }

    async resolveWilayaAndCommune(input: {
        wilaya: string | number
        commune: string | number
    }): Promise<ResolvedYalidineLocation> {
        const wilaya = await this.resolveWilaya(input.wilaya)
        const rawCommune = String(input.commune || '').trim()
        if (!rawCommune) {
            throw new YalidineIntegrationError({ statusCode: 400, statusMessage: 'Yalidine: commune is required' })
        }

        const communes = await this.listCommunes({ wilayaId: wilaya.id })
        const communeId = parsePositiveInt(rawCommune)
        const communeMatch = communeId
            ? communes.find((c) => c.id === communeId)
            : communes.find((c) => normalizeComparable(c.name) === normalizeComparable(rawCommune))

        if (!communeMatch) {
            throw new YalidineIntegrationError({ statusCode: 400, statusMessage: 'Yalidine: invalid commune for wilaya' })
        }

        return {
            wilayaId: wilaya.id,
            wilayaName: wilaya.name,
            communeId: communeMatch.id,
            communeName: communeMatch.name
        }
    }
}

