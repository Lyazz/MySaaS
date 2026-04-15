import type { Prisma, PrismaClient } from '@prisma/client'
import { Prisma as PrismaNs } from '@prisma/client'

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

export async function ensureActiveCashboxAndOpenSession(
    db: DbClient,
    tenantId: string,
    requestedCashboxId: unknown,
    actorUserId?: string | null
): Promise<{ cashboxId: string; sessionId: string }> {
    const explicit = toTrimmedString(requestedCashboxId)

    const ensureCashboxActive = async (cashboxId: string) => {
        const cashbox = await db.cashbox.findFirst({
            where: { tenantId, id: cashboxId },
            select: { id: true, isActive: true }
        })
        if (!cashbox) return null
        if (!cashbox.isActive) {
            await db.cashbox.update({
                where: { tenantId_id: { tenantId, id: cashboxId } },
                data: { isActive: true }
            })
        }
        return cashbox.id
    }

    let cashboxId: string | null = null

    if (explicit) {
        cashboxId = await ensureCashboxActive(explicit)
        if (!cashboxId) return Promise.reject(new Error('Invalid cashboxId'))
    } else {
        cashboxId = await resolveCashboxIdForActor(db, tenantId, actorUserId)
        if (!cashboxId) {
            const anyCashbox = await db.cashbox.findFirst({
                where: { tenantId },
                orderBy: { createdAt: 'asc' },
                select: { id: true }
            })
            if (anyCashbox) {
                cashboxId = await ensureCashboxActive(anyCashbox.id)
            }
        }

        if (!cashboxId) {
            const created = await db.cashbox.create({
                data: { tenantId, name: 'Main Cashbox', isActive: true }
            })
            cashboxId = created.id

            // Best-effort: set as default cashbox if none set yet.
            const settings = await db.storeSettings.findUnique({
                where: { tenantId },
                select: { defaultCashboxId: true }
            })
            if (!settings?.defaultCashboxId) {
                await db.storeSettings.upsert({
                    where: { tenantId },
                    create: { tenantId, defaultCashboxId: cashboxId },
                    update: { defaultCashboxId: cashboxId }
                })
            }
        }
    }

    const existingOpen = await db.cashSession.findFirst({
        where: { tenantId, cashboxId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
        select: { id: true }
    })
    if (existingOpen) {
        return { cashboxId, sessionId: existingOpen.id }
    }

    const createdSession = await db.cashSession.create({
        data: {
            tenantId,
            cashboxId,
            status: 'OPEN',
            openingFloat: new PrismaNs.Decimal('0'),
            note: 'Auto-opened session',
            openedByUserId: toTrimmedString(actorUserId)
        }
    })

    return { cashboxId, sessionId: createdSession.id }
}
