<template>
  <div class="mx-auto max-w-7xl">
    <AdminPageHeader
      :section="t('admin.pages.delivery.section')"
      :title="t('admin.pages.delivery.title')"
      :subtitle="t('admin.pages.delivery.subtitle')"
      :stats="headerStats"
    />

    <div class="delivery-layout">
      <DeliveryCarrierRail
        :providers="providers"
        :selected="selectedProvider?.provider ?? null"
        :store-pickup-enabled="storePickupEnabled"
        :store-pickup-saving="storePickupSaving"
        @select="selectProvider"
        @toggle-offered="toggleOffered"
        @toggle-store-pickup="toggleStorePickup"
      />

      <section
        data-tour="delivery-config"
        class="delivery-workspace"
      >
        <template v-if="selectedProvider">
          <header class="delivery-workspace__header">
            <CarrierLogo
              :provider="selectedProvider.provider"
              :name="selectedProvider.name"
              size="md"
            />
            <div class="min-w-0 flex-1">
              <h3
                class="truncate text-[15px] font-semibold"
                style="color: var(--text-primary)"
              >
                {{ selectedProvider.name }}
              </h3>
              <p
                class="mt-0.5 text-xs"
                style="color: var(--text-tertiary)"
              >
                {{
                  selectedProvider.offered
                    ? t('admin.pages.delivery.workspace.offered')
                    : t('admin.pages.delivery.workspace.notOffered')
                }}
              </p>
            </div>
            <DeliverySwitch
              :model-value="selectedProvider.offered"
              :label="t('admin.pages.delivery.rail.offerToggle', { provider: selectedProvider.name })"
              @update:model-value="toggleOffered(selectedProvider)"
            />
          </header>

          <div
            class="delivery-tabs"
            role="tablist"
            :aria-label="selectedProvider.name"
          >
            <button
              v-for="tab in tabs"
              :key="tab.value"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.value"
              class="delivery-tabs__tab"
              :class="{ 'is-active': activeTab === tab.value }"
              @click="activeTab = tab.value"
            >
              <Icon
                :name="tab.icon"
                class="h-4 w-4"
              />
              {{ tab.label }}
            </button>
          </div>

          <div class="delivery-workspace__body">
            <DeliveryConnectionPanel
              v-show="activeTab === 'connection'"
              :key="`connection-${selectedProvider.provider}`"
              :provider="selectedProvider"
              :saving="savingAccount"
              :message="accountMessage"
              :message-kind="accountMessageKind"
              @save="saveAccount"
            />
            <DeliveryPricingPanel
              v-show="activeTab === 'pricing'"
              :key="`pricing-${selectedProvider.provider}`"
              :provider="selectedProvider"
            />
          </div>
        </template>

        <div
          v-else
          class="delivery-workspace__empty"
        >
          <Icon
            name="lucide:truck"
            class="h-7 w-7"
            style="color: var(--text-muted)"
          />
          <p
            class="text-sm font-medium"
            style="color: var(--text-secondary)"
          >
            {{ t('admin.pages.delivery.workspace.emptyTitle') }}
          </p>
          <p
            class="max-w-xs text-xs leading-relaxed"
            style="color: var(--text-tertiary)"
          >
            {{ t('admin.pages.delivery.workspace.emptyHint') }}
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import CarrierLogo from '~/components/admin/delivery/CarrierLogo.vue'
import DeliveryCarrierRail from '~/components/admin/delivery/DeliveryCarrierRail.vue'
import DeliveryConnectionPanel from '~/components/admin/delivery/DeliveryConnectionPanel.vue'
import DeliveryPricingPanel from '~/components/admin/delivery/DeliveryPricingPanel.vue'
import DeliverySwitch from '~/components/admin/delivery/DeliverySwitch.vue'
import { useAuthStore } from '~/stores/auth'
import type { DeliveryProviderAdminView } from '~/shared/admin/delivery-admin'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.delivery.metaTitle'
})

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const { autoStartIfNeeded } = useTour()

type WorkspaceTab = 'connection' | 'pricing'

const providers = ref<DeliveryProviderAdminView[]>([])
const selectedProvider = ref<DeliveryProviderAdminView | null>(null)
const activeTab = ref<WorkspaceTab>('pricing')

const savingAccount = ref(false)
const accountMessage = ref('')
const accountMessageKind = ref<'success' | 'error'>('success')

const storePickupEnabled = ref(false)
const storePickupSaving = ref(false)

const authHeaders = computed(() => ({ Authorization: `Bearer ${authStore.token}` }))

const tabs = computed(() => [
  { value: 'connection' as const, label: t('admin.pages.delivery.tabs.connection'), icon: 'lucide:key-round' },
  { value: 'pricing' as const, label: t('admin.pages.delivery.tabs.pricing'), icon: 'lucide:banknote' }
])

const headerStats = computed(() => {
  const offered = providers.value.filter((p) => p.offered).length
  const connected = providers.value.filter(
    (p) => p.credentialFields.length === 0 || p.account?.isActive
  ).length

  return [
    { label: t('admin.pages.delivery.stats.offered'), value: offered, tone: offered > 0 ? ('green' as const) : undefined },
    { label: t('admin.pages.delivery.stats.connected'), value: connected },
    { label: t('admin.pages.delivery.stats.wilayas'), value: 58 }
  ]
})

onMounted(async () => {
  await Promise.all([loadStorePickupSetting(), loadProviders()])
  autoStartIfNeeded('delivery')
})

/* ── Providers ───────────────────────────────────────────────────────── */

async function loadProviders() {
  try {
    providers.value = await $fetch<DeliveryProviderAdminView[]>('/api/admin/delivery/providers', {
      headers: authHeaders.value
    })

    if (!selectedProvider.value) {
      const first = providers.value.find((p) => p.offered) ?? providers.value[0]
      if (first) selectProvider(first)
    }
  } catch (e) {
    console.error('Failed to load delivery providers', e)
  }
}

function selectProvider(provider: DeliveryProviderAdminView) {
  selectedProvider.value = provider
  accountMessage.value = ''
  // A carrier that still needs credentials has nothing to price yet.
  activeTab.value =
    provider.credentialFields.length > 0 && !provider.account?.isActive ? 'connection' : 'pricing'
}

function applyProviderUpdate(updated: DeliveryProviderAdminView) {
  const index = providers.value.findIndex((p) => p.provider === updated.provider)
  if (index !== -1) providers.value[index] = updated
  if (selectedProvider.value?.provider === updated.provider) selectedProvider.value = updated
}

async function toggleOffered(provider: DeliveryProviderAdminView) {
  const previous = provider.offered
  provider.offered = !previous

  try {
    const updated = await $fetch<DeliveryProviderAdminView>(
      `/api/admin/delivery/providers/${provider.provider}/account`,
      { method: 'PUT', headers: authHeaders.value, body: { offered: provider.offered } }
    )
    applyProviderUpdate(updated)
  } catch (e) {
    provider.offered = previous
    console.error('Failed to update provider status', e)
  }
}

async function saveAccount(payload: { isActive: boolean; config: Record<string, string> }) {
  const provider = selectedProvider.value
  if (!provider) return

  savingAccount.value = true
  accountMessage.value = ''

  try {
    const updated = await $fetch<DeliveryProviderAdminView>(
      `/api/admin/delivery/providers/${provider.provider}/account`,
      {
        method: 'PUT',
        headers: authHeaders.value,
        body: {
          offered: provider.offered,
          isActive: payload.isActive,
          ...(Object.keys(payload.config).length > 0 ? { config: payload.config } : {})
        }
      }
    )
    applyProviderUpdate(updated)
    accountMessageKind.value = 'success'
    accountMessage.value = t('admin.common.saved')
  } catch (e: any) {
    console.error('Failed to save delivery provider credentials', e)
    accountMessageKind.value = 'error'
    accountMessage.value = e?.data?.statusMessage || t('admin.pages.delivery.credentials.errors.saveFailed')
  } finally {
    savingAccount.value = false
  }
}

/* ── Store pickup ────────────────────────────────────────────────────── */

async function loadStorePickupSetting() {
  try {
    const settings = await $fetch<any>('/api/admin/store-settings', { headers: authHeaders.value })
    storePickupEnabled.value = settings?.storePickupEnabled === true
  } catch (e) {
    console.error('Failed to load store pickup setting', e)
  }
}

async function toggleStorePickup() {
  if (storePickupSaving.value) return
  storePickupSaving.value = true
  const next = !storePickupEnabled.value

  try {
    const updated = await $fetch<any>('/api/admin/store-settings', {
      method: 'PATCH',
      headers: authHeaders.value,
      body: { storePickupEnabled: next }
    })
    storePickupEnabled.value = updated?.storePickupEnabled === true
  } catch (e) {
    console.error('Failed to update store pickup setting', e)
  } finally {
    storePickupSaving.value = false
  }
}
</script>

<style scoped>
.delivery-layout {
  display: grid;
  gap: 1.25rem;
  align-items: start;
}

@media (min-width: 1024px) {
  .delivery-layout {
    grid-template-columns: 17rem minmax(0, 1fr);
  }
}

.delivery-workspace {
  min-width: 0;
  border: 1px solid var(--surface-border);
  border-radius: 1rem;
  background: var(--surface-1);
  box-shadow: var(--card-shadow);
}

.delivery-workspace__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.125rem;
  border-bottom: 1px solid var(--surface-border);
}

.delivery-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0 1.125rem;
  border-bottom: 1px solid var(--surface-border);
}

.delivery-tabs__tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 0.5rem;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
  transition: color 0.15s ease;
}

.delivery-tabs__tab:hover {
  color: var(--text-secondary);
}

.delivery-tabs__tab.is-active {
  color: var(--text-primary);
}

.delivery-tabs__tab.is-active::after {
  content: '';
  position: absolute;
  inset-inline: 0.25rem;
  bottom: -1px;
  height: 2px;
  border-radius: 999px 999px 0 0;
  background: var(--brand);
}

.delivery-tabs__tab:focus-visible {
  outline: 2px solid rgb(var(--brand-rgb) / 0.7);
  outline-offset: -2px;
  border-radius: 0.375rem;
}

.delivery-workspace__body {
  padding: 1.125rem;
}

.delivery-workspace__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 4rem 1.5rem;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .delivery-tabs__tab {
    transition: none;
  }
}
</style>
