<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight text-primary">
        {{ t('admin.pages.integrations.title') }}
      </h2>
      <p class="mt-1 text-secondary">
        {{ t('admin.pages.integrations.subtitle') }}
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Facebook Pixel -->
      <div class="rounded-2xl p-6 flex flex-col surface-1 border border-line">
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
 class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium surface-3 text-tertiary" 
>
            {{ t('admin.common.inactive') }}
          </span>
        </div>
        <h3 class="text-lg font-semibold mb-2 text-primary">{{ t('admin.pages.integrations.facebook.title') }}</h3>
        <p class="text-sm mb-6 flex-1 text-tertiary">
          {{ t('admin.pages.integrations.facebook.description') }}
        </p>
        <button @click="openFacebookModal" class="ui-btn ui-btn--secondary w-full justify-center text-sm">
          {{ facebookGlobalPixel ? t('admin.integrations.manage') : t('admin.integrations.connect') }}
        </button>
      </div>

      <!-- Telegram Notifications -->
      <div class="rounded-2xl p-6 flex flex-col surface-1 border border-line">
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
 class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium surface-3 text-tertiary" 
>
            {{ t('admin.common.inactive') }}
          </span>
        </div>
        <h3 class="text-lg font-semibold mb-2 text-primary">{{ t('admin.pages.integrations.telegram.title') }}</h3>
        <p class="text-sm mb-6 flex-1 text-tertiary">
          {{ t('admin.pages.integrations.telegram.description') }}
        </p>
        <button @click="openTelegramModal" class="ui-btn ui-btn--secondary w-full justify-center text-sm">
          {{ telegramIntegration?.isActive ? t('admin.integrations.manage') : t('admin.integrations.connect') }}
        </button>
      </div>

      <!-- WhatsApp Business -->
      <div class="rounded-2xl p-6 flex flex-col surface-1 border border-line">
        <div class="flex items-start justify-between mb-4">
          <div class="h-12 w-12 rounded-xl flex items-center justify-center text-emerald-400" style="background: rgba(16,185,129,0.12)">
            <Icon name="lucide:message-circle" class="h-6 w-6" />
          </div>
          <span
            v-if="whatsappStatus?.canSend"
            class="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400"
          >
            {{ t('admin.common.active') }}
          </span>
          <span
            v-else-if="whatsappStatus?.connected"
            class="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400"
          >
            {{ t('admin.pages.integrations.whatsapp.modal.templateStatus.PENDING') }}
          </span>
          <span
 v-else
 class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium surface-3 text-tertiary" 
>
            {{ t('admin.common.inactive') }}
          </span>
        </div>
        <h3 class="text-lg font-semibold mb-2 text-primary">{{ t('admin.pages.integrations.whatsapp.title') }}</h3>
        <p class="text-sm mb-6 flex-1 text-tertiary">
          {{ t('admin.pages.integrations.whatsapp.description') }}
        </p>
        <button @click="openWhatsappModal" class="ui-btn ui-btn--secondary w-full justify-center text-sm">
          {{ whatsappStatus?.connected ? t('admin.integrations.manage') : t('admin.integrations.connect') }}
        </button>
      </div>
    </div>

    <!-- Telegram Modal -->
    <Teleport to="body">
      <div v-if="showTelegramModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8">
        <div class="w-full max-w-lg rounded-xl flex flex-col max-h-[90vh] surface-2 border border-line shadow-overlay">
          <div class="flex items-center justify-between px-6 py-4 shrink-0 border-b border-line">
            <h3 class="text-lg font-semibold text-primary">{{ t('admin.pages.integrations.telegram.modal.title') }}</h3>
            <button @click="closeTelegramModal" class="rounded-lg p-2 transition-colors text-muted" @mouseenter="$event.currentTarget.style.background='var(--surface-3)'" @mouseleave="$event.currentTarget.style.background=''">
              <Icon name="lucide:x" class="h-5 w-5" />
            </button>
          </div>

          <div class="p-6 space-y-4 overflow-y-auto">
            <div>
              <label class="ui-label block mb-1">{{ t('admin.pages.integrations.telegram.modal.fields.botToken.label') }}</label>
              <input v-model="telegramForm.botToken" type="text" class="ui-input block w-full px-3 py-2 text-sm" :placeholder="t('admin.pages.integrations.telegram.modal.fields.botToken.placeholder')" />
              <p class="mt-1 text-xs text-muted">{{ t('admin.pages.integrations.telegram.modal.fields.botToken.hint') }}</p>
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
                  class="ui-btn ui-btn--primary ui-btn--md"
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
 class="w-full text-start rounded-lg px-3 py-2 transition-colors surface-1 border border-line"
 
 @click="selectDetectedChat(c.chatId)"
>
                    <div class="text-sm font-medium text-primary">{{ c.name || c.title || (c.username ? `@${c.username}` : '') || c.chatId }}</div>
                    <div class="text-xs font-mono text-secondary">{{ c.chatId }}</div>
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
              <p class="mt-1 text-xs text-muted">{{ t('admin.pages.integrations.telegram.modal.fields.chatId.hint') }}</p>
            </div>

            <div class="flex items-center gap-2">
              <input v-model="telegramForm.isActive" type="checkbox" id="tg-active" class="h-4 w-4 rounded-lg text-sky-500 border-line" />
              <label for="tg-active" class="ui-label">{{ t('admin.pages.integrations.telegram.modal.fields.enableNotifications') }}</label>
            </div>
          </div>

          <div class="flex items-center justify-between px-6 py-4 rounded-b-xl shrink-0 border-t border-line surface-2">
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
                class="ui-btn ui-btn--primary ui-btn--md"
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
        <div class="w-full max-w-3xl rounded-xl flex flex-col max-h-[90vh] surface-2 border border-line shadow-overlay">
          <div class="flex items-center justify-between px-6 py-4 shrink-0 border-b border-line">
            <div>
              <h3 class="text-lg font-semibold text-primary">{{ t('admin.pages.integrations.metaPixels.title') }}</h3>
              <p class="text-xs mt-0.5 text-tertiary">{{ t('admin.pages.integrations.metaPixels.subtitle') }}</p>
            </div>
            <button @click="closeFacebookModal" class="rounded-lg p-2 transition-colors text-muted">
              <Icon name="lucide:x" class="h-5 w-5" />
            </button>
          </div>

          <div class="p-6 space-y-6 overflow-y-auto">
            <div v-if="metaPixelsLoading" class="text-sm text-secondary">
              {{ t('admin.pages.integrations.metaPixels.loading') }}
            </div>
            <div v-else>
              <div v-if="metaPixelsError" class="text-sm text-red-400 mb-3">{{ metaPixelsError }}</div>
              <div v-if="metaPixels.length === 0" class="text-sm text-secondary">
                {{ t('admin.pages.integrations.metaPixels.empty') }}
              </div>
              <div v-else class="overflow-hidden rounded-2xl border border-line">
                <table class="ui-table">
                  <thead class="ui-thead">
                    <tr>
                      <th class="ui-th">{{ t('admin.common.name') }}</th>
                      <th class="ui-th">{{ t('admin.pages.integrations.metaPixels.table.pixelId') }}</th>
                      <th class="ui-th">{{ t('admin.pages.integrations.metaPixels.table.global') }}</th>
                      <th class="ui-th">{{ t('admin.common.active') }}</th>
                      <th class="ui-th text-end">{{ t('admin.common.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody class="ui-tbody">
                    <tr v-for="p in metaPixels" :key="p.id" class="ui-tr">
                      <td class="ui-td">
                        <div class="font-medium text-primary">{{ p.name || '—' }}</div>
                        <div class="text-xs text-muted">{{ t('admin.pages.integrations.metaPixels.table.productsCount', { count: p.productsCount || 0 }) }}</div>
                      </td>
                      <td class="ui-td font-mono text-xs text-secondary">{{ p.pixelId }}</td>
                      <td class="ui-td">
                        <span v-if="p.isGlobal" class="ui-badge ui-badge--indigo">{{ t('admin.pages.integrations.metaPixels.table.global') }}</span>
                        <button
                          v-else
                          class="ui-table-action"
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
 class="h-4 w-4 rounded-lg text-blue-500 border-line"
 
 :checked="p.isActive"
 :disabled="metaPixelsSaving"
 @change="togglePixelActive(p)"
>
                          <span class="text-xs text-secondary">{{ p.isActive ? t('admin.common.active') : t('admin.common.inactive') }}</span>
                        </label>
                      </td>
                      <td class="ui-td text-end">
                        <button
                          class="ui-table-action ui-table-action--danger"
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

            <div class="rounded-lg p-4 surface-3 border border-line">
              <h4 class="text-sm font-semibold mb-3 text-primary">{{ t('admin.pages.integrations.metaPixels.addPixel.title') }}</h4>
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
                  <p class="mt-1 text-xs text-muted">{{ t('admin.pages.integrations.metaPixels.addPixel.fields.pixelIdHint') }}</p>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between">
                <label class="inline-flex items-center gap-2">
                  <input v-model="newPixelForm.isGlobal" type="checkbox" class="h-4 w-4 rounded-lg text-blue-500 border-line">
                  <span class="text-sm text-secondary">{{ t('admin.pages.integrations.metaPixels.addPixel.fields.setAsGlobal') }}</span>
                </label>
                <label class="inline-flex items-center gap-2">
                  <input v-model="newPixelForm.isActive" type="checkbox" class="h-4 w-4 rounded-lg text-blue-500 border-line">
                  <span class="text-sm text-secondary">{{ t('admin.common.active') }}</span>
                </label>
              </div>
              <div class="mt-4 flex justify-end">
                <button
                  class="ui-btn ui-btn--primary ui-btn--md"
                  :disabled="metaPixelsSaving || !newPixelForm.pixelId"
                  @click="createPixel"
                >
                  {{ metaPixelsSaving ? t('admin.common.saving') : t('admin.pages.integrations.metaPixels.addPixel.actions.addPixel') }}
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between px-6 py-4 rounded-b-xl shrink-0 border-t border-line surface-2">
            <div />
            <div class="flex gap-3">
              <button @click="closeFacebookModal" class="ui-btn ui-btn--secondary text-sm">{{ t('admin.common.cancel') }}</button>
              <button @click="closeFacebookModal" class="ui-btn ui-btn--primary ui-btn--md">{{ t('admin.common.done') }}</button>
            </div>
          </div>
        </div>
      </div>
  </Teleport>

    <!-- WhatsApp Modal -->
    <Teleport to="body">
      <div v-if="showWhatsappModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8">
        <div class="w-full max-w-lg rounded-xl flex flex-col max-h-[90vh] surface-2 border border-line shadow-overlay">
          <div class="flex items-center justify-between px-6 py-4 shrink-0 border-b border-line">
            <h3 class="text-lg font-semibold text-primary">{{ t('admin.pages.integrations.whatsapp.modal.title') }}</h3>
            <button @click="closeWhatsappModal" class="rounded-lg p-2 transition-colors text-muted">
              <Icon name="lucide:x" class="h-5 w-5" />
            </button>
          </div>

          <div class="px-6 py-5 space-y-5 overflow-y-auto">
            <p class="text-sm text-secondary">
              {{ t('admin.pages.integrations.whatsapp.modal.intro') }}
            </p>

            <p v-if="whatsappError" class="text-sm text-rose-400">{{ whatsappError }}</p>

            <!-- Not connected -->
            <template v-if="!whatsappStatus?.connected">
              <p v-if="!whatsappSignupAvailable" class="text-sm text-amber-400">
                {{ t('admin.pages.integrations.whatsapp.modal.unavailable') }}
              </p>
              <button
                v-else
                type="button"
                class="ui-btn ui-btn--primary w-full justify-center text-sm"
                :disabled="whatsappConnecting"
                @click="startWhatsappSignup"
              >
                {{ whatsappConnecting ? t('admin.pages.integrations.whatsapp.modal.connecting') : t('admin.pages.integrations.whatsapp.modal.connect') }}
              </button>
            </template>

            <!-- Connected -->
            <template v-else>
              <div class="rounded-xl p-4 space-y-1 surface-3">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-tertiary">{{ t('admin.pages.integrations.whatsapp.modal.number') }}</span>
                  <span class="font-medium text-primary">{{ whatsappStatus.displayPhoneNumber || '—' }}</span>
                </div>
                <div v-if="whatsappStatus.verifiedName" class="flex items-center justify-between text-sm">
                  <span class="text-tertiary">{{ t('admin.pages.integrations.whatsapp.modal.businessName') }}</span>
                  <span class="font-medium text-primary">{{ whatsappStatus.verifiedName }}</span>
                </div>
              </div>

              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  class="mt-1"
                  :checked="whatsappStatus.autoSendEnabled"
                  :disabled="whatsappSaving"
                  @change="updateWhatsappSettings({ autoSendEnabled: ($event.target as HTMLInputElement).checked })"
                >
                <span>
                  <span class="block text-sm font-medium text-primary">{{ t('admin.pages.integrations.whatsapp.modal.autoSend.label') }}</span>
                  <span class="block text-xs text-tertiary">{{ t('admin.pages.integrations.whatsapp.modal.autoSend.hint') }}</span>
                </span>
              </label>

              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  class="mt-1"
                  :checked="whatsappStatus.remindersEnabled"
                  :disabled="whatsappSaving"
                  @change="updateWhatsappSettings({ remindersEnabled: ($event.target as HTMLInputElement).checked })"
                >
                <span>
                  <span class="block text-sm font-medium text-primary">{{ t('admin.pages.integrations.whatsapp.modal.reminders.label') }}</span>
                  <span class="block text-xs text-tertiary">{{ t('admin.pages.integrations.whatsapp.modal.reminders.hint') }}</span>
                </span>
              </label>

              <div class="space-y-2">
                <p class="text-sm font-medium text-primary">{{ t('admin.pages.integrations.whatsapp.modal.templates.title') }}</p>
                <p class="text-xs text-tertiary">{{ t('admin.pages.integrations.whatsapp.modal.templates.hint') }}</p>
                <div v-for="row in whatsappTemplateRows" :key="row.kind" class="flex items-center justify-between text-sm py-1">
                  <span class="text-secondary">{{ row.label }}</span>
                  <span class="flex gap-2">
                    <span
                      v-for="language in row.languages"
                      :key="language.code"
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="language.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : language.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'"
                      :title="language.label"
                    >{{ language.code.toUpperCase() }}</span>
                  </span>
                </div>
                <div class="flex gap-2 pt-1">
                  <button type="button" class="ui-btn ui-btn--secondary text-xs" :disabled="whatsappSaving" @click="syncWhatsappTemplates">
                    {{ t('admin.pages.integrations.whatsapp.modal.templates.refresh') }}
                  </button>
                  <button type="button" class="ui-btn ui-btn--secondary text-xs" :disabled="whatsappSaving" @click="resubmitWhatsappTemplates">
                    {{ t('admin.pages.integrations.whatsapp.modal.templates.resubmit') }}
                  </button>
                </div>
              </div>
            </template>
          </div>

          <div class="flex items-center justify-between px-6 py-4 rounded-b-xl shrink-0 border-t border-line surface-2">
            <button
              v-if="whatsappStatus?.connected"
              type="button"
              class="text-sm font-medium text-rose-400"
              :disabled="whatsappSaving"
              @click="disconnectWhatsapp"
            >
              {{ t('admin.pages.integrations.whatsapp.modal.disconnect') }}
            </button>
            <div v-else />
            <button @click="closeWhatsappModal" class="ui-btn ui-btn--secondary text-sm">{{ t('admin.common.done') }}</button>
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

/* ------------------------------------------------------------- WhatsApp */

const showWhatsappModal = ref(false)
const whatsappStatus = ref<any>(null)
const whatsappConnecting = ref(false)
const whatsappSaving = ref(false)
const whatsappError = ref<string | null>(null)

const whatsappSignupAvailable = computed(() => Boolean(whatsappStatus.value?.signup?.available))

// One row per template, each carrying its per-language review state. A
// language Meta has never seen shows as MISSING rather than disappearing.
const whatsappTemplateRows = computed(() => {
  const languages = ['fr', 'ar', 'en']
  const templates = whatsappStatus.value?.templates ?? {}
  return [
    { kind: 'CONFIRMATION', labelKey: 'confirmation' },
    { kind: 'REMINDER', labelKey: 'reminder' }
  ].map((row) => ({
    kind: row.kind,
    label: t(`admin.pages.integrations.whatsapp.modal.templates.${row.labelKey}`),
    languages: languages.map((code) => {
      const status = templates?.[row.kind]?.languages?.[code]?.status || 'MISSING'
      return {
        code,
        status,
        label: t(`admin.pages.integrations.whatsapp.modal.templateStatus.${status}`, status)
      }
    })
  }))
})

async function fetchWhatsappStatus() {
  try {
    whatsappStatus.value = await $fetch('/api/admin/whatsapp/status', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
  } catch (e) {
    console.error('Failed to fetch WhatsApp status', e)
  }
}

function openWhatsappModal() {
  whatsappError.value = null
  showWhatsappModal.value = true
  void fetchWhatsappStatus()
}

function closeWhatsappModal() {
  showWhatsappModal.value = false
}

function whatsappErrorMessage(e: any) {
  return e?.data?.message || e?.data?.statusMessage || e?.message || t('admin.pages.integrations.whatsapp.modal.error')
}

// Meta only exposes Embedded Signup through its JS SDK, loaded on demand so
// no admin page pays for it until a seller actually connects a number.
function loadFacebookSdk(appId: string, version: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'))
    const w = window as any
    if (w.FB) return resolve(w.FB)

    w.fbAsyncInit = () => {
      w.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version })
      resolve(w.FB)
    }

    const script = document.createElement('script')
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.defer = true
    script.crossOrigin = "anonymous"
    script.onerror = () => reject(new Error('Failed to load the Facebook SDK'))
    document.body.appendChild(script)
  })
}

async function startWhatsappSignup() {
  const signup = whatsappStatus.value?.signup
  if (!signup?.available || whatsappConnecting.value) return

  whatsappError.value = null
  whatsappConnecting.value = true

  // The WABA and phone number ids never reach the FB.login callback: they
  // arrive on a postMessage from the signup window, so both have to be
  // collected before the connect call can be made.
  const session: { wabaId?: string; phoneNumberId?: string } = {}
  const onMessage = (event: MessageEvent) => {
    if (!/^https:\/\/(www\.)?facebook\.com$/.test(event.origin)) return
    try {
      const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return
      if (payload?.data?.waba_id) session.wabaId = String(payload.data.waba_id)
      if (payload?.data?.phone_number_id) session.phoneNumberId = String(payload.data.phone_number_id)
    } catch {
      /* not a signup message */
    }
  }
  window.addEventListener('message', onMessage)

  try {
    const FB = await loadFacebookSdk(signup.appId, signup.graphVersion)
    const code = await new Promise<string>((resolve, reject) => {
      FB.login(
        (response: any) => {
          const authCode = response?.authResponse?.code
          if (authCode) resolve(String(authCode))
          else reject(new Error('cancelled'))
        },
        {
          config_id: signup.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: { setup: {}, featureType: '', sessionInfoVersion: '3' }
        }
      )
    })

    const result: any = await $fetch('/api/admin/whatsapp/connect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { code, wabaId: session.wabaId, phoneNumberId: session.phoneNumberId }
    })
    if (result?.templateError) whatsappError.value = result.templateError
    await fetchWhatsappStatus()
  } catch (e: any) {
    if (e?.message !== 'cancelled') whatsappError.value = whatsappErrorMessage(e)
  } finally {
    window.removeEventListener('message', onMessage)
    whatsappConnecting.value = false
  }
}

async function updateWhatsappSettings(patch: Record<string, boolean>) {
  whatsappSaving.value = true
  whatsappError.value = null
  try {
    await $fetch('/api/admin/whatsapp/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: patch
    })
    await fetchWhatsappStatus()
  } catch (e: any) {
    whatsappError.value = whatsappErrorMessage(e)
    await fetchWhatsappStatus()
  } finally {
    whatsappSaving.value = false
  }
}

async function syncWhatsappTemplates() {
  whatsappSaving.value = true
  whatsappError.value = null
  try {
    await $fetch('/api/admin/whatsapp/templates/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await fetchWhatsappStatus()
  } catch (e: any) {
    whatsappError.value = whatsappErrorMessage(e)
  } finally {
    whatsappSaving.value = false
  }
}

async function resubmitWhatsappTemplates() {
  whatsappSaving.value = true
  whatsappError.value = null
  try {
    await $fetch('/api/admin/whatsapp/templates/ensure', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { force: true }
    })
    await fetchWhatsappStatus()
  } catch (e: any) {
    whatsappError.value = whatsappErrorMessage(e)
  } finally {
    whatsappSaving.value = false
  }
}

async function disconnectWhatsapp() {
  if (!confirm(t('admin.pages.integrations.whatsapp.modal.disconnectConfirm'))) return
  whatsappSaving.value = true
  whatsappError.value = null
  try {
    await $fetch('/api/admin/whatsapp/disconnect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await fetchWhatsappStatus()
  } catch (e: any) {
    whatsappError.value = whatsappErrorMessage(e)
  } finally {
    whatsappSaving.value = false
  }
}

onMounted(() => {
  fetchIntegrations()
  void fetchWhatsappStatus()
})
</script>
