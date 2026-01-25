<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <p class="text-gray-600 mt-1">{{ cartStore.itemCount }} item{{ cartStore.itemCount !== 1 ? 's' : '' }} in your cart</p>
      </div>

      <!-- Empty Cart State -->
      <div v-if="!cartStore.hasItems" class="bg-white rounded-lg shadow p-12 text-center">
        <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
        <h2 class="mt-4 text-xl font-semibold text-gray-900">Your cart is empty</h2>
        <p class="mt-2 text-gray-600">Start adding products to your cart!</p>
        <NuxtLink
          to="/products"
          class="inline-block mt-6 px-6 py-3 bg-brand text-white rounded-md hover:opacity-90 transition-colors"
        >
          Browse Products
        </NuxtLink>
      </div>

      <!-- Cart Items -->
      <div v-else class="space-y-4">
        <!-- Items List -->
        <div class="bg-white rounded-lg shadow divide-y">
          <div
            v-for="item in cartStore.items"
            :key="item.productId"
            class="p-6 flex items-center space-x-4"
          >
            <!-- Product Image Placeholder -->
            <div class="flex-shrink-0 w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
              <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>

            <!-- Product Info -->
            <div class="flex-1 min-w-0">
              <NuxtLink :to="`/p/${item.slug}`" class="text-lg font-medium text-gray-900 hover:text-brand">
                {{ item.title }}
              </NuxtLink>
              <p class="text-sm text-gray-500 mt-1">${{ item.price.toFixed(2) }} each</p>
            </div>

            <!-- Quantity Controls -->
            <div class="flex items-center space-x-2">
              <button
                @click="cartStore.updateQuantity(item.productId, item.quantity - 1)"
                :disabled="item.quantity === 1"
                class="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                </svg>
              </button>
              <span class="w-12 text-center font-medium">{{ item.quantity }}</span>
              <button
                @click="cartStore.updateQuantity(item.productId, item.quantity + 1)"
                :disabled="item.quantity >= item.stock"
                class="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
              </button>
            </div>

            <!-- Item Total -->
            <div class="text-right">
              <p class="text-lg font-semibold text-gray-900">${{ (item.price * item.quantity).toFixed(2) }}</p>
            </div>

            <!-- Remove Button -->
            <button
              @click="cartStore.removeItem(item.productId)"
              class="text-red-600 hover:text-red-800"
              title="Remove from cart"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Cart Summary -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="space-y-3">
            <div class="flex justify-between text-base">
              <span class="text-gray-600">Subtotal</span>
              <span class="font-medium text-gray-900">${{ cartStore.total.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-base">
              <span class="text-gray-600">Shipping</span>
              <span class="font-medium text-gray-900">Cash on Delivery</span>
            </div>
            <div class="border-t pt-3 flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span class="text-brand">${{ cartStore.total.toFixed(2) }}</span>
            </div>
          </div>

          <div class="mt-6 space-y-3">
            <NuxtLink
              to="/checkout"
              class="block w-full px-6 py-3 bg-brand text-white text-center rounded-md hover:opacity-90 transition-colors font-medium"
            >
              Proceed to Checkout
            </NuxtLink>
            <NuxtLink
              to="/products"
              class="block w-full px-6 py-3 border border-gray-300 text-gray-700 text-center rounded-md hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cartStore = useCartStore()

// Load cart from localStorage on mount
onMounted(() => {
  cartStore.loadFromLocalStorage()
})

definePageMeta({
  title: 'Shopping Cart',
  middleware: 'tenant-only'
})
</script>
