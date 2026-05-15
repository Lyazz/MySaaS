import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import prisma from '../../lib/prisma'
import { mirrorCashTransactionToPayments } from '../payments/payment-mirror'
import { resolveCashboxId, type DbClient } from './cashbox-resolver'

export class CashValidationError extends Error {
    statusCode: number
    statusMessage: string
    code?: string
    meta?: Record<string, any>

    constructor(statusCode: number, statusMessage: string, opts?: { code?: string; meta?: Record<string, any> }) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
        this.code = opts?.code
        this.meta = opts?.meta
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
    openedByUserId: string | null
    closedByUserId: string | null
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

export type CashUserSummary = {
    id: string
    email: string
    role: string
    isActive: boolean
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
        case 'SALE_REFUND':
            return { direction: 'OUT', needs: [] }
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
        filters?: { cashboxId?: string; status?: string; startDate?: string; endDate?: string; userId?: string; page?: number; limit?: number }
    ): Promise<{ items: CashSessionSummary[]; total: number; page: number; totalPages: number }> {
        const where: any = { tenantId }
        const cashboxId = filters?.cashboxId ? String(filters.cashboxId).trim() : ''
        if (cashboxId) where.cashboxId = cashboxId
        const status = filters?.status ? String(filters.status).trim().toUpperCase() : ''
        if (status) where.status = status

        const userId = filters?.userId ? String(filters.userId).trim() : ''
        if (userId) {
            where.OR = [{ openedByUserId: userId }, { closedByUserId: userId }]
        }

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

        const page = Math.max(1, filters?.page ?? 1)
        const limit = Math.min(100, Math.max(1, filters?.limit ?? 25))
        const skip = (page - 1) * limit

        const [items, total] = await Promise.all([
            prisma.cashSession.findMany({
                where,
                orderBy: { openedAt: 'desc' },
                skip,
                take: limit,
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
                    note: true,
                    openedByUserId: true,
                    closedByUserId: true
                }
            }),
            prisma.cashSession.count({ where })
        ])

        return { items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) }
    }

    private async computeSessionExpectedClosing(tenantId: string, sessionId: string) {
        const session = await prisma.cashSession.findFirst({
            where: { tenantId, id: sessionId },
            select: { id: true, openingFloat: true }
        })
        if (!session) throw new CashValidationError(404, 'Cash session not found')

        const sums = await prisma.cashTransaction.groupBy({
            by: ['direction', 'method'],
            where: { tenantId, sessionId },
            _sum: { amount: true }
        })

        const bucket = (value: unknown): 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER' => {
            const v = typeof value === 'string' ? value.trim().toUpperCase() : ''
            if (v === 'CASH') return 'CASH'
            if (v === 'CARD') return 'CARD'
            if (v === 'TRANSFER') return 'TRANSFER'
            return 'OTHER'
        }

        const zero = new Prisma.Decimal(0)
        const inByMethod: Record<'CASH' | 'CARD' | 'TRANSFER' | 'OTHER', Prisma.Decimal> = {
            CASH: zero,
            CARD: zero,
            TRANSFER: zero,
            OTHER: zero
        }
        const outByMethod: Record<'CASH' | 'CARD' | 'TRANSFER' | 'OTHER', Prisma.Decimal> = {
            CASH: zero,
            CARD: zero,
            TRANSFER: zero,
            OTHER: zero
        }

        for (const row of sums) {
            const amountRaw: any = row._sum.amount ?? 0
            const amount = Prisma.Decimal.isDecimal(amountRaw) ? amountRaw : new Prisma.Decimal(amountRaw)
            const method = bucket((row as any).method)
            if (row.direction === 'OUT') {
                outByMethod[method] = outByMethod[method].add(amount)
            } else {
                inByMethod[method] = inByMethod[method].add(amount)
            }
        }

        const inSum = inByMethod.CASH.add(inByMethod.CARD).add(inByMethod.TRANSFER).add(inByMethod.OTHER)
        const outSum = outByMethod.CASH.add(outByMethod.CARD).add(outByMethod.TRANSFER).add(outByMethod.OTHER)

        const expectedCash = session.openingFloat.add(inByMethod.CASH).sub(outByMethod.CASH)
        const expectedCard = inByMethod.CARD.sub(outByMethod.CARD)
        const expectedTransfer = inByMethod.TRANSFER.sub(outByMethod.TRANSFER)
        const expectedOther = inByMethod.OTHER.sub(outByMethod.OTHER)
        const expectedClosing = expectedCash.add(expectedCard).add(expectedTransfer).add(expectedOther)

        return {
            openingFloat: session.openingFloat,
            inSum,
            outSum,
            expectedClosing,
            inByMethod,
            outByMethod,
            expectedByMethod: {
                CASH: expectedCash,
                CARD: expectedCard,
                TRANSFER: expectedTransfer,
                OTHER: expectedOther
            }
        }
    }

    async getSessionExpectedClosing(tenantId: string, sessionId: string) {
        const computed = await this.computeSessionExpectedClosing(tenantId, sessionId)
        return {
            sessionId,
            openingFloat: computed.openingFloat,
            inSum: computed.inSum,
            outSum: computed.outSum,
            expectedClosing: computed.expectedClosing,
            inByMethod: computed.inByMethod,
            outByMethod: computed.outByMethod,
            expectedByMethod: computed.expectedByMethod
        }
    }

    async closeSession(tenantId: string, sessionId: string, input: any, actor?: { userId?: string | null }) {
        const session = await prisma.cashSession.findFirst({
            where: { tenantId, id: sessionId },
            select: { id: true, status: true }
        })
        if (!session) throw new CashValidationError(404, 'Cash session not found')
        if (session.status !== 'OPEN') throw new CashValidationError(409, 'Cash session is not open')

        const hasBreakdown =
            input?.closing !== undefined ||
            input?.closingCash !== undefined ||
            input?.closingCard !== undefined ||
            input?.closingTransfer !== undefined ||
            input?.closingOther !== undefined

        const parseClosingPiece = (value: unknown) => {
            const str = toMoneyString(value)
            if (!str) return null
            const d = toDecimal(str)
            if (d.isNegative()) throw new CashValidationError(400, 'Closing values must be >= 0')
            return d
        }

        const closingCash = hasBreakdown ? (parseClosingPiece(input?.closingCash ?? input?.closing?.cash) ?? new Prisma.Decimal(0)) : null
        const closingCard = hasBreakdown ? (parseClosingPiece(input?.closingCard ?? input?.closing?.card) ?? new Prisma.Decimal(0)) : null
        const closingTransfer = hasBreakdown
            ? (parseClosingPiece(input?.closingTransfer ?? input?.closing?.transfer) ?? new Prisma.Decimal(0))
            : null
        const closingOther = hasBreakdown ? (parseClosingPiece(input?.closingOther ?? input?.closing?.other) ?? new Prisma.Decimal(0)) : null

        const closingCountStr = toMoneyString(input?.closingCount)
        if (!hasBreakdown && !closingCountStr) throw new CashValidationError(400, 'closingCount is required')
        const closingCount = hasBreakdown
            ? (closingCash as Prisma.Decimal).add(closingCard as Prisma.Decimal).add(closingTransfer as Prisma.Decimal).add(closingOther as Prisma.Decimal)
            : toDecimal(closingCountStr as string)
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
                closingCash,
                closingCard,
                closingTransfer,
                closingOther,
                expectedClosing,
                expectedCash: computed.expectedByMethod.CASH,
                expectedCard: computed.expectedByMethod.CARD,
                expectedTransfer: computed.expectedByMethod.TRANSFER,
                expectedOther: computed.expectedByMethod.OTHER,
                difference,
                note,
                closedByUserId: actor?.userId ?? null
            }
        })
    }

    private async requireOpenSession(db: DbClient, tenantId: string, cashboxId: string) {
        const session = await db.cashSession.findFirst({
            where: { tenantId, cashboxId, status: 'OPEN' },
            orderBy: { openedAt: 'desc' },
            select: { id: true }
        })
        if (!session) {
            throw new CashValidationError(409, 'Cashbox has no open session', {
                code: 'CASH_SESSION_REQUIRED',
                meta: { cashboxId }
            })
        }
        return session
    }

    async listTransactions(
        tenantId: string,
        filters?: {
            cashboxId?: string
            sessionId?: string
            type?: string
            direction?: string
            method?: string
            userId?: string
            startDate?: string
            endDate?: string
            page?: number
            limit?: number
        }
    ): Promise<{ items: CashTransactionSummary[]; total: number; page: number; totalPages: number }> {
        const where: any = { tenantId }
        const cashboxId = filters?.cashboxId ? String(filters.cashboxId).trim() : ''
        if (cashboxId) where.cashboxId = cashboxId
        const sessionId = filters?.sessionId ? String(filters.sessionId).trim() : ''
        if (sessionId) where.sessionId = sessionId

        const direction = filters?.direction ? String(filters.direction).trim().toUpperCase() : ''
        if (direction) where.direction = direction

        const type = filters?.type ? String(filters.type).trim().toUpperCase() : ''
        if (type) where.type = type

        const method = filters?.method ? String(filters.method).trim().toUpperCase() : ''
        if (method) where.method = method

        const userId = filters?.userId ? String(filters.userId).trim() : ''
        if (userId) where.createdByUserId = userId

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

        const page = Math.max(1, filters?.page ?? 1)
        const limit = Math.min(100, Math.max(1, filters?.limit ?? 25))
        const skip = (page - 1) * limit

        const [items, total] = await Promise.all([
            prisma.cashTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
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
            }),
            prisma.cashTransaction.count({ where })
        ])

        return { items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) }
    }

    private async createTransactionInternal(tx: Prisma.TransactionClient, tenantId: string, input: any, actor?: { userId?: string | null }) {
        const cashboxId = await resolveCashboxId(tx, tenantId, input?.cashboxId, actor?.userId ?? null)
        if (!cashboxId) {
            throw new CashValidationError(400, 'cashboxId is required', { code: 'CASHBOX_REQUIRED' })
        }

        const cashbox = await tx.cashbox.findFirst({ where: { tenantId, id: cashboxId }, select: { id: true, isActive: true } })
        if (!cashbox) throw new CashValidationError(404, 'Cashbox not found')
        if (!cashbox.isActive) {
            throw new CashValidationError(409, 'Cashbox is inactive', {
                code: 'CASHBOX_INACTIVE',
                meta: { cashboxId }
            })
        }

        const session = await this.requireOpenSession(tx, tenantId, cashboxId)

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
            const exists = await tx.customer.findFirst({ where: { tenantId, id: customerId }, select: { id: true } })
            if (!exists) throw new CashValidationError(400, 'Invalid customer')
        }
        if (supplierId) {
            const exists = await tx.supplier.findFirst({ where: { tenantId, id: supplierId }, select: { id: true } })
            if (!exists) throw new CashValidationError(400, 'Invalid supplier')
        }
        if (saleId) {
            const exists = await tx.sale.findFirst({ where: { tenantId, id: saleId }, select: { id: true } })
            if (!exists) throw new CashValidationError(400, 'Invalid sale')
        }
        if (orderId) {
            const exists = await tx.order.findFirst({ where: { tenantId, id: orderId }, select: { id: true } })
            if (!exists) throw new CashValidationError(400, 'Invalid order')
        }
        if (purchaseOrderId) {
            const exists = await tx.purchaseOrder.findFirst({ where: { tenantId, id: purchaseOrderId }, select: { id: true } })
            if (!exists) throw new CashValidationError(400, 'Invalid purchase order')
        }

        const reference = toTrimmedString(input?.reference)?.slice(0, 64) ?? null
        const note = toTrimmedString(input?.note)?.slice(0, 500) ?? null

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
    }

    async createTransactionInTx(tx: Prisma.TransactionClient, tenantId: string, input: any, actor?: { userId?: string | null }) {
        return this.createTransactionInternal(tx, tenantId, input, actor)
    }

    async createTransaction(tenantId: string, input: any, actor?: { userId?: string | null }) {
        return prisma.$transaction(async (tx) => this.createTransactionInternal(tx, tenantId, input, actor))
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
            this.requireOpenSession(prisma, tenantId, fromCashboxId),
            this.requireOpenSession(prisma, tenantId, toCashboxId)
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

    async listCashUsers(tenantId: string): Promise<CashUserSummary[]> {
        return prisma.user.findMany({
            where: { tenantId, isActive: true },
            orderBy: [{ role: 'asc' }, { email: 'asc' }],
            select: { id: true, email: true, role: true, isActive: true }
        })
    }
}
