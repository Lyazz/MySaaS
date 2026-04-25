<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight" style="color: var(--text-primary)">
        {{ t('admin.pages.integrations.title') }}
      </h2>
      <p class="mt-1" style="color: var(--text-secondary)">
        {{ t('admin.pages.integrations.subtitle') }}
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Facebook Pixel -->
      <div class="rounded-2xl p-6 flex flex-col" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="flex items-start justify-between mb-4">
          <div class="h-12 w-12 rounded-xl flex items-center justify-center text-blue-400" style="background: rgba(59,130,246,0.12)">
            <Icon name="lucide:facebook" class="h-7 w-7" />
          </div>
          <span
            v-if="facebookGlobalPixel?.isActive"
            class="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400"
          >
            {{ t('admin.common.active') }}
          </span>
          <span
             v-else
             class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style="background: var(--surface-3); color: var(--text-tertiary)"
          >
            {{ t('admin.common.inactive') }}
          </span>
        </div>
        <h3 class="text-lg font-semibold mb-2" style="color: var(--text-primary)">{{ t('admin.pages.integrations.facebook.title') }}</h3>
        <p class="text-sm mb-6 flex-1" style="color: var(--text-tertiary)">
          {{ t('admin.pages.integrations.facebook.description') }}
        </p>
        <button @click="openFacebookModal" class="ui-btn ui-btn--secondary w-full justify-center text-sm">
          {{ facebookGlobalPixel ? t('admin.integrations.manage') : t('admin.integrations.connect') }}
        </button>
      </div>

      <!-- Telegram Notifications -->
      <div class="rounded-2xl p-6 flex flex-col" style="background: var(--surface-1); border: 1px solid var(--surface-border)">
        <div class="flex items-start justify-between mb-4">
          <div class="h-12 w-12 rounded-xl flex items-center justify-center text-sky-400" style="background: rgba(14,165,233,0.12)">
             <Icon name="lucide:send" class="h-6 w-6" />
          </div>
          <span
            v-if="telegramIntegration?.isActive"
            class="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400"
          >
            {{ t('admin.common.active') }}
          </span>
          <span
             v-else
             class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style="background: var(--surface-3); color: var(--text-tertiary)"
          >
            {{ t('admin.common.inactive') }}
          </span>
        </div>
        <h3 class="text-lg font-semibold mb-2" style="color: var(--text-primary)">{{ t('admin.pages.integrations.telegram.title') }}</h3>
        <p class="text-sm mb-6 flex-1" style="color: var(--text-tertiary)">
          {{ t('admin.pages.integrations.telegram.description') }}
        </p>
        <button @click="openTelegramModal" class="ui-btn ui-btn--secondary w-full justify-center text-sm">
          {{ telegramIntegration?.isActive ? t('admin.integrations.manage') : t('admin.integrations.connect') }}
        </button>
      </div>
    </div>

    <!-- Telegram Modal -->
    <Teleport to="body">
      <div v-if="showTelegramModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8">
        <div class="w-full max-w-lg rounded-xl flex flex-col max-h-[90vh]" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
          <div class="flex items-center justify-between px-6 py-4 shrink-0" style="border-bottom: 1px solid var(--surface-border)">
            <h3 class="text-lg font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.integrations.telegram.modal.title') }}</h3>
            <button @click="closeTelegramModal" class="rounded-lg p-2 transition-colors" style="color: var(--text-muted)" @mouseenter="$event.currentTarget.style.background='var(--surface-3)'" @mouseleave="$event.currentTarget.style.background=''">
              <Icon name="lucide:x" class="h-5 w-5" />
            </button>
          </div>

          <div class="p-6 space-y-4 overflow-y-auto">
            <div>
              <label class="ui-label block mb-1">{{ t('admin.pages.integrations.telegram.modal.fields.botToken.label') }}</label>
              <input v-model="telegramForm.botToken" type="text" class="ui-input block w-full px-3 py-2 text-sm" :placeholder="t('admin.pages.integrations.telegram.modal.fields.botToken.placeholder')" />
              <p class="mt-1 text-xs" style="color: var(--text-muted)">{{ t('admin.pages.integrations.telegram.modal.fields.botToken.hint') }}</p>
            </div>

            <div class="rounded-lg p-4" style="background: rgba(14,165,233,0.08); border: 1px solid rgba(14,165,233,0.2)">
              <div class="text-sm font-semibold text-sky-400">{{ t('admin.pages.integrations.telegram.modal.auto.title') }}</div>
              <ol class="mt-2 list-decimal list-inside text-sm text-sky-400/80 space-y-1">
                <li>{{ t('admin.pages.integrations.telegram.modal.auto.steps.pasteToken') }}</li>
                <li>{{ t('admin.pages.integrations.telegram.modal.auto.steps.startBot') }}</li>
                <li>{{ t('admin.pages.integrations.telegram.modal.auto.steps.clickDetect') }}</li>
              </ol>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                  :disabled="detectingChats || !telegramForm.botToken"
                  @click="detectTelegramChats"
                >
                  {{ detectingChats ? t('admin.pages.integrations.telegram.modal.auto.actions.detecting') : t('admin.pages.integrations.telegram.modal.auto.actions.detectChats') }}
                </button>

                <a
                  v-if="detectedBot?.username"
                  class="text-sm font-medium text-sky-400 hover:text-sky-300"
                  :href="`https://t.me/${detectedBot.username}`"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ t('admin.pages.integrations.telegram.modal.auto.actions.openBot', { handle: `@${detectedBot.username}` }) }}
                </a>
              </div>

              <p v-if="detectError" class="mt-2 text-xs text-red-400">{{ detectError }}</p>

              <div v-if="detectedChats.length" class="mt-3 space-y-2">
                <p class="text-xs text-sky-400/80">
                  {{ t('admin.pages.integrations.telegram.modal.auto.found', { count: detectedChats.length }) }}
                </p>
                <div class="space-y-2">
                  <button
                    v-for="c in detectedChats"
                    :key="c.chatId"
                    type="button"
                    class="w-full text-left rounded-lg px-3 py-2 transition-colors"
                    style="background: var(--surface-1); border: 1px solid var(--surface-border)"
                    @click="selectDetectedChat(c.chatId)"
                  >
                    <div class="text-sm font-medium" style="color: var(--text-primary)">{{ c.name || c.title || (c.username ? `@${c.username}` : '') || c.chatId }}</div>
                    <div class="text-xs font-mono" style="color: var(--text-secondary)">{{ c.chatId }}</div>
                  </button>
                </div>
              </div>

              <p v-else-if="detectedOnce && !detectingChats" class="mt-2 text-xs text-sky-400/80">
                {{ t('admin.pages.integrations.telegram.modal.auto.noneFound') }}
              </p>

              <p class="mt-2 text-xs text-sky-400/60">
                {{ t('admin.pages.integrations.telegram.modal.auto.groupNote') }}
              </p>
            </div>

            <div>
              <label class="ui-label block mb-1">{{ t('admin.pages.integrations.telegram.modal.fields.chatId.label') }}</label>
              <input v-model="telegramForm.chatId" type="text" class="ui-input block w-full px-3 py-2 text-sm" :placeholder="t('admin.pages.integrations.telegram.modal.fields.chatId.placeholder')" />
              <p class="mt-1 text-xs" style="color: var(--text-muted)">{{ t('admin.pages.integrations.telegram.modal.fields.chatId.hint') }}</p>
            </div>

            <div class="flex items-center gap-2">
              <input v-model="telegramForm.isActive" type="checkbox" id="tg-active" class="h-4 w-4 rounded text-sky-500" style="border-color: var(--surface-border)" />
              <label for="tg-active" class="ui-label">{{ t('admin.pages.integrations.telegram.modal.fields.enableNotifications') }}</label>
            </div>
          </div>

          <div class="flex items-center justify-between px-6 py-4 rounded-b-xl shrink-0" style="border-top: 1px solid var(--surface-border); background: var(--surface-2)">
            <button
              @click="testTelegramConnection"
              :disabled="testing || !telegramForm.botToken || !telegramForm.chatId"
              class="text-sm font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50"
            >
              {{ testing ? t('admin.pages.integrations.telegram.modal.actions.sending') : t('admin.pages.integrations.telegram.modal.actions.sendTestMessage') }}
            </button>

            <div class="flex gap-3">
              <button @click="closeTelegramModal" class="ui-btn ui-btn--secondary text-sm">{{ t('admin.common.cancel') }}</button>
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
    </Teleport>

    <!-- Facebook Modal (Multiple Pixels) -->
    <Teleport to="body">
      <div v-if="showFacebookModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8">
        <div class="w-full max-w-3xl rounded-xl flex flex-col max-h-[90vh]" style="background: var(--surface-2); border: 1px solid var(--surface-border); box-shadow: 0 24px 48px rgba(0,0,0,0.5)">
          <div class="flex items-center justify-between px-6 py-4 shrink-0" style="border-bottom: 1px solid var(--surface-border)">
            <div>
              <h3 class="text-lg font-semibold" style="color: var(--text-primary)">{{ t('admin.pages.integrations.metaPixels.title') }}</h3>
              <p class="text-xs mt-0.5" style="color: var(--text-tertiary)">{{ t('admin.pages.integrations.metaPixels.subtitle') }}</p>
            </div>
            <button @click="closeFacebookModal" class="rounded-lg p-2 transition-colors" style="color: var(--text-muted)">
              <Icon name="lucide:x" class="h-5 w-5" />
            </button>
          </div>

          <div class="p-6 space-y-6 overflow-y-auto">
            <div v-if="metaPixelsLoading" class="text-sm" style="color: var(--text-secondary)">
              {{ t('admin.pages.integrations.metaPixels.loading') }}
            </div>
            <div v-else>
              <div v-if="metaPixelsError" class="text-sm text-red-400 mb-3">{{ metaPixelsError }}</div>
              <div v-if="metaPixels.length === 0" class="text-sm" style="color: var(--text-secondary)">
                {{ t('admin.pages.integrations.metaPixels.empty') }}
              </div>
              <div v-else class="overflow-hidden rounded-2xl" style="border: 1px solid var(--surface-border)">
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
                        <div class="font-medium" style="color: var(--text-primary)">{{ p.name || '—' }}</div>
                        <div class="text-xs" style="color: var(--text-muted)">{{ t('admin.pages.integrations.metaPixels.table.productsCount', { count: p.productsCount || 0 }) }}</div>
                      </td>
                      <td class="ui-td font-mono text-xs" style="color: var(--text-secondary)">{{ p.pixelId }}</td>
                      <td class="ui-td">
                        <span v-if="p.isGlobal" class="ui-badge ui-badge--indigo">{{ t('admin.pages.integrations.metaPixels.table.global') }}</span>
                        <button
                          v-else
                          class="text-xs font-medium text-blue-400 hover:text-blue-300"
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
                            class="h-4 w-4 rounded text-blue-500"
                            style="border-color: var(--surface-border)"
                            :checked="p.isActive"
                            :disabled="metaPixelsSaving"
                            @change="togglePixelActive(p)"
                          >
                          <span class="text-xs" style="color: var(--text-secondary)">{{ p.isActive ? t('admin.common.active') : t('admin.common.inactive') }}</span>
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

            <div class="rounded-lg p-4" style="background: var(--surface-3); border: 1px solid var(--surface-border)">
              <h4 class="text-sm font-semibold mb-3" style="color: var(--text-primary)">{{ t('admin.pages.integrations.metaPixels.addPixel.title') }}</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="md:col-span-1">
                  <label class="ui-label block text-xs mb-1">{{ t('admin.common.name') }}</label>
                  <input
                    v-model="newPixelForm.name"
                    type="text"
                    class="ui-input block w-full px-3 py-2 text-sm"
                    :placeholder="t('admin.pages.integrations.metaPixels.addPixel.fields.namePlaceholder')"
                  >
                </div>
                <div class="md:col-span-2">
                  <label class="ui-label block text-xs mb-1">{{ t('admin.pages.integrations.metaPixels.table.pixelId') }}</label>
                  <input
                    v-model="newPixelForm.pixelId"
                    type="text"
                    class="ui-input block w-full px-3 py-2 text-sm"
                    placeholder="123456789012345"
                  >
                  <p class="mt-1 text-xs" style="color: var(--text-muted)">{{ t('admin.pages.integrations.metaPixels.addPixel.fields.pixelIdHint') }}</p>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between">
                <label class="inline-flex items-center gap-2">
                  <input v-model="newPixelForm.isGlobal" type="checkbox" class="h-4 w-4 rounded text-blue-500" style="border-color: var(--surface-border)">
                  <span class="text-sm" style="color: var(--text-secondary)">{{ t('admin.pages.integrations.metaPixels.addPixel.fields.setAsGlobal') }}</span>
                </label>
                <label class="inline-flex items-center gap-2">
                  <input v-model="newPixelForm.isActive" type="checkbox" class="h-4 w-4 rounded text-blue-500" style="border-color: var(--surface-border)">
                  <span class="text-sm" style="color: var(--text-secondary)">{{ t('admin.common.active') }}</span>
                </label>
              </div>
              <div class="mt-4 flex justify-end">
                <button
                  class="px-4 py-2 text-sm font-medium text-black bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  :disabled="metaPixelsSaving || !newPixelForm.pixelId"
                  @click="createPixel"
                >
                  {{ metaPixelsSaving ? t('admin.common.saving') : t('admin.pages.integrations.metaPixels.addPixel.actions.addPixel') }}
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between px-6 py-4 rounded-b-xl shrink-0" style="border-top: 1px solid var(--surface-border); background: var(--surface-2)">
            <div />
            <div class="flex gap-3">
              <button @click="closeFacebookModal" class="ui-btn ui-btn--secondary text-sm">{{ t('admin.common.cancel') }}</button>
              <button @click="closeFacebookModal" class="px-4 py-2 text-sm font-medium text-black bg-blue-600 hover:bg-blue-700 rounded-lg">{{ t('admin.common.done') }}</button>
            </div>
          </div>
        </div>
      </div>
  </Teleport>
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
const detectingChats = ref(false)
const detectedOnce = ref(false)
const detectError = ref<string | null>(null)
const detectedBot = ref<{ id: string; username: string | null; name: string } | null>(null)
const detectedChats = ref<Array<{ chatId: string; type: string; title?: string; username?: string; name?: string }>>([])

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

watch(
  () => telegramForm.botToken,
  () => {
    detectedOnce.value = false
    detectError.value = null
    detectedBot.value = null
    detectedChats.value = []
  }
)

function selectDetectedChat(chatId: string) {
  telegramForm.chatId = chatId
}

async function detectTelegramChats() {
  detectingChats.value = true
  detectedOnce.value = false
  detectError.value = null
  detectedChats.value = []
  detectedBot.value = null
  try {
    const data = await $fetch('/api/admin/integrations/TELEGRAM/detect-chats', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { botToken: telegramForm.botToken }
    })
    detectedOnce.value = true
    detectedBot.value = (data as any)?.bot || null
    detectedChats.value = Array.isArray((data as any)?.chats) ? ((data as any).chats as any) : []
    if (!telegramForm.chatId && detectedChats.value.length === 1) {
      telegramForm.chatId = detectedChats.value[0]!.chatId
    }
  } catch (e: any) {
    detectedOnce.value = true
    detectError.value = e?.data?.error || e?.data?.statusMessage || e?.message || t('admin.common.error')
  } finally {
    detectingChats.value = false
  }
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
