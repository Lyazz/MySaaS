<template>
  <div class="max-w-7xl mx-auto">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">
        Welcome back!
      </h2>
      <p class="text-gray-600 mt-1">
        Here's what's happening with your store
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div class="bg-white p-6 rounded-lg shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">
              Total Products
            </p>
            <p class="text-3xl font-bold text-gray-800 mt-1">
              {{ stats.productsCount }}
            </p>
          </div>
          <div class="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
            <Icon name="lucide:package" class="w-6 h-6 text-teal-600" />
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">
              Categories
            </p>
            <p class="text-3xl font-bold text-gray-800 mt-1">
              {{ stats.categoriesCount }}
            </p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Icon name="lucide:shapes" class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">
              Orders
            </p>
            <p class="text-3xl font-bold text-gray-800 mt-1">
              {{ stats.ordersCount }}
            </p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon name="lucide:clipboard-list" class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-white p-6 rounded-lg shadow">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">
        Quick Actions
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NuxtLink 
          to="/admin/products/create" 
          class="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors group"
        >
          <div class="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200">
            <Icon name="lucide:plus" class="w-6 h-6 text-teal-600" />
          </div>
          <div class="ml-4">
            <p class="font-medium text-gray-800">
              Add New Product
            </p>
            <p class="text-sm text-gray-600">
              Create a new product listing
            </p>
          </div>
        </NuxtLink>

        <NuxtLink 
          to="/admin/categories" 
          class="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
        >
          <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
            <Icon name="lucide:shapes" class="w-6 h-6 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="font-medium text-gray-800">
              Manage Categories
            </p>
            <p class="text-sm text-gray-600">
              Organize your products
            </p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Dashboard'
})

const authStore = useAuthStore()

const stats = ref({
  productsCount: 0,
  categoriesCount: 0,
  ordersCount: 0
})

// Fetch stats on mount
onMounted(async () => {
  try {
    const [products, categories, orders] = await Promise.all([
      $fetch('/api/admin/products', {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      }),
      $fetch('/api/admin/categories', {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      }),
      $fetch('/api/admin/orders', {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      }).catch(() => []) // Orders might not exist yet
    ])

    stats.value = {
      productsCount: Array.isArray(products) ? products.length : 0,
      categoriesCount: Array.isArray(categories) ? categories.length : 0,
      ordersCount: Array.isArray(orders) ? orders.length : 0
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }
})
</script>
