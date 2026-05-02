# Orders Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-format order export (CSV, XLSX, PDF, TXT, Google Sheets) to the admin orders list page, with a column picker modal and localStorage-persisted preferences.

**Architecture:** Phase 1 (Tasks 1–6) adds file download formats with a new `OrdersExportService` and two frontend components. Phase 2 (Tasks 7–9) adds Google Sheets via OAuth. Each phase ships independently. The export endpoint mirrors the list endpoint's filter params and lives at `GET /api/admin/orders/export`, registered before `/:id` in `routes.ts` to avoid route shadowing.

**Tech Stack:** Express.js, Prisma, pdfkit (already installed), exceljs (new), googleapis (new, Phase 2), Vue 3, Tailwind CSS.

---

## File Map

**Created:**
- `backend/src/modules/orders/orders-export.service.ts` — all format generators + Prisma fetch
- `backend/src/modules/google-oauth/google-oauth.service.ts` — token storage/refresh (Phase 2)
- `backend/src/modules/google-oauth/google-oauth.controller.ts` — auth URL + callback (Phase 2)
- `backend/src/modules/google-oauth/routes.ts` — mounts OAuth routes (Phase 2)
- `prisma/migrations/YYYYMMDD_add_google_oauth_token/migration.sql` — new model (Phase 2)
- `tests/unit/orders-export.test.ts` — unit tests for export service
- `tests/orders-export-api.test.ts` — integration test for export endpoint
- `components/admin/AdminOrderExportModal.vue` — format picker + column picker modal
- `components/admin/AdminOrderExportButton.vue` — split-button dropdown

**Modified:**
- `backend/src/modules/orders/orders.controller.ts` — add `export` method
- `backend/src/modules/orders/routes.ts` — register `/export` before `/:id`
- `pages/admin/orders/index.vue` — add export button to header
- `prisma/schema.prisma` — add `GoogleOAuthToken` model (Phase 2)
- `backend/src/routes.ts` — add google-oauth router (Phase 2)
- `package.json` — add exceljs + googleapis

---

## Task 1: Install packages and write failing unit tests

**Files:**
- Modify: `package.json`
- Create: `tests/unit/orders-export.test.ts`

- [ ] **Step 1: Install exceljs**

```bash
npm install exceljs
npm install --save-dev @types/exceljs 2>/dev/null || true
```

Expected: `exceljs` appears in `package.json` dependencies.

- [ ] **Step 2: Write failing unit tests for the export service**

Create `tests/unit/orders-export.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  generateCsv,
  generateTxt,
  toRows,
  EXPORT_COLUMNS,
} from '../../backend/src/modules/orders/orders-export.service'

const SAMPLE_ORDERS = [
  {
    id: 'abc-123',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    status: 'CONFIRMED',
    callStatus: 'called',
    customerName: 'Ahmed Benali',
    customerPhone: '0555123456',
    customerAddress: '12 Rue des Roses',
    deliveryMode: 'home',
    shippingProvider: 'MAYSTRO',
    shippingServiceLevel: 'standard',
    shippingWilayaCode: '16',
    shippingCommuneCode: '16001',
    shippingAddressLine1: '12 Rue des Roses, Alger',
    shippingAmount: 500,
    shippingNotes: null,
    totalAmount: 2000,
    totalWithShippingAmount: 2500,
    earnedPointsTotal: 20,
    redeemedPointsTotal: 0,
    redeemedAmount: 0,
    internalNotes: null,
    items: [
      { quantity: 2, price: 1000, lineTotal: 2000, product: { title: 'T-Shirt' }, variant: null },
    ],
  },
]

const DEFAULT_COLUMNS = ['id', 'createdAt', 'status', 'customerName', 'customerPhone', 'shippingWilayaCode', 'totalWithShippingAmount']

describe('toRows', () => {
  it('maps orders to flat row arrays with selected columns', () => {
    const rows = toRows(SAMPLE_ORDERS as any, DEFAULT_COLUMNS)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveLength(DEFAULT_COLUMNS.length)
    expect(rows[0][0]).toBe('abc-123') // id
    expect(rows[0][3]).toBe('Ahmed Benali') // customerName
  })

  it('includes items summary when itemsSummary column selected', () => {
    const rows = toRows(SAMPLE_ORDERS as any, ['id', 'itemsSummary'])
    expect(rows[0][1]).toContain('T-Shirt')
  })
})

describe('generateCsv', () => {
  it('returns a buffer', () => {
    const rows = toRows(SAMPLE_ORDERS as any, DEFAULT_COLUMNS)
    const headers = DEFAULT_COLUMNS.map(k => EXPORT_COLUMNS.find(c => c.key === k)!.label)
    const buf = generateCsv(rows, headers)
    expect(buf).toBeInstanceOf(Buffer)
  })

  it('first line contains all column headers', () => {
    const rows = toRows(SAMPLE_ORDERS as any, DEFAULT_COLUMNS)
    const headers = DEFAULT_COLUMNS.map(k => EXPORT_COLUMNS.find(c => c.key === k)!.label)
    const csv = generateCsv(rows, headers).toString('utf-8')
    const firstLine = csv.split('\n')[0]
    expect(firstLine).toContain('Order ID')
    expect(firstLine).toContain('Customer Name')
  })

  it('second line contains order data', () => {
    const rows = toRows(SAMPLE_ORDERS as any, DEFAULT_COLUMNS)
    const headers = DEFAULT_COLUMNS.map(k => EXPORT_COLUMNS.find(c => c.key === k)!.label)
    const csv = generateCsv(rows, headers).toString('utf-8')
    const secondLine = csv.split('\n')[1]
    expect(secondLine).toContain('abc-123')
    expect(secondLine).toContain('Ahmed Benali')
  })
})

describe('generateTxt', () => {
  it('returns a buffer with tab-separated values', () => {
    const rows = toRows(SAMPLE_ORDERS as any, DEFAULT_COLUMNS)
    const headers = DEFAULT_COLUMNS.map(k => EXPORT_COLUMNS.find(c => c.key === k)!.label)
    const buf = generateTxt(rows, headers)
    const txt = buf.toString('utf-8')
    expect(buf).toBeInstanceOf(Buffer)
    expect(txt.split('\n')[0]).toContain('\t')
  })
})

describe('EXPORT_COLUMNS', () => {
  it('has all required column keys', () => {
    const keys = EXPORT_COLUMNS.map(c => c.key)
    expect(keys).toContain('id')
    expect(keys).toContain('itemsSummary')
    expect(keys).toContain('totalWithShippingAmount')
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run tests/unit/orders-export.test.ts
```

Expected: FAIL — `Cannot find module '../../backend/src/modules/orders/orders-export.service'`

---

## Task 2: Implement OrdersExportService (CSV, TXT, XLSX, PDF)

**Files:**
- Create: `backend/src/modules/orders/orders-export.service.ts`

- [ ] **Step 1: Create the export service**

Create `backend/src/modules/orders/orders-export.service.ts`:

```typescript
import prisma from '../../lib/prisma'
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
  const where: any = { tenantId }

  if (filters.status) where.status = filters.status

  if (filters.search) {
    where.OR = [
      { customerName: { contains: filters.search, mode: 'insensitive' } },
      { customerPhone: { contains: filters.search } },
    ]
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      const s = new Date(filters.startDate)
      s.setHours(0, 0, 0, 0)
      where.createdAt.gte = s
    }
    if (filters.endDate) {
      const e = new Date(filters.endDate)
      e.setHours(23, 59, 59, 999)
      where.createdAt.lte = e
    }
  }

  const needItems = columns.includes('itemsSummary')

  const total = await prisma.order.count({ where })
  const truncated = total > EXPORT_CAP

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: EXPORT_CAP,
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
  return Buffer.from(lines.join('\n'), 'utf-8')
}

export function generateTxt(rows: string[][], headers: string[]): Buffer {
  const lines = [
    headers.join('\t'),
    ...rows.map(row => row.join('\t')),
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
```

- [ ] **Step 2: Run tests — they should pass now**

```bash
npx vitest run tests/unit/orders-export.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS"
git add backend/src/modules/orders/orders-export.service.ts tests/unit/orders-export.test.ts package.json package-lock.json
git commit -m "feat(orders): add OrdersExportService with CSV, TXT, XLSX, PDF generators"
```

---

## Task 3: Add export endpoint to controller and routes

**Files:**
- Modify: `backend/src/modules/orders/orders.controller.ts`
- Modify: `backend/src/modules/orders/routes.ts`
- Create: `tests/orders-export-api.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `tests/orders-export-api.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import prisma from '../backend/src/lib/prisma'
import app from '../backend/src/app'
import { signAccessToken } from '../backend/src/lib/jwt'

describe('GET /api/admin/orders/export', () => {
  const slug = `export-test-${Date.now()}`
  const email = `export-${slug}@example.com`
  let token: string
  let tenantId: string

  beforeAll(async () => {
    const res = await request(app).post('/api/register').send({
      name: 'Export Test Tenant',
      slug,
      email,
      password: 'password123',
    })
    expect(res.status).toBe(200)
    tenantId = res.body.tenant.id
    const user = await prisma.user.findFirst({ where: { email } })
    token = signAccessToken({ userId: user!.id })

    // Create one test order
    await prisma.order.create({
      data: {
        tenantId,
        status: 'PENDING',
        customerName: 'Test Customer',
        customerPhone: '0555000001',
        totalAmount: 1000,
        totalWithShippingAmount: 1200,
        shippingAmount: 200,
        shippingWilayaCode: '16',
      },
    })
  })

  it('returns CSV with correct Content-Type', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=csv&columns=id,status,customerName')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    const lines = res.text.split('\n')
    expect(lines[0]).toContain('Order ID')
    expect(lines[0]).toContain('Status')
    expect(lines[0]).toContain('Customer Name')
  })

  it('returns TXT with tab-separated headers', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=txt&columns=id,status')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/plain/)
    expect(res.text.split('\n')[0]).toContain('\t')
  })

  it('returns XLSX binary', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=xlsx&columns=id,status,customerName')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/spreadsheetml/)
  })

  it('returns PDF binary', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=pdf&columns=id,status')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/pdf/)
  })

  it('returns 400 for unknown format', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=docx&columns=id')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
  })

  it('requires auth', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export?format=csv&columns=id')
      .set('X-Forwarded-Host', `${slug}.localhost:3000`)

    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run tests/orders-export-api.test.ts
```

Expected: FAIL — 404 (route not registered yet).

- [ ] **Step 3: Add `export` method to `orders.controller.ts`**

Open `backend/src/modules/orders/orders.controller.ts`. Add this import at the top (after existing imports):

```typescript
import {
  fetchForExport,
  toRows,
  generateCsv,
  generateTxt,
  generateXlsx,
  generatePdf,
  DEFAULT_COLUMNS,
  EXPORT_COLUMNS,
} from './orders-export.service'
```

Add this method inside the `OrdersController` class, before the closing `}`:

```typescript
    async export(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const { format, columns, status, search, startDate, endDate } = req.query as Record<string, string>

            const VALID_FORMATS = ['csv', 'xlsx', 'pdf', 'txt', 'gsheet']
            if (!format || !VALID_FORMATS.includes(format)) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'Invalid or missing format. Must be one of: csv, xlsx, pdf, txt, gsheet' })
            }

            const selectedColumns = columns
                ? columns.split(',').map(c => c.trim()).filter(c => EXPORT_COLUMNS.some(ec => ec.key === c))
                : DEFAULT_COLUMNS

            if (selectedColumns.length === 0) {
                return res.status(400).json({ statusCode: 400, statusMessage: 'No valid columns specified' })
            }

            const { orders, truncated } = await fetchForExport(
                tenant.id,
                { status, search, startDate, endDate },
                selectedColumns
            )

            const headers = selectedColumns.map(k => EXPORT_COLUMNS.find(c => c.key === k)!.label)
            const rows = toRows(orders, selectedColumns)

            if (truncated) {
                res.setHeader('X-Export-Truncated', 'true')
            }

            const filename = `orders-export-${new Date().toISOString().split('T')[0]}`

            if (format === 'csv') {
                const buf = generateCsv(rows, headers)
                res.setHeader('Content-Type', 'text/csv; charset=utf-8')
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
                return res.send(buf)
            }

            if (format === 'txt') {
                const buf = generateTxt(rows, headers)
                res.setHeader('Content-Type', 'text/plain; charset=utf-8')
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`)
                return res.send(buf)
            }

            if (format === 'xlsx') {
                const buf = await generateXlsx(rows, headers)
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`)
                return res.send(buf)
            }

            if (format === 'pdf') {
                const buf = await generatePdf(rows, headers, tenant.name ?? 'Store')
                res.setHeader('Content-Type', 'application/pdf')
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
                return res.send(buf)
            }

            if (format === 'gsheet') {
                // Phase 2 — Google Sheets not yet implemented
                return res.status(501).json({ statusCode: 501, statusMessage: 'Google Sheets export requires OAuth setup. See Phase 2.' })
            }
        } catch (error) {
            console.error('Export orders error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
```

- [ ] **Step 4: Register the export route in `routes.ts`**

Open `backend/src/modules/orders/routes.ts`. Add the export route **before** the `/:id` route:

Current file:
```typescript
import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud, requireStaffPermission } from '../../middleware/staff-permissions.middleware'
import { OrdersController } from './orders.controller'

const router = Router()
const controller = new OrdersController()

router.use(requireTenantMember)

router.get('/', requireStaffCrud('orders'), controller.list.bind(controller))
router.get('/:id', requireStaffCrud('orders'), controller.getById.bind(controller))
```

Add one line after the `router.get('/')` line:

```typescript
router.get('/export', requireStaffCrud('orders'), controller.export.bind(controller))
```

So it reads:

```typescript
router.use(requireTenantMember)

router.get('/', requireStaffCrud('orders'), controller.list.bind(controller))
router.get('/export', requireStaffCrud('orders'), controller.export.bind(controller))
router.get('/:id', requireStaffCrud('orders'), controller.getById.bind(controller))
```

- [ ] **Step 5: Run integration tests — they should pass**

```bash
npx vitest run tests/orders-export-api.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS"
git add backend/src/modules/orders/orders.controller.ts backend/src/modules/orders/routes.ts tests/orders-export-api.test.ts
git commit -m "feat(orders): add GET /api/admin/orders/export endpoint (CSV, XLSX, PDF, TXT)"
```

---

## Task 4: Build AdminOrderExportModal.vue

**Files:**
- Create: `components/admin/AdminOrderExportModal.vue`

- [ ] **Step 1: Create the modal component**

Create `components/admin/AdminOrderExportModal.vue`:

```vue
<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50"
        @click="$emit('update:modelValue', false)"
      />

      <!-- Modal panel -->
      <div
        class="relative z-10 w-full max-w-lg rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        style="background: var(--surface-1); border: 1px solid var(--surface-border)"
      >
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold" style="color: var(--text-primary)">
            Export Orders
          </h2>
          <button
            class="p-1 rounded hover:opacity-70 transition-opacity"
            style="color: var(--text-tertiary)"
            @click="$emit('update:modelValue', false)"
          >
            <Icon name="lucide:x" class="w-5 h-5" />
          </button>
        </div>

        <!-- Format selector -->
        <div class="mb-5">
          <p class="text-sm font-medium mb-2" style="color: var(--text-secondary)">Format</p>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="fmt in formats"
              :key="fmt.value"
              :class="[
                'flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-all',
                selectedFormat === fmt.value
                  ? '[border-color:var(--brand)] [background:rgba(var(--brand-rgb)/0.08)] [color:rgba(var(--brand-rgb)/0.9)]'
                  : ''
              ]"
              :style="selectedFormat !== fmt.value ? 'border-color: var(--surface-border); color: var(--text-secondary)' : ''"
              @click="selectedFormat = fmt.value"
            >
              <Icon :name="fmt.icon" class="w-5 h-5" />
              {{ fmt.label }}
            </button>
          </div>
        </div>

        <!-- Column picker -->
        <div class="mb-5">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-medium" style="color: var(--text-secondary)">Columns</p>
            <div class="flex gap-3">
              <button
                class="text-xs hover:opacity-70"
                style="color: var(--brand)"
                @click="selectAll"
              >
                Select all
              </button>
              <button
                class="text-xs hover:opacity-70"
                style="color: var(--text-tertiary)"
                @click="selectNone"
              >
                None
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto pr-1">
            <label
              v-for="col in allColumns"
              :key="col.key"
              class="flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:opacity-80 transition-opacity"
              style="color: var(--text-primary)"
            >
              <input
                type="checkbox"
                class="admin-checkbox"
                :checked="selectedColumns.includes(col.key)"
                @change="toggleColumn(col.key)"
              />
              <span class="text-sm truncate">{{ col.label }}</span>
            </label>
          </div>

          <p v-if="selectedColumns.length === 0" class="text-xs mt-2 text-red-500">
            Select at least one column.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button
            class="ui-btn ui-btn--secondary"
            @click="$emit('update:modelValue', false)"
          >
            Cancel
          </button>
          <button
            :disabled="selectedColumns.length === 0 || exporting"
            class="ui-btn ui-btn--primary flex items-center gap-2"
            @click="doExport"
          >
            <Icon v-if="exporting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
            <Icon v-else name="lucide:download" class="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { EXPORT_COLUMNS_META, DEFAULT_EXPORT_COLUMNS } from '~/composables/useOrderExport'

const props = defineProps<{
  modelValue: boolean
  filters: {
    status?: string
    search?: string
    startDate?: string
    endDate?: string
    sortBy?: string
    sortOrder?: string
  }
  tenantId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const authStore = useAuthStore()

const PREFS_KEY = computed(() => `orders_export_prefs_${props.tenantId}`)

const formats = [
  { value: 'csv',    label: 'CSV',    icon: 'lucide:file-text' },
  { value: 'xlsx',   label: 'Excel',  icon: 'lucide:table-2' },
  { value: 'pdf',    label: 'PDF',    icon: 'lucide:file-type-2' },
  { value: 'txt',    label: 'Text',   icon: 'lucide:align-left' },
  { value: 'gsheet', label: 'Sheets', icon: 'lucide:external-link' },
]

const allColumns = EXPORT_COLUMNS_META

const selectedFormat = ref('csv')
const selectedColumns = ref<string[]>([...DEFAULT_EXPORT_COLUMNS])
const exporting = ref(false)

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY.value)
    if (!raw) return
    const prefs = JSON.parse(raw)
    if (prefs.format) selectedFormat.value = prefs.format
    if (Array.isArray(prefs.columns) && prefs.columns.length > 0) {
      selectedColumns.value = prefs.columns
    }
  } catch {
    // ignore malformed prefs
  }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY.value, JSON.stringify({
      format: selectedFormat.value,
      columns: selectedColumns.value,
    }))
  } catch {
    // ignore storage errors
  }
}

function toggleColumn(key: string) {
  if (selectedColumns.value.includes(key)) {
    selectedColumns.value = selectedColumns.value.filter(c => c !== key)
  } else {
    selectedColumns.value = [...selectedColumns.value, key]
  }
}

function selectAll() {
  selectedColumns.value = allColumns.map(c => c.key)
}

function selectNone() {
  selectedColumns.value = []
}

async function doExport() {
  if (selectedColumns.value.length === 0) return
  exporting.value = true

  try {
    const params = new URLSearchParams()
    params.set('format', selectedFormat.value)
    params.set('columns', selectedColumns.value.join(','))
    if (props.filters.status) params.set('status', props.filters.status)
    if (props.filters.search) params.set('search', props.filters.search)
    if (props.filters.startDate) params.set('startDate', props.filters.startDate)
    if (props.filters.endDate) params.set('endDate', props.filters.endDate)

    if (selectedFormat.value === 'gsheet') {
      // Redirect to OAuth flow — handled by AdminOrderExportButton
      emit('update:modelValue', false)
      window.open(`/api/admin/orders/export/google-auth-url?${params.toString()}`, '_blank')
      savePrefs()
      return
    }

    const response = await fetch(`/api/admin/orders/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      alert(err.statusMessage ?? 'Export failed')
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().split('T')[0]
    const ext = selectedFormat.value
    a.download = `orders-export-${date}.${ext}`
    a.click()
    URL.revokeObjectURL(url)

    savePrefs()
    emit('update:modelValue', false)
  } finally {
    exporting.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (open) loadPrefs()
})
</script>
```

- [ ] **Step 2: Create the composable that the modal imports**

Create `composables/useOrderExport.ts`:

```typescript
export type ExportColumnMeta = { key: string; label: string }

export const EXPORT_COLUMNS_META: ExportColumnMeta[] = [
  { key: 'id',                      label: 'Order ID' },
  { key: 'createdAt',               label: 'Date' },
  { key: 'status',                  label: 'Status' },
  { key: 'callStatus',              label: 'Call Status' },
  { key: 'customerName',            label: 'Customer Name' },
  { key: 'customerPhone',           label: 'Phone' },
  { key: 'customerAddress',         label: 'Address' },
  { key: 'deliveryMode',            label: 'Delivery Mode' },
  { key: 'shippingProvider',        label: 'Carrier' },
  { key: 'shippingServiceLevel',    label: 'Service Level' },
  { key: 'shippingWilayaCode',      label: 'Wilaya' },
  { key: 'shippingCommuneCode',     label: 'Commune' },
  { key: 'shippingAddressLine1',    label: 'Shipping Address' },
  { key: 'shippingAmount',          label: 'Shipping Cost' },
  { key: 'shippingNotes',           label: 'Shipping Notes' },
  { key: 'totalAmount',             label: 'Items Total' },
  { key: 'totalWithShippingAmount', label: 'Total (incl. shipping)' },
  { key: 'earnedPointsTotal',       label: 'Points Earned' },
  { key: 'redeemedPointsTotal',     label: 'Points Redeemed' },
  { key: 'redeemedAmount',          label: 'Redeemed Amount' },
  { key: 'internalNotes',           label: 'Internal Notes' },
  { key: 'itemsSummary',            label: 'Items' },
]

export const DEFAULT_EXPORT_COLUMNS = [
  'id', 'createdAt', 'status', 'customerName', 'customerPhone',
  'shippingWilayaCode', 'totalWithShippingAmount',
]
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS"
git add components/admin/AdminOrderExportModal.vue composables/useOrderExport.ts
git commit -m "feat(orders): add AdminOrderExportModal with format selector and column picker"
```

---

## Task 5: Build AdminOrderExportButton.vue

**Files:**
- Create: `components/admin/AdminOrderExportButton.vue`

- [ ] **Step 1: Create the split-button component**

Create `components/admin/AdminOrderExportButton.vue`:

```vue
<template>
  <div class="relative flex items-center">
    <!-- Split button: left = quick export, right = dropdown arrow -->
    <div class="flex rounded-lg overflow-hidden" style="border: 1px solid var(--surface-border)">
      <!-- Left: quick export (re-run last settings) -->
      <button
        :disabled="exporting"
        class="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
        style="background: var(--surface-2); color: var(--text-primary)"
        @click="quickExport"
      >
        <Icon v-if="exporting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
        <Icon v-else name="lucide:download" class="w-4 h-4" />
        Export
      </button>

      <!-- Divider -->
      <div class="w-px self-stretch" style="background: var(--surface-border)" />

      <!-- Right: dropdown toggle -->
      <button
        class="px-2 py-2 text-sm transition-colors hover:opacity-80"
        style="background: var(--surface-2); color: var(--text-primary)"
        @click="dropdownOpen = !dropdownOpen"
      >
        <Icon name="lucide:chevron-down" class="w-4 h-4" />
      </button>
    </div>

    <!-- Dropdown -->
    <div
      v-if="dropdownOpen"
      class="absolute top-full right-0 mt-1 z-20 w-48 rounded-lg shadow-lg overflow-hidden"
      style="background: var(--surface-1); border: 1px solid var(--surface-border)"
    >
      <button
        v-for="fmt in formats"
        :key="fmt.value"
        class="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:opacity-80 transition-opacity text-left"
        style="color: var(--text-primary)"
        @click="exportAs(fmt.value)"
      >
        <Icon :name="fmt.icon" class="w-4 h-4" style="color: var(--text-tertiary)" />
        {{ fmt.label }}
      </button>

      <div class="h-px mx-3 my-1" style="background: var(--surface-border)" />

      <button
        class="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:opacity-80 transition-opacity text-left"
        style="color: var(--brand)"
        @click="openModal"
      >
        <Icon name="lucide:settings-2" class="w-4 h-4" />
        Export options…
      </button>
    </div>

    <!-- Click-outside to close dropdown -->
    <div
      v-if="dropdownOpen"
      class="fixed inset-0 z-10"
      @click="dropdownOpen = false"
    />

    <!-- Export modal -->
    <AdminOrderExportModal
      v-model="modalOpen"
      :filters="filters"
      :tenant-id="tenantId"
    />
  </div>
</template>

<script setup lang="ts">
import AdminOrderExportModal from '~/components/admin/AdminOrderExportModal.vue'
import { DEFAULT_EXPORT_COLUMNS } from '~/composables/useOrderExport'

const props = defineProps<{
  filters: {
    status?: string
    search?: string
    startDate?: string
    endDate?: string
    sortBy?: string
    sortOrder?: string
  }
  tenantId: string
}>()

const authStore = useAuthStore()

const PREFS_KEY = computed(() => `orders_export_prefs_${props.tenantId}`)

const dropdownOpen = ref(false)
const modalOpen = ref(false)
const exporting = ref(false)

const formats = [
  { value: 'csv',    label: 'CSV',          icon: 'lucide:file-text' },
  { value: 'xlsx',   label: 'Excel (.xlsx)', icon: 'lucide:table-2' },
  { value: 'pdf',    label: 'PDF',           icon: 'lucide:file-type-2' },
  { value: 'txt',    label: 'Text (.txt)',   icon: 'lucide:align-left' },
  { value: 'gsheet', label: 'Google Sheets ↗', icon: 'lucide:external-link' },
]

function loadPrefs(): { format: string; columns: string[] } {
  try {
    const raw = localStorage.getItem(PREFS_KEY.value)
    if (raw) {
      const p = JSON.parse(raw)
      if (p.format && Array.isArray(p.columns) && p.columns.length > 0) {
        return p
      }
    }
  } catch {
    // ignore
  }
  return { format: 'csv', columns: DEFAULT_EXPORT_COLUMNS }
}

function openModal() {
  dropdownOpen.value = false
  modalOpen.value = true
}

async function exportAs(format: string) {
  dropdownOpen.value = false
  const { columns } = loadPrefs()
  await triggerExport(format, columns)
}

async function quickExport() {
  const prefs = loadPrefs()
  if (!prefs.columns.length) {
    modalOpen.value = true
    return
  }
  await triggerExport(prefs.format, prefs.columns)
}

async function triggerExport(format: string, columns: string[]) {
  if (format === 'gsheet') {
    const params = new URLSearchParams()
    params.set('format', 'gsheet')
    params.set('columns', columns.join(','))
    if (props.filters.status) params.set('status', props.filters.status)
    if (props.filters.search) params.set('search', props.filters.search)
    if (props.filters.startDate) params.set('startDate', props.filters.startDate)
    if (props.filters.endDate) params.set('endDate', props.filters.endDate)
    window.open(`/api/admin/orders/export/google-auth-url?${params.toString()}`, '_blank')
    return
  }

  exporting.value = true
  try {
    const params = new URLSearchParams()
    params.set('format', format)
    params.set('columns', columns.join(','))
    if (props.filters.status) params.set('status', props.filters.status)
    if (props.filters.search) params.set('search', props.filters.search)
    if (props.filters.startDate) params.set('startDate', props.filters.startDate)
    if (props.filters.endDate) params.set('endDate', props.filters.endDate)

    const response = await fetch(`/api/admin/orders/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      alert(err.statusMessage ?? 'Export failed')
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().split('T')[0]
    a.download = `orders-export-${date}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}
</script>
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS"
git add components/admin/AdminOrderExportButton.vue
git commit -m "feat(orders): add AdminOrderExportButton split-button with dropdown"
```

---

## Task 6: Wire export button into the orders list page

**Files:**
- Modify: `pages/admin/orders/index.vue`

- [ ] **Step 1: Add the import and component to the page**

Open `pages/admin/orders/index.vue`. 

In the `<script setup>` section, add this import after the existing imports:

```typescript
import AdminOrderExportButton from '~/components/admin/AdminOrderExportButton.vue'
```

Add a computed for the tenant ID (add after `const storeSettings = useState<any>('storeSettings')`):

```typescript
const tenantId = computed(() => storeSettings.value?.tenantId ?? '')
```

Add a computed for current filters (add after `const sortOrder = ref<'asc' | 'desc'>('desc')`):

```typescript
const exportFilters = computed(() => ({
  status: selectedStatus.value || undefined,
  search: searchQuery.value || undefined,
  startDate: startDate.value || undefined,
  endDate: endDate.value || undefined,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}))
```

- [ ] **Step 2: Add the export button to the AdminPageHeader slot**

In the `<template>` section, find the `<AdminPageHeader>` block:

```html
<AdminPageHeader
  :title="t('admin.nav.orders')"
  :subtitle="t('admin.pages.orders.index.subtitle')"
  :stats="orderStats"
>
  <NuxtLink
    to="/admin/orders/create"
    class="ui-btn ui-btn--primary flex items-center gap-2"
  >
    <Icon name="lucide:plus" class="w-5 h-5" />
    {{ t('admin.pages.orders.index.addBtn') }}
  </NuxtLink>
</AdminPageHeader>
```

Replace it with:

```html
<AdminPageHeader
  :title="t('admin.nav.orders')"
  :subtitle="t('admin.pages.orders.index.subtitle')"
  :stats="orderStats"
>
  <div class="flex items-center gap-3">
    <AdminOrderExportButton
      :filters="exportFilters"
      :tenant-id="tenantId"
    />
    <NuxtLink
      to="/admin/orders/create"
      class="ui-btn ui-btn--primary flex items-center gap-2"
    >
      <Icon name="lucide:plus" class="w-5 h-5" />
      {{ t('admin.pages.orders.index.addBtn') }}
    </NuxtLink>
  </div>
</AdminPageHeader>
```

- [ ] **Step 3: Run all tests to confirm no regressions**

```bash
npx vitest run tests/unit/orders-export.test.ts tests/orders-export-api.test.ts
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS"
git add pages/admin/orders/index.vue
git commit -m "feat(orders): wire export button into orders list page"
```

---

## Task 7 (Phase 2): Add Prisma model for Google OAuth tokens

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add model to schema**

Open `prisma/schema.prisma`. Add this model at the end of the file (before the last closing brace or after other models):

```prisma
model GoogleOAuthToken {
  id           String    @id @default(uuid())
  tenantId     String
  userId       String
  accessToken  String
  refreshToken String?
  expiresAt    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@unique([tenantId, userId])
  @@index([tenantId])
}
```

- [ ] **Step 2: Create migration**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS"
npx prisma migrate dev --name add_google_oauth_token
```

Expected: Migration file created, Prisma client regenerated, no errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(google-oauth): add GoogleOAuthToken prisma model"
```

---

## Task 8 (Phase 2): Build google-oauth module

**Files:**
- Create: `backend/src/modules/google-oauth/google-oauth.service.ts`
- Create: `backend/src/modules/google-oauth/google-oauth.controller.ts`
- Create: `backend/src/modules/google-oauth/routes.ts`

- [ ] **Step 1: Install googleapis**

```bash
npm install googleapis
```

Expected: `googleapis` appears in `package.json` dependencies.

- [ ] **Step 2: Create google-oauth.service.ts**

Create `backend/src/modules/google-oauth/google-oauth.service.ts`:

```typescript
import { google } from 'googleapis'
import prisma from '../../lib/prisma'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

function createOAuthClient() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URI
    )
}

export function getAuthUrl(state: string): string {
    const client = createOAuthClient()
    return client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state,
        prompt: 'consent',
    })
}

export async function exchangeCodeForTokens(code: string): Promise<{
    accessToken: string
    refreshToken: string | null
    expiresAt: Date | null
}> {
    const client = createOAuthClient()
    const { tokens } = await client.getToken(code)
    return {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    }
}

export async function saveTokens(tenantId: string, userId: string, tokens: {
    accessToken: string
    refreshToken: string | null
    expiresAt: Date | null
}) {
    await prisma.googleOAuthToken.upsert({
        where: { tenantId_userId: { tenantId, userId } },
        create: {
            tenantId,
            userId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
        },
        update: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken ?? undefined,
            expiresAt: tokens.expiresAt,
        },
    })
}

export async function getValidAccessToken(tenantId: string, userId: string): Promise<string | null> {
    const record = await prisma.googleOAuthToken.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
    })

    if (!record) return null

    // If not expired, return existing token
    if (!record.expiresAt || record.expiresAt > new Date()) {
        return record.accessToken
    }

    // Refresh if we have a refresh token
    if (!record.refreshToken) return null

    const client = createOAuthClient()
    client.setCredentials({ refresh_token: record.refreshToken })
    const { credentials } = await client.refreshAccessToken()

    await prisma.googleOAuthToken.update({
        where: { tenantId_userId: { tenantId, userId } },
        data: {
            accessToken: credentials.access_token!,
            expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
    })

    return credentials.access_token!
}

export async function createSheetAndWrite(
    accessToken: string,
    title: string,
    headers: string[],
    rows: string[][]
): Promise<string> {
    const client = createOAuthClient()
    client.setCredentials({ access_token: accessToken })

    const sheets = google.sheets({ version: 'v4', auth: client })

    // Create spreadsheet
    const created = await sheets.spreadsheets.create({
        requestBody: {
            properties: { title },
            sheets: [{ properties: { title: 'Orders' } }],
        },
    })

    const spreadsheetId = created.data.spreadsheetId!

    // Write data
    const values = [headers, ...rows]
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Orders!A1',
        valueInputOption: 'RAW',
        requestBody: { values },
    })

    // Bold header row
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [{
                repeatCell: {
                    range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                    cell: { userEnteredFormat: { textFormat: { bold: true } } },
                    fields: 'userEnteredFormat.textFormat.bold',
                },
            }],
        },
    })

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
}
```

- [ ] **Step 3: Create google-oauth.controller.ts**

Create `backend/src/modules/google-oauth/google-oauth.controller.ts`:

```typescript
import type { Request, Response } from 'express'
import {
    getAuthUrl,
    exchangeCodeForTokens,
    saveTokens,
    getValidAccessToken,
    createSheetAndWrite,
} from './google-oauth.service'
import {
    fetchForExport,
    toRows,
    EXPORT_COLUMNS,
    DEFAULT_COLUMNS,
} from '../orders/orders-export.service'

export class GoogleOAuthController {
    async getAuthUrl(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user!

            // Encode return context in state: tenantId|userId|querystring
            const querystring = new URLSearchParams(req.query as Record<string, string>).toString()
            const state = Buffer.from(JSON.stringify({
                tenantId: tenant.id,
                userId: user.id,
                query: querystring,
            })).toString('base64url')

            const url = getAuthUrl(state)
            res.json({ url })
        } catch (error) {
            console.error('Google auth URL error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }

    async handleCallback(req: Request, res: Response) {
        try {
            const { code, state, error } = req.query as Record<string, string>

            if (error) {
                return res.redirect('/admin/orders?gauth=denied')
            }

            if (!code || !state) {
                return res.status(400).send('Missing code or state')
            }

            const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
            const { tenantId, userId, query } = decoded

            const tokens = await exchangeCodeForTokens(code)
            await saveTokens(tenantId, userId, tokens)

            res.redirect(`/admin/orders?gauth=success&${query}`)
        } catch (error) {
            console.error('Google OAuth callback error:', error)
            res.redirect('/admin/orders?gauth=error')
        }
    }

    async exportToSheet(req: Request, res: Response) {
        try {
            const tenant = req.tenant!
            const user = req.user!

            const accessToken = await getValidAccessToken(tenant.id, user.id)
            if (!accessToken) {
                return res.status(401).json({ statusCode: 401, statusMessage: 'Google account not connected. Please authorize first.' })
            }

            const { columns, status, search, startDate, endDate } = req.query as Record<string, string>

            const selectedColumns = columns
                ? columns.split(',').map(c => c.trim()).filter(c => EXPORT_COLUMNS.some(ec => ec.key === c))
                : DEFAULT_COLUMNS

            const { orders, truncated } = await fetchForExport(
                tenant.id,
                { status, search, startDate, endDate },
                selectedColumns
            )

            const headers = selectedColumns.map(k => EXPORT_COLUMNS.find(c => c.key === k)!.label)
            const rows = toRows(orders, selectedColumns)

            const title = `Orders ${new Date().toISOString().split('T')[0]} — ${tenant.name ?? ''}`
            const sheetUrl = await createSheetAndWrite(accessToken, title, headers, rows)

            if (truncated) res.setHeader('X-Export-Truncated', 'true')
            res.json({ sheetUrl })
        } catch (error) {
            console.error('Google Sheet export error:', error)
            res.status(500).json({ statusCode: 500, message: 'Internal Server Error' })
        }
    }
}
```

- [ ] **Step 4: Create routes.ts**

Create `backend/src/modules/google-oauth/routes.ts`:

```typescript
import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { GoogleOAuthController } from './google-oauth.controller'

const router = Router()
const controller = new GoogleOAuthController()

// Returns the Google OAuth consent URL (frontend opens it in new tab)
router.get('/google-auth-url', requireTenantMember, requireStaffCrud('orders'), controller.getAuthUrl.bind(controller))

// Google redirects here after consent — no auth middleware (unauthenticated redirect)
router.get('/google-callback', controller.handleCallback.bind(controller))

// Frontend calls this after gauth=success to do the actual sheet push
router.get('/google-export', requireTenantMember, requireStaffCrud('orders'), controller.exportToSheet.bind(controller))

export default router
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS"
git add backend/src/modules/google-oauth/
git commit -m "feat(google-oauth): add service, controller, and routes for Google Sheets export"
```

---

## Task 9 (Phase 2): Register Google OAuth routes + frontend callback handling

**Files:**
- Modify: `backend/src/routes.ts`
- Modify: `pages/admin/orders/index.vue`

- [ ] **Step 1: Register Google OAuth routes in main routes.ts**

Open `backend/src/routes.ts`. Add the import at the top with the other imports:

```typescript
import googleOAuthRouter from './modules/google-oauth/routes'
```

Add the route registration after the orders router line (`router.use('/admin/orders', ordersRouter)`):

```typescript
router.use('/admin/orders/export', googleOAuthRouter)
```

- [ ] **Step 2: Handle gauth=success in orders list page**

Open `pages/admin/orders/index.vue`. In the `<script setup>` section, add this block after the `onMounted` call:

```typescript
// Handle Google Sheets OAuth return
onMounted(async () => {
  const gauthStatus = route.query.gauth as string | undefined
  if (gauthStatus === 'success') {
    // Extract the original export params that were passed through OAuth state
    const query = { ...route.query }
    delete query.gauth
    const params = new URLSearchParams(query as Record<string, string>)
    try {
      const data = await $fetch<{ sheetUrl: string }>(`/api/admin/orders/export/google-export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      if (data.sheetUrl) {
        window.open(data.sheetUrl, '_blank')
      }
    } catch (err) {
      console.error('Google Sheet export after auth failed:', err)
    }
    // Clean up URL
    await navigateTo({ path: '/admin/orders', query: {} }, { replace: true })
  }
})
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run tests/unit/orders-export.test.ts tests/orders-export-api.test.ts
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
cd "/Users/lyazz/Documents/js projects/MySaaS"
git add backend/src/routes.ts pages/admin/orders/index.vue
git commit -m "feat(google-oauth): register routes and handle OAuth callback in orders page"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| CSV export | Task 2, Task 3 |
| XLSX export | Task 2, Task 3 |
| PDF export | Task 2, Task 3 |
| TXT export | Task 2, Task 3 |
| Google Sheets direct push | Tasks 7, 8, 9 |
| Column picker modal | Task 4 |
| Format selector in modal | Task 4 |
| localStorage prefs persistence | Task 4, Task 5 |
| Quick-export dropdown | Task 5 |
| "Export options…" link | Task 5 |
| Filters passed to export | Tasks 3, 5, 6 |
| 10,000 safety cap + truncation header | Task 2 |
| Endpoint before `/:id` | Task 3 |
| Unit tests for generators | Task 1, Task 2 |
| Integration test for endpoint | Task 3 |
| Google OAuth token storage | Task 7, Task 8 |
| tenant-scoped export queries | Task 2 |

**Placeholder scan:** No TBD, no "implement later", all code blocks contain complete code. ✓

**Type consistency:**
- `fetchForExport` defined in Task 2, called in Task 3 controller and Task 8 controller ✓
- `toRows` defined in Task 2, called in Task 3 and Task 8 ✓
- `EXPORT_COLUMNS` defined in Task 2, used in Tasks 3, 8 ✓
- `DEFAULT_COLUMNS` defined in Task 2, used in Tasks 3, 8 ✓
- `EXPORT_COLUMNS_META` and `DEFAULT_EXPORT_COLUMNS` defined in Task 4 composable, imported in Task 4 modal and Task 5 button ✓
- `GoogleOAuthToken` model unique key `tenantId_userId` used correctly in Task 8 ✓
