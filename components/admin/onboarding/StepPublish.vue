<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-semibold text-primary">
        {{ published ? t('admin.pages.onboarding.publish.liveTitle') : t('admin.pages.onboarding.publish.title') }}
      </h2>
      <p class="mt-1 text-sm text-secondary">
        {{ published ? t('admin.pages.onboarding.publish.liveSubtitle') : t('admin.pages.onboarding.publish.subtitle') }}
      </p>
    </div>

    <!-- What the merchant built, in the order they built it. -->
    <dl class="grid grid-cols-2 gap-2">
      <div class="rounded-xl border border-line p-3">
        <dt class="text-micro uppercase tracking-wide text-tertiary">{{ t('admin.pages.onboarding.steps.template') }}</dt>
        <dd class="mt-0.5 truncate text-sm font-semibold capitalize text-primary">{{ draft.templateKey }}</dd>
      </div>
      <div class="rounded-xl border border-line p-3">
        <dt class="text-micro uppercase tracking-wide text-tertiary">{{ t('admin.pages.onboarding.steps.brandColor') }}</dt>
        <dd class="mt-0.5 flex items-center gap-2">
          <span class="h-4 w-4 rounded-full border border-line" :style="{ background: draft.primaryColor }" />
          <span class="truncate text-sm font-semibold text-primary font-mono-nums">{{ draft.primaryColor }}</span>
        </dd>
      </div>
      <div class="rounded-xl border border-line p-3">
        <dt class="text-micro uppercase tracking-wide text-tertiary">{{ t('admin.pages.onboarding.steps.firstProduct') }}</dt>
        <dd class="mt-0.5 truncate text-sm font-semibold text-primary">
          {{ draft.product.name || t('admin.pages.onboarding.publish.noProduct') }}
        </dd>
      </div>
      <div class="rounded-xl border border-line p-3">
        <dt class="text-micro uppercase tracking-wide text-tertiary">{{ t('admin.pages.onboarding.steps.delivery') }}</dt>
        <dd class="mt-0.5 truncate text-sm font-semibold text-primary">
          {{ deliverySummary || t('admin.pages.onboarding.publish.noDelivery') }}
        </dd>
      </div>
    </dl>

    <div class="rounded-2xl border border-line p-4 surface-2">
      <p class="text-micro uppercase tracking-wide text-tertiary">
        {{ t('admin.pages.onboarding.done.storeUrlLabel') }}
      </p>
      <div class="mt-1 flex items-center gap-2">
        <p class="min-w-0 flex-1 truncate text-sm font-semibold text-primary font-mono-nums">{{ storeUrl }}</p>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-mini text-tertiary hover:text-primary bg-hover"
          @click="copyUrl"
        >
          {{ copied ? t('admin.common.copied') : t('admin.common.copy') }}
        </button>
      </div>
      <p class="mt-2 text-mini" :class="published ? 'text-success' : 'text-muted'">
        {{ published
          ? t('admin.pages.onboarding.publish.statusLive')
          : t('admin.pages.onboarding.publish.statusDraft') }}
      </p>
    </div>

    <!--
      Naming what is missing, with a way back to fix it. A disabled button with
      no explanation is where merchants abandon setup.
    -->
    <div v-if="!published && missing.length" class="space-y-2">
      <p class="text-sm font-medium text-primary">{{ t('admin.pages.onboarding.publish.blockedTitle') }}</p>
      <button
        v-for="item in missing"
        :key="item"
        type="button"
        class="flex w-full items-center gap-2.5 rounded-xl border border-line p-3 text-start hover:border-line-strong"
        @click="emit('fix', item)"
      >
        <Icon name="lucide:circle-alert" class="h-4 w-4 shrink-0 text-warning" />
        <span class="flex-1 text-sm text-secondary">
          {{ t(`admin.pages.onboarding.publish.missing.${item}`) }}
        </span>
        <Icon name="lucide:arrow-right" class="h-4 w-4 shrink-0 text-tertiary rtl:rotate-180" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OnboardingDraft } from './types'

const props = defineProps<{
  draft: OnboardingDraft
  slug: string
  published: boolean
  missing: string[]
}>()

const emit = defineEmits<{ fix: [step: string] }>()
const { t } = useI18n({ useScope: 'global' })

const copied = ref(false)
const storeUrl = computed(() => `https://${props.slug || 'your-store'}.swekly.com`)

const deliverySummary = computed(() => {
  const parts = props.draft.deliveryProviders.map((p) =>
    t(`admin.pages.onboarding.delivery.options.${p}.label`)
  )
  if (props.draft.storePickupEnabled) parts.push(t('admin.pages.onboarding.delivery.options.PICKUP.label'))
  return parts.join(', ')
})

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(storeUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1600)
  } catch {
    // Clipboard is blocked in some embedded contexts; the URL is on screen anyway.
  }
}
</script>
