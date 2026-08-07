import prisma from '../../lib/prisma'
import { parseCsv, stringifyCsv } from '../../lib/csv'
import { InventoryService } from '../inventory/inventory.service'
import { ProductsService } from './products.service'
import { suggestSkuFromProduct } from '../../lib/variant-identifiers'
import { buildPublicUrl } from '../../lib/s3'
import { sanitizeOptionalRichText } from '../../lib/rich-text'
import { syncDerivedProductPrice } from './product-price-sync'

type ImportSummary = {
    created: number
    updated: number
    skipped: number
    errors: Array<{ row: number; message: string }>
    warnings: Array<{ row: number; message: string }>
}

const toBool = (raw: string): boolean | null => {
    const v = raw.trim().toLowerCase()
    if (!v) return null
    if (['true', '1', 'yes', 'y'].includes(v)) return true
    if (['false', '0', 'no', 'n'].includes(v)) return false
    return null
}

const toInt = (raw: string): number | null => {
    const v = raw.trim()
    if (!v) return null
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    return Math.trunc(n)
}

const toDecimalString = (raw: string): string | null => {
    const v = raw.trim()
    if (!v) return null
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    // Prisma Decimal is ok with numeric strings.
    return String(n)
}

const normalizeImages = (raw: string): string[] | null => {
    const v = raw.trim()
    if (!v) return null
    const parts = v
        .split('|')
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 10)
    if (parts.length === 0) return null
    return parts
}

const isUuidLike = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

const normalizeImportedImage = (tenantId: string, value: string): string | null => {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const u = new URL(trimmed)

            // If the URL points to an app upload, store it as a relative path so it stays valid across environments/hosts.
            if (/^\/uploads\//i.test(u.pathname)) {
                const segments = u.pathname.split('/').filter(Boolean) // uploads/<tenantId>/<file...>
                const uploadIdx = segments.findIndex((s) => s.toLowerCase() === 'uploads')
                if (uploadIdx === 0) {
                    const maybeTenantOrFile = segments[1] || ''
                    const rest = segments.slice(2).join('/')
                    if (rest) return `/uploads/${tenantId}/${rest}`
                    if (maybeTenantOrFile) return `/uploads/${tenantId}/${maybeTenantOrFile}`
                }
                return `/uploads/${tenantId}`
            }

            return trimmed
        } catch {
            return trimmed
        }
    }

    let path = trimmed.replace(/\\/g, '/')
    if (/^\.\//.test(path)) path = path.slice(2)
    if (/^public\/uploads\//i.test(path)) path = path.replace(/^public/i, '')
    if (/^uploads\//i.test(path)) path = `/${path}`
    if (!path.startsWith('/') && path.includes('/')) path = `/${path}`

    // Bare filename => assume tenant-scoped upload.
    if (!path.startsWith('/') && !path.includes('/')) {
        if (process.env.S3_PUBLIC_URL) {
            const bucketName = process.env.S3_PUBLIC_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'products'
            const key = `tenants/${tenantId}/public/${path}`
            return buildPublicUrl(bucketName, key)
        }
        path = `/uploads/${tenantId}/${path}`
    }

    if (/^\/uploads\//i.test(path)) {
        const match = path.match(/^\/uploads\/([^/]+)\/(.+)$/i)
        if (match) {
            const maybeTenant = match[1]!
            const rest = match[2]!
            if (isUuidLike(maybeTenant) && maybeTenant.toLowerCase() !== tenantId.toLowerCase()) {
                return `/uploads/${tenantId}/${rest}`
            }
        } else {
            // `/uploads/<file>` (missing tenant segment) => scope to tenant.
            const rest = path.replace(/^\/uploads\/?/i, '')
            if (rest) return `/uploads/${tenantId}/${rest.replace(/^\/+/, '')}`
        }
    }

    return path
}

const normalizeImportedImages = (tenantId: string, raw: string): string[] | null => {
    const trimmed = raw.trim()
    if (!trimmed) return null

    // Support JSON array input (common from other exporters), e.g. ["https://...","/uploads/..."]
    // This keeps backwards compatibility with our `|`-separated format.
    const parts = (() => {
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed)
                if (Array.isArray(parsed)) {
                    return parsed.map((v) => (typeof v === 'string' ? v : '')).filter(Boolean).slice(0, 10)
                }
            } catch {
                // fall back to legacy parsing
            }
        }
        return normalizeImages(trimmed) ?? []
    })()
    if (parts.length === 0) return null

    const normalized = parts
        .map((p) => normalizeImportedImage(tenantId, p))
        .filter((p): p is string => typeof p === 'string' && p.length > 0)
        .slice(0, 10)

    return normalized.length ? normalized : null
}

const buildUniqueSlug = async (tenantId: string, base: string) => {
    const cleanBase = base.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')
    const root = cleanBase || `product-copy`

    for (let i = 0; i < 50; i++) {
        const slug = i === 0 ? root : `${root}-${i + 1}`
        const exists = await prisma.product.findUnique({
            where: { tenantId_slug: { tenantId, slug } },
            select: { id: true }
        })
        if (!exists) return slug
    }

    return `${root}-${Date.now()}`
}

const parseDelimitedValues = (raw: string): string[] => {
    return Array.from(
        new Set(
            raw
                .split('|')
                .map((v) => v.trim())
                .filter(Boolean)
        )
    )
}

const resolveCategoryIdsForImport = async (
    tenantId: string,
    rawIds: string[],
    rawSlugs: string[]
): Promise<string[]> => {
    let resolvedByIds: string[] = []
    if (rawIds.length > 0) {
        const found = await prisma.category.findMany({
            where: { tenantId, id: { in: rawIds } },
            select: { id: true }
        })
        const foundSet = new Set(found.map((item) => item.id))
        if (rawIds.some((id) => !foundSet.has(id))) {
            throw new Error('Invalid categoryIds')
        }
        resolvedByIds = rawIds
    }

    let resolvedBySlugs: string[] = []
    if (rawSlugs.length > 0) {
        const found = await prisma.category.findMany({
            where: { tenantId, slug: { in: rawSlugs } },
            select: { id: true, slug: true }
        })
        const bySlug = new Map(found.map((item) => [item.slug, item.id]))
        if (rawSlugs.some((slug) => !bySlug.has(slug))) {
            throw new Error('Invalid categorySlugs')
        }
        resolvedBySlugs = rawSlugs.map((slug) => bySlug.get(slug)!).filter(Boolean)
    }

    return Array.from(new Set([...resolvedByIds, ...resolvedBySlugs]))
}

export class BulkProductsService {
    private inventory = new InventoryService()
    private products = new ProductsService()

    async exportProductsCsv(tenantId: string, opts?: { ids?: string[] | null }) {
        const ids = opts?.ids?.filter(Boolean) ?? null
        const products = await prisma.product.findMany({
            where: { tenantId, ...(ids && ids.length > 0 ? { id: { in: ids } } : {}) },
            include: {
                category: { select: { id: true, slug: true, title: true } },
                categoryLinks: {
                    where: { tenantId },
                    include: { category: { select: { id: true, slug: true, title: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const header = [
            'id',
            'title',
            'slug',
            'isActive',
            'price',
            'stock',
            'categoryId',
            'categorySlug',
            'categoryIds',
            'categorySlugs',
            'description',
            'miniDescription',
            'images'
        ]

        const rows = products.map((p) => {
            const categories = (p.categoryLinks || [])
                .map((link: any) => link?.category)
                .filter((category: any) => category?.id)
            const categoryIds = categories.map((category: any) => category.id)
            const categorySlugs = categories.map((category: any) => category.slug)

            return {
            id: p.id,
            title: p.title,
            slug: p.slug,
            isActive: p.isActive ? 'true' : 'false',
            price: String(p.price),
            stock: String(p.stock),
            categoryId: p.categoryId ?? '',
            categorySlug: p.category?.slug ?? '',
            categoryIds: categoryIds.join('|'),
            categorySlugs: categorySlugs.join('|'),
            description: p.description ?? '',
            miniDescription: p.miniDescription ?? '',
            images: (p.images ?? []).join('|')
            }
        })

        return stringifyCsv(header, rows)
    }

    async importProductsCsv(
        tenantId: string,
        csvText: string,
        opts?: { actorUserId?: string | null }
    ): Promise<ImportSummary> {
        const parsed = parseCsv(csvText)
        const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [], warnings: [] }

        const supportedColumns = new Set([
            'id',
            'title',
            'slug',
            'isActive',
            'price',
            'stock',
            'categoryId',
            'categorySlug',
            'categoryIds',
            'categorySlugs',
            'description',
            'miniDescription',
            'images'
        ])

        const hasColumn = (name: string) => parsed.header.includes(name)
        if (!hasColumn('id') && !hasColumn('slug')) {
            throw new Error(`CSV must include id or slug column. Found: ${parsed.header.join(', ')}`)
        }
        if (!hasColumn('title')) {
            summary.warnings.push({ row: 1, message: 'CSV does not include title; updates may be partial' })
        }

        const unknownColumns = parsed.header.filter((c) => !supportedColumns.has(c))
        if (unknownColumns.length > 0) {
            summary.warnings.push({
                row: 1,
                message: `Ignoring unsupported columns: ${unknownColumns.join(', ')}`
            })
        }

        if (!hasColumn('title') && hasColumn('name_i18n')) {
            summary.warnings.push({
                row: 1,
                message:
                    'This CSV uses name_i18n, but the importer expects a title column. Rename name_i18n -> title (choose one language) to create new products.'
            })
        }
        if (!hasColumn('description') && hasColumn('description_i18n')) {
            summary.warnings.push({
                row: 1,
                message:
                    'This CSV uses description_i18n, but the importer expects a description column. Rename description_i18n -> description (choose one language) if you want to import descriptions.'
            })
        }

        for (let i = 0; i < parsed.records.length; i++) {
            const rowNumber = i + 2 // header is row 1
            const record = parsed.records[i]

            try {
                const rawId = record.id ?? ''
                const rawSlug = record.slug ?? ''
                const rawTitle = record.title ?? ''

                const id = rawId.trim() || null
                const slug = rawSlug.trim() || null

                if (!id && !slug) {
                    summary.skipped++
                    summary.errors.push({ row: rowNumber, message: 'Missing id or slug' })
                    continue
                }

                const existing = id
                    ? await prisma.product.findFirst({
                        where: { tenantId, id },
                        select: { id: true, slug: true }
                    })
                    : await prisma.product.findUnique({
                        where: { tenantId_slug: { tenantId, slug: slug! } },
                        select: { id: true, slug: true }
                    })

                const categoryIds = await (async () => {
                    const hasMultiCategoryColumns = hasColumn('categoryIds') || hasColumn('categorySlugs')
                    const hasSingleCategoryColumns = hasColumn('categoryId') || hasColumn('categorySlug')

                    if (hasMultiCategoryColumns) {
                        const idsCell = (record.categoryIds ?? '').trim()
                        const slugsCell = (record.categorySlugs ?? '').trim()
                        if (!idsCell && !slugsCell) return []
                        return resolveCategoryIdsForImport(
                            tenantId,
                            idsCell ? parseDelimitedValues(idsCell) : [],
                            slugsCell ? parseDelimitedValues(slugsCell) : []
                        )
                    }

                    if (hasSingleCategoryColumns) {
                        const categoryIdCell = (record.categoryId ?? '').trim()
                        const categorySlugCell = (record.categorySlug ?? '').trim()
                        if (!categoryIdCell && !categorySlugCell) return []
                        return resolveCategoryIdsForImport(
                            tenantId,
                            categoryIdCell ? [categoryIdCell] : [],
                            categorySlugCell ? [categorySlugCell] : []
                        )
                    }

                    return undefined
                })()

                const isActive = hasColumn('isActive') ? toBool(record.isActive ?? '') : null
                if (hasColumn('isActive') && isActive === null && (record.isActive ?? '').trim()) {
                    throw new Error('Invalid isActive (expected true/false)')
                }

                const price = hasColumn('price') ? toDecimalString(record.price ?? '') : null
                if (hasColumn('price') && price === null && (record.price ?? '').trim()) throw new Error('Invalid price')

                const stock = hasColumn('stock') ? toInt(record.stock ?? '') : null
                if (hasColumn('stock') && stock === null && (record.stock ?? '').trim()) throw new Error('Invalid stock')
                if (stock !== null && stock < 0) throw new Error('stock must be >= 0')

                const description = hasColumn('description')
                    ? sanitizeOptionalRichText(record.description ?? '', { allowImages: true })
                    : undefined
                const miniDescription = hasColumn('miniDescription')
                    ? sanitizeOptionalRichText(record.miniDescription ?? '')
                    : undefined
                const images = hasColumn('images') ? normalizeImportedImages(tenantId, record.images ?? '') : undefined

                if (!existing) {
                    if (!rawTitle.trim()) throw new Error('Missing title for create')
                    if (!slug) throw new Error('Missing slug for create')

                    const createData: any = {
                        title: rawTitle.trim(),
                        slug,
                        description,
                        miniDescription,
                        isActive: isActive ?? true,
                        price: price ?? undefined,
                        stock: stock ?? undefined,
                        images: images ?? undefined
                    }
                    if (categoryIds !== undefined) createData.categoryIds = categoryIds

                    await this.products.createProduct(tenantId, createData)

                    summary.created++
                    continue
                }

                // Update
                const updateData: any = {}
                if (rawTitle.trim()) updateData.title = rawTitle.trim()
                if (description !== undefined) updateData.description = description
                if (miniDescription !== undefined) updateData.miniDescription = miniDescription
                if (isActive !== null) updateData.isActive = isActive
                if (categoryIds !== undefined) updateData.categoryIds = categoryIds
                if (images !== undefined) updateData.images = images ?? []

                // Only allow slug change when targeting by id.
                if (id && slug && slug !== existing.slug) {
                    const conflict = await prisma.product.findUnique({
                        where: { tenantId_slug: { tenantId, slug } },
                        select: { id: true }
                    })
                    if (conflict && conflict.id !== existing.id) throw new Error('Slug already exists')
                    updateData.slug = slug
                }

                if (Object.keys(updateData).length > 0) {
                    await this.products.updateProduct(tenantId, existing.id, updateData, {
                        userId: opts?.actorUserId ?? null
                    })
                }

                if (price !== null) {
                    // Price lives on the default (no-option) variant; Product.price is a derived cache.
                    const defaultVariant = await prisma.productVariant.findFirst({
                        where: { tenantId, productId: existing.id, optionValues: { none: {} } }
                    })
                    if (defaultVariant) {
                        await prisma.productVariant.updateMany({
                            where: { tenantId, id: defaultVariant.id },
                            data: { price }
                        })
                        await syncDerivedProductPrice(prisma, tenantId, existing.id)
                    }
                }

                if (stock !== null) {
                    summary.warnings.push({
                        row: rowNumber,
                        message: 'stock is system-managed and cannot be updated after creation; column ignored'
                    })
                }

                summary.updated++
            } catch (error: any) {
                summary.errors.push({ row: rowNumber, message: error?.message || 'Import failed' })
            }
        }

        return summary
    }

    async bulkPatchProducts(
        tenantId: string,
        input: {
            ids: string[]
            data: { price?: unknown; stock?: unknown; isActive?: unknown; categoryId?: unknown; categoryIds?: unknown; isClearance?: unknown }
            options?: { propagatePriceToVariants?: boolean }
            actorUserId?: string | null
        }
    ) {
        const ids = (input.ids ?? []).filter(Boolean)
        if (ids.length === 0) throw new Error('ids is required')

        const data = input.data ?? {}
        const propagatePriceToVariants = input.options?.propagatePriceToVariants === true

        const patch: any = {}
        if (data.isActive !== undefined) {
            if (typeof data.isActive !== 'boolean') throw new Error('isActive must be boolean')
            patch.isActive = data.isActive
        }

        const hasCategoryId = Object.prototype.hasOwnProperty.call(data, 'categoryId')
        const hasCategoryIds = Object.prototype.hasOwnProperty.call(data, 'categoryIds')
        let resolvedCategoryIds: string[] | undefined
        if (hasCategoryId || hasCategoryIds) {
            let explicitCategoryId: string | null | undefined
            if (hasCategoryId) {
                if (data.categoryId === null || data.categoryId === '') {
                    explicitCategoryId = null
                } else if (typeof data.categoryId === 'string') {
                    explicitCategoryId = data.categoryId.trim() || null
                } else {
                    throw new Error('categoryId must be string or null')
                }
            }

            if (hasCategoryIds) {
                if (!Array.isArray(data.categoryIds)) {
                    throw new Error('categoryIds must be an array')
                }
                resolvedCategoryIds = Array.from(
                    new Set(
                        data.categoryIds
                            .map((value) => (typeof value === 'string' ? value.trim() : ''))
                            .filter(Boolean)
                    )
                )
                if (resolvedCategoryIds.length !== data.categoryIds.length) {
                    throw new Error('categoryIds must contain only strings')
                }
            } else {
                resolvedCategoryIds = explicitCategoryId ? [explicitCategoryId] : []
            }

            if (explicitCategoryId) {
                resolvedCategoryIds = [explicitCategoryId, ...resolvedCategoryIds.filter((id) => id !== explicitCategoryId)]
            }

            if (resolvedCategoryIds.length > 0) {
                const found = await prisma.category.findMany({
                    where: { tenantId, id: { in: resolvedCategoryIds } },
                    select: { id: true }
                })
                const foundSet = new Set(found.map((item) => item.id))
                if (resolvedCategoryIds.some((id) => !foundSet.has(id))) {
                    throw new Error('Invalid categoryId')
                }
            }

            patch.categoryId = resolvedCategoryIds[0] ?? null
        }

        const price = data.price === undefined ? null : typeof data.price === 'number' ? String(data.price) : typeof data.price === 'string' ? data.price : null
        if (data.price !== undefined && (price === null || !price.trim())) throw new Error('price must be a number/string')
        if (price !== null) patch.price = price

        const stock = data.stock === undefined ? null : typeof data.stock === 'number' ? Math.trunc(data.stock) : typeof data.stock === 'string' ? toInt(data.stock) : null
        if (data.stock !== undefined && stock === null) throw new Error('stock must be an integer')
        if (stock !== null && stock < 0) throw new Error('stock must be >= 0')
        if (stock !== null) throw new Error('stock is system-managed and cannot be edited')

        await prisma.product.updateMany({ where: { tenantId, id: { in: ids } }, data: patch })

        let clearanceSkippedIds: string[] = []
        if (data.isClearance !== undefined) {
            if (typeof data.isClearance !== 'boolean') throw new Error('isClearance must be boolean')

            let targetIds = ids
            if (data.isClearance === true) {
                const promoActive = await prisma.product.findMany({
                    where: { tenantId, id: { in: ids }, isPromotionActive: true },
                    select: { id: true }
                })
                clearanceSkippedIds = promoActive.map((p) => p.id)
                targetIds = ids.filter((id) => !clearanceSkippedIds.includes(id))
            }

            if (targetIds.length > 0) {
                await prisma.product.updateMany({
                    where: { tenantId, id: { in: targetIds } },
                    data: { isClearance: data.isClearance }
                })
            }
        }

        if (resolvedCategoryIds !== undefined) {
            await prisma.productCategory.deleteMany({
                where: { tenantId, productId: { in: ids } }
            })

            if (resolvedCategoryIds.length > 0) {
                await prisma.productCategory.createMany({
                    data: ids.flatMap((productId) =>
                        resolvedCategoryIds!.map((categoryId) => ({
                            tenantId,
                            productId,
                            categoryId
                        }))
                    ),
                    skipDuplicates: true
                })
            }
        }

        if (price !== null && propagatePriceToVariants) {
            await prisma.productVariant.updateMany({
                where: { tenantId, productId: { in: ids }, isActive: true },
                data: { price }
            })
        }

        return { success: true, clearanceSkippedIds }
    }

    async bulkDeleteProducts(tenantId: string, input: { ids: string[] }) {
        const ids = Array.from(new Set((input.ids ?? []).filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim())))
        if (ids.length === 0) throw new Error('ids is required')
        if (ids.length > 200) throw new Error('Too many ids')

        const existing = await prisma.product.findMany({
            where: { tenantId, id: { in: ids } },
            select: { id: true }
        })
        if (existing.length !== ids.length) {
            const err: any = new Error('Product not found')
            err.statusCode = 404
            err.statusMessage = 'Product not found'
            throw err
        }

        let deletedCount = 0
        let archivedCount = 0
        for (const productId of ids) {
            const result = await this.products.deleteProduct(tenantId, productId)
            if (result.action === 'deleted') deletedCount += 1
            if (result.action === 'archived') archivedCount += 1
        }

        return { success: true, deletedCount, archivedCount }
    }

    async duplicateProduct(
        tenantId: string,
        productId: string,
        input?: { title?: unknown; slug?: unknown; isActive?: unknown; copyInventory?: unknown }
    ) {
        const product = await prisma.product.findFirst({
            where: { tenantId, id: productId },
            include: {
                productImages: { orderBy: { position: 'asc' } },
                options: { include: { values: { orderBy: { position: 'asc' } } }, orderBy: { position: 'asc' } },
                categoryLinks: { where: { tenantId }, select: { categoryId: true } },
                variants: {
                    include: {
                        optionValues: { include: { optionValue: true } },
                        images: { include: { image: true }, orderBy: { position: 'asc' } }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                bundleDeals: { orderBy: { bundleQty: 'asc' } }
            }
        })

        if (!product) throw new Error('Product not found')

        const copyInventory = input?.copyInventory === true
        const isActive = typeof input?.isActive === 'boolean' ? input?.isActive : false

        const title = typeof input?.title === 'string' && input.title.trim() ? input.title.trim() : `${product.title} (Copy)`
        const requestedSlug = typeof input?.slug === 'string' ? input.slug.trim() : ''
        const slug = requestedSlug ? await buildUniqueSlug(tenantId, requestedSlug) : await buildUniqueSlug(tenantId, `${product.slug}-copy`)

        const created = await prisma.$transaction(async (tx) => {
            const createdProduct = await tx.product.create({
                data: {
                    tenantId,
                    title,
                    slug,
                    description: product.description,
                    miniDescription: product.miniDescription,
                    price: product.price,
                    stock: copyInventory ? product.stock : 0,
                    isActive,
                    categoryId: product.categoryId,
                    images: product.images ?? []
                },
                select: { id: true }
            })

            const categoryIds = Array.from(
                new Set(
                    [
                        ...(product.categoryLinks || []).map((link: any) => link.categoryId),
                        product.categoryId
                    ].filter((id): id is string => typeof id === 'string' && id.length > 0)
                )
            )
            if (categoryIds.length > 0) {
                await tx.productCategory.createMany({
                    data: categoryIds.map((categoryId) => ({
                        tenantId,
                        productId: createdProduct.id,
                        categoryId
                    })),
                    skipDuplicates: true
                })
            }

            const imageIdMap = new Map<string, string>()
            for (const img of product.productImages ?? []) {
                const createdImg = await tx.productImage.create({
                    data: {
                        tenantId,
                        productId: createdProduct.id,
                        url: img.url,
                        alt: img.alt,
                        position: img.position,
                        isMain: img.isMain
                    },
                    select: { id: true }
                })
                imageIdMap.set(img.id, createdImg.id)
            }

            const optionIdMap = new Map<string, string>()
            const valueIdMap = new Map<string, string>()

            for (const opt of product.options ?? []) {
                const createdOpt = await tx.productOption.create({
                    data: {
                        tenantId,
                        productId: createdProduct.id,
                        name: opt.name,
                        position: opt.position,
                        displayType: opt.displayType
                    },
                    select: { id: true }
                })
                optionIdMap.set(opt.id, createdOpt.id)

                for (const val of opt.values ?? []) {
                    const createdVal = await tx.productOptionValue.create({
                        data: {
                            tenantId,
                            optionId: createdOpt.id,
                            label: val.label,
                            position: val.position,
                            meta: val.meta
                        },
                        select: { id: true }
                    })
                    valueIdMap.set(val.id, createdVal.id)
                }
            }

            const hasOptions = (product.options ?? []).length > 0

            if (!hasOptions) {
                const sku = suggestSkuFromProduct(slug, '')
                await tx.productVariant.create({
                    data: {
                        tenantId,
                        productId: createdProduct.id,
                        sku,
                        price: product.price,
                        stock: copyInventory ? product.stock : 0,
                        reserved: 0,
                        safetyStock: 0,
                        isActive: true,
                        trackInventory: true
                    }
                })
            } else {
                const variantsToCopy = (product.variants ?? []).filter((v) => v.isActive)
                for (const v of variantsToCopy) {
                    const optionValuesToCreate = (v.optionValues ?? []).map((ov) => {
                        const mapped = valueIdMap.get(ov.optionValueId)
                        if (!mapped) {
                            throw new Error('Duplicate failed: missing option value mapping')
                        }
                        return { optionValueId: mapped }
                    })
                    const signature = optionValuesToCreate
                        .map((ov) => ov.optionValueId)
                        .slice()
                        .sort()
                        .join('|')
                    const sku = suggestSkuFromProduct(slug, signature)

                    const imagesToCreate = (v.images ?? [])
                        .map((img) => {
                            const mapped = imageIdMap.get(img.imageId)
                            if (!mapped) return null
                            return { imageId: mapped, position: img.position }
                        })
                        .filter(Boolean) as Array<{ imageId: string; position: number }>

                    const createdVariant = await tx.productVariant.create({
                        data: {
                            tenantId,
                            productId: createdProduct.id,
                            sku,
                            price: v.price,
                            compareAtPrice: v.compareAtPrice,
                            cost: v.cost,
                            isActive: true,
                            trackInventory: v.trackInventory,
                            stock: copyInventory ? v.stock : 0,
                            reserved: 0,
                            safetyStock: 0,
                            optionValues: {
                                create: optionValuesToCreate
                            },
                            images: {
                                create: imagesToCreate
                            }
                        },
                        select: { id: true }
                    })

                    // Ensure variants created even if option values mapping is empty (defensive).
                    if (!createdVariant?.id) throw new Error('Variant duplication failed')
                }
            }

            if ((product.bundleDeals ?? []).length > 0) {
                await tx.productBundleDeal.createMany({
                    data: product.bundleDeals.map((d) => ({
                        tenantId,
                        productId: createdProduct.id,
                        bundleQty: d.bundleQty,
                        bundlePrice: d.bundlePrice,
                        tag: d.tag,
                        isActive: d.isActive,
                        startsAt: d.startsAt,
                        endsAt: d.endsAt
                    }))
                })
            }

            return createdProduct.id
        })

        return this.products.getProduct(tenantId, created)
    }
}
