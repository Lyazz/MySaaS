<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
const email = ref('')
const submitted = ref(false)

definePageMeta({
  middleware: 'saas-only',
  layout: 'marketing',
  title: 'Forgot Password — Swekly'
})

function submitPlaceholder() {
  if (!email.value.trim()) return
  submitted.value = true
}
</script>

<template>
  <div class="min-h-screen pt-24 pb-12 md:pt-28">
    <div class="cinematic-container max-w-2xl">
      <section class="cinematic-card p-7 md:p-9">
        <h1 class="cinematic-headline !text-3xl md:!text-4xl">
          {{ t('auth.forgotPassword.title') }}
        </h1>
        <p class="cinematic-subhead mt-3">
          {{ t('auth.forgotPassword.subtitle') }}
        </p>

        <div class="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {{ t('auth.forgotPassword.placeholderNotice') }}
        </div>

        <form class="mt-6 space-y-4" @submit.prevent="submitPlaceholder">
          <div>
            <label for="forgot-email" class="cinematic-eyebrow mb-2 block">{{ t('auth.forgotPassword.email.label') }}</label>
            <input
              id="forgot-email"
              v-model="email"
              type="email"
              class="cinematic-input"
              autocomplete="email"
              :placeholder="t('auth.forgotPassword.email.placeholder')"
            >
          </div>

          <button type="submit" class="login-submit-btn w-full" :disabled="!email.trim() || submitted">
            <span class="relative z-10 flex items-center justify-center gap-2">
              <span>{{ submitted ? t('auth.forgotPassword.submit.sent') : t('auth.forgotPassword.submit.send') }}</span>
            </span>
          </button>
        </form>

        <div class="mt-5 text-center text-sm text-[color:var(--m-text-dim)]">
          <NuxtLink to="/login" class="font-medium text-lime-neon hover:underline">{{ t('auth.forgotPassword.backToLogin') }}</NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login-submit-btn {
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

.login-submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
