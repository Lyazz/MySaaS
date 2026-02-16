import type { Request, Response, NextFunction } from 'express'
import { logAction } from '../lib/audit'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const redact = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map(redact)

    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        const lower = key.toLowerCase()
        if (
            lower.includes('password') ||
            lower === 'token' ||
            lower === 'authorization' ||
            lower === 'access_token' ||
            lower === 'refresh_token'
        ) {
            out[key] = '[REDACTED]'
            continue
        }
        out[key] = redact(v)
    }
    return out
}

export const expressAuditMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const path = req.path || ''
    const method = (req.method || 'GET').toUpperCase()

    if (!path.startsWith('/api')) return next()
    if (!MUTATION_METHODS.has(method)) return next()
    if (path === '/api/login' || path === '/api/register') return next()

    res.on('finish', () => {
        const userId = req.user?.id
        const tenantId = req.tenant?.id ?? req.user?.tenantId
        const action = `HTTP_${method} ${path}`
        const details = JSON.stringify({
            status: res.statusCode,
            query: req.query,
            body: redact(req.body)
        })

        void logAction({
            action,
            details,
            userId,
            tenantId
        })
    })

    next()
}

