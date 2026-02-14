import prisma from '../../lib/prisma'
import { syncProductStockForProducts } from './product-stock.service'

export class InventoryValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

export type InventoryMovementDto = {
    id: string
    type: string
    delta: number
    reservedDelta: number
    safetyStockDelta: number
    reason: string
    note: string | null
    orderId: string | null
    stockAfter: number | null
    reservedAfter: number | null
    safetyStockAfter: number | null
    createdAt: Date
    createdBy: { id: string; email: string } | null
}

export type VariantInventoryDto = {
    id: string
    productId: string
    productTitle: string
    sku: string | null
    isActive: boolean
    price: string
    trackInventory: boolean
    stock: number
    reserved: number
    safetyStock: number
    available: number
    optionTitle: string
}

const toInt = (value: unknown): number | null => {
    if (value === undefined || value === null) return null
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return null
    return Math.trunc(n)
}

export class InventoryService {
    async listVariants(tenantId: string, opts?: { search?: string | null; productId?: string | null }) {
        const where: any = { tenantId, isActive: true }
        if (opts?.productId) where.productId = opts.productId
        if (opts?.search) {
            where.OR = [
                { sku: { contains: opts.search, mode: 'insensitive' } },
                { product: { title: { contains: opts.search, mode: 'insensitive' } } }
            ]
        }

        const variants = await prisma.productVariant.findMany({
            where,
            include: {
                product: { select: { title: true } },
                optionValues: {
                    include: { optionValue: { select: { label: true, option: { select: { position: true } } } } }
                }
            },
            orderBy: [{ product: { title: 'asc' } }, { createdAt: 'asc' }]
        })

        return variants.map((variant): VariantInventoryDto => {
            const optionTitle = (variant.optionValues ?? [])
                .slice()
                .sort((a, b) => (a.optionValue?.option?.position ?? 999) - (b.optionValue?.option?.position ?? 999))
                .map((ov) => ov.optionValue?.label ?? '?')
                .join(' / ') || 'Default'

            const available = variant.trackInventory ? Math.max(variant.stock - variant.reserved - variant.safetyStock, 0) : Number.POSITIVE_INFINITY

            return {
                id: variant.id,
                productId: variant.productId,
                productTitle: variant.product.title,
                sku: variant.sku,
                isActive: variant.isActive,
                price: String(variant.price),
                trackInventory: variant.trackInventory,
                stock: variant.stock,
                reserved: variant.reserved,
                safetyStock: variant.safetyStock,
                available,
                optionTitle
            }
        })
    }

    async listMovements(tenantId: string, variantId: string, opts?: { take?: number }) {
        const take = Math.min(Math.max(opts?.take ?? 50, 1), 200)

        const variant = await prisma.productVariant.findFirst({
            where: { id: variantId, tenantId },
            select: { id: true }
        })
        if (!variant) throw new InventoryValidationError(404, 'Variant not found')

        const moves = await prisma.inventoryMovement.findMany({
            where: { tenantId, variantId },
            orderBy: { createdAt: 'desc' },
            take,
            include: {
                createdBy: { select: { id: true, email: true } }
            }
        })

        return moves.map((move): InventoryMovementDto => ({
            id: move.id,
            type: move.type,
            delta: move.delta,
            reservedDelta: move.reservedDelta,
            safetyStockDelta: move.safetyStockDelta,
            reason: move.reason,
            note: move.note ?? null,
            orderId: move.orderId ?? null,
            stockAfter: move.stockAfter ?? null,
            reservedAfter: move.reservedAfter ?? null,
            safetyStockAfter: move.safetyStockAfter ?? null,
            createdAt: move.createdAt,
            createdBy: move.createdBy ? { id: move.createdBy.id, email: move.createdBy.email } : null
        }))
    }

    async updateVariantInventory(
        tenantId: string,
        variantId: string,
        input: {
            stock?: unknown
            reserved?: unknown
            safetyStock?: unknown
            trackInventory?: unknown
            reason?: unknown
            note?: unknown
        },
        actor?: { userId?: string | null }
    ) {
        const stock = toInt(input.stock)
        const reserved = toInt(input.reserved)
        const safetyStock = toInt(input.safetyStock)
        const trackInventory = typeof input.trackInventory === 'boolean' ? input.trackInventory : null

        const reason = typeof input.reason === 'string' && input.reason.trim() ? input.reason.trim().slice(0, 64) : 'manual'
        const note = typeof input.note === 'string' && input.note.trim() ? input.note.trim().slice(0, 500) : null

        if (stock !== null && stock < 0) throw new InventoryValidationError(400, 'stock must be >= 0')
        if (reserved !== null && reserved < 0) throw new InventoryValidationError(400, 'reserved must be >= 0')
        if (safetyStock !== null && safetyStock < 0) throw new InventoryValidationError(400, 'safetyStock must be >= 0')

        const current = await prisma.productVariant.findFirst({
            where: { id: variantId, tenantId },
            select: {
                id: true,
                productId: true,
                stock: true,
                reserved: true,
                safetyStock: true,
                trackInventory: true
            }
        })
        if (!current) throw new InventoryValidationError(404, 'Variant not found')

        if (stock !== null && stock !== current.stock) {
            throw new InventoryValidationError(403, 'stock is system-managed and cannot be edited')
        }
        if (reserved !== null && reserved !== current.reserved) {
            throw new InventoryValidationError(403, 'reserved is system-managed and cannot be edited')
        }

        const next = {
            stock: stock ?? current.stock,
            reserved: reserved ?? current.reserved,
            safetyStock: safetyStock ?? current.safetyStock,
            trackInventory: trackInventory ?? current.trackInventory
        }

        if (next.reserved > next.stock) {
            throw new InventoryValidationError(400, 'reserved cannot exceed stock')
        }
        if (next.stock - next.reserved - next.safetyStock < 0) {
            throw new InventoryValidationError(400, 'stock must be >= reserved + safetyStock')
        }

        const delta = next.stock - current.stock
        const reservedDelta = next.reserved - current.reserved
        const safetyStockDelta = next.safetyStock - current.safetyStock

        const anyChange =
            delta !== 0 ||
            reservedDelta !== 0 ||
            safetyStockDelta !== 0 ||
            next.trackInventory !== current.trackInventory

        if (!anyChange) {
            return prisma.productVariant.findFirst({ where: { id: variantId, tenantId } })
        }

        const type = (() => {
            if (delta !== 0) return 'MANUAL_SET'
            if (reservedDelta !== 0) return 'RESERVED_ADJUSTMENT'
            if (safetyStockDelta !== 0) return 'SAFETY_STOCK_CHANGE'
            if (next.trackInventory !== current.trackInventory) return 'TRACKING_CHANGE'
            return 'MANUAL_ADJUSTMENT'
        })()

        const updated = await prisma.$transaction(async (tx) => {
            const updateResult = await tx.productVariant.updateMany({
                where: {
                    id: variantId,
                    tenantId,
                    stock: current.stock,
                    reserved: current.reserved,
                    safetyStock: current.safetyStock,
                    trackInventory: current.trackInventory
                },
                data: {
                    safetyStock: safetyStock === null ? undefined : next.safetyStock,
                    trackInventory: trackInventory === null ? undefined : next.trackInventory
                }
            })

            if (updateResult.count !== 1) {
                throw new InventoryValidationError(409, 'Variant was updated by another request, please retry')
            }

            const refreshed = await tx.productVariant.findFirst({
                where: { id: variantId, tenantId },
                select: { stock: true, reserved: true, safetyStock: true }
            })

            await tx.inventoryMovement.create({
                data: {
                    tenantId,
                    variantId,
                    type: type as any,
                    delta,
                    reservedDelta,
                    safetyStockDelta,
                    reason,
                    note,
                    stockAfter: refreshed?.stock ?? next.stock,
                    reservedAfter: refreshed?.reserved ?? next.reserved,
                    safetyStockAfter: refreshed?.safetyStock ?? next.safetyStock,
                    createdByUserId: actor?.userId ?? null
                }
            })

            await syncProductStockForProducts(tx as any, tenantId, [current.productId])

            return tx.productVariant.findFirst({
                where: { id: variantId, tenantId }
            })
        })

        return updated
    }
}
