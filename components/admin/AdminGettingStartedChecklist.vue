<template>
  <div v-if="!dismissed" class="rounded-xl p-5 mb-4 surface-1 border border-line">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="font-semibold text-sm text-primary">
          {{ t('admin.pages.gettingStarted.title') }}
        </h3>
        <p class="text-xs mt-0.5 text-secondary">
          {{ t('admin.pages.gettingStarted.progress', { done: completedCount, total: items.length }) }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="allDone" class="text-xs font-medium flex items-center gap-1 text-brand">
          <Icon name="lucide:check-circle" class="w-4 h-4" />
          {{ t('admin.pages.gettingStarted.complete') }}
        </span>
        <button
 type="button"
 class="text-xs px-2 py-1 rounded-lg text-muted surface-3"
 
 data-testid="getting-started-dismiss"
 @click="dismiss"
>
          {{ t('admin.pages.gettingStarted.dismiss') }}
        </button>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="h-1.5 rounded-full mb-4 overflow-hidden surface-3">
      <div
        class="h-1.5 rounded-full transition-all duration-500 [background:var(--brand)]"
        :style="{ width: `${(completedCount / items.length) * 100}%` }"
      />
    </div>

    <!-- Items -->
    <ul class="space-y-2">
      <li v-for="item in items" :key="item.key" class="flex items-center gap-3">
        <div
          class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
          :style="item.done ? 'background: var(--brand)' : 'border: 2px solid var(--surface-border)'"
        >
          <Icon v-if="item.done" name="lucide:check" class="w-3 h-3 text-brand-contrast" />
        </div>
        <span
          class="text-sm flex-1"
          :class="item.done ? 'line-through' : ''"
          :style="item.done ? 'color: var(--text-muted)' : 'color: var(--text-primary)'"
        >{{ item.label }}</span>
        <button
          v-if="item.key === 'publish' && !item.done"
          type="button"
          :disabled="publishing || data?.canPublish === false"
          :title="data?.canPublish === false ? t('admin.pages.gettingStarted.publishBlocked') : undefined"
          class="text-xs px-2.5 py-1 rounded-lg font-medium [background:var(--brand)] text-brand-contrast disabled:opacity-50"
          @click="publishStore"
        >
          {{ publishing ? t('admin.pages.gettingStarted.publishing') : t('admin.pages.gettingStarted.publishBtn') }}
        </button>
        <NuxtLink
          v-else-if="!item.done && item.href"
          :to="item.href"
          class="text-xs px-2.5 py-1 rounded-lg font-medium [background:var(--brand)] text-brand-contrast"
        >
          →
        </NuxtLink>
      </li>
    </ul>

    <p v-if="publishError" class="ui-error mt-3">{{ publishError }}</p>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

interface ChecklistData {
  hasLogo: boolean
  hasProducts: boolean
  hasCategories: boolean
  hasDelivery: boolean
  isPublished: boolean
  checklistDismissed: boolean
  canPublish: boolean
  missingToPublish: string[]
}

const data = ref<ChecklistData | null>(null)
const dismissed = ref(false)
const publishing = ref(false)
const publishError = ref('')

const items = computed(() => [
  { key: 'logo',     done: data.value?.hasLogo ?? false,       label: t('admin.pages.gettingStarted.items.logo'),     href: '/admin/settings/appearance' },
  { key: 'product',  done: data.value?.hasProducts ?? false,   label: t('admin.pages.gettingStarted.items.product'),  href: '/admin/products/create' },
  { key: 'category', done: data.value?.hasCategories ?? false, label: t('admin.pages.gettingStarted.items.category'), href: '/admin/categories' },
  { key: 'delivery', done: data.value?.hasDelivery ?? false,   label: t('admin.pages.gettingStarted.items.delivery'), href: '/admin/settings' },
  { key: 'publish',  done: data.value?.isPublished ?? false,   label: t('admin.pages.gettingStarted.items.publish'),  href: '' },
])

const completedCount = computed(() => items.value.filter(i => i.done).length)
const allDone = computed(() => completedCount.value === items.value.length)

async function fetchChecklist() {
  try {
    data.value = await $fetch<ChecklistData>('/api/admin/store-settings/onboarding-checklist', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    if (data.value.checklistDismissed) dismissed.value = true
  } catch {
    // The checklist is a nudge, not a blocker: a failed fetch just leaves the
    // card empty rather than breaking the dashboard around it.
  }
}

async function dismiss() {
  dismissed.value = true
  await $fetch('/api/admin/store-settings', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authStore.token}` },
    body: { checklistDismissed: true }
  }).catch(() => {})
}

async function publishStore() {
  publishing.value = true
  publishError.value = ''
  try {
    await $fetch('/api/admin/store-settings/publish', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await fetchChecklist()
  } catch (e: any) {
    // A refusal names what the store is still missing; swallowing it left the
    // merchant clicking a button that silently did nothing.
    const missing: string[] = e?.data?.missing ?? []
    publishError.value = missing.length
      ? t('admin.pages.gettingStarted.publishMissing', {
          items: missing.map((m) => t(`admin.pages.onboarding.publish.missing.${m}`)).join(', ')
        })
      : (e?.data?.statusMessage || t('admin.pages.onboarding.errors.publishFailed'))
  } finally {
    publishing.value = false
  }
}

onMounted(fetchChecklist)
</script>
