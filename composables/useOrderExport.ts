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
