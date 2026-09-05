import prisma from './prisma'
import {
    getPlanByCode,
    PLAN_ORDER,
    PRICING_PLANS,
    isPlanCode,
    type PlanCode,
    type PlanDefinition
} from '../../../shared/pricing/plans'

/**
 * Plan quotas after super-admin overrides.
 *
 * `shared/pricing/plans.ts` stays the source of truth for what a plan *is* —
 * price, name, marketing copy. This layer only lets an operator retune a numeric
 * quota without a redeploy, and a null override column means "use the code
 * value", so any override can be reverted without remembering the original.
 *
 * Enforcement (`AiDocumentsService.enforceScanQuota`) and display
 * (`BillingService`) both read through here; if they ever disagreed, a merchant
 * would watch a usage bar that never fills refuse their upload.
 */

const CACHE_TTL_MS = 30_000

export interface PlanOverrideValues {
    aiScansPerMonth: number | null
}

type OverrideMap = Partial<Record<PlanCode, PlanOverrideValues>>

let cache: { overrides: OverrideMap; expiresAt: number } | null = null

const readOverrides = async (): Promise<OverrideMap> => {
    if (cache && cache.expiresAt > Date.now()) return cache.overrides

    const map: OverrideMap = {}
    try {
        const rows = await prisma.planOverride.findMany()
        for (const row of rows) {
            if (!isPlanCode(row.planCode)) continue
            map[row.planCode] = { aiScansPerMonth: row.aiScansPerMonth }
        }
    } catch (error) {
        // Same reasoning as the settings cache: never fail a merchant's request
        // because the operator's override table was unreadable.
        console.error('[PlanLimits] Failed to read plan overrides, using code defaults:', error)
    }

    cache = { overrides: map, expiresAt: Date.now() + CACHE_TTL_MS }
    return map
}

const merge = (plan: PlanDefinition, override?: PlanOverrideValues): PlanDefinition =>
    override?.aiScansPerMonth == null ? plan : { ...plan, aiScansPerMonth: override.aiScansPerMonth }

/**
 * The plan a tenant is actually held to. Unknown codes fall back to `basic`, the
 * same way `getPlanByCode` callers already do.
 */
export const resolvePlan = async (code: string): Promise<PlanDefinition> => {
    const plan = getPlanByCode(code as PlanCode) ?? getPlanByCode('basic')!
    const overrides = await readOverrides()
    return merge(plan, overrides[plan.code])
}

/** Every plan with its overrides applied, cheapest first. */
export const resolveAllPlans = async (): Promise<PlanDefinition[]> => {
    const overrides = await readOverrides()
    return (PRICING_PLANS as readonly PlanDefinition[]).map((plan) => merge(plan, overrides[plan.code]))
}

/** The raw override rows, for the super-admin editor. */
export const listPlanOverrides = async (): Promise<
    { planCode: PlanCode; aiScansPerMonth: number | null; default: number }[]
> => {
    const overrides = await readOverrides()
    return PLAN_ORDER.map((code) => ({
        planCode: code,
        aiScansPerMonth: overrides[code]?.aiScansPerMonth ?? null,
        default: getPlanByCode(code)?.aiScansPerMonth ?? 0
    }))
}

export class PlanOverrideValidationError extends Error {
    statusCode = 400
    constructor(message: string) {
        super(message)
    }
}

/** Hard ceiling so a fat-fingered override cannot hand out unlimited API spend. */
export const MAX_AI_SCANS_PER_MONTH = 100_000

/**
 * Sets or clears one plan's override. `aiScansPerMonth: null` deletes it and
 * returns the plan to its code default.
 */
export const savePlanOverride = async (
    planCode: string,
    values: { aiScansPerMonth: number | null },
    updatedByUserId?: string | null
) => {
    if (!isPlanCode(planCode)) throw new PlanOverrideValidationError('Unknown plan')

    const scans = values.aiScansPerMonth
    if (scans !== null) {
        if (!Number.isInteger(scans) || scans < 0 || scans > MAX_AI_SCANS_PER_MONTH) {
            throw new PlanOverrideValidationError(
                `aiScansPerMonth must be a whole number between 0 and ${MAX_AI_SCANS_PER_MONTH}, or null to use the default`
            )
        }
    }

    if (scans === null) {
        await prisma.planOverride.deleteMany({ where: { planCode } })
    } else {
        await prisma.planOverride.upsert({
            where: { planCode },
            create: { planCode, aiScansPerMonth: scans, updatedByUserId: updatedByUserId ?? null },
            update: { aiScansPerMonth: scans, updatedByUserId: updatedByUserId ?? null }
        })
    }

    resetPlanLimitsCache()
    return resolvePlan(planCode)
}

/** Test seam, and the escape hatch after a direct database edit. */
export const resetPlanLimitsCache = () => {
    cache = null
}
