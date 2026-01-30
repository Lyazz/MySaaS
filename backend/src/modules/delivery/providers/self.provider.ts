import type { ShipmentProvider, ShipmentStatus } from '@prisma/client'
import type {
    CreateShipmentInput,
    CreateShipmentResult,
    DeliveryProvider,
    QuoteOption,
    QuoteRequest,
    TrackingEvent
} from '../types'

export class SelfDeliveryProvider implements DeliveryProvider {
    provider: ShipmentProvider = 'SELF'

    async quote(input: QuoteRequest): Promise<QuoteOption[]> {
        // Pricing is handled by DeliveryService via DeliveryRate table. Return empty to force fallback.
        return []
    }

    async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
        return {
            providerShipmentId: `SELF-${input.orderId}`,
            status: 'CONFIRMED',
            price: input.price,
            currency: input.currency || 'DZD'
        }
    }

    async track(): Promise<TrackingEvent[]> {
        // Tracking events are stored internally for self delivery.
        return []
    }
}
