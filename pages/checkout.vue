<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Checkout</h1>
        <p class="text-gray-600 mt-1">Complete your order</p>
      </div>

      <!-- Redirect if cart is empty -->
      <div v-if="!cartStore.hasItems" class="bg-white rounded-lg shadow p-12 text-center">
        <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
        <h2 class="mt-4 text-xl font-semibold text-gray-900">Your cart is empty</h2>
        <p class="mt-2 text-gray-600">Add items to your cart before checking out</p>
        <NuxtLink
          to="/products"
          class="inline-block mt-6 px-6 py-3 bg-brand text-white rounded-md hover:opacity-90 transition-colors"
        >
          Browse Products
        </NuxtLink>
      </div>

      <!-- Checkout Form -->
      <form v-else @submit.prevent="handleSubmit" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Customer Information -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
          
          <div class="space-y-4">
            <!-- Full Name -->
            <div>
              <label for="fullName" class="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span class="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                v-model="form.customerName"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                placeholder="John Doe"
              />
            </div>

            <!-- Phone Number -->
            <div>
              <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span class="text-red-500">*</span>
              </label>
              <input
                id="phone"
                v-model="form.customerPhone"
                type="tel"
                required
                pattern="[0-9+\s\-()]+"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                placeholder="+213 555 12 34 56"
              />
              <p class="mt-1 text-xs text-gray-500">We'll call you to confirm your order</p>
            </div>

            <!-- Address -->
            <div>
              <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address <span class="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                v-model="form.customerAddress"
                rows="3"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                placeholder="Street, City, Wilaya"
              />
            </div>

            <!-- Notes (Optional) -->
            <div>
              <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
                Order Notes (Optional)
              </label>
              <textarea
                id="notes"
                v-model="form.notes"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                placeholder="Special delivery instructions..."
              />
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="space-y-6">
          <!-- Items -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <div class="space-y-3 max-h-64 overflow-y-auto">
              <div
                v-for="item in cartStore.items"
                :key="item.productId"
                class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
              >
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{{ item.title }}</p>
                  <p class="text-sm text-gray-500">Qty: {{ item.quantity }} × ${{ item.price.toFixed(2) }}</p>
                </div>
                <p class="font-semibold text-gray-900">${{ (item.price * item.quantity).toFixed(2) }}</p>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div class="flex justify-between text-base">
                <span class="text-gray-600">Subtotal</span>
                <span class="font-medium text-gray-900">${{ cartStore.total.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between text-base">
                <span class="text-gray-600">Payment Method</span>
                <span class="font-medium text-gray-900">Cash on Delivery</span>
              </div>
              <div class="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Total</span>
                <span class="text-brand">${{ cartStore.total.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- Payment Info -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <h3 class="text-sm font-medium text-blue-900">Cash on Delivery</h3>
                <p class="mt-1 text-sm text-blue-700">
                  Pay in cash when you receive your order. No  payment required now.
                </p>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-sm text-red-800">{{ errorMessage }}</p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="submitting"
            class="w-full px-6 py-3 bg-brand text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {{ submitting ? 'Placing Order...' : 'Place Order' }}
          </button>

          <p class="text-xs text-gray-500 text-center">
            By placing your order, you agree to our terms and privacy policy.
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()
const router = useRouter()

const form = ref({
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  notes: ''
})

const errorMessage = ref('')
const submitting = ref(false)

async function handleSubmit() {
  errorMessage.value = ''
  submitting.value = true

  try {
    const orderData = {
      customerName: form.value.customerName,
      customerPhone: form.value.customerPhone,
      customerAddress: form.value.customerAddress,
      notes: form.value.notes || null,
      items: cartStore.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }))
    }

    const response = await $fetch<{ orderId: string }>('/api/orders', {
      method: 'POST',
      body: orderData
    })

    // Clear cart
    cartStore.clearCart()

    // Redirect to success page
    router.push(`/order-success?orderId=${response.orderId}`)
  } catch (error: any) {
    console.error('Failed to place order:', error)
    errorMessage.value = error.data?.statusMessage || 'Failed to place order. Please try again.'
  } finally {
    submitting.value = false
  }
}

// Load cart on mount
onMounted(() => {
  cartStore.loadFromLocalStorage()
})

definePageMeta({
  title: 'Checkout',
  middleware: 'tenant-only'
})
</script>
