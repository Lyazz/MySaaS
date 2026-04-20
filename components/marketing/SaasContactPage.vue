<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n({ useScope: 'global' })

useSeoMeta({
  title: computed(() => t('saasLanding.contact.title') + ' - Swekly'),
  description: computed(() => t('saasLanding.contact.subtitle'))
})
</script>

<template>
  <div class="contact-page font-sans pt-24 lg:pt-32 pb-24">
    <div class="contact-page__blob contact-page__blob--mint" />
    <div class="contact-page__blob contact-page__blob--orange" />

    <div class="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
      <div class="text-center max-w-3xl mx-auto mb-12 md:mb-16">
        <h1 class="text-4xl md:text-6xl font-black tracking-tight mb-6 text-[#0D1F1A]" v-motion-slide-visible-once-bottom>
          {{ t('saasLanding.contact.title') }}
        </h1>
        <p class="text-lg md:text-xl text-[#0D1F1A]/65 leading-relaxed" v-motion-slide-visible-once-bottom :delay="100">
          {{ t('saasLanding.contact.subtitle') }}
        </p>
      </div>

      <div class="grid lg:grid-cols-2 gap-8 lg:gap-16">
        <div class="flex flex-col justify-center mt-4">
          <div class="rounded-3xl border-2 border-[#0D1F1A] bg-[#FFFDF4] p-8 shadow-[7px_7px_0_#0D1F1A]" v-motion-slide-visible-once-bottom :delay="200">
            <div class="w-14 h-14 rounded-2xl border-2 border-[#0D1F1A] bg-[#1F9D8E] text-white flex items-center justify-center mb-6 shadow-[3px_3px_0_#0D1F1A]">
              <Icon name="lucide:life-buoy" class="w-7 h-7" />
            </div>
            <h3 class="text-2xl font-extrabold text-[#0D1F1A] mb-3">{{ t('saasLanding.contact.cards.support.title') }}</h3>
            <p class="text-[#0D1F1A]/65 mb-6 leading-relaxed">{{ t('saasLanding.contact.cards.support.description') }}</p>
            <div class="text-lg font-semibold text-[#0D1F1A]">{{ t('saasLanding.contact.cards.support.contact') }}</div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <span class="inline-flex items-center gap-2 rounded-full border-2 border-[#0D1F1A] bg-[#FFFDF4] px-3 py-1.5 text-xs font-semibold text-[#0D1F1A]">
              <Icon name="lucide:shield-check" class="h-3.5 w-3.5 text-[#FF7A45]" />
              {{ t('saasLanding.trust.secure') }}
            </span>
            <span class="inline-flex items-center gap-2 rounded-full border-2 border-[#0D1F1A] bg-[#FFFDF4] px-3 py-1.5 text-xs font-semibold text-[#0D1F1A]">
              <Icon name="lucide:lock" class="h-3.5 w-3.5 text-[#FF7A45]" />
              {{ t('saasLanding.trust.ssl') }}
            </span>
          </div>
        </div>

        <div class="rounded-3xl border-2 border-[#0D1F1A] bg-[#FFFDF4] p-8 md:p-10 shadow-[8px_8px_0_#FF7A45]" v-motion-slide-visible-once-bottom :delay="400">
          <h2 class="text-2xl font-extrabold mb-8 text-[#0D1F1A]">{{ t('saasLanding.contact.form.title') }}</h2>
          <form class="space-y-6" @submit.prevent>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-[#0D1F1A] mb-2">{{ t('saasLanding.contact.form.firstName') }}</label>
                <input type="text" class="contact-input" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-[#0D1F1A] mb-2">{{ t('saasLanding.contact.form.lastName') }}</label>
                <input type="text" class="contact-input" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-[#0D1F1A] mb-2">{{ t('saasLanding.contact.form.email') }}</label>
              <input type="email" class="contact-input" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-[#0D1F1A] mb-2">{{ t('saasLanding.contact.form.subject') }}</label>
              <input type="text" class="contact-input" placeholder="How can we help?" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-[#0D1F1A] mb-2">{{ t('saasLanding.contact.form.message') }}</label>
              <textarea rows="4" class="contact-input resize-none" placeholder="Let us know what's on your mind..." />
            </div>
            <button type="submit" class="w-full rounded-xl border-2 border-[#0D1F1A] bg-[#FF7A45] py-4 font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]">
              {{ t('saasLanding.contact.form.submit') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-page {
  background: #FFF8E7;
  color: #0D1F1A;
  position: relative;
  overflow: hidden;
}

.contact-page__blob {
  pointer-events: none;
  position: absolute;
  border-radius: 999px;
  filter: blur(80px);
  opacity: 0.3;
}

.contact-page__blob--mint {
  width: 300px;
  height: 300px;
  left: -80px;
  top: 120px;
  background: #1F9D8E;
}

.contact-page__blob--orange {
  width: 340px;
  height: 340px;
  right: -90px;
  top: 60px;
  background: #FF7A45;
}

.contact-input {
  width: 100%;
  border: 2px solid rgba(13, 31, 26, 0.25);
  background: #FFF8E7;
  color: #0D1F1A;
  border-radius: 0.9rem;
  padding: 0.75rem 1rem;
  outline: none;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.contact-input:focus {
  border-color: #FF7A45;
  box-shadow: 0 0 0 4px rgba(255, 122, 69, 0.15);
}
</style>
