import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Prisma } from '@prisma/client'
import PDFDocument from 'pdfkit'
import prisma from '../../lib/prisma'
import { sanitizeInvoiceNumberPrefix } from '../store-settings/store-settings.service'

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

const formatMoney = (value: number, currency: string) =>
    `${Math.round(value).toLocaleString('fr-DZ')} ${currency}`

export async function renderSalesInvoicePdf(model: SalesInvoicePdfModel): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 42 })
    const chunks: Buffer[] = []
    const logo = model.showLogo ? await loadLogoBuffer(model.logoUrl) : null

    return await new Promise<Buffer>((resolve, reject) => {
        doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        if (logo) {
            try {
                doc.image(logo, 42, 38, { fit: [82, 44] })
            } catch {
                doc.fontSize(18).text(model.tenantName, 42, 42)
            }
        } else {
            doc.fontSize(18).text(model.tenantName, 42, 42)
        }

        doc.fontSize(22).text('Facture', 360, 42, { align: 'right' })
        doc.fontSize(10).fillColor('#555')
        doc.text(`N° ${model.invoiceNumber}`, 360, 72, { align: 'right' })
        doc.text(`Date: ${formatDate(model.issuedAt)}`, 360, 88, { align: 'right' })
        doc.fillColor('#000')

        doc.moveDown(3)
        const topY = Math.max(doc.y, 112)
        doc.fontSize(11).text(model.tenantName, 42, topY)
        model.contactLines.forEach((line) => doc.fontSize(9).fillColor('#555').text(line))
        doc.fillColor('#000')

        doc.fontSize(11).text('Client', 330, topY)
        doc.fontSize(9).fillColor('#555')
        doc.text(model.customerName, 330)
        if (model.customerPhone) doc.text(model.customerPhone, 330)
        if (model.customerAddress) doc.text(model.customerAddress, 330)
        doc.fillColor('#000')

        doc.moveDown(2)
        doc.fontSize(10).fillColor('#555')
        doc.text(`${model.sourceType === 'ORDER' ? 'Commande' : 'Vente'}: ${model.sourceId}`)
        doc.text(`Date de vente: ${formatDate(model.sourceDate)}`)
        doc.fillColor('#000')
        doc.moveDown(1)

        const tableTop = doc.y + 8
        const left = 42
        const right = doc.page.width - 42
        const qtyX = 330
        const unitX = 380
        const totalX = 475

        doc.rect(left, tableTop, right - left, 24).fill('#F3F4F6')
        doc.fillColor('#111827').fontSize(9).font('Helvetica-Bold')
        doc.text('Article', left + 8, tableTop + 8, { width: qtyX - left - 16 })
        doc.text('Qté', qtyX, tableTop + 8, { width: 35, align: 'right' })
        doc.text('Prix', unitX, tableTop + 8, { width: 70, align: 'right' })
        doc.text('Total', totalX, tableTop + 8, { width: right - totalX - 8, align: 'right' })

        doc.font('Helvetica').fillColor('#111827')
        let y = tableTop + 34
        for (const line of model.lines) {
            if (y > doc.page.height - 150) {
                doc.addPage()
                y = 50
            }
            const title = line.variantLabel ? `${line.title} (${line.variantLabel})` : line.title
            doc.fontSize(9).text(title, left + 8, y, { width: qtyX - left - 16 })
            doc.text(String(line.quantity), qtyX, y, { width: 35, align: 'right' })
            doc.text(formatMoney(line.unitPrice, model.currency), unitX, y, { width: 70, align: 'right' })
            doc.text(formatMoney(line.lineTotal, model.currency), totalX, y, { width: right - totalX - 8, align: 'right' })
            y += 24
            doc.moveTo(left, y - 7).lineTo(right, y - 7).strokeColor('#E5E7EB').stroke().strokeColor('#000')
        }

        y += 10
        const totalsX = 360
        doc.fontSize(10)
        doc.text('Sous-total', totalsX, y, { width: 90 })
        doc.text(formatMoney(model.subtotal, model.currency), totalX, y, { width: right - totalX - 8, align: 'right' })
        y += 18
        if (model.shippingAmount > 0) {
            doc.text('Livraison', totalsX, y, { width: 90 })
            doc.text(formatMoney(model.shippingAmount, model.currency), totalX, y, { width: right - totalX - 8, align: 'right' })
            y += 18
        }
        doc.font('Helvetica-Bold').fontSize(12)
        doc.text('Total', totalsX, y, { width: 90 })
        doc.text(formatMoney(model.total, model.currency), totalX, y, { width: right - totalX - 8, align: 'right' })
        doc.font('Helvetica')

        if (model.footerText) {
            doc.fontSize(9).fillColor('#555')
            doc.text(model.footerText, 42, doc.page.height - 86, {
                width: doc.page.width - 84,
                align: 'center'
            })
        }

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
