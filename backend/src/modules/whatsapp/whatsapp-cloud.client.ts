/**
 * Thin client over Meta's Graph API for WhatsApp Cloud.
 *
 * One instance per tenant token — the token is the tenant's, not the platform's,
 * so nothing here is cached or shared between tenants. `fetch` rather than axios
 * to stay consistent with the Telegram client next door.
 */

const DEFAULT_GRAPH_VERSION = 'v21.0'

const graphVersion = () => (process.env.META_GRAPH_VERSION ?? '').trim() || DEFAULT_GRAPH_VERSION

/**
 * Errors worth trying again: Meta is rate limiting us, or something on their
 * side broke. Everything else (bad number, unapproved template, dead token)
 * fails identically on every retry, so the caller must not burn attempts on it.
 */
const RETRYABLE_ERROR_CODES = new Set([1, 2, 4, 80007, 130429, 131000, 131056, 133016])

export class WhatsAppApiError extends Error {
    readonly code: string | null
    readonly subcode: string | null
    readonly type: string | null
    readonly fbtraceId: string | null
    readonly httpStatus: number
    readonly retryable: boolean

    constructor(input: {
        message: string
        code?: unknown
        subcode?: unknown
        type?: unknown
        fbtraceId?: unknown
        httpStatus: number
        retryable?: boolean
    }) {
        super(input.message)
        this.name = 'WhatsAppApiError'
        this.code = input.code === undefined || input.code === null ? null : String(input.code)
        this.subcode = input.subcode === undefined || input.subcode === null ? null : String(input.subcode)
        this.type = typeof input.type === 'string' ? input.type : null
        this.fbtraceId = typeof input.fbtraceId === 'string' ? input.fbtraceId : null
        this.httpStatus = input.httpStatus
        this.retryable =
            input.retryable ?? (input.httpStatus >= 500 || RETRYABLE_ERROR_CODES.has(Number(this.code)))
    }
}

export type TemplateButtonDefinition =
    | { type: 'QUICK_REPLY'; text: string }
    | { type: 'URL'; text: string; url: string; example: string[] }

export type TemplateDefinition = {
    name: string
    language: string
    category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'
    components: Array<
        | { type: 'BODY'; text: string; example?: { body_text: string[][] } }
        | { type: 'FOOTER'; text: string }
        | { type: 'BUTTONS'; buttons: TemplateButtonDefinition[] }
    >
}

export type TemplateSummary = {
    id: string
    name: string
    language: string
    status: string
    category?: string
    rejected_reason?: string | null
}

export type SendTemplateInput = {
    to: string
    templateName: string
    languageCode: string
    bodyParams: string[]
    /** Payload string per quick-reply button, in button order. */
    quickReplyPayloads?: string[]
    /** Value substituted into the URL button's dynamic suffix. */
    urlSuffix?: string
}

type GraphErrorBody = {
    error?: {
        message?: string
        type?: string
        code?: number
        error_subcode?: number
        error_user_msg?: string
        fbtrace_id?: string
    }
}

/**
 * Trades the Embedded Signup code for the tenant's business token.
 *
 * Unauthenticated by nature — the app secret is the credential — so it sits
 * outside the client, which is built around a token it does not yet have.
 */
export const exchangeSignupCode = async (input: {
    appId: string
    appSecret: string
    code: string
}): Promise<string> => {
    const params = new URLSearchParams({
        client_id: input.appId,
        client_secret: input.appSecret,
        code: input.code
    })

    let res: Response
    try {
        res = await fetch(`https://graph.facebook.com/${graphVersion()}/oauth/access_token?${params.toString()}`)
    } catch {
        throw new WhatsAppApiError({
            message: 'Failed to reach the WhatsApp Cloud API',
            httpStatus: 503,
            retryable: true
        })
    }

    const json = (await res.json().catch(() => null)) as
        | ({ access_token?: string } & GraphErrorBody)
        | null

    if (!res.ok || json?.error || !json?.access_token) {
        const error = json?.error ?? {}
        throw new WhatsAppApiError({
            message: error.error_user_msg || error.message || 'WhatsApp sign-up code could not be exchanged',
            code: error.code,
            subcode: error.error_subcode,
            type: error.type,
            fbtraceId: error.fbtrace_id,
            httpStatus: res.status
        })
    }

    return json.access_token
}

export class WhatsAppCloudClient {
    constructor(private readonly accessToken: string) {}

    /**
     * Sends a pre-approved template. Returns Meta's message id (`wamid...`),
     * which is what later delivery/read webhooks are keyed on.
     */
    async sendTemplate(phoneNumberId: string, input: SendTemplateInput): Promise<{ wamid: string }> {
        const components: any[] = []

        if (input.bodyParams.length > 0) {
            components.push({
                type: 'body',
                parameters: input.bodyParams.map((text) => ({ type: 'text', text }))
            })
        }

        // Button components are addressed by index, and the index is the button's
        // position in the approved template — quick replies first, URL last.
        const quickReplies = input.quickReplyPayloads ?? []
        quickReplies.forEach((payload, index) => {
            components.push({
                type: 'button',
                sub_type: 'quick_reply',
                index: String(index),
                parameters: [{ type: 'payload', payload }]
            })
        })

        if (input.urlSuffix) {
            components.push({
                type: 'button',
                sub_type: 'url',
                index: String(quickReplies.length),
                parameters: [{ type: 'text', text: input.urlSuffix }]
            })
        }

        const body = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: input.to,
            type: 'template',
            template: {
                name: input.templateName,
                language: { code: input.languageCode },
                components
            }
        }

        const res = await this.request<{ messages?: Array<{ id?: string }> }>(
            'POST',
            `${encodeURIComponent(phoneNumberId)}/messages`,
            body
        )

        const wamid = res.messages?.[0]?.id
        if (!wamid) {
            throw new WhatsAppApiError({
                message: 'WhatsApp accepted the request but returned no message id',
                httpStatus: 502,
                retryable: true
            })
        }

        return { wamid }
    }

    async createTemplate(wabaId: string, definition: TemplateDefinition) {
        return this.request<{ id: string; status: string; category?: string }>(
            'POST',
            `${encodeURIComponent(wabaId)}/message_templates`,
            definition
        )
    }

    async listTemplates(wabaId: string, opts?: { name?: string; limit?: number }): Promise<TemplateSummary[]> {
        const params = new URLSearchParams({
            fields: 'id,name,language,status,category,rejected_reason',
            limit: String(opts?.limit ?? 100)
        })
        if (opts?.name) {
            params.set('name', opts.name)
        }

        const res = await this.request<{ data?: TemplateSummary[] }>(
            'GET',
            `${encodeURIComponent(wabaId)}/message_templates?${params.toString()}`
        )
        return Array.isArray(res.data) ? res.data : []
    }

    async deleteTemplate(wabaId: string, name: string) {
        const params = new URLSearchParams({ name })
        return this.request<{ success?: boolean }>(
            'DELETE',
            `${encodeURIComponent(wabaId)}/message_templates?${params.toString()}`
        )
    }

    async getPhoneNumber(phoneNumberId: string) {
        const params = new URLSearchParams({
            fields: 'id,display_phone_number,verified_name,quality_rating,code_verification_status'
        })
        return this.request<{
            id: string
            display_phone_number?: string
            verified_name?: string
            quality_rating?: string
            code_verification_status?: string
        }>('GET', `${encodeURIComponent(phoneNumberId)}?${params.toString()}`)
    }

    /**
     * Subscribes the Swekly Meta app to this WABA's webhooks. Without it the
     * tenant's numbers send fine but no button click ever reaches us.
     */
    async subscribeApp(wabaId: string) {
        return this.request<{ success?: boolean }>('POST', `${encodeURIComponent(wabaId)}/subscribed_apps`)
    }

    private async request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
        const url = `https://graph.facebook.com/${graphVersion()}/${path}`

        let res: Response
        try {
            res = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    ...(body ? { 'Content-Type': 'application/json' } : {})
                },
                body: body ? JSON.stringify(body) : undefined
            })
        } catch {
            // No response at all: DNS, TLS, timeout. Always worth another try.
            throw new WhatsAppApiError({
                message: 'Failed to reach the WhatsApp Cloud API',
                httpStatus: 503,
                retryable: true
            })
        }

        const text = await res.text()
        let json: any = null
        if (text) {
            try {
                json = JSON.parse(text)
            } catch {
                json = null
            }
        }

        if (!res.ok || json?.error) {
            const error = (json as GraphErrorBody)?.error ?? {}
            const message = error.error_user_msg || error.message || `WhatsApp Cloud API error (HTTP ${res.status})`
            throw new WhatsAppApiError({
                message,
                code: error.code,
                subcode: error.error_subcode,
                type: error.type,
                fbtraceId: error.fbtrace_id,
                httpStatus: res.status
            })
        }

        return (json ?? {}) as T
    }
}
