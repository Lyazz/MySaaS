// Backfills the 6 demo promo codes (see backend/src/modules/promo-codes/presets.ts)
// onto every tenant that does not already have them. New tenants get these codes
// automatically at signup (auth.service.ts / tenants/routes.ts) — this script is
// only for tenants created before that existed.
//
// Idempotent: per tenant, a code string that already exists (created by this
// script, by a previous run, or by the merchant themselves) is left untouched —
// only missing codes are created, always with isActive: false.
//
// Usage:
//   node scripts/seed-default-promo-codes.mjs [--dry-run] [--only=slug1,slug2]
//
// Against a different database (e.g. production) than the one DATABASE_URL
// already points at:
//   PROD_DATABASE_URL=postgres://... node scripts/seed-default-promo-codes.mjs
import { PrismaClient } from '@prisma/client'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const ONLY = (args.find((a) => a.startsWith('--only='))?.slice('--only='.length) || '')
    .split(',').map((s) => s.trim()).filter(Boolean)

const DB_URL = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL
const prisma = DB_URL ? new PrismaClient({ datasources: { db: { url: DB_URL } } }) : new PrismaClient()

// Trimmed copy of backend/src/modules/promo-codes/presets.ts (that file is
// TypeScript and can't be imported from this plain ESM script). Keep in sync.
const DEFAULT_PROMO_CODE_PRESETS = [
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
        description: "Exemple — 15% de remise, réservé aux paniers d'au moins 5000 DZD.",
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

async function main() {
    console.log(`DB: ${DB_URL ? DB_URL.replace(/:[^:@]*@/, ':***@') : '(default DATABASE_URL from env)'}`)
    if (DRY_RUN) console.log('--dry-run: no writes will be made')
    if (ONLY.length) console.log(`--only: ${ONLY.join(', ')}`)

    const tenants = await prisma.tenant.findMany({
        where: { archivedAt: null, ...(ONLY.length ? { slug: { in: ONLY } } : {}) },
        select: { id: true, slug: true }
    })
    console.log(`${tenants.length} tenant(s) to check`)

    const allCodes = DEFAULT_PROMO_CODE_PRESETS.map((p) => p.code)
    let tenantsTouched = 0
    let codesCreated = 0

    for (const tenant of tenants) {
        const existing = await prisma.promoCode.findMany({
            where: { tenantId: tenant.id, code: { in: allCodes } },
            select: { code: true }
        })
        const existingCodes = new Set(existing.map((row) => row.code))
        const missing = DEFAULT_PROMO_CODE_PRESETS.filter((preset) => !existingCodes.has(preset.code))

        if (missing.length === 0) continue

        tenantsTouched += 1
        console.log(`${tenant.slug}: creating ${missing.length} code(s) — ${missing.map((p) => p.code).join(', ')}`)

        if (DRY_RUN) {
            codesCreated += missing.length
            continue
        }

        for (const preset of missing) {
            await prisma.promoCode.create({
                data: {
                    tenantId: tenant.id,
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
            codesCreated += 1
        }
    }

    console.log(`Done. ${tenantsTouched} tenant(s) touched, ${codesCreated} code(s) ${DRY_RUN ? 'would be ' : ''}created.`)
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
