<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-3xl mx-auto px-4 text-center">
      <!-- Success Icon -->
      <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
        <svg
          class="w-10 h-10 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
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
        v-if="orderId"
        class="bg-white rounded-lg shadow p-6 mb-8"
      >
        <p class="text-sm text-gray-600 mb-1">
          Order ID
        </p>
        <p class="text-2xl font-mono font-semibold text-brand">
          {{ orderId }}
        </p>
      </div>

      <!-- Order Details -->
      <div class="bg-white rounded-lg shadow p-6 text-left mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          What's Next?
        </h2>
        <div class="space-y-3">
          <div class="flex items-start">
            <svg
              class="w-6 h-6 text-brand mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
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
            <svg
              class="w-6 h-6 text-brand mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
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
            <svg
              class="w-6 h-6 text-brand mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
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
          <svg
            class="w-5 h-5 text-blue-600 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
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
const route = useRoute()
const orderId = ref<string | null>(null)

onMounted(() => {
  orderId.value = route.query.orderId as string || null
})

definePageMeta({
  title: 'Order Success',
  middleware: 'tenant-only',
  layout: 'store'
})
</script>
