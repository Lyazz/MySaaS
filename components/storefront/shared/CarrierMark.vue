<!-- Keep exactly one root node per branch: each theme passes its own sizing
     (w-5 h-5, style="width:13px", …) as fallthrough attributes, and a stray
     comment inside <template> would make this a fragment and drop them. -->
<template>
  <img
    v-if="logo"
    :src="logo"
    :alt="alt || ''"
    class="carrier-mark"
    :style="{ background: tile }"
    loading="lazy"
    decoding="async"
    @error="artFailed = true"
  >
  <Icon
    v-else
    :name="icon"
  />
</template>

<script setup lang="ts">
import { carrierBrand } from '~/shared/delivery/carrier-brand'

const props = withDefaults(
  defineProps<{
    /** ShipmentProvider key, or null for non-carrier options like store pickup. */
    provider?: string | null
    /** The theme's own icon, kept as the fallback when a carrier has no artwork. */
    icon?: string
    alt?: string
  }>(),
  { provider: null, icon: 'lucide:truck', alt: '' }
)

const artFailed = ref(false)

watch(() => props.provider, () => (artFailed.value = false))

const brand = computed(() => carrierBrand(props.provider))
const logo = computed(() => (artFailed.value ? undefined : brand.value?.logo))
const tile = computed(() => brand.value?.tile)
</script>

<style scoped>
.carrier-mark {
  object-fit: contain;
  border-radius: 0.25rem;
}
</style>
