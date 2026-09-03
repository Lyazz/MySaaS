import type { Prisma } from '@prisma/client'

/**
 * Six demo codes seeded on every new tenant so a merchant lands on
 * Marketing > Codes promo with a working example of each discount shape,
 * rather than an empty screen. Always seeded **inactive** — nothing here is
 * usable at checkout until the merchant reviews and turns one on.
 *
 * {@link seedDefaultPromoCodes} runs this at tenant creation; the same list
 * backfills existing tenants via `backend/scripts/seed-default-promo-codes.ts`.
 */
export type PromoCodePreset = {
    code: string
    description: string
    discountType: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING'
    discountValue: number
    maxDiscountAmount?: number
    minOrderAmount?: number
    usageLimit?: number
    usageLimitPerCustomer?: number
}

export const DEFAULT_PROMO_CODE_PRESETS: PromoCodePreset[] = [
    {
        code: 'WELCOME10',
        description: 'Exemple — 10% sur tout le panier, sans condition.',
        discountType: 'PERCENTAGE',
        discountValue: 10
    },
    {
        code: 'VIP50',
        description: 'Exemple — 50% de remise, plafonnée à 1000 DZD pour limiter le coût par commande.',
        discountType: 'PERCENTAGE',
        discountValue: 50,
        maxDiscountAmount: 1000
    },
    {
        code: 'MOINS500',
        description: 'Exemple — 500 DZD de remise fixe, quel que soit le montant du panier.',
        discountType: 'FIXED',
        discountValue: 500
    },
    {
        code: 'LIVRAISONOFFERTE',
        description: 'Exemple — frais de livraison offerts, prix des articles inchangé.',
        discountType: 'FREE_SHIPPING',
        discountValue: 0
    },
    {
        code: 'GROSSEPCOMMANDE',
        description: 'Exemple — 15% de remise, réservé aux paniers d\'au moins 5000 DZD.',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        minOrderAmount: 5000
    },
    {
        code: 'PREMIERSCLIENTS',
        description: 'Exemple — 20% de remise, utilisable 50 fois au total et une seule fois par client.',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        usageLimit: 50,
        usageLimitPerCustomer: 1
    }
]

/**
 * Creates the preset codes for a tenant, skipping any code that already
 * exists (same string) so this stays safe to call more than once — the
 * tenant-creation transaction runs it once, the backfill script runs it
 * across every tenant already in the database.
 */
export const seedDefaultPromoCodes = async (tx: Prisma.TransactionClient, tenantId: string) => {
    const codes = DEFAULT_PROMO_CODE_PRESETS.map((preset) => preset.code)
    const existing = await tx.promoCode.findMany({
        where: { tenantId, code: { in: codes } },
        select: { code: true }
    })
    const existingCodes = new Set(existing.map((row) => row.code))

    for (const preset of DEFAULT_PROMO_CODE_PRESETS) {
        if (existingCodes.has(preset.code)) continue

        await tx.promoCode.create({
            data: {
                tenantId,
                code: preset.code,
                description: preset.description,
                discountType: preset.discountType,
                discountValue: preset.discountValue,
                maxDiscountAmount: preset.maxDiscountAmount ?? null,
                minOrderAmount: preset.minOrderAmount ?? 0,
                usageLimit: preset.usageLimit ?? null,
                usageLimitPerCustomer: preset.usageLimitPerCustomer ?? null,
                isActive: false
            }
        })
    }
}
