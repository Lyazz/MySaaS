<template>
  <span
    class="carrier-logo"
    :class="[`is-${size}`, showImage ? 'has-art' : toneClass]"
    :style="showImage ? { background: brand.tile } : undefined"
  >
    <img
      v-if="showImage"
      :src="brand.logo"
      :alt="name"
      class="carrier-logo__img"
      loading="lazy"
      decoding="async"
      @error="artFailed = true"
    >
    <Icon
      v-else
      :name="brand.icon"
      class="carrier-logo__icon"
    />
  </span>
</template>

<script setup lang="ts">
import { carrierBrand, type CarrierBrand } from '~/shared/delivery/carrier-brand'

const FALLBACK: CarrierBrand = { icon: 'lucide:truck' }

const props = withDefaults(
  defineProps<{
    provider: string
    name: string
    /** Muted plate for carriers that are not connected yet. */
    muted?: boolean
    size?: 'sm' | 'md'
  }>(),
  { muted: false, size: 'sm' }
)

const artFailed = ref(false)

watch(() => props.provider, () => (artFailed.value = false))

const brand = computed(() => carrierBrand(props.provider) ?? FALLBACK)
const showImage = computed(() => Boolean(brand.value.logo) && !artFailed.value)
const toneClass = computed(() => (props.muted ? 'tone-slate' : 'tone-brand'))
</script>

<style scoped>
.carrier-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 0.625rem;
}

.carrier-logo.is-sm {
  width: 1.875rem;
  height: 1.875rem;
}

.carrier-logo.is-md {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.75rem;
}

/* Brand plates are supplied by the logo itself — a hairline keeps a white
   plate from bleeding into the light-mode card behind it. */
.carrier-logo.has-art {
  box-shadow: inset 0 0 0 1px var(--surface-border);
}

.carrier-logo__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.carrier-logo__icon {
  width: 1rem;
  height: 1rem;
}

.is-md .carrier-logo__icon {
  width: 1.125rem;
  height: 1.125rem;
}

.tone-brand {
  background: var(--accent-soft);
  color: var(--brand);
}

.tone-slate {
  background: var(--surface-3);
  color: var(--text-tertiary);
}
</style>
