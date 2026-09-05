<!--
  The right half of the wizard: the merchant's actual storefront, rendered by the
  real template components inside /admin/preview-iframe and fed the unsaved form
  over postMessage. Not a mock -- a second miniature storefront would drift from
  the seventeen themes the moment either side changed.
-->
<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-micro font-semibold uppercase tracking-wide text-tertiary">
          {{ t('admin.pages.onboarding.preview.eyebrow') }}
        </p>
        <p class="truncate text-mini text-muted">{{ storeUrl }}</p>
      </div>

      <div class="flex items-center gap-1 rounded-full p-1 surface-3">
        <button
          v-for="mode in MODES"
          :key="mode.key"
          type="button"
          class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-mini font-medium transition-colors"
          :class="device === mode.key ? 'surface-1 text-primary shadow-card' : 'text-tertiary hover:text-primary'"
          :aria-pressed="device === mode.key"
          @click="device = mode.key"
        >
          <Icon :name="mode.icon" class="h-3.5 w-3.5" />
          {{ t(mode.labelKey) }}
        </button>
      </div>
    </div>

    <div ref="stage" class="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-line surface-3">
      <div
        class="onboarding-preview__frame"
        :class="device === 'mobile' ? 'onboarding-preview__frame--mobile' : 'onboarding-preview__frame--desktop'"
        :style="frameStyle"
      >
        <iframe
          ref="frame"
          :src="iframeSrc"
          class="h-full w-full border-0"
          :title="t('admin.pages.onboarding.preview.eyebrow')"
          @load="onFrameLoad"
        />
        <div
          v-if="!ready"
          class="absolute inset-0 flex items-center justify-center surface-1"
        >
          <div class="h-6 w-6 animate-spin rounded-full border-2 border-transparent [border-bottom-color:var(--brand)]" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  draft: Record<string, any>
  slug: string
}>()

const { t } = useI18n({ useScope: 'global' })

const MODES = [
  { key: 'desktop' as const, icon: 'lucide:monitor', labelKey: 'admin.pages.onboarding.preview.desktop' },
  { key: 'mobile' as const, icon: 'lucide:smartphone', labelKey: 'admin.pages.onboarding.preview.mobile' }
]

// Widths the frame renders at before being scaled down to fit the stage. Scaling
// a real viewport beats resizing one: the storefront's own breakpoints then fire
// exactly as they will on the device.
const FRAME_SIZES = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 }
}

const device = ref<'desktop' | 'mobile'>('desktop')
const stage = ref<HTMLElement | null>(null)
const frame = ref<HTMLIFrameElement | null>(null)
const ready = ref(false)
const scale = ref(1)

const iframeSrc = computed(
  () => `/admin/preview-iframe?template=${encodeURIComponent(props.draft.templateKey || 'modern')}`
)

const storeUrl = computed(() => `${props.slug || 'your-store'}.swekly.com`)

const frameStyle = computed(() => {
  const size = FRAME_SIZES[device.value]
  return {
    width: `${size.width}px`,
    height: `${size.height}px`,
    transform: `scale(${scale.value})`
  }
})

const measure = () => {
  const el = stage.value
  if (!el) return
  const size = FRAME_SIZES[device.value]
  const padding = 32
  const available = { w: el.clientWidth - padding, h: el.clientHeight - padding }
  scale.value = Math.min(available.w / size.width, available.h / size.height, 1)
}

const post = () => {
  const win = frame.value?.contentWindow
  if (!win || !ready.value) return
  win.postMessage(
    { type: 'swekly:onboarding-draft', payload: { ...props.draft, slug: props.slug } },
    window.location.origin
  )
}

const onReadyMessage = (event: MessageEvent) => {
  if (event.origin !== window.location.origin) return
  if (event.data?.type !== 'swekly:preview-ready') return
  ready.value = true
  post()
}

const onFrameLoad = () => {
  // Belt and braces: if the frame's ready ping is missed (fast reload, cached
  // page) the load event still unblocks the first push.
  ready.value = true
  post()
}

// The frame is only reloaded when the theme changes; colour, name, logo and the
// sample product stream in without a reload so typing stays smooth.
watch(() => props.draft.templateKey, () => { ready.value = false })
watch(() => props.draft, post, { deep: true })
watch(device, () => nextTick(measure))

let observer: ResizeObserver | null = null

onMounted(() => {
  window.addEventListener('message', onReadyMessage)
  measure()
  if (stage.value && 'ResizeObserver' in window) {
    observer = new ResizeObserver(measure)
    observer.observe(stage.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onReadyMessage)
  observer?.disconnect()
})
</script>

<style scoped>
.onboarding-preview__frame {
  position: relative;
  overflow: hidden;
  transform-origin: center center;
  background: var(--surface-1);
  transition: box-shadow 200ms ease;
}

.onboarding-preview__frame--desktop {
  border-radius: 12px;
  box-shadow: var(--shadow-overlay);
}

.onboarding-preview__frame--mobile {
  border-radius: 42px;
  border: 10px solid #18181b;
  box-shadow: var(--shadow-overlay);
}
</style>
