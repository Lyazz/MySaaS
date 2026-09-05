import { Prisma } from '@prisma/client'

import { logAction } from '../../lib/audit'
import prisma from '../../lib/prisma'
import { PhoneNormalizationService } from '../loyalty/phone-normalization.service'

/**
 * Moves an offline-only tenant onto an online tier.
 *
 * This replaces `SyncService.upgrade`, which was reachable by any staff member
 * (`requireTenantMember`), took client-supplied ids through `createMany` with
 * `skipDuplicates`, validated nothing, and flipped `Tenant.isOffline` in the
 * same breath. In other words: a free self-serve upgrade with no safety net.
 *
 * What changed:
 * - super-admin only, because the tier flip is a commercial decision;
 * - `tenantId` never comes from the client -- it comes from the route param,
 *   which came from a super-admin session;
 * - batched and resumable, so a large POS database over a poor link does not
 *   have to succeed in one request;
 * - validated before it applies, and the tier flips only on success.
 *
 * Known limitation: product-to-category links are not carried over. The device
 * sends its own local `categoryId`, which means nothing on the server, and
 * resolving it would need a slug-keyed second pass. Products land uncategorised
 * and the tenant re-files them, which is a small manual job compared with
 * silently attaching them to the wrong category.
 */

export class TenantMigrationError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly code: string
    ) {
        super(message)
        this.name = 'TenantMigrationError'
    }
}

/** Domains a device may upload, in dependency order. */
export const MIGRATION_DOMAINS = [
    'categories',
    'products',
    'customers',
    'suppliers'
] as const

export type MigrationDomain = (typeof MIGRATION_DOMAINS)[number]

type Counts = Record<string, number>

export class TenantMigrationService {
    private phoneNormalization = new PhoneNormalizationService()

    async openJob(input: {
        tenantId: string
        adminUserId: string
        deviceId?: string
        declaredCounts?: Counts
    }) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: input.tenantId },
            select: { id: true, isOffline: true }
        })

        if (!tenant) {
            throw new TenantMigrationError(404, 'Tenant not found', 'TENANT_NOT_FOUND')
        }

        const existing = await prisma.tenantMigrationJob.findFirst({
            where: { tenantId: input.tenantId, status: { in: ['DRAFT', 'UPLOADING'] } }
        })

        if (existing) return existing

        return prisma.tenantMigrationJob.create({
            data: {
                tenantId: input.tenantId,
                deviceId: input.deviceId ?? null,
                startedByUserId: input.adminUserId,
                declaredCounts: input.declaredCounts ?? undefined,
                status: 'DRAFT'
            }
        })
    }

    private async loadJob(tenantId: string, jobId: string) {
        const job = await prisma.tenantMigrationJob.findFirst({
            where: { id: jobId, tenantId }
        })

        if (!job) {
            throw new TenantMigrationError(404, 'Migration job not found', 'JOB_NOT_FOUND')
        }

        return job
    }

    /**
     * Ingests one page of one domain.
     *
     * Every row is written with the tenant id from the route, never from the
     * payload -- that is the difference between a migration and a cross-tenant
     * data leak. Upserts keyed on the tenant-scoped natural key make a repeated
     * batch harmless, which matters because the uploading device is by
     * definition on a connection bad enough to need this feature.
     */
    async ingestBatch(input: {
        tenantId: string
        jobId: string
        domain: MigrationDomain
        rows: Array<Record<string, unknown>>
    }) {
        const job = await this.loadJob(input.tenantId, input.jobId)

        if (job.status === 'APPLIED') {
            throw new TenantMigrationError(
                409,
                'This migration has already been applied',
                'JOB_ALREADY_APPLIED'
            )
        }

        if (!MIGRATION_DOMAINS.includes(input.domain)) {
            throw new TenantMigrationError(400, 'Unknown domain', 'UNKNOWN_DOMAIN')
        }

        const staged = (job.appliedCounts as Counts | null) ?? {}
        staged[input.domain] = (staged[input.domain] ?? 0) + input.rows.length

        await prisma.tenantMigrationJob.update({
            where: { id: job.id },
            data: {
                status: 'UPLOADING',
                appliedCounts: staged,
                // The rows themselves are staged in the job so `apply` runs in a
                // single transaction; streaming them straight into the live
                // tables would leave a half-migrated tenant if the link dropped.
                errors: undefined
            }
        })

        await prisma.tenantMigrationStagingRow.create({
            data: {
                jobId: job.id,
                domain: input.domain,
                payload: input.rows as Prisma.InputJsonValue
            }
        })

        return { staged }
    }

    /** Dry run: what would land, and what would collide. */
    async validate(tenantId: string, jobId: string) {
        const job = await this.loadJob(tenantId, jobId)

        const rows = await prisma.tenantMigrationStagingRow.findMany({
            where: { jobId: job.id },
            select: { domain: true, payload: true }
        })

        const counts: Counts = {}
        const problems: string[] = []

        const slugsSeen = new Set<string>()

        for (const row of rows) {
            const items = Array.isArray(row.payload) ? row.payload : []
            counts[row.domain] = (counts[row.domain] ?? 0) + items.length

            for (const item of items as Array<Record<string, unknown>>) {
                const slug = typeof item.slug === 'string' ? item.slug : null
                if (slug) {
                    if (slugsSeen.has(`${row.domain}:${slug}`)) {
                        problems.push(`Duplicate ${row.domain} slug in upload: ${slug}`)
                    }
                    slugsSeen.add(`${row.domain}:${slug}`)
                }
            }
        }

        const declared = (job.declaredCounts as Counts | null) ?? {}
        for (const [domain, expected] of Object.entries(declared)) {
            const received = counts[domain] ?? 0
            if (received !== expected) {
                problems.push(
                    `${domain}: device declared ${expected} rows, ${received} arrived`
                )
            }
        }

        await prisma.tenantMigrationJob.update({
            where: { id: job.id },
            data: {
                status: problems.length ? 'UPLOADING' : 'VALIDATED',
                errors: problems.length ? problems : Prisma.DbNull
            }
        })

        return { counts, declared, problems, ready: problems.length === 0 }
    }

    /**
     * Applies the staged data and flips the tier, in one transaction.
     *
     * If anything fails the tenant stays offline-only. Half a migration is far
     * worse than none: the shop would be on a tier it cannot use, with a
     * partially populated catalogue.
     */
    async apply(input: { tenantId: string; jobId: string; adminUserId: string }) {
        const job = await this.loadJob(input.tenantId, input.jobId)

        if (job.status === 'APPLIED') {
            throw new TenantMigrationError(
                409,
                'This migration has already been applied',
                'JOB_ALREADY_APPLIED'
            )
        }

        if (job.status !== 'VALIDATED') {
            throw new TenantMigrationError(
                409,
                'Run validation before applying',
                'JOB_NOT_VALIDATED'
            )
        }

        const applied = await prisma.$transaction(
            async (tx) => {
                const rows = await tx.tenantMigrationStagingRow.findMany({
                    where: { jobId: job.id },
                    // Dependency order: categories before the products that
                    // reference them.
                    orderBy: [{ domain: 'asc' }, { createdAt: 'asc' }],
                    select: { domain: true, payload: true }
                })

                const counts: Counts = {}

                for (const row of rows) {
                    const items = Array.isArray(row.payload)
                        ? (row.payload as Array<Record<string, unknown>>)
                        : []

                    for (const item of items) {
                        await this.upsertRow(tx, input.tenantId, row.domain, item)
                        counts[row.domain] = (counts[row.domain] ?? 0) + 1
                    }
                }

                // The tier flip happens only here, after everything landed.
                await tx.tenant.update({
                    where: { id: input.tenantId },
                    data: { isOffline: false }
                })

                return tx.tenantMigrationJob.update({
                    where: { id: job.id },
                    data: {
                        status: 'APPLIED',
                        appliedCounts: counts,
                        appliedByUserId: input.adminUserId,
                        appliedAt: new Date()
                    }
                })
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120_000 }
        )

        await logAction({
            action: 'TENANT_MIGRATED_ONLINE',
            details: JSON.stringify(applied.appliedCounts),
            userId: input.adminUserId,
            targetId: applied.id,
            tenantId: input.tenantId
        })

        return applied
    }

    /** Explicit tier set, independent of any migration. */
    async setTier(input: {
        tenantId: string
        adminUserId: string
        isOffline: boolean
    }) {
        const tenant = await prisma.tenant.update({
            where: { id: input.tenantId },
            data: { isOffline: input.isOffline }
        })

        await logAction({
            action: 'TENANT_TIER_CHANGED',
            details: input.isOffline ? 'Set to offline-only' : 'Set to online',
            userId: input.adminUserId,
            targetId: tenant.id,
            tenantId: tenant.id
        })

        return tenant
    }

    private async upsertRow(
        tx: Prisma.TransactionClient,
        tenantId: string,
        domain: string,
        item: Record<string, unknown>
    ) {
        const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

        switch (domain) {
            case 'categories': {
                // The column is `title`; accept `name` too, since that is what
                // the local POS schema calls it.
                const title = str(item.title) || str(item.name)
                if (!title) return
                const slug = str(item.slug) || title.toLowerCase().replace(/\s+/g, '-')
                await tx.category.upsert({
                    // Scoped by the route's tenant, never the payload's.
                    where: { tenantId_slug: { tenantId, slug } },
                    create: { tenantId, title, slug },
                    update: { title }
                })
                return
            }
            case 'customers': {
                const name = str(item.name) || str(item.fullName)
                const phone = str(item.phone)
                // Both columns are NOT NULL, and phoneNormalized is what
                // dedupes customers across the platform.
                if (!name || !phone) return

                const normalized =
                    this.phoneNormalization.tryNormalizeAlgerianPhone(phone)?.normalized ??
                    phone

                const existing = await tx.customer.findFirst({
                    where: { tenantId, phoneNormalized: normalized },
                    select: { id: true }
                })
                if (existing) return

                await tx.customer.create({
                    data: {
                        tenantId,
                        name,
                        phone,
                        phoneNormalized: normalized,
                        phoneRaw: phone
                    }
                })
                return
            }
            case 'suppliers': {
                const name = str(item.name)
                if (!name) return

                const existing = await tx.supplier.findFirst({
                    where: { tenantId, name },
                    select: { id: true }
                })
                if (existing) return

                await tx.supplier.create({
                    data: { tenantId, name, phone: str(item.phone) || null }
                })
                return
            }
            case 'products': {
                const title = str(item.title) || str(item.name)
                if (!title) return
                const slug = str(item.slug) || title.toLowerCase().replace(/\s+/g, '-')
                const price = Number(item.price) || 0
                const stock = Number.isFinite(Number(item.stock)) ? Number(item.stock) : 0

                await tx.product.upsert({
                    where: { tenantId_slug: { tenantId, slug } },
                    create: { tenantId, title, slug, price, stock },
                    update: { title, price, stock }
                })
                return
            }
            default:
                return
        }
    }
}
