import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Prisma } from '@prisma/client'
import PDFDocument from 'pdfkit'
import prisma from '../../lib/prisma'
import { sanitizeInvoiceNumberPrefix } from '../store-settings/store-settings.service'
import { formatPriceAmount } from '../../../../shared/pricing/money-format'

type InvoiceSourceType = 'SALE' | 'ORDER'

type InvoiceLine = {
    title: string
    variantLabel: string | null
    quantity: number
    unitPrice: number
    lineTotal: number
}

export type SalesInvoicePdfModel = {
    invoiceNumber: string
    issuedAt: Date
    tenantName: string
    logoUrl: string | null
    showLogo: boolean
    footerText: string | null
    currency: string
    sourceType: InvoiceSourceType
    sourceId: string
    sourceDate: Date
    customerName: string
    customerPhone: string | null
    customerAddress: string | null
    contactLines: string[]
    lines: InvoiceLine[]
    subtotal: number
    shippingAmount: number
    total: number
}

export class SalesInvoiceValidationError extends Error {
    statusCode: number
    statusMessage: string
    code?: string

    constructor(statusCode: number, statusMessage: string, code?: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
        this.code = code
    }
}

const toNumber = (value: unknown): number => {
    const n = typeof value === 'number' ? value : Number(value ?? 0)
    return Number.isFinite(n) ? n : 0
}

export const buildInvoiceNumber = (prefix: unknown, sourceType: InvoiceSourceType, sourceId: string) => {
    const normalizedPrefix = sanitizeInvoiceNumberPrefix(prefix)
    const sourceRef = String(sourceId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()
    return `${normalizedPrefix}-${sourceType}-${sourceRef || 'UNKNOWN'}`
}

const formatVariantLabel = (variant: any): string | null => {
    if (!variant) return null
    if (typeof variant.sku === 'string' && variant.sku.trim()) return variant.sku.trim()
    return null
}

const buildSaleLines = (items: any[]): InvoiceLine[] =>
    items.map((item) => ({
        title: item.product?.title ?? item.productId ?? 'Item',
        variantLabel: formatVariantLabel(item.variant),
        quantity: Number(item.quantity || 0),
        unitPrice: toNumber(item.price),
        lineTotal: toNumber(item.price) * Number(item.quantity || 0)
    }))

const buildOrderLines = (items: any[]): InvoiceLine[] =>
    items.map((item) => ({
        title: item.product?.title ?? item.productId ?? 'Item',
        variantLabel: formatVariantLabel(item.variant),
        quantity: Number(item.quantity || 0),
        unitPrice: toNumber(item.price),
        lineTotal: item.lineTotal == null ? toNumber(item.price) * Number(item.quantity || 0) : toNumber(item.lineTotal)
    }))

export function buildSalesInvoicePdfModel(args: {
    tenant: { name: string }
    settings: {
        logoUrl?: string | null
        invoiceShowLogo?: boolean | null
        invoiceFooterText?: string | null
        currencyCode?: string | null
    }
    contactInfos: Array<{ kind: string; value: string; label?: string | null }>
    invoice: { invoiceNumber: string; issuedAt: Date }
    sourceType: InvoiceSourceType
    source: any
}): SalesInvoicePdfModel {
    const currency = (args.settings.currencyCode || 'DZD').toUpperCase()
    const contactLines = args.contactInfos
        .filter((info) => ['phone', 'email', 'address'].includes(info.kind))
        .map((info) => `${info.label || info.kind}: ${info.value}`)
        .slice(0, 4)

    if (args.sourceType === 'ORDER') {
        const subtotal = toNumber(args.source.totalAmount)
        const shippingAmount = toNumber(args.source.shippingAmount)
        const total = args.source.totalWithShippingAmount == null
            ? subtotal + shippingAmount
            : toNumber(args.source.totalWithShippingAmount)

        return {
            invoiceNumber: args.invoice.invoiceNumber,
            issuedAt: args.invoice.issuedAt,
            tenantName: args.tenant.name,
            logoUrl: args.settings.logoUrl ?? null,
            showLogo: args.settings.invoiceShowLogo !== false,
            footerText: args.settings.invoiceFooterText ?? null,
            currency,
            sourceType: 'ORDER',
            sourceId: args.source.id,
            sourceDate: args.source.createdAt,
            customerName: args.source.customerName || 'Guest',
            customerPhone: args.source.customerPhone || null,
            customerAddress: args.source.shippingAddressLine1 || args.source.customerAddress || null,
            contactLines,
            lines: buildOrderLines(args.source.items ?? []),
            subtotal,
            shippingAmount,
            total
        }
    }

    const subtotal = toNumber(args.source.totalAmount)
    return {
        invoiceNumber: args.invoice.invoiceNumber,
        issuedAt: args.invoice.issuedAt,
        tenantName: args.tenant.name,
        logoUrl: args.settings.logoUrl ?? null,
        showLogo: args.settings.invoiceShowLogo !== false,
        footerText: args.settings.invoiceFooterText ?? null,
        currency,
        sourceType: 'SALE',
        sourceId: args.source.id,
        sourceDate: args.source.createdAt,
        customerName: args.source.customerName || 'Guest',
        customerPhone: args.source.customerPhone || null,
        customerAddress: args.source.customerAddress || null,
        contactLines,
        lines: buildSaleLines(args.source.items ?? []),
        subtotal,
        shippingAmount: 0,
        total: subtotal
    }
}

async function loadLogoBuffer(logoUrl: string | null): Promise<Buffer | null> {
    if (!logoUrl) return null

    try {
        if (logoUrl.startsWith('data:image/')) {
            const base64 = logoUrl.split(',')[1]
            return base64 ? Buffer.from(base64, 'base64') : null
        }

        if (/^https?:\/\//i.test(logoUrl)) {
            const response = await fetch(logoUrl, { signal: AbortSignal.timeout(3000) })
            if (!response.ok) return null
            return Buffer.from(await response.arrayBuffer())
        }

        if (logoUrl.startsWith('/')) {
            const publicPath = path.join(process.cwd(), 'public', logoUrl)
            return await fs.readFile(publicPath)
        }
    } catch {
        return null
    }

    return null
}

const formatDate = (date: Date) => new Intl.DateTimeFormat('fr-DZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
}).format(new Date(date))

const currencyLabel = (currency: string) => {
    const normalized = String(currency || 'DZD').trim().toUpperCase()
    return normalized === 'DZD' ? 'DA' : normalized
}

export const formatInvoiceMoney = (value: unknown, currency: string) => {
    const amount = formatPriceAmount(value, {
        locale: 'fr-DZ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
    return amount ? `${amount} ${currencyLabel(currency)}` : `0,00 ${currencyLabel(currency)}`
}

export async function renderSalesInvoicePdf(model: SalesInvoicePdfModel): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 42 })
    const chunks: Buffer[] = []
    const logo = model.showLogo ? await loadLogoBuffer(model.logoUrl) : null

    return await new Promise<Buffer>((resolve, reject) => {
        doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const left = 42
        const right = doc.page.width - 42
        const contentWidth = right - left
        const ink = '#111827'
        const muted = '#6B7280'
        const light = '#F8FAFC'
        const lineColor = '#E5E7EB'
        const accent = '#65A30D'
        const accentDark = '#3F6212'
        const bottomLimit = doc.page.height - 122
        let pageNumber = 1

        const sourceLabel = model.sourceType === 'ORDER' ? 'Commande livrée' : 'Vente POS'

        const drawFooter = () => {
            const footerY = doc.page.height - 76
            doc.moveTo(left, footerY - 14).lineTo(right, footerY - 14).strokeColor(lineColor).stroke()
            doc.font('Helvetica').fontSize(8).fillColor(muted)
            const footer = model.footerText || `${model.tenantName} - Facture générée automatiquement`
            doc.text(footer, left, footerY, { width: contentWidth - 90, ellipsis: true })
            doc.text(`Page ${pageNumber}`, right - 70, footerY, { width: 70, align: 'right' })
            doc.fillColor(ink).strokeColor('#000')
        }

        const drawLogo = (x: number, y: number) => {
            if (logo) {
                try {
                    doc.image(logo, x, y, { fit: [72, 48] })
                    return
                } catch {
                    // Fall through to monogram when a remote/logo buffer is unreadable.
                }
            }

            doc.roundedRect(x, y, 52, 52, 12).fill(accent)
            doc.font('Helvetica-Bold').fontSize(20).fillColor('#FFFFFF')
            doc.text(model.tenantName.slice(0, 2).toUpperCase(), x, y + 15, { width: 52, align: 'center' })
            doc.fillColor(ink)
        }

        const drawHeader = (compact = false) => {
            doc.rect(0, 0, doc.page.width, 12).fill(accent)
            doc.rect(0, 12, doc.page.width, 2).fill('#DCFCE7')
            drawLogo(left, compact ? 34 : 38)

            doc.font('Helvetica-Bold').fontSize(compact ? 14 : 18).fillColor(ink)
            doc.text(model.tenantName, left + 68, compact ? 38 : 42, { width: 230, ellipsis: true })
            doc.font('Helvetica').fontSize(8.5).fillColor(muted)
            const contactY = compact ? 58 : 66
            if (model.contactLines.length > 0) {
                doc.text(model.contactLines.join('  |  '), left + 68, contactY, { width: 250, ellipsis: true })
            } else {
                doc.text('Informations de contact non renseignées', left + 68, contactY, { width: 250 })
            }

            doc.roundedRect(right - 170, compact ? 32 : 36, 170, compact ? 58 : 72, 10).fill(light)
            doc.font('Helvetica-Bold').fontSize(compact ? 18 : 24).fillColor(accentDark)
            doc.text('FACTURE', right - 158, compact ? 42 : 47, { width: 146, align: 'right' })
            doc.font('Helvetica').fontSize(8.5).fillColor(muted)
            doc.text(`N° ${model.invoiceNumber}`, right - 158, compact ? 65 : 77, { width: 146, align: 'right' })
            if (!compact) {
                doc.text(`Émise le ${formatDate(model.issuedAt)}`, right - 158, 92, { width: 146, align: 'right' })
            }

            doc.fillColor(ink)
        }

        const drawCard = (title: string, rows: Array<[string, string | null]>, x: number, y: number, w: number, h: number) => {
            doc.roundedRect(x, y, w, h, 10).fill(light)
            doc.font('Helvetica-Bold').fontSize(9).fillColor(accentDark)
            doc.text(title.toUpperCase(), x + 14, y + 12, { width: w - 28 })
            let rowY = y + 32
            for (const [label, value] of rows) {
                if (!value) continue
                doc.font('Helvetica').fontSize(8).fillColor(muted)
                doc.text(label, x + 14, rowY, { width: 72 })
                doc.font('Helvetica-Bold').fontSize(8.5).fillColor(ink)
                doc.text(value, x + 88, rowY, { width: w - 102, ellipsis: true })
                rowY += 15
            }
            doc.fillColor(ink)
        }

        const drawTableHeader = (y: number) => {
            doc.roundedRect(left, y, contentWidth, 28, 8).fill(accentDark)
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF')
            doc.text('Article', left + 12, y + 10, { width: 240 })
            doc.text('Qté', left + 298, y + 10, { width: 36, align: 'right' })
            doc.text('Prix unitaire', left + 350, y + 10, { width: 82, align: 'right' })
            doc.text('Montant', left + 442, y + 10, { width: contentWidth - 454, align: 'right' })
            doc.fillColor(ink)
        }

        const addContinuationPage = () => {
            drawFooter()
            doc.addPage()
            pageNumber += 1
            drawHeader(true)
            const nextY = 118
            drawTableHeader(nextY)
            return nextY + 38
        }

        drawHeader(false)

        const cardsTop = 136
        drawCard(
            'Client',
            [
                ['Nom', model.customerName],
                ['Téléphone', model.customerPhone],
                ['Adresse', model.customerAddress]
            ],
            left,
            cardsTop,
            246,
            112
        )
        drawCard(
            'Vente',
            [
                ['Type', sourceLabel],
                ['Référence', model.sourceId],
                ['Date', formatDate(model.sourceDate)]
            ],
            left + 266,
            cardsTop,
            contentWidth - 266,
            112
        )

        let y = cardsTop + 138
        doc.font('Helvetica-Bold').fontSize(11).fillColor(ink)
        doc.text('Articles facturés', left, y)
        doc.font('Helvetica').fontSize(8.5).fillColor(muted)
        doc.text(`${model.lines.length} ligne${model.lines.length === 1 ? '' : 's'}`, right - 80, y + 1, { width: 80, align: 'right' })
        y += 22
        drawTableHeader(y)
        y += 38

        for (const line of model.lines) {
            const title = line.variantLabel ? `${line.title} - ${line.variantLabel}` : line.title
            const titleHeight = Math.max(14, doc.heightOfString(title, { width: 240 }))
            const rowHeight = Math.max(34, titleHeight + 18)
            if (y + rowHeight > bottomLimit) {
                y = addContinuationPage()
            }

            doc.roundedRect(left, y - 6, contentWidth, rowHeight, 7).fill('#FFFFFF')
            doc.moveTo(left, y + rowHeight - 8).lineTo(right, y + rowHeight - 8).strokeColor(lineColor).stroke()
            doc.font('Helvetica-Bold').fontSize(9).fillColor(ink)
            doc.text(title, left + 12, y + 5, { width: 240 })
            doc.font('Helvetica').fontSize(8.5).fillColor(muted)
            doc.text(String(line.quantity), left + 298, y + 5, { width: 36, align: 'right' })
            doc.text(formatInvoiceMoney(line.unitPrice, model.currency), left + 350, y + 5, { width: 82, align: 'right' })
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(ink)
            doc.text(formatInvoiceMoney(line.lineTotal, model.currency), left + 442, y + 5, { width: contentWidth - 454, align: 'right' })
            y += rowHeight
        }

        y += 18
        const totalsHeight = model.shippingAmount > 0 ? 112 : 92
        if (y + totalsHeight > bottomLimit) {
            y = addContinuationPage()
        }

        const totalsX = right - 220
        doc.roundedRect(totalsX, y, 220, totalsHeight, 12).fill(light)
        doc.font('Helvetica').fontSize(9).fillColor(muted)
        doc.text('Sous-total', totalsX + 16, y + 16, { width: 90 })
        doc.font('Helvetica-Bold').fillColor(ink)
        doc.text(formatInvoiceMoney(model.subtotal, model.currency), totalsX + 104, y + 16, { width: 100, align: 'right' })

        let totalLineY = y + 38
        if (model.shippingAmount > 0) {
            doc.font('Helvetica').fontSize(9).fillColor(muted)
            doc.text('Livraison', totalsX + 16, totalLineY, { width: 90 })
            doc.font('Helvetica-Bold').fillColor(ink)
            doc.text(formatInvoiceMoney(model.shippingAmount, model.currency), totalsX + 104, totalLineY, { width: 100, align: 'right' })
            totalLineY += 24
        }

        doc.moveTo(totalsX + 16, totalLineY - 8).lineTo(totalsX + 204, totalLineY - 8).strokeColor(lineColor).stroke()
        doc.font('Helvetica-Bold').fontSize(12).fillColor(accentDark)
        doc.text('Total à payer', totalsX + 16, totalLineY + 2, { width: 90 })
        doc.fontSize(13)
        doc.text(formatInvoiceMoney(model.total, model.currency), totalsX + 104, totalLineY + 2, { width: 100, align: 'right' })

        doc.font('Helvetica').fontSize(8.5).fillColor(muted)
        doc.text('Merci pour votre confiance.', left, y + 14, { width: 230 })
        doc.text('Cette facture est générée à partir des données de vente enregistrées dans votre espace administrateur.', left, y + 32, { width: 260 })

        drawFooter()
        doc.end()
    })
}

export class SalesInvoiceService {
    private async resolveSource(tenantId: string, id: string): Promise<{ type: InvoiceSourceType; source: any } | null> {
        const sale = await prisma.sale.findFirst({
            where: { tenantId, id },
            include: {
                items: { include: { product: true, variant: true } }
            }
        })
        if (sale) return { type: 'SALE', source: sale }

        const order = await prisma.order.findFirst({
            where: { tenantId, id, status: 'DELIVERED' },
            include: {
                items: { include: { product: true, variant: true } }
            }
        })
        if (order) return { type: 'ORDER', source: order }

        return null
    }

    private async getEnabledSettings(tenantId: string) {
        const settings = await prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId },
            update: {}
        })

        if (!settings.salesInvoiceEnabled) {
            throw new SalesInvoiceValidationError(409, 'Sales invoicing is disabled', 'SALES_INVOICE_DISABLED')
        }

        return settings
    }

    async createOrGetInvoice(tenantId: string, id: string, actor?: { userId?: string | null }) {
        const [settings, resolved] = await Promise.all([
            this.getEnabledSettings(tenantId),
            this.resolveSource(tenantId, id)
        ])
        if (!resolved) {
            throw new SalesInvoiceValidationError(404, 'Sale not found', 'SALE_NOT_FOUND')
        }

        const invoiceNumber = buildInvoiceNumber(settings.invoiceNumberPrefix, resolved.type, resolved.source.id)
        try {
            return await prisma.salesInvoice.upsert({
                where: {
                    tenantId_sourceType_sourceId: {
                        tenantId,
                        sourceType: resolved.type,
                        sourceId: resolved.source.id
                    }
                },
                create: {
                    tenantId,
                    sourceType: resolved.type,
                    sourceId: resolved.source.id,
                    invoiceNumber,
                    createdByUserId: actor?.userId ?? null
                },
                update: {}
            })
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                const existing = await prisma.salesInvoice.findFirst({
                    where: { tenantId, sourceType: resolved.type, sourceId: resolved.source.id }
                })
                if (existing) return existing
            }
            throw error
        }
    }

    async generatePdf(tenantId: string, id: string, actor?: { userId?: string | null }) {
        const [tenant, settings, contactInfos, resolved] = await Promise.all([
            prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
            this.getEnabledSettings(tenantId),
            prisma.tenantContactInfo.findMany({
                where: { tenantId, isActive: true },
                orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
                select: { kind: true, label: true, value: true }
            }),
            this.resolveSource(tenantId, id)
        ])
        if (!tenant || !resolved) {
            throw new SalesInvoiceValidationError(404, 'Sale not found', 'SALE_NOT_FOUND')
        }

        const invoice = await this.createOrGetInvoice(tenantId, id, actor)
        const model = buildSalesInvoicePdfModel({
            tenant,
            settings,
            contactInfos,
            invoice,
            sourceType: resolved.type,
            source: resolved.source
        })

        const pdf = await renderSalesInvoicePdf(model)
        return {
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            invoice,
            pdf
        }
    }
}
