import { Prisma, type CashTransaction } from '@prisma/client'

type DbClient = Prisma.TransactionClient

export async function mirrorCashTransactionToPayments(tx: DbClient, tenantId: string, cashTx: CashTransaction) {
    if (cashTx.tenantId !== tenantId) {
        throw new Error('mirrorCashTransactionToPayments: tenant mismatch')
    }

    const canMirrorCustomer =
        cashTx.direction === 'IN' &&
        !!cashTx.customerId &&
        (cashTx.type === 'CUSTOMER_PAYMENT' || cashTx.type === 'SALE_PAYMENT' || cashTx.type === 'ORDER_PAYMENT')

    const canMirrorSupplier =
        cashTx.direction === 'OUT' &&
        !!cashTx.supplierId &&
        cashTx.type === 'SUPPLIER_PAYMENT'

    if (canMirrorCustomer) {
        await tx.customerPayment.upsert({
            where: {
                tenantId_cashTransactionId: {
                    tenantId,
                    cashTransactionId: cashTx.id
                }
            },
            create: {
                tenantId,
                customerId: cashTx.customerId!,
                saleId: cashTx.saleId ?? null,
                cashTransactionId: cashTx.id,
                amount: cashTx.amount,
                currency: cashTx.currency,
                method: cashTx.method,
                reference: cashTx.reference ?? null,
                note: cashTx.note ?? null,
                createdByUserId: cashTx.createdByUserId ?? null
            },
            update: {}
        })
    }

    // Update order totals even if there is no customerId
    if (cashTx.direction === 'IN' && cashTx.orderId && (cashTx.type === 'CUSTOMER_PAYMENT' || cashTx.type === 'SALE_PAYMENT' || cashTx.type === 'ORDER_PAYMENT')) {
        const aggs = await tx.cashTransaction.aggregate({
            where: { tenantId, orderId: cashTx.orderId, direction: 'IN', type: { in: ['CUSTOMER_PAYMENT', 'ORDER_PAYMENT', 'SALE_PAYMENT'] } },
            _sum: { amount: true }
        })
        const paidAmount = aggs._sum.amount ? Number(aggs._sum.amount) : 0

        const order = await tx.order.findFirst({
            where: { tenantId, id: cashTx.orderId },
            select: { totalWithShippingAmount: true, totalAmount: true }
        })
        if (order) {
            const total = order.totalWithShippingAmount ?? order.totalAmount
            let paymentStatus = 'UNPAID'
            if (paidAmount > 0) {
                paymentStatus = paidAmount >= total && total > 0 ? 'PAID' : 'PARTIALLY_PAID'
            }
            await tx.order.updateMany({
                where: { tenantId, id: cashTx.orderId },
                data: { paidAmount, paymentStatus }
            })
        }
    }

    if (canMirrorSupplier) {
        await tx.supplierPayment.upsert({
            where: {
                tenantId_cashTransactionId: {
                    tenantId,
                    cashTransactionId: cashTx.id
                }
            },
            create: {
                tenantId,
                supplierId: cashTx.supplierId!,
                purchaseOrderId: cashTx.purchaseOrderId ?? null,
                cashTransactionId: cashTx.id,
                amount: cashTx.amount,
                currency: cashTx.currency,
                method: cashTx.method,
                reference: cashTx.reference ?? null,
                note: cashTx.note ?? null,
                createdByUserId: cashTx.createdByUserId ?? null
            },
            update: {}
        })

        if (cashTx.purchaseOrderId) {
            const aggs = await tx.cashTransaction.aggregate({
                where: { tenantId, purchaseOrderId: cashTx.purchaseOrderId, direction: 'OUT', type: 'SUPPLIER_PAYMENT' },
                _sum: { amount: true }
            })
            const paidAmount = aggs._sum.amount ? new Prisma.Decimal(aggs._sum.amount) : new Prisma.Decimal(0)

            const po = await tx.purchaseOrder.findFirst({
                where: { tenantId, id: cashTx.purchaseOrderId },
                select: { totalAmount: true }
            })
            if (po) {
                const total = new Prisma.Decimal(String(po.totalAmount))
                let paymentStatus = 'UNPAID'
                if (paidAmount.gt(0)) {
                    paymentStatus = paidAmount.gte(total) && total.gt(0) ? 'PAID' : 'PARTIALLY_PAID'
                }
                await tx.purchaseOrder.updateMany({
                    where: { tenantId, id: cashTx.purchaseOrderId },
                    data: { paidAmount, paymentStatus }
                })
            }
        }
    }
}

