<template>
  <div class="space-y-6 text-center py-4">
    <div class="flex justify-center">
      <div class="w-16 h-16 rounded-full flex items-center justify-center" style="background: var(--accent-soft)">
        <Icon name="lucide:check" class="w-8 h-8 text-brand" />
      </div>
    </div>

    <div>
      <h3 class="text-2xl font-bold text-primary">
        {{ t('admin.pages.onboarding.done.title') }}
      </h3>
      <p class="mt-1 text-sm text-secondary">
        {{ t('admin.pages.onboarding.done.subtitle') }}
      </p>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-start">
      <div class="rounded-xl p-3 border border-line">
        <p class="text-xs text-tertiary">Template</p>
        <p class="font-semibold text-sm capitalize text-primary">{{ modelValue.templateKey }}</p>
      </div>
      <div class="rounded-xl p-3 border border-line">
        <p class="text-xs text-tertiary">Color</p>
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded-lg" :style="{ background: modelValue.primaryColor }"></span>
          <p class="font-semibold text-sm text-primary">{{ modelValue.primaryColor }}</p>
        </div>
      </div>
      <div class="rounded-xl p-3 border border-line">
        <p class="text-xs text-tertiary">Language</p>
        <p class="font-semibold text-sm uppercase text-primary">{{ modelValue.language }}</p>
      </div>
    </div>

    <!-- Store URL -->
    <div class="rounded-xl p-4 border border-line surface-2">
      <p class="text-xs mb-1 text-tertiary">{{ t('admin.pages.onboarding.done.storeUrlLabel') }}</p>
      <p class="font-mono font-semibold text-sm text-primary">
        https://{{ tenantSlug }}.swekly.com
      </p>
    </div>

    <p class="text-xs text-muted">
      {{ t('admin.pages.onboarding.done.offlineNote') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

interface OnboardingForm {
  name: string; logoUrl: string | null; description: string
  templateKey: string; primaryColor: string; language: string
}
const props = defineProps<{ modelValue: OnboardingForm }>()
const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const tenantSlug = computed(() => authStore.user?.tenant?.slug ?? '')
</script>
