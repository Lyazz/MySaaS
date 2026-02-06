import prisma from '../../lib/prisma'

export class BundleDealValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

export type BundleDealInput = {
    bundleQty?: unknown
    bundlePrice?: unknown
    tag?: unknown
    isActive?: unknown
    startsAt?: unknown
    endsAt?: unknown
}

const parseOptionalDate = (v: unknown): Date | null => {
    if (v === null || v === undefined || v === '') return null
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v
    if (typeof v === 'string') {
        const d = new Date(v)
        return isNaN(d.getTime()) ? null : d
    }
    return null
}

export class BundleDealsService {
    private allowedTags = new Set(['MOST_POPULAR', 'BEST_VALUE'])

    private normalizeTag(v: unknown): string | null {
        if (v === null || v === undefined || v === '') return null
        if (typeof v !== 'string') throw new BundleDealValidationError(400, 'tag must be a string')
        const t = v.trim().toUpperCase()
        if (!t) return null
        if (!this.allowedTags.has(t)) throw new BundleDealValidationError(400, 'Invalid tag value')
        return t
    }

    async listByProduct(tenantId: string, productId: string) {
        if (!productId) throw new BundleDealValidationError(400, 'productId is required')

        const product = await prisma.product.findFirst({ where: { tenantId, id: productId }, select: { id: true } })
        if (!product) throw new BundleDealValidationError(404, 'Product not found')

        return prisma.productBundleDeal.findMany({
            where: { tenantId, productId },
            orderBy: { bundleQty: 'asc' }
        })
    }

    async createForProduct(tenantId: string, productId: string, input: BundleDealInput) {
        if (!productId) throw new BundleDealValidationError(400, 'productId is required')

        const product = await prisma.product.findFirst({ where: { tenantId, id: productId }, select: { id: true } })
        if (!product) throw new BundleDealValidationError(404, 'Product not found')

        const bundleQty = Math.floor(Number(input.bundleQty))
        const bundlePrice = Number(input.bundlePrice)

        if (!Number.isFinite(bundleQty) || bundleQty < 2) {
            throw new BundleDealValidationError(400, 'bundleQty must be an integer >= 2')
        }
        if (!Number.isFinite(bundlePrice) || bundlePrice < 0) {
            throw new BundleDealValidationError(400, 'bundlePrice must be a number >= 0')
        }

        const isActive = input.isActive === undefined ? true : Boolean(input.isActive)
        const startsAt = parseOptionalDate(input.startsAt)
        const endsAt = parseOptionalDate(input.endsAt)
        const tag = this.normalizeTag(input.tag)

        if (startsAt && endsAt && startsAt.getTime() >= endsAt.getTime()) {
            throw new BundleDealValidationError(400, 'endsAt must be after startsAt')
        }

        try {
            return await prisma.productBundleDeal.create({
                data: {
                    tenantId,
                    productId,
                    bundleQty,
                    bundlePrice,
                    tag,
                    isActive,
                    startsAt,
                    endsAt
                }
            })
        } catch (e: any) {
            if (e?.code === 'P2002') {
                throw new BundleDealValidationError(409, `A bundle deal for qty ${bundleQty} already exists`)
            }
            throw e
        }
    }

    async update(tenantId: string, productId: string, dealId: string, input: BundleDealInput) {
        if (!productId) throw new BundleDealValidationError(400, 'productId is required')
        if (!dealId) throw new BundleDealValidationError(400, 'dealId is required')

        const existing = await prisma.productBundleDeal.findFirst({
            where: { tenantId, id: dealId, productId }
        })
        if (!existing) throw new BundleDealValidationError(404, 'Bundle deal not found')

        const data: any = {}

        if (input.bundleQty !== undefined) {
            const bundleQty = Math.floor(Number(input.bundleQty))
            if (!Number.isFinite(bundleQty) || bundleQty < 2) {
                throw new BundleDealValidationError(400, 'bundleQty must be an integer >= 2')
            }
            data.bundleQty = bundleQty
        }

        if (input.bundlePrice !== undefined) {
            const bundlePrice = Number(input.bundlePrice)
            if (!Number.isFinite(bundlePrice) || bundlePrice < 0) {
                throw new BundleDealValidationError(400, 'bundlePrice must be a number >= 0')
            }
            data.bundlePrice = bundlePrice
        }

        if (input.tag !== undefined) {
            data.tag = this.normalizeTag(input.tag)
        }

        if (input.isActive !== undefined) {
            data.isActive = Boolean(input.isActive)
        }

        if (input.startsAt !== undefined) {
            data.startsAt = parseOptionalDate(input.startsAt)
        }
        if (input.endsAt !== undefined) {
            data.endsAt = parseOptionalDate(input.endsAt)
        }

        const startsAt = data.startsAt !== undefined ? data.startsAt : existing.startsAt
        const endsAt = data.endsAt !== undefined ? data.endsAt : existing.endsAt
        if (startsAt && endsAt && startsAt.getTime() >= endsAt.getTime()) {
            throw new BundleDealValidationError(400, 'endsAt must be after startsAt')
        }

        try {
            const updated = await prisma.productBundleDeal.updateMany({
                where: { tenantId, id: dealId, productId },
                data
            })
            if (updated.count !== 1) throw new BundleDealValidationError(404, 'Bundle deal not found')

            const reloaded = await prisma.productBundleDeal.findFirst({ where: { tenantId, id: dealId, productId } })
            if (!reloaded) throw new BundleDealValidationError(404, 'Bundle deal not found')
            return reloaded
        } catch (e: any) {
            if (e?.code === 'P2002') {
                throw new BundleDealValidationError(409, 'A bundle deal with this qty already exists')
            }
            throw e
        }
    }

    async delete(tenantId: string, productId: string, dealId: string) {
        if (!productId) throw new BundleDealValidationError(400, 'productId is required')
        if (!dealId) throw new BundleDealValidationError(400, 'dealId is required')

        const existing = await prisma.productBundleDeal.findFirst({
            where: { tenantId, id: dealId, productId },
            select: { id: true }
        })
        if (!existing) throw new BundleDealValidationError(404, 'Bundle deal not found')

        const deleted = await prisma.productBundleDeal.deleteMany({ where: { tenantId, id: dealId, productId } })
        if (deleted.count !== 1) throw new BundleDealValidationError(404, 'Bundle deal not found')
        return { success: true }
    }
}
