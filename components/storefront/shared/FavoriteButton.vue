<script setup lang="ts">
const props = defineProps<{
  productId: string
  buttonClass?: string
  buttonStyle?: any
  iconClass?: string
  activeClass?: string
  inactiveClass?: string
}>()

const storefrontContent = useStorefrontContent()
const favorites = useFavorites()
const { showToast } = useToast()

const active = computed(() => favorites.isFavorite(props.productId))
const label = computed(() =>
  active.value ? storefrontContent.value.actions.removeFromWishlist : storefrontContent.value.actions.addToWishlist
)

const onToggle = () => {
  const { isFavorite } = favorites.toggle(props.productId)
  const message = isFavorite
    ? storefrontContent.value.toasts.addedToWishlist.message
    : storefrontContent.value.toasts.removedFromWishlist.message
  showToast(message, isFavorite ? 'success' : 'info')
}
</script>

<template>
  <button
    type="button"
    :title="label"
    :aria-label="label"
    :aria-pressed="active ? 'true' : 'false'"
    :style="buttonStyle"
    :class="[
      'inline-flex items-center justify-center select-none',
      active ? (activeClass || 'text-red-600') : (inactiveClass || 'text-slate-700'),
      buttonClass
    ]"
    @click.stop.prevent="onToggle"
  >
    <Icon name="lucide:heart" :class="['w-4 h-4', iconClass]" />
  </button>
</template>
