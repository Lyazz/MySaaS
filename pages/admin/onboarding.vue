<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-slate-900">
        Store setup
      </h2>
      <p class="text-slate-600 mt-1">
        Choose your brand color, template, and language.
      </p>
    </div>

    <div
      v-if="loading"
      class="bg-white rounded-xl shadow-sm border border-slate-200 p-8"
    >
      <div class="flex items-center gap-3 text-slate-600">
        <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600" />
        <span>Loading your store settings…</span>
      </div>
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <!-- Progress -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-medium text-slate-700">
            Step {{ step + 1 }} of {{ steps.length }}
          </p>
          <p class="text-sm text-slate-500">
            {{ steps[step] }}
          </p>
        </div>
        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            class="h-2 bg-teal-600 transition-all"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>

      <!-- Step content -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <!-- Brand -->
        <div
          v-if="step === 0"
          class="space-y-4"
        >
          <h3 class="text-lg font-semibold text-slate-900">
            Brand color
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Pick a color</label>
              <input
                v-model="form.primaryColor"
                type="color"
                class="h-12 w-full rounded-lg border border-slate-300 bg-white"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Hex value</label>
              <input
                v-model="form.primaryColor"
                type="text"
                placeholder="#4F46E5"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
              <p class="mt-1 text-xs text-slate-500">
                Example: #4F46E5
              </p>
            </div>
          </div>
          <div class="rounded-lg border border-slate-200 p-4">
            <p class="text-sm text-slate-600 mb-2">
              Preview
            </p>
            <button
              type="button"
              class="px-4 py-2 rounded-lg text-white font-medium"
              :style="{ backgroundColor: form.primaryColor }"
            >
              Primary button
            </button>
          </div>
        </div>

        <!-- Template -->
        <div
          v-else-if="step === 1"
          class="space-y-4"
        >
          <h3 class="text-lg font-semibold text-slate-900">
            Store template
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              v-for="t in templates"
              :key="t.key"
              type="button"
              class="text-left p-4 rounded-xl border transition-all"
              :class="form.templateKey === t.key ? 'border-teal-500 ring-2 ring-teal-200 bg-teal-50' : 'border-slate-200 hover:border-slate-300'"
              @click="form.templateKey = t.key"
            >
              <div class="flex items-center justify-between">
                <p class="font-semibold text-slate-900">
                  {{ t.label }}
                </p>
                <span
                  class="text-xs px-2 py-1 rounded-full"
                  :class="form.templateKey === t.key ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'"
                >
                  {{ t.key }}
                </span>
              </div>
              <p class="text-sm text-slate-600 mt-2">
                {{ t.description }}
              </p>
            </button>
          </div>
        </div>

        <!-- Language + Font -->
        <div
          v-else-if="step === 2"
          class="space-y-4"
        >
          <h3 class="text-lg font-semibold text-slate-900">
            Language
          </h3>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Language</label>
            <BaseSelect
              v-model="form.language"
            >
              <option
                v-for="l in languages"
                :key="l.key"
                :value="l.key"
              >
                {{ l.label }}
              </option>
            </BaseSelect>
            <p class="mt-1 text-xs text-slate-500">
              If Arabic, consider RTL layout.
            </p>
          </div>
        </div>

        <!-- Summary -->
        <div
          v-else
          class="space-y-4"
        >
          <h3 class="text-lg font-semibold text-slate-900">
            Summary
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm text-slate-500">
                Template
              </p>
              <p class="font-semibold text-slate-900">
                {{ form.templateKey }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm text-slate-500">
                Primary color
              </p>
              <div class="flex items-center gap-3">
                <div
                  class="h-6 w-6 rounded"
                  :style="{ backgroundColor: form.primaryColor }"
                />
                <p class="font-semibold text-slate-900">
                  {{ form.primaryColor }}
                </p>
              </div>
            </div>
            <div class="rounded-xl border border-slate-200 p-4">
              <p class="text-sm text-slate-500">
                Language
              </p>
              <p class="font-semibold text-slate-900">
                {{ form.language }}
              </p>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 p-4">
            <div class="flex items-center justify-between gap-3 mb-3">
              <p class="font-medium text-slate-900">
                Frontend AI summary
              </p>
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
                :disabled="summaryLoading"
                @click="loadSummary"
              >
                {{ summaryLoading ? 'Generating…' : 'Generate' }}
              </button>
            </div>
            <textarea
              v-model="summaryMarkdown"
              rows="10"
              class="w-full font-mono text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Click Generate to create a brief for your frontend agent."
            />
            <div class="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50"
                :disabled="!summaryMarkdown"
                @click="copySummary"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="error"
          class="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800"
        >
          {{ error }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          :disabled="step === 0 || saving"
          @click="step--"
        >
          Back
        </button>

        <div class="flex items-center gap-3">
          <button
            v-if="step < steps.length - 1"
            type="button"
            class="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium disabled:opacity-50"
            :disabled="saving"
            @click="nextStep"
          >
            Next
          </button>

          <button
            v-else
            type="button"
            class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
            :disabled="saving"
            @click="finish"
          >
            {{ saving ? 'Saving…' : 'Save & finish' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  title: 'Store setup'
})

const authStore = useAuthStore()

const loading = ref(true)
const saving = ref(false)
const error = ref('')

const step = ref(0)
const steps = ['Brand', 'Template', 'Language', 'Summary']
const progressPercent = computed(() => Math.round(((step.value + 1) / steps.length) * 100))

const templates = [
  { key: 'classic', label: 'Classic', description: 'Clean layout, ideal for most stores.' },
  { key: 'modern', label: 'Modern', description: 'Bolder typography and more visual spacing.' }
]
const languages = [
  { key: 'ar', label: 'Arabic (AR)' },
  { key: 'fr', label: 'French (FR)' },
  { key: 'en', label: 'English (EN)' }
]


const form = reactive({
  primaryColor: '#0d9488',
  templateKey: 'classic',
  language: 'fr'
})

const summaryLoading = ref(false)
const summaryMarkdown = ref('')

async function loadSettings() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<any>('/api/admin/store-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })

    form.primaryColor = data.primaryColor || form.primaryColor
    form.templateKey = data.templateKey || form.templateKey
    form.language = data.language || form.language
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Failed to load store settings.'
  } finally {
    loading.value = false
  }
}

async function save(partial?: { isCompleted?: boolean }) {
  saving.value = true
  error.value = ''
  try {
    const payload: any = {
      primaryColor: form.primaryColor,
      templateKey: form.templateKey,
      language: form.language,
      ...partial
    }

    const updated = await $fetch<any>('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: payload
    })

    useState<any>('storeSettings').value = updated
    return true
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Failed to save store settings.'
    return false
  } finally {
    saving.value = false
  }
}

async function nextStep() {
  const ok = await save()
  if (!ok) return
  step.value++
}

async function finish() {
  const ok = await save({ isCompleted: true })
  if (!ok) return
  await navigateTo('/admin')
}

async function loadSummary() {
  summaryLoading.value = true
  try {
    const data = await $fetch<any>('/api/admin/store-settings/agent-summary', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    summaryMarkdown.value = data.markdown || ''
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Failed to generate summary.'
  } finally {
    summaryLoading.value = false
  }
}

async function copySummary() {
  if (!summaryMarkdown.value) return
  try {
    await navigator.clipboard.writeText(summaryMarkdown.value)
  } catch {
    // ignore
  }
}

onMounted(() => {
  loadSettings()
})
</script>

