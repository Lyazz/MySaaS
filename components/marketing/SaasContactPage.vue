<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n({ useScope: 'global' })

useSeoMeta({
  title: computed(() => `${t('saasLanding.contact.title')} — Swekly`),
  description: computed(() => t('saasLanding.contact.subtitle'))
})
</script>

<template>
  <div class="pt-24 md:pt-32">
    <section class="relative overflow-hidden pb-20">
      <div class="cinematic-grid-bg" />
      <div class="cinematic-container relative">
        <div class="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <span class="cinematic-pill">
              <span class="cinematic-pill__dot" />
              {{ t('saasLanding.contact.title') }}
            </span>
            <h1 class="cinematic-headline mt-6">{{ t('saasLanding.contact.title') }}</h1>
            <p class="cinematic-subhead mt-5">{{ t('saasLanding.contact.subtitle') }}</p>

            <div class="mt-8 space-y-4">
              <div class="cinematic-card p-6">
                <div class="cinematic-eyebrow">{{ t('saasLanding.contact.cards.support.title') }}</div>
                <p class="mt-3 text-[15px] leading-relaxed text-[color:var(--m-text-dim)]">
                  {{ t('saasLanding.contact.cards.support.description') }}
                </p>
                <p class="mt-4 cinematic-mono-num text-base text-white">
                  {{ t('saasLanding.contact.cards.support.contact') }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <span class="cinematic-pill">
                  <Icon name="lucide:shield-check" class="h-3 w-3 text-lime-neon" />
                  {{ t('saasLanding.trust.secure') }}
                </span>
                <span class="cinematic-pill">
                  <Icon name="lucide:clock-3" class="h-3 w-3 text-lime-neon" />
                  {{ t('saasLanding.contact.supportPill') }}
                </span>
              </div>
            </div>
          </div>

          <div class="cinematic-card p-7 md:p-9">
            <h2 class="cinematic-headline !text-3xl">{{ t('saasLanding.contact.form.title') }}</h2>
            <form class="mt-7 space-y-5" @submit.prevent>
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="cinematic-eyebrow mb-2 block">{{ t('saasLanding.contact.form.firstName') }}</label>
                  <input type="text" class="cinematic-input" />
                </div>
                <div>
                  <label class="cinematic-eyebrow mb-2 block">{{ t('saasLanding.contact.form.lastName') }}</label>
                  <input type="text" class="cinematic-input" />
                </div>
              </div>
              <div>
                <label class="cinematic-eyebrow mb-2 block">{{ t('saasLanding.contact.form.email') }}</label>
                <input type="email" class="cinematic-input" />
              </div>
              <div>
                <label class="cinematic-eyebrow mb-2 block">{{ t('saasLanding.contact.form.subject') }}</label>
                <input type="text" class="cinematic-input" />
              </div>
              <div>
                <label class="cinematic-eyebrow mb-2 block">{{ t('saasLanding.contact.form.message') }}</label>
                <textarea rows="5" class="cinematic-input resize-none" />
              </div>

              <button type="submit" class="cinematic-button cinematic-button--primary w-full">
                {{ t('saasLanding.contact.form.submit') }}
                <Icon name="lucide:send" class="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
