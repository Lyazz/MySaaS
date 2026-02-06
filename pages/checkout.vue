<script setup lang="ts">
import { checkoutTemplates, resolveTemplateKey } from '~/components/storefront/templates/registry'
import type { TemplateKey } from '~/components/storefront/templates/registry'
import { useCartStore } from '~/stores/cart'

const storeSettings = useState<any>('storeSettings')
const templateKey = computed<TemplateKey>(() => resolveTemplateKey(storeSettings.value?.templateKey))

const ActiveTemplate = computed(() => checkoutTemplates[templateKey.value])

const cartStore = useCartStore()
const metaPixel = useMetaPixel()
const checkoutTracked = ref(false)

onMounted(() => {
  cartStore.loadFromLocalStorage()
  if (checkoutTracked.value) return
  if (!cartStore.hasItems) return

  checkoutTracked.value = true

  const currency = storeSettings.value?.currencyCode || 'DZD'
  const contents = cartStore.items.map((item) => ({
    id: item.productId,
    quantity: item.quantity,
    item_price: item.price
  }))
  const pixelIds = Array.from(
    new Set(
      cartStore.items
        .flatMap((i: any) => (Array.isArray(i.metaPixelIds) ? i.metaPixelIds : []))
        .filter((id: any) => typeof id === 'string' && /^[0-9]+$/.test(id))
    )
  )

  metaPixel.initiateCheckout({
    contents,
    numItems: cartStore.itemCount,
    value: cartStore.total,
    currency,
    pixelIds
  })
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
