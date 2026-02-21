import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { syncProductStockForProducts } from '../inventory/product-stock.service'
import { CashService, CashValidationError } from '../cash/cash.service'

const cashService = new CashService()

export class PurchaseValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

const toInt = (value: unknown): number | null => {
    if (value === undefined || value === null) return null
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return null
    return Math.trunc(n)
}

const toMoneyString = (value: unknown): string | null => {
    if (value === undefined || value === null) return null
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string' && value.trim()) return value.trim()
    return null
}

type SalePriceMode = 'replace' | 'weighted'

const normalizeSalePriceMode = (value: unknown): SalePriceMode => {
    const v = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (v === 'weighted') return 'weighted'
    return 'replace'
}

type CostMode = 'replace' | 'weighted'

const normalizeCostMode = (value: unknown): CostMode => {
    const v = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (v === 'weighted') return 'weighted'
    return 'replace'
}

const toDecimal = (value: string) => new Prisma.Decimal(value)

export class PurchasesService {
    async list(tenantId: string, filters?: { startDate?: string; endDate?: string }) {
        const where: any = { tenantId }

        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {}
            if (filters.startDate) {
                const start = new Date(filters.startDate)
                start.setHours(0, 0, 0, 0)
                where.createdAt.gte = start
            }
            if (filters.endDate) {
                const end = new Date(filters.endDate)
                end.setHours(23, 59, 59, 999)
                where.createdAt.lte = end
            }
        }

        return prisma.purchaseOrder.findMany({
            where,
            include: { supplier: true, items: true },
            orderBy: { createdAt: 'desc' }
        })
    }

    async create(tenantId: string, input: any, actor?: { userId?: string | null }) {
        const supplierId = typeof input?.supplierId === 'string' && input.supplierId.trim() ? input.supplierId.trim() : null
        if (supplierId) {
            const supplier = await prisma.supplier.findFirst({ where: { tenantId, id: supplierId } })
            if (!supplier) throw new PurchaseValidationError(400, 'Invalid supplier')
        }

        const currency = typeof input?.currency === 'string' && input.currency.trim() ? input.currency.trim().slice(0, 8) : 'DZD'
        const reference = typeof input?.reference === 'string' && input.reference.trim() ? input.reference.trim().slice(0, 64) : null
        const notes = typeof input?.notes === 'string' && input.notes.trim() ? input.notes.trim().slice(0, 500) : null

        return prisma.purchaseOrder.create({
            data: {
                tenantId,
                supplierId: supplierId ?? null,
                currency,
                reference,
                notes,
                status: 'DRAFT',
                createdByUserId: actor?.userId ?? null
            },
            include: { supplier: true, items: { include: { variant: true } } }
        })
    }

    async getById(tenantId: string, purchaseOrderId: string) {
        return prisma.purchaseOrder.findFirst({
            where: { tenantId, id: purchaseOrderId },
            include: {
                supplier: true,
                items: {
                    include: {
                        variant: {
                            include: { product: true, optionValues: { include: { optionValue: true } } }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })
    }

    async addItem(tenantId: string, purchaseOrderId: string, input: any) {
        const order = await prisma.purchaseOrder.findFirst({ where: { tenantId, id: purchaseOrderId } })
        if (!order) throw new PurchaseValidationError(404, 'Purchase order not found')
        if (order.status !== 'DRAFT' && order.status !== 'ORDERED') {
            throw new PurchaseValidationError(409, 'Cannot edit items for this purchase order status')
        }

        const variantId = typeof input?.variantId === 'string' ? input.variantId.trim() : ''
        if (!variantId) throw new PurchaseValidationError(400, 'variantId is required')
        const variant = await prisma.productVariant.findFirst({ where: { tenantId, id: variantId } })
        if (!variant) throw new PurchaseValidationError(400, 'Invalid variant')

        const quantityOrdered = toInt(input?.quantityOrdered)
        if (!quantityOrdered || quantityOrdered < 1) throw new PurchaseValidationError(400, 'quantityOrdered must be >= 1')

        const unitCost = toMoneyString(input?.unitCost)
        if (unitCost === null) throw new PurchaseValidationError(400, 'unitCost is required')

        const salePrice = toMoneyString(input?.salePrice)

        return prisma.$transaction(async (tx) => {
            const created = await tx.purchaseOrderItem.create({
                data: {
                    tenantId,
                    purchaseOrderId,
                    variantId,
                    quantityOrdered,
                    unitCost,
                    salePrice
                },
                include: { variant: true }
            })

            await tx.productVariant.updateMany({
                where: { tenantId, id: variantId },
                data: { skuLocked: true }
            })

            return created
        })
    }

    async receive(
        tenantId: string,
        purchaseOrderId: string,
        input: any,
        actor?: { userId?: string | null }
    ) {
        const costMode = normalizeCostMode(input?.costMode)
        const salePriceMode = normalizeSalePriceMode(input?.salePriceMode)
        const payment = input?.payment
        const paymentMode = typeof payment?.mode === 'string' ? payment.mode.trim().toLowerCase() : ''
        const paymentAmountStr = toMoneyString(payment?.amount)
        const wantsSupplierPayment =
            paymentMode === 'full' || paymentMode === 'partial' || paymentAmountStr !== null
        const shouldAutoComputePaymentAmount = wantsSupplierPayment && paymentAmountStr === null && paymentMode === 'full'
        const paymentMethod = typeof payment?.method === 'string' && payment.method.trim() ? payment.method.trim() : null
        const paymentCashboxId = typeof payment?.cashboxId === 'string' && payment.cashboxId.trim() ? payment.cashboxId.trim() : null
        const paymentReference = typeof payment?.reference === 'string' && payment.reference.trim() ? payment.reference.trim().slice(0, 64) : null
        const paymentNote = typeof payment?.note === 'string' && payment.note.trim() ? payment.note.trim().slice(0, 500) : null

        const order = await prisma.purchaseOrder.findFirst({
            where: { tenantId, id: purchaseOrderId },
            include: { items: true }
        })
        if (!order) throw new PurchaseValidationError(404, 'Purchase order not found')
        if (!Array.isArray(input?.items) || input.items.length === 0) {
            throw new PurchaseValidationError(400, 'At least one receive item is required')
        }
        if (wantsSupplierPayment && !order.supplierId) {
            throw new PurchaseValidationError(400, 'supplierId is required to record a supplier payment')
        }

        const receiveItems = input.items.map((row: any) => ({
            itemId: typeof row?.itemId === 'string' ? row.itemId.trim() : '',
            quantityReceived: toInt(row?.quantityReceived),
            unitCost: toMoneyString(row?.unitCost),
            salePrice: toMoneyString(row?.salePrice)
        }))

        receiveItems.forEach((row) => {
            if (!row.itemId) throw new PurchaseValidationError(400, 'itemId is required')
            if (!row.quantityReceived || row.quantityReceived < 1) throw new PurchaseValidationError(400, 'quantityReceived must be >= 1')
        })

        const itemById = new Map(order.items.map((i) => [i.id, i]))
        for (const row of receiveItems) {
            const item = itemById.get(row.itemId)
            if (!item) throw new PurchaseValidationError(400, 'Invalid purchase order item')
            const remaining = item.quantityOrdered - item.quantityReceived
            if (row.quantityReceived! > remaining) {
                throw new PurchaseValidationError(400, `quantityReceived exceeds remaining for item ${item.id}`)
            }
        }

        await prisma.$transaction(async (tx) => {
            const touchedProductIds = new Set<string>()
            let computedPaymentTotal = new Prisma.Decimal(0)
            for (const row of receiveItems) {
                const item = itemById.get(row.itemId)!
                const qty = row.quantityReceived!

                const newUnitCost = row.unitCost ?? String(item.unitCost)
                const newSalePrice = row.salePrice ?? (item.salePrice ? String(item.salePrice) : null)
                if (shouldAutoComputePaymentAmount) {
                    const lineTotal = toDecimal(newUnitCost).mul(new Prisma.Decimal(qty))
                    computedPaymentTotal = computedPaymentTotal.add(lineTotal)
                }

                await tx.purchaseOrderItem.updateMany({
                    where: { tenantId, id: item.id },
                    data: {
                        quantityReceived: { increment: qty },
                        unitCost: newUnitCost,
                        salePrice: newSalePrice
                    }
                })

                // Policy A: receiving always increments variant.stock (even if trackInventory=false).
                const variantBefore = await tx.productVariant.findFirst({
                    where: { tenantId, id: item.variantId },
                    select: { id: true, productId: true, stock: true, reserved: true, safetyStock: true, price: true, cost: true }
                })
                if (!variantBefore) throw new PurchaseValidationError(400, 'Variant not found')

                const costUpdate = (() => {
                    if (costMode === 'replace') {
                        return { cost: newUnitCost, noteSuffix: `; costMode:replace; newCost:${newUnitCost}` }
                    }

                    const oldQty = variantBefore.stock
                    const newQty = qty
                    const oldCost = Prisma.Decimal.isDecimal(variantBefore.cost)
                        ? (variantBefore.cost as any as Prisma.Decimal)
                        : toDecimal(String(variantBefore.cost))
                    const candidateNewCost = toDecimal(newUnitCost)
                    const denom = oldQty + newQty
                    const weighted =
                        denom <= 0
                            ? candidateNewCost
                            : oldCost.mul(oldQty).add(candidateNewCost.mul(newQty)).div(denom).toDecimalPlaces(2)

                    return {
                        cost: weighted.toString(),
                        noteSuffix: `; costMode:weighted; oldCost:${oldCost.toString()}; oldQty:${oldQty}; newCost:${newUnitCost}; newQty:${newQty}; result:${weighted.toString()}`
                    }
                })()

                const priceUpdate = (() => {
                    if (!newSalePrice) return { price: undefined as string | undefined, noteSuffix: '' }
                    if (salePriceMode === 'replace') {
                        return { price: newSalePrice, noteSuffix: `; salePriceMode:replace; newPrice:${newSalePrice}` }
                    }

                    const oldQty = variantBefore.stock
                    const newQty = qty
                    const oldPrice = Prisma.Decimal.isDecimal(variantBefore.price)
                        ? (variantBefore.price as any as Prisma.Decimal)
                        : toDecimal(String(variantBefore.price))
                    const candidateNewPrice = toDecimal(newSalePrice)
                    const denom = oldQty + newQty
                    const weighted =
                        denom <= 0
                            ? candidateNewPrice
                            : oldPrice.mul(oldQty).add(candidateNewPrice.mul(newQty)).div(denom).toDecimalPlaces(2)

                    return {
                        price: weighted.toString(),
                        noteSuffix: `; salePriceMode:weighted; oldPrice:${oldPrice.toString()}; oldQty:${oldQty}; newPrice:${newSalePrice}; newQty:${newQty}; result:${weighted.toString()}`
                    }
                })()

                await tx.productVariant.updateMany({
                    where: { tenantId, id: item.variantId },
                    data: {
                        stock: { increment: qty },
                        cost: costUpdate.cost,
                        price: priceUpdate.price
                    }
                })

                const variantAfter = await tx.productVariant.findFirst({
                    where: { tenantId, id: item.variantId },
                    select: { stock: true, reserved: true, safetyStock: true }
                })

                await tx.inventoryMovement.create({
                    data: {
                        tenantId,
                        variantId: item.variantId,
                        type: 'PURCHASE_RECEIPT',
                        delta: qty,
                        reservedDelta: 0,
                        safetyStockDelta: 0,
                        reason: 'purchase',
                        note: (`purchaseOrder:${purchaseOrderId}` + (costUpdate.noteSuffix || '') + (priceUpdate.noteSuffix || '')).slice(0, 500),
                        stockAfter: variantAfter?.stock ?? null,
                        reservedAfter: variantAfter?.reserved ?? null,
                        safetyStockAfter: variantAfter?.safetyStock ?? null,
                        createdByUserId: actor?.userId ?? null
                    }
                })

                touchedProductIds.add(variantBefore.productId)

                // Keep Product.price mirrored for default-variant products without options.
                const isDefaultVariant = (await tx.productVariantOptionValue.count({ where: { tenantId, variantId: item.variantId } })) === 0
                if (isDefaultVariant) {
                    const hasOptions = (await tx.productOption.count({ where: { tenantId, productId: variantBefore.productId } })) > 0
                    if (!hasOptions) {
                        await tx.product.updateMany({
                            where: { tenantId, id: variantBefore.productId },
                            data: {
                                price: priceUpdate.price
                            }
                        })
                    }
                }
            }

            await syncProductStockForProducts(tx as any, tenantId, Array.from(touchedProductIds))

            const allItems = await tx.purchaseOrderItem.findMany({
                where: { tenantId, purchaseOrderId },
                select: { quantityOrdered: true, quantityReceived: true }
            })
            const remainingCount = allItems.filter((i) => i.quantityReceived < i.quantityOrdered).length

            await tx.purchaseOrder.updateMany({
                where: { tenantId, id: purchaseOrderId },
                data: {
                    status: remainingCount === 0 ? 'RECEIVED' : 'ORDERED',
                    receivedAt: remainingCount === 0 ? new Date() : undefined,
                    orderedAt: order.orderedAt ?? new Date()
                }
            })

            if (wantsSupplierPayment) {
                const amountStr = paymentAmountStr ?? (shouldAutoComputePaymentAmount ? computedPaymentTotal.toString() : null)
                if (!amountStr) {
                    throw new PurchaseValidationError(400, 'payment.amount is required for partial payments')
                }

                try {
                    await cashService.createTransactionInTx(
                        tx,
                        tenantId,
                        {
                            cashboxId: paymentCashboxId,
                            type: 'SUPPLIER_PAYMENT',
                            direction: 'OUT',
                            amount: amountStr,
                            currency: (order.currency || 'DZD').slice(0, 8),
                            method: paymentMethod ?? undefined,
                            supplierId: order.supplierId,
                            purchaseOrderId,
                            reference: paymentReference ?? undefined,
                            note: paymentNote ?? `Purchase receive payment: ${purchaseOrderId}`.slice(0, 500)
                        },
                        { userId: actor?.userId ?? null }
                    )
                } catch (error: any) {
                    if (error instanceof CashValidationError) {
                        throw new PurchaseValidationError(error.statusCode, error.statusMessage)
                    }
                    throw error
                }
            }
        })

        return this.getById(tenantId, purchaseOrderId)
    }

    async delete(tenantId: string, purchaseOrderId: string) {
        const order = await prisma.purchaseOrder.findFirst({ where: { tenantId, id: purchaseOrderId }, include: { items: true } })
        if (!order) throw new PurchaseValidationError(404, 'Purchase order not found')

        const hasReceived = order.items.some(i => i.quantityReceived > 0)
        if (hasReceived) throw new PurchaseValidationError(400, 'Cannot delete purchase order with received items')

        await prisma.purchaseOrderItem.deleteMany({ where: { tenantId, purchaseOrderId } })
        await prisma.purchaseOrder.delete({ where: { tenantId, id: purchaseOrderId } })
    }

    async updateItem(tenantId: string, purchaseOrderId: string, itemId: string, input: any) {
        const order = await prisma.purchaseOrder.findFirst({ where: { tenantId, id: purchaseOrderId } })
        if (!order) throw new PurchaseValidationError(404, 'Purchase order not found')

        const item = await prisma.purchaseOrderItem.findFirst({ where: { tenantId, purchaseOrderId, id: itemId } })
        if (!item) throw new PurchaseValidationError(404, 'Item not found')

        if (item.quantityReceived > 0) {
            if (toMoneyString(input.unitCost) !== String(item.unitCost) || toInt(input.quantityOrdered) !== item.quantityOrdered) {
                // throw new PurchaseValidationError(400, 'Cannot edit item after receiving stock')
            }
        }

        const data: any = {}
        if (input.quantityOrdered !== undefined) {
            const qty = toInt(input.quantityOrdered)
            if (qty !== null && qty >= 1) {
                if (qty < item.quantityReceived) throw new PurchaseValidationError(400, 'New quantity cannot be less than received quantity')
                data.quantityOrdered = qty
            }
        }
        if (input.unitCost !== undefined) {
            const cost = toMoneyString(input.unitCost)
            if (cost !== null) data.unitCost = cost
        }
        if (input.salePrice !== undefined) {
            const price = toMoneyString(input.salePrice)
            data.salePrice = price
        }

        return prisma.purchaseOrderItem.update({
            where: { tenantId, id: itemId },
            data
        })
    }

    async removeItem(tenantId: string, purchaseOrderId: string, itemId: string) {
        const item = await prisma.purchaseOrderItem.findFirst({ where: { tenantId, purchaseOrderId, id: itemId } })
        if (!item) throw new PurchaseValidationError(404, 'Item not found')

        if (item.quantityReceived > 0) throw new PurchaseValidationError(400, 'Cannot remove item with received stock')

        await prisma.purchaseOrderItem.delete({ where: { tenantId, id: itemId } })
    }
}
