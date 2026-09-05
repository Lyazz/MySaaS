import bcrypt from 'bcryptjs'

import prisma from '../../lib/prisma'
import { AuthServiceError } from './auth.errors'
import { verificationService, type IssueCodeInput } from './verification.service'

/**
 * "Mot de passe oublié", over any of the three channels.
 *
 * The flow is three calls, and the middle one is shared with signup:
 *
 *   POST /api/auth/password/forgot  → a code goes to the chosen channel
 *   POST /api/auth/otp/verify       → the code buys a single-use token
 *   POST /api/auth/password/reset   → the token buys a new password
 *
 * The token, not the email in the final request body, is what names the
 * account. `VerificationCode.userId` was resolved when the code was *sent*, so
 * someone who intercepts the last request cannot repoint a legitimately
 * verified reset at a different user.
 */

const MIN_PASSWORD_LENGTH = 8

export type ResetPasswordInput = {
    verificationToken?: unknown
    password?: unknown
}

export class PasswordResetService {
    /**
     * Starts a reset. Always reports success — see `VerificationService`, which
     * answers identically for an address with no account behind it.
     */
    async requestReset(input: IssueCodeInput, meta?: { ip?: string }) {
        return verificationService.issueCode({ ...input, purpose: 'PASSWORD_RESET' }, meta)
    }

    async resetPassword(input: ResetPasswordInput) {
        const password = typeof input.password === 'string' ? input.password : ''

        if (password.length < MIN_PASSWORD_LENGTH) {
            throw new AuthServiceError(
                400,
                `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
                'PASSWORD_TOO_SHORT'
            )
        }

        const record = await verificationService.consumeToken({
            token: input.verificationToken,
            purpose: 'PASSWORD_RESET'
        })

        // A reset code is only ever issued against a resolved account, so a row
        // without one is a bug, not a user error. Fail rather than guess.
        if (!record.userId || !record.tenantId) {
            throw new AuthServiceError(
                400,
                'Your verification has expired. Start again.',
                'VERIFICATION_EXPIRED'
            )
        }

        const passwordHash = await bcrypt.hash(password, 10)
        const now = new Date()

        const updated = await prisma.user.updateMany({
            where: { id: record.userId, tenantId: record.tenantId, isActive: true },
            data: {
                passwordHash,
                // Every session the old password opened dies here. If the reset
                // is the user reacting to a compromise, leaving the attacker's
                // existing token alive would defeat the point.
                tokenInvalidBefore: now,
                // The code proved control of this destination, so record it.
                ...(record.channel === 'EMAIL' ? { emailVerifiedAt: now } : { phoneVerifiedAt: now })
            }
        })

        if (updated.count !== 1) {
            throw new AuthServiceError(404, 'Account not found', 'ACCOUNT_NOT_FOUND')
        }

        return { success: true }
    }
}

export const passwordResetService = new PasswordResetService()
