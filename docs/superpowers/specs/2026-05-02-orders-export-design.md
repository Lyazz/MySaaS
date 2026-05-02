# Orders Export — Design Spec

**Date:** 2026-05-02

---

## Summary

Add multi-format order export to the admin orders list page. Admins can export all orders matching their current filters (status, date range, search) in CSV, XLSX, PDF, TXT, or directly to a new Google Sheet. Columns are user-configurable via a picker modal, and the last-used column selection is persisted in `localStorage`.

---

## User Experience

### Export Button (in orders list header)

Two controls:

1. **Quick-export dropdown** — A split button next to the existing "New order" button. Left side re-exports with last saved settings (format + columns). Right side opens a dropdown:
   - CSV
   - Excel (.xlsx)
   - PDF
   - Text (.txt)
   - Google Sheets ↗

2. **"Export options" link** — Below or beside the dropdown, opens the full export modal to reconfigure format and columns before exporting.

### Export Modal

A modal with two sections:

- **Format selector** — Radio/tabs: CSV | Excel | PDF | Text | Google Sheets
- **Column picker** — Checklist of all available columns (see below). Columns sorted in logical groups. "Select all / None" toggle.
- **Export button** — Triggers the export with current filters + selected format + selected columns.

Column preferences and format are saved to `localStorage` under key `orders_export_prefs_{tenantId}` on each successful export.

---

## Available Columns

| Key | Label | Source |
|-----|-------|--------|
| `id` | Order ID | `order.id` |
| `createdAt` | Date | `order.createdAt` |
| `status` | Status | `order.status` |
| `callStatus` | Call Status | `order.callStatus` |
| `customerName` | Customer Name | `order.customerName` |
| `customerPhone` | Phone | `order.customerPhone` |
| `customerAddress` | Address | `order.customerAddress` |
| `deliveryMode` | Delivery Mode | `order.deliveryMode` |
| `shippingProvider` | Carrier | `order.shippingProvider` |
| `shippingServiceLevel` | Service Level | `order.shippingServiceLevel` |
| `shippingWilayaCode` | Wilaya | `order.shippingWilayaCode` |
| `shippingCommuneCode` | Commune | `order.shippingCommuneCode` |
| `shippingAddressLine1` | Shipping Address | `order.shippingAddressLine1` |
| `shippingAmount` | Shipping Cost | `order.shippingAmount` |
| `shippingNotes` | Shipping Notes | `order.shippingNotes` |
| `totalAmount` | Items Total | `order.totalAmount` |
| `totalWithShippingAmount` | Total (incl. shipping) | `order.totalWithShippingAmount` |
| `earnedPointsTotal` | Points Earned | `order.earnedPointsTotal` |
| `redeemedPointsTotal` | Points Redeemed | `order.redeemedPointsTotal` |
| `redeemedAmount` | Redeemed Amount | `order.redeemedAmount` |
| `internalNotes` | Internal Notes | `order.internalNotes` |
| `itemsSummary` | Items | joined from `order.items` |

Default columns (first export): `id`, `createdAt`, `status`, `customerName`, `customerPhone`, `shippingWilayaCode`, `totalWithShippingAmount`.

---

## Backend Architecture

### New endpoint

```
GET /api/admin/orders/export
```

**Query params** (same as list endpoint, plus):
- `format`: `csv | xlsx | pdf | txt | gsheet`
- `columns`: comma-separated column keys (e.g. `id,createdAt,status,customerName`)

**Auth:** same `requireTenantMember` + `requireStaffCrud('orders')` middleware as list.

**No pagination** — fetches all matching orders (up to 10,000 safety cap, configurable).

### New file: `orders-export.service.ts`

Separate from `orders.service.ts` to keep it focused. Responsibilities:

1. `fetchForExport(tenantId, filters, columns)` — Prisma query scoped by `tenantId`, selects only requested fields, includes `items` relation when `itemsSummary` column is selected.
2. `toRows(orders, columns)` — maps orders to flat row arrays.
3. `generateCsv(rows, headers)` → `Buffer`
4. `generateTxt(rows, headers)` → `Buffer` (tab-separated)
5. `generateXlsx(rows, headers)` → `Buffer` (via `exceljs`)
6. `generatePdf(rows, headers, tenantName)` → `Buffer` (via `pdfkit`, existing pattern)
7. `pushToGoogleSheet(rows, headers, oauthTokens)` → `{ sheetUrl: string }` (via `googleapis`)

### `orders.controller.ts` — new `export` method

Calls `OrdersExportService`, sets appropriate `Content-Type` + `Content-Disposition`, streams buffer. For Google Sheets format, returns JSON `{ sheetUrl }` instead.

### `routes.ts` — new route

```ts
router.get('/export', requireStaffCrud('orders'), controller.export.bind(controller))
```

Must be registered **before** `/:id` to avoid route shadowing.

---

## Google Sheets OAuth Flow

### New env vars

```
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://{domain}/admin/orders/export/google-callback
```

### OAuth flow (per-tenant, per-admin-user)

1. Admin clicks "Google Sheets" export → frontend calls `GET /api/admin/orders/export/google-auth-url`
2. Backend returns Google OAuth consent URL (scopes: `https://www.googleapis.com/auth/spreadsheets`)
3. Frontend opens URL in new tab/popup
4. Google redirects to `GET /api/admin/orders/export/google-callback?code=...&state=...`
5. Backend exchanges code for tokens, stores in `GoogleOAuthToken` table (new Prisma model)
6. Backend closes popup / redirects to orders page with `?gauth=success`
7. Frontend detects `gauth=success`, retriggers the Google Sheets export now that tokens exist

### New Prisma model

```prisma
model GoogleOAuthToken {
  id           String   @id @default(uuid())
  tenantId     String
  userId       String
  accessToken  String
  refreshToken String?
  expiresAt    DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([tenantId, userId])
  @@index([tenantId])
}
```

### New backend module: `google-oauth/`

- `google-oauth.service.ts` — token storage/retrieval/refresh, sheet creation
- `google-oauth.controller.ts` — `getAuthUrl`, `handleCallback`, `exportToSheet`
- `routes.ts` — mounts under `/api/admin/orders/export/google-*`

---

## Frontend Components

### `AdminOrderExportModal.vue`

- Format radio (CSV / Excel / PDF / Text / Google Sheets)
- Column checklist (all columns, with "Select all" / "None" toggle)
- Export button (shows spinner while in-flight)
- On mount: load saved prefs from `localStorage`
- On success: save prefs to `localStorage`, trigger file download or open Sheet URL

### `AdminOrderExportButton.vue`

- Split button: left = "Export" (re-run last format+columns), right = dropdown (format picker)
- Dropdown has 5 format options + "Export options..." link
- If no saved prefs exist, "Export" defaults to opening the modal

### Integration in `pages/admin/orders/index.vue`

- Import and render `AdminOrderExportButton` in the `AdminPageHeader` slot alongside the existing "New order" button
- Pass current filter state (`status`, `search`, `startDate`, `endDate`, `sortBy`, `sortOrder`) as props to the export button

---

## New packages

```
exceljs          — XLSX generation (backend)
googleapis       — Google Sheets API (backend)
```

---

## Safety cap

Export is limited to 10,000 orders. If filters match more, the response includes a warning header `X-Export-Truncated: true` and the file is generated for the first 10,000 sorted by `createdAt desc`.

---

## Phasing

**Phase 1 (shippable alone):** CSV, XLSX, PDF, TXT export — no Google OAuth dependency. Includes export modal, column picker, localStorage persistence, backend endpoint, `orders-export.service.ts`, `exceljs` package.

**Phase 2:** Google Sheets direct push — adds `googleapis` package, `GoogleOAuthToken` model migration, `google-oauth/` module, OAuth callback flow.

---

## Tests

- Unit tests for `OrdersExportService`: each format generator (`generateCsv`, `generateTxt`, `generateXlsx`, `generatePdf`) given sample rows, assert output shape/content.
- Integration test for `GET /api/admin/orders/export?format=csv&columns=id,status`: assert 200, correct `Content-Type`, correct headers in first line of CSV.
- Google OAuth controller: mock `googleapis`, assert token exchange and storage path.
