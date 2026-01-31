import type { Shipment, ShipmentProvider } from '@prisma/client'
import type { CreateShipmentInput, CreateShipmentResult, DeliveryProvider, QuoteOption, QuoteRequest, TrackingEvent } from '../types'

export class ManualCarrierProvider implements DeliveryProvider {
    provider: ShipmentProvider

    constructor(provider: ShipmentProvider) {
        this.provider = provider
    }

    async quote(_input: QuoteRequest): Promise<QuoteOption[]> {
        return []
    }

    async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
        return {
            status: 'REQUESTED',
            price: input.price,
            currency: input.currency || 'DZD',
            raw: {
                mode: 'manual',
                provider: this.provider
            }
        }
    }

    async track(_shipment: Shipment): Promise<TrackingEvent[]> {
        return []
    }
}
