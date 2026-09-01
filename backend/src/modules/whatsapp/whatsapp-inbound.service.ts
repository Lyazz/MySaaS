import prisma from '../../lib/prisma'
import { OrdersService } from '../orders/orders.service'
import { CANCEL_PAYLOAD_PREFIX, CONFIRM_PAYLOAD_PREFIX } from './whatsapp-templates'
import { whatsappTemplatesService } from './whatsapp-templates.service'
import { whatsappService } from './whatsapp.service'
import { WHATSAPP_PROVIDER, isWhatsAppLanguage, parseWhatsAppConfig } from './whatsapp.types'

/**
 * Turns Meta's webhook payloads into order actions.
 *
 * The webhook is the one entry point with no tenant in the Host header, so the
 * tenant is resolved from the number the message was sent to — every read and
 * write after that is scoped by the tenant id it yields. Nothing here throws at
 * the HTTP layer: Meta retries anything that is not a 200, and a retry storm on
 * a payload we will never understand helps no one.
 */

type WebhookStatus = {
    id?: string
    status?: string
    errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>
}

type WebhookMessage = {
    id?: string
    from?: string
    type?: string
    button?: { payload?: string; text?: string }
    interactive?: { type?: string; button_reply?: { id?: string; title?: string } }
    text?: { body?: string }
}

type WebhookChangeValue = {
    metadata?: { phone_number_id?: string; display_phone_number?: string }
    messages?: WebhookMessage[]
    statuses?: WebhookStatus[]
    // message_template_status_update
    event?: string
    message_template_name?: string
    message_template_language?: string
    reason?: string | null
}

type WebhookChange = { field?: string; value?: WebhookChangeValue }

type WebhookPayload = {
    object?: string
    entry?: Array<{ id?: string; changes?: WebhookChange[] }>
}

export type InboundOutcome = {
    handled: number
    ignored: number
    actions: string[]
}

const STATUS_MAP: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
    sent: 'SENT',
    delivered: 'DELIVERED',
    read: 'READ',
    failed: 'FAILED'
}

export class WhatsAppInboundService {
    private orders = new OrdersService()

    /**
     * Finds which tenant owns the number Meta delivered this event to.
     *
     * Deliberately unscoped — it is the tenant resolution itself, the webhook's
     * equivalent of the Host header. A number belongs to exactly one tenant
     * (`@@unique([tenantId, provider])` plus the phone number id inside), and an
     * inactive integration resolves to nothing.
     */
    async resolveTenantByPhoneNumberId(phoneNumberId: string) {
        if (!phoneNumberId) return null

        const integration = await prisma.tenantIntegration.findFirst({
            where: {
                provider: WHATSAPP_PROVIDER,
                isActive: true,
                config: { path: ['phoneNumberId'], equals: phoneNumberId }
            },
            select: { tenantId: true, config: true }
        })
        if (!integration) return null

        const config = parseWhatsAppConfig(integration.config)
        if (!config) return null

        return { tenantId: integration.tenantId, config }
    }

    async handleWebhook(payload: WebhookPayload): Promise<InboundOutcome> {
        const outcome: InboundOutcome = { handled: 0, ignored: 0, actions: [] }

        for (const entry of payload?.entry ?? []) {
            for (const change of entry.changes ?? []) {
                const value = change.value
                if (!value) {
                    outcome.ignored += 1
                    continue
                }

                const phoneNumberId = String(value.metadata?.phone_number_id ?? '').trim()
                const resolved = phoneNumberId ? await this.resolveTenantByPhoneNumberId(phoneNumberId) : null

                if (change.field === 'message_template_status_update') {
                    // Template reviews arrive on the WABA id, not on a number.
                    const tenantId = resolved?.tenantId ?? (await this.resolveTenantByWabaId(entry.id))
                    if (!tenantId) {
                        outcome.ignored += 1
                        continue
                    }
                    await this.applyTemplateStatus(tenantId, value)
                    outcome.handled += 1
                    outcome.actions.push(`template:${value.message_template_name}:${value.event}`)
                    continue
                }

                if (!resolved) {
                    // A number we do not know, or an integration switched off.
                    outcome.ignored += 1
                    continue
                }

                for (const status of value.statuses ?? []) {
                    const handled = await this.applyStatus(resolved.tenantId, status)
                    if (handled) {
                        outcome.handled += 1
                        outcome.actions.push(`status:${status.status}`)
                    } else {
                        outcome.ignored += 1
                    }
                }

                for (const message of value.messages ?? []) {
                    const action = await this.applyMessage(resolved.tenantId, message)
                    if (action) {
                        outcome.handled += 1
                        outcome.actions.push(action)
                    } else {
                        outcome.ignored += 1
                    }
                }
            }
        }

        return outcome
    }

    private async resolveTenantByWabaId(wabaId?: string): Promise<string | null> {
        const id = String(wabaId ?? '').trim()
        if (!id) return null

        const integration = await prisma.tenantIntegration.findFirst({
            where: {
                provider: WHATSAPP_PROVIDER,
                isActive: true,
                config: { path: ['wabaId'], equals: id }
            },
            select: { tenantId: true }
        })
        return integration?.tenantId ?? null
    }

    private async applyStatus(tenantId: string, status: WebhookStatus): Promise<boolean> {
        const wamid = String(status.id ?? '').trim()
        const mapped = STATUS_MAP[String(status.status ?? '').toLowerCase()]
        if (!wamid || !mapped) return false

        const error = status.errors?.[0]
        await whatsappService.recordStatusUpdate(tenantId, wamid, mapped, {
            code: error?.code === undefined ? null : String(error.code),
            message: error?.error_data?.details || error?.message || error?.title || null
        })
        return true
    }

    /**
     * Acts on a customer's reply. Only the two template buttons do anything: a
     * free-text answer is left for the seller to read, because guessing that
     * "ok" means yes is how an order gets confirmed against its customer's will.
     */
    private async applyMessage(tenantId: string, message: WebhookMessage): Promise<string | null> {
        const payload =
            message.type === 'button'
                ? String(message.button?.payload ?? '')
                : message.type === 'interactive' && message.interactive?.type === 'button_reply'
                  ? String(message.interactive.button_reply?.id ?? '')
                  : ''

        if (!payload) return null

        if (payload.startsWith(CONFIRM_PAYLOAD_PREFIX)) {
            return this.confirmFromButton(tenantId, payload.slice(CONFIRM_PAYLOAD_PREFIX.length))
        }

        if (payload.startsWith(CANCEL_PAYLOAD_PREFIX)) {
            return this.cancelFromButton(tenantId, payload.slice(CANCEL_PAYLOAD_PREFIX.length))
        }

        return null
    }

    private async confirmFromButton(tenantId: string, token: string): Promise<string | null> {
        if (!(await this.tokenBelongsToTenant(tenantId, token))) return null

        try {
            const order = await this.orders.confirmOrderFromCustomer(token, { via: 'whatsapp' })
            return `confirm:${order.id}`
        } catch (error: any) {
            // A spent token is the normal shape of a second tap, or of the
            // customer having already used the link. Nothing to repair.
            if (error?.message === 'INVALID_TOKEN') return null
            console.error('[WhatsAppInbound] Confirmation from button failed:', error?.statusMessage || error?.message)
            return null
        }
    }

    private async cancelFromButton(tenantId: string, token: string): Promise<string | null> {
        if (!(await this.tokenBelongsToTenant(tenantId, token))) return null

        try {
            const { order, carrier } = await this.orders.cancelOrderFromCustomer(token)
            return `cancel:${order?.id ?? ''}:${carrier.ok ? 'carrier-ok' : 'carrier-manual'}`
        } catch (error: any) {
            if (error?.message === 'INVALID_TOKEN') return null
            console.error('[WhatsAppInbound] Cancellation from button failed:', error?.statusMessage || error?.message)
            return null
        }
    }

    /**
     * The token is unguessable, but it is still a value arriving from outside:
     * this refuses one that belongs to another tenant's order rather than
     * letting a payload cross the tenant boundary.
     */
    private async tokenBelongsToTenant(tenantId: string, token: string): Promise<boolean> {
        const trimmed = token.trim()
        if (!trimmed) return false

        const order = await prisma.order.findFirst({
            where: { tenantId, confirmationToken: trimmed },
            select: { id: true }
        })
        return Boolean(order)
    }

    private async applyTemplateStatus(tenantId: string, value: WebhookChangeValue) {
        const language = String(value.message_template_language ?? '').trim()
        if (!isWhatsAppLanguage(language)) return

        await whatsappTemplatesService
            .applyTemplateStatusUpdate(tenantId, {
                templateName: String(value.message_template_name ?? '').trim(),
                language,
                status: String(value.event ?? '').trim(),
                reason: value.reason ?? null
            })
            .catch((error) => {
                console.error('[WhatsAppInbound] Template status update failed:', error)
            })
    }
}

export const whatsappInboundService = new WhatsAppInboundService()
