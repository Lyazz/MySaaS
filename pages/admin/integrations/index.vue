<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
        {{ t('admin.pages.integrations.title', 'Apps & Integrations') }}
      </h2>
      <p class="mt-1 text-slate-600">
        {{ t('admin.pages.integrations.subtitle', 'Connect your store with third-party tools and services.') }}
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Facebook Pixel -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
        <div class="flex items-start justify-between mb-4">
          <div class="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Icon name="lucide:facebook" class="h-7 w-7" />
          </div>
          <span 
            v-if="facebookGlobalPixel?.isActive"
            class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
          >
            {{ t('admin.common.active', 'Active') }}
          </span>
          <span 
             v-else
             class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800"
          >
            {{ t('admin.common.inactive', 'Inactive') }}
          </span>
        </div>
        <h3 class="text-lg font-semibold text-slate-900 mb-2">Facebook Pixel</h3>
        <p class="text-sm text-slate-500 mb-6 flex-1">
          Track conversions from your Facebook ads.
        </p>
        <button 
          @click="openFacebookModal" 
          class="w-full inline-flex justify-center items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50"
        >
          {{ facebookGlobalPixel ? t('admin.integrations.manage', 'Manage') : t('admin.integrations.connect', 'Connect') }}
        </button>
      </div>

      <!-- Telegram Notifications -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
        <div class="flex items-start justify-between mb-4">
          <div class="h-12 w-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500">
             <Icon name="lucide:send" class="h-6 w-6" />
          </div>
          <span 
            v-if="telegramIntegration?.isActive"
            class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
          >
            {{ t('admin.common.active', 'Active') }}
          </span>
          <span 
             v-else
             class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800"
          >
            {{ t('admin.common.inactive', 'Inactive') }}
          </span>
        </div>
        <h3 class="text-lg font-semibold text-slate-900 mb-2">Telegram Notifications</h3>
        <p class="text-sm text-slate-500 mb-6 flex-1">
          Receive real-time order notifications directly to your Telegram account.
        </p>
        <button 
          @click="openTelegramModal" 
          class="w-full inline-flex justify-center items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50"
        >
          {{ telegramIntegration?.isActive ? t('admin.integrations.manage', 'Manage') : t('admin.integrations.connect', 'Connect') }}
        </button>
      </div>
    </div>

    <!-- Telegram Modal -->
    <div v-if="showTelegramModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 class="text-lg font-semibold text-gray-900">Telegram Settings</h3>
          <button @click="closeTelegramModal" class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>
        
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
            <input v-model="telegramForm.botToken" type="text" class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" placeholder="123456:ABC-..." />
            <p class="mt-1 text-xs text-gray-500">Create a bot with @BotFather to get this.</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Chat ID</label>
            <input v-model="telegramForm.chatId" type="text" class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" placeholder="-100..." />
            <p class="mt-1 text-xs text-gray-500">Add bot to group/channel or start chat to get ID.</p>
          </div>

          <div class="flex items-center gap-2">
            <input v-model="telegramForm.isActive" type="checkbox" id="tg-active" class="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
            <label for="tg-active" class="text-sm font-medium text-gray-700">Enable Notifications</label>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl">
          <button 
            @click="testTelegramConnection" 
            :disabled="testing || !telegramForm.botToken || !telegramForm.chatId"
            class="text-sm font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50"
          >
            {{ testing ? 'Sending...' : 'Send Test Message' }}
          </button>

          <div class="flex gap-3">
            <button @click="closeTelegramModal" class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button 
              @click="saveTelegramSettings" 
              :disabled="saving"
              class="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save Settings' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Facebook Modal (Multiple Pixels) -->
    <div v-if="showFacebookModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Meta Pixels</h3>
            <p class="text-xs text-gray-500 mt-0.5">Create multiple pixels, set one global, and assign others to products.</p>
          </div>
          <button @click="closeFacebookModal" class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>

        <div class="p-6 space-y-6">
          <div v-if="metaPixelsLoading" class="text-sm text-gray-600">
            Loading pixels...
          </div>
          <div v-else>
            <div v-if="metaPixelsError" class="text-sm text-red-600 mb-3">{{ metaPixelsError }}</div>
            <div v-if="metaPixels.length === 0" class="text-sm text-gray-600">
              No pixels yet. Add your first pixel below.
            </div>
            <div v-else class="overflow-hidden rounded-lg border border-gray-200">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Pixel ID</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Global</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-600">Active</th>
                    <th class="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  <tr v-for="p in metaPixels" :key="p.id">
                    <td class="px-4 py-3">
                      <div class="font-medium text-gray-900">{{ p.name || '—' }}</div>
                      <div class="text-xs text-gray-500">{{ p.productsCount || 0 }} products</div>
                    </td>
                    <td class="px-4 py-3 font-mono text-xs text-gray-700">{{ p.pixelId }}</td>
                    <td class="px-4 py-3">
                      <span v-if="p.isGlobal" class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Global</span>
                      <button
                        v-else
                        class="text-xs font-medium text-blue-600 hover:text-blue-700"
                        :disabled="metaPixelsSaving"
                        @click="setGlobalPixel(p.id)"
                      >
                        Set global
                      </button>
                    </td>
                    <td class="px-4 py-3">
                      <label class="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          :checked="p.isActive"
                          :disabled="metaPixelsSaving"
                          @change="togglePixelActive(p)"
                        >
                        <span class="text-xs text-gray-700">{{ p.isActive ? 'Active' : 'Inactive' }}</span>
                      </label>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button
                        class="text-xs font-medium text-red-600 hover:text-red-700"
                        :disabled="metaPixelsSaving"
                        @click="deletePixel(p.id)"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="rounded-lg border border-gray-200 p-4 bg-gray-50">
            <h4 class="text-sm font-semibold text-gray-900 mb-3">Add Pixel</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="md:col-span-1">
                <label class="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  v-model="newPixelForm.name"
                  type="text"
                  class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Default Pixel"
                >
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-gray-600 mb-1">Pixel ID</label>
                <input
                  v-model="newPixelForm.pixelId"
                  type="text"
                  class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="123456789012345"
                >
                <p class="mt-1 text-xs text-gray-500">Events Manager → Data Sources → Settings.</p>
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between">
              <label class="inline-flex items-center gap-2">
                <input v-model="newPixelForm.isGlobal" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700">Set as global</span>
              </label>
              <label class="inline-flex items-center gap-2">
                <input v-model="newPixelForm.isActive" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700">Active</span>
              </label>
            </div>
            <div class="mt-4 flex justify-end">
              <button
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                :disabled="metaPixelsSaving || !newPixelForm.pixelId"
                @click="createPixel"
              >
                {{ metaPixelsSaving ? 'Saving...' : 'Add Pixel' }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl">
          <div />

          <div class="flex gap-3">
            <button @click="closeFacebookModal" class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button @click="closeFacebookModal" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Done</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.nav.integrations'
})

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

// State
const showTelegramModal = ref(false)
const telegramIntegration = ref<any>(null)
const showFacebookModal = ref(false)
const metaPixels = ref<any[]>([])
const metaPixelsLoading = ref(false)
const metaPixelsSaving = ref(false)
const metaPixelsError = ref<string | null>(null)
const facebookGlobalPixel = computed(() => metaPixels.value.find((p: any) => p?.isGlobal) || null)

const telegramForm = reactive({
  botToken: '',
  chatId: '',
  isActive: false
})
const newPixelForm = reactive({
  name: '',
  pixelId: '',
  isActive: true,
  isGlobal: false
})
const saving = ref(false)
const testing = ref(false)

// Methods
async function fetchIntegrations() {
  try {
    const [telegramData, pixels] = await Promise.all([
      $fetch('/api/admin/integrations/TELEGRAM', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }),
      $fetch('/api/admin/meta-pixels', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
    ])

    telegramIntegration.value = telegramData
    if (telegramData && (telegramData as any).config) {
      telegramForm.botToken = (telegramData as any).config.botToken || ''
      telegramForm.chatId = (telegramData as any).config.chatId || ''
      telegramForm.isActive = (telegramData as any).isActive
    }

    metaPixels.value = Array.isArray(pixels) ? (pixels as any) : []
  } catch (e) {
    console.error('Failed to fetch integrations', e)
  }
}

function openTelegramModal() {
  showTelegramModal.value = true
}

function closeTelegramModal() {
  showTelegramModal.value = false
}

function openFacebookModal() {
  showFacebookModal.value = true
  fetchMetaPixels()
}

function closeFacebookModal() {
  showFacebookModal.value = false
}

async function saveTelegramSettings() {
  saving.value = true
  try {
    const data = await $fetch('/api/admin/integrations/TELEGRAM', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        config: {
          botToken: telegramForm.botToken,
          chatId: telegramForm.chatId
        },
        isActive: telegramForm.isActive
      }
    })
    telegramIntegration.value = data
    closeTelegramModal()
    // Optional: Show toast success
  } catch (e) {
    console.error('Failed to save settings', e)
    alert('Failed to save settings')
  } finally {
    saving.value = false
  }
}

async function testTelegramConnection() {
  testing.value = true
  try {
    await $fetch('/api/admin/integrations/TELEGRAM/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        config: {
          botToken: telegramForm.botToken,
          chatId: telegramForm.chatId
        }
      }
    })
    alert('Test message sent successfully!')
  } catch (e: any) {
    console.error('Test failed', e)
    alert('Test failed: ' + (e.data?.error || e.message))
  } finally {
    testing.value = false
  }
}

async function fetchMetaPixels() {
  metaPixelsLoading.value = true
  metaPixelsError.value = null
  try {
    const data = await $fetch('/api/admin/meta-pixels', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    metaPixels.value = Array.isArray(data) ? (data as any) : []
  } catch (e: any) {
    metaPixelsError.value = e?.data?.statusMessage || e?.message || 'Failed to load meta pixels'
  } finally {
    metaPixelsLoading.value = false
  }
}

async function createPixel() {
  metaPixelsSaving.value = true
  metaPixelsError.value = null
  try {
    await $fetch('/api/admin/meta-pixels', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        name: newPixelForm.name,
        pixelId: newPixelForm.pixelId,
        isActive: newPixelForm.isActive,
        isGlobal: newPixelForm.isGlobal
      }
    })
    newPixelForm.name = ''
    newPixelForm.pixelId = ''
    newPixelForm.isActive = true
    newPixelForm.isGlobal = false
    await fetchMetaPixels()
  } catch (e: any) {
    metaPixelsError.value = e?.data?.statusMessage || e?.message || 'Failed to create pixel'
  } finally {
    metaPixelsSaving.value = false
  }
}

async function togglePixelActive(p: any) {
  metaPixelsSaving.value = true
  metaPixelsError.value = null
  try {
    await $fetch(`/api/admin/meta-pixels/${p.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { isActive: !p.isActive }
    })
    await fetchMetaPixels()
  } catch (e: any) {
    metaPixelsError.value = e?.data?.statusMessage || e?.message || 'Failed to update pixel'
  } finally {
    metaPixelsSaving.value = false
  }
}

async function setGlobalPixel(id: string) {
  metaPixelsSaving.value = true
  metaPixelsError.value = null
  try {
    await $fetch(`/api/admin/meta-pixels/${id}/set-global`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await fetchMetaPixels()
  } catch (e: any) {
    metaPixelsError.value = e?.data?.statusMessage || e?.message || 'Failed to set global pixel'
  } finally {
    metaPixelsSaving.value = false
  }
}

async function deletePixel(id: string) {
  if (!confirm('Delete this pixel?')) return
  metaPixelsSaving.value = true
  metaPixelsError.value = null
  try {
    await $fetch(`/api/admin/meta-pixels/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await fetchMetaPixels()
  } catch (e: any) {
    metaPixelsError.value = e?.data?.statusMessage || e?.message || 'Failed to delete pixel'
  } finally {
    metaPixelsSaving.value = false
  }
}

onMounted(() => {
  fetchIntegrations()
})
</script>
