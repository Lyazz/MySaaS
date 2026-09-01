import { Prisma } from '@prisma/client'
import { DZ_WILAYAS } from '../../../../shared/geo/dz'
import prisma from '../../lib/prisma'
import { IntegrationsService } from '../integrations/integrations.service'
import { PhoneNormalizationService } from '../loyalty/phone-normalization.service'
import { ensureOrderConfirmationToken } from '../orders/order-confirmation-token'
import { WhatsAppApiError, WhatsAppCloudClient } from './whatsapp-cloud.client'
import {
    CANCEL_PAYLOAD_PREFIX,
    CONFIRM_PAYLOAD_PREFIX,
    sanitizeTemplateParam
} from './whatsapp-templates'
import { whatsappTemplatesService } from './whatsapp-templates.service'
import {
    WHATSAPP_PROVIDER,
    isWhatsAppLanguage,
    parseWhatsAppConfig,
    type WhatsAppConfig,
    type WhatsAppLanguage,
    type WhatsAppSendResult,
    type WhatsAppTemplateKind
} from './whatsapp.types'

/**
 * How long a transient failure (rate limit, Meta 5xx) blocks a retry of the same
 * message. Short enough that the reminder job's next tick picks it back up, long
 * enough that a burst of clicks does not hammer the API.
 */
const RETRY_FAILED_AFTER_MS = 10 * 60 * 1000

const WILAYA_NAMES = new Map(DZ_WILAYAS.map((wilaya) => [wilaya.code, wilaya.name]))

const formatAmount = (value: unknown, currencyCode: string): string => {
    const amount = typeof value === 'number' ? value : Number(value ?? 0)
    const safe = Number.isFinite(amount) ? amount : 0
    const rounded = Math.round(safe * 100) / 100
    const body = Number.isInteger(rounded)
        ? String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
        : rounded.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${body} ${currencyCode}`
}

/**
 * Sends order messages through the tenant's own WhatsApp Cloud API number.
 *
 * Every path here is best-effort by design: a tenant with no WABA, a template
 * still under review, a number that is not on WhatsApp — none of it may break
 * order creation or the seller's existing wa.me button, so failures come back as
 * a result object and are logged in `WhatsAppMessage`, never thrown at callers.
 */
export class WhatsAppService {
    private integrations = new IntegrationsService()
    private phones = new PhoneNormalizationService()

    async getConfig(tenantId: string): Promise<WhatsAppConfig | null> {
        const integration = await this.integrations.getIntegration(tenantId, WHATSAPP_PROVIDER)
        if (!integration || !integration.isActive) return null
        return parseWhatsAppConfig(integration.config)
    }

    /** True when this tenant can send right now: connected, active, template approved. */
    async isEnabled(tenantId: string, kind: WhatsAppTemplateKind = 'CONFIRMATION'): Promise<boolean> {
        const config = await this.getConfig(tenantId)
        if (!config) return false
        const language = await this.resolveLanguage(tenantId)
        return Boolean(whatsappTemplatesService.resolveTemplate(config, kind, language))
    }

    /**
     * First message for an order.
     *
     * Automatic sends always take slot 0, so a retried order-creation hook can
     * never send twice. A seller pressing "send" again is a different intent —
     * they want another copy — so a manual send takes the next free slot and
     * skips the cooldown a failed automatic send would otherwise sit behind.
     */
    async sendOrderConfirmation(
        tenantId: string,
        orderId: string,
        opts?: { manual?: boolean }
    ): Promise<WhatsAppSendResult> {
        const manual = Boolean(opts?.manual)
        const attempt = manual ? await this.nextConfirmationAttempt(tenantId, orderId) : 0
        return this.dispatch(tenantId, orderId, 'CONFIRMATION', attempt, { manual })
    }

    /**
     * What the admin needs to decide how the WhatsApp button behaves, and what
     * the integrations screen shows. Never includes the access token.
     */
    async getAdminStatus(tenantId: string) {
        const integration = await this.integrations.getIntegration(tenantId, WHATSAPP_PROVIDER)
        const config = parseWhatsAppConfig(integration?.config)
        const language = await this.resolveLanguage(tenantId)

        if (!integration || !config) {
            return {
                connected: false,
                active: false,
                canSend: false,
                canRemind: false,
                autoSendEnabled: false,
                remindersEnabled: false,
                displayPhoneNumber: null,
                verifiedName: null,
                templates: {},
                language
            }
        }

        const confirmation = whatsappTemplatesService.resolveTemplate(config, 'CONFIRMATION', language)
        const reminder = whatsappTemplatesService.resolveTemplate(config, 'REMINDER', language)

        return {
            connected: true,
            active: integration.isActive,
            canSend: integration.isActive && Boolean(confirmation),
            canRemind: integration.isActive && Boolean(reminder) && Boolean(config.remindersEnabled),
            autoSendEnabled: Boolean(config.autoSendEnabled),
            remindersEnabled: Boolean(config.remindersEnabled),
            displayPhoneNumber: config.displayPhoneNumber ?? null,
            verifiedName: config.verifiedName ?? null,
            templates: config.templates ?? {},
            language
        }
    }

    /** Nth reminder for an unanswered order. Driven by the reminder job. */
    async sendOrderReminder(tenantId: string, orderId: string, attempt: number): Promise<WhatsAppSendResult> {
        return this.dispatch(tenantId, orderId, 'REMINDER', Math.max(1, Math.trunc(attempt)))
    }

    /** Delivery receipts from the webhook. Keyed on Meta's message id. */
    async recordStatusUpdate(
        tenantId: string,
        wamid: string,
        status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
        error?: { code?: string | null; message?: string | null }
    ) {
        const data: Prisma.WhatsAppMessageUpdateManyMutationInput = { status }
        if (status === 'DELIVERED') data.deliveredAt = new Date()
        if (status === 'READ') data.readAt = new Date()
        if (status === 'FAILED') {
            data.errorCode = error?.code ?? null
            data.errorMessage = error?.message ?? 'Delivery failed'
        }

        await prisma.whatsAppMessage.updateMany({
            where: { tenantId, wamid },
            data
        })
    }

    async listOrderMessages(tenantId: string, orderId: string) {
        return prisma.whatsAppMessage.findMany({
            where: { tenantId, orderId },
            orderBy: { createdAt: 'asc' }
        })
    }

    /** The slot a manual resend should take: the failed one, or a fresh one. */
    private async nextConfirmationAttempt(tenantId: string, orderId: string): Promise<number> {
        const last = await prisma.whatsAppMessage.findFirst({
            where: { tenantId, orderId, kind: 'CONFIRMATION' },
            orderBy: { attempt: 'desc' },
            select: { attempt: true, status: true }
        })
        if (!last) return 0
        return last.status === 'FAILED' ? last.attempt : last.attempt + 1
    }

    private async dispatch(
        tenantId: string,
        orderId: string,
        kind: WhatsAppTemplateKind,
        attempt: number,
        opts?: { manual?: boolean }
    ): Promise<WhatsAppSendResult> {
        const integration = await this.integrations.getIntegration(tenantId, WHATSAPP_PROVIDER)
        const config = integration?.isActive ? parseWhatsAppConfig(integration.config) : null
        if (!config) return { ok: false, skipped: 'NOT_CONFIGURED' }

        // The auto-send toggle is the caller's business — the seller's manual
        // "send" button must keep working with automatic sending switched off.
        if (kind === 'REMINDER' && !config.remindersEnabled) {
            return { ok: false, skipped: 'DISABLED' }
        }

        const order = await prisma.order.findFirst({
            where: { tenantId, id: orderId },
            include: {
                items: {
                    include: { product: { select: { title: true } } }
                }
            }
        })
        if (!order) return { ok: false, skipped: 'ORDER_NOT_FOUND' }

        // Nothing chases an order the customer or the seller already settled.
        if (order.status !== 'PENDING') return { ok: false, skipped: 'ORDER_NOT_PENDING' }

        const phone = this.phones.tryNormalizeAlgerianPhone(order.customerPhone)
        if (!phone) return { ok: false, skipped: 'INVALID_PHONE' }

        const settings = await prisma.storeSettings.findUnique({
            where: { tenantId },
            select: { language: true, currencyCode: true }
        })

        const language: WhatsAppLanguage = isWhatsAppLanguage(settings?.language) ? settings.language : 'fr'
        const template = whatsappTemplatesService.resolveTemplate(config, kind, language)
        if (!template) return { ok: false, skipped: 'NO_APPROVED_TEMPLATE' }

        const token = await ensureOrderConfirmationToken(tenantId, orderId)

        const slot = await this.claimSlot({
            tenantId,
            orderId,
            kind,
            attempt,
            toPhone: phone.normalized,
            templateName: template.name,
            languageCode: template.language,
            manual: Boolean(opts?.manual)
        })
        if (!slot) return { ok: false, skipped: 'ALREADY_SENT' }

        const bodyParams = this.buildBodyParams(order, settings?.currencyCode ?? 'DZD')
        const client = new WhatsAppCloudClient(config.accessToken)

        try {
            const { wamid } = await client.sendTemplate(config.phoneNumberId, {
                to: phone.normalized,
                templateName: template.name,
                languageCode: template.language,
                bodyParams,
                quickReplyPayloads: [`${CONFIRM_PAYLOAD_PREFIX}${token}`, `${CANCEL_PAYLOAD_PREFIX}${token}`],
                urlSuffix: token
            })

            const sentAt = new Date()
            await prisma.$transaction([
                prisma.whatsAppMessage.update({
                    where: { id: slot.id },
                    data: { wamid, status: 'SENT', sentAt, errorCode: null, errorMessage: null }
                }),
                prisma.order.update({
                    where: { id: orderId },
                    data: {
                        whatsappLastMessageAt: sentAt,
                        ...(kind === 'CONFIRMATION'
                            ? { whatsappConfirmSentAt: sentAt }
                            : { whatsappRemindersSent: attempt })
                    }
                })
            ])

            return { ok: true, messageId: slot.id, wamid, language: template.language }
        } catch (error) {
            const apiError = error instanceof WhatsAppApiError ? error : null
            const message = error instanceof Error ? error.message : 'WhatsApp send failed'
            const retryable = apiError?.retryable ?? false

            await prisma.whatsAppMessage.update({
                where: { id: slot.id },
                data: {
                    status: 'FAILED',
                    errorCode: apiError?.code ?? null,
                    errorMessage: message
                }
            })

            // A permanent failure still consumes the attempt: retrying a wrong
            // number or a rejected template only burns the tenant's quota.
            if (!retryable && kind === 'REMINDER') {
                await prisma.order.update({
                    where: { id: orderId },
                    data: { whatsappRemindersSent: attempt, whatsappLastMessageAt: new Date() }
                })
            }

            console.error(`[WhatsAppService] ${kind} send failed for order ${orderId}:`, message)
            return { ok: false, failed: true, messageId: slot.id, errorCode: apiError?.code ?? null, errorMessage: message, retryable }
        }
    }

    /**
     * Reserves the one row allowed for this (order, kind, attempt).
     *
     * The unique constraint is the whole point: a double-clicked button, or two
     * job ticks overlapping, hits P2002 instead of billing a second conversation.
     * A row left FAILED by a transient error is handed back after a cooldown so
     * the retry reuses it rather than being locked out forever.
     */
    private async claimSlot(input: {
        tenantId: string
        orderId: string
        kind: WhatsAppTemplateKind
        attempt: number
        toPhone: string
        templateName: string
        languageCode: string
        /** A seller waiting on the button does not wait out the retry cooldown. */
        manual?: boolean
    }): Promise<{ id: string } | null> {
        try {
            return await prisma.whatsAppMessage.create({
                data: {
                    tenantId: input.tenantId,
                    orderId: input.orderId,
                    kind: input.kind,
                    attempt: input.attempt,
                    toPhone: input.toPhone,
                    templateName: input.templateName,
                    languageCode: input.languageCode,
                    status: 'QUEUED'
                },
                select: { id: true }
            })
        } catch (error) {
            if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
                throw error
            }
        }

        const existing = await prisma.whatsAppMessage.findFirst({
            where: {
                tenantId: input.tenantId,
                orderId: input.orderId,
                kind: input.kind,
                attempt: input.attempt
            },
            select: { id: true, status: true, updatedAt: true }
        })

        if (!existing) return null
        if (existing.status !== 'FAILED') return null
        if (!input.manual && Date.now() - existing.updatedAt.getTime() < RETRY_FAILED_AFTER_MS) return null

        return prisma.whatsAppMessage.update({
            where: { id: existing.id },
            data: {
                status: 'QUEUED',
                templateName: input.templateName,
                languageCode: input.languageCode,
                toPhone: input.toPhone,
                errorCode: null,
                errorMessage: null
            },
            select: { id: true }
        })
    }

    /** The five body variables, in the order the approved templates expect. */
    private buildBodyParams(order: any, currencyCode: string): string[] {
        const reference =
            typeof order.publicId === 'string' && order.publicId.trim().length > 0
                ? order.publicId.trim()
                : String(order.id).slice(0, 8)

        const recap = (order.items ?? [])
            .map((item: any) => {
                const title = item.product?.title || 'Article'
                return `${item.quantity}x ${title} (${formatAmount(item.price, currencyCode)})`
            })
            .join(' • ')

        const total = formatAmount(order.totalWithShippingAmount ?? order.totalAmount, currencyCode)

        const communeRaw = String(order.shippingCommuneCode ?? '').trim()
        const address = [
            order.customerAddress || order.shippingAddressLine1 || '',
            // A numeric commune is a carrier id, meaningless to the shopper.
            /^\d+$/.test(communeRaw) ? '' : communeRaw,
            WILAYA_NAMES.get(String(order.shippingWilayaCode ?? '').trim()) ?? ''
        ]
            .filter(Boolean)
            .join(', ')

        return [
            sanitizeTemplateParam(order.customerName || 'Client', 60),
            sanitizeTemplateParam(reference, 40),
            sanitizeTemplateParam(recap || '-', 700),
            sanitizeTemplateParam(total, 40),
            sanitizeTemplateParam(address || '-', 200)
        ]
    }

    private async resolveLanguage(tenantId: string): Promise<WhatsAppLanguage> {
        const settings = await prisma.storeSettings.findUnique({
            where: { tenantId },
            select: { language: true }
        })
        return isWhatsAppLanguage(settings?.language) ? settings.language : 'fr'
    }
}

export const whatsappService = new WhatsAppService()
