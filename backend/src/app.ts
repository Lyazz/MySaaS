import express from 'express'

import { expressTenantMiddleware } from './middleware/tenant.middleware'
import { expressAuthMiddleware } from './middleware/auth.middleware'
import routes from './routes'

const app = express()

app.use(express.json())
app.use(expressTenantMiddleware)
app.use(expressAuthMiddleware)

app.use('/api', routes)

app.get('/api/hello', (req, res) => {
    res.json({ hello: 'world' })
})

export default app
