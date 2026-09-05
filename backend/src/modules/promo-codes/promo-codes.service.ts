import { Prisma } from '@prisma/client'
import prisma from '../../lib/prisma'
import {
    checkPromoWindow,
    computePromoDiscount,
    normalizePromoCode,
    type PromoDiscountType,
    type PromoUnavailableReason
} from '../../../../shared/pricing/promo-pricing'
import { moneyToCents, centsToMoney } from '../../../../shared/pricing/bundle-pricing'

type TxLike = Prisma.TransactionClient | typeof prisma

export class PromoCodeError extends Error {
    statusCode: number
    statusMessage: string
    code?: string
    /** Numbers behind the refusal, so a localised client can word it itself. */
    meta?: Record<string, unknown>

    constructor(statusCode: number, statusMessage: string, code?: string, meta?: Record<string, unknown>) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
        this.code = code
        this.meta = meta
    }
}

const DISCOUNT_TYPES: PromoDiscountType[] = ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']

/** Fallback wording per refusal reason, in English. The storefront renders its
 *  own localised sentence from the `code` — this is what logs, the admin and
 *  API clients see. Deliberately vague about whether a code exists at all: a
 *  storefront must not be a code-guessing oracle. */
const REASON_MESSAGES: Record<PromoUnavailableReason | 'UNKNOWN', string> = {
    UNKNOWN: 'This promo code is not valid',
    INACTIVE: 'This promo code is not valid',
    NOT_STARTED: 'This promo code is not active yet',
    EXPIRED: 'This promo code has expired',
    USAGE_LIMIT_REACHED: 'This promo code has reached its usage limit',
    CUSTOMER_LIMIT_REACHED: 'You have already used this promo code',
    MIN_ORDER_NOT_MET: 'Your cart does not reach the minimum for this promo code',
    NOT_APPLICABLE: 'This promo code does not apply to the items in your cart'
}

export type PromoCodeInput = {
    code?: unknown
    description?: unknown
    discountType?: unknown
    discountValue?: unknown
    maxDiscountAmount?: unknown
    minOrderAmount?: unknown
    startsAt?: unknown
    endsAt?: unknown
    isActive?: unknown
    usageLimit?: unknown
    usageLimitPerCustomer?: unknown
    productIds?: unknown
    categoryIds?: unknown
}

export type PromoCartLine = {
    productId: string
    /** Line total after bundle/promotion pricing, in money units. */
    lineTotal: number
}

export type PromoEvaluation = {
    promoId: string
    code: string
    discountType: PromoDiscountType
    /** Money off the items. */
    discountAmount: number
    /** Money off the shipping (FREE_SHIPPING codes only). */
    shippingDiscount: number
}

const toOptionalNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
}

const toOptionalInt = (value: unknown): number | null => {
    const numeric = toOptionalNumber(value)
    if (numeric === null) return null
    return Math.trunc(numeric)
}

const toOptionalDate = (value: unknown, field: string): Date | null => {
    if (value === null || value === undefined || value === '') return null
    const date = value instanceof Date ? value : new Date(String(value))
    if (Number.isNaN(date.getTime())) {
        throw new PromoCodeError(400, `${field} is not a valid date`)
    }
    return date
}

const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    const seen = new Set<string>()
    for (const entry of value) {
        if (typeof entry !== 'string') continue
        const trimmed = entry.trim()
        if (trimmed) seen.add(trimmed)
    }
    return Array.from(seen)
}

const decimalToNumber = (value: unknown): number => {
    if (value === null || value === undefined) return 0
    const numeric = Number(value as any)
    return Number.isFinite(numeric) ? numeric : 0
}

export class PromoCodesService {
    // ---------------------------------------------------------------- admin CRUD

    async list(tenantId: string, filters: { search?: string; status?: string } = {}) {
        const where: Prisma.PromoCodeWhereInput = { tenantId }

        const search = typeof filters.search === 'string' ? filters.search.trim() : ''
        if (search) {
            where.OR = [
                { code: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (filters.status === 'active') where.isActive = true
        if (filters.status === 'inactive') where.isActive = false

        const items = await prisma.promoCode.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { id: true, email: true } } }
        })

        return items.map((item) => this.serialize(item))
    }

    async getById(tenantId: string, id: string) {
        const promo = await prisma.promoCode.findFirst({
            where: { tenantId, id },
            include: { createdBy: { select: { id: true, email: true } } }
        })
        if (!promo) throw new PromoCodeError(404, 'Promo code not found')
        return this.serialize(promo)
    }

    async create(tenantId: string, input: PromoCodeInput, actor?: { userId?: string | null }) {
        const data = await this.normalizeInput(tenantId, input, { requireCode: true })

        const existing = await prisma.promoCode.findFirst({
            where: { tenantId, code: data.code! },
            select: { id: true }
        })
        if (existing) {
            throw new PromoCodeError(409, 'A promo code with this code already exists', 'DUPLICATE_CODE')
        }

        const created = await prisma.promoCode.create({
            data: {
                tenantId,
                code: data.code!,
                description: data.description ?? null,
                discountType: data.discountType ?? 'PERCENTAGE',
                discountValue: data.discountValue ?? 0,
                maxDiscountAmount: data.maxDiscountAmount ?? null,
                minOrderAmount: data.minOrderAmount ?? 0,
                startsAt: data.startsAt ?? null,
                endsAt: data.endsAt ?? null,
                isActive: data.isActive ?? true,
                usageLimit: data.usageLimit ?? null,
                usageLimitPerCustomer: data.usageLimitPerCustomer ?? null,
                productIds: data.productIds ?? [],
                categoryIds: data.categoryIds ?? [],
                createdByUserId: actor?.userId ?? null
            },
            include: { createdBy: { select: { id: true, email: true } } }
        })

        return this.serialize(created)
    }

    async update(tenantId: string, id: string, input: PromoCodeInput) {
        const existing = await prisma.promoCode.findFirst({ where: { tenantId, id }, select: { id: true } })
        if (!existing) throw new PromoCodeError(404, 'Promo code not found')

        const data = await this.normalizeInput(tenantId, input, { requireCode: false })

        if (data.code) {
            const duplicate = await prisma.promoCode.findFirst({
                where: { tenantId, code: data.code, id: { not: id } },
                select: { id: true }
            })
            if (duplicate) {
                throw new PromoCodeError(409, 'A promo code with this code already exists', 'DUPLICATE_CODE')
            }
        }

        const updated = await prisma.promoCode.update({
            where: { id },
            data: {
                ...(data.code !== undefined ? { code: data.code } : {}),
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.discountType !== undefined ? { discountType: data.discountType } : {}),
                ...(data.discountValue !== undefined ? { discountValue: data.discountValue } : {}),
                ...(data.maxDiscountAmount !== undefined ? { maxDiscountAmount: data.maxDiscountAmount } : {}),
                ...(data.minOrderAmount !== undefined ? { minOrderAmount: data.minOrderAmount } : {}),
                ...(data.startsAt !== undefined ? { startsAt: data.startsAt } : {}),
                ...(data.endsAt !== undefined ? { endsAt: data.endsAt } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
                ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit } : {}),
                ...(data.usageLimitPerCustomer !== undefined
                    ? { usageLimitPerCustomer: data.usageLimitPerCustomer }
                    : {}),
                ...(data.productIds !== undefined ? { productIds: data.productIds } : {}),
                ...(data.categoryIds !== undefined ? { categoryIds: data.categoryIds } : {})
            },
            include: { createdBy: { select: { id: true, email: true } } }
        })

        return this.serialize(updated)
    }

    async remove(tenantId: string, id: string) {
        const existing = await prisma.promoCode.findFirst({ where: { tenantId, id }, select: { id: true } })
        if (!existing) throw new PromoCodeError(404, 'Promo code not found')

        // Orders keep the literal code they were placed with; only the link goes.
        await prisma.promoCode.delete({ where: { id } })
        return { id }
    }

    /** Per-code redemption history, newest first. */
    async listRedemptions(tenantId: string, promoCodeId: string, limit = 50) {
        const promo = await prisma.promoCode.findFirst({ where: { tenantId, id: promoCodeId }, select: { id: true } })
        if (!promo) throw new PromoCodeError(404, 'Promo code not found')

        return prisma.promoCodeRedemption.findMany({
            where: { tenantId, promoCodeId },
            orderBy: { createdAt: 'desc' },
            take: Math.min(Math.max(1, limit), 200),
            include: {
                order: { select: { id: true, publicId: true, status: true, customerName: true, totalWithShippingAmount: true } }
            }
        })
    }

    // ---------------------------------------------------------------- checkout

    /**
     * Prices a code against a cart. Throws {@link PromoCodeError} with a shopper-safe
     * message when the code cannot be used, and returns the money off when it can.
     *
     * `tx` lets the caller run this inside the order transaction so the usage
     * counters it reads are the ones it is about to write.
     *
     * Reading a counter is not the same as holding it. Everything below is a
     * plain read, so a caller that is about to *book* the code must pass
     * `lockPromo` and must be inside a transaction — see the note on the lock
     * itself. What holds the store-wide `usageLimit` is `recordRedemption`,
     * not this.
     */
    async evaluateForCheckout(
        tx: TxLike,
        input: {
            tenantId: string
            code: unknown
            lines: PromoCartLine[]
            cartSubtotal: number
            shippingAmount?: number | null
            customerPhoneNormalized?: string | null
            /** Skips the "already used" check for this order — used when re-pricing an order. */
            ignoreOrderId?: string | null
            /** Set by the checkout that will book this code. See below. */
            lockPromo?: boolean
        }
    ): Promise<PromoEvaluation | null> {
        const code = normalizePromoCode(input.code)
        if (!code) return null

        const promo = await tx.promoCode.findFirst({
            where: { tenantId: input.tenantId, code }
        })
        if (!promo) {
            throw new PromoCodeError(400, REASON_MESSAGES.UNKNOWN, 'PROMO_CODE_INVALID')
        }

        const windowReason = checkPromoWindow(
            { isActive: promo.isActive, startsAt: promo.startsAt, endsAt: promo.endsAt },
            new Date()
        )
        if (windowReason) this.refuse(windowReason)

        // The per-customer limit is counted, and a count is a read: two
        // checkouts racing the same code both see "not used yet" and both book
        // it. There is no conditional write that can express "insert only if
        // fewer than N rows match", so the bookers are serialized behind the
        // code's own row instead. Only taken when the limit exists, and only
        // for the caller that will actually record a redemption — a preview
        // must not sit on a lock, and `usageLimit` on its own does not need one.
        let usedCount = promo.usedCount

        if (input.lockPromo && promo.usageLimitPerCustomer !== null) {
            const locked = await tx.$queryRaw<Array<{ usedCount: number }>>`
                SELECT "usedCount" FROM "PromoCode" WHERE "id" = ${promo.id} FOR UPDATE
            `
            // Re-read under the lock: whatever the racing transaction committed
            // while we waited for it is visible now and the pre-check was not.
            if (locked.length > 0) usedCount = Number(locked[0].usedCount)
        }

        if (promo.usageLimit !== null && usedCount >= promo.usageLimit) {
            this.refuse('USAGE_LIMIT_REACHED')
        }

        if (promo.usageLimitPerCustomer !== null) {
            const phone = input.customerPhoneNormalized?.trim() || ''
            if (!phone) {
                // Without a phone there is no way to hold a per-customer limit, and
                // letting it through would make the limit advisory.
                this.refuse('CUSTOMER_LIMIT_REACHED')
            }
            const used = await tx.promoCodeRedemption.count({
                where: {
                    tenantId: input.tenantId,
                    promoCodeId: promo.id,
                    customerPhoneNormalized: phone,
                    status: 'ACTIVE',
                    ...(input.ignoreOrderId ? { orderId: { not: input.ignoreOrderId } } : {})
                }
            })
            if (used >= promo.usageLimitPerCustomer) {
                this.refuse('CUSTOMER_LIMIT_REACHED')
            }
        }

        const cartSubtotalCents = moneyToCents(Number(input.cartSubtotal) || 0)
        const minOrderCents = moneyToCents(decimalToNumber(promo.minOrderAmount))
        if (minOrderCents > 0 && cartSubtotalCents < minOrderCents) {
            throw new PromoCodeError(
                400,
                `A minimum order of ${centsToMoney(minOrderCents)} is required for this promo code`,
                'PROMO_MIN_ORDER_NOT_MET',
                { minOrderAmount: centsToMoney(minOrderCents) }
            )
        }

        const eligibleCents = await this.eligibleSubtotalCents(tx, input.tenantId, promo, input.lines)
        if (promo.discountType !== 'FREE_SHIPPING' && eligibleCents <= 0) {
            this.refuse('NOT_APPLICABLE')
        }

        const discount = computePromoDiscount({
            rules: {
                discountType: promo.discountType as PromoDiscountType,
                discountValue: decimalToNumber(promo.discountValue),
                maxDiscountAmount:
                    promo.maxDiscountAmount === null ? null : decimalToNumber(promo.maxDiscountAmount)
            },
            eligibleSubtotalCents: eligibleCents,
            cartSubtotalCents,
            shippingCents: moneyToCents(Number(input.shippingAmount) || 0)
        })

        // A free-shipping code stays valid on a cart with no shipping yet — the
        // storefront prices it before a carrier is even picked.
        if (promo.discountType !== 'FREE_SHIPPING' && discount.itemsDiscountCents <= 0) {
            this.refuse('NOT_APPLICABLE')
        }

        return {
            promoId: promo.id,
            code: promo.code,
            discountType: promo.discountType as PromoDiscountType,
            discountAmount: centsToMoney(discount.itemsDiscountCents),
            shippingDiscount: centsToMoney(discount.shippingDiscountCents)
        }
    }

    /**
     * Books a redemption against an order. Must run inside the order transaction:
     * the usage counter and the ledger row have to land with the order or not at all.
     *
     * This, not the read in `evaluateForCheckout`, is what holds `usageLimit`.
     * Throws `USAGE_LIMIT_REACHED` when the slot is gone, which rolls the whole
     * order back — the caller must map it the way it maps every other
     * {@link PromoCodeError}.
     */
    async recordRedemption(
        tx: TxLike,
        input: {
            tenantId: string
            promoCodeId: string
            code: string
            orderId: string
            customerId?: string | null
            customerPhoneNormalized?: string | null
            discountAmount: number
            shippingDiscount: number
        }
    ) {
        // Claim the slot before the ledger row, in one statement the database
        // evaluates atomically: Postgres re-checks the WHERE against the
        // freshest committed row while holding its lock, so of two checkouts
        // racing for the last use exactly one matches a row. A read followed by
        // an unconditional `increment` cannot do this — both would read the
        // same count and both would take the slot.
        //
        // Zero rows also means the code was deleted mid-checkout, which earns
        // the same refusal: no code, no discount.
        //
        // Raw because Prisma's `where` cannot compare two columns
        // (`usedCount < usageLimit`), and `updatedAt` is applied client-side by
        // Prisma so a raw UPDATE has to set it.
        const claimed = await tx.$executeRaw`
            UPDATE "PromoCode"
               SET "usedCount" = "usedCount" + 1,
                   "updatedAt" = NOW()
             WHERE "id" = ${input.promoCodeId}
               AND "tenantId" = ${input.tenantId}
               AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")
        `

        if (claimed !== 1) {
            this.refuse('USAGE_LIMIT_REACHED')
        }

        return tx.promoCodeRedemption.create({
            data: {
                tenantId: input.tenantId,
                promoCodeId: input.promoCodeId,
                orderId: input.orderId,
                customerId: input.customerId ?? null,
                customerPhoneNormalized: input.customerPhoneNormalized ?? null,
                code: input.code,
                discountAmount: input.discountAmount,
                shippingDiscount: input.shippingDiscount,
                status: 'ACTIVE'
            }
        })
    }

    /**
     * Gives the code back when an order is cancelled, returned or deleted.
     * Idempotent: a redemption already released is left alone.
     */
    async releaseOrderRedemption(tx: TxLike, tenantId: string, orderId: string) {
        const redemption = await tx.promoCodeRedemption.findFirst({
            where: { tenantId, orderId, status: 'ACTIVE' },
            select: { id: true, promoCodeId: true }
        })
        if (!redemption) return null

        await tx.promoCodeRedemption.update({
            where: { id: redemption.id },
            data: { status: 'CANCELLED' }
        })

        // The counter is advisory, so a code deleted meanwhile must not fail a cancellation.
        await tx.promoCode.updateMany({
            where: { tenantId, id: redemption.promoCodeId, usedCount: { gt: 0 } },
            data: { usedCount: { decrement: 1 } }
        })

        return redemption
    }

    // ---------------------------------------------------------------- internals

    private refuse(reason: PromoUnavailableReason): never {
        throw new PromoCodeError(400, REASON_MESSAGES[reason], `PROMO_${reason}`)
    }

    /**
     * Sum of the cart lines the code is allowed to discount. An unscoped code
     * takes the whole cart; a scoped one only the products it names, plus every
     * product sitting in one of its categories.
     */
    private async eligibleSubtotalCents(
        tx: TxLike,
        tenantId: string,
        promo: { productIds: string[]; categoryIds: string[] },
        lines: PromoCartLine[]
    ): Promise<number> {
        const cartLines = Array.isArray(lines) ? lines : []
        const sum = (subset: PromoCartLine[]) =>
            subset.reduce((total, line) => total + moneyToCents(Number(line.lineTotal) || 0), 0)

        const productIds = promo.productIds ?? []
        const categoryIds = promo.categoryIds ?? []

        if (productIds.length === 0 && categoryIds.length === 0) {
            return sum(cartLines)
        }

        const allowed = new Set(productIds)

        if (categoryIds.length > 0) {
            const cartProductIds = Array.from(new Set(cartLines.map((line) => line.productId).filter(Boolean)))
            if (cartProductIds.length > 0) {
                const matches = await tx.productCategory.findMany({
                    where: { tenantId, productId: { in: cartProductIds }, categoryId: { in: categoryIds } },
                    select: { productId: true }
                })
                matches.forEach((match) => allowed.add(match.productId))
            }
        }

        return sum(cartLines.filter((line) => allowed.has(line.productId)))
    }

    private async normalizeInput(
        tenantId: string,
        input: PromoCodeInput,
        options: { requireCode: boolean }
    ) {
        const result: {
            code?: string
            description?: string | null
            discountType?: PromoDiscountType
            discountValue?: number
            maxDiscountAmount?: number | null
            minOrderAmount?: number
            startsAt?: Date | null
            endsAt?: Date | null
            isActive?: boolean
            usageLimit?: number | null
            usageLimitPerCustomer?: number | null
            productIds?: string[]
            categoryIds?: string[]
        } = {}

        if (options.requireCode || input.code !== undefined) {
            const code = normalizePromoCode(input.code)
            if (!code) throw new PromoCodeError(400, 'Code is required')
            if (code.length > 40) throw new PromoCodeError(400, 'Code must be at most 40 characters')
            if (!/^[A-Z0-9._-]+$/.test(code)) {
                throw new PromoCodeError(400, 'Code may only contain letters, digits, dots, dashes and underscores')
            }
            result.code = code
        }

        if (input.description !== undefined) {
            const description = typeof input.description === 'string' ? input.description.trim() : ''
            if (description.length > 500) throw new PromoCodeError(400, 'Description is too long')
            result.description = description || null
        }

        if (input.discountType !== undefined) {
            const type = String(input.discountType || '').toUpperCase() as PromoDiscountType
            if (!DISCOUNT_TYPES.includes(type)) throw new PromoCodeError(400, 'Invalid discount type')
            result.discountType = type
        }

        const effectiveType = result.discountType

        if (input.discountValue !== undefined) {
            const value = toOptionalNumber(input.discountValue) ?? 0
            if (value < 0) throw new PromoCodeError(400, 'Discount value cannot be negative')
            if (effectiveType === 'PERCENTAGE' && value > 100) {
                throw new PromoCodeError(400, 'A percentage discount cannot exceed 100')
            }
            result.discountValue = value
        }

        if (effectiveType && effectiveType !== 'FREE_SHIPPING') {
            const value = result.discountValue ?? toOptionalNumber(input.discountValue) ?? 0
            if (value <= 0) throw new PromoCodeError(400, 'Discount value must be greater than zero')
        }

        if (input.maxDiscountAmount !== undefined) {
            const value = toOptionalNumber(input.maxDiscountAmount)
            if (value !== null && value < 0) throw new PromoCodeError(400, 'Maximum discount cannot be negative')
            result.maxDiscountAmount = value === null || value === 0 ? null : value
        }

        if (input.minOrderAmount !== undefined) {
            const value = toOptionalNumber(input.minOrderAmount) ?? 0
            if (value < 0) throw new PromoCodeError(400, 'Minimum order amount cannot be negative')
            result.minOrderAmount = value
        }

        if (input.startsAt !== undefined) result.startsAt = toOptionalDate(input.startsAt, 'startsAt')
        if (input.endsAt !== undefined) result.endsAt = toOptionalDate(input.endsAt, 'endsAt')

        if (result.startsAt && result.endsAt && result.endsAt <= result.startsAt) {
            throw new PromoCodeError(400, 'The end date must come after the start date')
        }

        if (input.isActive !== undefined) result.isActive = input.isActive !== false

        if (input.usageLimit !== undefined) {
            const value = toOptionalInt(input.usageLimit)
            if (value !== null && value < 1) throw new PromoCodeError(400, 'Usage limit must be at least 1')
            result.usageLimit = value
        }

        if (input.usageLimitPerCustomer !== undefined) {
            const value = toOptionalInt(input.usageLimitPerCustomer)
            if (value !== null && value < 1) {
                throw new PromoCodeError(400, 'Per-customer usage limit must be at least 1')
            }
            result.usageLimitPerCustomer = value
        }

        if (input.productIds !== undefined) {
            const ids = toStringArray(input.productIds)
            if (ids.length > 0) {
                const found = await prisma.product.count({ where: { tenantId, id: { in: ids } } })
                if (found !== ids.length) throw new PromoCodeError(400, 'Some products do not exist')
            }
            result.productIds = ids
        }

        if (input.categoryIds !== undefined) {
            const ids = toStringArray(input.categoryIds)
            if (ids.length > 0) {
                const found = await prisma.category.count({ where: { tenantId, id: { in: ids } } })
                if (found !== ids.length) throw new PromoCodeError(400, 'Some categories do not exist')
            }
            result.categoryIds = ids
        }

        return result
    }

    private serialize(promo: any) {
        return {
            ...promo,
            discountValue: decimalToNumber(promo.discountValue),
            maxDiscountAmount: promo.maxDiscountAmount === null ? null : decimalToNumber(promo.maxDiscountAmount),
            minOrderAmount: decimalToNumber(promo.minOrderAmount),
            remainingUses:
                promo.usageLimit === null || promo.usageLimit === undefined
                    ? null
                    : Math.max(0, promo.usageLimit - promo.usedCount)
        }
    }
}
