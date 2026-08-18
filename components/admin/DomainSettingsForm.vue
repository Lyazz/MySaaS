<template>
  <div class="domain-form">
    <SettingsPageHeader
      :title="t('admin.pages.settings.domains.title') || 'Domain settings'"
      :subtitle="t('admin.pages.settings.domains.subtitle') || 'Connect a bought domain to this storefront with a CNAME record.'"
    />

    <SettingsStatus
      :message="successMessage || errorMessage"
      :type="errorMessage ? 'error' : 'success'"
    />

    <div class="domain-sections">
      <SettingsSection
        anchor-id="custom-domain"
        icon="lucide:globe-2"
        :title="t('admin.domainSettingsForm.customDomain.title') || 'Custom domain'"
        :subtitle="t('admin.domainSettingsForm.customDomain.subtitle') || 'Add the exact hostname customers will visit, for example www.example.com.'"
      >
        <form class="domain-add" @submit.prevent="addDomain">
          <div class="domain-field">
            <label class="domain-label" for="custom-domain-input">
              {{ t('admin.domainSettingsForm.fields.domain') || 'Domain name' }}
            </label>
            <div class="domain-input-row">
              <input
                id="custom-domain-input"
                v-model="draftDomain"
                class="domain-input"
                type="text"
                inputmode="url"
                autocomplete="off"
                placeholder="www.example.com"
                :disabled="loading || saving"
              >
              <button class="domain-submit" type="submit" :disabled="loading || saving || !draftDomain.trim()">
                <Icon v-if="saving" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
                <Icon v-else name="lucide:plus" class="w-4 h-4" />
                <span>{{ t('admin.domainSettingsForm.actions.add') || 'Add domain' }}</span>
              </button>
            </div>
          </div>
        </form>

        <div class="dns-panel">
          <div class="dns-panel-head">
            <div class="dns-panel-icon">
              <Icon name="lucide:network" class="w-4 h-4" />
            </div>
            <div>
              <p class="dns-panel-title">{{ t('admin.domainSettingsForm.dns.title') || 'DNS record' }}</p>
              <p class="dns-panel-subtitle">
                {{ t('admin.domainSettingsForm.dns.subtitle') || 'Create this CNAME record at your domain provider, then keep the domain added here.' }}
              </p>
            </div>
          </div>

          <div class="dns-record">
            <div class="dns-cell">
              <span class="dns-label">Type</span>
              <strong>CNAME</strong>
            </div>
            <div class="dns-cell">
              <span class="dns-label">Host</span>
              <strong>{{ suggestedHost }}</strong>
            </div>
            <div class="dns-cell dns-cell-wide">
              <span class="dns-label">Value</span>
              <code>{{ cnameTarget || '...' }}</code>
            </div>
          </div>

          <p class="dns-note">
            {{ t('admin.domainSettingsForm.dns.apexNote') || 'For an apex domain like example.com, use ALIAS/ANAME if your DNS provider supports it, or redirect it to www.example.com.' }}
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        anchor-id="connected-domains"
        icon="lucide:link"
        :title="t('admin.domainSettingsForm.connected.title') || 'Connected domains'"
        :subtitle="t('admin.domainSettingsForm.connected.subtitle') || 'Domains listed here are allowed to resolve this tenant storefront.'"
      >
        <div v-if="loading" class="domain-empty">
          <Icon name="lucide:loader-2" class="domain-empty-icon animate-spin" />
          <p>{{ t('admin.common.loading') || 'Loading...' }}</p>
        </div>

        <div v-else-if="domains.length === 0" class="domain-empty">
          <Icon name="lucide:globe-lock" class="domain-empty-icon" />
          <p>{{ t('admin.domainSettingsForm.connected.empty') || 'No custom domains connected yet.' }}</p>
        </div>

        <div v-else class="domain-list">
          <div v-for="domain in domains" :key="domain.id" class="domain-row">
            <div class="domain-row-main">
              <div class="domain-row-icon">
                <Icon name="lucide:globe-2" class="w-4 h-4" />
              </div>
              <div class="domain-row-text">
                <p class="domain-name">{{ domain.domain }}</p>
                <p class="domain-meta">CNAME -> {{ domain.cnameTarget }}</p>
              </div>
            </div>
            <div class="domain-row-actions">
              <a class="domain-action" :href="`https://${domain.domain}`" target="_blank" rel="noopener noreferrer" :title="t('admin.actions.viewStore') || 'View store'">
                <Icon name="lucide:external-link" class="w-4 h-4" />
              </a>
              <button class="domain-action domain-action-danger" type="button" :disabled="deletingId === domain.id" @click="removeDomain(domain)">
                <Icon v-if="deletingId === domain.id" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
                <Icon v-else name="lucide:trash-2" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SettingsPageHeader from './settings/SettingsPageHeader.vue'
import SettingsStatus from './settings/SettingsStatus.vue'
import SettingsSection from './settings/SettingsSection.vue'

type TenantDomain = {
  id: string
  domain: string
  cnameTarget: string
  createdAt: string
  updatedAt: string
}

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const domains = ref<TenantDomain[]>([])
const cnameTarget = ref('')
const draftDomain = ref('')
const loading = ref(false)
const saving = ref(false)
const deletingId = ref('')
const successMessage = ref('')
const errorMessage = ref('')

const suggestedHost = computed(() => {
  const domain = draftDomain.value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] || domains.value[0]?.domain || 'www'
  if (domain.startsWith('www.')) return 'www'
  const parts = domain.split('.')
  return parts.length > 2 ? parts[0] : '@'
})

function headers() {
  return { Authorization: `Bearer ${authStore.token}` }
}

function showMessage(type: 'success' | 'error', text: string) {
  successMessage.value = type === 'success' ? text : ''
  errorMessage.value = type === 'error' ? text : ''
  window.setTimeout(() => {
    if (type === 'success') successMessage.value = ''
    if (type === 'error') errorMessage.value = ''
  }, 4000)
}

async function loadDomains() {
  loading.value = true
  try {
    const res = await $fetch('/api/admin/custom-domains', {
      headers: headers()
    }) as { domains: TenantDomain[]; cnameTarget: string }
    domains.value = res.domains
    cnameTarget.value = res.cnameTarget
  } catch (e: any) {
    console.error('Failed to load custom domains', e)
    showMessage('error', e?.data?.statusMessage || t('admin.domainSettingsForm.messages.loadFailed') || 'Failed to load domains.')
  } finally {
    loading.value = false
  }
}

async function addDomain() {
  if (!draftDomain.value.trim()) return

  saving.value = true
  try {
    const created = await $fetch('/api/admin/custom-domains', {
      method: 'POST',
      headers: headers(),
      body: { domain: draftDomain.value }
    }) as TenantDomain
    const existingIndex = domains.value.findIndex((domain) => domain.id === created.id)
    if (existingIndex >= 0) domains.value.splice(existingIndex, 1, created)
    else domains.value.push(created)
    cnameTarget.value = created.cnameTarget
    draftDomain.value = ''
    showMessage('success', t('admin.domainSettingsForm.messages.saved') || 'Domain connected.')
  } catch (e: any) {
    console.error('Failed to add custom domain', e)
    showMessage('error', e?.data?.statusMessage || t('admin.domainSettingsForm.messages.saveFailed') || 'Failed to add domain.')
  } finally {
    saving.value = false
  }
}

async function removeDomain(domain: TenantDomain) {
  if (!confirm(t('admin.domainSettingsForm.confirm.delete') || `Remove ${domain.domain}?`)) return

  deletingId.value = domain.id
  try {
    await $fetch(`/api/admin/custom-domains/${domain.id}`, {
      method: 'DELETE',
      headers: headers()
    })
    domains.value = domains.value.filter((item) => item.id !== domain.id)
    showMessage('success', t('admin.domainSettingsForm.messages.deleted') || 'Domain removed.')
  } catch (e: any) {
    console.error('Failed to remove custom domain', e)
    showMessage('error', e?.data?.statusMessage || t('admin.domainSettingsForm.messages.deleteFailed') || 'Failed to remove domain.')
  } finally {
    deletingId.value = ''
  }
}

onMounted(loadDomains)
</script>

<style scoped>
.domain-form {
  max-width: 1120px;
  margin: 0 auto;
}

.domain-sections {
  display: grid;
  gap: 20px;
}

.domain-add {
  margin-bottom: 18px;
}

.domain-label,
.dns-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.domain-input-row {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.domain-input {
  flex: 1;
  min-width: 0;
  height: 42px;
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  background: var(--surface-1);
  color: var(--text-primary);
  padding: 0 13px;
  font-size: 14px;
  outline: none;
}

.domain-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(var(--brand-rgb) / 0.14);
}

.domain-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
  padding: 0 15px;
  border: 0;
  border-radius: 10px;
  background: var(--brand);
  color: var(--brand-contrast);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.domain-submit:disabled,
.domain-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.dns-panel {
  padding: 16px;
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  background: var(--surface-1);
}

.dns-panel-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.dns-panel-icon,
.domain-row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(var(--brand-rgb) / 0.12);
  color: var(--brand);
  flex: none;
}

.dns-panel-title {
  font-weight: 700;
  color: var(--text-primary);
}

.dns-panel-subtitle,
.dns-note,
.domain-meta {
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}

.dns-record {
  display: grid;
  grid-template-columns: 110px 120px minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.dns-cell {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  background: var(--surface-2);
}

.dns-cell strong,
.dns-cell code {
  display: block;
  margin-top: 5px;
  color: var(--text-primary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.domain-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-tertiary);
  font-size: 14px;
}

.domain-empty-icon {
  width: 18px;
  height: 18px;
}

.domain-list {
  display: grid;
  gap: 10px;
}

.domain-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  background: var(--surface-1);
}

.domain-row-main,
.domain-row-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.domain-row-text {
  min-width: 0;
}

.domain-name {
  color: var(--text-primary);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.domain-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.domain-action:hover {
  color: var(--text-primary);
  background: var(--nav-hover-bg);
}

.domain-action-danger:hover {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.4);
}

@media (max-width: 720px) {
  .domain-input-row,
  .domain-row {
    flex-direction: column;
    align-items: stretch;
  }

  .domain-submit {
    width: 100%;
  }

  .dns-record {
    grid-template-columns: 1fr;
  }

  .domain-row-actions {
    justify-content: flex-end;
  }
}
</style>
