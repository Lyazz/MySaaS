/**
 * Shapes for the WhatsApp Cloud API integration.
 *
 * The per-tenant credentials live in `TenantIntegration` under provider
 * `WHATSAPP` (same table Telegram uses), so connecting a WABA adds no schema of
 * its own. Everything a send needs — token, phone number id, which templates
 * Meta has approved — is in that JSON blob, and `parseWhatsAppConfig` is the
 * only door into it: an incomplete blob resolves to `null` and every caller
 * treats that as "not configured", never as an error.
 */

export type WhatsAppTemplateKind = 'CONFIRMATION' | 'REMINDER'

export type WhatsAppLanguage = 'fr' | 'ar' | 'en'

export const WHATSAPP_PROVIDER = 'WHATSAPP'

/** Meta's review state for one template in one language. */
export type WhatsAppTemplateLanguageState = {
    /** APPROVED | PENDING | REJECTED | PAUSED | DISABLED — Meta's own vocabulary. */
    status: string
    /** Meta's rejection reason, when it gave one. */
    reason?: string | null
    /** Meta's template id, kept so a later edit/delete does not need a lookup. */
    metaId?: string | null
    syncedAt?: string
}

export type WhatsAppTemplateState = {
    name: string
    languages: Partial<Record<WhatsAppLanguage, WhatsAppTemplateLanguageState>>
}

export type WhatsAppConfig = {
    /** WhatsApp Business Account id that owns the templates. */
    wabaId: string
    /** The sending number's id. Also how an incoming webhook finds this tenant. */
    phoneNumberId: string
    displayPhoneNumber?: string | null
    verifiedName?: string | null
    /** Long-lived system user token obtained through Embedded Signup. */
    accessToken: string
    /**
     * Origin baked into the template's URL button when it was created. A template's
     * button URL is frozen at approval time, so moving the store to a custom domain
     * means recreating the templates — this records what they currently point at.
     */
    confirmOrigin?: string | null
    templates?: Partial<Record<WhatsAppTemplateKind, WhatsAppTemplateState>>
    /** Send the confirmation automatically when an order comes in. */
    autoSendEnabled?: boolean
    /** Chase unanswered orders (6h, then 24h). */
    remindersEnabled?: boolean
}

const asTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const parseTemplateState = (raw: unknown): WhatsAppTemplateState | null => {
    if (!raw || typeof raw !== 'object') return null
    const source = raw as Record<string, unknown>
    const name = asTrimmedString(source.name)
    if (!name) return null

    const languages: WhatsAppTemplateState['languages'] = {}
    const rawLanguages = source.languages
    if (rawLanguages && typeof rawLanguages === 'object') {
        for (const [code, value] of Object.entries(rawLanguages as Record<string, unknown>)) {
            if (!isWhatsAppLanguage(code) || !value || typeof value !== 'object') continue
            const entry = value as Record<string, unknown>
            const status = asTrimmedString(entry.status).toUpperCase()
            if (!status) continue
            languages[code] = {
                status,
                reason: asTrimmedString(entry.reason) || null,
                metaId: asTrimmedString(entry.metaId) || null,
                syncedAt: asTrimmedString(entry.syncedAt) || undefined
            }
        }
    }

    return { name, languages }
}

export const isWhatsAppLanguage = (value: unknown): value is WhatsAppLanguage =>
    value === 'fr' || value === 'ar' || value === 'en'

export const isWhatsAppTemplateKind = (value: unknown): value is WhatsAppTemplateKind =>
    value === 'CONFIRMATION' || value === 'REMINDER'

/**
 * Reads a `TenantIntegration.config` blob. Returns `null` when the three fields
 * a send cannot happen without are missing, so a half-finished connection never
 * reaches the Cloud API.
 */
export const parseWhatsAppConfig = (raw: unknown): WhatsAppConfig | null => {
    if (!raw || typeof raw !== 'object') return null
    const source = raw as Record<string, unknown>

    const wabaId = asTrimmedString(source.wabaId)
    const phoneNumberId = asTrimmedString(source.phoneNumberId)
    const accessToken = asTrimmedString(source.accessToken)
    if (!wabaId || !phoneNumberId || !accessToken) return null

    const templates: WhatsAppConfig['templates'] = {}
    const rawTemplates = source.templates
    if (rawTemplates && typeof rawTemplates === 'object') {
        for (const [kind, value] of Object.entries(rawTemplates as Record<string, unknown>)) {
            if (!isWhatsAppTemplateKind(kind)) continue
            const state = parseTemplateState(value)
            if (state) templates[kind] = state
        }
    }

    return {
        wabaId,
        phoneNumberId,
        displayPhoneNumber: asTrimmedString(source.displayPhoneNumber) || null,
        verifiedName: asTrimmedString(source.verifiedName) || null,
        accessToken,
        confirmOrigin: asTrimmedString(source.confirmOrigin) || null,
        templates,
        // Both default to on: a tenant that went through the trouble of connecting
        // a WABA wants the messages, and each toggle is a single click to undo.
        autoSendEnabled: source.autoSendEnabled !== false,
        remindersEnabled: source.remindersEnabled !== false
    }
}

/** Why a send did not produce a message. Surfaced in the admin, never thrown. */
export type WhatsAppSkipReason =
    | 'NOT_CONFIGURED'
    | 'DISABLED'
    | 'NO_APPROVED_TEMPLATE'
    | 'INVALID_PHONE'
    | 'ORDER_NOT_FOUND'
    | 'ORDER_NOT_PENDING'
    | 'ALREADY_SENT'

export type WhatsAppSendResult =
    | { ok: true; messageId: string; wamid: string; language: WhatsAppLanguage }
    | { ok: false; skipped: WhatsAppSkipReason }
    | { ok: false; failed: true; messageId?: string; errorCode: string | null; errorMessage: string; retryable: boolean }
