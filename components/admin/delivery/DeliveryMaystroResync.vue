<template>
  <section class="delivery-note">
    <header class="flex items-start gap-2.5">
      <Icon
        name="lucide:refresh-cw"
        class="mt-0.5 h-4 w-4 shrink-0"
        style="color: var(--text-tertiary)"
      />
      <div>
        <h4
          class="text-[13px] font-semibold"
          style="color: var(--text-primary)"
        >
          {{ t('admin.pages.delivery.maystro.resync.title') }}
        </h4>
        <p
          class="mt-0.5 text-xs leading-relaxed"
          style="color: var(--text-tertiary)"
        >
          {{ t('admin.pages.delivery.maystro.resync.hint') }}
        </p>
      </div>
    </header>

    <div class="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="ui-btn ui-btn--secondary ui-btn--sm"
        :disabled="running || disabled"
        @click="resync"
      >
        {{ running ? t('admin.pages.delivery.maystro.resync.running') : t('admin.pages.delivery.maystro.resync.action') }}
      </button>
      <p
        v-if="message"
        class="text-xs"
        :style="{ color: kind === 'error' ? 'var(--status-cancelled-text)' : 'var(--status-delivered-text)' }"
      >
        {{ message }}
      </p>
      <p
        v-else-if="disabled"
        class="text-xs"
        style="color: var(--text-muted)"
      >
        {{ t('admin.pages.delivery.maystro.resync.needsConnection') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

defineProps<{ disabled: boolean }>()

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

const running = ref(false)
const message = ref('')
const kind = ref<'success' | 'error'>('success')

async function resync() {
  if (running.value) return
  running.value = true
  message.value = ''

  try {
    const result = await $fetch<{ fixed: number; skipped: number }>(
      '/api/admin/delivery/providers/MAYSTRO/resync-products',
      { method: 'POST', headers: { Authorization: `Bearer ${authStore.token}` } }
    )
    kind.value = 'success'
    message.value = t('admin.pages.delivery.maystro.resync.done', {
      fixed: result?.fixed ?? 0,
      skipped: result?.skipped ?? 0
    })
  } catch (e: any) {
    console.error('Failed to resync Maystro products', e)
    kind.value = 'error'
    message.value = e?.data?.statusMessage || t('admin.pages.delivery.maystro.resync.failed')
  } finally {
    running.value = false
  }
}
</script>

<style scoped>
.delivery-note {
  border: 1px solid var(--surface-border);
  border-radius: 0.875rem;
  background: var(--surface-2);
  padding: 1rem;
}
</style>
