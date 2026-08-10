import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { PhoneNormalizationService } from '../loyalty/phone-normalization.service'

const phoneNormalization = new PhoneNormalizationService()

export class BlacklistValidationError extends Error {
    statusCode: number
    statusMessage: string
    code?: string

    constructor(statusCode: number, statusMessage: string, code?: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
        this.code = code
    }
}

export type BlacklistEntryType = 'PHONE' | 'CUSTOMER' | 'IP'

const BLACKLIST_TYPES: BlacklistEntryType[] = ['PHONE', 'CUSTOMER', 'IP']

const entryInclude = {
    customer: { select: { id: true, name: true, phone: true } },
    createdBy: { select: { id: true, email: true } }
} satisfies Prisma.BlacklistEntryInclude

export class BlacklistService {
    async list(tenantId: string, filters: { type?: string; search?: string } = {}) {
        const where: Prisma.BlacklistEntryWhereInput = { tenantId }

        if (filters.type && BLACKLIST_TYPES.includes(filters.type as BlacklistEntryType)) {
            where.type = filters.type as BlacklistEntryType
        }

        if (filters.search) {
            where.OR = [
                { value: { contains: filters.search, mode: 'insensitive' } },
                { reason: { contains: filters.search, mode: 'insensitive' } },
                { customer: { name: { contains: filters.search, mode: 'insensitive' } } }
            ]
        }

        return prisma.blacklistEntry.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: entryInclude
        })
    }

    async create(
        tenantId: string,
        input: { type: string; value?: string | null; reason?: string | null; customerId?: string | null },
        actor?: { userId?: string | null }
    ) {
        if (!BLACKLIST_TYPES.includes(input.type as BlacklistEntryType)) {
            throw new BlacklistValidationError(400, 'Invalid blacklist type')
        }
        const type = input.type as BlacklistEntryType

        let value: string
        let customerId: string | null = null

        if (type === 'CUSTOMER') {
            const rawCustomerId = (input.customerId || input.value || '').trim()
            if (!rawCustomerId) throw new BlacklistValidationError(400, 'Customer is required')
            const customer = await prisma.customer.findFirst({
                where: { tenantId, id: rawCustomerId },
                select: { id: true }
            })
            if (!customer) throw new BlacklistValidationError(404, 'Customer not found')
            customerId = customer.id
            value = customer.id
        } else if (type === 'PHONE') {
            const normalized = phoneNormalization.tryNormalizeAlgerianPhone(input.value)?.normalized
            if (!normalized) throw new BlacklistValidationError(400, 'A valid phone number is required')
            value = normalized
        } else {
            value = (input.value || '').trim()
            if (!value) throw new BlacklistValidationError(400, 'A value is required')
        }

        const reason = (input.reason || '').trim() || null

        try {
            return await prisma.blacklistEntry.create({
                data: {
                    tenantId,
                    type,
                    value,
                    reason,
                    customerId,
                    createdByUserId: actor?.userId ?? null
                },
                include: entryInclude
            })
        } catch (error: any) {
            if (error?.code === 'P2002') {
                throw new BlacklistValidationError(409, 'This entry is already blacklisted')
            }
            throw error
        }
    }

    async remove(tenantId: string, id: string) {
        const deleted = await prisma.blacklistEntry.deleteMany({ where: { tenantId, id } })
        if (deleted.count === 0) throw new BlacklistValidationError(404, 'Blacklist entry not found')
        return { id }
    }

    async blacklistFromOrder(
        tenantId: string,
        orderId: string,
        type: string,
        reason: string | undefined,
        actor?: { userId?: string | null }
    ) {
        if (!BLACKLIST_TYPES.includes(type as BlacklistEntryType)) {
            throw new BlacklistValidationError(400, 'Invalid blacklist type')
        }

        const order = await prisma.order.findFirst({
            where: { tenantId, id: orderId },
            select: {
                id: true,
                publicId: true,
                customerId: true,
                customerPhone: true,
                customerPhoneNormalized: true,
                customerIp: true
            }
        })
        if (!order) throw new BlacklistValidationError(404, 'Order not found')

        const defaultReason = (reason || '').trim() || `Blacklisted from order ${order.publicId || order.id}`

        if (type === 'PHONE') {
            const value = order.customerPhoneNormalized || order.customerPhone
            return this.create(tenantId, { type: 'PHONE', value, reason: defaultReason }, actor)
        }

        if (type === 'IP') {
            if (!order.customerIp) {
                throw new BlacklistValidationError(409, 'This order has no recorded IP address')
            }
            return this.create(tenantId, { type: 'IP', value: order.customerIp, reason: defaultReason }, actor)
        }

        // CUSTOMER
        if (!order.customerId) {
            throw new BlacklistValidationError(409, 'This order has no linked customer record')
        }
        return this.create(
            tenantId,
            { type: 'CUSTOMER', value: order.customerId, customerId: order.customerId, reason: defaultReason },
            actor
        )
    }

    /** Read-only check used at checkout time to block fraudulent orders. Returns the matching entry or null. */
    async checkForCheckout(
        tenantId: string,
        input: { phoneNormalized?: string | null; ip?: string | null; customerId?: string | null }
    ) {
        const conditions: Prisma.BlacklistEntryWhereInput[] = []
        if (input.phoneNormalized) conditions.push({ type: 'PHONE', value: input.phoneNormalized })
        if (input.ip) conditions.push({ type: 'IP', value: input.ip })
        if (input.customerId) conditions.push({ type: 'CUSTOMER', value: input.customerId })
        if (conditions.length === 0) return null

        return prisma.blacklistEntry.findFirst({
            where: { tenantId, OR: conditions },
            select: { id: true, type: true }
        })
    }
}
