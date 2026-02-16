<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
        {{ t('admin.pages.integrations.title') }}
      </h2>
      <p class="mt-1 text-slate-600">
        {{ t('admin.pages.integrations.subtitle') }}
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
            {{ t('admin.common.active') }}
          </span>
          <span 
             v-else
             class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800"
          >
            {{ t('admin.common.inactive') }}
          </span>
        </div>
        <h3 class="text-lg font-semibold text-slate-900 mb-2">{{ t('admin.pages.integrations.facebook.title') }}</h3>
        <p class="text-sm text-slate-500 mb-6 flex-1">
          {{ t('admin.pages.integrations.facebook.description') }}
        </p>
        <button 
          @click="openFacebookModal" 
          class="w-full inline-flex justify-center items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50"
        >
          {{ facebookGlobalPixel ? t('admin.integrations.manage') : t('admin.integrations.connect') }}
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
            {{ t('admin.common.active') }}
          </span>
          <span 
             v-else
             class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800"
          >
            {{ t('admin.common.inactive') }}
          </span>
        </div>
        <h3 class="text-lg font-semibold text-slate-900 mb-2">{{ t('admin.pages.integrations.telegram.title') }}</h3>
        <p class="text-sm text-slate-500 mb-6 flex-1">
          {{ t('admin.pages.integrations.telegram.description') }}
        </p>
        <button 
          @click="openTelegramModal" 
          class="w-full inline-flex justify-center items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50"
        >
          {{ telegramIntegration?.isActive ? t('admin.integrations.manage') : t('admin.integrations.connect') }}
        </button>
      </div>
    </div>

    <!-- Telegram Modal -->
    <div v-if="showTelegramModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 class="text-lg font-semibold text-gray-900">{{ t('admin.pages.integrations.telegram.modal.title') }}</h3>
          <button @click="closeTelegramModal" class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>
        
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.pages.integrations.telegram.modal.fields.botToken.label') }}</label>
            <input v-model="telegramForm.botToken" type="text" class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" :placeholder="t('admin.pages.integrations.telegram.modal.fields.botToken.placeholder')" />
            <p class="mt-1 text-xs text-gray-500">{{ t('admin.pages.integrations.telegram.modal.fields.botToken.hint') }}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.pages.integrations.telegram.modal.fields.chatId.label') }}</label>
            <input v-model="telegramForm.chatId" type="text" class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" :placeholder="t('admin.pages.integrations.telegram.modal.fields.chatId.placeholder')" />
            <p class="mt-1 text-xs text-gray-500">{{ t('admin.pages.integrations.telegram.modal.fields.chatId.hint') }}</p>
          </div>

          <div class="flex items-center gap-2">
            <input v-model="telegramForm.isActive" type="checkbox" id="tg-active" class="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
            <label for="tg-active" class="text-sm font-medium text-gray-700">{{ t('admin.pages.integrations.telegram.modal.fields.enableNotifications') }}</label>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl">
          <button 
            @click="testTelegramConnection" 
            :disabled="testing || !telegramForm.botToken || !telegramForm.chatId"
            class="text-sm font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50"
          >
            {{ testing ? t('admin.pages.integrations.telegram.modal.actions.sending') : t('admin.pages.integrations.telegram.modal.actions.sendTestMessage') }}
          </button>

          <div class="flex gap-3">
            <button @click="closeTelegramModal" class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">{{ t('admin.common.cancel') }}</button>
            <button 
              @click="saveTelegramSettings" 
              :disabled="saving"
              class="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50"
            >
              {{ saving ? t('admin.common.saving') : t('admin.pages.integrations.telegram.modal.actions.saveSettings') }}
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
            <h3 class="text-lg font-semibold text-gray-900">{{ t('admin.pages.integrations.metaPixels.title') }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ t('admin.pages.integrations.metaPixels.subtitle') }}</p>
          </div>
          <button @click="closeFacebookModal" class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>

        <div class="p-6 space-y-6">
          <div v-if="metaPixelsLoading" class="text-sm text-gray-600">
            {{ t('admin.pages.integrations.metaPixels.loading') }}
          </div>
          <div v-else>
            <div v-if="metaPixelsError" class="text-sm text-red-600 mb-3">{{ metaPixelsError }}</div>
            <div v-if="metaPixels.length === 0" class="text-sm text-gray-600">
              {{ t('admin.pages.integrations.metaPixels.empty') }}
            </div>
            <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table class="ui-table">
                <thead class="ui-thead">
                  <tr>
                    <th class="ui-th">{{ t('admin.common.name') }}</th>
                    <th class="ui-th">{{ t('admin.pages.integrations.metaPixels.table.pixelId') }}</th>
                    <th class="ui-th">{{ t('admin.pages.integrations.metaPixels.table.global') }}</th>
                    <th class="ui-th">{{ t('admin.common.active') }}</th>
                    <th class="ui-th text-right">{{ t('admin.common.actions') }}</th>
                  </tr>
                </thead>
                <tbody class="ui-tbody">
                  <tr v-for="p in metaPixels" :key="p.id" class="ui-tr">
                    <td class="ui-td">
                      <div class="font-medium text-slate-900">{{ p.name || '—' }}</div>
                      <div class="text-xs text-slate-500">{{ t('admin.pages.integrations.metaPixels.table.productsCount', { count: p.productsCount || 0 }) }}</div>
                    </td>
                    <td class="ui-td font-mono text-xs text-slate-700">{{ p.pixelId }}</td>
                    <td class="ui-td">
                      <span v-if="p.isGlobal" class="ui-badge ui-badge--indigo">{{ t('admin.pages.integrations.metaPixels.table.global') }}</span>
                      <button
                        v-else
                        class="text-xs font-medium text-blue-600 hover:text-blue-700"
                        :disabled="metaPixelsSaving"
                        @click="setGlobalPixel(p.id)"
                      >
                        {{ t('admin.pages.integrations.metaPixels.actions.setGlobal') }}
                      </button>
                    </td>
                    <td class="ui-td">
                      <label class="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          :checked="p.isActive"
                          :disabled="metaPixelsSaving"
                          @change="togglePixelActive(p)"
                        >
                        <span class="text-xs text-slate-700">{{ p.isActive ? t('admin.common.active') : t('admin.common.inactive') }}</span>
                      </label>
                    </td>
                    <td class="ui-td text-right">
                      <button
                        class="ui-btn ui-btn--danger ui-btn--sm"
                        :disabled="metaPixelsSaving"
                        @click="deletePixel(p.id)"
                      >
                        {{ t('admin.common.delete') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="rounded-lg border border-gray-200 p-4 bg-gray-50">
            <h4 class="text-sm font-semibold text-gray-900 mb-3">{{ t('admin.pages.integrations.metaPixels.addPixel.title') }}</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="md:col-span-1">
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('admin.common.name') }}</label>
                <input
                  v-model="newPixelForm.name"
                  type="text"
                  class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  :placeholder="t('admin.pages.integrations.metaPixels.addPixel.fields.namePlaceholder')"
                >
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('admin.pages.integrations.metaPixels.table.pixelId') }}</label>
                <input
                  v-model="newPixelForm.pixelId"
                  type="text"
                  class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="123456789012345"
                >
                <p class="mt-1 text-xs text-gray-500">{{ t('admin.pages.integrations.metaPixels.addPixel.fields.pixelIdHint') }}</p>
              </div>
            </div>
            <div class="mt-3 flex items-center justify-between">
              <label class="inline-flex items-center gap-2">
                <input v-model="newPixelForm.isGlobal" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700">{{ t('admin.pages.integrations.metaPixels.addPixel.fields.setAsGlobal') }}</span>
              </label>
              <label class="inline-flex items-center gap-2">
                <input v-model="newPixelForm.isActive" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm text-gray-700">{{ t('admin.common.active') }}</span>
              </label>
            </div>
            <div class="mt-4 flex justify-end">
              <button
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                :disabled="metaPixelsSaving || !newPixelForm.pixelId"
                @click="createPixel"
              >
                {{ metaPixelsSaving ? t('admin.common.saving') : t('admin.pages.integrations.metaPixels.addPixel.actions.addPixel') }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl">
          <div />

          <div class="flex gap-3">
            <button @click="closeFacebookModal" class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">{{ t('admin.common.cancel') }}</button>
            <button @click="closeFacebookModal" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">{{ t('admin.common.done') }}</button>
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
    alert(t('admin.pages.integrations.telegram.errors.saveFailed'))
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
    alert(t('admin.pages.integrations.telegram.test.success'))
  } catch (e: any) {
    console.error('Test failed', e)
    alert(t('admin.pages.integrations.telegram.test.failed', { message: e.data?.error || e.message }))
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
    metaPixelsError.value = e?.data?.statusMessage || e?.message || t('admin.pages.integrations.metaPixels.errors.loadFailed')
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
    metaPixelsError.value = e?.data?.statusMessage || e?.message || t('admin.pages.integrations.metaPixels.errors.createFailed')
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
    metaPixelsError.value = e?.data?.statusMessage || e?.message || t('admin.pages.integrations.metaPixels.errors.updateFailed')
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
    metaPixelsError.value = e?.data?.statusMessage || e?.message || t('admin.pages.integrations.metaPixels.errors.setGlobalFailed')
  } finally {
    metaPixelsSaving.value = false
  }
}

async function deletePixel(id: string) {
  if (!confirm(t('admin.pages.integrations.metaPixels.confirm.delete'))) return
  metaPixelsSaving.value = true
  metaPixelsError.value = null
  try {
    await $fetch(`/api/admin/meta-pixels/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await fetchMetaPixels()
  } catch (e: any) {
    metaPixelsError.value = e?.data?.statusMessage || e?.message || t('admin.pages.integrations.metaPixels.errors.deleteFailed')
  } finally {
    metaPixelsSaving.value = false
  }
}

onMounted(() => {
  fetchIntegrations()
})
</script>
