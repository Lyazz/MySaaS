import { createError, defineEventHandler, getCookie, getRequestHeader } from 'h3'
import prisma from '../../backend/src/lib/prisma'
import { parseHost } from '../../backend/src/lib/tenant-host'
import { isDraftAllowedPath, isTenantMemberToken } from '../../backend/src/lib/draft-storefront'

const addUtcMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0))

export default defineEventHandler(async (event) => {
    const url = event.node.req.url || '/'

    // Let Express handle API routes (including "Tenant not found" JSON responses).
    if (url.startsWith('/api')) return

    // Avoid breaking Nuxt assets / images / internal routes when a tenant is missing.
    if (
        url.startsWith('/_nuxt') ||
        url.startsWith('/_ipx') ||
        url.startsWith('/_i18n') ||
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

        if (tenant.isSuspended) {
            throw createError({ statusCode: 403, statusMessage: 'Tenant is suspended' })
        }

        // A store that has never been published does not exist to the public. 404
        // rather than a "coming soon" page: nothing about the slug leaks, and
        // nothing half-built gets indexed. Its own team sees it normally, so the
        // merchant can click through the real storefront before opening it.
        let storefrontDraft = false
        if (tenant.publishedAt === null && !isDraftAllowedPath(url)) {
            if (!isTenantMemberToken(getCookie(event, 'auth_token'), tenant.id)) {
                throw createError({ statusCode: 404, statusMessage: 'Store not found' })
            }
            storefrontDraft = true
        }

        if (tenant.maintenanceMode && !url.startsWith('/admin') && !url.startsWith('/login')) {
            throw createError({ statusCode: 503, statusMessage: 'Store is under maintenance' })
        }

        const now = new Date()
        const defaultEnd = addUtcMonths(now, 1)
        const subscription = await prisma.tenantSubscription.upsert({
            where: { tenantId: tenant.id },
            create: {
                tenantId: tenant.id,
                planCode: 'basic',
                interval: 'month',
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd: defaultEnd
            },
            update: {}
        })

        const end = subscription.currentPeriodEnd ?? defaultEnd
        if (now >= end) {
            if (subscription.status !== 'PAST_DUE') {
                await prisma.tenantSubscription.update({ where: { tenantId: tenant.id }, data: { status: 'PAST_DUE' } })
            }
            throw createError({ statusCode: 402, statusMessage: 'Subscription payment required' })
        }

        event.context.tenant = tenant
        event.context.storefrontDraft = storefrontDraft

        const storeSettings = await prisma.storeSettings.upsert({
            where: { tenantId: tenant.id },
            create: { tenantId: tenant.id },
            update: {}
        })

        const clearanceTaggedCount = await prisma.product.count({ where: { tenantId: tenant.id, isClearance: true } })

        event.context.storeSettings = {
            ...storeSettings,
            loyaltyRedeemRateDzdPerPoint: storeSettings.loyaltyRedeemRateDzdPerPoint.toNumber(),
            loyaltyBasePoints: storeSettings.loyaltyBasePoints.toNumber(),
            loyaltyMarginFactor: storeSettings.loyaltyMarginFactor.toNumber(),
            // Every Decimal has to be unwrapped here: this object lands in the SSR
            // payload, and devalue refuses Prisma's Decimal class.
            defaultMarginPercent: storeSettings.defaultMarginPercent.toNumber(),
            clearanceAppliesToAllProducts: clearanceTaggedCount === 0
        }

        const contactInfos = await prisma.tenantContactInfo.findMany({
            where: { tenantId: tenant.id, isActive: true },
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
            select: { id: true, kind: true, label: true, value: true, position: true, isActive: true }
        })

        event.context.contactInfos = contactInfos

        const globalMetaPixel = await prisma.tenantMetaPixel.findFirst({
            where: { tenantId: tenant.id, isGlobal: true, isActive: true },
            orderBy: { updatedAt: 'desc' },
            select: { pixelId: true }
        })

        const pixelId = typeof globalMetaPixel?.pixelId === 'string' ? globalMetaPixel.pixelId.trim() : ''
        event.context.facebookPixelId = pixelId && /^[0-9]+$/.test(pixelId) ? pixelId : null
    }
})
