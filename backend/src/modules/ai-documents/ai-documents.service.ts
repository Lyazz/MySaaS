import prisma from '../../lib/prisma'
import { resolvePlan } from '../../lib/plan-limits'
import { currentUsageWindow } from '../../../../shared/pricing/billing-period'
import { aiDocumentMaxPages, isAiEnabled } from '../../lib/anthropic'
import { applyMargin, normalizeMarginPercent, toDecimal } from '../../lib/margin'
import { rankCandidates } from '../../lib/text-match'
import { AiDocumentValidationError, type AiDocumentKind } from './ai-documents.errors'
import { AiDocumentStorageService } from './document-storage.service'
import { ExtractionService } from './extraction.service'
import { LOW_CONFIDENCE_THRESHOLD, type ExtractedDocument } from './extraction.schema'
import { MatchingService, type VariantSummary } from './matching.service'
import type { AiDocumentDraft, AiDocumentJobView, DraftLine } from './ai-documents.types'

export interface SubscriptionContext {
    planCode: string
    interval: string
    currentPeriodStart: Date
    currentPeriodEnd?: Date | null
}

const storage = new AiDocumentStorageService()
const extraction = new ExtractionService()
const matching = new MatchingService()

/** Fields that carry a confidence score and therefore gate the confirm button. */
const CONFIDENCE_FIELDS = ['label', 'quantity', 'unitCost'] as const

/** Cheap page count for a PDF: count the page objects. Images are always one page. */
export const countPages = (mimeType: string, buffer: Buffer): number => {
    if (mimeType !== 'application/pdf') return 1
    const text = buffer.toString('latin1')
    const matches = text.match(/\/Type\s*\/Page[^s]/g)
    const count = matches?.length ?? 0
    return Math.max(1, count)
}

export class AiDocumentsService {
    /**
     * Plan gate. Counts *pages*, not jobs: a five-page PDF costs five times what
     * a phone photo costs, and billing the merchant per job would let one scan
     * consume an unbounded amount of API budget.
     *
     * Structurally identical to PosService.enforceOrderLimit.
     */
    async enforceScanQuota(
        tenantId: string,
        pageCount: number,
        subscription?: SubscriptionContext | null
    ) {
        if (!subscription) return

        const plan = await resolvePlan(subscription.planCode)
        const limit = plan.aiScansPerMonth
        if (limit <= 0) {
            throw new AiDocumentValidationError(
                403,
                'AI document import is not included in your plan. Upgrade to scan invoices.',
                { code: 'PLAN_FEATURE_UNAVAILABLE' }
            )
        }

        const quota = currentUsageWindow(subscription.currentPeriodStart)
        const used = await prisma.aiDocumentJob.aggregate({
            _sum: { pageCount: true },
            where: {
                tenantId,
                status: { not: 'FAILED' },
                createdAt: { gte: quota.start, lt: quota.end }
            }
        })

        const consumed = used._sum.pageCount ?? 0
        if (consumed + pageCount > limit) {
            throw new AiDocumentValidationError(
                429,
                `Monthly AI scan limit reached (${consumed}/${limit} pages). Upgrade your plan to scan more.`,
                { code: 'AI_SCAN_LIMIT', meta: { used: consumed, limit, requested: pageCount } }
            )
        }
    }

    /** Pages consumed in the tenant's current quota window, for the usage meter. */
    async usedScansInWindow(tenantId: string, start: Date, end: Date) {
        const used = await prisma.aiDocumentJob.aggregate({
            _sum: { pageCount: true },
            where: { tenantId, status: { not: 'FAILED' }, createdAt: { gte: start, lt: end } }
        })
        return used._sum.pageCount ?? 0
    }

    /**
     * Stores the upload and creates the job. Extraction is NOT awaited — the
     * caller gets a job id immediately and follows progress on the stream, so a
     * 90-second multi-page read never hangs on a phone connection.
     */
    async createJob(args: {
        tenantId: string
        kind: AiDocumentKind
        mimeType: string
        buffer: Buffer
        userId?: string | null
        subscription?: SubscriptionContext | null
    }) {
        if (!(await isAiEnabled())) {
            throw new AiDocumentValidationError(503, 'AI document import is not configured on this server')
        }

        const pageCount = countPages(args.mimeType, args.buffer)
        const maxPages = await aiDocumentMaxPages()
        if (pageCount > maxPages) {
            throw new AiDocumentValidationError(
                400,
                `This document has ${pageCount} pages; the limit is ${maxPages}. Split it and scan the parts.`
            )
        }

        await this.enforceScanQuota(args.tenantId, pageCount, args.subscription)

        const stored = await storage.store({
            tenantId: args.tenantId,
            mimeType: args.mimeType,
            buffer: args.buffer
        })

        const job = await prisma.aiDocumentJob.create({
            data: {
                tenantId: args.tenantId,
                kind: args.kind,
                status: 'PENDING',
                documentRef: stored.documentRef,
                mimeType: stored.mimeType,
                pageCount,
                createdByUserId: args.userId ?? null
            },
            select: { id: true, status: true, pageCount: true, kind: true, createdAt: true }
        })

        return { job, buffer: stored.buffer, mimeType: stored.mimeType }
    }

    /**
     * Runs extraction + matching and lands the job in READY or FAILED.
     * Never throws: a failure is a job state the review screen can render.
     */
    async runExtraction(args: {
        tenantId: string
        jobId: string
        kind: AiDocumentKind
        mimeType: string
        buffer: Buffer
    }): Promise<'READY' | 'FAILED'> {
        await prisma.aiDocumentJob.updateMany({
            where: { tenantId: args.tenantId, id: args.jobId, status: 'PENDING' },
            data: { status: 'EXTRACTING', startedAt: new Date() }
        })

        try {
            const result = await extraction.extract({
                buffer: args.buffer,
                mimeType: args.mimeType,
                kind: args.kind
            })

            const draft = await this.buildDraft(args.tenantId, result.document)

            await prisma.aiDocumentJob.update({
                where: { id: args.jobId },
                data: {
                    status: 'READY',
                    completedAt: new Date(),
                    model: result.model,
                    inputTokens: result.inputTokens,
                    outputTokens: result.outputTokens,
                    extraction: result.document as any,
                    draft: draft as any,
                    supplierId: draft.supplier.supplierId
                }
            })
            return 'READY'
        } catch (error: any) {
            const message =
                error instanceof AiDocumentValidationError
                    ? error.statusMessage
                    : 'The document could not be read. Try a clearer photo.'
            if (!(error instanceof AiDocumentValidationError)) {
                console.error('AI document extraction error:', error)
            }
            await prisma.aiDocumentJob.update({
                where: { id: args.jobId },
                data: { status: 'FAILED', completedAt: new Date(), errorMessage: message }
            })
            return 'FAILED'
        }
    }

    /** Turns a raw extraction into the merchant's editable working copy. */
    private async buildDraft(tenantId: string, doc: ExtractedDocument): Promise<AiDocumentDraft> {
        const settings = await prisma.storeSettings.findUnique({
            where: { tenantId },
            select: { defaultMarginPercent: true }
        })
        const marginPercent = normalizeMarginPercent(settings?.defaultMarginPercent, 30)

        const suppliers = await prisma.supplier.findMany({
            where: { tenantId },
            select: { id: true, name: true }
        })
        const supplierMatches = doc.supplier.name.value
            ? rankCandidates(doc.supplier.name.value, suppliers, (s) => s.name, {
                  limit: 3,
                  minScore: 0.5
              })
            : []
        const bestSupplier = supplierMatches[0]
        const autoSupplier = bestSupplier && bestSupplier.score >= 0.85 ? bestSupplier.item.id : null

        const variants = await matching.loadVariants(tenantId)
        const aliases = await matching.loadAliases(tenantId, autoSupplier)
        const variantById = new Map(variants.map((v) => [v.id, v]))

        const lines: DraftLine[] = doc.lines.map((line, index) => {
            const match = matching.matchLine(
                { label: line.label.value, sku: line.sku.value, barcode: line.barcode.value },
                variants,
                aliases
            )

            const unitCost = line.unitCost.value ?? 0
            const salePrice = this.proposeSalePrice(line.salePrice.value, unitCost, marginPercent, variantById.get(match.variantId ?? ''))

            return {
                index,
                label: line.label.value ?? '',
                sku: line.sku.value,
                barcode: line.barcode.value,
                quantity: line.quantity.value ?? 0,
                unitCost,
                salePrice,
                salePricePinned: line.salePrice.value !== null,
                action: match.variantId ? 'match' : 'create',
                variantId: match.variantId,
                matchSource: match.matchSource,
                matchScore: Number(match.score.toFixed(3)),
                candidates: match.candidates,
                confidence: {
                    label: line.label.confidence,
                    sku: line.sku.confidence,
                    barcode: line.barcode.confidence,
                    quantity: line.quantity.confidence,
                    unitCost: line.unitCost.confidence,
                    salePrice: line.salePrice.confidence
                },
                reviewed: []
            }
        })

        return {
            supplier: {
                supplierId: autoSupplier,
                name: doc.supplier.name.value,
                phone: doc.supplier.phone.value,
                address: doc.supplier.address.value,
                create: !autoSupplier && Boolean(doc.supplier.name.value),
                matchScore: bestSupplier ? Number(bestSupplier.score.toFixed(3)) : 0,
                candidates: supplierMatches.map((m) => ({
                    supplierId: m.item.id,
                    name: m.item.name,
                    score: Number(m.score.toFixed(3))
                }))
            },
            reference: doc.reference.value,
            issuedAt: doc.issuedAt.value,
            currency: doc.currency,
            marginPercent,
            lines,
            totalsMismatch: this.checkTotals(lines, doc.totals.grandTotal.value),
            notes: doc.notes
        }
    }

    /**
     * Sale price for a line: what the document printed, else the matched
     * variant's existing price, else cost + margin.
     */
    private proposeSalePrice(
        printed: number | null,
        unitCost: number,
        marginPercent: number,
        variant?: VariantSummary
    ): number | null {
        if (printed !== null && printed > 0) return printed
        if (variant) {
            const existing = toDecimal(variant.price)
            if (existing && existing.gt(0)) return existing.toNumber()
        }
        if (unitCost <= 0) return null
        return applyMargin(unitCost, marginPercent).toNumber()
    }

    /**
     * Cross-checks the lines against the printed total. Digit errors on a
     * handwritten quantity are the most common failure and confidence alone
     * does not catch them — the model can be confidently wrong about a "7"
     * that is really a "1".
     */
    private checkTotals(lines: DraftLine[], printed: number | null) {
        if (printed === null || printed <= 0) return null
        const computed = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)
        if (computed <= 0) return null
        // 1% tolerance absorbs TVA/timbre rounding on the printed total.
        if (Math.abs(computed - printed) / printed <= 0.01) return null
        return { computed: Number(computed.toFixed(2)), printed }
    }

    async list(tenantId: string, filters?: { kind?: string; status?: string }) {
        return prisma.aiDocumentJob.findMany({
            where: {
                tenantId,
                ...(filters?.kind ? { kind: filters.kind } : {}),
                ...(filters?.status ? { status: filters.status } : {})
            },
            select: {
                id: true,
                kind: true,
                status: true,
                pageCount: true,
                errorMessage: true,
                supplierId: true,
                purchaseOrderId: true,
                createdAt: true,
                confirmedAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        })
    }

    /** Job plus the variant details the review screen needs to render matches. */
    async getById(tenantId: string, jobId: string): Promise<AiDocumentJobView | null> {
        const job = await prisma.aiDocumentJob.findFirst({ where: { tenantId, id: jobId } })
        if (!job) return null

        const draft = (job.draft as unknown as AiDocumentDraft | null) ?? null
        const referenced = new Set<string>()
        for (const line of draft?.lines ?? []) {
            if (line.variantId) referenced.add(line.variantId)
            for (const c of line.candidates) referenced.add(c.variantId)
        }

        const variants = referenced.size
            ? await prisma.productVariant.findMany({
                  where: { tenantId, id: { in: [...referenced] } },
                  select: {
                      id: true,
                      sku: true,
                      cost: true,
                      price: true,
                      product: { select: { title: true } },
                      optionValues: { select: { optionValue: { select: { label: true } } } }
                  }
              })
            : []

        const variantMap: AiDocumentJobView['variants'] = {}
        for (const v of variants as any[]) {
            const options = v.optionValues
                ?.map((ov: any) => ov.optionValue?.label)
                .filter(Boolean)
                .join(' / ')
            variantMap[v.id] = {
                sku: v.sku,
                title: options ? `${v.product?.title ?? ''} — ${options}` : (v.product?.title ?? ''),
                cost: String(v.cost ?? '0'),
                price: String(v.price ?? '0')
            }
        }

        return {
            id: job.id,
            kind: job.kind,
            status: job.status,
            mimeType: job.mimeType,
            pageCount: job.pageCount,
            errorMessage: job.errorMessage,
            supplierId: job.supplierId,
            purchaseOrderId: job.purchaseOrderId,
            createdAt: job.createdAt,
            completedAt: job.completedAt,
            confirmedAt: job.confirmedAt,
            draft,
            extraction: (job.extraction as unknown as ExtractedDocument | null) ?? null,
            variants: variantMap
        }
    }

    async getDocumentUrl(tenantId: string, jobId: string) {
        const job = await prisma.aiDocumentJob.findFirst({
            where: { tenantId, id: jobId },
            select: { documentRef: true, mimeType: true }
        })
        if (!job) throw new AiDocumentValidationError(404, 'Document not found')
        return storage.getReadUrl({ tenantId, documentRef: job.documentRef, mimeType: job.mimeType })
    }

    /**
     * Replaces the draft with the merchant's edited copy.
     *
     * The client owns the shape, so everything is re-validated here: a draft is
     * the input to a confirm that writes purchase orders and creates products.
     */
    async patchDraft(tenantId: string, jobId: string, incoming: any): Promise<AiDocumentDraft> {
        const job = await prisma.aiDocumentJob.findFirst({
            where: { tenantId, id: jobId },
            select: { status: true, draft: true }
        })
        if (!job) throw new AiDocumentValidationError(404, 'Document not found')
        if (job.status !== 'READY') {
            throw new AiDocumentValidationError(409, `A ${job.status.toLowerCase()} document cannot be edited`)
        }

        const current = job.draft as unknown as AiDocumentDraft
        const merged = this.sanitizeDraft(incoming, current)

        await prisma.aiDocumentJob.update({
            where: { id: jobId },
            data: { draft: merged as any, supplierId: merged.supplier.supplierId }
        })
        return merged
    }

    private sanitizeDraft(incoming: any, current: AiDocumentDraft): AiDocumentDraft {
        const str = (v: unknown, max = 500): string | null => {
            if (typeof v !== 'string') return null
            const t = v.trim()
            return t ? t.slice(0, max) : null
        }
        const num = (v: unknown, fallback = 0): number => {
            const n = typeof v === 'number' ? v : Number(v)
            return Number.isFinite(n) && n >= 0 ? n : fallback
        }

        const marginPercent = normalizeMarginPercent(incoming?.marginPercent, current.marginPercent)
        const byIndex = new Map(current.lines.map((l) => [l.index, l]))

        const lines: DraftLine[] = Array.isArray(incoming?.lines)
            ? incoming.lines
                  .map((raw: any) => {
                      const base = byIndex.get(Number(raw?.index))
                      if (!base) return null

                      const action =
                          raw?.action === 'create' || raw?.action === 'skip' || raw?.action === 'match'
                              ? raw.action
                              : base.action
                      const variantId = action === 'match' ? (str(raw?.variantId, 64) ?? base.variantId) : null
                      const unitCost = num(raw?.unitCost, base.unitCost)
                      const pinned = Boolean(raw?.salePricePinned ?? base.salePricePinned)
                      const salePrice = pinned
                          ? num(raw?.salePrice, base.salePrice ?? 0)
                          : unitCost > 0
                            ? applyMargin(unitCost, marginPercent).toNumber()
                            : null

                      const reviewed = Array.isArray(raw?.reviewed)
                          ? [...new Set(raw.reviewed.filter((f: unknown) => typeof f === 'string'))].slice(0, 16)
                          : base.reviewed

                      return {
                          ...base,
                          label: str(raw?.label, 300) ?? base.label,
                          sku: str(raw?.sku, 64),
                          barcode: str(raw?.barcode, 64),
                          quantity: Math.trunc(num(raw?.quantity, base.quantity)),
                          unitCost,
                          salePrice,
                          salePricePinned: pinned,
                          action,
                          variantId,
                          reviewed
                      } as DraftLine
                  })
                  .filter(Boolean)
            : current.lines

        const supplierIncoming = incoming?.supplier ?? {}
        const supplierId = str(supplierIncoming?.supplierId, 64)

        return {
            supplier: {
                supplierId,
                name: str(supplierIncoming?.name, 200) ?? current.supplier.name,
                phone: str(supplierIncoming?.phone, 40) ?? current.supplier.phone,
                address: str(supplierIncoming?.address, 300) ?? current.supplier.address,
                create: !supplierId && Boolean(supplierIncoming?.create),
                matchScore: current.supplier.matchScore,
                candidates: current.supplier.candidates
            },
            reference: str(incoming?.reference, 64) ?? current.reference,
            issuedAt: str(incoming?.issuedAt, 32) ?? current.issuedAt,
            currency: str(incoming?.currency, 8) ?? current.currency,
            marginPercent,
            lines,
            totalsMismatch: this.checkTotals(
                lines,
                current.totalsMismatch?.printed ?? null
            ),
            notes: current.notes
        }
    }

    /**
     * Fields the merchant must acknowledge before confirming.
     *
     * A confidence of exactly 0 means the model returned no value at all — the
     * schema pairs every null with a 0 — and an absent value is not something a
     * merchant can meaningfully "review". A catalogue prints no quantities, so
     * flagging every one of them would make catalogues unconfirmable. Missing
     * values that actually matter are caught by ConfirmService's own checks
     * (a purchase line needs a quantity, every line needs a label); this gate is
     * only for values the model read and was unsure about.
     */
    unreviewedFields(draft: AiDocumentDraft): { index: number; field: string }[] {
        const pending: { index: number; field: string }[] = []
        for (const line of draft.lines) {
            if (line.action === 'skip') continue
            for (const field of CONFIDENCE_FIELDS) {
                const score = line.confidence[field] ?? 0
                if (score > 0 && score < LOW_CONFIDENCE_THRESHOLD && !line.reviewed.includes(field)) {
                    pending.push({ index: line.index, field })
                }
            }
        }
        return pending
    }

    async cancel(tenantId: string, jobId: string) {
        const job = await prisma.aiDocumentJob.findFirst({
            where: { tenantId, id: jobId },
            select: { id: true, status: true }
        })
        if (!job) throw new AiDocumentValidationError(404, 'Document not found')
        if (job.status === 'CONFIRMED') {
            throw new AiDocumentValidationError(409, 'A confirmed document cannot be cancelled')
        }
        await prisma.aiDocumentJob.update({ where: { id: job.id }, data: { status: 'CANCELLED' } })
        return { id: job.id, status: 'CANCELLED' }
    }
}
