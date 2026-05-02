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

export const EXPORT_FORMATS = [
  { value: 'csv',    label: 'CSV',             icon: 'lucide:file-text' },
  { value: 'xlsx',   label: 'Excel (.xlsx)',    icon: 'lucide:table-2' },
  { value: 'pdf',    label: 'PDF',              icon: 'lucide:file-type-2' },
  { value: 'txt',    label: 'Text (.txt)',      icon: 'lucide:align-left' },
  { value: 'gsheet', label: 'Google Sheets ↗', icon: 'lucide:external-link' },
]

export function buildExportParams(
  format: string,
  columns: string[],
  filters: { status?: string; search?: string; startDate?: string; endDate?: string },
): URLSearchParams {
  const params = new URLSearchParams()
  params.set('format', format)
  params.set('columns', columns.join(','))
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  return params
}

export function loadExportPrefs(tenantId: string): { format: string; columns: string[] } {
  if (!process.client) return { format: 'csv', columns: DEFAULT_EXPORT_COLUMNS }
  try {
    const raw = localStorage.getItem(`orders_export_prefs_${tenantId}`)
    if (raw) {
      const p = JSON.parse(raw)
      if (p.format && Array.isArray(p.columns) && p.columns.length > 0) return p
    }
  } catch {
    // ignore
  }
  return { format: 'csv', columns: DEFAULT_EXPORT_COLUMNS }
}

export function saveExportPrefs(tenantId: string, format: string, columns: string[]): void {
  if (!process.client) return
  try {
    localStorage.setItem(`orders_export_prefs_${tenantId}`, JSON.stringify({ format, columns }))
  } catch {
    // ignore
  }
}
