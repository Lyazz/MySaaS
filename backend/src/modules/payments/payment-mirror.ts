import type { CashTransaction, Prisma } from '@prisma/client'

type DbClient = Prisma.TransactionClient

export async function mirrorCashTransactionToPayments(tx: DbClient, tenantId: string, cashTx: CashTransaction) {
    if (cashTx.tenantId !== tenantId) {
        throw new Error('mirrorCashTransactionToPayments: tenant mismatch')
    }

    const canMirrorCustomer =
        cashTx.direction === 'IN' &&
        !!cashTx.customerId &&
        (cashTx.type === 'CUSTOMER_PAYMENT' || cashTx.type === 'SALE_PAYMENT')

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
    }
}

