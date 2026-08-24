<template>
  <aside class="flex flex-col gap-5">
    <!-- Carriers -->
    <div>
      <p class="delivery-rail__eyebrow">
        {{ t('admin.pages.delivery.rail.carriers') }}
      </p>

      <div
        data-tour="delivery-providers"
        class="mt-2 flex flex-col gap-1.5"
        role="tablist"
        :aria-label="t('admin.pages.delivery.rail.carriers')"
      >
        <div
          v-for="provider in providers"
          :key="provider.provider"
          class="delivery-rail__item"
          :class="{ 'is-selected': selected === provider.provider }"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="selected === provider.provider"
            class="delivery-rail__button"
            @click="emit('select', provider)"
          >
            <CarrierLogo
              :provider="provider.provider"
              :name="provider.name"
              :muted="!isConnected(provider)"
            />
            <span class="min-w-0 flex-1 text-start">
              <span class="delivery-rail__name">{{ provider.name }}</span>
              <span class="delivery-rail__status">
                <span
                  class="delivery-rail__dot"
                  :class="statusTone(provider)"
                />
                {{ statusLabel(provider) }}
              </span>
            </span>
          </button>

          <DeliverySwitch
            :model-value="provider.offered"
            :label="t('admin.pages.delivery.rail.offerToggle', { provider: provider.name })"
            size="sm"
            class="delivery-rail__switch"
            @update:model-value="emit('toggle-offered', provider)"
          />
        </div>
      </div>
    </div>

    <!-- Store pickup — a checkout option, not a carrier -->
    <div>
      <p class="delivery-rail__eyebrow">
        {{ t('admin.pages.delivery.rail.alsoAtCheckout') }}
      </p>

      <div class="delivery-rail__item is-static mt-2">
        <span class="delivery-rail__button is-static">
          <span class="delivery-rail__mark tone-slate">
            <Icon
              name="lucide:store"
              class="h-4 w-4"
            />
          </span>
          <span class="min-w-0 flex-1 text-start">
            <span class="delivery-rail__name">{{ t('admin.pages.delivery.storePickup.title') }}</span>
            <span class="delivery-rail__status">
              {{
                storePickupEnabled
                  ? t('admin.pages.delivery.storePickup.on')
                  : t('admin.pages.delivery.storePickup.off')
              }}
            </span>
          </span>
        </span>

        <DeliverySwitch
          :model-value="storePickupEnabled"
          :label="t('admin.pages.delivery.storePickup.toggleLabel')"
          :disabled="storePickupSaving"
          size="sm"
          class="delivery-rail__switch"
          @update:model-value="emit('toggle-store-pickup')"
        />
      </div>

      <p
        class="mt-2 text-[11px] leading-relaxed"
        style="color: var(--text-tertiary)"
      >
        {{ t('admin.pages.delivery.storePickup.hint') }}
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import CarrierLogo from './CarrierLogo.vue'
import DeliverySwitch from './DeliverySwitch.vue'
import type { DeliveryProviderAdminView } from '~/shared/admin/delivery-admin'

defineProps<{
  providers: DeliveryProviderAdminView[]
  selected: string | null
  storePickupEnabled: boolean
  storePickupSaving: boolean
}>()

const emit = defineEmits<{
  select: [DeliveryProviderAdminView]
  'toggle-offered': [DeliveryProviderAdminView]
  'toggle-store-pickup': []
}>()

const { t } = useI18n({ useScope: 'global' })

function isConnected(provider: DeliveryProviderAdminView) {
  return provider.credentialFields.length === 0 || provider.account?.isActive === true
}

function statusTone(provider: DeliveryProviderAdminView) {
  if (provider.credentialFields.length === 0) return 'tone-slate'
  return provider.account?.isActive ? 'tone-live' : 'tone-idle'
}

function statusLabel(provider: DeliveryProviderAdminView) {
  if (provider.credentialFields.length === 0) return t('admin.pages.delivery.providers.noCredentials')
  return provider.account?.isActive
    ? t('admin.pages.delivery.providers.connected')
    : t('admin.pages.delivery.providers.notConnected')
}
</script>

<style scoped>
.delivery-rail__eyebrow {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.delivery-rail__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-inline-end: 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 0.875rem;
  background: var(--surface-1);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.delivery-rail__item:not(.is-static):hover {
  border-color: var(--surface-border-hover);
}

.delivery-rail__item.is-selected {
  background: var(--surface-2);
  border-color: var(--accent-border);
}

.delivery-rail__item.is-selected::before {
  content: '';
  position: absolute;
  inset-block: 0.625rem;
  inset-inline-start: -1px;
  width: 2px;
  border-radius: 999px;
  background: var(--brand);
}

.delivery-rail__button {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1;
  min-width: 0;
  padding: 0.625rem 0.75rem;
  border-radius: 0.875rem;
  text-align: start;
}

.delivery-rail__button:not(.is-static) {
  cursor: pointer;
}

.delivery-rail__button:focus-visible {
  outline: 2px solid rgb(var(--brand-rgb) / 0.7);
  outline-offset: -2px;
}

.delivery-rail__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.875rem;
  height: 1.875rem;
  flex-shrink: 0;
  border-radius: 0.625rem;
}

.tone-brand {
  background: var(--accent-soft);
  color: var(--brand);
}

.tone-slate {
  background: var(--surface-3);
  color: var(--text-tertiary);
}

.delivery-rail__name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delivery-rail__status {
  display: flex;
  align-items: center;
  gap: 0.3125rem;
  margin-top: 1px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.delivery-rail__dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  flex-shrink: 0;
}

.delivery-rail__dot.tone-live {
  background: var(--status-delivered-text);
}

.delivery-rail__dot.tone-idle {
  background: var(--status-pending-text);
}

.delivery-rail__dot.tone-slate {
  background: var(--text-muted);
}
</style>
