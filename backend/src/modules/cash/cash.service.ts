import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import prisma from '../../lib/prisma'
import { mirrorCashTransactionToPayments } from '../payments/payment-mirror'

export class CashValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

export type CashboxSummary = {
    id: string
    name: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    openSession: null | {
        id: string
        openedAt: Date
        openingFloat: Prisma.Decimal
    }
}

export type CashSessionSummary = {
    id: string
    cashboxId: string
    status: string
    openingFloat: Prisma.Decimal
    openedAt: Date
    closedAt: Date | null
    closingCount: Prisma.Decimal | null
    expectedClosing: Prisma.Decimal | null
    difference: Prisma.Decimal | null
    note: string | null
}

export type CashTransactionSummary = {
    id: string
    cashboxId: string
    sessionId: string
    direction: string
    type: string
    amount: Prisma.Decimal
    currency: string
    method: string
    customerId: string | null
    supplierId: string | null
    saleId: string | null
    orderId: string | null
    purchaseOrderId: string | null
    expenseCategory: string | null
    transferGroupId: string | null
    reference: string | null
    note: string | null
    createdByUserId: string | null
    createdAt: Date
}

const toTrimmedString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null
    const v = value.trim()
    return v ? v : null
}

const toMoneyString = (value: unknown): string | null => {
    if (value === undefined || value === null) return null
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string' && value.trim()) return value.trim()
    return null
}

const toDecimal = (value: string) => new Prisma.Decimal(value)

const normalizeTransactionType = (value: unknown): string => {
    const raw = typeof value === 'string' ? value.trim().toUpperCase() : ''
    return raw
}

const normalizeDirection = (value: unknown): 'IN' | 'OUT' => {
    const raw = typeof value === 'string' ? value.trim().toUpperCase() : ''
    if (raw === 'OUT') return 'OUT'
    return 'IN'
}

const normalizeMethod = (value: unknown): string => {
    const raw = typeof value === 'string' ? value.trim().toUpperCase() : ''
    return raw || 'CASH'
}

const typePolicy = (type: string): { direction: 'IN' | 'OUT'; needs: Array<'customer' | 'supplier' | 'sale' | 'order' | 'purchaseOrder' | 'category'> } | null => {
    switch (type) {
        case 'SALE_PAYMENT':
            return { direction: 'IN', needs: [] }
        case 'CUSTOMER_PAYMENT':
            return { direction: 'IN', needs: ['customer'] }
        case 'SUPPLIER_PAYMENT':
            return { direction: 'OUT', needs: ['supplier'] }
        case 'EXPENSE':
            return { direction: 'OUT', needs: ['category'] }
        case 'CHARGE':
            return { direction: 'OUT', needs: ['category'] }
        default:
            return null
    }
}

export class CashService {
    async listCashboxes(tenantId: string): Promise<CashboxSummary[]> {
        const [cashboxes, openSessions] = await Promise.all([
            prisma.cashbox.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'asc' },
                select: { id: true, name: true, isActive: true, createdAt: true, updatedAt: true }
            }),
            prisma.cashSession.findMany({
                where: { tenantId, status: 'OPEN' },
                select: { id: true, cashboxId: true, openedAt: true, openingFloat: true },
                orderBy: { openedAt: 'desc' }
            })
        ])

        const openByCashboxId = new Map<string, { id: string; openedAt: Date; openingFloat: Prisma.Decimal }>()
        for (const s of openSessions) {
            if (!openByCashboxId.has(s.cashboxId)) {
                openByCashboxId.set(s.cashboxId, { id: s.id, openedAt: s.openedAt, openingFloat: s.openingFloat })
            }
        }

        return cashboxes.map((c) => ({
            ...c,
            openSession: openByCashboxId.get(c.id) ?? null
        }))
    }

    async createCashbox(tenantId: string, input: any) {
        const name = toTrimmedString(input?.name)
        if (!name) throw new CashValidationError(400, 'name is required')
        if (name.length > 80) throw new CashValidationError(400, 'name is too long')

        try {
            return await prisma.cashbox.create({
                data: { tenantId, name, isActive: input?.isActive === false ? false : true }
            })
        } catch (e: any) {
            if (e?.code === 'P2002') {
                throw new CashValidationError(409, 'Cashbox name already exists')
            }
            throw e
        }
    }

    async updateCashbox(tenantId: string, cashboxId: string, input: any) {
        const name = input?.name !== undefined ? toTrimmedString(input?.name) : null
        if (input?.name !== undefined) {
            if (!name) throw new CashValidationError(400, 'name is required')
            if (name.length > 80) throw new CashValidationError(400, 'name is too long')
        }

        const isActive = input?.isActive === undefined ? undefined : input?.isActive === false ? false : true

        try {
            return await prisma.cashbox.update({
                where: { tenantId_id: { tenantId, id: cashboxId } },
                data: { name: name ?? undefined, isActive }
            })
        } catch (e: any) {
            if (e?.code === 'P2025') {
                return null
            }
            if (e?.code === 'P2002') {
                throw new CashValidationError(409, 'Cashbox name already exists')
            }
            throw e
        }
    }

    async openSession(tenantId: string, cashboxId: string, input: any, actor?: { userId?: string | null }) {
        const cashbox = await prisma.cashbox.findFirst({ where: { tenantId, id: cashboxId } })
        if (!cashbox) throw new CashValidationError(404, 'Cashbox not found')

        const existingOpen = await prisma.cashSession.findFirst({
            where: { tenantId, cashboxId, status: 'OPEN' },
            select: { id: true }
        })
        if (existingOpen) {
            throw new CashValidationError(409, 'Cashbox already has an open session')
        }

        const openingFloatStr = toMoneyString(input?.openingFloat) ?? '0'
        const openingFloat = toDecimal(openingFloatStr)
        if (openingFloat.isNegative()) throw new CashValidationError(400, 'openingFloat must be >= 0')

        const note = toTrimmedString(input?.note)

        return prisma.cashSession.create({
            data: {
                tenantId,
                cashboxId,
                status: 'OPEN',
                openingFloat,
                note,
                openedByUserId: actor?.userId ?? null
            }
        })
    }

    async listSessions(
        tenantId: string,
        filters?: { cashboxId?: string; status?: string; startDate?: string; endDate?: string }
    ): Promise<CashSessionSummary[]> {
        const where: any = { tenantId }
        const cashboxId = filters?.cashboxId ? String(filters.cashboxId).trim() : ''
        if (cashboxId) where.cashboxId = cashboxId
        const status = filters?.status ? String(filters.status).trim().toUpperCase() : ''
        if (status) where.status = status

        if (filters?.startDate || filters?.endDate) {
            where.openedAt = {}
            if (filters.startDate) {
                const start = new Date(filters.startDate)
                start.setHours(0, 0, 0, 0)
                where.openedAt.gte = start
            }
            if (filters.endDate) {
                const end = new Date(filters.endDate)
                end.setHours(23, 59, 59, 999)
                where.openedAt.lte = end
            }
        }

        return prisma.cashSession.findMany({
            where,
            orderBy: { openedAt: 'desc' },
            take: 200,
            select: {
                id: true,
                cashboxId: true,
                status: true,
                openingFloat: true,
                openedAt: true,
                closedAt: true,
                closingCount: true,
                expectedClosing: true,
                difference: true,
                note: true
            }
        })
    }

    private async computeSessionExpectedClosing(tenantId: string, sessionId: string) {
        const session = await prisma.cashSession.findFirst({
            where: { tenantId, id: sessionId },
            select: { id: true, openingFloat: true }
        })
        if (!session) throw new CashValidationError(404, 'Cash session not found')

        const sums = await prisma.cashTransaction.groupBy({
            by: ['direction'],
            where: { tenantId, sessionId },
            _sum: { amount: true }
        })

        const inSum = sums.find((s) => s.direction === 'IN')?._sum.amount ?? new Prisma.Decimal(0)
        const outSum = sums.find((s) => s.direction === 'OUT')?._sum.amount ?? new Prisma.Decimal(0)

        return {
            openingFloat: session.openingFloat,
            inSum: new Prisma.Decimal(inSum),
            outSum: new Prisma.Decimal(outSum),
            expectedClosing: session.openingFloat.add(inSum).sub(outSum)
        }
    }

    async getSessionExpectedClosing(tenantId: string, sessionId: string) {
        const computed = await this.computeSessionExpectedClosing(tenantId, sessionId)
        return {
            sessionId,
            openingFloat: computed.openingFloat,
            inSum: computed.inSum,
            outSum: computed.outSum,
            expectedClosing: computed.expectedClosing
        }
    }

    async closeSession(tenantId: string, sessionId: string, input: any, actor?: { userId?: string | null }) {
        const session = await prisma.cashSession.findFirst({
            where: { tenantId, id: sessionId },
            select: { id: true, status: true }
        })
        if (!session) throw new CashValidationError(404, 'Cash session not found')
        if (session.status !== 'OPEN') throw new CashValidationError(409, 'Cash session is not open')

        const closingCountStr = toMoneyString(input?.closingCount)
        if (!closingCountStr) throw new CashValidationError(400, 'closingCount is required')
        const closingCount = toDecimal(closingCountStr)
        if (closingCount.isNegative()) throw new CashValidationError(400, 'closingCount must be >= 0')

        const note = toTrimmedString(input?.note)

        const computed = await this.computeSessionExpectedClosing(tenantId, sessionId)
        const expectedClosing = computed.expectedClosing
        const difference = closingCount.sub(expectedClosing)

        return prisma.cashSession.update({
            where: { tenantId_id: { tenantId, id: sessionId } },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                closingCount,
                expectedClosing,
                difference,
                note,
                closedByUserId: actor?.userId ?? null
            }
        })
    }

    private async requireOpenSession(tenantId: string, cashboxId: string) {
        const session = await prisma.cashSession.findFirst({
            where: { tenantId, cashboxId, status: 'OPEN' },
            orderBy: { openedAt: 'desc' },
            select: { id: true }
        })
        if (!session) throw new CashValidationError(409, 'Cashbox has no open session')
        return session
    }

    async listTransactions(
        tenantId: string,
        filters?: {
            cashboxId?: string
            sessionId?: string
            type?: string
            direction?: string
            startDate?: string
            endDate?: string
        }
    ): Promise<CashTransactionSummary[]> {
        const where: any = { tenantId }
        const cashboxId = filters?.cashboxId ? String(filters.cashboxId).trim() : ''
        if (cashboxId) where.cashboxId = cashboxId
        const sessionId = filters?.sessionId ? String(filters.sessionId).trim() : ''
        if (sessionId) where.sessionId = sessionId

        const direction = filters?.direction ? String(filters.direction).trim().toUpperCase() : ''
        if (direction) where.direction = direction

        const type = filters?.type ? String(filters.type).trim().toUpperCase() : ''
        if (type) where.type = type

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

        return prisma.cashTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 500,
            select: {
                id: true,
                cashboxId: true,
                sessionId: true,
                direction: true,
                type: true,
                amount: true,
                currency: true,
                method: true,
                customerId: true,
                supplierId: true,
                saleId: true,
                orderId: true,
                purchaseOrderId: true,
                expenseCategory: true,
                transferGroupId: true,
                reference: true,
                note: true,
                createdByUserId: true,
                createdAt: true
            }
        })
    }

    async createTransaction(tenantId: string, input: any, actor?: { userId?: string | null }) {
        const cashboxId = toTrimmedString(input?.cashboxId)
        if (!cashboxId) throw new CashValidationError(400, 'cashboxId is required')

        const cashbox = await prisma.cashbox.findFirst({ where: { tenantId, id: cashboxId }, select: { id: true } })
        if (!cashbox) throw new CashValidationError(404, 'Cashbox not found')

        const session = await this.requireOpenSession(tenantId, cashboxId)

        const type = normalizeTransactionType(input?.type)
        const policy = typePolicy(type)
        if (!policy) throw new CashValidationError(400, 'Invalid type')

        const direction = normalizeDirection(input?.direction)
        if (direction !== policy.direction) {
            throw new CashValidationError(400, `Invalid direction for type ${type}`)
        }

        const amountStr = toMoneyString(input?.amount)
        if (!amountStr) throw new CashValidationError(400, 'amount is required')
        const amount = toDecimal(amountStr)
        if (!amount.isFinite() || amount.lte(0)) throw new CashValidationError(400, 'amount must be > 0')

        const currency = (toTrimmedString(input?.currency) ?? 'DZD').slice(0, 8).toUpperCase()
        const method = normalizeMethod(input?.method).slice(0, 16)

        const customerId = toTrimmedString(input?.customerId)
        const supplierId = toTrimmedString(input?.supplierId)
        const saleId = toTrimmedString(input?.saleId)
        const orderId = toTrimmedString(input?.orderId)
        const purchaseOrderId = toTrimmedString(input?.purchaseOrderId)
        const expenseCategory = toTrimmedString(input?.expenseCategory)

        if (policy.needs.includes('customer') && !customerId) throw new CashValidationError(400, 'customerId is required')
        if (policy.needs.includes('supplier') && !supplierId) throw new CashValidationError(400, 'supplierId is required')
        if (policy.needs.includes('category') && !expenseCategory) throw new CashValidationError(400, 'expenseCategory is required')

        if (customerId) {
            const exists = await prisma.customer.findFirst({ where: { tenantId, id: customerId }, select: { id: true } })
            if (!exists) throw new CashValidationError(400, 'Invalid customer')
        }
        if (supplierId) {
            const exists = await prisma.supplier.findFirst({ where: { tenantId, id: supplierId }, select: { id: true } })
            if (!exists) throw new CashValidationError(400, 'Invalid supplier')
        }
        if (saleId) {
            const exists = await prisma.sale.findFirst({ where: { tenantId, id: saleId }, select: { id: true } })
            if (!exists) throw new CashValidationError(400, 'Invalid sale')
        }
        if (orderId) {
            const exists = await prisma.order.findFirst({ where: { tenantId, id: orderId }, select: { id: true } })
            if (!exists) throw new CashValidationError(400, 'Invalid order')
        }
        if (purchaseOrderId) {
            const exists = await prisma.purchaseOrder.findFirst({ where: { tenantId, id: purchaseOrderId }, select: { id: true } })
            if (!exists) throw new CashValidationError(400, 'Invalid purchase order')
        }

        const reference = toTrimmedString(input?.reference)?.slice(0, 64) ?? null
        const note = toTrimmedString(input?.note)?.slice(0, 500) ?? null

        return prisma.$transaction(async (tx) => {
            const created = await tx.cashTransaction.create({
                data: {
                    tenantId,
                    cashboxId,
                    sessionId: session.id,
                    direction,
                    type,
                    amount,
                    currency,
                    method,
                    customerId,
                    supplierId,
                    saleId,
                    orderId,
                    purchaseOrderId,
                    expenseCategory,
                    reference,
                    note,
                    createdByUserId: actor?.userId ?? null
                }
            })

            await mirrorCashTransactionToPayments(tx, tenantId, created)
            return created
        })
    }

    async transfer(tenantId: string, input: any, actor?: { userId?: string | null }) {
        const fromCashboxId = toTrimmedString(input?.fromCashboxId)
        const toCashboxId = toTrimmedString(input?.toCashboxId)
        if (!fromCashboxId) throw new CashValidationError(400, 'fromCashboxId is required')
        if (!toCashboxId) throw new CashValidationError(400, 'toCashboxId is required')
        if (fromCashboxId === toCashboxId) throw new CashValidationError(400, 'fromCashboxId and toCashboxId must differ')

        const amountStr = toMoneyString(input?.amount)
        if (!amountStr) throw new CashValidationError(400, 'amount is required')
        const amount = toDecimal(amountStr)
        if (!amount.isFinite() || amount.lte(0)) throw new CashValidationError(400, 'amount must be > 0')

        const [fromCashbox, toCashbox] = await Promise.all([
            prisma.cashbox.findFirst({ where: { tenantId, id: fromCashboxId }, select: { id: true } }),
            prisma.cashbox.findFirst({ where: { tenantId, id: toCashboxId }, select: { id: true } })
        ])
        if (!fromCashbox) throw new CashValidationError(404, 'Source cashbox not found')
        if (!toCashbox) throw new CashValidationError(404, 'Destination cashbox not found')

        const [fromSession, toSession] = await Promise.all([
            this.requireOpenSession(tenantId, fromCashboxId),
            this.requireOpenSession(tenantId, toCashboxId)
        ])

        const currency = (toTrimmedString(input?.currency) ?? 'DZD').slice(0, 8).toUpperCase()
        const reference = toTrimmedString(input?.reference)?.slice(0, 64) ?? null
        const note = toTrimmedString(input?.note)?.slice(0, 500) ?? null
        const transferGroupId = randomUUID()

        const [outTx, inTx] = await prisma.$transaction([
            prisma.cashTransaction.create({
                data: {
                    tenantId,
                    cashboxId: fromCashboxId,
                    sessionId: fromSession.id,
                    direction: 'OUT',
                    type: 'TRANSFER',
                    amount,
                    currency,
                    method: 'TRANSFER',
                    transferGroupId,
                    reference,
                    note,
                    createdByUserId: actor?.userId ?? null
                }
            }),
            prisma.cashTransaction.create({
                data: {
                    tenantId,
                    cashboxId: toCashboxId,
                    sessionId: toSession.id,
                    direction: 'IN',
                    type: 'TRANSFER',
                    amount,
                    currency,
                    method: 'TRANSFER',
                    transferGroupId,
                    reference,
                    note,
                    createdByUserId: actor?.userId ?? null
                }
            })
        ])

        return { transferGroupId, outTx, inTx }
    }
}
