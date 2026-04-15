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
        const products = await client.request<MaystroProduct[]>({
            method: 'GET',
            path: '/stock/products/'
        })
        return Array.isArray(products) ? products : []
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
