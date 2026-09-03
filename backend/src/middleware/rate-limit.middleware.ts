import type { Request } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const getTenantAwareKey = (req: Request): string => {
    const tenantKey = req.tenant?.id ?? `host:${(req.get('host') || 'saas').toLowerCase()}`
    const ipKey = ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown')
    return `${tenantKey}:${ipKey}`
}

const to429Response = (message: string) => ({
    statusCode: 429,
    statusMessage: message
})

const createLimiter = (input: {
    windowMs: number
    max: number
    message: string
    skip?: (req: Request) => boolean
    keyGenerator?: (req: Request) => string
}) =>
    rateLimit({
        windowMs: input.windowMs,
        max: input.max,
        keyGenerator: input.keyGenerator ?? getTenantAwareKey,
        skip: input.skip,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => {
            res.status(429).json(to429Response(input.message))
        }
    })

export const apiRateLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 10_000 : 1_000,
    message: 'Too many API requests, please try again later.'
})

export const loginRateLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts, please try again later.'
})

export const registerRateLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    // Relaxed under test for the same reason as `apiRateLimiter`: every suite
    // that registers a tenant shares one bucket keyed by host+IP, so a handful
    // of registration-heavy files silently starve every later one. Nothing
    // asserts this limiter's behaviour, unlike the login one just above.
    max: process.env.NODE_ENV === 'test' ? 10_000 : 5,
    message: 'Too many registration attempts, please try again later.'
})

/**
 * Guards the one-time-code endpoints.
 *
 * `VerificationService` already caps sends per destination, which is what stops
 * one phone being billed a hundred SMS. This is the other half: one IP walking
 * a list of *different* addresses, which the per-destination limit never sees.
 * Verify attempts share the bucket because a code is only six digits — the
 * per-code attempt counter burns at five, but nothing stops an attacker asking
 * for a fresh code and trying five more.
 */
export const verificationRateLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 10_000 : 20,
    message: 'Too many verification requests, please try again later.',
    // GET /auth/otp/channels is a page-load read with nothing to abuse, and
    // counting it would spend the budget the actual sends need.
    skip: (req) => req.method.toUpperCase() !== 'POST'
})

export const publicOrderRateLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: 'Too many order attempts, please try again later.',
    skip: (req) => req.method.toUpperCase() !== 'POST'
})

/**
 * Keyed by hardware id rather than tenant+IP.
 *
 * Activation is largely unauthenticated by design -- a device claiming its first
 * seat has no session yet -- so the natural abuse shape here is one attacker
 * cycling licence keys or hardware ids, not one tenant being noisy. Several
 * genuine devices can also share a shop's single NAT address, and rate-limiting
 * them together would punish the honest case.
 *
 * The ceiling is generous: a device in the locked state heartbeats every 15
 * minutes, and a retry backoff can add a few more.
 */
export const activationRateLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 10_000 : 60,
    message: 'Too many activation attempts, please try again later.',
    keyGenerator: (req) => {
        const hardwareId =
            typeof req.body?.hardwareId === 'string' ? req.body.hardwareId.trim() : ''
        return hardwareId ? `hw:${hardwareId}` : getTenantAwareKey(req)
    }
})
