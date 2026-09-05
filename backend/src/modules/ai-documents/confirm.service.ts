import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { suggestSkuFromProduct } from '../../lib/variant-identifiers'
import { normalizeLabel } from '../../lib/text-match'
import { toDecimal } from '../../lib/margin'
import { AiDocumentValidationError } from './ai-documents.errors'
import { MatchingService } from './matching.service'
import type { AiDocumentDraft, DraftLine } from './ai-documents.types'
import type { ExtractedDocument } from './extraction.schema'

/**
 * Turns a reviewed draft into real rows.
 *
 * Everything lands in DRAFT state: a purchase order with quantityReceived = 0.
 * Stock, variant.cost and cash only move when the merchant runs the existing
 * receive flow, so an AI misread can never silently change inventory.
 */

const matching = new MatchingService()

export interface ConfirmResult {
    jobId: string
    purchaseOrderId: string | null
    createdProductIds: string[]
    correctionCount: number
}

const slugify = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '')

const buildUniqueSlug = async (tx: Prisma.TransactionClient, tenantId: string, base: string) => {
    const root = slugify(base) || 'produit'
    for (let i = 0; i < 50; i += 1) {
        const slug = i === 0 ? root : `${root}-${i + 1}`
        const exists = await tx.product.findUnique({
            where: { tenantId_slug: { tenantId, slug } },
            select: { id: true }
        })
        if (!exists) return slug
    }
    return `${root}-${Date.now()}`
}

const ensureUniqueSku = async (tx: Prisma.TransactionClient, tenantId: string, candidate: string) => {
    const base = candidate.slice(0, 32)
    for (let i = 0; i < 50; i += 1) {
        const suffix = i === 0 ? '' : `-${i + 1}`
        const sku = (base.slice(0, 32 - suffix.length) + suffix).slice(0, 32)
        const exists = await tx.productVariant.findFirst({ where: { tenantId, sku }, select: { id: true } })
        if (!exists) return sku
    }
    return (base.slice(0, 26) + '-' + String(Date.now()).slice(-5)).slice(0, 32)
}

export class ConfirmService {
    /**
     * @param canCreateProducts staff without `products:create` may still confirm
     *   an invoice, but only one whose lines all match existing variants.
     */
    async confirm(args: {
        tenantId: string
        jobId: string
        userId?: string | null
        canCreateProducts: boolean
    }): Promise<ConfirmResult> {
        const job = await prisma.aiDocumentJob.findFirst({
            where: { tenantId: args.tenantId, id: args.jobId }
        })
        if (!job) throw new AiDocumentValidationError(404, 'Document not found')
        if (job.status === 'CONFIRMED') {
            throw new AiDocumentValidationError(409, 'This document has already been imported')
        }
        if (job.status !== 'READY') {
            throw new AiDocumentValidationError(409, `A ${job.status.toLowerCase()} document cannot be imported`)
        }

        const draft = job.draft as unknown as AiDocumentDraft | null
        if (!draft) throw new AiDocumentValidationError(409, 'This document has nothing to import')

        const usable = draft.lines.filter((l) => l.action !== 'skip')
        if (!usable.length) {
            throw new AiDocumentValidationError(400, 'Every line is skipped — nothing to import')
        }
        if (!args.canCreateProducts && usable.some((l) => l.action === 'create')) {
            throw new AiDocumentValidationError(
                403,
                'You do not have permission to create products. Match every line to an existing product, or ask an admin to import this.'
            )
        }

        // A line the model could not read at all becomes a product called
        // "Produit" and a purchase line for nothing. Catch it here rather than
        // through the confidence gate, which only covers values it *did* read.
        const unlabelled = usable.find((l) => !l.label.trim())
        if (unlabelled) {
            throw new AiDocumentValidationError(
                400,
                `Line ${unlabelled.index + 1} has no product name. Type one, or skip the line.`
            )
        }

        const wantsPurchaseOrder = job.kind === 'PURCHASE_INVOICE' || job.kind === 'DELIVERY_NOTE'
        if (wantsPurchaseOrder && usable.some((l) => l.quantity <= 0)) {
            throw new AiDocumentValidationError(400, 'Every imported line needs a quantity of at least 1')
        }

        const createdProductIds: string[] = []

        const result = await prisma.$transaction(async (tx) => {
            const supplierId = await this.resolveSupplier(tx, args.tenantId, draft)

            // Line index -> the variant it will hit, creating products as needed.
            const variantByIndex = new Map<number, string>()
            for (const line of usable) {
                if (line.action === 'match' && line.variantId) {
                    const owned = await tx.productVariant.findFirst({
                        where: { tenantId: args.tenantId, id: line.variantId },
                        select: { id: true }
                    })
                    if (!owned) {
                        throw new AiDocumentValidationError(
                            400,
                            `Line ${line.index + 1} points at a product that no longer exists`
                        )
                    }
                    variantByIndex.set(line.index, owned.id)
                    continue
                }

                const created = await this.createProductForLine(tx, args.tenantId, line)
                createdProductIds.push(created.productId)
                variantByIndex.set(line.index, created.variantId)
            }

            let purchaseOrderId: string | null = null
            if (wantsPurchaseOrder) {
                purchaseOrderId = await this.createPurchaseOrder(tx, {
                    tenantId: args.tenantId,
                    supplierId,
                    draft,
                    lines: usable,
                    variantByIndex,
                    userId: args.userId ?? null
                })
            }

            const corrections = this.diffCorrections(
                job.extraction as unknown as ExtractedDocument | null,
                draft,
                supplierId
            )
            if (corrections.length) {
                await tx.aiDocumentCorrection.createMany({
                    data: corrections.map((c) => ({ ...c, tenantId: args.tenantId, jobId: job.id }))
                })
            }

            await tx.aiDocumentJob.update({
                where: { id: job.id },
                data: {
                    status: 'CONFIRMED',
                    confirmedAt: new Date(),
                    supplierId,
                    purchaseOrderId
                }
            })

            return { supplierId, purchaseOrderId, correctionCount: corrections.length, variantByIndex }
        })

        // Alias memory is a convenience, not part of the import: a failure here
        // must not roll back a purchase order the merchant already confirmed.
        try {
            await matching.rememberAliases(
                args.tenantId,
                result.supplierId,
                usable
                    .map((line) => ({ label: line.label, variantId: result.variantByIndex.get(line.index)! }))
                    .filter((p) => p.label && p.variantId)
            )
        } catch (error) {
            console.error('AI document alias memory error:', error)
        }

        return {
            jobId: job.id,
            purchaseOrderId: result.purchaseOrderId,
            createdProductIds,
            correctionCount: result.correctionCount
        }
    }

    /** Existing supplier, a new one from the extracted name, or none at all. */
    private async resolveSupplier(
        tx: Prisma.TransactionClient,
        tenantId: string,
        draft: AiDocumentDraft
    ): Promise<string | null> {
        if (draft.supplier.supplierId) {
            const existing = await tx.supplier.findFirst({
                where: { tenantId, id: draft.supplier.supplierId },
                select: { id: true }
            })
            if (!existing) throw new AiDocumentValidationError(400, 'The selected supplier no longer exists')
            return existing.id
        }

        if (!draft.supplier.create || !draft.supplier.name) return null

        const name = draft.supplier.name.trim().slice(0, 200)
        // Supplier names are unique per tenant; a re-scan of the same invoice
        // must reuse the row rather than fail the whole import.
        const existing = await tx.supplier.findFirst({ where: { tenantId, name }, select: { id: true } })
        if (existing) return existing.id

        const created = await tx.supplier.create({
            data: {
                tenantId,
                name,
                phone: draft.supplier.phone?.slice(0, 40) ?? null,
                address: draft.supplier.address?.slice(0, 300) ?? null
            },
            select: { id: true }
        })
        return created.id
    }

    /** A product with one default variant carrying the scanned cost and price. */
    private async createProductForLine(
        tx: Prisma.TransactionClient,
        tenantId: string,
        line: DraftLine
    ): Promise<{ productId: string; variantId: string }> {
        const title = (line.label || 'Produit').slice(0, 200)
        const slug = await buildUniqueSlug(tx, tenantId, title)
        const price = toDecimal(line.salePrice) ?? new Prisma.Decimal(0)
        const cost = toDecimal(line.unitCost) ?? new Prisma.Decimal(0)

        const product = await tx.product.create({
            data: {
                tenantId,
                title,
                slug,
                price,
                stock: 0,
                isActive: true
            },
            select: { id: true, slug: true }
        })

        // Prefer the supplier's own article code when it fits our SKU rules —
        // it is what the next invoice from them will print.
        const skuBase =
            line.sku && /^[A-Za-z0-9_-]{1,32}$/.test(line.sku)
                ? line.sku.toUpperCase()
                : suggestSkuFromProduct(product.slug, '')
        const sku = await ensureUniqueSku(tx, tenantId, skuBase)

        const barcode =
            line.barcode && /^[A-Za-z0-9_-]{1,32}$/.test(line.barcode) ? line.barcode.toUpperCase() : null
        const barcodeFree = barcode
            ? !(await tx.productVariant.findFirst({ where: { tenantId, barcode }, select: { id: true } }))
            : false

        const variant = await tx.productVariant.create({
            data: {
                tenantId,
                productId: product.id,
                sku,
                barcode: barcodeFree ? barcode : null,
                price,
                cost,
                stock: 0,
                reserved: 0,
                safetyStock: 0,
                isActive: true,
                trackInventory: true
            },
            select: { id: true }
        })

        return { productId: product.id, variantId: variant.id }
    }

    /**
     * A DRAFT purchase order. quantityReceived stays 0 — the merchant receives
     * it from the existing screen, which is what moves stock and cost.
     */
    private async createPurchaseOrder(
        tx: Prisma.TransactionClient,
        args: {
            tenantId: string
            supplierId: string | null
            draft: AiDocumentDraft
            lines: DraftLine[]
            variantByIndex: Map<number, string>
            userId: string | null
        }
    ): Promise<string> {
        const total = args.lines.reduce(
            (sum, line) => sum.plus(new Prisma.Decimal(line.unitCost).times(line.quantity)),
            new Prisma.Decimal(0)
        )

        const order = await tx.purchaseOrder.create({
            data: {
                tenantId: args.tenantId,
                supplierId: args.supplierId,
                status: 'DRAFT',
                paymentStatus: 'UNPAID',
                totalAmount: total,
                paidAmount: 0,
                reference: args.draft.reference?.slice(0, 64) ?? null,
                currency: (args.draft.currency || 'DZD').slice(0, 8),
                notes: 'Imported from a scanned document.',
                createdByUserId: args.userId
            },
            select: { id: true }
        })

        for (const line of args.lines) {
            const variantId = args.variantByIndex.get(line.index)
            if (!variantId) continue
            await tx.purchaseOrderItem.create({
                data: {
                    tenantId: args.tenantId,
                    purchaseOrderId: order.id,
                    variantId,
                    quantityOrdered: Math.max(1, Math.trunc(line.quantity)),
                    quantityReceived: 0,
                    unitCost: new Prisma.Decimal(line.unitCost),
                    salePrice: line.salePrice !== null ? new Prisma.Decimal(line.salePrice) : null
                }
            })
        }

        return order.id
    }

    /**
     * Every field the merchant changed between extraction and confirmation.
     * Feeds accuracy reporting per confidence band — the only way to tell
     * whether the model's self-reported confidence is honest.
     */
    private diffCorrections(
        extraction: ExtractedDocument | null,
        draft: AiDocumentDraft,
        supplierId: string | null
    ) {
        if (!extraction) return []
        const out: {
            lineIndex: number | null
            field: string
            aiValue: string | null
            userValue: string | null
            confidence: Prisma.Decimal | null
        }[] = []

        const push = (
            lineIndex: number | null,
            field: string,
            aiValue: unknown,
            userValue: unknown,
            confidence: number | null
        ) => {
            const ai = aiValue === null || aiValue === undefined ? null : String(aiValue)
            const user = userValue === null || userValue === undefined ? null : String(userValue)
            if (ai === user) return
            out.push({
                lineIndex,
                field,
                aiValue: ai?.slice(0, 500) ?? null,
                userValue: user?.slice(0, 500) ?? null,
                confidence: confidence === null ? null : new Prisma.Decimal(confidence)
            })
        }

        push(null, 'supplierName', extraction.supplier.name.value, draft.supplier.name, extraction.supplier.name.confidence)
        push(null, 'reference', extraction.reference.value, draft.reference, extraction.reference.confidence)

        for (const line of draft.lines) {
            const source = extraction.lines[line.index]
            if (!source) continue

            push(line.index, 'label', source.label.value, line.label, source.label.confidence)
            push(line.index, 'quantity', source.quantity.value, line.quantity, source.quantity.confidence)
            push(line.index, 'unitCost', source.unitCost.value, line.unitCost, source.unitCost.confidence)
            if (line.salePricePinned) {
                push(line.index, 'salePrice', source.salePrice.value, line.salePrice, source.salePrice.confidence)
            }
            if (line.action === 'skip') {
                push(line.index, 'variantMatch', normalizeLabel(source.label.value), 'SKIPPED', source.label.confidence)
            }
        }

        // Only recorded when a supplier was actually resolved, so the log does not
        // fill with "null -> null" rows for catalogs that name no supplier.
        if (supplierId && !draft.supplier.supplierId) {
            push(null, 'supplierCreated', null, supplierId, extraction.supplier.name.confidence)
        }

        return out
    }
}
