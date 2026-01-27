<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div v-if="!cartStore.hasItems" class="text-center py-24">
        <div class="mx-auto h-48 w-48 bg-gray-100 rounded-full flex items-center justify-center mb-8">
          <svg class="h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
          </svg>
        </div>
        <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">Your cart is empty</h2>
        <p class="mt-4 max-w-2xl mx-auto text-xl text-gray-500">Looks like you haven't added anything to your cart yet.</p>
        <div class="mt-10">
          <NuxtLink
            to="/products"
            class="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-brand hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition-all duration-200"
          >
            Start Shopping
          </NuxtLink>
        </div>
      </div>

      <div v-else class="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
        <section class="lg:col-span-7">
          <div class="flex items-center justify-between border-b border-gray-200 pb-6 mb-6">
             <h1 class="text-3xl font-bold tracking-tight text-gray-900">Shopping Cart</h1>
             <span class="text-gray-500 text-sm font-medium">{{ cartStore.itemCount }} items</span>
          </div>

          <ul role="list" class="space-y-6">
            <TransitionGroup name="list">
              <li v-for="item in cartStore.items" :key="item.productId" class="flex py-6 sm:py-8 px-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div class="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                   <img v-if="item.image" :src="item.image" :alt="item.title" class="h-full w-full object-cover object-center" />
                   <div v-else class="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                      <svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                   </div>
                </div>

                <div class="ml-6 flex flex-1 flex-col">
                  <div class="flex justify-between">
                    <div class="min-w-0 flex-1">
                      <h3 class="text-lg font-medium text-gray-900 hover:text-brand transition-colors">
                        <NuxtLink :to="`/p/${item.slug}`">{{ item.title }}</NuxtLink>
                      </h3>
                      <p class="mt-1 text-sm text-gray-500 line-clamp-1">Category / Variant placeholder</p>
                    </div>
                    <div class="ml-4 flow-root flex-shrink-0">
                      <button
                        type="button"
                        @click="cartStore.removeItem(item.productId)"
                        class="-m-2.5 flex items-center justify-center bg-transparent p-2.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <span class="sr-only">Remove</span>
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div class="flex flex-1 items-end justify-between pt-4">
                    <p class="text-xl font-bold text-gray-900">${{ item.price.toFixed(2) }}</p>

                    <div class="flex items-center space-x-3 bg-gray-50 rounded-full px-3 py-1 border border-gray-200">
                      <button
                         @click="cartStore.updateQuantity(item.productId, item.quantity - 1)"
                         :disabled="item.quantity <= 1"
                         class="p-1 rounded-full text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                      >
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                      </button>
                      <span class="text-gray-900 font-semibold w-6 text-center text-sm">{{ item.quantity }}</span>
                       <button
                         @click="cartStore.updateQuantity(item.productId, item.quantity + 1)"
                         :disabled="item.quantity >= item.stock"
                         class="p-1 rounded-full text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                      >
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            </TransitionGroup>
          </ul>
        </section>

        <!-- Order Summary -->
        <section aria-labelledby="summary-heading" class="mt-16 bg-white rounded-2xl shadow-lg border border-gray-100 px-6 py-8 sm:p-10 lg:col-span-5 lg:mt-0 lg:sticky lg:top-8">
          <h2 id="summary-heading" class="text-2xl font-bold text-gray-900">Order summary</h2>

          <div class="mt-8 space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-4">
              <dt class="text-base text-gray-600">Subtotal</dt>
              <dd class="text-base font-medium text-gray-900">${{ cartStore.total.toFixed(2) }}</dd>
            </div>
            <div class="flex items-center justify-between border-b border-gray-100 pb-4">
               <dt class="flex text-base text-gray-600 items-center">
                  <span>Shipping estimate</span>
               </dt>
               <dd class="text-sm font-medium text-gray-500">Calculated at checkout</dd>
            </div>
             <div class="flex items-center justify-between border-b border-gray-100 pb-4">
              <dt class="text-base text-gray-600">Tax estimate</dt>
              <dd class="text-base font-medium text-gray-900">$0.00</dd>
            </div>
            <div class="flex items-center justify-between pt-4">
              <dt class="text-xl font-bold text-gray-900">Order total</dt>
              <dd class="text-2xl font-bold text-brand">${{ cartStore.total.toFixed(2) }}</dd>
            </div>
          </div>

          <div class="mt-10 space-y-4">
            <NuxtLink
              to="/checkout"
              class="w-full flex items-center justify-center rounded-full border border-transparent bg-brand px-6 py-4 text-base font-bold text-white shadow-sm hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-all shadow-brand/20 hover:shadow-brand/40"
            >
              Checkout
            </NuxtLink>
            
             <NuxtLink
               to="/products"
               class="w-full flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-4 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-all"
             >
               Continue Shopping
             </NuxtLink>
          </div>
          

        </section>
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
  middleware: 'tenant-only',
  layout: 'store'
})
</script>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
}
</style>
