import type { Shipment, ShipmentEvent, ShipmentProvider, ShipmentStatus } from '@prisma/client'

export type QuoteRequest = {
    tenantId: string
    provider: ShipmentProvider
    destination: {
        wilayaCode: string
        communeCode?: string
    }
    originWilayaCode?: string
    weight?: number
    codAmount?: number
    deliveryMode?: 'home' | 'office'
    serviceLevel?: string
}

export type QuoteOption = {
    provider: ShipmentProvider
    serviceLevel?: string
    price: number
    currency: string
    estimatedMinDays?: number
    estimatedMaxDays?: number
    providerPrice?: number
    source: 'provider' | 'fallback-rate' | 'tenant-override'
}

export type CreateShipmentInput = {
    tenantId: string
    provider: ShipmentProvider
    orderId: string
    serviceLevel?: string
    price?: number
    currency?: string
    contactName: string
    contactPhone: string
    wilayaCode: string
    communeCode?: string
    addressLine1: string
    addressLine2?: string
    notes?: string
    deliveryMode?: 'home' | 'office'
    metadata?: Record<string, any>
}

export type CreateShipmentResult = {
    providerShipmentId?: string
    status?: ShipmentStatus
    labelUrl?: string | null
    trackingUrl?: string | null
    price?: number
    currency?: string
    raw?: any
}

export type TrackingEvent = {
    status?: ShipmentStatus
    code?: string
    description?: string
    eventTime?: Date
    raw?: any
}

export interface DeliveryProvider {
    provider: ShipmentProvider
    quote?(input: QuoteRequest): Promise<QuoteOption[]>
    createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>
    track?(shipment: Shipment): Promise<TrackingEvent[]>
    getLabel?(shipment: Shipment): Promise<string | null>
    handleWebhook?(payload: any): Promise<{ shipmentId?: string; events?: TrackingEvent[]; status?: ShipmentStatus } | null>
    listCompanies?(): Promise<{ code: string; name: string }[]>
}
