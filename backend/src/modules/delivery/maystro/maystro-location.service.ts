import type { PrismaClient } from '@prisma/client'
import axios from 'axios'
import prisma from '../../../lib/prisma'
import { MaystroClient } from './maystro.client'
import { MaystroIntegrationError } from './maystro.errors'
import { normalizeLocationName } from '../shared/normalize-location-name'

export type MaystroWilaya = { id: number; name: string; centerCommune?: number | null }
export type MaystroCommune = { id: number; wilaya: number; name: string; postcode?: string; zone?: string }
export type ResolvedMaystroLocation = {
    wilayaId: number
    wilayaName: string
    communeId: number
    communeName: string
    /// Maystro runs a single stop desk per wilaya, sited in this commune. Orders sent
    /// with delivery_type=2 are only accepted when they carry it (error code 45).
    centerCommuneId?: number | null
}

type CacheEntry<T> = { value: T; expiresAt: number }

const nowMs = () => Date.now()

export class MaystroLocationService {
    private prisma: PrismaClient
    private wilayasCache: CacheEntry<MaystroWilaya[]> | null = null
    private communesCache = new Map<string, CacheEntry<MaystroCommune[]>>()

    constructor(client: PrismaClient = prisma) {
        this.prisma = client
    }

    private cacheTtlMs() {
        return 60 * 60 * 1000
    }

    private baseUrl() {
        // Maystro base "location" endpoints appear to be public (no Authorization required).
        // We keep the same baseURL override as the MaystroClient for consistency.
        return process.env.MAYSTRO_BASE_URL || 'https://orders-management.maystro-delivery.com/api'
    }

    async listWilayas(input: { apiToken?: string; language?: string; country?: string } = {}): Promise<MaystroWilaya[]> {
        if (this.wilayasCache && this.wilayasCache.expiresAt > nowMs()) return this.wilayasCache.value

        const data = input.apiToken
            ? await new MaystroClient({ apiToken: input.apiToken, baseURL: this.baseUrl() }).request<any[]>({
                method: 'GET',
                path: '/base/wilayas/',
                params: { language: input.language, country: input.country }
            })
            : (
                await axios.get<any[]>(`${this.baseUrl()}/base/wilayas/`, {
                    params: { language: input.language, country: input.country },
                    timeout: 15_000
                })
            ).data

        if (!Array.isArray(data)) {
            throw new MaystroIntegrationError({ statusCode: 502, statusMessage: 'Maystro: invalid wilayas response' })
        }

        const wilayas: MaystroWilaya[] = data.map((w: any) => {
            const centerCommune = Number(w?.center_commune)
            return {
                // Maystro API returns "code" and "display_id" (equal), not "id"
                id: Number(w?.code ?? w?.display_id),
                name: String(w?.name_lt ?? w?.name_ar ?? w?.name ?? ''),
                centerCommune: Number.isFinite(centerCommune) && centerCommune > 0 ? centerCommune : null
            }
        })

        this.wilayasCache = { value: wilayas, expiresAt: nowMs() + this.cacheTtlMs() }
        return wilayas
    }

    async listCommunes(input: { apiToken?: string; wilaya: string | number }): Promise<MaystroCommune[]> {
        const key = String(input.wilaya)
        const cached = this.communesCache.get(key)
        if (cached && cached.expiresAt > nowMs()) return cached.value

        const data = input.apiToken
            ? await new MaystroClient({ apiToken: input.apiToken, baseURL: this.baseUrl() }).request<any[]>({
                method: 'GET',
                path: '/base/communes/',
                params: { wilaya: input.wilaya }
            })
            : (
                await axios.get<any[]>(`${this.baseUrl()}/base/communes/`, {
                    params: { wilaya: input.wilaya },
                    timeout: 15_000
                })
            ).data

        if (!Array.isArray(data)) {
            throw new MaystroIntegrationError({ statusCode: 502, statusMessage: 'Maystro: invalid communes response' })
        }

        const communes: MaystroCommune[] = data.map((c: any) => ({
            id: Number(c?.id),
            wilaya: Number(c?.wilaya),
            name: String(c?.name ?? ''),
            postcode: c?.postcode ? String(c.postcode) : undefined,
            zone: c?.zone ? String(c.zone) : undefined
        }))

        this.communesCache.set(key, { value: communes, expiresAt: nowMs() + this.cacheTtlMs() })
        return communes
    }

    async validateWilayaAndCommune(input: {
        apiToken?: string
        wilaya: string
        commune: string
    }): Promise<{ wilaya: string | number; commune: string | number; centerCommune: number | null }> {
        const resolved = await this.resolveWilayaAndCommune({
            apiToken: input.apiToken,
            wilaya: input.wilaya,
            commune: input.commune
        })

        // Prefer stable IDs/codes for downstream calls.
        return {
            wilaya: resolved.wilayaId,
            commune: resolved.communeId,
            centerCommune: resolved.centerCommuneId ?? null
        }
    }

    async resolveWilayaAndCommune(input: {
        apiToken?: string
        wilaya: string | number
        commune: string | number
    }): Promise<ResolvedMaystroLocation> {
        const wilayaTrimmed = String(input.wilaya || '').trim()
        const communeTrimmed = String(input.commune || '').trim()
        if (!wilayaTrimmed || !communeTrimmed) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'wilaya and commune are required' })
        }

        const wilayas = await this.listWilayas({ apiToken: input.apiToken })
        const wilayaId = Number.parseInt(wilayaTrimmed, 10)
        const wilayaMatch = Number.isFinite(wilayaId)
            ? wilayas.find((w) => w.id === wilayaId)
            : wilayas.find((w) => normalizeLocationName(w.name) === normalizeLocationName(wilayaTrimmed))

        if (!wilayaMatch) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'Invalid wilaya' })
        }

        const communes = await this.listCommunes({ apiToken: input.apiToken, wilaya: wilayaMatch.id })
        const communeId = Number.parseInt(communeTrimmed, 10)
        const communeMatch = Number.isFinite(communeId)
            ? communes.find((c) => c.id === communeId)
            : communes.find((c) => normalizeLocationName(c.name) === normalizeLocationName(communeTrimmed))

        if (!communeMatch) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'Invalid commune for wilaya' })
        }

        return {
            wilayaId: wilayaMatch.id,
            wilayaName: wilayaMatch.name,
            communeId: communeMatch.id,
            communeName: communeMatch.name,
            centerCommuneId: wilayaMatch.centerCommune ?? null
        }
    }
}
