<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="p-6 md:p-8">
        <h2 class="text-xl font-bold text-slate-900">
          Appearance Settings
        </h2>
        <p class="text-slate-600 mt-2 max-w-2xl">
          Customize the look and feel of your storefront. These settings affect how your store appears to customers.
        </p>
      </div>
    </div>

    <!-- Form -->
    <form @submit.prevent="save" class="space-y-6">
      
      <!-- Store Identity -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold text-gray-900">
              Store Identity
            </h3>
            <p class="mt-2 text-sm text-gray-500 leading-relaxed">
              Your store's public name and URL address.
            </p>
          </div>
          
          <div class="mt-6 md:mt-0 md:col-span-2 space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="My Awesome Store"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">URL Slug</label>
              <div class="flex rounded-md shadow-sm border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
                <input
                  v-model="form.slug"
                  type="text"
                  required
                  pattern="^[a-z0-9-]+$"
                  class="flex-1 block w-full px-3 py-2 border-none focus:ring-0 text-sm text-right"
                  placeholder="my-store"
                  @input="handleSlugInput"
                >
                <span class="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-l border-gray-300">
                  .{{ baseDomain }}
                </span>
              </div>
              <p class="mt-2 text-xs text-gray-500">
                Only lowercase letters, numbers, and hyphens. Changing this will change your store's URL.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Brand Logo -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold text-slate-900">
              Brand Logo
            </h3>
            <p class="mt-2 text-sm text-slate-500 leading-relaxed">
              This logo will be displayed on your storefront header, checkout page, and invoice emails.
            </p>
            
            <div class="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Guidelines</h4>
              <ul class="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li><strong>Square image required (1:1)</strong></li>
                <li>PNG format only</li>
                <li>Transparent background recommended</li>
                <li>Max file size: 2MB</li>
              </ul>
            </div>
          </div>
          
          <div class="mt-6 md:mt-0 md:col-span-2">
            <SingleImageUploader
              v-model="form.logoUrl"
              label="Store Logo"
              hint="Upload your brand logo here."
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Brand Colors -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold text-slate-900">
              Brand Colors
            </h3>
            <p class="mt-2 text-sm text-slate-500 leading-relaxed">
              Define the primary color for your brand. This color will be used for buttons, links, and important highlights.
            </p>
          </div>
          
          <div class="mt-6 md:mt-0 md:col-span-2 space-y-6">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Primary Color</label>
              <div class="flex flex-wrap items-center gap-4">
                <div class="relative flex items-center">
                  <input
                    v-model="form.primaryColor"
                    type="color"
                    class="h-12 w-12 rounded-lg border border-slate-200 p-1 cursor-pointer shadow-sm transition-transform hover:scale-105"
                  >
                </div>
                <div class="flex-1 min-w-[120px]">
                  <input
                    v-model="form.primaryColor"
                    type="text"
                    pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                    class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm font-mono uppercase"
                    placeholder="#4F46E5"
                  >
                </div>
              </div>
            </div>

            <!-- Preview Component -->
            <div class="rounded-xl border border-slate-200 overflow-hidden">
              <div class="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Preview</span>
              </div>
              <div class="p-6 bg-white space-y-6">
                 <!-- Button Preview -->
                 <div class="flex flex-wrap gap-4 items-center">
                    <button
                      type="button"
                      class="px-5 py-2.5 rounded-lg text-white font-medium shadow-sm transition-opacity hover:opacity-90 flex items-center gap-2"
                      :style="{ backgroundColor: form.primaryColor }"
                    >
                      <span>Primary Button</span>
                      <Icon name="lucide:arrow-right" class="w-4 h-4" />
                    </button>
                    
                    <button
                      type="button"
                      class="px-5 py-2.5 rounded-lg border font-medium shadow-sm bg-white transition-colors"
                      :style="{ borderColor: form.primaryColor, color: form.primaryColor }"
                    >
                      Secondary Button
                    </button>
                    
                    <a href="#" class="font-medium hover:underline" :style="{ color: form.primaryColor }">Text Link</a>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Template Selection -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 md:p-8 md:grid md:grid-cols-3 md:gap-8">
          <div class="md:col-span-1">
            <h3 class="text-lg font-semibold text-slate-900">
              Store Template
            </h3>
            <p class="mt-2 text-sm text-slate-500 leading-relaxed">
              Choose the layout structure for your storefront. You can switch anytime without losing data.
            </p>
          </div>
          
          <div class="mt-6 md:mt-0 md:col-span-2">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="t in templates"
                :key="t.key"
                class="group relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ease-in-out hover:border-teal-500 hover:shadow-md"
                :class="form.templateKey === t.key ? 'border-teal-500 bg-teal-50/10 ring-1 ring-teal-500' : 'border-slate-200 bg-white hover:bg-slate-50'"
                @click="form.templateKey = t.key"
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="p-2 rounded-lg" :class="form.templateKey === t.key ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600'">
                     <Icon :name="t.icon" class="w-6 h-6" />
                  </div>
                  <div v-if="form.templateKey === t.key" class="text-teal-600">
                    <Icon name="lucide:check-circle-2" class="w-6 h-6" />
                  </div>
                </div>
                
                <h4 class="font-semibold text-slate-900 mb-1">{{ t.label }}</h4>
                <p class="text-sm text-slate-500 leading-relaxed">
                  {{ t.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-6 right-6 md:static md:flex md:justify-end">
         <div class="bg-white md:bg-transparent p-2 md:p-0 rounded-full shadow-lg md:shadow-none border md:border-none border-slate-200 flex items-center gap-3">
            <div
              v-if="successMessage"
              class="hidden md:block text-sm text-emerald-600 font-medium animate-fadeIn px-3"
            >
              {{ successMessage }}
            </div>
            <div
              v-if="errorMessage"
              class="hidden md:block text-sm text-red-600 font-medium animate-fadeIn px-3"
            >
              {{ errorMessage }}
            </div>
            
            <button
              type="button"
              class="hidden md:px-5 md:py-2.5 border border-slate-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 md:inline-flex"
              :disabled="loading || saving"
              @click="reset"
            >
              Discard Changes
            </button>
            
            <button
              type="submit"
              class="inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
              :disabled="loading || saving"
            >
              <Icon
                v-if="saving"
                name="lucide:loader-2"
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              />
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
         </div>
      </div>
      
      <!-- Mobile Notifications (Toast style) -->
      <div v-if="successMessage || errorMessage" class="md:hidden fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4">
        <div class="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
           <span class="text-sm font-medium">{{ successMessage || errorMessage }}</span>
           <button @click="successMessage = ''; errorMessage = ''" class="ml-4 text-slate-400 hover:text-white">
             <Icon name="lucide:x" class="w-4 h-4" />
           </button>
        </div>
      </div>

    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SingleImageUploader from './SingleImageUploader.vue'

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const form = reactive({
  name: '',
  slug: '',
  logoUrl: null as string | null,
  primaryColor: '#0F766E', // Default to teal
  templateKey: 'classic'
})

const baseDomain = ref('')

onMounted(() => {
  if (typeof window !== 'undefined') {
    const host = window.location.host
    if (host.includes('localhost')) {
      baseDomain.value = 'localhost:3000'
    } else {
      // Assuming the platform domain is the last two parts for now, or use 'swekly.com' as hinted
      // But for generic SaaS, usually it's the root domain.
      // Let's try to strip the current subdomain if it exists.
      const parts = host.split('.')
      if (parts.length > 2) {
         baseDomain.value = parts.slice(1).join('.')
      } else {
         baseDomain.value = host
      }
    }
  }
  fetchSettings()
})

const templates = [
  { 
    key: 'classic', 
    label: 'Classic Shop', 
    description: 'Traditional e-commerce layout optimized for large product catalogs.',
    icon: 'lucide:layout-grid'
  },
  { 
    key: 'modern', 
    label: 'Modern Minimal', 
    description: 'Clean, spacious design with large imagery and bold typography.',
    icon: 'lucide:layout-template'
  },
  { 
    key: 'street', 
    label: 'Street Urban', 
    description: 'High-energy, bold layout with high-contrast elements and urban aesthetics.',
    icon: 'lucide:zap'
  },
  { 
    key: 'cozy', 
    label: 'Cozy Warm', 
    description: 'Soft, minimalist design with warm colors and elegant typography.',
    icon: 'lucide:coffee'
  },
  { 
    key: 'cyber', 
    label: 'Cyber Future', 
    description: 'Futuristic dark mode with neon accents and high-tech UI components.',
    icon: 'lucide:cpu'
  }
]

const handleSlugInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  // Force lowercase and replace spaces/invalid chars with hyphens if desired, 
  // or just filter out invalid chars. Here we just simple filter for valid slug chars.
  form.slug = target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

const updateForm = (data: any) => {
  if (!data) return
  form.name = data.name || ''
  form.slug = data.slug || ''
  form.logoUrl = data.logoUrl || null
  form.primaryColor = data.primaryColor || '#0F766E'
  form.templateKey = data.templateKey || 'classic'
}

const fetchSettings = async () => {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/admin/store-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    updateForm(data)
  } catch (e) {
    console.error('Failed to load settings', e)
    errorMessage.value = 'Failed to load settings.'
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''
  try {
    const updated = await $fetch<any>('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        name: form.name,
        slug: form.slug,
        primaryColor: form.primaryColor,
        templateKey: form.templateKey,
        logoUrl: form.logoUrl
      }
    })
    useState<any>('storeSettings').value = updated
    
    // Update local form with returned data (in case slug was sanitized/rejected or other side effects)
    updateForm(updated)
    
    successMessage.value = 'Settings saved successfully!'
    setTimeout(() => (successMessage.value = ''), 4000)
  } catch (e: any) {
    console.error('Failed to save settings', e)
    errorMessage.value = e.data?.statusMessage || 'Failed to save changes. Please try again.'
    setTimeout(() => (errorMessage.value = ''), 4000)
  } finally {
    saving.value = false
  }
}

const reset = () => {
  if (confirm('Are you sure you want to discard your unsaved changes?')) {
    fetchSettings()
  }
}


</script>
