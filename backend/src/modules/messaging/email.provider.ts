import { env, envAny, missing, type EmailMessage, type SendResult } from './messaging.types'

/**
 * Transactional email for the platform itself.
 *
 * HTTP APIs rather than SMTP on purpose: no new dependency, no long-lived
 * socket to keep alive inside a request handler, and no port 587 to get past a
 * host that blocks it. `EMAIL_PROVIDER` picks one explicitly; leaving it unset
 * auto-detects from whichever API key is present, so a deployment configures
 * exactly one variable.
 *
 * The `log` provider is the fallback in development: it prints the message and
 * reports success, which is what makes the whole signup flow runnable on a
 * laptop with no mail account. It refuses to count as configured in
 * production — a live deployment silently dropping password resets into stdout
 * is worse than telling the user email is unavailable.
 */

export type EmailProviderName = 'resend' | 'brevo' | 'mailgun' | 'log'

const DEFAULT_FROM_NAME = 'Swekly'

const KNOWN_PROVIDERS: EmailProviderName[] = ['resend', 'brevo', 'mailgun', 'log']

/** Which provider this deployment sends through, explicit setting first. */
const resolveEmailProvider = (): EmailProviderName => {
    const explicit = env('EMAIL_PROVIDER').toLowerCase()
    if ((KNOWN_PROVIDERS as string[]).includes(explicit)) return explicit as EmailProviderName

    if (env('RESEND_API_KEY')) return 'resend'
    if (env('BREVO_API_KEY')) return 'brevo'
    if (env('MAILGUN_API_KEY')) return 'mailgun'

    return 'log'
}

const fromAddress = () => envAny('EMAIL_FROM', 'MAIL_FROM')

const fromName = () => envAny('EMAIL_FROM_NAME', 'MAIL_FROM_NAME') || DEFAULT_FROM_NAME

/** `Name <address>`, the one form every provider below accepts. */
const fromHeader = () => `${fromName()} <${fromAddress()}>`

export const isEmailConfigured = (): boolean => {
    const provider = resolveEmailProvider()

    if (provider === 'log') return process.env.NODE_ENV !== 'production'
    if (!fromAddress()) return false

    if (provider === 'resend') return Boolean(env('RESEND_API_KEY'))
    if (provider === 'brevo') return Boolean(env('BREVO_API_KEY'))
    if (provider === 'mailgun') return Boolean(env('MAILGUN_API_KEY') && env('MAILGUN_DOMAIN'))

    return false
}

/** Turns any transport failure into a `SendResult`; nothing here throws. */
const post = async (input: {
    provider: EmailProviderName
    url: string
    headers: Record<string, string>
    body: unknown
    /** Reads the provider's id out of its own response shape. */
    readId?: (json: any) => string | null
}): Promise<SendResult> => {
    let res: Response

    try {
        res = await fetch(input.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...input.headers },
            body: JSON.stringify(input.body)
        })
    } catch {
        return {
            success: false,
            provider: input.provider,
            error: 'Email provider unreachable',
            retryable: true
        }
    }

    const text = await res.text().catch(() => '')
    let json: any = null
    if (text) {
        try {
            json = JSON.parse(text)
        } catch {
            json = null
        }
    }

    if (!res.ok) {
        const message =
            json?.message ||
            json?.error?.message ||
            json?.errors?.[0]?.message ||
            `Email provider returned HTTP ${res.status}`

        return {
            success: false,
            provider: input.provider,
            error: String(message),
            // 429 and 5xx are worth another attempt; a rejected key or a
            // sender that is not verified will fail identically forever.
            retryable: res.status === 429 || res.status >= 500
        }
    }

    return {
        success: true,
        provider: input.provider,
        messageId: input.readId ? input.readId(json) : null
    }
}

export const sendEmail = async (message: EmailMessage): Promise<SendResult> => {
    const provider = resolveEmailProvider()

    if (provider === 'log') {
        if (process.env.NODE_ENV === 'production') {
            return missing('log', 'Email is not configured on this deployment')
        }

        // Deliberately the full body: the point is that a developer can read the
        // code out of the terminal and finish the flow.
        console.info(
            `[email:log] to=${message.to} subject=${message.subject}\n${message.text}`
        )
        return { success: true, provider: 'log', messageId: null }
    }

    if (!isEmailConfigured()) {
        return missing(provider, 'Email is not configured on this deployment')
    }

    if (provider === 'resend') {
        return post({
            provider,
            url: 'https://api.resend.com/emails',
            headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}` },
            body: {
                from: fromHeader(),
                to: [message.to],
                subject: message.subject,
                html: message.html,
                text: message.text
            },
            readId: (json) => (typeof json?.id === 'string' ? json.id : null)
        })
    }

    if (provider === 'brevo') {
        return post({
            provider,
            url: 'https://api.brevo.com/v3/smtp/email',
            headers: { 'api-key': env('BREVO_API_KEY') },
            body: {
                sender: { email: fromAddress(), name: fromName() },
                to: [{ email: message.to }],
                subject: message.subject,
                htmlContent: message.html,
                textContent: message.text
            },
            readId: (json) => (typeof json?.messageId === 'string' ? json.messageId : null)
        })
    }

    // Mailgun is the odd one out: form-encoded, and the key goes in Basic auth.
    const domain = env('MAILGUN_DOMAIN')
    const region = env('MAILGUN_REGION').toLowerCase() === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net'
    const form = new URLSearchParams({
        from: fromHeader(),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text
    })

    let res: Response
    try {
        res = await fetch(`https://${region}/v3/${encodeURIComponent(domain)}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`api:${env('MAILGUN_API_KEY')}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: form.toString()
        })
    } catch {
        return { success: false, provider, error: 'Email provider unreachable', retryable: true }
    }

    if (!res.ok) {
        return {
            success: false,
            provider,
            error: `Email provider returned HTTP ${res.status}`,
            retryable: res.status === 429 || res.status >= 500
        }
    }

    const json = (await res.json().catch(() => null)) as { id?: string } | null
    return { success: true, provider, messageId: json?.id ?? null }
}
