import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import type { VerificationChannel, VerificationCode, VerificationPurpose } from '@prisma/client'

import prisma from '../../lib/prisma'
import { messagingService } from '../messaging/messaging.service'
import { normalizeLocale, type MessageChannel, type MessageLocale } from '../messaging/messaging.types'
import { PhoneNormalizationService } from '../loyalty/phone-normalization.service'
import { AuthServiceError } from './auth.errors'

/**
 * One-time codes for signup and password reset, over whichever channel the
 * visitor picked.
 *
 * Three properties this file exists to hold on to:
 *
 * 1. The code is never stored. `codeHash` is an HMAC keyed by a server-side
 *    secret, so a dump of `VerificationCode` yields nothing invertible — six
 *    digits are a rainbow table you can build in a second.
 * 2. Verifying returns a *token*, not a boolean. `/register` and the password
 *    reset accept the token, so the six digits cannot be replayed after the
 *    step they belong to, and a reset stays pinned to the user resolved at send
 *    time rather than to whatever email the final request happens to carry.
 * 3. Password reset never reveals whether an account exists. An unknown
 *    destination takes the same path and returns the same body as a known one;
 *    it simply sends nothing.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CODE_LENGTH = 6
export const CODE_TTL_MINUTES = 10
/** How long the post-verification token stays spendable. */
const TOKEN_TTL_MINUTES = 15
/** Wrong guesses before the code is burned. */
const MAX_ATTEMPTS = 5
/** Minimum gap between two sends to the same destination. */
const RESEND_COOLDOWN_SECONDS = 60
const MAX_SENDS_PER_WINDOW = 5
const SEND_WINDOW_MINUTES = 60

const PURPOSES: VerificationPurpose[] = ['REGISTRATION', 'PASSWORD_RESET']
const CHANNELS: VerificationChannel[] = ['EMAIL', 'SMS', 'WHATSAPP']

export type IssueCodeInput = {
    purpose?: unknown
    channel?: unknown
    email?: unknown
    phone?: unknown
    locale?: unknown
}

export type VerifyCodeInput = {
    purpose?: unknown
    channel?: unknown
    email?: unknown
    phone?: unknown
    code?: unknown
}

/**
 * The secret the code HMAC is keyed with.
 *
 * Falls back to `JWT_SECRET`, which `assertRequiredEnv` already refuses to boot
 * without, so there is no path where this silently degrades to a constant.
 */
const otpSecret = () => (process.env.OTP_SECRET || '').trim() || (process.env.JWT_SECRET || '')

const hmac = (value: string) => createHmac('sha256', otpSecret()).update(value).digest('hex')

/** Compares two hex digests without leaking where they diverge. */
const hashesMatch = (left: string, right: string) => {
    const a = Buffer.from(left, 'utf8')
    const b = Buffer.from(right, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
}

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000)

/**
 * Echoes the code back in the send response.
 *
 * For the Playwright suite, which has to complete a real signup and has no
 * inbox, and for a developer poking at the flow with curl. Double-gated: the
 * opt-in variable *and* a non-production NODE_ENV, because a deployment that
 * set this by accident would be handing out every password-reset code to
 * anyone who can ask for one.
 */
const isDevEchoEnabled = () =>
    process.env.OTP_DEV_ECHO === 'true' && process.env.NODE_ENV !== 'production'

export class VerificationService {
    private phones = new PhoneNormalizationService()

    private parsePurpose(value: unknown): VerificationPurpose {
        const raw = typeof value === 'string' ? value.trim().toUpperCase() : ''
        if (!(PURPOSES as string[]).includes(raw)) {
            throw new AuthServiceError(400, 'Unknown verification purpose', 'INVALID_PURPOSE')
        }
        return raw as VerificationPurpose
    }

    private parseChannel(value: unknown): VerificationChannel {
        const raw = typeof value === 'string' ? value.trim().toUpperCase() : ''
        if (!(CHANNELS as string[]).includes(raw)) {
            throw new AuthServiceError(400, 'Unknown verification channel', 'INVALID_CHANNEL')
        }
        return raw as VerificationChannel
    }

    /**
     * Normalizes what the code will be sent to.
     *
     * EMAIL takes the address, SMS and WHATSAPP take the phone — the same
     * number reaches both, so a visitor who mistypes on one channel gets the
     * same rejection on the other rather than a code that never arrives.
     */
    private resolveDestination(channel: VerificationChannel, input: { email?: unknown; phone?: unknown }) {
        if (channel === 'EMAIL') {
            const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
            if (!email || !EMAIL_REGEX.test(email)) {
                throw new AuthServiceError(400, 'Enter a valid email address', 'INVALID_EMAIL')
            }
            return email
        }

        const phone = this.phones.tryNormalizeAlgerianPhone(input.phone)
        if (!phone) {
            throw new AuthServiceError(400, 'Enter a valid Algerian phone number', 'INVALID_PHONE')
        }
        return phone.normalized
    }

    /** What the signup and reset screens are allowed to show. */
    getAvailableChannels() {
        return {
            channels: messagingService.getAvailableChannels(),
            codeLength: CODE_LENGTH,
            expiresInMinutes: CODE_TTL_MINUTES,
            resendAfterSeconds: RESEND_COOLDOWN_SECONDS
        }
    }

    /**
     * Refuses a send that is too soon, or too many.
     *
     * Both limits are per destination and live in the table rather than in the
     * express limiter, because the abuse worth stopping here is one number
     * being pounded from many addresses — an SMS bill, not a busy IP.
     */
    private async assertSendAllowed(purpose: VerificationPurpose, destination: string) {
        const windowStart = new Date(Date.now() - SEND_WINDOW_MINUTES * 60_000)

        const [latest, sentInWindow] = await Promise.all([
            prisma.verificationCode.findFirst({
                where: { purpose, destination },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
            }),
            prisma.verificationCode.count({
                where: { purpose, destination, createdAt: { gte: windowStart } }
            })
        ])

        if (latest) {
            const elapsedSeconds = Math.floor((Date.now() - latest.createdAt.getTime()) / 1000)
            if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
                throw new AuthServiceError(
                    429,
                    'Please wait before requesting another code',
                    'RESEND_TOO_SOON',
                    { retryAfterSeconds: RESEND_COOLDOWN_SECONDS - elapsedSeconds }
                )
            }
        }

        if (sentInWindow >= MAX_SENDS_PER_WINDOW) {
            throw new AuthServiceError(
                429,
                'Too many codes requested. Try again later.',
                'RESEND_LIMIT_REACHED',
                { retryAfterSeconds: SEND_WINDOW_MINUTES * 60 }
            )
        }
    }

    /**
     * The account a reset belongs to, or null.
     *
     * Mirrors `AuthService.login`: an email or phone that exists on more than
     * one tenant is ambiguous from the SaaS domain, and guessing would hand the
     * reset to the wrong shop. Ambiguity resolves to "no account", which is
     * also what keeps the response identical for an address that does not
     * exist at all.
     */
    private async findResetTarget(channel: VerificationChannel, destination: string) {
        const where =
            channel === 'EMAIL'
                ? { email: { equals: destination, mode: 'insensitive' as const }, isActive: true }
                : { phone: destination, isActive: true }

        const matches = await prisma.user.findMany({
            where,
            select: { id: true, tenantId: true, email: true },
            orderBy: { createdAt: 'desc' },
            take: 2
        })

        return matches.length === 1 ? matches[0] : null
    }

    /**
     * Issues and delivers a code.
     *
     * The row is written before the send so a delivery that succeeds but whose
     * response is lost still leaves a usable code; a hard delivery failure
     * expires the row on the way out so it does not eat the destination's
     * resend budget.
     */
    async issueCode(input: IssueCodeInput, meta?: { ip?: string }) {
        const purpose = this.parsePurpose(input.purpose)
        const channel = this.parseChannel(input.channel)
        const destination = this.resolveDestination(channel, input)
        const locale = normalizeLocale(input.locale)

        if (!messagingService.isChannelAvailable(channel as MessageChannel)) {
            throw new AuthServiceError(
                503,
                'This delivery channel is not available right now',
                'CHANNEL_UNAVAILABLE',
                { channel }
            )
        }

        await this.assertSendAllowed(purpose, destination)

        const target = purpose === 'PASSWORD_RESET' ? await this.findResetTarget(channel, destination) : null

        // No account behind this address. The row is still written, and only
        // the send is skipped: without it the resend cooldown would fire for a
        // real address and not for a made-up one, which is the account
        // enumeration this flow exists to avoid. A code nobody was sent cannot
        // be guessed, and `resetPassword` refuses a row with no `userId`.
        const deliver = purpose !== 'PASSWORD_RESET' || Boolean(target)

        // Any code still outstanding for this destination is dead the moment a
        // new one goes out — otherwise five requests mean five live codes.
        await prisma.verificationCode.updateMany({
            where: { purpose, destination, consumedAt: null, expiresAt: { gt: new Date() } },
            data: { expiresAt: new Date() }
        })

        const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')

        const record = await prisma.verificationCode.create({
            data: {
                purpose,
                channel,
                destination,
                codeHash: hmac(code),
                expiresAt: minutesFromNow(CODE_TTL_MINUTES),
                userId: target?.id ?? null,
                tenantId: target?.tenantId ?? null,
                requestIp: meta?.ip ?? null,
                locale
            }
        })

        if (!deliver) {
            return this.sentResponse(channel, destination, null)
        }

        const result = await messagingService.sendOtp({
            channel: channel as MessageChannel,
            destination,
            code,
            purpose,
            locale: locale as MessageLocale,
            ttlMinutes: CODE_TTL_MINUTES
        })

        if (!result.success) {
            await prisma.verificationCode.update({
                where: { id: record.id },
                data: { expiresAt: new Date() }
            })

            console.error(
                `[verification] ${channel} send failed via ${result.provider}: ${result.error ?? 'unknown error'}`
            )

            throw new AuthServiceError(
                502,
                'The code could not be sent. Try another channel.',
                'DELIVERY_FAILED',
                { channel, retryable: Boolean(result.retryable) }
            )
        }

        return this.sentResponse(channel, destination, code)
    }

    /**
     * What the client is told after a send.
     *
     * The destination comes back masked so the UI can show "code sent to
     * m•••@gmail.com" without the API ever echoing an address a prober did not
     * already have in full.
     */
    private sentResponse(channel: VerificationChannel, destination: string, code: string | null) {
        return {
            success: true,
            channel,
            maskedDestination: maskDestination(channel, destination),
            expiresInMinutes: CODE_TTL_MINUTES,
            resendAfterSeconds: RESEND_COOLDOWN_SECONDS,
            ...(code && isDevEchoEnabled() ? { devCode: code } : {})
        }
    }

    /**
     * Checks a code and, on success, mints the single-use token that the next
     * step actually spends.
     */
    async verifyCode(input: VerifyCodeInput) {
        const purpose = this.parsePurpose(input.purpose)
        const channel = this.parseChannel(input.channel)
        const destination = this.resolveDestination(channel, input)
        const code = typeof input.code === 'string' ? input.code.replace(/\D/g, '') : ''

        if (code.length !== CODE_LENGTH) {
            throw new AuthServiceError(400, 'Enter the code you received', 'INVALID_CODE')
        }

        const record = await prisma.verificationCode.findFirst({
            where: {
                purpose,
                destination,
                consumedAt: null,
                verifiedAt: null,
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        })

        if (!record) {
            throw new AuthServiceError(400, 'This code has expired. Request a new one.', 'CODE_EXPIRED')
        }

        if (record.attempts >= MAX_ATTEMPTS) {
            throw new AuthServiceError(429, 'Too many attempts. Request a new code.', 'TOO_MANY_ATTEMPTS')
        }

        if (!hashesMatch(record.codeHash, hmac(code))) {
            const updated = await prisma.verificationCode.update({
                where: { id: record.id },
                data: { attempts: { increment: 1 } },
                select: { attempts: true }
            })

            // Burn the row on the last miss rather than leaving it to expire:
            // a code that has been guessed at five times is not one to keep
            // accepting for the rest of its ten minutes.
            if (updated.attempts >= MAX_ATTEMPTS) {
                await prisma.verificationCode.update({
                    where: { id: record.id },
                    data: { expiresAt: new Date() }
                })

                throw new AuthServiceError(429, 'Too many attempts. Request a new code.', 'TOO_MANY_ATTEMPTS')
            }

            throw new AuthServiceError(400, 'Incorrect code', 'INVALID_CODE', {
                attemptsRemaining: MAX_ATTEMPTS - updated.attempts
            })
        }

        const token = randomVerificationToken()
        const expiresAt = minutesFromNow(TOKEN_TTL_MINUTES)

        await prisma.verificationCode.update({
            where: { id: record.id },
            data: { verifiedAt: new Date(), tokenHash: hmac(token), expiresAt }
        })

        return {
            success: true,
            verificationToken: token,
            channel,
            destination,
            expiresAt: expiresAt.toISOString()
        }
    }

    /**
     * Spends a verification token, exactly once.
     *
     * The `updateMany` guarded on `consumedAt: null` is the whole point: two
     * requests racing the same token — a double-clicked submit — see one write
     * land and the other match zero rows.
     */
    async consumeToken(input: {
        token: unknown
        purpose: VerificationPurpose
    }): Promise<VerificationCode> {
        const token = typeof input.token === 'string' ? input.token.trim() : ''

        if (!token) {
            throw new AuthServiceError(400, 'Verification is required', 'VERIFICATION_REQUIRED')
        }

        const record = await prisma.verificationCode.findFirst({
            where: {
                purpose: input.purpose,
                tokenHash: hmac(token),
                consumedAt: null,
                verifiedAt: { not: null },
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        })

        if (!record) {
            throw new AuthServiceError(
                400,
                'Your verification has expired. Start again.',
                'VERIFICATION_EXPIRED'
            )
        }

        const claimed = await prisma.verificationCode.updateMany({
            where: { id: record.id, consumedAt: null },
            data: { consumedAt: new Date() }
        })

        if (claimed.count !== 1) {
            throw new AuthServiceError(
                400,
                'Your verification has expired. Start again.',
                'VERIFICATION_EXPIRED'
            )
        }

        return record
    }
}

// 32 bytes of hex. Long enough that guessing it is not a strategy, short enough
// to survive a round trip through a JSON body and a Vue ref.
const randomVerificationToken = () => randomBytes(32).toString('hex')

/** `m•••@gmail.com`, `+213 •• •• •• 36` — enough to recognise, not to learn. */
export const maskDestination = (channel: VerificationChannel, destination: string): string => {
    if (channel === 'EMAIL') {
        const [local, domain] = destination.split('@')
        if (!domain) return destination
        const head = local.slice(0, 1)
        return `${head}${'•'.repeat(Math.max(local.length - 1, 1))}@${domain}`
    }

    const tail = destination.slice(-2)
    return `+${destination.slice(0, 3)} ${'•'.repeat(Math.max(destination.length - 5, 1))}${tail}`
}

export const verificationService = new VerificationService()
