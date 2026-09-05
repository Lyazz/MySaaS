import { computed, onScopeDispose, ref } from 'vue'

/**
 * The send → verify half of signup and password reset, shared by both screens.
 *
 * Both flows are the same three steps over the same endpoints and differ only
 * in `purpose`, so they differ only in the argument passed here. What the pages
 * keep for themselves is what happens *after* verification — creating a tenant,
 * or choosing a new password.
 *
 * The composable never decides which channels exist: it asks the API, because
 * only the server knows which providers this deployment has credentials for.
 * A page that renders three buttons on a deployment with email only sends the
 * visitor into a code that will never arrive.
 */

export type OtpChannel = 'EMAIL' | 'SMS' | 'WHATSAPP'

export type OtpPurpose = 'REGISTRATION' | 'PASSWORD_RESET'

type ChannelsResponse = {
  channels?: OtpChannel[]
  expiresInMinutes?: number
  resendAfterSeconds?: number
}

type SendResponse = {
  success?: boolean
  channel?: OtpChannel
  maskedDestination?: string
  expiresInMinutes?: number
  resendAfterSeconds?: number
}

type VerifyResponse = {
  success?: boolean
  verificationToken?: string
}

/** Pulls the human-readable message out of whatever `$fetch` threw. */
const errorMessage = (error: any, fallback: string): string =>
  error?.data?.statusMessage || error?.statusMessage || fallback

export const useOtpFlow = (purpose: OtpPurpose) => {
  const availableChannels = ref<OtpChannel[]>([])
  const channelsLoaded = ref(false)
  const channel = ref<OtpChannel>('EMAIL')

  const sending = ref(false)
  const verifying = ref(false)
  const sent = ref(false)
  const verified = ref(false)
  const error = ref('')
  const maskedDestination = ref('')
  const verificationToken = ref('')
  const expiresInMinutes = ref(10)

  const cooldown = ref(0)
  let cooldownTimer: ReturnType<typeof setInterval> | null = null

  const stopCooldown = () => {
    if (cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }

  /**
   * Counts the resend button down locally.
   *
   * The server enforces the real cooldown; this only stops the visitor from
   * spending a request to be told to wait.
   */
  const startCooldown = (seconds: number) => {
    stopCooldown()
    cooldown.value = Math.max(0, Math.floor(seconds))
    if (cooldown.value === 0) return

    cooldownTimer = setInterval(() => {
      cooldown.value -= 1
      if (cooldown.value <= 0) stopCooldown()
    }, 1000)
  }

  onScopeDispose(stopCooldown)

  const canResend = computed(() => cooldown.value === 0 && !sending.value)

  /** Channels the deployment can actually deliver on, fetched once per page. */
  const loadChannels = async () => {
    try {
      const data = await $fetch<ChannelsResponse>('/api/auth/otp/channels')
      availableChannels.value = Array.isArray(data?.channels) ? data.channels : []
      if (data?.expiresInMinutes) expiresInMinutes.value = data.expiresInMinutes

      // Keep the current pick only if it survived; otherwise fall to the first
      // one offered, so the form is never armed on a dead channel.
      if (!availableChannels.value.includes(channel.value)) {
        channel.value = availableChannels.value[0] ?? 'EMAIL'
      }
    } catch {
      // A failed probe must not block the screen: fall back to email and let
      // the send itself report the real problem.
      availableChannels.value = []
    } finally {
      channelsLoaded.value = true
    }
  }

  /** Back to step one — called when the destination itself changes. */
  const reset = () => {
    sent.value = false
    verified.value = false
    verificationToken.value = ''
    maskedDestination.value = ''
    error.value = ''
    stopCooldown()
    cooldown.value = 0
  }

  const send = async (destination: { email?: string; phone?: string }): Promise<boolean> => {
    error.value = ''
    sending.value = true

    // `forgot` and `send` are the same operation; the dedicated path exists so
    // the reset flow reads as one endpoint per step in the server logs.
    const path = purpose === 'PASSWORD_RESET' ? '/api/auth/password/forgot' : '/api/auth/otp/send'

    try {
      const data = await $fetch<SendResponse>(path, {
        method: 'POST',
        body: {
          purpose,
          channel: channel.value,
          email: destination.email,
          phone: destination.phone
        }
      })

      sent.value = true
      verified.value = false
      verificationToken.value = ''
      maskedDestination.value = data?.maskedDestination ?? ''
      if (data?.expiresInMinutes) expiresInMinutes.value = data.expiresInMinutes
      startCooldown(data?.resendAfterSeconds ?? 60)
      return true
    } catch (e: any) {
      // A 429 carries how long is left; honouring it keeps the button honest.
      const retryAfter = Number(e?.data?.retryAfterSeconds)
      if (Number.isFinite(retryAfter) && retryAfter > 0) startCooldown(retryAfter)

      error.value = errorMessage(e, 'The code could not be sent.')
      return false
    } finally {
      sending.value = false
    }
  }

  const verify = async (input: {
    code: string
    email?: string
    phone?: string
  }): Promise<boolean> => {
    error.value = ''
    verifying.value = true

    try {
      const data = await $fetch<VerifyResponse>('/api/auth/otp/verify', {
        method: 'POST',
        body: {
          purpose,
          channel: channel.value,
          email: input.email,
          phone: input.phone,
          code: input.code
        }
      })

      if (!data?.verificationToken) {
        error.value = 'Verification failed.'
        return false
      }

      verificationToken.value = data.verificationToken
      verified.value = true
      stopCooldown()
      return true
    } catch (e: any) {
      error.value = errorMessage(e, 'Incorrect code.')
      return false
    } finally {
      verifying.value = false
    }
  }

  return {
    availableChannels,
    channelsLoaded,
    channel,
    sending,
    verifying,
    sent,
    verified,
    error,
    maskedDestination,
    verificationToken,
    expiresInMinutes,
    cooldown,
    canResend,
    loadChannels,
    reset,
    send,
    verify
  }
}
