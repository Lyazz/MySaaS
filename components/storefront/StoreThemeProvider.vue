<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const storeSettings = useState<any>('storeSettings')

const isRtl = computed(() => storeSettings.value?.language === 'ar')

useHead(() => ({
  htmlAttrs: {
    dir: isRtl.value ? 'rtl' : 'ltr',
    lang: storeSettings.value?.language || 'fr'
  }
}))

const storeStyle = computed(() => {
  const primaryColor = storeSettings.value?.primaryColor || '#4F46E5'
  const fontFamily = storeSettings.value?.fontFamily || 'Inter'
  return {
    '--brand': primaryColor,
    fontFamily: `'${fontFamily}', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`
  } as Record<string, string>
})

onMounted(() => {
  cartStore.loadFromLocalStorage()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-600" :style="storeStyle">
    <slot />
  </div>
</template>

