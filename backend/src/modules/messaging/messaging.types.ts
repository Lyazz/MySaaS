/**
 * Platform-level outbound messaging.
 *
 * Distinct from `modules/whatsapp`, which sends order messages through each
 * tenant's own WhatsApp number. Everything here goes out as Swekly itself —
 * signup codes, password resets — so the credentials are the platform's, read
 * once from the environment, and no call is ever tenant-scoped.
 *
 * Every provider is optional. A deployment with no mail credentials still
 * boots; `isConfigured` simply reports false and the UI stops offering that
 * channel, rather than the API failing at send time on a screen the user
 * cannot recover from.
 */

export type MessageChannel = 'EMAIL' | 'SMS' | 'WHATSAPP'

export type MessageLocale = 'fr' | 'ar' | 'en'

export const MESSAGE_CHANNELS: MessageChannel[] = ['EMAIL', 'SMS', 'WHATSAPP']

export const normalizeLocale = (value: unknown): MessageLocale => {
    const raw = typeof value === 'string' ? value.trim().toLowerCase().slice(0, 2) : ''
    if (raw === 'ar') return 'ar'
    if (raw === 'en') return 'en'
    return 'fr'
}

/**
 * A send never throws at the caller.
 *
 * A dead SMTP key must not turn "here is your code" into a 500 that also tells
 * an attacker the address exists. Callers branch on `success`, log `error`, and
 * decide for themselves what the user is told.
 */
export type SendResult = {
    success: boolean
    /** Provider that handled it, e.g. `resend`, `twilio`, `log`. */
    provider: string
    /** Provider-side id, when it gave one. Useful in support tickets. */
    messageId?: string | null
    error?: string | null
    /** True when another attempt could plausibly succeed (5xx, rate limit). */
    retryable?: boolean
}

export type EmailMessage = {
    to: string
    subject: string
    html: string
    text: string
}

export type TextMessage = {
    /** Normalized MSISDN, digits only, country code included (213XXXXXXXXX). */
    to: string
    body: string
}

export const missing = (provider: string, reason: string): SendResult => ({
    success: false,
    provider,
    error: reason,
    retryable: false
})

const asTrimmed = (value: string | undefined): string => (value ?? '').trim()

/** Reads an env var, treating whitespace-only as absent. */
export const env = (name: string): string => asTrimmed(process.env[name])

/** Reads the first env var that has a value, so old names can be kept alive. */
export const envAny = (...names: string[]): string => {
    for (const name of names) {
        const value = env(name)
        if (value) return value
    }
    return ''
}
