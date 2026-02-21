import type { Prisma, PrismaClient } from '@prisma/client'

export type DbClient = Prisma.TransactionClient | PrismaClient

const toTrimmedString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null
    const v = value.trim()
    return v ? v : null
}

export async function resolveCashboxIdForActor(
    db: DbClient,
    tenantId: string,
    actorUserId?: string | null
): Promise<string | null> {
    const userId = toTrimmedString(actorUserId)
    if (userId) {
        const user = await db.user.findFirst({
            where: { tenantId, id: userId, isActive: true },
            select: { cashboxId: true }
        })

        const assigned = toTrimmedString(user?.cashboxId)
        if (assigned) {
            const cashbox = await db.cashbox.findFirst({
                where: { tenantId, id: assigned, isActive: true },
                select: { id: true }
            })
            if (cashbox) return cashbox.id
        }
    }

    const settings = await db.storeSettings.findUnique({
        where: { tenantId },
        select: { defaultCashboxId: true }
    })
    const systemDefault = toTrimmedString(settings?.defaultCashboxId)
    if (systemDefault) {
        const cashbox = await db.cashbox.findFirst({
            where: { tenantId, id: systemDefault, isActive: true },
            select: { id: true }
        })
        if (cashbox) return cashbox.id
    }

    const fallback = await db.cashbox.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
    })
    return fallback?.id ?? null
}

export async function resolveCashboxId(
    db: DbClient,
    tenantId: string,
    requestedCashboxId: unknown,
    actorUserId?: string | null
): Promise<string | null> {
    const explicit = toTrimmedString(requestedCashboxId)
    if (explicit) return explicit
    return resolveCashboxIdForActor(db, tenantId, actorUserId)
}

