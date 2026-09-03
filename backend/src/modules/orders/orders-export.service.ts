import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'

export type ExportColumn = { key: string; label: string }

export const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'id',                     label: 'Order ID' },
  { key: 'createdAt',              label: 'Date' },
  { key: 'status',                 label: 'Status' },
  { key: 'callStatus',             label: 'Call Status' },
  { key: 'customerName',           label: 'Customer Name' },
  { key: 'customerPhone',          label: 'Phone' },
  { key: 'customerAddress',        label: 'Address' },
  { key: 'deliveryMode',           label: 'Delivery Mode' },
  { key: 'shippingProvider',       label: 'Carrier' },
  { key: 'shippingServiceLevel',   label: 'Service Level' },
  { key: 'shippingWilayaCode',     label: 'Wilaya' },
  { key: 'shippingCommuneCode',    label: 'Commune' },
  { key: 'shippingAddressLine1',   label: 'Shipping Address' },
  { key: 'shippingAmount',         label: 'Shipping Cost' },
  { key: 'shippingNotes',          label: 'Shipping Notes' },
  { key: 'totalAmount',            label: 'Items Total' },
  { key: 'totalWithShippingAmount',label: 'Total (incl. shipping)' },
  { key: 'earnedPointsTotal',      label: 'Points Earned' },
  { key: 'redeemedPointsTotal',    label: 'Points Redeemed' },
  { key: 'redeemedAmount',         label: 'Redeemed Amount' },
  { key: 'promoCode',              label: 'Promo Code' },
  { key: 'promoDiscountAmount',    label: 'Promo Discount' },
  { key: 'promoShippingDiscount',  label: 'Promo Shipping Discount' },
  { key: 'internalNotes',          label: 'Internal Notes' },
  { key: 'itemsSummary',           label: 'Items' },
]

export const DEFAULT_COLUMNS = [
  'id', 'createdAt', 'status', 'customerName', 'customerPhone',
  'shippingWilayaCode', 'totalWithShippingAmount',
]

const EXPORT_CAP = 10_000

type OrderRow = Record<string, any>

export async function fetchForExport(
  tenantId: string,
  filters: { status?: string; search?: string; startDate?: string; endDate?: string },
  columns: string[]
): Promise<{ orders: OrderRow[]; truncated: boolean }> {
  const where: Prisma.OrderWhereInput = { tenantId }

  if (filters.status) where.status = filters.status

  if (filters.search) {
    where.OR = [
      { customerName: { contains: filters.search, mode: 'insensitive' } },
      { customerPhone: { contains: filters.search } },
    ]
  }

  if (filters.startDate || filters.endDate) {
    const createdAt: Prisma.DateTimeFilter = {}
    if (filters.startDate) {
      const s = new Date(filters.startDate)
      s.setHours(0, 0, 0, 0)
      createdAt.gte = s
    }
    if (filters.endDate) {
      const e = new Date(filters.endDate)
      e.setHours(23, 59, 59, 999)
      createdAt.lte = e
    }
    where.createdAt = createdAt
  }

  const needItems = columns.includes('itemsSummary')

  const rawOrders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: EXPORT_CAP + 1,
    select: {
      id: true,
      createdAt: true,
      status: true,
      callStatus: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      deliveryMode: true,
      shippingProvider: true,
      shippingServiceLevel: true,
      shippingWilayaCode: true,
      shippingCommuneCode: true,
      shippingAddressLine1: true,
      shippingAmount: true,
      shippingNotes: true,
      totalAmount: true,
      totalWithShippingAmount: true,
      earnedPointsTotal: true,
      redeemedPointsTotal: true,
      redeemedAmount: true,
      promoCode: true,
      promoDiscountAmount: true,
      promoShippingDiscount: true,
      internalNotes: true,
      ...(needItems ? {
        items: {
          select: {
            quantity: true,
            price: true,
            lineTotal: true,
            product: { select: { title: true } },
            variant: { select: { sku: true } },
          },
        },
      } : {}),
    },
  })

  const truncated = rawOrders.length > EXPORT_CAP
  const orders = truncated ? rawOrders.slice(0, EXPORT_CAP) : rawOrders

  return { orders: orders as OrderRow[], truncated }
}

function formatCellValue(key: string, value: any): string {
  if (value === null || value === undefined) return ''
  if (key === 'createdAt') {
    return value instanceof Date
      ? value.toISOString().replace('T', ' ').substring(0, 19)
      : String(value)
  }
  return String(value)
}

export function toRows(orders: OrderRow[], columns: string[]): string[][] {
  return orders.map(order => {
    return columns.map(key => {
      if (key === 'itemsSummary') {
        const items = order.items ?? []
        return items
          .map((item: any) => {
            const name = item.product?.title ?? 'Unknown'
            const sku = item.variant?.sku ? ` [${item.variant.sku}]` : ''
            return `${item.quantity}x ${name}${sku}`
          })
          .join('; ')
      }
      return formatCellValue(key, order[key])
    })
  })
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function generateCsv(rows: string[][], headers: string[]): Buffer {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(',')),
  ]
  return Buffer.from(lines.join('\r\n'), 'utf-8')
}

function escapeTsvCell(value: string): string {
  return value.replace(/\t/g, ' ').replace(/\n/g, ' ')
}

export function generateTxt(rows: string[][], headers: string[]): Buffer {
  const lines = [
    headers.map(escapeTsvCell).join('\t'),
    ...rows.map(row => row.map(escapeTsvCell).join('\t')),
  ]
  return Buffer.from(lines.join('\n'), 'utf-8')
}

export async function generateXlsx(rows: string[][], headers: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Orders')

  ws.addRow(headers)
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  rows.forEach(row => ws.addRow(row))

  headers.forEach((_, i) => {
    ws.getColumn(i + 1).width = 20
  })

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generatePdf(
  rows: string[][],
  headers: string[],
  tenantName: string
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 30, layout: 'landscape' })
  const chunks: Buffer[] = []

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('data', chunk => chunks.push(Buffer.from(chunk)))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(14).text(`Orders Export — ${tenantName}`, { align: 'center' })
    doc.fontSize(9).fillColor('#666').text(new Date().toISOString().split('T')[0], { align: 'center' })
    doc.fillColor('#000').moveDown(1)

    const pageWidth = doc.page.width - 60
    const colWidth = Math.floor(pageWidth / headers.length)

    // Header row
    doc.fontSize(8).font('Helvetica-Bold')
    let x = 30
    const headerY = doc.y
    headers.forEach(h => {
      doc.text(h.substring(0, 15), x, headerY, { width: colWidth, ellipsis: true })
      x += colWidth
    })
    doc.moveDown(0.5)
    doc.moveTo(30, doc.y).lineTo(pageWidth + 30, doc.y).strokeColor('#ccc').stroke()
    doc.moveDown(0.3)

    doc.font('Helvetica').fontSize(7)
    rows.forEach(row => {
      if (doc.y > doc.page.height - 60) {
        doc.addPage({ layout: 'landscape' })
      }
      x = 30
      const rowY = doc.y
      row.forEach(cell => {
        doc.text(String(cell).substring(0, 20), x, rowY, { width: colWidth, ellipsis: true })
        x += colWidth
      })
      doc.moveDown(0.4)
    })

    doc.end()
  })
}
