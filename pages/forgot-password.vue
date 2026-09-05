<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useOtpFlow, type OtpChannel } from '~/composables/useOtpFlow'

/**
 * Password reset in three steps on one screen: pick a channel and a
 * destination, type the code that arrives, choose a new password.
 *
 * Nothing here tells the visitor whether the address exists — the API answers
 * identically either way, and this page must not undo that by branching on it.
 */

const { t } = useI18n({ useScope: 'global' })

definePageMeta({
  middleware: 'saas-only',
  layout: 'marketing',
  title: 'Forgot Password — Swekly'
})

const MIN_PASSWORD_LENGTH = 8
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CHANNEL_ICONS: Record<OtpChannel, string> = {
  EMAIL: 'lucide:mail',
  SMS: 'lucide:message-square',
  WHATSAPP: 'lucide:message-circle'
}

const otp = useOtpFlow('PASSWORD_RESET')

const email = ref('')
const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')

const error = ref('')
const submitting = ref(false)
const done = ref(false)

onMounted(() => {
  void otp.loadChannels()
})

const usesEmail = computed(() => otp.channel.value === 'EMAIL')

const destination = computed(() =>
  usesEmail.value ? { email: email.value.trim().toLowerCase() } : { phone: phone.value.trim() }
)

/** Which of the three steps is on screen. */
const step = computed<'request' | 'code' | 'password'>(() => {
  if (otp.verified.value) return 'password'
  if (otp.sent.value) return 'code'
  return 'request'
})

const resendLabel = computed(() =>
  otp.cooldown.value > 0
    ? t('auth.forgotPassword.otp.resendIn', { seconds: otp.cooldown.value })
    : t('auth.forgotPassword.otp.resend')
)

// Changing where the code should go invalidates whatever was already sent.
watch([email, phone, otp.channel], () => {
  if (done.value) return
  code.value = ''
  otp.reset()
})

async function requestCode() {
  error.value = ''

  if (usesEmail.value) {
    if (!EMAIL_REGEX.test(email.value.trim())) {
      error.value = t('auth.forgotPassword.errors.emailInvalid')
      return
    }
  } else if (!phone.value.trim()) {
    error.value = t('auth.forgotPassword.errors.phoneRequired')
    return
  }

  await otp.send(destination.value)
}

/** Back to step one, dropping the code that was sent to the old destination. */
function startOver() {
  code.value = ''
  error.value = ''
  otp.reset()
}

async function submitCode() {
  error.value = ''

  if (!code.value.trim()) {
    error.value = t('auth.forgotPassword.errors.codeRequired')
    return
  }

  await otp.verify({ code: code.value, ...destination.value })
}

async function submitPassword() {
  error.value = ''

  if (password.value.length < MIN_PASSWORD_LENGTH) {
    error.value = t('auth.forgotPassword.errors.passwordTooShort', { min: MIN_PASSWORD_LENGTH })
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = t('auth.forgotPassword.errors.passwordMismatch')
    return
  }

  submitting.value = true

  try {
    await $fetch('/api/auth/password/reset', {
      method: 'POST',
      body: {
        verificationToken: otp.verificationToken.value,
        password: password.value
      }
    })

    done.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || t('auth.forgotPassword.errors.generic')
  } finally {
    submitting.value = false
  }
}

const feedback = computed(() => {
  if (error.value) return error.value
  if (otp.error.value) return otp.error.value
  return ''
})
</script>

<template>
  <div class="min-h-screen pt-24 pb-12 md:pt-28">
    <div class="cinematic-container max-w-2xl">
      <section class="cinematic-card p-7 md:p-9">
        <!-- ─── Done ─── -->
        <template v-if="done">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-lime-neon/25 bg-lime-neon/10">
            <Icon name="lucide:check" class="h-6 w-6 text-lime-neon" />
          </div>
          <h1 class="cinematic-headline mt-6 !text-3xl md:!text-4xl">
            {{ t('auth.forgotPassword.done.title') }}
          </h1>
          <p class="cinematic-subhead mt-3">
            {{ t('auth.forgotPassword.done.subtitle') }}
          </p>
          <NuxtLink to="/login" class="reset-submit-btn mt-6 inline-flex w-full justify-center" data-testid="forgot-go-login">
            {{ t('auth.forgotPassword.done.logIn') }}
          </NuxtLink>
        </template>

        <template v-else>
          <h1 class="cinematic-headline !text-3xl md:!text-4xl">
            {{ t('auth.forgotPassword.title') }}
          </h1>
          <p class="cinematic-subhead mt-3">
            {{ t('auth.forgotPassword.subtitle') }}
          </p>

          <div
            v-if="feedback"
            class="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            data-testid="forgot-feedback"
            role="alert"
          >
            {{ feedback }}
          </div>

          <div
            v-else-if="step === 'code'"
            class="mt-6 rounded-xl border border-lime-neon/25 bg-lime-neon/10 px-4 py-3 text-sm text-lime-100"
          >
            {{ t('auth.forgotPassword.otp.sentTo', {
              destination: otp.maskedDestination.value,
              minutes: otp.expiresInMinutes.value
            }) }}
          </div>

          <!-- ─── Step 1: where should the code go ─── -->
          <form v-if="step === 'request'" class="mt-6 space-y-4" @submit.prevent="requestCode">
            <div v-if="otp.availableChannels.value.length > 1">
              <span class="cinematic-eyebrow mb-2 block">{{ t('auth.forgotPassword.otp.channelLabel') }}</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in otp.availableChannels.value"
                  :key="option"
                  type="button"
                  :data-testid="`forgot-channel-${option.toLowerCase()}`"
                  class="otp-channel-btn"
                  :class="{ 'otp-channel-btn--active': otp.channel.value === option }"
                  :aria-pressed="otp.channel.value === option"
                  @click="otp.channel.value = option"
                >
                  <Icon :name="CHANNEL_ICONS[option]" class="h-3.5 w-3.5" />
                  {{ t(`auth.channels.${option.toLowerCase()}`) }}
                </button>
              </div>
            </div>

            <div v-if="usesEmail">
              <label for="forgot-email" class="cinematic-eyebrow mb-2 block">{{ t('auth.forgotPassword.email.label') }}</label>
              <input
                id="forgot-email"
                v-model="email"
                data-testid="forgot-email"
                type="email"
                class="cinematic-input"
                autocomplete="email"
                :placeholder="t('auth.forgotPassword.email.placeholder')"
              >
            </div>

            <div v-else>
              <label for="forgot-phone" class="cinematic-eyebrow mb-2 block">{{ t('auth.forgotPassword.phone.label') }}</label>
              <input
                id="forgot-phone"
                v-model="phone"
                data-testid="forgot-phone"
                type="tel"
                class="cinematic-input"
                autocomplete="tel"
                :placeholder="t('auth.forgotPassword.phone.placeholder')"
              >
            </div>

            <button
              type="submit"
              class="reset-submit-btn w-full"
              data-testid="forgot-send"
              :disabled="otp.sending.value"
            >
              {{ otp.sending.value ? t('auth.forgotPassword.submit.sending') : t('auth.forgotPassword.submit.send') }}
            </button>
          </form>

          <!-- ─── Step 2: the code ─── -->
          <form v-else-if="step === 'code'" class="mt-6 space-y-4" @submit.prevent="submitCode">
            <div>
              <label for="forgot-code" class="cinematic-eyebrow mb-2 block">{{ t('auth.forgotPassword.otp.label') }}</label>
              <input
                id="forgot-code"
                v-model="code"
                data-testid="forgot-code"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                class="cinematic-input tracking-[0.3em]"
                :placeholder="t('auth.forgotPassword.otp.placeholder')"
              >
            </div>

            <button
              type="submit"
              class="reset-submit-btn w-full"
              data-testid="forgot-verify"
              :disabled="otp.verifying.value"
            >
              {{ otp.verifying.value ? t('auth.forgotPassword.submit.verifying') : t('auth.forgotPassword.submit.verify') }}
            </button>

            <button
              type="button"
              class="w-full text-center text-sm text-[color:var(--m-text-dim)] hover:text-white disabled:opacity-60"
              data-testid="forgot-resend"
              :disabled="!otp.canResend.value"
              @click="requestCode"
            >
              {{ resendLabel }}
            </button>

            <!-- Mistyped the address, or picked the wrong channel: without this
                 the only way back to step one is a full page reload. -->
            <button
              type="button"
              class="w-full text-center text-sm text-[color:var(--m-text-dim)] hover:text-white"
              data-testid="forgot-change-destination"
              @click="startOver"
            >
              {{ t('auth.forgotPassword.otp.changeDestination') }}
            </button>
          </form>

          <!-- ─── Step 3: the new password ─── -->
          <form v-else class="mt-6 space-y-4" @submit.prevent="submitPassword">
            <div>
              <label for="forgot-password" class="cinematic-eyebrow mb-2 block">{{ t('auth.forgotPassword.password.label') }}</label>
              <input
                id="forgot-password"
                v-model="password"
                data-testid="forgot-password"
                type="password"
                class="cinematic-input"
                autocomplete="new-password"
                :placeholder="t('auth.forgotPassword.password.placeholder')"
              >
            </div>

            <div>
              <label for="forgot-confirm" class="cinematic-eyebrow mb-2 block">{{ t('auth.forgotPassword.confirmPassword.label') }}</label>
              <input
                id="forgot-confirm"
                v-model="confirmPassword"
                data-testid="forgot-confirm"
                type="password"
                class="cinematic-input"
                autocomplete="new-password"
                :placeholder="t('auth.forgotPassword.confirmPassword.placeholder')"
              >
            </div>

            <button
              type="submit"
              class="reset-submit-btn w-full"
              data-testid="forgot-submit"
              :disabled="submitting"
            >
              {{ submitting ? t('auth.forgotPassword.submit.saving') : t('auth.forgotPassword.submit.save') }}
            </button>
          </form>

          <div class="mt-5 text-center text-sm text-[color:var(--m-text-dim)]">
            <NuxtLink to="/login" class="font-medium text-lime-neon hover:underline">{{ t('auth.forgotPassword.backToLogin') }}</NuxtLink>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.reset-submit-btn {
  position: relative;
  overflow: hidden;
  padding: 13px 20px;
  border-radius: 13px;
  border: 1px solid rgba(198, 244, 50, 0.5);
  background: #C6F432;
  color: #05070A;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 24px rgba(198, 244, 50, 0.25), inset 0 1px 0 rgba(255,255,255,0.2);
}

.reset-submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Same segmented control as the signup screen: three visible options rather
   than a dropdown that hides which channels exist. */
.otp-channel-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.025);
  color: var(--m-text-dim);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.otp-channel-btn:hover {
  border-color: rgba(198, 244, 50, 0.3);
  color: var(--m-text);
}

.otp-channel-btn--active {
  border-color: rgba(198, 244, 50, 0.5);
  background: rgba(198, 244, 50, 0.12);
  color: #c6f432;
}
</style>
