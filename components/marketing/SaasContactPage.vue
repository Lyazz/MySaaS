<script setup lang="ts">
import { computed } from 'vue'

const { t } = useI18n({ useScope: 'global' })

useSeoMeta({
  title: computed(() => t('saasLanding.contact.title') + ' - Swekly'),
  description: computed(() => t('saasLanding.contact.subtitle'))
})
</script>

<template>
  <div class="bg-slate-50 font-sans text-slate-900 selection:bg-teal-500 selection:text-white pt-24 lg:pt-32 pb-24">
    <div class="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
      
      <!-- Contact Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 md:mb-16 relative">
        <h1 class="text-4xl md:text-6xl font-black tracking-tight mb-6 text-slate-900" v-motion-slide-visible-once-bottom>
          {{ t('saasLanding.contact.title') }}
        </h1>
        <p class="text-lg md:text-xl text-slate-500 leading-relaxed" v-motion-slide-visible-once-bottom :delay="100">
          {{ t('saasLanding.contact.subtitle') }}
        </p>
      </div>

      <!-- Content Grid -->
      <div class="grid lg:grid-cols-2 gap-8 lg:gap-16">
        
        <!-- Left Side: Support Options -->
        <div class="flex flex-col justify-center mt-4">
          <!-- Support Card -->
          <div class="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-lg transition-shadow" v-motion-slide-visible-once-bottom :delay="200">
            <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
              <Icon name="lucide:life-buoy" class="w-7 h-7" />
            </div>
            <h3 class="text-2xl font-bold text-slate-900 mb-3">{{ t('saasLanding.contact.cards.support.title') }}</h3>
            <p class="text-slate-600 mb-6 leading-relaxed">{{ t('saasLanding.contact.cards.support.description') }}</p>
            <div class="text-lg font-semibold text-slate-900">{{ t('saasLanding.contact.cards.support.contact') }}</div>
          </div>
        </div>

        <!-- Right Side: Contact Form -->
        <div class="bg-white p-8 md:p-10 border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 relative overflow-hidden" v-motion-slide-visible-once-bottom :delay="400">
          <div class="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
          <h2 class="text-2xl font-bold mb-8 text-slate-900">{{ t('saasLanding.contact.form.title') }}</h2>
          <form class="space-y-6" @submit.prevent>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">{{ t('saasLanding.contact.form.firstName') }}</label>
                <input type="text" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-900" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">{{ t('saasLanding.contact.form.lastName') }}</label>
                <input type="text" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-900" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">{{ t('saasLanding.contact.form.email') }}</label>
              <input type="email" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-900" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">{{ t('saasLanding.contact.form.subject') }}</label>
              <input type="text" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-900" placeholder="How can we help?" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">{{ t('saasLanding.contact.form.message') }}</label>
              <textarea rows="4" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-900 resize-none" placeholder="Let us know what's on your mind..."></textarea>
            </div>
            <button type="submit" class="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98]">
              {{ t('saasLanding.contact.form.submit') }}
            </button>
          </form>
        </div>

      </div>
    </div>
  </div>
</template>
