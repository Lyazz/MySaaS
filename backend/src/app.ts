import express from 'express'
import helmet from 'helmet'

import { expressTenantMiddleware } from './middleware/tenant.middleware'
import { expressAuthMiddleware } from './middleware/auth.middleware'
import { expressTenantFromUserMiddleware } from './middleware/tenant-from-user.middleware'
import { expressIdempotencyMiddleware } from './middleware/idempotency.middleware'
import { expressAuditMiddleware } from './middleware/audit.middleware'
import { expressSubscriptionMiddleware } from './middleware/subscription.middleware'
import {
    activationRateLimiter,
    apiRateLimiter,
    loginRateLimiter,
    publicOrderRateLimiter,
    registerRateLimiter
} from './middleware/rate-limit.middleware'
import { assertRequiredEnv } from './lib/env-check'
import routes from './routes'

// Fail at boot, not on the first request that happens to need a secret.
assertRequiredEnv()

const app = express()
const isProduction = process.env.NODE_ENV === 'production'

app.disable('x-powered-by')
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1)
}

app.use(
    helmet({
        contentSecurityPolicy: false,
        frameguard: { action: 'deny' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        hsts: isProduction
            ? {
                  maxAge: 15_552_000,
                  includeSubDomains: true,
                  preload: true
              }
            : false
    })
)

app.use('/api/webhooks/maystro', express.text({ type: '*/*', limit: '1mb' }))

app.use(
    express.json({
        limit: '1mb',
        verify: (req, _res, buf) => {
            (req as express.Request).rawBody = Buffer.from(buf)
        }
    })
)

// SEO safety: prevent indexing/snippetting of API responses (including auth/admin endpoints).
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
        res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
    }

    // Sensitive endpoints should never be cached by browsers/proxies.
    if (
        req.path.startsWith('/api/admin') ||
        req.path.startsWith('/api/super-admin') ||
        req.path === '/api/login' ||
        req.path === '/api/register'
    ) {
        res.setHeader('Cache-Control', 'no-store')
    }

    next()
})

app.use(expressTenantMiddleware)
app.use('/api', apiRateLimiter)
app.use('/api/login', loginRateLimiter)
app.use('/api/register', registerRateLimiter)
app.use('/api/orders', publicOrderRateLimiter)
app.use('/api/activation', activationRateLimiter)
app.use(expressAuthMiddleware)
app.use(expressTenantFromUserMiddleware)
app.use(expressAuditMiddleware)
app.use(expressSubscriptionMiddleware)

// After tenant + auth resolution, so the key is scoped to a trusted tenant,
// and after audit/subscription so a replayed response is still logged and
// still counted the way the original was.
app.use('/api/admin', expressIdempotencyMiddleware)

app.use('/api', routes)

app.get('/api/hello', (req, res) => {
    res.json({ hello: 'world' })
})

export default app
