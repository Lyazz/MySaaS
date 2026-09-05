import { isEmailConfigured, sendEmail } from './email.provider'
import { isSmsConfigured, sendSms } from './sms.provider'
import { isWhatsAppOtpConfigured, sendWhatsAppOtp } from './whatsapp-otp.provider'
import { renderOtpEmail, renderOtpSms, type OtpPurpose } from './otp-messages'
import {
    MESSAGE_CHANNELS,
    missing,
    type MessageChannel,
    type MessageLocale,
    type SendResult
} from './messaging.types'

/**
 * The one door between "a code was issued" and "a code was delivered".
 *
 * `VerificationService` decides *whether* to send and what the code is; this
 * decides *how* it travels. Splitting them is what lets the verification tests
 * run with no provider configured at all, and what keeps the choice of channel
 * a single switch rather than three branches spread through the auth flow.
 */
export class MessagingService {
    isChannelAvailable(channel: MessageChannel): boolean {
        if (channel === 'EMAIL') return isEmailConfigured()
        if (channel === 'SMS') return isSmsConfigured()
        return isWhatsAppOtpConfigured()
    }

    /**
     * What the signup and reset screens are allowed to offer.
     *
     * The list is computed per request rather than cached: a deployment that
     * adds SMS credentials should not need a restart to expose the channel, and
     * the tests flip these env vars between cases.
     */
    getAvailableChannels(): MessageChannel[] {
        return MESSAGE_CHANNELS.filter((channel) => this.isChannelAvailable(channel))
    }

    /**
     * Delivers one code. Never throws — see `SendResult`.
     *
     * `destination` is already normalized by the caller: a lowercased address
     * for EMAIL, digits-only MSISDN for SMS and WHATSAPP.
     */
    async sendOtp(input: {
        channel: MessageChannel
        destination: string
        code: string
        purpose: OtpPurpose
        locale: MessageLocale
        ttlMinutes: number
    }): Promise<SendResult> {
        if (!this.isChannelAvailable(input.channel)) {
            return missing(input.channel.toLowerCase(), `${input.channel} is not configured on this deployment`)
        }

        if (input.channel === 'EMAIL') {
            return sendEmail(
                renderOtpEmail({
                    purpose: input.purpose,
                    locale: input.locale,
                    code: input.code,
                    to: input.destination,
                    ttlMinutes: input.ttlMinutes
                })
            )
        }

        if (input.channel === 'SMS') {
            return sendSms({
                to: input.destination,
                body: renderOtpSms({
                    purpose: input.purpose,
                    locale: input.locale,
                    code: input.code,
                    ttlMinutes: input.ttlMinutes
                })
            })
        }

        return sendWhatsAppOtp({ to: input.destination, code: input.code, locale: input.locale })
    }
}

export const messagingService = new MessagingService()
