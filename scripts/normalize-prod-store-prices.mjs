// Rounds the seeded demo-store prices to realistic Algerian retail values.
// Updates Product.price and every ProductVariant.price / compareAtPrice / promotionalPrice.
// Idempotent (rounding a rounded value is a no-op). Usage:
//   node --env-file=... scripts/normalize-prod-store-prices.mjs [--dry-run] [--include-wellness]
import { PrismaClient } from '@prisma/client'

const DRY = process.argv.includes('--dry-run')
const INCLUDE_WELLNESS = process.argv.includes('--include-wellness')
const prisma = new PrismaClient({ datasources: { db: { url: process.env.PROD_DATABASE_URL } } })

const SLUGS = ['classic','modern','street','cozy','cyber','stationnery','food','playful','activewear','chrono','maison','arena','nour','embellir']
if (INCLUDE_WELLNESS) SLUGS.push('wellness')

function niceDZD(value) {
    const p = Number(value)
    if (!Number.isFinite(p) || p <= 0) return p
    if (p < 1000) return Math.max(50, Math.round(p / 50) * 50)
    if (p < 20000) return Math.floor(p / 100) * 100
    if (p < 50000) return Math.round(p / 1000) * 1000
    return Math.round(p / 5000) * 5000
}

async function main() {
    let productsChanged = 0
    let variantsChanged = 0
    const samples = []

    for (const slug of SLUGS) {
        const t = await prisma.tenant.findUnique({ where: { slug } })
        if (!t) { console.log(`skip ${slug} — not found`); continue }

        const products = await prisma.product.findMany({
            where: { tenantId: t.id },
            select: { id: true, title: true, price: true, variants: { select: { id: true, price: true, compareAtPrice: true, promotionalPrice: true } } }
        })

        for (const prod of products) {
            const newPrice = niceDZD(prod.price)
            if (newPrice !== Number(prod.price)) {
                if (samples.length < 24) samples.push(`  ${slug.padEnd(11)} ${String(prod.price).padStart(7)} -> ${String(newPrice).padStart(7)}  ${prod.title}`)
                if (!DRY) await prisma.product.update({ where: { id: prod.id }, data: { price: newPrice } })
                productsChanged++
            }

            for (const v of prod.variants) {
                const data = {}
                const vp = niceDZD(v.price)
                if (vp !== Number(v.price)) data.price = vp
                if (v.compareAtPrice != null) {
                    const cp = niceDZD(v.compareAtPrice)
                    if (cp !== Number(v.compareAtPrice)) data.compareAtPrice = cp
                }
                if (v.promotionalPrice != null) {
                    const pp = niceDZD(v.promotionalPrice)
                    if (pp !== Number(v.promotionalPrice)) data.promotionalPrice = pp
                }
                if (Object.keys(data).length) {
                    if (!DRY) await prisma.productVariant.update({ where: { id: v.id }, data })
                    variantsChanged++
                }
            }
        }
        console.log(`${slug}: ${products.length} products scanned`)
    }

    console.log('\n--- sample changes ---')
    console.log(samples.join('\n'))
    console.log(`\n${DRY ? '[dry-run] ' : ''}products updated: ${productsChanged}, variants updated: ${variantsChanged}`)
    await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
