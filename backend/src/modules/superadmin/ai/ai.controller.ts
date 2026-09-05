import type { Request, Response } from 'express'
import { logAction } from '../../../lib/audit'
import { PlatformSettingValidationError } from '../../../lib/platform-settings'
import { PlanOverrideValidationError } from '../../../lib/plan-limits'
import { SuperAdminAiService } from './ai.service'

const service = new SuperAdminAiService()

const fail = (res: Response, error: unknown, context: string) => {
    if (error instanceof PlatformSettingValidationError || error instanceof PlanOverrideValidationError) {
        return res.status(400).json({ statusCode: 400, statusMessage: error.message })
    }
    console.error(`${context}:`, error)
    return res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
}

/** Compact enough to read in the audit log, complete enough to reconstruct a change. */
const describeChange = (before: object, after: object) =>
    JSON.stringify({ before, after })

export class SuperAdminAiController {
    async overview(_req: Request, res: Response) {
        try {
            res.json(await service.getOverview())
        } catch (error) {
            fail(res, error, 'Super admin AI overview')
        }
    }

    async updateSettings(req: Request, res: Response) {
        try {
            const { patch, before, settings } = await service.updateSettings(req.body, req.user?.id)

            await logAction({
                action: 'SUPERADMIN_AI_SETTINGS_UPDATED',
                userId: req.user?.id,
                details: describeChange(before, { ...before, ...patch })
            })

            res.json({ settings })
        } catch (error) {
            fail(res, error, 'Super admin AI settings update')
        }
    }

    async resetSettings(req: Request, res: Response) {
        try {
            const { before, settings } = await service.resetSettings(req.user?.id)

            await logAction({
                action: 'SUPERADMIN_AI_SETTINGS_RESET',
                userId: req.user?.id,
                details: describeChange(before, {})
            })

            res.json({ settings })
        } catch (error) {
            fail(res, error, 'Super admin AI settings reset')
        }
    }

    async planOverrides(_req: Request, res: Response) {
        try {
            res.json({ plans: await service.listPlanOverrides() })
        } catch (error) {
            fail(res, error, 'Super admin AI plan overrides')
        }
    }

    async updatePlanOverride(req: Request, res: Response) {
        try {
            const planCode = req.params.planCode
            if (!planCode || Array.isArray(planCode)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Plan code required' })
            }

            const raw = (req.body ?? {}).aiScansPerMonth
            // Explicit null (or an empty field from the form) clears the override.
            const value = raw === null || raw === undefined || raw === '' ? null : Number(raw)

            const plan = await service.updatePlanOverride(planCode, value, req.user?.id)

            await logAction({
                action: 'SUPERADMIN_AI_PLAN_QUOTA_UPDATED',
                userId: req.user?.id,
                targetId: planCode,
                details: JSON.stringify({ planCode, aiScansPerMonth: value })
            })

            res.json({ plan, plans: await service.listPlanOverrides() })
        } catch (error) {
            fail(res, error, 'Super admin AI plan override update')
        }
    }

    async usage(req: Request, res: Response) {
        try {
            const month = typeof req.query.month === 'string' ? req.query.month : null
            res.json(await service.getUsage(month))
        } catch (error) {
            fail(res, error, 'Super admin AI usage')
        }
    }
}
