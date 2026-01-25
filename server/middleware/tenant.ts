import { createError, defineEventHandler, getRequestHeader } from 'h3'
import prisma from '../../backend/src/lib/prisma'
import { parseHost } from '../../backend/src/lib/tenant-host'

export default defineEventHandler(async (event) => {
    const url = event.node.req.url || '/'

    // Let Express handle API routes (including "Tenant not found" JSON responses).
    if (url.startsWith('/api')) return

    // Avoid breaking Nuxt assets / images / internal routes when a tenant is missing.
    if (
        url.startsWith('/_nuxt') ||
        url.startsWith('/_ipx') ||
        url.startsWith('/favicon') ||
        url.startsWith('/__nuxt_error')
    ) {
        return
    }

    // Support X-Forwarded-Host for proxies/testing
    const hostHeader = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || ''
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader
    const parsed = parseHost(host)

    if (parsed.kind === 'tenant-subdomain' || parsed.kind === 'custom-domain') {
        const tenant =
            parsed.kind === 'tenant-subdomain'
                ? await prisma.tenant.findUnique({ where: { slug: parsed.slug } })
                : await prisma.tenantDomain
                      .findUnique({ where: { domain: parsed.domain }, include: { tenant: true } })
                      .then((m) => m?.tenant ?? null)

        if (!tenant) {
            throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
        }

        event.context.tenant = tenant

        const storeSettings = await prisma.storeSettings.upsert({
            where: { tenantId: tenant.id },
            create: { tenantId: tenant.id },
            update: {}
        })

        event.context.storeSettings = storeSettings
    }
})
