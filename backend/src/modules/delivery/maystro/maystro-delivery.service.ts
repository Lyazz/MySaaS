import { MaystroClient } from './maystro.client'

export type MaystroDeliveryOption = {
    delivery_type: number
    delivery_price?: number
    min_total_price?: number
    required_points?: number
    current_points?: number
}

export class MaystroDeliveryService {
    async listDeliveryOptions(input: { apiToken: string; commune: string | number }) {
        const client = new MaystroClient({ apiToken: input.apiToken })
        return client.request<any[]>({
            method: 'GET',
            path: '/base/delivery-options/',
            params: { commune: input.commune }
        })
    }

    async getDeliveryPrice(input: { apiToken: string; commune: string | number; deliveryType: number }) {
        const client = new MaystroClient({ apiToken: input.apiToken })
        return client.request<MaystroDeliveryOption | any>({
            method: 'GET',
            path: '/base/delivery-prices/',
            params: { commune: input.commune, delivery_type: input.deliveryType }
        })
    }
}

