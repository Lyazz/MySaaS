// Fills in the wellness store's category images on the target DB. Searches Pexels per
// category, optimizes, uploads to the target S3 bucket, sets Category.imageUrl.
// Idempotent: a category that already has an S3 imageUrl is skipped unless --force.
//
// Env: PROD_DATABASE_URL, S3_ENDPOINT, S3_PUBLIC_BUCKET_NAME, AWS_REGION,
//      AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, PEXELS_API_KEY
// Usage: node --env-file=... scripts/seed-prod-wellness-categories.mjs [--force]
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import slugify from 'slugify'
import sharp from 'sharp'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const FORCE = process.argv.includes('--force')
const prisma = new PrismaClient({ datasources: { db: { url: process.env.PROD_DATABASE_URL } } })
const BUCKET = process.env.S3_PUBLIC_BUCKET_NAME
const PUBLIC_BASE = (process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT).replace(/\/$/, '')
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
})

// category title (as it exists on prod) -> Pexels query + acceptable keywords
const CATEGORY_QUERIES = [
    { match: 'cheveux', query: 'hair care shampoo bottle', terms: ['hair','shampoo','conditioner','bottle','haircare'] },
    { match: 'parfum', query: 'perfume bottle fragrance', terms: ['perfume','fragrance','bottle','cologne','scent'] },
    { match: 'dermocosm', query: 'skincare products pharmacy dermocosmetics', terms: ['skincare','cream','serum','bottle','pharmacy','cosmetic','lotion'] },
    { match: 'maman', query: 'baby care products', terms: ['baby','infant','mother','child','care','bottle','nursery'] },
    { match: 'hygi', query: 'hygiene bath wellness products', terms: ['soap','hygiene','bath','wellness','shower','sanitizer','clean'] },
    { match: 'vitamin', query: 'vitamins supplements pills bottle', terms: ['vitamin','supplement','pill','capsule','tablet','bottle'] },
    { match: 'visage', query: 'facial skincare cream serum', terms: ['face','facial','skincare','cream','serum','moisturizer'] },
    { match: 'dispositif', query: 'blood pressure monitor thermometer', terms: ['blood pressure','monitor','thermometer','cuff','medical','device','pulse'] }
]

async function searchPexels(query) {
    const url = new URL('https://api.pexels.com/v1/search')
    url.searchParams.set('query', query)
    url.searchParams.set('per_page', '20')
    url.searchParams.set('orientation', 'square')
    const res = await fetch(url, { headers: { Authorization: process.env.PEXELS_API_KEY } })
    if (!res.ok) throw new Error(`Pexels ${res.status}`)
    const data = await res.json()
    return (data.photos ?? []).map((p) => ({ url: p.src?.large || p.src?.original, alt: (p.alt || '').toLowerCase() }))
}

async function pushImage(tenantId, sourceUrl, label) {
    const res = await fetch(sourceUrl)
    if (!res.ok) throw new Error(`fetch ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const optimized = await sharp(buf).resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
    const key = `tenants/${tenantId}/public/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${label}.jpg`
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: optimized, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000, immutable' }))
    return `${PUBLIC_BASE}/${BUCKET}/${key}`
}

async function main() {
    const t = await prisma.tenant.findUnique({ where: { slug: 'wellness' } })
    if (!t) throw new Error('wellness tenant not found')
    const cats = await prisma.category.findMany({ where: { tenantId: t.id }, select: { id: true, title: true, imageUrl: true } })

    for (const cat of cats) {
        const lc = cat.title.toLowerCase()
        const cfg = CATEGORY_QUERIES.find((c) => lc.includes(c.match))
        if (!cfg) { console.log(`skip  ${cat.title} — no query mapping`); continue }
        if (cat.imageUrl && cat.imageUrl.startsWith(PUBLIC_BASE) && !FORCE) { console.log(`skip  ${cat.title} — already has S3 image`); continue }

        const photos = await searchPexels(cfg.query)
        const best = photos.find((p) => cfg.terms.some((term) => p.alt.includes(term))) || photos[0]
        if (!best) { console.log(`fail  ${cat.title} — no results`); continue }

        const url = await pushImage(t.id, best.url, `cat-${slugify(cat.title, { lower: true, strict: true })}`)
        await prisma.category.update({ where: { id: cat.id }, data: { imageUrl: url } })
        console.log(`done  ${cat.title} — "${best.alt.slice(0, 60)}" -> ${url.split('/').pop()}`)
    }
    await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
