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
    const firstLine = csv.split(/\r?\n/)[0]
    expect(firstLine).toContain('Order ID')
    expect(firstLine).toContain('Customer Name')
  })

  it('second line contains order data', () => {
    const rows = toRows(SAMPLE_ORDERS as any, DEFAULT_COLUMNS)
    const headers = DEFAULT_COLUMNS.map(k => EXPORT_COLUMNS.find(c => c.key === k)!.label)
    const csv = generateCsv(rows, headers).toString('utf-8')
    const secondLine = csv.split(/\r?\n/)[1]
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
