import express from 'express'

import { expressTenantMiddleware } from './middleware/tenant.middleware'
import { expressAuthMiddleware } from './middleware/auth.middleware'
import { expressSubscriptionMiddleware } from './middleware/subscription.middleware'
import routes from './routes'

const app = express()

app.disable('x-powered-by')
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1)
}
app.use(express.json({ limit: '1mb' }))

// SEO safety: prevent indexing/snippetting of API responses (including auth/admin endpoints).
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
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
app.use(expressAuthMiddleware)
app.use(expressSubscriptionMiddleware)

app.use('/api', routes)

app.get('/api/hello', (req, res) => {
    res.json({ hello: 'world' })
})

export default app
