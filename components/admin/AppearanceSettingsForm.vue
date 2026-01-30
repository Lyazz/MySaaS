<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200">
    <div class="p-6 border-b border-slate-200">
      <h2 class="text-xl font-bold text-slate-800">
        Appearance Settings
      </h2>
      <p class="text-slate-600 mt-1">
        Logo, brand color, template and default language.
      </p>
    </div>

    <form
      class="p-6 space-y-8"
      @submit.prevent="save"
    >
      <!-- Logo -->
      <section>
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <div class="md:col-span-1">
            <h3 class="text-lg font-medium leading-6 text-slate-900">
              Brand Logo
            </h3>
            <p class="mt-1 text-sm text-slate-500">
              Shown on storefront header and invoices.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2">
            <SingleImageUploader
              v-model="form.logoUrl"
              label="Store Logo"
              hint="Recommended size: 200x60px. PNG or SVG preferred."
            />
          </div>
        </div>
      </section>

      <div class="border-t border-slate-200" />

      <!-- Brand Colors -->
      <section>
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <div class="md:col-span-1">
            <h3 class="text-lg font-medium leading-6 text-slate-900">
              Brand Colors
            </h3>
            <p class="mt-1 text-sm text-slate-500">
              Primary color for buttons, links, and accents.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Primary Color</label>
                <div class="flex items-center gap-3">
                  <input
                    v-model="form.primaryColor"
                    type="color"
                    class="h-10 w-14 rounded border border-slate-300 bg-white p-1 cursor-pointer"
                  >
                  <input
                    v-model="form.primaryColor"
                    type="text"
                    pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                    class="block w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    placeholder="#4F46E5"
                  >
                </div>
              </div>
            </div>

            <!-- Preview -->
            <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span class="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-3">Live Preview</span>
              <div class="flex gap-3">
                <button
                  type="button"
                  class="px-4 py-2 rounded-lg text-white font-medium shadow-sm transition-opacity hover:opacity-90"
                  :style="{ backgroundColor: form.primaryColor }"
                >
                  Button
                </button>
                <button
                  type="button"
                  class="px-4 py-2 rounded-lg border font-medium shadow-sm bg-white"
                  :style="{ borderColor: form.primaryColor, color: form.primaryColor }"
                >
                  Outline
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="border-t border-slate-200" />

      <!-- Template -->
      <section>
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <div class="md:col-span-1">
            <h3 class="text-lg font-medium leading-6 text-slate-900">
              Store Template
            </h3>
            <p class="mt-1 text-sm text-slate-500">
              Layout structure for your storefront.
            </p>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="t in templates"
                :key="t.key"
                class="cursor-pointer relative rounded-xl border p-4 shadow-sm flex flex-col transition-all hover:border-teal-300"
                :class="form.templateKey === t.key ? 'border-teal-500 ring-2 ring-teal-500 ring-opacity-50 bg-teal-50' : 'border-slate-200 bg-white'"
                @click="form.templateKey = t.key"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="font-semibold text-slate-900">{{ t.label }}</span>
                  <span
                    v-if="form.templateKey === t.key"
                    class="h-2 w-2 rounded-full bg-teal-600"
                  />
                </div>
                <p class="text-sm text-slate-500 mb-3">
                  {{ t.description }}
                </p>
                <div
                  class="mt-auto pt-2 flex items-center text-xs font-medium"
                  :class="form.templateKey === t.key ? 'text-teal-700' : 'text-slate-500'"
                >
                  {{ form.templateKey === t.key ? 'Selected' : 'Select' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      <!-- Actions -->
      <div class="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
        <div
          v-if="successMessage"
          class="text-sm text-emerald-600 font-medium mr-auto animate-fadeIn"
        >
          {{ successMessage }}
        </div>
        <div
          v-if="errorMessage"
          class="text-sm text-red-600 font-medium mr-auto animate-fadeIn"
        >
          {{ errorMessage }}
        </div>
        <button
          type="button"
          class="px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          :disabled="loading || saving"
          @click="reset"
        >
          Reset
        </button>
        <button
          type="submit"
          class="inline-flex justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading || saving"
        >
          <Icon
            v-if="saving"
            name="lucide:loader-2"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
          />
          {{ saving ? 'Saving…' : 'Save appearance' }}
        </button>
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
  logoUrl: null as string | null,
  primaryColor: '#4F46E5',
  templateKey: 'classic'
})

const templates = [
  { key: 'classic', label: 'Classic Shop', description: 'Traditional e-commerce layout with a focus on products.' },
  { key: 'modern', label: 'Modern Minimal', description: 'Clean, spacious design with bold typography and large images.' }
]



const updateForm = (data: any) => {
  if (!data) return
  form.logoUrl = data.logoUrl || null
  form.primaryColor = data.primaryColor || '#4F46E5'
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
        primaryColor: form.primaryColor,
        templateKey: form.templateKey,
        logoUrl: form.logoUrl
      }
    })
    useState<any>('storeSettings').value = updated
    successMessage.value = 'Appearance saved!'
    setTimeout(() => (successMessage.value = ''), 3000)
  } catch (e: any) {
    console.error('Failed to save settings', e)
    errorMessage.value = e.data?.statusMessage || 'Failed to save. Please try again.'
  } finally {
    saving.value = false
  }
}

const reset = () => fetchSettings()

onMounted(() => fetchSettings())
</script>
