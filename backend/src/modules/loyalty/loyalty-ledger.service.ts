import { Prisma } from '@prisma/client'
import type { CustomerPointsDirection, CustomerPointsSourceType, CustomerPointsStatus } from '@prisma/client'
import prisma from '../../lib/prisma'
import { PhoneNormalizationService } from './phone-normalization.service'

type TxLike = Prisma.TransactionClient | typeof prisma

type EnsureCustomerInput = {
    tenantId: string
    phone: unknown
    name?: string | null
    address?: string | null
    email?: string | null
    createIfMissing?: boolean
}

export class LoyaltyLedgerService {
    private phone = new PhoneNormalizationService()

    async ensureCustomerByPhone(tx: TxLike, input: EnsureCustomerInput) {
        const normalized = this.phone.normalizeAlgerianPhone(input.phone, 'Customer phone')
        const existing = await tx.customer.findUnique({
            where: {
                tenantId_phoneNormalized: {
                    tenantId: input.tenantId,
                    phoneNormalized: normalized.normalized
                }
            }
        })

        const nextName = typeof input.name === 'string' ? input.name.trim() : ''
        const nextAddress = typeof input.address === 'string' ? input.address.trim() : ''
        const nextEmail = typeof input.email === 'string' ? input.email.trim() : ''

        if (existing) {
            const patch: Record<string, unknown> = {}
            if (!existing.phoneRaw || existing.phoneRaw !== normalized.raw) {
                patch.phoneRaw = normalized.raw
            }
            if (existing.phone !== normalized.raw) {
                patch.phone = normalized.raw
            }
            if (!existing.name && nextName) patch.name = nextName
            if (!existing.address && nextAddress) patch.address = nextAddress
            if (!existing.email && nextEmail) patch.email = nextEmail

            if (Object.keys(patch).length > 0) {
                return tx.customer.update({
                    where: { tenantId_id: { tenantId: input.tenantId, id: existing.id } },
                    data: patch
                })
            }
            return existing
        }

        if (input.createIfMissing === false) return null

        return tx.customer.create({
            data: {
                tenantId: input.tenantId,
                name: nextName || 'Client',
                phone: normalized.raw,
                phoneRaw: normalized.raw,
                phoneNormalized: normalized.normalized,
                email: nextEmail || null,
                address: nextAddress || null
            }
        })
    }

    async findCustomerByPhone(tx: TxLike, tenantId: string, phone: unknown) {
        const normalized = this.phone.normalizeAlgerianPhone(phone, 'Customer phone')
        return tx.customer.findUnique({
            where: {
                tenantId_phoneNormalized: {
                    tenantId,
                    phoneNormalized: normalized.normalized
                }
            }
        })
    }

    async listCustomerPoints(tx: TxLike, tenantId: string, customerId: string, limit = 200) {
        return tx.customerPointsLedger.findMany({
            where: { tenantId, customerId },
            orderBy: { createdAt: 'desc' },
            take: limit
        })
    }

    async getCustomerPointsSummary(tx: TxLike, tenantId: string, customerId: string) {
        const rows = await tx.customerPointsLedger.findMany({
            where: { tenantId, customerId },
            orderBy: { createdAt: 'desc' }
        })

        const totals = rows.reduce(
            (acc, row) => {
                if ((row.direction === 'EARN' || row.direction === 'ADJUST') && row.status === 'AVAILABLE') {
                    acc.availableCredits += row.points
                }
                if (row.direction === 'REDEEM' && (row.status === 'PENDING' || row.status === 'CONSUMED')) {
                    acc.blockedRedemptions += row.points
                }
                if (row.direction === 'REDEEM' && row.status === 'PENDING') {
                    acc.pendingRedeemPoints += row.points
                }
                if (row.direction === 'EARN' && row.status === 'AVAILABLE') {
                    acc.earnedPointsTotal += row.points
                }
                if (row.direction === 'REDEEM' && row.status === 'CONSUMED') {
                    acc.redeemedPointsTotal += row.points
                }
                return acc
            },
            {
                availableCredits: 0,
                blockedRedemptions: 0,
                pendingRedeemPoints: 0,
                earnedPointsTotal: 0,
                redeemedPointsTotal: 0
            }
        )

        return {
            availablePoints: totals.availableCredits - totals.blockedRedemptions,
            pendingRedeemPoints: totals.pendingRedeemPoints,
            earnedPointsTotal: totals.earnedPointsTotal,
            redeemedPointsTotal: totals.redeemedPointsTotal
        }
    }

    async getCustomerPointsDetails(tx: TxLike, tenantId: string, customerId: string) {
        const [summary, items] = await Promise.all([
            this.getCustomerPointsSummary(tx, tenantId, customerId),
            this.listCustomerPoints(tx, tenantId, customerId)
        ])

        return {
            summary,
            items
        }
    }

    async createLedgerEntry(
        tx: TxLike,
        input: {
            tenantId: string
            customerId: string
            direction: CustomerPointsDirection
            status: CustomerPointsStatus
            sourceType: CustomerPointsSourceType
            sourceId: string
            points: number
            saleId?: string | null
            orderId?: string | null
            formulaSnapshot?: Prisma.InputJsonValue | null
            createdByUserId?: string | null
        }
    ) {
        if (!Number.isInteger(input.points) || input.points === 0) return null

        const existing = await tx.customerPointsLedger.findUnique({
            where: {
                tenantId_sourceType_sourceId_direction: {
                    tenantId: input.tenantId,
                    sourceType: input.sourceType,
                    sourceId: input.sourceId,
                    direction: input.direction
                }
            }
        })

        if (existing) return existing

        return tx.customerPointsLedger.create({
            data: {
                tenantId: input.tenantId,
                customerId: input.customerId,
                direction: input.direction,
                status: input.status,
                sourceType: input.sourceType,
                sourceId: input.sourceId,
                points: input.points,
                saleId: input.saleId ?? null,
                orderId: input.orderId ?? null,
                formulaSnapshot:
                    input.formulaSnapshot === undefined
                        ? undefined
                        : input.formulaSnapshot === null
                            ? Prisma.DbNull
                            : input.formulaSnapshot,
                createdByUserId: input.createdByUserId ?? null
            }
        })
    }

    async consumePendingOrderRedemption(
        tx: TxLike,
        input: { tenantId: string; orderId: string; saleId: string }
    ) {
        const pending = await tx.customerPointsLedger.findUnique({
            where: {
                tenantId_sourceType_sourceId_direction: {
                    tenantId: input.tenantId,
                    sourceType: 'ORDER',
                    sourceId: input.orderId,
                    direction: 'REDEEM'
                }
            }
        })

        if (!pending || pending.status !== 'PENDING') return pending

        return tx.customerPointsLedger.update({
            where: { tenantId_id: { tenantId: input.tenantId, id: pending.id } },
            data: {
                status: 'CONSUMED',
                saleId: input.saleId
            }
        })
    }

    async cancelPendingOrderRedemption(tx: TxLike, tenantId: string, orderId: string) {
        const pending = await tx.customerPointsLedger.findUnique({
            where: {
                tenantId_sourceType_sourceId_direction: {
                    tenantId,
                    sourceType: 'ORDER',
                    sourceId: orderId,
                    direction: 'REDEEM'
                }
            }
        })

        if (!pending || pending.status !== 'PENDING') return pending

        return tx.customerPointsLedger.update({
            where: { tenantId_id: { tenantId, id: pending.id } },
            data: { status: 'CANCELLED' }
        })
    }
}
