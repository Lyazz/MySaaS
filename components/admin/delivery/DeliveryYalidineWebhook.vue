<template>
  <section class="delivery-note">
    <header class="flex items-start gap-2.5">
      <Icon
        name="lucide:webhook"
        class="mt-0.5 h-4 w-4 shrink-0"
        style="color: var(--text-tertiary)"
      />
      <div>
        <h4
          class="text-[13px] font-semibold"
          style="color: var(--text-primary)"
        >
          {{ t('admin.pages.delivery.yalidine.title') }}
        </h4>
        <p
          class="mt-0.5 text-xs leading-relaxed"
          style="color: var(--text-tertiary)"
        >
          {{ t('admin.pages.delivery.yalidine.hint') }}
        </p>
      </div>
    </header>

    <div class="mt-3">
      <label
        class="ui-label"
        for="yalidine-webhook-url"
      >
        {{ t('admin.pages.delivery.yalidine.urlLabel') }}
      </label>
      <div class="flex flex-col gap-2 sm:flex-row">
        <input
          id="yalidine-webhook-url"
          class="ui-input flex-1 font-mono text-xs"
          readonly
          :value="webhookUrl"
          @focus="($event.target as HTMLInputElement).select()"
        >
        <button
          type="button"
          class="ui-btn ui-btn--secondary ui-btn--sm shrink-0"
          @click="copy"
        >
          <Icon
            :name="copied ? 'lucide:check' : 'lucide:copy'"
            class="h-3.5 w-3.5"
          />
          {{ copied ? t('admin.pages.delivery.yalidine.copied') : t('admin.pages.delivery.yalidine.copy') }}
        </button>
      </div>
      <p
        class="mt-1.5 text-[11px] leading-relaxed"
        style="color: var(--text-muted)"
      >
        {{ t('admin.pages.delivery.yalidine.urlHint') }}
      </p>
      <p
        v-if="isLocalOrigin"
        class="mt-1 text-[11px]"
        style="color: var(--status-pending-text)"
      >
        {{ t('admin.pages.delivery.yalidine.localhostNotice') }}
      </p>
      <p
        v-if="copyError"
        class="mt-1 text-[11px]"
        style="color: var(--status-cancelled-text)"
      >
        {{ t('admin.pages.delivery.yalidine.copyFailed') }}
      </p>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <p class="delivery-note__label">
          {{ t('admin.pages.delivery.yalidine.stepsTitle') }}
        </p>
        <ol
          class="mt-1.5 space-y-1 text-xs leading-relaxed"
          style="color: var(--text-secondary)"
        >
          <li
            v-for="(step, i) in steps"
            :key="i"
            class="flex gap-2"
          >
            <span
              class="font-mono-nums shrink-0"
              style="color: var(--text-muted)"
            >{{ i + 1 }}</span>
            <span>{{ step }}</span>
          </li>
        </ol>
      </div>
      <div>
        <p class="delivery-note__label">
          {{ t('admin.pages.delivery.yalidine.eventsTitle') }}
        </p>
        <ul class="mt-1.5 flex flex-wrap gap-1.5">
          <li
            v-for="event in WEBHOOK_EVENTS"
            :key="event"
            class="rounded-md px-1.5 py-0.5 font-mono text-[11px]"
            style="background: var(--surface-3); color: var(--text-secondary)"
          >
            {{ event }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const WEBHOOK_EVENTS = [
  'parcel_created',
  'parcel_edited',
  'parcel_deleted',
  'parcel_status_updated',
  'parcel_payment_updated'
]

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const platformBaseDomain = usePlatformBaseDomain()

const origin = ref('')
const copied = ref(false)
const copyError = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  origin.value = window.location.origin
})

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})

const steps = computed(() => [
  t('admin.pages.delivery.yalidine.steps.open'),
  t('admin.pages.delivery.yalidine.steps.paste'),
  t('admin.pages.delivery.yalidine.steps.secret'),
  t('admin.pages.delivery.yalidine.steps.activate')
])

const isLocalOrigin = computed(() => {
  if (!origin.value) return false
  try {
    const hostname = new URL(origin.value).hostname.toLowerCase()
    return (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname === '::1'
    )
  } catch {
    return false
  }
})

const webhookUrl = computed(() => {
  const tenantSlug = authStore.user?.tenant?.slug
  if (isLocalOrigin.value && tenantSlug) {
    return `https://${tenantSlug}.${platformBaseDomain}/api/webhooks/yalidine`
  }
  return origin.value ? `${origin.value}/api/webhooks/yalidine` : '/api/webhooks/yalidine'
})

async function copy() {
  copyError.value = false
  try {
    await navigator.clipboard.writeText(webhookUrl.value)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 2000)
  } catch {
    copyError.value = true
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

.delivery-note__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}
</style>
