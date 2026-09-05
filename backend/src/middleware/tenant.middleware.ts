import type { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { parseHost } from '../lib/tenant-host'

export const expressTenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const trustProxy = process.env.TRUST_PROXY === 'true'
    const host = (trustProxy ? req.get('x-forwarded-host') : null) || req.get('host') || ''
    const parsed = parseHost(host)
    if (parsed.kind === 'tenant-subdomain' || parsed.kind === 'custom-domain') {
        try {
            const tenant =
                parsed.kind === 'tenant-subdomain'
                    ? await prisma.tenant.findUnique({ where: { slug: parsed.slug } })
                    : await prisma.tenantDomain
                          .findUnique({ where: { domain: parsed.domain }, include: { tenant: true } })
                          .then((m) => m?.tenant ?? null)

            if (tenant) {
                req.tenant = tenant
                next()
            } else {
                // Allow webhooks to pass through so their controllers can handle/log the missing tenant
                if (req.path.startsWith('/api/webhooks/')) {
                    next()
                } else {
                    res.status(404).json({
                        statusCode: 404,
                        statusMessage: 'Tenant not found'
                    })
                }
            }
        } catch (error) {
            console.error('Tenant middleware error', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    } else {
        // No tenant specific request, proceed (might be main site or super admin)
        next()
    }
}
