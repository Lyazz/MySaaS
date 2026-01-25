<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
// Import generic/classic component if exists, or fallback
// Assuming we only have the new Modern one for now as primary goal, 
// but sticking to pattern:
import ModernCheckout from '~/components/storefront/templates/ModernCheckout.vue'

// If you had a classic component you would import it here. 
// For now, since the user complaint was specific to checkout, we prioritize the new Modern one.
// We can duplicate the old code into a ClassicCheckout.vue if needed later.

const storeSettings = useState<any>('storeSettings')
const templateKey = computed(() => storeSettings.value?.templateKey || 'modern')

// Just using ModernCheckout directly for now if 'modern', or could just enforce it.
// To keep pattern:
const ActiveTemplate = computed(() => {
    // Return ModernCheckout for now as default/modern
    return ModernCheckout
})

definePageMeta({
  title: 'Checkout',
  middleware: 'tenant-only',
  layout: 'store'
})
</script>

<template>
  <component :is="ActiveTemplate" />
</template>
