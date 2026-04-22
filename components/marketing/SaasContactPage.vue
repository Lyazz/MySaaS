<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n({ useScope: 'global' })

useSeoMeta({
  title: computed(() => `${t('saasLanding.contact.title')} - Swekly`),
  description: computed(() => t('saasLanding.contact.subtitle'))
})
</script>

<template>
  <div class="relative overflow-hidden pt-28 md:pt-32">
    <section class="marketing-section pb-10">
      <div class="marketing-container max-w-[90rem]">
        <div class="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
          <div>
            <div class="marketing-eyebrow">
              <Icon name="lucide:life-buoy" class="h-3.5 w-3.5 text-[#16d5b3]" />
              {{ t('saasLanding.contact.title') }}
            </div>
            <h1 class="mt-6 font-display text-5xl font-semibold tracking-[-0.06em] text-white md:text-6xl lg:text-7xl">
              {{ t('saasLanding.contact.title') }}
            </h1>
            <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              {{ t('saasLanding.contact.subtitle') }}
            </p>

            <div class="mt-8 space-y-4">
              <div class="marketing-panel px-5 py-5">
                <p class="marketing-label">{{ t('saasLanding.contact.cards.support.title') }}</p>
                <p class="mt-3 text-sm leading-7 text-slate-300">
                  {{ t('saasLanding.contact.cards.support.description') }}
                </p>
                <p class="mt-4 text-base font-semibold text-white">
                  {{ t('saasLanding.contact.cards.support.contact') }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <span class="marketing-pill">
                  <Icon name="lucide:shield-check" class="h-3.5 w-3.5 text-[#16d5b3]" />
                  {{ t('saasLanding.trust.secure') }}
                </span>
                <span class="marketing-pill">
                  <Icon name="lucide:clock-3" class="h-3.5 w-3.5 text-[#8fa7ff]" />
                  {{ t('saasLanding.contact.supportPill') }}
                </span>
              </div>
            </div>
          </div>

          <div class="marketing-panel px-6 py-6 md:px-8 md:py-8">
            <h2 class="font-display text-3xl font-semibold tracking-[-0.05em] text-white">
              {{ t('saasLanding.contact.form.title') }}
            </h2>
            <form class="mt-8 space-y-5" @submit.prevent>
              <div class="grid gap-5 md:grid-cols-2">
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-200">{{ t('saasLanding.contact.form.firstName') }}</label>
                  <input type="text" class="contact-input" />
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-200">{{ t('saasLanding.contact.form.lastName') }}</label>
                  <input type="text" class="contact-input" />
                </div>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-200">{{ t('saasLanding.contact.form.email') }}</label>
                <input type="email" class="contact-input" />
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-200">{{ t('saasLanding.contact.form.subject') }}</label>
                <input type="text" class="contact-input" />
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-200">{{ t('saasLanding.contact.form.message') }}</label>
                <textarea rows="5" class="contact-input resize-none" />
              </div>

              <button type="submit" class="marketing-button marketing-button--primary w-full justify-center">
                {{ t('saasLanding.contact.form.submit') }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contact-input {
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: white;
  padding: 0.95rem 1rem;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.contact-input:focus {
  border-color: rgba(53, 89, 255, 0.55);
  box-shadow: 0 0 0 4px rgba(53, 89, 255, 0.12);
  background: rgba(255, 255, 255, 0.07);
}
</style>
