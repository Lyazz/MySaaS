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
}) =>
    rateLimit({
        windowMs: input.windowMs,
        max: input.max,
        keyGenerator: getTenantAwareKey,
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
    max: 5,
    message: 'Too many registration attempts, please try again later.'
})

export const publicOrderRateLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: 'Too many order attempts, please try again later.',
    skip: (req) => req.method.toUpperCase() !== 'POST'
})
