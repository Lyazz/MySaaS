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

export class MaystroProductService {
    private prisma: PrismaClient

    constructor(client: PrismaClient = prisma) {
        this.prisma = client
    }

    async createOrUpdateProduct(input: {
        tenantId: string
        apiToken: string
        storeId: string
        localProductId: string
        logisticalDescription: string
    }) {
        const client = new MaystroClient({ apiToken: input.apiToken })

        const existing = await this.prisma.maystroProductMapping.findUnique({
            where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId: input.localProductId } }
        })

        const productId = input.localProductId

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
                    where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId: input.localProductId } },
                    create: {
                        tenantId: input.tenantId,
                        localProductId: input.localProductId,
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
                                localProductId: { not: input.localProductId },
                                syncStatus: 'SYNCED'
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
                                where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId: input.localProductId } },
                                create: {
                                    tenantId: input.tenantId,
                                    localProductId: input.localProductId,
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
                        where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId: input.localProductId } },
                        create: {
                            tenantId: input.tenantId,
                            localProductId: input.localProductId,
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
                        where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId: input.localProductId } },
                        create: {
                            tenantId: input.tenantId,
                            localProductId: input.localProductId,
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
                where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId: input.localProductId } },
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
                where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId: input.localProductId } },
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

    async deleteProduct(input: { tenantId: string; apiToken: string; localProductId: string }) {
        const client = new MaystroClient({ apiToken: input.apiToken })

        const mapping = await this.prisma.maystroProductMapping.findUnique({
            where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId: input.localProductId } }
        })

        const productId = mapping?.maystroProductId ?? input.localProductId
        await client.request<void>({
            method: 'DELETE',
            path: `/stock/products/${encodeURIComponent(productId)}/`
        })

        if (mapping) {
            await this.prisma.maystroProductMapping.update({
                where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId: input.localProductId } },
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
                if (!localProductId) { skipped++; continue }

                try {
                    await client.request<any>({
                        method: 'PATCH',
                        path: `/stock/products/${encodeURIComponent(item.id)}/`,
                        data: { product_id: localProductId }
                    })

                    await this.prisma.maystroProductMapping.update({
                        where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId } },
                        data: { maystroProductId: localProductId, syncStatus: 'SYNCED', lastSyncedAt: new Date(), lastError: null }
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
            include: { items: { include: { product: true } } }
        })
        if (!order) {
            throw new MaystroIntegrationError({ statusCode: 404, statusMessage: 'Order not found for tenant' })
        }

        const products = order.items
            .map((item) => item.product)
            .filter((p): p is NonNullable<typeof p> => Boolean(p))

        for (const product of products) {
            await this.createOrUpdateProduct({
                tenantId: input.tenantId,
                apiToken: input.apiToken,
                storeId: input.storeId,
                localProductId: product.id,
                logisticalDescription: product.title
            })
        }

        return { order, productsCount: products.length }
    }
}
