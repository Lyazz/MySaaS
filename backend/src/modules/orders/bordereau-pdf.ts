import PDFDocument from 'pdfkit'

type BordereauOrderItem = {
    title: string
    quantity: number
    unitPrice: number
    lineTotal: number
}

export type BordereauOrder = {
    id: string
    createdAt: Date
    customerName: string
    customerPhone: string
    customerAddress: string | null
    deliveryMode: string | null
    shippingProvider: string | null
    shippingServiceLevel: string | null
    shippingAmount: number | null
    shippingCurrency: string | null
    totalAmount: number
    totalWithShippingAmount: number
    shippingAddressLine1: string | null
    shippingWilayaCode: string | null
    shippingCommuneCode: string | null
    shippingPickupPoint: number | null
    shippingNotes: string | null
    providerShipmentId: string | null
    items: BordereauOrderItem[]
}

const formatMoney = (value: number, currency: string) => `${Math.round(value)} ${currency}`

export async function renderGenericBordereauPdf(input: { tenantName: string; order: BordereauOrder }) {
    const { tenantName, order } = input
    const currency = (order.shippingCurrency || 'DZD').toUpperCase()

    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const chunks: Buffer[] = []

    return await new Promise<Buffer>((resolve, reject) => {
        doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        // Header
        doc.fontSize(18).text('Bordereau de livraison', { align: 'center' })
        doc.moveDown(0.5)
        doc.fontSize(10).fillColor('#444').text(tenantName, { align: 'center' })
        doc.fillColor('#000')
        doc.moveDown(1)

        // Order meta
        doc.fontSize(11).text(`Commande: ${order.id}`)
        doc.text(`Date: ${new Date(order.createdAt).toLocaleString('fr-FR')}`)
        const providerLabel = order.shippingProvider || '—'
        const modeLabel =
            order.deliveryMode === 'store'
                ? 'Retrait magasin'
                : order.deliveryMode === 'pickup' || order.deliveryMode === 'desk' || order.deliveryMode === 'office'
                    ? 'Stop desk'
                    : 'Livraison à domicile'
        doc.text(`Transporteur: ${providerLabel}`)
        doc.text(`Mode: ${modeLabel}`)
        if (order.providerShipmentId) doc.text(`Tracking: ${order.providerShipmentId}`)
        if (order.shippingPickupPoint) doc.text(`Point relais: ${order.shippingPickupPoint}`)
        doc.moveDown(0.8)

        // Customer + address
        doc.fontSize(12).text('Client', { underline: true })
        doc.fontSize(11).text(`Nom: ${order.customerName}`)
        doc.text(`Téléphone: ${order.customerPhone}`)
        const addressLine = order.shippingAddressLine1 || order.customerAddress || '—'
        doc.text(`Adresse: ${addressLine}`)
        const geo = [order.shippingWilayaCode, order.shippingCommuneCode].filter(Boolean).join(' / ')
        if (geo) doc.text(`Wilaya/Commune: ${geo}`)
        if (order.shippingNotes) doc.text(`Note: ${order.shippingNotes}`)
        doc.moveDown(1)

        // Pricing
        doc.fontSize(12).text('Montants', { underline: true })
        doc.fontSize(11).text(`Total articles: ${formatMoney(order.totalAmount, currency)}`)
        if (order.shippingAmount != null) doc.text(`Livraison: ${formatMoney(order.shippingAmount, currency)}`)
        doc.fontSize(12).text(`Total à encaisser: ${formatMoney(order.totalWithShippingAmount, currency)}`)
        doc.moveDown(1)

        // Items table
        doc.fontSize(12).text('Articles', { underline: true })
        doc.moveDown(0.5)

        const startX = doc.x
        const maxX = doc.page.width - doc.page.margins.right
        const colQtyX = maxX - 70
        const colTotalX = maxX

        doc.fontSize(10).fillColor('#444')
        doc.text('Produit', startX, doc.y, { width: colQtyX - startX - 10 })
        doc.text('Qté', colQtyX, doc.y, { width: 30, align: 'right' })
        doc.text('Total', colTotalX - 60, doc.y, { width: 60, align: 'right' })
        doc.fillColor('#000')
        doc.moveDown(0.4)
        doc.moveTo(startX, doc.y).lineTo(maxX, doc.y).strokeColor('#ddd').stroke().strokeColor('#000')
        doc.moveDown(0.4)

        doc.fontSize(10)
        for (const item of order.items) {
            const y = doc.y
            doc.text(item.title, startX, y, { width: colQtyX - startX - 10 })
            doc.text(String(item.quantity), colQtyX, y, { width: 30, align: 'right' })
            doc.text(formatMoney(item.lineTotal, currency), colTotalX - 60, y, { width: 60, align: 'right' })
            doc.moveDown(0.4)
        }

        doc.end()
    })
}

