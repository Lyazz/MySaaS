import type { Request, Response } from 'express'

import { AuthServiceError } from './auth.errors'
import { passwordResetService } from './password-reset.service'
import { verificationService } from './verification.service'

/**
 * HTTP surface for signup verification and password reset.
 *
 * Separate from `auth.controller` because these endpoints are unauthenticated
 * and unusually easy to get wrong: nothing here may echo back whether an
 * account exists, so the error mapping is deliberately identical for every
 * outcome the service does not explicitly distinguish.
 */

const sendError = (res: Response, error: unknown, context: string) => {
    if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
            statusCode: error.statusCode,
            statusMessage: error.statusMessage,
            ...(error.code ? { code: error.code } : {}),
            ...(error.details ?? {})
        })
        return
    }

    console.error(`${context}:`, error)
    res.status(500).json({ statusCode: 500, statusMessage: 'Internal Server Error' })
}

/** Prefers the language the visitor is browsing in, over any body field. */
const resolveLocale = (req: Request): string => {
    const fromBody = typeof req.body?.locale === 'string' ? req.body.locale : ''
    if (fromBody) return fromBody

    const header = req.get('accept-language') || ''
    return header.split(',')[0] || ''
}

export class VerificationController {
    /** Which channels this deployment can actually deliver on. */
    async channels(_req: Request, res: Response) {
        try {
            res.json({ success: true, ...verificationService.getAvailableChannels() })
        } catch (error) {
            sendError(res, error, 'Verification channels error')
        }
    }

    async sendCode(req: Request, res: Response) {
        try {
            const result = await verificationService.issueCode(
                { ...(req.body ?? {}), locale: resolveLocale(req) },
                { ip: req.ip }
            )
            res.json(result)
        } catch (error) {
            sendError(res, error, 'Verification send error')
        }
    }

    async verifyCode(req: Request, res: Response) {
        try {
            const result = await verificationService.verifyCode(req.body ?? {})
            res.json(result)
        } catch (error) {
            sendError(res, error, 'Verification verify error')
        }
    }

    async forgotPassword(req: Request, res: Response) {
        try {
            const result = await passwordResetService.requestReset(
                { ...(req.body ?? {}), locale: resolveLocale(req) },
                { ip: req.ip }
            )
            res.json(result)
        } catch (error) {
            sendError(res, error, 'Password reset request error')
        }
    }

    async resetPassword(req: Request, res: Response) {
        try {
            const result = await passwordResetService.resetPassword(req.body ?? {})
            res.json(result)
        } catch (error) {
            sendError(res, error, 'Password reset error')
        }
    }
}
