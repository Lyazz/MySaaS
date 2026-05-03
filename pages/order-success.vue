<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-3xl mx-auto px-4 text-center">
      <!-- Success Icon -->
      <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
        <Icon name="lucide:check" class="w-10 h-10 text-green-600" />
      </div>

      <!-- Success Message -->
      <h1 class="text-3xl font-bold text-gray-900 mb-3">
        Order Placed Successfully!
      </h1>
      <p class="text-lg text-gray-600 mb-8">
        Thank you for your order. We'll contact you shortly to confirm.
      </p>

      <!-- Order Info -->
      <div
        v-if="displayOrderId"
        class="bg-white rounded-lg shadow p-6 mb-8"
      >
        <p class="text-sm text-gray-600 mb-1">
          Order ID
        </p>
        <p class="text-2xl font-mono font-semibold text-brand">
          {{ displayOrderId }}
        </p>
      </div>

      <!-- Order Details -->
      <div class="bg-white rounded-lg shadow p-6 text-left mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          What's Next?
        </h2>
        <div class="space-y-3">
          <div class="flex items-start">
            <Icon name="lucide:phone" class="w-6 h-6 text-brand mr-3 flex-shrink-0" />
            <div>
              <p class="font-medium text-gray-900">
                We'll call you soon
              </p>
              <p class="text-sm text-gray-600">
                Our team will contact you to confirm your order and delivery details.
              </p>
            </div>
          </div>

          <div class="flex items-start">
            <Icon name="lucide:package" class="w-6 h-6 text-brand mr-3 flex-shrink-0" />
            <div>
              <p class="font-medium text-gray-900">
                We'll prepare your order
              </p>
              <p class="text-sm text-gray-600">
                Once confirmed, we'll prepare your items for delivery.
              </p>
            </div>
          </div>

          <div class="flex items-start">
            <Icon name="lucide:truck" class="w-6 h-6 text-brand mr-3 flex-shrink-0" />
            <div>
              <p class="font-medium text-gray-900">
                Delivery on the way
              </p>
              <p class="text-sm text-gray-600">
                Your order will be delivered to your address. Pay in cash when you receive it.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Info -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div class="flex items-center justify-center">
          <Icon name="lucide:banknote" class="w-5 h-5 text-blue-600 mr-2" />
          <p class="text-sm font-medium text-blue-900">
            Payment: Cash on Delivery - Pay when you receive your order
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <NuxtLink
          to="/products"
          class="px-6 py-3 bg-brand text-white rounded-md hover:opacity-90 transition-colors font-medium"
        >
          Continue Shopping
        </NuxtLink>
        <NuxtLink
          to="/"
          class="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
        >
          Back to Home
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTenantApiUrl } from '~/composables/useTenantApi'

const route = useRoute()
const internalOrderId = ref<string | null>(null)
const displayOrderId = ref<string | null>(null)
const metaPixel = useMetaPixel()

onMounted(() => {
  internalOrderId.value = route.query.orderId as string || null
  displayOrderId.value = route.query.publicOrderId as string || null

  const id = internalOrderId.value
  if (!id) return

  $fetch(useTenantApiUrl(`/api/orders/${encodeURIComponent(id)}/pixel`))
    .then((payload: any) => {
      if (!payload) return
      displayOrderId.value = payload.publicOrderId || displayOrderId.value || id
      const contents = Array.isArray(payload.contents) ? payload.contents : []
      metaPixel.purchase({
        orderId: id,
        contents,
        value: typeof payload.value === 'number' ? payload.value : undefined,
        currency: typeof payload.currency === 'string' ? payload.currency : undefined,
        pixelIds: Array.isArray(payload.pixelIds) ? payload.pixelIds : undefined
      })
    })
    .catch(() => {
      displayOrderId.value = displayOrderId.value || id
    })
})

definePageMeta({
  title: 'Order Success',
  middleware: 'tenant-only',
  layout: 'store'
})
</script>
