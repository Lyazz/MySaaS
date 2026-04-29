<template>
  <div v-if="!dismissed" class="rounded-xl p-5 mb-4" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="font-semibold text-sm" style="color: var(--text-primary)">
          {{ t('admin.pages.gettingStarted.title') }}
        </h3>
        <p class="text-xs mt-0.5" style="color: var(--text-secondary)">
          {{ t('admin.pages.gettingStarted.progress', { done: completedCount, total: items.length }) }}
        </p>
      </div>
      <button
        v-if="!allDone"
        type="button"
        class="text-xs px-2 py-1 rounded"
        style="color: var(--text-muted); background: var(--surface-3)"
        @click="dismiss"
      >
        {{ t('admin.pages.gettingStarted.dismiss') }}
      </button>
      <span v-else class="text-xs font-medium flex items-center gap-1" style="color: var(--brand)">
        <Icon name="lucide:check-circle" class="w-4 h-4" />
        {{ t('admin.pages.gettingStarted.complete') }}
      </span>
    </div>

    <!-- Progress bar -->
    <div class="h-1.5 rounded-full mb-4 overflow-hidden" style="background: var(--surface-3)">
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
          <Icon v-if="item.done" name="lucide:check" class="w-3 h-3" style="color: #05070A" />
        </div>
        <span
          class="text-sm flex-1"
          :class="item.done ? 'line-through' : ''"
          :style="item.done ? 'color: var(--text-muted)' : 'color: var(--text-primary)'"
        >{{ item.label }}</span>
        <button
          v-if="item.key === 'publish' && !item.done"
          type="button"
          :disabled="publishing"
          class="text-xs px-2.5 py-1 rounded-lg font-medium [background:var(--brand)] text-white disabled:opacity-50"
          @click="publishStore"
        >
          {{ publishing ? t('admin.pages.gettingStarted.publishing') : t('admin.pages.gettingStarted.publishBtn') }}
        </button>
        <NuxtLink
          v-else-if="!item.done && item.href"
          :to="item.href"
          class="text-xs px-2.5 py-1 rounded-lg font-medium [background:var(--brand)] text-white"
        >
          →
        </NuxtLink>
      </li>
    </ul>
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
}

const data = ref<ChecklistData | null>(null)
const dismissed = ref(false)
const publishing = ref(false)

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
  } catch {}
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
  try {
    await $fetch('/api/admin/store-settings/publish', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await fetchChecklist()
  } catch {} finally {
    publishing.value = false
  }
}

onMounted(fetchChecklist)
</script>
