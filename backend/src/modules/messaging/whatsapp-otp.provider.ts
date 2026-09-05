import { WhatsAppApiError, WhatsAppCloudClient } from '../whatsapp/whatsapp-cloud.client'
import { env, missing, type MessageLocale, type SendResult } from './messaging.types'

/**
 * One-time codes over Swekly's *own* WhatsApp number.
 *
 * Not the tenant's. `modules/whatsapp` sends order messages from whichever WABA
 * the seller connected through Embedded Signup; a signup code has no tenant yet
 * and a password reset must not be delivered by the shop the user is trying to
 * get back into. So this reads platform credentials from the environment and
 * shares nothing but the Graph client with that module.
 *
 * Meta only allows a code in an AUTHENTICATION-category template, which must be
 * created and approved once per language on the platform WABA. The template
 * name is configurable because that approval is a manual, per-deployment step.
 */

const DEFAULT_TEMPLATE_NAME = 'swekly_verification_code'

/** Meta wants the exact language code the template was approved under. */
const LANGUAGE_CODES: Record<MessageLocale, string> = {
    fr: 'fr',
    ar: 'ar',
    en: 'en_US'
}

export const isWhatsAppOtpConfigured = (): boolean =>
    Boolean(env('PLATFORM_WHATSAPP_ACCESS_TOKEN') && env('PLATFORM_WHATSAPP_PHONE_NUMBER_ID'))

const templateName = () => env('PLATFORM_WHATSAPP_OTP_TEMPLATE') || DEFAULT_TEMPLATE_NAME

/**
 * Language the approved template exists in.
 *
 * `PLATFORM_WHATSAPP_OTP_LANGUAGES` lists what was actually approved, because a
 * send in a language Meta never approved fails with an error the user reads as
 * "WhatsApp is broken". Anything outside the list falls back to the first entry.
 */
const languageCodeFor = (locale: MessageLocale): string => {
    const approved = env('PLATFORM_WHATSAPP_OTP_LANGUAGES')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)

    const wanted = LANGUAGE_CODES[locale]
    if (approved.length === 0) return wanted

    return approved.includes(wanted) ? wanted : approved[0]
}

export const sendWhatsAppOtp = async (input: {
    /** Normalized MSISDN, digits only (213XXXXXXXXX). */
    to: string
    code: string
    locale: MessageLocale
}): Promise<SendResult> => {
    if (!isWhatsAppOtpConfigured()) {
        return missing('whatsapp', 'WhatsApp is not configured on this deployment')
    }

    const client = new WhatsAppCloudClient(env('PLATFORM_WHATSAPP_ACCESS_TOKEN'))

    try {
        const { wamid } = await client.sendAuthenticationTemplate(env('PLATFORM_WHATSAPP_PHONE_NUMBER_ID'), {
            to: input.to,
            templateName: templateName(),
            languageCode: languageCodeFor(input.locale),
            code: input.code,
            withButton: env('PLATFORM_WHATSAPP_OTP_BUTTON').toLowerCase() !== 'false'
        })

        return { success: true, provider: 'whatsapp', messageId: wamid }
    } catch (error) {
        if (error instanceof WhatsAppApiError) {
            return {
                success: false,
                provider: 'whatsapp',
                error: error.message,
                retryable: error.retryable
            }
        }

        return {
            success: false,
            provider: 'whatsapp',
            error: error instanceof Error ? error.message : 'WhatsApp send failed',
            retryable: true
        }
    }
}
