import type { PrismaClient } from '@prisma/client'
import axios from 'axios'
import prisma from '../../../lib/prisma'
import { MaystroIntegrationError } from './maystro.errors'

export type MaystroWilaya = { id: number; name: string }
export type MaystroCommune = { id: number; wilaya: number; name: string; postcode?: string; zone?: string }

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

        const { data } = await axios.get<any[]>(`${this.baseUrl()}/base/wilayas/`, {
            params: { language: input.language, country: input.country },
            headers: input.apiToken ? { Authorization: input.apiToken } : undefined,
            timeout: 15_000
        })

        const wilayas: MaystroWilaya[] = (Array.isArray(data) ? data : []).map((w: any) => ({
            id: Number(w?.id),
            name: String(w?.name ?? w?.name_lt ?? w?.name_ar ?? '')
        }))

        this.wilayasCache = { value: wilayas, expiresAt: nowMs() + this.cacheTtlMs() }
        return wilayas
    }

    async listCommunes(input: { apiToken?: string; wilaya: string | number }): Promise<MaystroCommune[]> {
        const key = String(input.wilaya)
        const cached = this.communesCache.get(key)
        if (cached && cached.expiresAt > nowMs()) return cached.value

        const { data } = await axios.get<any[]>(`${this.baseUrl()}/base/communes/`, {
            params: { wilaya: input.wilaya },
            headers: input.apiToken ? { Authorization: input.apiToken } : undefined,
            timeout: 15_000
        })

        const communes: MaystroCommune[] = (Array.isArray(data) ? data : []).map((c: any) => ({
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
    }): Promise<{ wilaya: string | number; commune: string | number }> {
        const wilayaTrimmed = input.wilaya.trim()
        const communeTrimmed = input.commune.trim()
        if (!wilayaTrimmed || !communeTrimmed) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'wilaya and commune are required' })
        }

        const wilayas = await this.listWilayas({ apiToken: input.apiToken })
        const wilayaId = Number.parseInt(wilayaTrimmed, 10)
        const wilayaMatch = Number.isFinite(wilayaId)
            ? wilayas.find((w) => w.id === wilayaId)
            : wilayas.find((w) => w.name.toLowerCase() === wilayaTrimmed.toLowerCase())

        if (!wilayaMatch) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'Invalid wilaya' })
        }

        const communes = await this.listCommunes({ apiToken: input.apiToken, wilaya: wilayaMatch.id })
        const communeId = Number.parseInt(communeTrimmed, 10)
        const communeMatch = Number.isFinite(communeId)
            ? communes.find((c) => c.id === communeId)
            : communes.find((c) => c.name.toLowerCase() === communeTrimmed.toLowerCase())

        if (!communeMatch) {
            throw new MaystroIntegrationError({ statusCode: 400, statusMessage: 'Invalid commune for wilaya' })
        }

        // Prefer stable IDs/codes for downstream calls.
        return { wilaya: wilayaMatch.id, commune: communeMatch.id }
    }
}
