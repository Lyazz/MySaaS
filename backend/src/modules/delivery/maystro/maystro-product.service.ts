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

        if (!existing) {
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

                await this.prisma.maystroProductMapping.create({
                    data: {
                        tenantId: input.tenantId,
                        localProductId: input.localProductId,
                        maystroProductId: created.product_id || productId,
                        maystroUuid: created.id,
                        syncStatus: 'SYNCED',
                        lastSyncedAt: new Date(),
                        lastError: null
                    }
                })

                return created
            } catch (error: any) {
                // If the product already exists remotely (e.g., retried request), Maystro allows updating by product_id.
                try {
                    const updated = await client.request<MaystroProduct>({
                        method: 'PATCH',
                        path: `/stock/products/${encodeURIComponent(productId)}/`,
                        data: { logistical_description: input.logisticalDescription }
                    })

                    await this.prisma.maystroProductMapping.upsert({
                        where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId: input.localProductId } },
                        create: {
                            tenantId: input.tenantId,
                            localProductId: input.localProductId,
                            maystroProductId: productId,
                            maystroUuid: updated.id,
                            syncStatus: 'SYNCED',
                            lastSyncedAt: new Date(),
                            lastError: null
                        },
                        update: {
                            maystroUuid: updated.id,
                            syncStatus: 'SYNCED',
                            lastSyncedAt: new Date(),
                            lastError: null
                        }
                    })

                    return updated
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
                    throw error
                }
            }
        }

        try {
            const updated = await client.request<MaystroProduct>({
                method: 'PATCH',
                path: `/stock/products/${encodeURIComponent(existing.maystroProductId)}/`,
                data: {
                    logistical_description: input.logisticalDescription
                }
            })

            await this.prisma.maystroProductMapping.update({
                where: { tenantId_localProductId: { tenantId: input.tenantId, localProductId: input.localProductId } },
                data: {
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
