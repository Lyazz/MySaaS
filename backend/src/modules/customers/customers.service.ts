import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'

export class CustomerValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

export interface CustomersListFilters {
    search?: string
}

export interface CustomerSummary {
    id: string
    phone: string
    name: string
    email: string | null
    address: string | null
    openingBalance: number
    ordersCount: number
    totalSpent: number
    totalPaid: number
    currentBalance: number
    lastOrderAt: Date | null
    lastOrderId: string | null
}

const decToNumber = (value: any) => {
    if (value === undefined || value === null) return 0
    return Number(String(value || 0))
}

const toMoneyString = (value: unknown): string | null => {
    if (value === undefined || value === null) return null
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string' && value.trim()) return value.trim()
    return null
}

export class CustomersService {
    async list(tenantId: string, filters: CustomersListFilters): Promise<CustomerSummary[]> {
        const search = filters.search?.trim()

        const customers = await prisma.customer.findMany({
            where: {
                tenantId,
                ...(search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { phone: { contains: search } },
                            { email: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                    : {})
            },
            orderBy: { updatedAt: 'desc' },
            take: 200,
            select: {
                id: true,
                phone: true,
                name: true,
                email: true,
                address: true,
                openingBalance: true
            }
        })

        if (customers.length === 0) return []

        const customerIds = customers.map((c) => c.id)

        const [stats, lastSales, paid] = await Promise.all([
            prisma.sale.groupBy({
                by: ['customerId'],
                where: { tenantId, status: 'COMPLETED', customerId: { in: customerIds } },
                _count: { _all: true },
                _sum: { totalAmount: true },
                _max: { createdAt: true }
            }),
            prisma.sale.findMany({
                where: { tenantId, status: 'COMPLETED', customerId: { in: customerIds } },
                orderBy: { createdAt: 'desc' },
                distinct: ['customerId'],
                select: { id: true, customerId: true, createdAt: true }
            }),
            prisma.customerPayment.groupBy({
                by: ['customerId'],
                where: { tenantId, customerId: { in: customerIds } },
                _sum: { amount: true }
            })
        ])

        const statsById = new Map(
            stats.map((s) => [
                s.customerId as string,
                { count: s._count._all, total: s._sum.totalAmount ?? 0, lastAt: s._max.createdAt ?? null }
            ])
        )
        const lastById = new Map(lastSales.map((o) => [o.customerId as string, { id: o.id, at: o.createdAt }]))
        const paidById = new Map(paid.map((p) => [p.customerId as string, decToNumber(p._sum.amount)]))

        return customers.map((c) => {
            const stat = statsById.get(c.id) ?? { count: 0, total: 0, lastAt: null }
            const last = lastById.get(c.id) ?? { id: null, at: null }
            const opening = decToNumber(c.openingBalance)
            const totalPaid = paidById.get(c.id) ?? 0
            const currentBalance = opening + stat.total - totalPaid

            return {
                id: c.id,
                phone: c.phone,
                name: c.name,
                email: c.email ?? null,
                address: c.address ?? null,
                openingBalance: opening,
                ordersCount: stat.count,
                totalSpent: stat.total,
                totalPaid,
                currentBalance,
                lastOrderAt: stat.lastAt ?? last.at,
                lastOrderId: last.id
            }
        })
    }

    async getById(tenantId: string, id: string) {
        const customer = await prisma.customer.findUnique({
            where: { tenantId_id: { tenantId, id } },
            select: { id: true, phone: true, name: true, email: true, address: true, openingBalance: true }
        })

        const sales = await prisma.sale.findMany({
            where: { tenantId, status: 'COMPLETED', customerId: id },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                status: true,
                totalAmount: true,
                customerName: true,
                customerPhone: true,
                customerAddress: true,
                createdAt: true,
                updatedAt: true
            }
        })

        const payments = await prisma.customerPayment.findMany({
            where: { tenantId, customerId: id },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                amount: true,
                currency: true,
                method: true,
                reference: true,
                note: true,
                saleId: true,
                createdAt: true
            }
        })

        const opening = customer ? decToNumber(customer.openingBalance) : 0
        const totalSales = sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0)
        const totalPaid = payments.reduce((sum, p) => sum + decToNumber(p.amount), 0)
        const currentBalance = opening + totalSales - totalPaid

        const summary = customer
            ? {
                id: customer.id,
                phone: customer.phone,
                name: customer.name,
                email: customer.email ?? null,
                address: customer.address ?? null,
                openingBalance: opening,
                currentBalance,
                lastSaleAt: sales[0]?.createdAt ?? null,
                lastSaleId: sales[0]?.id ?? null
            }
            : null

        return { summary, sales, payments }
    }

    async getByPhone(tenantId: string, phone: string) {
        const customer = await prisma.customer.findUnique({
            where: { tenantId_phone: { tenantId, phone } },
            select: { id: true, phone: true, name: true, email: true, address: true, openingBalance: true }
        })

        const sales = await prisma.sale.findMany({
            where: { tenantId, status: 'COMPLETED', customerId: customer?.id ?? '__nope__' },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                status: true,
                totalAmount: true,
                customerName: true,
                customerPhone: true,
                customerAddress: true,
                createdAt: true,
                updatedAt: true
            }
        })

        const payments = await prisma.customerPayment.findMany({
            where: { tenantId, customerId: customer?.id ?? '__nope__' },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                amount: true,
                currency: true,
                method: true,
                reference: true,
                note: true,
                saleId: true,
                createdAt: true
            }
        })

        const opening = customer ? decToNumber(customer.openingBalance) : 0
        const totalSales = sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0)
        const totalPaid = payments.reduce((sum, p) => sum + decToNumber(p.amount), 0)
        const currentBalance = opening + totalSales - totalPaid

        const summary = customer
            ? {
                id: customer.id,
                phone: customer.phone,
                name: customer.name,
                email: customer.email ?? null,
                address: customer.address ?? null,
                openingBalance: opening,
                currentBalance,
                lastSaleAt: sales[0]?.createdAt ?? null,
                lastSaleId: sales[0]?.id ?? null
            }
            : null

        return { summary, sales, payments }
    }

    async create(tenantId: string, input: any) {
        const name = typeof input?.name === 'string' ? input.name.trim() : ''
        const phone = typeof input?.phone === 'string' ? input.phone.trim() : ''
        if (!name) throw new CustomerValidationError(400, 'Name is required')
        if (!phone) throw new CustomerValidationError(400, 'Phone is required')

        const email = typeof input?.email === 'string' ? input.email.trim() : ''
        const address = typeof input?.address === 'string' ? input.address.trim() : ''
        const openingBalanceStr = toMoneyString(input?.openingBalance)
        const openingBalance = openingBalanceStr ? new Prisma.Decimal(openingBalanceStr) : new Prisma.Decimal(0)

        try {
            return await prisma.customer.create({
                data: {
                    tenantId,
                    name,
                    phone,
                    email: email || null,
                    address: address || null,
                    openingBalance
                }
            })
        } catch (error: any) {
            if (error?.code === 'P2002') {
                const target = error.meta?.target
                if (Array.isArray(target)) {
                    if (target.includes('phone')) {
                        throw new CustomerValidationError(409, 'A customer with this phone number already exists')
                    }
                    if (target.includes('email')) {
                        throw new CustomerValidationError(409, 'A customer with this email already exists')
                    }
                }
                throw new CustomerValidationError(409, 'Customer already exists')
            }
            throw error
        }
    }

    async update(tenantId: string, id: string, input: any) {
        const existing = await prisma.customer.findUnique({ where: { tenantId_id: { tenantId, id } }, select: { id: true } })
        if (!existing) throw new CustomerValidationError(404, 'Customer not found')

        const name = input?.name !== undefined ? (typeof input.name === 'string' ? input.name.trim() : '') : undefined
        const phone = input?.phone !== undefined ? (typeof input.phone === 'string' ? input.phone.trim() : '') : undefined
        if (name !== undefined && !name) throw new CustomerValidationError(400, 'Name is required')
        if (phone !== undefined && !phone) throw new CustomerValidationError(400, 'Phone is required')

        const email = input?.email !== undefined ? (typeof input.email === 'string' ? input.email.trim() || null : null) : undefined
        const address = input?.address !== undefined ? (typeof input.address === 'string' ? input.address.trim() || null : null) : undefined

        try {
            await prisma.customer.update({
                where: { tenantId_id: { tenantId, id } },
                data: {
                    name,
                    phone,
                    email,
                    address
                }
            })
        } catch (error: any) {
            if (error?.code === 'P2002') throw new CustomerValidationError(409, 'Customer already exists')
            throw error
        }

        return prisma.customer.findUnique({
            where: { tenantId_id: { tenantId, id } },
            select: { id: true, phone: true, name: true, email: true, address: true, openingBalance: true }
        })
    }
}

