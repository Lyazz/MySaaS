import type { PrismaClient } from '@prisma/client'
import prisma from '../../../lib/prisma'
import { MaystroClient } from './maystro.client'
import { MaystroIntegrationError } from './maystro.errors'

type MaystroProduct = {
    id: string
    product_id: string
    logistical_description: string
    store: string
}

type MaystroVariantOption = {
    label?: string | null
    position?: number | null
    option?: { name?: string | null; position?: number | null } | null
}

export type MaystroNamedVariant = {
    id: string
    optionValues?: Array<{ optionValue?: MaystroVariantOption | null }> | null
} | null | undefined

/// Reads a variant's attributes as one label, e.g. "Bleu / XL". Sorted by option then
/// value so the same variant always yields the same string: that string names the
/// product in Maystro's catalog, so it must not drift between syncs.
export const maystroVariantLabel = (variant: MaystroNamedVariant): string => {
    const entries = Array.isArray(variant?.optionValues) ? variant!.optionValues! : []
    return entries
        .map((entry) => entry?.optionValue)
        .filter((value): value is MaystroVariantOption => Boolean(value?.label && String(value.label).trim()))
        .sort((a, b) => {
            const byOption = (a.option?.position ?? 0) - (b.option?.position ?? 0)
            if (byOption !== 0) return byOption
            const byOptionName = String(a.option?.name ?? '').localeCompare(String(b.option?.name ?? ''))
            if (byOptionName !== 0) return byOptionName
            const byValue = (a.position ?? 0) - (b.position ?? 0)
            if (byValue !== 0) return byValue
            return String(a.label).localeCompare(String(b.label))
        })
        .map((value) => String(value.label).trim())
        .join(' / ')
}

/// Maystro names an order line from the catalog's logistical_description and discards
/// the description the order carried, so an attribute reaches the picker only by being
/// part of the remote product's own name. A variant that carries attributes therefore
/// gets its own remote product; a product without any keeps the single product-level
/// entry its catalog row and delivery stats already live on.
export const maystroProductNaming = (input: { title: string; variant: MaystroNamedVariant }) => {
    const label = maystroVariantLabel(input.variant)
    const title = String(input.title ?? '').trim()
    return {
        localVariantId: label && input.variant?.id ? String(input.variant.id) : '',
        logisticalDescription: label ? title + ' - ' + label : title
    }
}

/// Everything maystroProductNaming needs to render a variant's label, kept in one
/// place so the sync and the order payload always name a product identically.
export const MAYSTRO_VARIANT_INCLUDE = {
    include: { optionValues: { include: { optionValue: { include: { option: true } } } } }
} as const

export class MaystroProductService {
    private prisma: PrismaClient

    constructor(client: PrismaClient = prisma) {
        this.prisma = client
    }

    private mappingKey(input: { tenantId: string; localProductId: string; localVariantId?: string | null }) {
        return {
            tenantId_localProductId_localVariantId: {
                tenantId: input.tenantId,
                localProductId: input.localProductId,
                localVariantId: input.localVariantId || ''
            }
        }
    }

    async createOrUpdateProduct(input: {
        tenantId: string
        apiToken: string
        storeId: string
        localProductId: string
        localVariantId?: string | null
        logisticalDescription: string
    }) {
        const client = new MaystroClient({ apiToken: input.apiToken })

        const localVariantId = input.localVariantId || ''
        const existing = await this.prisma.maystroProductMapping.findUnique({
            where: this.mappingKey({ ...input, localVariantId })
        })

        // An attribute-bearing variant is its own product to Maystro, so the variant id
        // is what has to travel as product_id — that is the handle order details use.
        const productId = localVariantId || input.localProductId

        // Treat ERROR-status mappings as unsynced: force a fresh create attempt.
        if (!existing || existing.syncStatus === 'ERROR') {
            try {
                const created = await client.request<MaystroProduct>({
                    method: 'POST',
                    path: '/stock/products/',
                    data: {
                        store: input.storeId,
                        logistical_description: input.logisticalDescription,
                        product_id: productId
                    }
                })

                await this.prisma.maystroProductMapping.upsert({
                    where: this.mappingKey({ ...input, localVariantId }),
                    create: {
                        tenantId: input.tenantId,
                        localProductId: input.localProductId,
                        localVariantId,
                        maystroProductId: created.product_id || productId,
                        maystroUuid: created.id,
                        syncStatus: 'SYNCED',
                        lastSyncedAt: new Date(),
                        lastError: null
                    },
                    update: {
                        maystroProductId: created.product_id || productId,
                        maystroUuid: created.id,
                        syncStatus: 'SYNCED',
                        lastSyncedAt: new Date(),
                        lastError: null
                    }
                })

                return created
            } catch (error: any) {
                // If the product already exists remotely (e.g., retried request or manual creation),
                // we should find it by searching and link it.
                try {
                    let idMatch: any = null
                    let descMatch: any = null
                    let nextPath = '/stock/products/'
                    let queryParams: any = { store: input.storeId, search: input.logisticalDescription }

                    // Fetch pages until we find the matching product
                    while (nextPath && !idMatch) {
                        const searchRes = await client.request<any>({
                            method: 'GET',
                            path: nextPath,
                            params: queryParams
                        })

                        const products = Array.isArray(searchRes) ? searchRes : (searchRes?.results || [])
                        idMatch = products.find((p: any) => p.product_id === productId)
                        if (!descMatch) {
                            descMatch = products.find(
                                (p: any) => p.logistical_description?.toLowerCase() === input.logisticalDescription.toLowerCase()
                            )
                        }

                        if (idMatch) break

                        if (searchRes?.next && typeof searchRes.next === 'string') {
                            const apiIndex = searchRes.next.indexOf('/api')
                            if (apiIndex !== -1) {
                                nextPath = searchRes.next.substring(apiIndex + 4) // everything after /api
                                queryParams = undefined // params are already in the next URL
                            } else {
                                nextPath = ''
                            }
                        } else {
                            nextPath = ''
                        }
                    }

                    // An exact product_id match is always safe to link — it's genuinely this product.
                    // A description-only match may belong to a *different* local product that happens to
                    // share the same name (e.g. two variants both called "الفاصلة"). Stealing it would
                    // repoint that other product's remote product_id out from under it, breaking its own
                    // order pushes later. Only reuse a description match if it isn't already owned by
                    // another local product's SYNCED mapping.
                    let match = idMatch
                    if (!match && descMatch) {
                        const ownedByOther = await this.prisma.maystroProductMapping.findFirst({
                            where: {
                                tenantId: input.tenantId,
                                maystroUuid: descMatch.id,
                                syncStatus: 'SYNCED',
                                NOT: { localProductId: input.localProductId, localVariantId }
                            }
                        })
                        if (ownedByOther) {
                            // Name collision with a different local product (e.g. two variants sharing
                            // the same display name). Create a genuinely new Maystro product instead of
                            // stealing the other one's link — disambiguate the description so Maystro
                            // accepts it as distinct.
                            const disambiguated = `${input.logisticalDescription} (${productId.slice(-6)})`
                            const created = await client.request<MaystroProduct>({
                                method: 'POST',
                                path: '/stock/products/',
                                data: {
                                    store: input.storeId,
                                    logistical_description: disambiguated,
                                    product_id: productId
                                }
                            })

                            await this.prisma.maystroProductMapping.upsert({
                                where: this.mappingKey({ ...input, localVariantId }),
                                create: {
                                    tenantId: input.tenantId,
                                    localProductId: input.localProductId,
                                    localVariantId,
                                    maystroProductId: created.product_id || productId,
                                    maystroUuid: created.id,
                                    syncStatus: 'SYNCED',
                                    lastSyncedAt: new Date(),
                                    lastError: null
                                },
                                update: {
                                    maystroProductId: created.product_id || productId,
                                    maystroUuid: created.id,
                                    syncStatus: 'SYNCED',
                                    lastSyncedAt: new Date(),
                                    lastError: null
                                }
                            })

                            return created
                        }
                        match = descMatch
                    }

                    if (!match) {
                        throw new MaystroIntegrationError({
                            statusCode: 400,
                            statusMessage: `Failed to link existing product: could not find "${input.logisticalDescription}" across all pages in Maystro catalog`
                        })
                    }

                    // We found it! Let's link it and optionally patch it.
                    let finalProduct = match
                    try {
                        finalProduct = await client.request<MaystroProduct>({
                            method: 'PATCH',
                            path: `/stock/products/${match.id}/`,
                            data: { product_id: productId, logistical_description: input.logisticalDescription }
                        })
                    } catch (patchErr) {
                        // If PATCH fails, it's okay, we at least have the link.
                        console.error('Failed to patch existing Maystro product', patchErr)
                    }

                    await this.prisma.maystroProductMapping.upsert({
                        where: this.mappingKey({ ...input, localVariantId }),
                        create: {
                            tenantId: input.tenantId,
                            localProductId: input.localProductId,
                            localVariantId,
                            maystroProductId: finalProduct.product_id || productId,
                            maystroUuid: finalProduct.id,
                            syncStatus: 'SYNCED',
                            lastSyncedAt: new Date(),
                            lastError: null
                        },
                        update: {
                            maystroProductId: finalProduct.product_id || productId,
                            maystroUuid: finalProduct.id,
                            syncStatus: 'SYNCED',
                            lastSyncedAt: new Date(),
                            lastError: null
                        }
                    })

                    return finalProduct
                } catch (secondError: any) {
                    await this.prisma.maystroProductMapping.upsert({
                        where: this.mappingKey({ ...input, localVariantId }),
                        create: {
                            tenantId: input.tenantId,
                            localProductId: input.localProductId,
                            localVariantId,
                            maystroProductId: productId,
                            syncStatus: 'ERROR',
                            lastError: String(secondError?.message || error?.message || 'Failed to sync product'),
                            lastSyncedAt: null
                        },
                        update: {
                            syncStatus: 'ERROR',
                            lastError: String(secondError?.message || error?.message || 'Failed to sync product'),
                            lastSyncedAt: null
                        }
                    })
                    throw secondError || error
                }
            }
        }

        try {
            const updated = await client.request<MaystroProduct>({
                method: 'PATCH',
                path: `/stock/products/${encodeURIComponent(existing.maystroUuid)}/`,
                data: {
                    logistical_description: input.logisticalDescription
                }
            })

            // The remote row at this UUID may have been reassigned to a different local
            // product by an older bug (or by another sync racing concurrently). Blindly
            // adopting whatever product_id Maystro returns would silently attach this local
            // product to someone else's remote row. If it no longer matches, don't trust the
            // link — force a fresh, dedicated product on the next sync attempt instead.
            if (updated.product_id && updated.product_id !== productId) {
                throw new MaystroIntegrationError({
                    statusCode: 409,
                    statusMessage: `Maystro product ${existing.maystroUuid} is now linked to a different product (expected ${productId}, got ${updated.product_id})`
                })
            }

            await this.prisma.maystroProductMapping.update({
                where: this.mappingKey({ ...input, localVariantId }),
                data: {
                    maystroProductId: updated.product_id || existing.maystroProductId,
                    maystroUuid: updated.id || existing.maystroUuid,
                    syncStatus: 'SYNCED',
                    lastSyncedAt: new Date(),
                    lastError: null
                }
            })

            return updated
        } catch (error: any) {
            await this.prisma.maystroProductMapping.update({
                where: this.mappingKey({ ...input, localVariantId }),
                data: {
                    syncStatus: 'ERROR',
                    lastError: String(error?.message || 'Failed to sync product')
                }
            })
            throw error
        }
    }

    async listProducts(input: { apiToken: string }) {
        const client = new MaystroClient({ apiToken: input.apiToken })
        const data = await client.request<any>({
            method: 'GET',
            path: '/stock/products/'
        })
        return Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []) as MaystroProduct[]
    }

    async deleteProduct(input: { tenantId: string; apiToken: string; localProductId: string; localVariantId?: string | null }) {
        const client = new MaystroClient({ apiToken: input.apiToken })

        const mapping = await this.prisma.maystroProductMapping.findUnique({
            where: this.mappingKey(input)
        })

        const productId = mapping?.maystroProductId ?? (input.localVariantId || input.localProductId)
        await client.request<void>({
            method: 'DELETE',
            path: `/stock/products/${encodeURIComponent(productId)}/`
        })

        if (mapping) {
            await this.prisma.maystroProductMapping.update({
                where: this.mappingKey(input),
                data: {
                    syncStatus: 'PENDING',
                    lastSyncedAt: new Date(),
                    lastError: null
                }
            })
        }
    }

    /**
     * Patches all remote Maystro products that were created without a product_id (legacy bug).
     * Iterates paginated results and PATCHes each product whose product_id is null using its UUID.
     * Also resets any local mappings in ERROR status so they get a fresh sync attempt.
     */
    async resyncNullProductIds(input: { tenantId: string; apiToken: string; storeId: string }) {
        const client = new MaystroClient({ apiToken: input.apiToken })
        const BASE = 'https://orders-management.maystro-delivery.com/api'

        const localMappings = await this.prisma.maystroProductMapping.findMany({
            where: { tenantId: input.tenantId }
        })
        const byUuid = new Map(localMappings.map((m) => [m.maystroUuid, m]))

        let url: string | null = `${BASE}/stock/products/`
        let fixed = 0
        let skipped = 0

        while (url) {
            const data: any = await client.request<any>({ method: 'GET', path: url.replace(`${BASE}`, '') })
            const items: any[] = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
            url = typeof data?.next === 'string' ? data.next.replace(`${BASE}`, '') : null

            for (const item of items) {
                if (item.product_id != null) { skipped++; continue }

                const mapping = byUuid.get(item.id)
                const localProductId = mapping?.localProductId
                if (!mapping || !localProductId) { skipped++; continue }

                // Variant-level mappings answer to the variant id remotely, product-level
                // ones to the product id — the same rule createOrUpdateProduct applies.
                const productId = mapping.localVariantId || localProductId

                try {
                    await client.request<any>({
                        method: 'PATCH',
                        path: `/stock/products/${encodeURIComponent(item.id)}/`,
                        data: { product_id: productId }
                    })

                    await this.prisma.maystroProductMapping.update({
                        where: this.mappingKey(mapping),
                        data: { maystroProductId: productId, syncStatus: 'SYNCED', lastSyncedAt: new Date(), lastError: null }
                    })
                    fixed++
                } catch {
                    skipped++
                }
            }
        }

        // Reset ERROR-status mappings so next order creation retriggers sync
        await this.prisma.maystroProductMapping.updateMany({
            where: { tenantId: input.tenantId, syncStatus: 'ERROR' },
            data: { syncStatus: 'PENDING', lastError: null }
        })

        return { fixed, skipped }
    }

    async ensureOrderProductsSynced(input: { tenantId: string; apiToken: string; storeId: string; orderId: string }) {
        const order = await this.prisma.order.findFirst({
            where: { tenantId: input.tenantId, id: input.orderId },
            include: { items: { include: { product: true, variant: MAYSTRO_VARIANT_INCLUDE } } }
        })
        if (!order) {
            throw new MaystroIntegrationError({ statusCode: 404, statusMessage: 'Order not found for tenant' })
        }

        // One remote product per distinct product+variant the order touches: two lines of
        // the same attribute combination still share a single catalog entry.
        const synced = new Set<string>()
        for (const item of order.items) {
            if (!item.product) continue

            const naming = maystroProductNaming({ title: item.product.title, variant: item.variant as MaystroNamedVariant })
            const key = `${item.productId}:${naming.localVariantId}`
            if (synced.has(key)) continue
            synced.add(key)

            await this.createOrUpdateProduct({
                tenantId: input.tenantId,
                apiToken: input.apiToken,
                storeId: input.storeId,
                localProductId: item.productId,
                localVariantId: naming.localVariantId,
                logisticalDescription: naming.logisticalDescription
            })
        }

        return { order, productsCount: synced.size }
    }
}
