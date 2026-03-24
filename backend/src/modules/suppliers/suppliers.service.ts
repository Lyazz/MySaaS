import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'

export class SupplierValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

export class SuppliersService {
    async list(tenantId: string) {
        return prisma.supplier.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' }
        })
    }

    private toMoneyString(value: unknown): string | null {
        if (value === undefined || value === null) return null
        if (typeof value === 'number' && Number.isFinite(value)) return String(value)
        if (typeof value === 'string' && value.trim()) return value.trim()
        return null
    }

    async create(tenantId: string, input: any) {
        const name = typeof input?.name === 'string' ? input.name.trim() : ''
        if (!name) throw new SupplierValidationError(400, 'Supplier name is required')

        const openingBalanceStr = this.toMoneyString(input?.openingBalance)
        const openingBalance = openingBalanceStr ? new Prisma.Decimal(openingBalanceStr) : new Prisma.Decimal(0)

        try {
            return await prisma.supplier.create({
                data: {
                    tenantId,
                    name,
                    phone: typeof input?.phone === 'string' ? input.phone.trim() || null : null,
                    email: typeof input?.email === 'string' ? input.email.trim() || null : null,
                    address: typeof input?.address === 'string' ? input.address.trim() || null : null,
                    notes: typeof input?.notes === 'string' ? input.notes.trim() || null : null,
                    openingBalance
                }
            })
        } catch (e: any) {
            if (String(e?.message || '').includes('Supplier_tenantId_name_key')) {
                throw new SupplierValidationError(409, 'Supplier with this name already exists')
            }
            throw e
        }
    }

    async getById(tenantId: string, supplierId: string) {
        const supplier = await prisma.supplier.findFirst({
            where: { tenantId, id: supplierId }
        })

        if (!supplier) return null

        const receivedRows = await prisma.$queryRaw<Array<{ totalReceived: any }>>`
            SELECT COALESCE(SUM(("PurchaseOrderItem"."quantityReceived"::numeric) * "PurchaseOrderItem"."unitCost"), 0) AS "totalReceived"
            FROM "PurchaseOrderItem"
            JOIN "PurchaseOrder"
              ON "PurchaseOrder"."tenantId" = "PurchaseOrderItem"."tenantId"
             AND "PurchaseOrder"."id" = "PurchaseOrderItem"."purchaseOrderId"
            WHERE "PurchaseOrderItem"."tenantId" = ${tenantId}
              AND "PurchaseOrder"."supplierId" = ${supplierId}
        `
        const totalReceived = new Prisma.Decimal(receivedRows[0]?.totalReceived ?? 0)

        const paidAgg = await prisma.supplierPayment.aggregate({
            where: { tenantId, supplierId },
            _sum: { amount: true }
        })
        const totalPaid = new Prisma.Decimal(paidAgg._sum.amount ?? 0)

        const opening = new Prisma.Decimal(supplier.openingBalance ?? 0)
        const currentBalance = opening.add(totalReceived).sub(totalPaid)

        const payments = await prisma.supplierPayment.findMany({
            where: { tenantId, supplierId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                amount: true,
                currency: true,
                method: true,
                reference: true,
                note: true,
                purchaseOrderId: true,
                createdAt: true
            }
        })

        return {
            ...supplier,
            openingBalance: supplier.openingBalance,
            totalReceived,
            totalPaid,
            currentBalance,
            payments
        }
    }

    async update(tenantId: string, supplierId: string, input: any) {
        const existing = await this.getById(tenantId, supplierId)
        if (!existing) throw new SupplierValidationError(404, 'Supplier not found')

        const name = input?.name !== undefined ? (typeof input.name === 'string' ? input.name.trim() : '') : undefined
        if (name !== undefined && !name) throw new SupplierValidationError(400, 'Supplier name is required')

        const openingBalanceStr = input?.openingBalance !== undefined ? this.toMoneyString(input?.openingBalance) : undefined
        const openingBalance = openingBalanceStr !== undefined ? new Prisma.Decimal(openingBalanceStr || '0') : undefined

        try {
            await prisma.supplier.updateMany({
                where: { tenantId, id: supplierId },
                data: {
                    name,
                    phone: input?.phone !== undefined ? (typeof input.phone === 'string' ? input.phone.trim() || null : null) : undefined,
                    email: input?.email !== undefined ? (typeof input.email === 'string' ? input.email.trim() || null : null) : undefined,
                    address: input?.address !== undefined ? (typeof input.address === 'string' ? input.address.trim() || null : null) : undefined,
                    notes: input?.notes !== undefined ? (typeof input.notes === 'string' ? input.notes.trim() || null : null) : undefined,
                    openingBalance
                }
            })
        } catch (e: any) {
            if (String(e?.message || '').includes('Supplier_tenantId_name_key')) {
                throw new SupplierValidationError(409, 'Supplier with this name already exists')
            }
            throw e
        }

        return this.getById(tenantId, supplierId)
    }

    async delete(tenantId: string, supplierId: string) {
        const existing = await this.getById(tenantId, supplierId)
        if (!existing) throw new SupplierValidationError(404, 'Supplier not found')

        // Block deletion if supplier has linked purchase orders
        const purchaseOrderCount = await prisma.purchaseOrder.count({
            where: { tenantId, supplierId }
        })
        if (purchaseOrderCount > 0) {
            throw new SupplierValidationError(409, 'HAS_TRANSACTIONS')
        }

        await prisma.supplier.deleteMany({ where: { tenantId, id: supplierId } })
        return { success: true }
    }
}
