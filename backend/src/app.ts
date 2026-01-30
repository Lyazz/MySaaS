import express from 'express'

import { expressTenantMiddleware } from './middleware/tenant.middleware'
import { expressAuthMiddleware } from './middleware/auth.middleware'
import routes from './routes'

const app = express()

app.disable('x-powered-by')
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1)
}
app.use(express.json({ limit: '1mb' }))
app.use(expressTenantMiddleware)
app.use(expressAuthMiddleware)

app.use('/api', routes)

app.get('/api/hello', (req, res) => {
    res.json({ hello: 'world' })
})

export default app
