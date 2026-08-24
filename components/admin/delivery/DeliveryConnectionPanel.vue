<template>
  <div class="flex flex-col gap-4">
    <!-- No credentials needed -->
    <div
      v-if="provider.credentialFields.length === 0"
      class="delivery-empty"
    >
      <Icon
        name="lucide:plug-zap"
        class="h-5 w-5"
        style="color: var(--text-tertiary)"
      />
      <p
        class="text-sm"
        style="color: var(--text-secondary)"
      >
        {{ t('admin.pages.delivery.credentials.noCredentials') }}
      </p>
    </div>

    <template v-else>
      <!-- Live toggle -->
      <div class="delivery-liveline">
        <div class="min-w-0">
          <p
            class="text-[13px] font-semibold"
            style="color: var(--text-primary)"
          >
            {{ t('admin.pages.delivery.credentials.enableLabel') }}
          </p>
          <p
            class="mt-0.5 text-xs"
            style="color: var(--text-tertiary)"
          >
            {{ t('admin.pages.delivery.credentials.enableHint') }}
          </p>
        </div>
        <DeliverySwitch
          v-model="isActive"
          :label="t('admin.pages.delivery.credentials.enableLabel')"
        />
      </div>

      <!-- Credential fields -->
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div
          v-for="field in provider.credentialFields"
          :key="field.key"
        >
          <label
            class="ui-label"
            :for="`cred-${field.key}`"
          >
            {{ field.label }}
            <span
              v-if="field.required"
              style="color: var(--status-cancelled-text)"
            >*</span>
          </label>
          <div class="flex gap-2">
            <input
              :id="`cred-${field.key}`"
              v-model="draft[field.key]"
              :type="field.secret ? 'password' : 'text'"
              :placeholder="placeholder(field)"
              autocomplete="off"
              class="ui-input flex-1 text-sm"
            >
            <button
              v-if="field.secret && provider.account?.secrets?.[field.key]"
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--sm shrink-0"
              @click="clearSecret(field.key)"
            >
              {{ t('admin.common.clear') }}
            </button>
          </div>
          <p
            v-if="field.secret"
            class="mt-1 flex items-center gap-1.5 text-[11px]"
            style="color: var(--text-muted)"
          >
            <span
              class="inline-block h-1.5 w-1.5 rounded-full"
              :style="{
                background: provider.account?.secrets?.[field.key]
                  ? 'var(--status-delivered-text)'
                  : 'var(--text-muted)'
              }"
            />
            {{
              provider.account?.secrets?.[field.key]
                ? t('admin.pages.delivery.credentials.secretSet')
                : t('admin.pages.delivery.credentials.secretNotSet')
            }}
          </p>
        </div>
      </div>

      <DeliveryMaystroResync
        v-if="provider.provider === 'MAYSTRO'"
        :disabled="!provider.account?.isActive"
      />

      <DeliveryYalidineWebhook v-if="provider.provider === 'YALIDINE'" />

      <!-- Save -->
      <div class="flex flex-wrap items-center justify-end gap-3 pt-1">
        <p
          v-if="message"
          class="me-auto text-xs"
          :style="{ color: messageKind === 'error' ? 'var(--status-cancelled-text)' : 'var(--status-delivered-text)' }"
        >
          {{ message }}
        </p>
        <button
          type="button"
          class="ui-btn ui-btn--primary ui-btn--md"
          :disabled="saving"
          @click="submit"
        >
          {{ saving ? t('admin.common.saving') : t('admin.pages.delivery.credentials.save') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import DeliverySwitch from './DeliverySwitch.vue'
import DeliveryMaystroResync from './DeliveryMaystroResync.vue'
import DeliveryYalidineWebhook from './DeliveryYalidineWebhook.vue'
import type { DeliveryCredentialField, DeliveryProviderAdminView } from '~/shared/admin/delivery-admin'

const props = defineProps<{
  provider: DeliveryProviderAdminView
  saving: boolean
  message: string
  messageKind: 'success' | 'error'
}>()

const emit = defineEmits<{
  save: [{ isActive: boolean; config: Record<string, string> }]
}>()

const { t } = useI18n({ useScope: 'global' })

const isActive = ref(false)
const draft = ref<Record<string, string>>({})
const clearedSecrets = ref<Record<string, boolean>>({})

watch(
  () => props.provider,
  (provider) => {
    isActive.value = provider.account?.isActive ?? false
    clearedSecrets.value = {}
    draft.value = Object.fromEntries(
      provider.credentialFields.map((field) => {
        if (field.secret) return [field.key, '']
        const raw = provider.account?.config?.[field.key]
        return [field.key, raw == null ? '' : String(raw)]
      })
    )
  },
  { immediate: true }
)

function placeholder(field: DeliveryCredentialField) {
  if (!field.secret) return ''
  return props.provider.account?.secrets?.[field.key]
    ? t('admin.pages.delivery.credentials.secretPlaceholderSet')
    : t('admin.pages.delivery.credentials.secretPlaceholderNotSet')
}

function clearSecret(key: string) {
  clearedSecrets.value[key] = true
  draft.value[key] = ''
}

function submit() {
  const config: Record<string, string> = {}

  for (const field of props.provider.credentialFields) {
    const value = (draft.value[field.key] ?? '').trim()

    if (!field.secret) {
      config[field.key] = value
      continue
    }
    if (clearedSecrets.value[field.key]) config[field.key] = ''
    else if (value.length > 0) config[field.key] = value
  }

  emit('save', { isActive: isActive.value, config })
}
</script>

<style scoped>
.delivery-liveline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.875rem;
  background: var(--surface-2);
}

.delivery-empty {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1rem;
  border: 1px dashed var(--surface-border);
  border-radius: 0.875rem;
  background: var(--surface-2);
}
</style>
