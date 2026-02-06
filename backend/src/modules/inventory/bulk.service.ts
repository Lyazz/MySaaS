import prisma from '../../lib/prisma'
import { parseCsv, stringifyCsv } from '../../lib/csv'
import { InventoryService } from './inventory.service'

type ImportSummary = {
    updated: number
    skipped: number
    errors: Array<{ row: number; message: string }>
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
    return String(n)
}

export class BulkInventoryService {
    private inventory = new InventoryService()

    async exportVariantsCsv(tenantId: string, opts?: { search?: string | null; productId?: string | null }) {
        const variants = await this.inventory.listVariants(tenantId, opts)

        const header = [
            'id',
            'productId',
            'productTitle',
            'optionTitle',
            'sku',
            'price',
            'trackInventory',
            'stock',
            'reserved',
            'safetyStock'
        ]

        const rows = variants.map((v) => ({
            id: v.id,
            productId: v.productId,
            productTitle: v.productTitle,
            optionTitle: v.optionTitle,
            sku: v.sku ?? '',
            price: String(v.price),
            trackInventory: v.trackInventory ? 'true' : 'false',
            stock: String(v.stock),
            reserved: String(v.reserved),
            safetyStock: String(v.safetyStock)
        }))

        return stringifyCsv(header, rows)
    }

    async importVariantsCsv(tenantId: string, csvText: string, opts?: { actorUserId?: string | null }): Promise<ImportSummary> {
        const parsed = parseCsv(csvText)
        const summary: ImportSummary = { updated: 0, skipped: 0, errors: [] }

        if (!parsed.header.includes('id')) throw new Error('CSV must include id column')

        for (let i = 0; i < parsed.records.length; i++) {
            const rowNumber = i + 2
            const record = parsed.records[i]

            try {
                const id = (record.id ?? '').trim()
                if (!id) {
                    summary.skipped++
                    summary.errors.push({ row: rowNumber, message: 'Missing id' })
                    continue
                }

                const stock = parsed.header.includes('stock') ? toInt(record.stock ?? '') : null
                const reserved = parsed.header.includes('reserved') ? toInt(record.reserved ?? '') : null
                const safetyStock = parsed.header.includes('safetyStock') ? toInt(record.safetyStock ?? '') : null
                const trackInventory = parsed.header.includes('trackInventory') ? toBool(record.trackInventory ?? '') : null

                if (stock !== null && stock < 0) throw new Error('stock must be >= 0')
                if (reserved !== null && reserved < 0) throw new Error('reserved must be >= 0')
                if (safetyStock !== null && safetyStock < 0) throw new Error('safetyStock must be >= 0')
                if (parsed.header.includes('trackInventory') && trackInventory === null && (record.trackInventory ?? '').trim()) {
                    throw new Error('Invalid trackInventory (expected true/false)')
                }

                const price = parsed.header.includes('price') ? toDecimalString(record.price ?? '') : null
                if (parsed.header.includes('price') && price === null && (record.price ?? '').trim()) throw new Error('Invalid price')

                const sku = parsed.header.includes('sku') ? (record.sku ?? '').trim() : ''

                if (stock !== null || reserved !== null || safetyStock !== null || trackInventory !== null) {
                    await this.inventory.updateVariantInventory(
                        tenantId,
                        id,
                        {
                            stock: stock === null ? undefined : stock,
                            reserved: reserved === null ? undefined : reserved,
                            safetyStock: safetyStock === null ? undefined : safetyStock,
                            trackInventory: trackInventory === null ? undefined : trackInventory,
                            reason: 'bulk_import',
                            note: 'CSV variant import'
                        },
                        { userId: opts?.actorUserId ?? null }
                    )
                }

                if (price !== null || parsed.header.includes('sku')) {
                    await prisma.productVariant.updateMany({
                        where: { tenantId, id },
                        data: {
                            ...(price !== null ? { price } : {}),
                            ...(parsed.header.includes('sku') ? { sku: sku || null } : {})
                        }
                    })
                }

                summary.updated++
            } catch (error: any) {
                summary.errors.push({ row: rowNumber, message: error?.message || 'Import failed' })
            }
        }

        return summary
    }

    async bulkPatchVariants(
        tenantId: string,
        input: {
            updates: Array<{
                id: string
                stock?: unknown
                reserved?: unknown
                safetyStock?: unknown
                trackInventory?: unknown
                price?: unknown
                sku?: unknown
            }>
            reason?: unknown
            note?: unknown
            actorUserId?: string | null
        }
    ) {
        const reason =
            typeof input.reason === 'string' && input.reason.trim() ? input.reason.trim().slice(0, 64) : 'bulk_patch'
        const note = typeof input.note === 'string' && input.note.trim() ? input.note.trim().slice(0, 500) : null

        const updates = Array.isArray(input.updates) ? input.updates : []
        if (updates.length === 0) throw new Error('updates is required')

        let updated = 0
        const errors: Array<{ id: string; message: string }> = []

        for (const u of updates) {
            try {
                const id = typeof u.id === 'string' ? u.id : ''
                if (!id) throw new Error('Missing id')

                const stock = u.stock === undefined ? null : typeof u.stock === 'number' ? Math.trunc(u.stock) : typeof u.stock === 'string' ? toInt(u.stock) : null
                const reserved = u.reserved === undefined ? null : typeof u.reserved === 'number' ? Math.trunc(u.reserved) : typeof u.reserved === 'string' ? toInt(u.reserved) : null
                const safetyStock = u.safetyStock === undefined ? null : typeof u.safetyStock === 'number' ? Math.trunc(u.safetyStock) : typeof u.safetyStock === 'string' ? toInt(u.safetyStock) : null
                const trackInventory = u.trackInventory === undefined ? null : typeof u.trackInventory === 'boolean' ? u.trackInventory : null

                if (u.stock !== undefined && stock === null) throw new Error('Invalid stock')
                if (u.reserved !== undefined && reserved === null) throw new Error('Invalid reserved')
                if (u.safetyStock !== undefined && safetyStock === null) throw new Error('Invalid safetyStock')
                if (u.trackInventory !== undefined && trackInventory === null) throw new Error('Invalid trackInventory')

                const price = u.price === undefined ? null : typeof u.price === 'number' ? String(u.price) : typeof u.price === 'string' ? u.price : null
                if (u.price !== undefined && (price === null || !price.trim())) throw new Error('Invalid price')

                const sku = u.sku === undefined ? null : typeof u.sku === 'string' ? u.sku.trim() : null
                if (u.sku !== undefined && sku === null) throw new Error('Invalid sku')

                if (stock !== null || reserved !== null || safetyStock !== null || trackInventory !== null) {
                    await this.inventory.updateVariantInventory(
                        tenantId,
                        id,
                        {
                            stock: stock === null ? undefined : stock,
                            reserved: reserved === null ? undefined : reserved,
                            safetyStock: safetyStock === null ? undefined : safetyStock,
                            trackInventory: trackInventory === null ? undefined : trackInventory,
                            reason,
                            note
                        },
                        { userId: input.actorUserId ?? null }
                    )
                }

                if (price !== null || sku !== null) {
                    await prisma.productVariant.updateMany({
                        where: { tenantId, id },
                        data: {
                            ...(price !== null ? { price } : {}),
                            ...(sku !== null ? { sku: sku || null } : {})
                        }
                    })
                }

                updated++
            } catch (error: any) {
                errors.push({ id: (u as any)?.id ?? 'unknown', message: error?.message || 'Update failed' })
            }
        }

        return { updated, errors }
    }
}

