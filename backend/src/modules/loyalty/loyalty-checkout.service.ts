import type { Prisma } from '@prisma/client'
import prisma from '../../lib/prisma'
import { LoyaltyLedgerService } from './loyalty-ledger.service'

type TxLike = Prisma.TransactionClient | typeof prisma

type LoyaltySettingsForCheckout = {
    loyaltyEnabled?: boolean | null
    loyaltyMinRedeemPoints?: number | null
    loyaltyRedeemRateDzdPerPoint?: unknown
}

const toNumber = (value: unknown) => {
    if (typeof value === 'number') return value
    if (typeof value === 'string') return Number(value)
    if (value && typeof value === 'object' && 'toString' in value) return Number(String(value))
    return 0
}

export class LoyaltyCheckoutError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusMessage: string) {
        super(statusMessage)
        this.statusCode = 400
        this.statusMessage = statusMessage
    }
}

export class LoyaltyCheckoutService {
    constructor(private ledger = new LoyaltyLedgerService()) {}

    async evaluateRedemption(
        tx: TxLike,
        input: {
            tenantId: string
            customerId: string | null
            requestedPoints?: unknown
            itemsSubtotal: number
            settings: LoyaltySettingsForCheckout | null | undefined
        }
    ) {
        const requestedPoints = Math.max(0, Math.trunc(Number(input.requestedPoints || 0) || 0))
        if (requestedPoints <= 0) {
            const summary = input.customerId
                ? await this.ledger.getCustomerPointsSummary(tx, input.tenantId, input.customerId)
                : { availablePoints: 0, pendingRedeemPoints: 0, earnedPointsTotal: 0, redeemedPointsTotal: 0 }
            return {
                ...summary,
                pointsReserved: 0,
                redeemedAmount: 0
            }
        }

        if (input.settings?.loyaltyEnabled !== true) {
            throw new LoyaltyCheckoutError('Loyalty points are disabled for this store')
        }
        if (!input.customerId) {
            throw new LoyaltyCheckoutError('A recognized customer phone is required to redeem points')
        }

        const summary = await this.ledger.getCustomerPointsSummary(tx, input.tenantId, input.customerId)
        const minRedeemPoints = Math.max(0, Math.trunc(Number(input.settings?.loyaltyMinRedeemPoints || 0) || 0))
        if (summary.availablePoints < minRedeemPoints) {
            throw new LoyaltyCheckoutError(`Minimum ${minRedeemPoints} points required to redeem`)
        }
        if (requestedPoints > summary.availablePoints) {
            throw new LoyaltyCheckoutError('Not enough available points')
        }

        const rate = toNumber(input.settings?.loyaltyRedeemRateDzdPerPoint)
        if (!Number.isFinite(rate) || rate <= 0) {
            throw new LoyaltyCheckoutError('Invalid loyalty redemption rate')
        }

        const maxRedeemablePoints = Math.max(0, Math.floor(input.itemsSubtotal / rate))
        if (maxRedeemablePoints <= 0) {
            throw new LoyaltyCheckoutError('This cart cannot consume loyalty points')
        }

        const pointsReserved = Math.min(requestedPoints, maxRedeemablePoints)
        const redeemedAmount = Number((pointsReserved * rate).toFixed(2))

        return {
            ...summary,
            pointsReserved,
            redeemedAmount
        }
    }

    async createPendingOrderRedemption(
        tx: TxLike,
        input: {
            tenantId: string
            customerId: string
            orderId: string
            pointsReserved: number
            redeemedAmount: number
            createdByUserId?: string | null
            rateDzdPerPoint: number
        }
    ) {
        if (!Number.isInteger(input.pointsReserved) || input.pointsReserved <= 0) return null

        return this.ledger.createLedgerEntry(tx, {
            tenantId: input.tenantId,
            customerId: input.customerId,
            direction: 'REDEEM',
            status: 'PENDING',
            sourceType: 'ORDER',
            sourceId: input.orderId,
            points: input.pointsReserved,
            orderId: input.orderId,
            createdByUserId: input.createdByUserId ?? null,
            formulaSnapshot: {
                redeemedAmount: input.redeemedAmount,
                rateDzdPerPoint: input.rateDzdPerPoint
            }
        })
    }
}

