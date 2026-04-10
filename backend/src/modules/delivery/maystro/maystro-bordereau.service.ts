import { MaystroClient } from './maystro.client'
import { MaystroIntegrationError } from './maystro.errors'

export class MaystroBordereauService {
    async createBordereauPdf(input: { apiToken: string; allCreated?: boolean; ordersIds?: string[] }) {
        const allCreated = input.allCreated === true
        const ordersIds = Array.isArray(input.ordersIds) ? input.ordersIds.filter((id) => typeof id === 'string' && id.trim().length > 0) : []

        if (!allCreated && ordersIds.length === 0) {
            throw new MaystroIntegrationError({
                statusCode: 400,
                statusMessage: 'Provide all_created=true or orders_ids[]'
            })
        }

        const client = new MaystroClient({ apiToken: input.apiToken })
        return client.request<ArrayBuffer>({
            method: 'POST',
            path: '/starter_bordureau/',
            data: allCreated ? { all_created: true } : { orders_ids: ordersIds },
            responseType: 'arraybuffer'
        })
    }
}

