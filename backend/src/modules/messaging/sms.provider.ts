import { env, missing, type SendResult, type TextMessage } from './messaging.types'

/**
 * Transactional SMS for signup and password-reset codes.
 *
 * Algeria has no single obvious gateway — some deployments will route through
 * Twilio or Brevo, others through a local aggregator that only exposes a plain
 * HTTP endpoint. Hence `webhook`: point `SMS_WEBHOOK_URL` at anything that
 * accepts `{ to, message }` and the channel works without a provider written
 * for it here.
 *
 * `log` behaves exactly as it does for email: a working flow in development,
 * and an honest "not configured" in production.
 */

export type SmsProviderName = 'twilio' | 'brevo' | 'webhook' | 'log'

const KNOWN_PROVIDERS: SmsProviderName[] = ['twilio', 'brevo', 'webhook', 'log']

const DEFAULT_SENDER = 'Swekly'

const resolveSmsProvider = (): SmsProviderName => {
    const explicit = env('SMS_PROVIDER').toLowerCase()
    if ((KNOWN_PROVIDERS as string[]).includes(explicit)) return explicit as SmsProviderName

    if (env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN')) return 'twilio'
    if (env('BREVO_API_KEY') && env('SMS_SENDER_ID')) return 'brevo'
    if (env('SMS_WEBHOOK_URL')) return 'webhook'

    return 'log'
}

const senderId = () => env('SMS_SENDER_ID') || DEFAULT_SENDER

export const isSmsConfigured = (): boolean => {
    const provider = resolveSmsProvider()

    if (provider === 'log') return process.env.NODE_ENV !== 'production'
    if (provider === 'twilio') {
        return Boolean(
            env('TWILIO_ACCOUNT_SID') &&
                env('TWILIO_AUTH_TOKEN') &&
                (env('TWILIO_FROM_NUMBER') || env('TWILIO_MESSAGING_SERVICE_SID'))
        )
    }
    if (provider === 'brevo') return Boolean(env('BREVO_API_KEY'))
    if (provider === 'webhook') return Boolean(env('SMS_WEBHOOK_URL'))

    return false
}

const failure = (provider: SmsProviderName, status: number, message: string): SendResult => ({
    success: false,
    provider,
    error: message,
    retryable: status === 429 || status >= 500
})

export const sendSms = async (message: TextMessage): Promise<SendResult> => {
    const provider = resolveSmsProvider()

    if (provider === 'log') {
        if (process.env.NODE_ENV === 'production') {
            return missing('log', 'SMS is not configured on this deployment')
        }

        console.info(`[sms:log] to=+${message.to}\n${message.body}`)
        return { success: true, provider: 'log', messageId: null }
    }

    if (!isSmsConfigured()) {
        return missing(provider, 'SMS is not configured on this deployment')
    }

    if (provider === 'twilio') {
        const sid = env('TWILIO_ACCOUNT_SID')
        const form = new URLSearchParams({ To: `+${message.to}`, Body: message.body })

        // A messaging service picks the sender itself; a bare number does not.
        const service = env('TWILIO_MESSAGING_SERVICE_SID')
        if (service) form.set('MessagingServiceSid', service)
        else form.set('From', env('TWILIO_FROM_NUMBER'))

        let res: Response
        try {
            res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${Buffer.from(`${sid}:${env('TWILIO_AUTH_TOKEN')}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: form.toString()
            })
        } catch {
            return { success: false, provider, error: 'SMS provider unreachable', retryable: true }
        }

        const json = (await res.json().catch(() => null)) as { sid?: string; message?: string } | null
        if (!res.ok) {
            return failure(provider, res.status, json?.message || `SMS provider returned HTTP ${res.status}`)
        }

        return { success: true, provider, messageId: json?.sid ?? null }
    }

    if (provider === 'brevo') {
        let res: Response
        try {
            res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'api-key': env('BREVO_API_KEY') },
                body: JSON.stringify({
                    type: 'transactional',
                    sender: senderId(),
                    recipient: message.to,
                    content: message.body
                })
            })
        } catch {
            return { success: false, provider, error: 'SMS provider unreachable', retryable: true }
        }

        const json = (await res.json().catch(() => null)) as { messageId?: string | number; message?: string } | null
        if (!res.ok) {
            return failure(provider, res.status, json?.message || `SMS provider returned HTTP ${res.status}`)
        }

        return { success: true, provider, messageId: json?.messageId ? String(json.messageId) : null }
    }

    // Generic gateway. Headers are free-form so an aggregator that wants an
    // `X-Api-Key` needs no code change: SMS_WEBHOOK_HEADERS is a JSON object.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const rawHeaders = env('SMS_WEBHOOK_HEADERS')
    if (rawHeaders) {
        try {
            const parsed = JSON.parse(rawHeaders)
            if (parsed && typeof parsed === 'object') {
                for (const [key, value] of Object.entries(parsed)) {
                    if (typeof value === 'string') headers[key] = value
                }
            }
        } catch {
            console.warn('[sms:webhook] SMS_WEBHOOK_HEADERS is not valid JSON; ignoring it')
        }
    }

    let res: Response
    try {
        res = await fetch(env('SMS_WEBHOOK_URL'), {
            method: 'POST',
            headers,
            body: JSON.stringify({ to: message.to, sender: senderId(), message: message.body })
        })
    } catch {
        return { success: false, provider, error: 'SMS provider unreachable', retryable: true }
    }

    if (!res.ok) {
        return failure(provider, res.status, `SMS gateway returned HTTP ${res.status}`)
    }

    return { success: true, provider, messageId: null }
}
