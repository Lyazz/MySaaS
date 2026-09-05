import prisma from '../../../lib/prisma'
import { hasAnthropicKey } from '../../../lib/anthropic'
import {
    AI_SETTINGS_KEY,
    getAiSettings,
    getStoredAiSettings,
    saveAiSettings,
    clearAiSettings,
    validateAiSettingsPatch,
    MAX_AI_DOCUMENT_MAX_PAGES,
    type ResolvedAiSettings,
    type StoredAiSettings
} from '../../../lib/platform-settings'
import { listPlanOverrides, savePlanOverride, MAX_AI_SCANS_PER_MONTH } from '../../../lib/plan-limits'
import { AI_DOCUMENT_MODELS } from '../../../../../shared/ai/models'

/**
 * Everything the super-admin AI screen reads and writes.
 *
 * The one place in the codebase that queries `AiDocumentJob` across tenants. It
 * is reachable only behind `requireSuperAdmin`, and it aggregates — no document
 * contents, no extraction payloads, no draft lines ever leave a tenant here.
 */

export interface AiOverview {
    settings: ResolvedAiSettings
    stored: StoredAiSettings
    /** Whether the deployment carries ANTHROPIC_API_KEY. Read-only, env-owned. */
    apiKeyConfigured: boolean
    models: typeof AI_DOCUMENT_MODELS
    limits: { maxPagesPerJob: number; aiScansPerMonth: number }
    updatedAt: string | null
    updatedByUserId: string | null
}

export interface AiUsageRow {
    tenantId: string
    tenantName: string | null
    jobs: number
    pages: number
    inputTokens: number
    outputTokens: number
}

export interface AiUsageReport {
    month: string
    periodStart: string
    periodEnd: string
    totals: { jobs: number; pages: number; inputTokens: number; outputTokens: number; failed: number }
    byModel: { model: string; jobs: number; inputTokens: number; outputTokens: number }[]
    byTenant: AiUsageRow[]
}

/** `YYYY-MM` in UTC, so the report does not shift with the operator's timezone. */
export const parseMonth = (value?: string | null): { month: string; start: Date; end: Date } => {
    const now = new Date()
    const fallback = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    const raw = typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) ? value : fallback

    const [year, month] = raw.split('-').map(Number)
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 1))
    return { month: raw, start, end }
}

export class SuperAdminAiService {
    async getOverview(): Promise<AiOverview> {
        const [settings, stored, row] = await Promise.all([
            getAiSettings(),
            getStoredAiSettings(),
            prisma.platformSetting.findUnique({ where: { key: AI_SETTINGS_KEY } })
        ])

        return {
            settings,
            stored,
            apiKeyConfigured: hasAnthropicKey(),
            models: AI_DOCUMENT_MODELS,
            limits: {
                maxPagesPerJob: MAX_AI_DOCUMENT_MAX_PAGES,
                aiScansPerMonth: MAX_AI_SCANS_PER_MONTH
            },
            updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
            updatedByUserId: row?.updatedByUserId ?? null
        }
    }

    /** Returns the patch that was applied alongside the new state, for the audit line. */
    async updateSettings(input: unknown, userId?: string | null) {
        const patch = validateAiSettingsPatch(input)
        const before = await getStoredAiSettings()
        const settings = await saveAiSettings(patch, userId)
        return { patch, before, settings }
    }

    async resetSettings(userId?: string | null) {
        const before = await getStoredAiSettings()
        const settings = await clearAiSettings(userId)
        return { before, settings }
    }

    listPlanOverrides() {
        return listPlanOverrides()
    }

    async updatePlanOverride(planCode: string, aiScansPerMonth: number | null, userId?: string | null) {
        return savePlanOverride(planCode, { aiScansPerMonth }, userId)
    }

    /**
     * Usage for one calendar month.
     *
     * Failed jobs are counted separately: they still cost tokens, so hiding them
     * would understate the platform's bill.
     */
    async getUsage(monthInput?: string | null): Promise<AiUsageReport> {
        const { month, start, end } = parseMonth(monthInput)
        const window = { createdAt: { gte: start, lt: end } }

        const [byTenantRaw, byModelRaw, totals, failed] = await Promise.all([
            prisma.aiDocumentJob.groupBy({
                by: ['tenantId'],
                where: window,
                _count: { _all: true },
                _sum: { pageCount: true, inputTokens: true, outputTokens: true }
            }),
            prisma.aiDocumentJob.groupBy({
                by: ['model'],
                where: window,
                _count: { _all: true },
                _sum: { inputTokens: true, outputTokens: true }
            }),
            prisma.aiDocumentJob.aggregate({
                where: window,
                _count: { _all: true },
                _sum: { pageCount: true, inputTokens: true, outputTokens: true }
            }),
            prisma.aiDocumentJob.count({ where: { ...window, status: 'FAILED' } })
        ])

        const tenantIds = byTenantRaw.map((r: { tenantId: string }) => r.tenantId)
        const tenants = tenantIds.length
            ? await prisma.tenant.findMany({
                  where: { id: { in: tenantIds } },
                  select: { id: true, name: true }
              })
            : []
        const nameById = new Map(tenants.map((t: { id: string; name: string | null }) => [t.id, t.name]))

        const byTenant: AiUsageRow[] = byTenantRaw
            .map((r: any) => ({
                tenantId: r.tenantId,
                tenantName: nameById.get(r.tenantId) ?? null,
                jobs: r._count._all,
                pages: r._sum.pageCount ?? 0,
                inputTokens: r._sum.inputTokens ?? 0,
                outputTokens: r._sum.outputTokens ?? 0
            }))
            .sort((a, b) => b.pages - a.pages)

        const byModel = byModelRaw
            .map((r: any) => ({
                model: r.model ?? 'unknown',
                jobs: r._count._all,
                inputTokens: r._sum.inputTokens ?? 0,
                outputTokens: r._sum.outputTokens ?? 0
            }))
            .sort((a: { jobs: number }, b: { jobs: number }) => b.jobs - a.jobs)

        return {
            month,
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            totals: {
                jobs: totals._count._all,
                pages: totals._sum.pageCount ?? 0,
                inputTokens: totals._sum.inputTokens ?? 0,
                outputTokens: totals._sum.outputTokens ?? 0,
                failed
            },
            byModel,
            byTenant
        }
    }
}
