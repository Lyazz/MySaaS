import prisma from './prisma'
import { DEFAULT_AI_DOCUMENT_MODEL, isAiDocumentModel } from '../../../shared/ai/models'

/**
 * Platform-wide settings a super-admin edits from the dashboard.
 *
 * Resolution order per field is **database → environment → hardcoded default**.
 * The environment layer is what keeps an existing deployment working: nothing
 * changes on the day this ships, and the operator takes over one field at a time
 * by saving it.
 *
 * Reads go through a short-lived process cache. A settings change therefore
 * reaches every instance within `CACHE_TTL_MS` rather than instantly; that is
 * the deliberate trade for not hitting the database on every AI request.
 */

export const AI_SETTINGS_KEY = 'ai.documents'

/** Hard ceiling on pages per job when nothing else says otherwise. */
export const DEFAULT_AI_DOCUMENT_MAX_PAGES = 10
/** Above this a single job could burn an unbounded amount of API budget. */
export const MAX_AI_DOCUMENT_MAX_PAGES = 100

const CACHE_TTL_MS = 30_000

/** Which layer supplied a field. Drives the "inherited from env" hints in the UI. */
export type SettingSource = 'db' | 'env' | 'default'

/** What the operator has explicitly set. Absent fields fall through to env. */
export interface StoredAiSettings {
    enabled?: boolean
    model?: string
    maxPagesPerJob?: number
}

export interface ResolvedAiSettings {
    enabled: boolean
    model: string
    maxPagesPerJob: number
    sources: {
        enabled: SettingSource
        model: SettingSource
        maxPagesPerJob: SettingSource
    }
}

const envFlag = (value: string | undefined): boolean | undefined => {
    if (value === undefined) return undefined
    const v = value.trim().toLowerCase()
    if (v === 'false' || v === '0' || v === 'no') return false
    if (v === 'true' || v === '1' || v === 'yes') return true
    return undefined
}

const envModel = (): string | undefined => {
    const raw = process.env.AI_DOCUMENT_MODEL?.trim()
    return raw ? raw : undefined
}

const envMaxPages = (): number | undefined => {
    const raw = Number(process.env.AI_DOCUMENT_MAX_PAGES)
    if (!Number.isFinite(raw) || raw < 1) return undefined
    return Math.min(MAX_AI_DOCUMENT_MAX_PAGES, Math.trunc(raw))
}

/**
 * Reads what the operator saved.
 *
 * Unknown and malformed fields are dropped rather than thrown on: a row written
 * by an older or newer build must never be able to take AI import down.
 */
export const parseStoredAiSettings = (value: unknown): StoredAiSettings => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const raw = value as Record<string, unknown>
    const parsed: StoredAiSettings = {}

    if (typeof raw.enabled === 'boolean') parsed.enabled = raw.enabled
    // A model that has since been retired from the catalogue falls back to env.
    if (isAiDocumentModel(raw.model)) parsed.model = raw.model
    if (
        typeof raw.maxPagesPerJob === 'number' &&
        Number.isInteger(raw.maxPagesPerJob) &&
        raw.maxPagesPerJob >= 1 &&
        raw.maxPagesPerJob <= MAX_AI_DOCUMENT_MAX_PAGES
    ) {
        parsed.maxPagesPerJob = raw.maxPagesPerJob
    }

    return parsed
}

/** Thrown at the operator, not the merchant — a bad value never reaches the DB. */
export class PlatformSettingValidationError extends Error {
    statusCode = 400
    constructor(message: string) {
        super(message)
    }
}

/** Validates a patch from the super-admin form. Absent keys mean "leave alone". */
export const validateAiSettingsPatch = (input: unknown): StoredAiSettings => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new PlatformSettingValidationError('A settings object is required')
    }
    const raw = input as Record<string, unknown>
    const patch: StoredAiSettings = {}

    if (raw.enabled !== undefined) {
        if (typeof raw.enabled !== 'boolean') {
            throw new PlatformSettingValidationError('enabled must be true or false')
        }
        patch.enabled = raw.enabled
    }

    if (raw.model !== undefined) {
        if (!isAiDocumentModel(raw.model)) {
            throw new PlatformSettingValidationError('Unknown model')
        }
        patch.model = raw.model
    }

    if (raw.maxPagesPerJob !== undefined) {
        const n = Number(raw.maxPagesPerJob)
        if (!Number.isInteger(n) || n < 1 || n > MAX_AI_DOCUMENT_MAX_PAGES) {
            throw new PlatformSettingValidationError(
                `maxPagesPerJob must be a whole number between 1 and ${MAX_AI_DOCUMENT_MAX_PAGES}`
            )
        }
        patch.maxPagesPerJob = n
    }

    return patch
}

const resolve = (stored: StoredAiSettings): ResolvedAiSettings => {
    const enabledEnv = envFlag(process.env.AI_DOCUMENTS_ENABLED)
    const modelEnv = envModel()
    const maxPagesEnv = envMaxPages()

    const pick = <T>(db: T | undefined, env: T | undefined, fallback: T): [T, SettingSource] => {
        if (db !== undefined) return [db, 'db']
        if (env !== undefined) return [env, 'env']
        return [fallback, 'default']
    }

    const [enabled, enabledSource] = pick(stored.enabled, enabledEnv, true)
    const [model, modelSource] = pick(stored.model, modelEnv, DEFAULT_AI_DOCUMENT_MODEL)
    const [maxPagesPerJob, maxPagesSource] = pick(
        stored.maxPagesPerJob,
        maxPagesEnv,
        DEFAULT_AI_DOCUMENT_MAX_PAGES
    )

    return {
        enabled,
        model,
        maxPagesPerJob,
        sources: { enabled: enabledSource, model: modelSource, maxPagesPerJob: maxPagesSource }
    }
}

let cache: { stored: StoredAiSettings; expiresAt: number } | null = null

const readStored = async (): Promise<StoredAiSettings> => {
    if (cache && cache.expiresAt > Date.now()) return cache.stored

    let stored: StoredAiSettings = {}
    try {
        const row = await prisma.platformSetting.findUnique({ where: { key: AI_SETTINGS_KEY } })
        stored = parseStoredAiSettings(row?.value)
    } catch (error) {
        // A settings read must never be the reason an upload 500s. Falling back
        // to env is exactly the behaviour that shipped before this table existed.
        console.error('[PlatformSettings] Failed to read AI settings, falling back to env:', error)
    }

    cache = { stored, expiresAt: Date.now() + CACHE_TTL_MS }
    return stored
}

export const getAiSettings = async (): Promise<ResolvedAiSettings> => resolve(await readStored())

/** What the operator has explicitly saved, without the env/default layers. */
export const getStoredAiSettings = async (): Promise<StoredAiSettings> => ({ ...(await readStored()) })

/**
 * Merges a patch into the saved settings.
 *
 * A patch, not a replacement: the form posts only the fields it owns, so a
 * future field added to the row survives an older client saving over it.
 */
export const saveAiSettings = async (
    patch: StoredAiSettings,
    updatedByUserId?: string | null
): Promise<ResolvedAiSettings> => {
    const current = await readStored()
    const next: StoredAiSettings = { ...current, ...patch }

    await prisma.platformSetting.upsert({
        where: { key: AI_SETTINGS_KEY },
        create: {
            key: AI_SETTINGS_KEY,
            value: next as object,
            updatedByUserId: updatedByUserId ?? null
        },
        update: { value: next as object, updatedByUserId: updatedByUserId ?? null }
    })

    cache = { stored: next, expiresAt: Date.now() + CACHE_TTL_MS }
    return resolve(next)
}

/** Clears every saved AI field, handing all three back to env/defaults. */
export const clearAiSettings = async (updatedByUserId?: string | null): Promise<ResolvedAiSettings> => {
    await prisma.platformSetting.upsert({
        where: { key: AI_SETTINGS_KEY },
        create: { key: AI_SETTINGS_KEY, value: {}, updatedByUserId: updatedByUserId ?? null },
        update: { value: {}, updatedByUserId: updatedByUserId ?? null }
    })
    cache = { stored: {}, expiresAt: Date.now() + CACHE_TTL_MS }
    return resolve({})
}

/** Test seam, and the escape hatch after a direct database edit. */
export const resetPlatformSettingsCache = () => {
    cache = null
}
