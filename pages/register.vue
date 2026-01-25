<script setup lang="ts">
import { ref, watch } from 'vue'

definePageMeta({
  middleware: 'saas-only',
  layout: 'marketing',
  title: 'Register'
})

const form = ref({
  name: '',
  slug: '',
  email: '',
  password: ''
})

const loading = ref(false)
const error = ref('')
const successData = ref<any>(null)

// Auto-generate slug from name
watch(() => form.value.name, (newName) => {
  if (!successData.value) { // Stop updating if already success
    form.value.slug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Trim hyphens
  }
})

async function register() {
  loading.value = true
  error.value = ''
  successData.value = null

  try {
    const data = await $fetch('/api/register', {
      method: 'POST',
      body: form.value
    })
    successData.value = data
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'An error occurred during registration.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded shadow">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Start your SaaS Journey
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Create your own tenant workspace in seconds.
        </p>
      </div>
      
      <div v-if="successData" class="rounded-md bg-green-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <!-- Icon -->
            <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">
              Registration Successful!
            </h3>
            <div class="mt-2 text-sm text-green-700">
              <p>Your tenant <strong>{{ successData.tenant.name }}</strong> is ready.</p>
              <p class="mt-2">
                <a :href="successData.tenant.url" class="font-bold underline hover:text-green-600">
                  Go to {{ successData.tenant.url }}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <form v-else class="mt-8 space-y-6" @submit.prevent="register">
        <div class="rounded-md shadow-sm -space-y-px">
          <div class="mb-4">
            <label for="company-name" class="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input 
                id="company-name" 
                v-model="form.name" 
                name="name" 
                type="text" 
                required 
                class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                placeholder="Acme Corp"
            >
          </div>
          <div class="mb-4">
            <label for="slug" class="block text-sm font-medium text-gray-700 mb-1">Subdomain (URL)</label>
            <div class="flex rounded-md shadow-sm">
                 <input 
                    id="slug" 
                    v-model="form.slug" 
                    name="slug" 
                    type="text" 
                    required 
                    class="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300"
                    placeholder="acme"
                >
                <span class="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                  .localhost
                </span>
            </div>
             <p class="mt-1 text-xs text-gray-500">Only lowercase letters, numbers, and hyphens.</p>
          </div>
          <div class="mb-4">
            <label for="email-address" class="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
            <input 
                id="email-address" 
                v-model="form.email" 
                name="email" 
                type="email" 
                autocomplete="email" 
                required 
                class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                placeholder="admin@example.com"
            >
          </div>
          <div class="mb-4">
             <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
                id="password" 
                v-model="form.password" 
                name="password" 
                type="password" 
                autocomplete="current-password" 
                required 
                class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                placeholder="**********"
            >
          </div>
        </div>

        <div v-if="error" class="text-red-500 text-sm text-center">
            {{ error }}
        </div>

        <div>
          <button 
            type="submit" 
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <span v-if="loading">Creating Account...</span>
            <span v-else>Register & Create Tenant</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
