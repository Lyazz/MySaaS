import type { NextFunction, Request, Response } from 'express'
import { requireStaffPermission } from '../../middleware/staff-permissions.middleware'

const requireCashCreate = requireStaffPermission('cash', 'create')

const hasMeaningfulPaymentRequest = (payment: any): boolean => {
    if (!payment || typeof payment !== 'object') return false

    const mode = typeof payment.mode === 'string' ? payment.mode.trim().toLowerCase() : ''
    if (mode === 'full' || mode === 'partial') return true

    const amount = payment.amount
    if (amount === undefined || amount === null) return false
    if (typeof amount === 'number') return Number.isFinite(amount) && amount > 0
    if (typeof amount === 'string') return amount.trim().length > 0
    return false
}

export async function requireCashCreateIfSupplierPaymentRequested(req: Request, res: Response, next: NextFunction) {
    const payment = (req.body as any)?.payment
    if (!hasMeaningfulPaymentRequest(payment)) return next()
    return requireCashCreate(req, res, next)
}

