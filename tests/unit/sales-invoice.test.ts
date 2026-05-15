import { describe, expect, it } from 'vitest'
import {
    buildInvoiceNumber,
    buildSalesInvoicePdfModel
} from '../../backend/src/modules/sales/sales-invoice.service'

describe('sales invoice template mapping', () => {
    it('sanitizes invoice prefixes and builds stable source invoice numbers', () => {
        expect(buildInvoiceNumber(' inv-2026 ', 'SALE', 'abc-def-123456')).toBe('INV2026-SALE-ABCDEF12')
        expect(buildInvoiceNumber('', 'ORDER', 'order-1')).toBe('INV-ORDER-ORDER1')
    })

    it('maps POS sale data with footer, customer fallback, and line totals', () => {
        const model = buildSalesInvoicePdfModel({
            tenant: { name: 'Tenant Store' },
            settings: {
                logoUrl: '/logo.png',
                invoiceShowLogo: true,
                invoiceFooterText: 'Thank you',
                currencyCode: 'DZD'
            },
            contactInfos: [{ kind: 'phone', label: 'Phone', value: '0550000000' }],
            invoice: { invoiceNumber: 'INV-SALE-ABC123', issuedAt: new Date('2026-05-01T10:00:00Z') },
            sourceType: 'SALE',
            source: {
                id: 'sale-1',
                createdAt: new Date('2026-05-01T09:00:00Z'),
                totalAmount: 2400,
                customerName: null,
                customerPhone: null,
                customerAddress: null,
                items: [
                    { quantity: 2, price: 1200, product: { title: 'T-Shirt' }, variant: { sku: 'TS-BLK' } }
                ]
            }
        })

        expect(model.customerName).toBe('Guest')
        expect(model.footerText).toBe('Thank you')
        expect(model.showLogo).toBe(true)
        expect(model.contactLines[0]).toContain('0550000000')
        expect(model.lines[0]).toMatchObject({ title: 'T-Shirt', variantLabel: 'TS-BLK', lineTotal: 2400 })
        expect(model.total).toBe(2400)
    })

    it('maps delivered order totals with shipping', () => {
        const model = buildSalesInvoicePdfModel({
            tenant: { name: 'Tenant Store' },
            settings: {
                invoiceShowLogo: false,
                invoiceFooterText: null,
                currencyCode: 'DZD'
            },
            contactInfos: [],
            invoice: { invoiceNumber: 'INV-ORDER-ABC123', issuedAt: new Date('2026-05-01T10:00:00Z') },
            sourceType: 'ORDER',
            source: {
                id: 'order-1',
                createdAt: new Date('2026-05-01T09:00:00Z'),
                totalAmount: 2000,
                totalWithShippingAmount: 2500,
                shippingAmount: 500,
                customerName: 'Ahmed',
                customerPhone: '0550000001',
                customerAddress: 'Algiers',
                shippingAddressLine1: 'Hydra, Algiers',
                items: [
                    { quantity: 2, price: 1000, lineTotal: 2000, product: { title: 'Shoes' }, variant: null }
                ]
            }
        })

        expect(model.showLogo).toBe(false)
        expect(model.customerAddress).toBe('Hydra, Algiers')
        expect(model.subtotal).toBe(2000)
        expect(model.shippingAmount).toBe(500)
        expect(model.total).toBe(2500)
    })
})
