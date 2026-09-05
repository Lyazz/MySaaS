import { MaystroClient } from './maystro.client'

export type MaystroHookType = { id: string; name?: string; description?: string; [key: string]: any }
export type MaystroHook = {
    id: string
    endpoint: string
    trigger_type?: { id: string; name?: string; description?: string }
    [key: string]: any
}

export class MaystroHooksService {
    async listTypes(input: { apiToken: string }): Promise<MaystroHookType[]> {
        const client = new MaystroClient({ apiToken: input.apiToken })
        const data = await client.request<any[]>({ method: 'GET', path: '/stores/hooks/types/' })
        return Array.isArray(data) ? data : []
    }

    async listHooks(input: { apiToken: string }): Promise<MaystroHook[]> {
        const client = new MaystroClient({ apiToken: input.apiToken })
        const data = await client.request<any>({ method: 'GET', path: '/stores/hooks/costume/' })
        const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
        return list
    }

    async createHook(input: { apiToken: string; endpoint: string; triggerTypeId: string }) {
        const client = new MaystroClient({ apiToken: input.apiToken })
        return client.request<any>({
            method: 'POST',
            path: '/stores/hooks/costume/',
            data: { endpoint: input.endpoint, trigger_type_id: input.triggerTypeId }
        })
    }

    async deleteHook(input: { apiToken: string; id: string }) {
        const client = new MaystroClient({ apiToken: input.apiToken })
        return client.request<any>({
            method: 'DELETE',
            path: `/stores/hooks/costume/${encodeURIComponent(input.id)}/`
        })
    }
}
