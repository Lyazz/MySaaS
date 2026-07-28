<template>
  <div class="functional-form">
    <SettingsPageHeader
      :eyebrow="t('admin.nav.storefront') || 'Storefront'"
      :title="t('admin.pages.settings.functional.title')"
      :subtitle="t('admin.pages.settings.functional.subtitle')"
    />

    <SettingsAnchorTabs :tabs="tabs" :active-id="activeTab" @select="activeTab = $event" />

    <Transition name="status-fade">
      <div v-if="successMessage || errorMessage" class="status-toast" :class="errorMessage ? 'error' : 'success'">
        <Icon :name="errorMessage ? 'lucide:alert-triangle' : 'lucide:check-circle-2'" class="w-4 h-4" />
        {{ successMessage || errorMessage }}
      </div>
    </Transition>

    <form @submit.prevent="save" class="functional-sections">
      <div class="theme-group-heading">
        <span>{{ t('admin.functionalSettingsForm.themeGroups.sales.title') }}</span>
        <small>{{ t('admin.functionalSettingsForm.themeGroups.sales.subtitle') }}</small>
      </div>

      <!-- Features -->
      <SettingsSection
        anchor-id="features"
        icon="lucide:toggle-right"
        :title="t('admin.functionalSettingsForm.features.title')"
        :subtitle="t('admin.functionalSettingsForm.features.subtitle')"
      >
        <div class="toggle-list">
          <div class="toggle-row">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:handbag" class="w-4 h-4" />
              </div>
              <div>
                <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.features.cart.title') }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.features.cart.subtitle') }}</p>
              </div>
            </div>
            <BaseToggle v-model="form.cartEnabled" :sr-label="t('admin.functionalSettingsForm.features.cart.toggle')" />
          </div>

          <div class="toggle-row">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:banknote" class="w-4 h-4" />
              </div>
              <div>
                <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.features.cod.title') }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.features.cod.subtitle') }}</p>
              </div>
            </div>
            <BaseToggle v-model="form.codEnabled" :sr-label="t('admin.functionalSettingsForm.features.cod.toggle')" />
          </div>

          <div class="toggle-row toggle-row-disabled">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:search" class="w-4 h-4" />
              </div>
              <div>
                <p class="toggle-row-title">
                  {{ t('admin.functionalSettingsForm.storefrontSearch.title') }}
                  <span class="toggle-row-soon">{{ t('admin.common.soon') || 'Soon' }}</span>
                </p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.storefrontSearch.subtitle') }}</p>
              </div>
            </div>
            <BaseToggle :model-value="false" disabled :sr-label="t('admin.functionalSettingsForm.storefrontSearch.title')" />
          </div>
        </div>
      </SettingsSection>

      <!-- Checkout rules -->
      <SettingsSection
        anchor-id="checkout"
        icon="lucide:credit-card"
        :title="t('admin.functionalSettingsForm.checkoutRules.title') || 'Checkout rules'"
        :subtitle="t('admin.functionalSettingsForm.checkoutRules.subtitle') || 'Order conditions and checkout behavior.'"
      >
        <div class="toggle-list">
          <div class="toggle-row">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:badge-cent" class="w-4 h-4" />
              </div>
              <div class="toggle-row-flex">
                <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.checkoutRules.minimumOrder.title') }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.checkoutRules.minimumOrder.subtitle') }}</p>
                <div class="toggle-row-input">
                  <input
                    v-model.number="form.minimumOrderAmountDzd"
                    type="number"
                    min="0"
                    step="100"
                    class="field-input field-input-narrow"
                  >
                  <span class="field-suffix-text">{{ t('admin.functionalSettingsForm.checkoutRules.minimumOrder.unit') }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="toggle-row">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:hash" class="w-4 h-4" />
              </div>
              <div class="toggle-row-flex">
                <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.checkoutRules.orderIdPrefix.title') }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.checkoutRules.orderIdPrefix.subtitle') }}</p>
                <div class="toggle-row-input">
                  <input
                    v-model="form.orderIdPrefix"
                    type="text"
                    maxlength="5"
                    class="field-input field-input-narrow"
                    :placeholder="t('admin.functionalSettingsForm.checkoutRules.orderIdPrefix.placeholder')"
                    @input="sanitizeOrderIdPrefixInput"
                  >
                  <span class="field-suffix-text">{{ t('admin.functionalSettingsForm.checkoutRules.orderIdPrefix.hint') }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="toggle-row">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:map-pin-off" class="w-4 h-4" />
              </div>
              <div>
                <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.checkoutRules.hideOptionalAddress.title') }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.checkoutRules.hideOptionalAddress.subtitle') }}</p>
              </div>
            </div>
            <BaseToggle
              v-model="form.hideOptionalAddress"
              :sr-label="t('admin.functionalSettingsForm.checkoutRules.hideOptionalAddress.toggle')"
            />
          </div>
        </div>
      </SettingsSection>

      <!-- Messaging -->
      <SettingsSection
        anchor-id="messaging"
        icon="lucide:message-square"
        :title="t('admin.functionalSettingsForm.messaging.title')"
        :subtitle="t('admin.functionalSettingsForm.messaging.subtitle')"
      >
        <div class="field-group">
          <label class="field-label">{{ t('admin.functionalSettingsForm.messaging.whatsappTemplate.label') }}</label>
          <p class="field-hint mb-4">
            {{ t('admin.functionalSettingsForm.messaging.whatsappTemplate.hint') }}
            <br><br>
            <strong>{{ t('admin.functionalSettingsForm.messaging.whatsappTemplate.keywordsLabel') }}</strong><br>
            <code>{customerName}</code> - {{ t('admin.functionalSettingsForm.messaging.whatsappTemplate.keywords.customerName') }}<br>
            <code>{productsRecap}</code> - {{ t('admin.functionalSettingsForm.messaging.whatsappTemplate.keywords.productsRecap') }}<br>
            <code>{total}</code> - {{ t('admin.functionalSettingsForm.messaging.whatsappTemplate.keywords.total') }}<br>
            <code>{address}</code> - {{ t('admin.functionalSettingsForm.messaging.whatsappTemplate.keywords.address') }}<br>
            <code>{confirmLink}</code> - {{ t('admin.functionalSettingsForm.messaging.whatsappTemplate.keywords.confirmLink') }}
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <textarea
              v-model="form.whatsappConfirmationTemplate"
              class="field-input min-h-[150px]"
              style="height: 100%;"
            ></textarea>
            
            <div class="p-4 rounded-xl border h-full" style="background-color: var(--bg-secondary); border-color: var(--border-color);">
              <p class="text-xs font-bold mb-2 uppercase tracking-wide" style="color: var(--text-tertiary);">{{ t('admin.functionalSettingsForm.messaging.whatsappTemplate.preview') }}</p>
              <div class="whitespace-pre-wrap text-sm" style="color: var(--text-primary); font-family: monospace;">{{ whatsappTemplatePreview }}</div>
            </div>
          </div>
        </div>
      </SettingsSection>

      <div class="theme-group-heading">
        <span>{{ t('admin.functionalSettingsForm.themeGroups.invoices.title') }}</span>
        <small>{{ t('admin.functionalSettingsForm.themeGroups.invoices.subtitle') }}</small>
      </div>

      <!-- Sales invoices -->
      <SettingsSection
        anchor-id="invoices"
        icon="lucide:receipt-text"
        :title="t('admin.functionalSettingsForm.invoices.title')"
        :subtitle="t('admin.functionalSettingsForm.invoices.subtitle')"
      >
        <div class="toggle-list">
          <div class="toggle-row">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:receipt-text" class="w-4 h-4" />
              </div>
              <div>
                <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.invoices.enable.title') }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.invoices.enable.subtitle') }}</p>
              </div>
            </div>
            <BaseToggle v-model="form.salesInvoiceEnabled" :sr-label="t('admin.functionalSettingsForm.invoices.enable.toggle')" />
          </div>

          <Transition name="reveal">
            <div v-if="form.salesInvoiceEnabled" class="reveal-block">
              <div class="field-grid">
                <div class="field">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.invoices.prefix.label') }}</label>
                  <input
                    v-model="form.invoiceNumberPrefix"
                    type="text"
                    maxlength="12"
                    class="field-input"
                    :placeholder="t('admin.functionalSettingsForm.invoices.prefix.placeholder')"
                    @input="sanitizeInvoicePrefixInput"
                  >
                </div>
                <div class="field">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.invoices.logo.label') }}</label>
                  <div class="toggle-row compact">
                    <div class="toggle-row-info">
                      <div class="toggle-row-icon">
                        <Icon name="lucide:image" class="w-4 h-4" />
                      </div>
                      <div>
                        <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.invoices.logo.title') }}</p>
                        <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.invoices.logo.subtitle') }}</p>
                      </div>
                    </div>
                    <BaseToggle v-model="form.invoiceShowLogo" :sr-label="t('admin.functionalSettingsForm.invoices.logo.toggle')" />
                  </div>
                </div>
                <div class="field sm:col-span-2">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.invoices.footer.label') }}</label>
                  <textarea
                    v-model="form.invoiceFooterText"
                    rows="3"
                    maxlength="1000"
                    class="field-input"
                    :placeholder="t('admin.functionalSettingsForm.invoices.footer.placeholder')"
                  />
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </SettingsSection>

      <div class="theme-group-heading">
        <span>{{ t('admin.functionalSettingsForm.themeGroups.marketing.title') }}</span>
        <small>{{ t('admin.functionalSettingsForm.themeGroups.marketing.subtitle') }}</small>
      </div>

      <!-- Announcement bar -->
      <SettingsSection
        anchor-id="announcement"
        icon="lucide:megaphone"
        :title="t('admin.appearanceSettingsForm.announcement.title')"
        :subtitle="t('admin.appearanceSettingsForm.announcement.subtitle')"
      >
        <div class="toggle-list">
          <div class="toggle-row">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:megaphone" class="w-4 h-4" />
              </div>
              <div>
                <p class="toggle-row-title">{{ t('admin.appearanceSettingsForm.announcement.marquee') }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.appearanceSettingsForm.announcement.subtitle') }}</p>
              </div>
            </div>
            <BaseToggle
              v-model="form.announcementScrolling"
              :sr-label="t('admin.appearanceSettingsForm.announcement.marquee')"
            />
          </div>

          <Transition name="reveal">
            <div v-if="form.announcementScrolling" class="reveal-block">
              <label class="field-label">{{ t('admin.appearanceSettingsForm.announcement.message.label') }}</label>
              <input
                v-model="form.announcementText"
                type="text"
                class="field-input"
                :placeholder="t('admin.appearanceSettingsForm.announcement.message.placeholder')"
              >
            </div>
          </Transition>
        </div>
      </SettingsSection>

      <!-- Loyalty -->
      <SettingsSection
        anchor-id="loyalty"
        icon="lucide:badge-percent"
        :title="t('admin.functionalSettingsForm.loyalty.title') || 'Loyalty points'"
        :subtitle="t('admin.functionalSettingsForm.loyalty.subtitle') || 'Configure points calculation and redemption rules.'"
      >
        <div class="toggle-list">
          <div class="toggle-row">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:badge-percent" class="w-4 h-4" />
              </div>
              <div>
                <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.loyalty.enable') || 'Enable points' }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.loyalty.enableSubtitle') || 'Activate points calculation and checkout redemption.' }}</p>
              </div>
            </div>
            <BaseToggle v-model="form.loyaltyEnabled" :sr-label="t('admin.functionalSettingsForm.loyalty.enable') || 'Enable points'" />
          </div>

          <Transition name="reveal">
            <div v-if="form.loyaltyEnabled" class="reveal-block">
              <div class="field-grid">
                <div class="field">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.loyalty.basePoints') || 'Base points' }}</label>
                  <input v-model.number="form.loyaltyBasePoints" type="number" step="1" class="field-input" placeholder="0" >
                </div>
                <div class="field">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.loyalty.marginFactor') || 'Margin factor' }}</label>
                  <input v-model.number="form.loyaltyMarginFactor" type="number" step="0.01" class="field-input" placeholder="0.10" >
                </div>
                <div class="field">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.loyalty.minRedeem') || 'Minimum redemption' }}</label>
                  <input v-model.number="form.loyaltyMinRedeemPoints" type="number" min="0" step="1" class="field-input" placeholder="0" >
                </div>
                <div class="field">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.loyalty.dzdPerPoint') || 'DZD per point' }}</label>
                  <input v-model.number="form.loyaltyRedeemRateDzdPerPoint" type="number" min="0.01" step="0.01" class="field-input" placeholder="1" >
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </SettingsSection>

      <div class="theme-group-heading">
        <span>{{ t('admin.functionalSettingsForm.themeGroups.localization.title') }}</span>
        <small>{{ t('admin.functionalSettingsForm.themeGroups.localization.subtitle') }}</small>
      </div>

      <!-- Currency -->
      <SettingsSection
        anchor-id="currency"
        icon="lucide:dollar-sign"
        :title="t('admin.functionalSettingsForm.currency.title')"
        :subtitle="t('admin.functionalSettingsForm.currency.subtitle')"
      >
        <div class="field">
          <label class="field-label">{{ t('admin.functionalSettingsForm.currency.selectLabel') }}</label>
          <BaseSelect
            v-model="form.currencyCountry"
            :disabled="loadingCurrencies"
            @change="onCountryChange"
          >
            <option v-if="loadingCurrencies" value="" disabled>{{ t('admin.functionalSettingsForm.currency.loadingCurrencies') }}</option>
            <option v-for="c in currencies" :key="c.country" :value="c.country">{{ c.label }}</option>
          </BaseSelect>
          <p class="field-hint">{{ t('admin.functionalSettingsForm.currency.note') }}</p>
        </div>
      </SettingsSection>

      <!-- Localization -->
      <SettingsSection
        anchor-id="localization"
        icon="lucide:languages"
        :title="t('admin.functionalSettingsForm.localization.title')"
        :subtitle="t('admin.functionalSettingsForm.localization.subtitle')"
      >
        <div class="field">
          <label class="field-label">{{ t('admin.functionalSettingsForm.localization.defaultLanguage') }}</label>
          <div class="lang-grid">
            <button
              v-for="l in languages"
              :key="l.key"
              type="button"
              class="lang-card"
              :class="{ 'is-active': form.language === l.key }"
              @click="form.language = l.key"
            >
              <span class="lang-flag">{{ l.flag }}</span>
              <span class="lang-label">{{ l.label }}</span>
              <Icon v-if="form.language === l.key" name="lucide:check" class="lang-check" />
            </button>
          </div>

          <Transition name="reveal">
            <div v-if="form.language === 'ar'" class="lang-rtl-banner">
              <Icon name="lucide:rotate-3d" class="w-4 h-4" />
              <div>
                <p class="lang-rtl-title">{{ t('admin.functionalSettingsForm.localization.rtl.title') }}</p>
                <p class="lang-rtl-subtitle">{{ t('admin.functionalSettingsForm.localization.rtl.subtitle') }}</p>
              </div>
            </div>
          </Transition>
        </div>
      </SettingsSection>
    </form>

    <SettingsSaveBar
      :is-dirty="isDirty"
      :saving="saving"
      @save="save"
      @discard="reset"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseToggle from '~/components/ui/BaseToggle.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import SettingsPageHeader from './settings/SettingsPageHeader.vue'
import SettingsSection from './settings/SettingsSection.vue'
import SettingsSaveBar from './settings/SettingsSaveBar.vue'
import SettingsAnchorTabs from './settings/SettingsAnchorTabs.vue'

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const loading = ref(false)
const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const loadingCurrencies = ref(false)

const defaultWhatsappTemplate = `Bonjour {customerName},
Merci pour votre commande !
Voici un récapitulatif :
{productsRecap}

Total : {total}
Veuillez cliquer ici pour confirmer votre commande :
{confirmLink}`

const form = reactive({
  cartEnabled: true,
  codEnabled: true,
  currencyCode: 'DZD',
  currencyCountry: 'DZ',
  language: 'en',
  announcementText: '',
  announcementScrolling: false,
  loyaltyEnabled: false,
  loyaltyBasePoints: 0,
  loyaltyMarginFactor: 0,
  loyaltyMinRedeemPoints: 0,
  loyaltyRedeemRateDzdPerPoint: 1,
  orderIdPrefix: 'ORDR',
  minimumOrderAmountDzd: 1000,
  hideOptionalAddress: true,
  salesInvoiceEnabled: false,
  invoiceNumberPrefix: 'INV',
  invoiceFooterText: '',
  invoiceShowLogo: true,
  whatsappConfirmationTemplate: defaultWhatsappTemplate
})

const initialFormString = ref(JSON.stringify(form))
const isDirty = computed(() => initialFormString.value !== JSON.stringify(form))

const whatsappTemplatePreview = computed(() => {
  const tpl = form.whatsappConfirmationTemplate || defaultWhatsappTemplate
  return tpl
    .replace(/{customerName}/g, 'Amine')
    .replace(/{productsRecap}/g, '- 1x AirPods Pro (35,000 DZD)\n- 2x Coque Silicone (3,000 DZD)')
    .replace(/{total}/g, '38,600 DZD')
    .replace(/{address}/g, '123 Rue de la Liberté, Alger Centre, Alger')
    .replace(/{confirmLink}/g, 'https://store.swekly.com/confirm-order/abc123xyz')
})

const activeTab = ref('features')
const tabs = computed(() => [
  { id: 'features', label: t('admin.functionalSettingsForm.features.title'), icon: 'lucide:toggle-right' },
  { id: 'checkout', label: t('admin.functionalSettingsForm.checkoutRules.title') || 'Checkout', icon: 'lucide:credit-card' },
  { id: 'messaging', label: t('admin.functionalSettingsForm.messaging.title') || 'Messaging', icon: 'lucide:message-square' },
  { id: 'invoices', label: t('admin.functionalSettingsForm.invoices.title'), icon: 'lucide:receipt-text' },
  { id: 'announcement', label: t('admin.appearanceSettingsForm.announcement.title'), icon: 'lucide:megaphone' },
  { id: 'loyalty', label: t('admin.functionalSettingsForm.loyalty.title') || 'Loyalty', icon: 'lucide:badge-percent' },
  { id: 'currency', label: t('admin.functionalSettingsForm.currency.title'), icon: 'lucide:dollar-sign' },
  { id: 'localization', label: t('admin.functionalSettingsForm.localization.title'), icon: 'lucide:languages' }
])

const languages = computed(() => [
  { key: 'en', label: t('i18n.locales.en'), flag: '🇬🇧' },
  { key: 'fr', label: t('i18n.locales.fr'), flag: '🇫🇷' },
  { key: 'ar', label: t('i18n.locales.ar'), flag: '🇩🇿' }
])

interface CurrencyOption {
  code: string
  country: string
  flag: string
  label: string
}

const currencies = ref<CurrencyOption[]>([])

const fetchCurrencies = async () => {
  loadingCurrencies.value = true
  try {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies,cca2,flag')
    if (!response.ok) throw new Error('Failed to fetch countries')
    const data = await response.json()
    const formatted: CurrencyOption[] = data
      .filter((c: any) => c.currencies && Object.keys(c.currencies).length > 0)
      .map((c: any) => {
        const currencyCode = Object.keys(c.currencies)[0]
        return {
          code: currencyCode,
          country: c.cca2,
          flag: c.flag,
          label: `${c.flag} ${c.name.common} (${currencyCode})`
        }
      })
      .sort((a: CurrencyOption, b: CurrencyOption) => a.label.localeCompare(b.label))
    currencies.value = formatted
  } catch (e) {
    console.error('Failed to load currencies', e)
    currencies.value = [
      { code: 'DZD', country: 'DZ', flag: '🇩🇿', label: '🇩🇿 Algeria (DZD)' },
      { code: 'USD', country: 'US', flag: '🇺🇸', label: '🇺🇸 United States (USD)' },
      { code: 'EUR', country: 'FR', flag: '🇪🇺', label: '🇪🇺 Euro (EUR)' }
    ]
  } finally {
    loadingCurrencies.value = false
  }
}

const updateForm = (data: any) => {
  if (!data) return
  form.cartEnabled = data.cartEnabled ?? true
  form.codEnabled = data.codEnabled ?? true
  form.orderIdPrefix = data.orderIdPrefix || 'ORDR'
  form.currencyCode = data.currencyCode || 'DZD'
  form.currencyCountry = data.currencyCountry || 'DZ'
  form.language = data.language || 'en'
  form.announcementText = data.announcementText || ''
  form.announcementScrolling = data.announcementScrolling || false
  form.loyaltyEnabled = data.loyaltyEnabled ?? false
  form.loyaltyBasePoints = Number(data.loyaltyBasePoints ?? 0)
  form.loyaltyMarginFactor = Number(data.loyaltyMarginFactor ?? 0)
  form.loyaltyMinRedeemPoints = Number(data.loyaltyMinRedeemPoints ?? 0)
  form.loyaltyRedeemRateDzdPerPoint = Number(data.loyaltyRedeemRateDzdPerPoint ?? 1)
  form.minimumOrderAmountDzd = Number(data.minimumOrderAmountDzd ?? 1000)
  form.hideOptionalAddress = data.hideOptionalAddress ?? true
  form.salesInvoiceEnabled = data.salesInvoiceEnabled ?? false
  form.invoiceNumberPrefix = data.invoiceNumberPrefix || 'INV'
  form.invoiceFooterText = data.invoiceFooterText || ''
  form.invoiceShowLogo = data.invoiceShowLogo ?? true
  form.whatsappConfirmationTemplate = data.whatsappConfirmationTemplate || defaultWhatsappTemplate
  initialFormString.value = JSON.stringify(form)
}

const fetchSettings = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/store-settings', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    updateForm(data)
  } catch (e) {
    console.error('Failed to load settings', e)
    errorMessage.value = t('admin.functionalSettingsForm.messages.loadFailed')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''
  try {
    const updated = await $fetch('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        cartEnabled: form.cartEnabled,
        codEnabled: form.codEnabled,
        orderIdPrefix: form.orderIdPrefix,
        currencyCode: form.currencyCode,
        currencyCountry: form.currencyCountry,
        language: form.language,
        announcementText: form.announcementText,
        announcementScrolling: form.announcementScrolling,
        loyaltyEnabled: form.loyaltyEnabled,
        loyaltyBasePoints: form.loyaltyBasePoints,
        loyaltyMarginFactor: form.loyaltyMarginFactor,
        loyaltyMinRedeemPoints: form.loyaltyMinRedeemPoints,
        loyaltyRedeemRateDzdPerPoint: form.loyaltyRedeemRateDzdPerPoint,
        minimumOrderAmountDzd: form.minimumOrderAmountDzd,
        hideOptionalAddress: form.hideOptionalAddress,
        salesInvoiceEnabled: form.salesInvoiceEnabled,
        invoiceNumberPrefix: form.invoiceNumberPrefix,
        invoiceFooterText: form.invoiceFooterText,
        invoiceShowLogo: form.invoiceShowLogo,
        whatsappConfirmationTemplate: form.whatsappConfirmationTemplate
      }
    })
    useState<any>('storeSettings').value = updated
    updateForm(updated)
    successMessage.value = t('admin.functionalSettingsForm.messages.saved')
    setTimeout(() => (successMessage.value = ''), 4000)
  } catch (e: any) {
    console.error('Failed to save settings', e)
    errorMessage.value = e.data?.statusMessage || t('admin.functionalSettingsForm.messages.saveFailed')
    setTimeout(() => (errorMessage.value = ''), 4000)
  } finally {
    saving.value = false
  }
}

const reset = () => {
  if (confirm(t('admin.functionalSettingsForm.confirm.discard'))) {
    fetchSettings()
  }
}

const onCountryChange = () => {
  const cur = currencies.value.find((c) => c.country === form.currencyCountry)
  if (cur) form.currencyCode = cur.code
}

const sanitizeOrderIdPrefixInput = () => {
  form.orderIdPrefix = String(form.orderIdPrefix || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5)
}

const sanitizeInvoicePrefixInput = () => {
  form.invoiceNumberPrefix = String(form.invoiceNumberPrefix || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
}

function setupScrollSpy() {
  if (typeof window === 'undefined') return
  const ids = ['features', 'checkout', 'invoices', 'announcement', 'loyalty', 'currency', 'localization']
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      if (visible.length > 0 && visible[0].target.id) {
        activeTab.value = visible[0].target.id
      }
    },
    { rootMargin: '-80px 0px -50% 0px', threshold: [0.1, 0.3, 0.6] }
  )
  nextTick(() => {
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
  })
  onBeforeUnmount(() => observer.disconnect())
}

onMounted(() => {
  fetchCurrencies()
  fetchSettings()
  setupScrollSpy()
})
</script>

<style scoped>
.functional-form {
  padding-bottom: 120px;
}

.status-toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 500;
  margin-bottom: 16px;
}

.status-toast.success {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.status-toast.error {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.status-fade-enter-from,
.status-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.status-fade-enter-active,
.status-fade-leave-active {
  transition: all 0.18s ease;
}

.functional-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.theme-group-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-top: 8px;
  padding: 4px 2px 0;
}

.theme-group-heading span {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.3;
  text-transform: uppercase;
}

.theme-group-heading small {
  max-width: 44ch;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.4;
  text-align: right;
}

@media (max-width: 640px) {
  .theme-group-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .theme-group-heading small {
    max-width: none;
    text-align: left;
  }
}

/* Toggle list */
.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  background: var(--surface-1);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  transition: border-color 0.15s ease;
}

.toggle-row:hover {
  border-color: color-mix(in srgb, var(--surface-border) 70%, var(--text-muted));
}

.toggle-row-disabled {
  opacity: 0.5;
}

.toggle-row-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.toggle-row-flex {
  flex: 1;
  min-width: 0;
}

.toggle-row-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--surface-3);
  border: 1px solid var(--surface-border);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.toggle-row-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-row-soon {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--text-muted);
}

.toggle-row-subtitle {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.toggle-row-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

/* Reveal block */
.reveal-block {
  padding: 14px 16px;
  background: var(--surface-2);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reveal-enter-from,
.reveal-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-4px);
}

.reveal-enter-to,
.reveal-leave-from {
  opacity: 1;
  max-height: 320px;
}

.reveal-enter-active,
.reveal-leave-active {
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

/* Fields */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 720px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}

.field-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.field-hint {
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.field-input {
  width: 100%;
  padding: 9px 12px;
  border-radius: 9px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  color: var(--text-primary);
  font-size: 13px;
  transition: all 0.15s ease;
}

.field-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(var(--brand-rgb) / 0.18);
}

.field-input-narrow {
  max-width: 200px;
}

.field-suffix-text {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  font-family: ui-monospace, monospace;
}

/* Languages grid */
.lang-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 600px) {
  .lang-grid {
    grid-template-columns: 1fr;
  }
}

.lang-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  background: var(--surface-1);
  border: 2px solid var(--surface-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lang-card:hover {
  border-color: color-mix(in srgb, var(--surface-border) 50%, var(--text-muted));
  transform: translateY(-1px);
}

.lang-card.is-active {
  border-color: var(--brand);
  background: rgba(var(--brand-rgb) / 0.06);
}

.lang-flag {
  font-size: 24px;
  line-height: 1;
}

.lang-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.lang-card.is-active .lang-label {
  color: var(--brand);
}

.lang-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 14px;
  height: 14px;
  color: var(--brand);
}

.lang-rtl-banner {
  margin-top: 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(var(--brand-rgb) / 0.08);
  border: 1px solid rgba(var(--brand-rgb) / 0.22);
  border-radius: 10px;
  color: var(--brand);
}

.lang-rtl-title {
  font-size: 12.5px;
  font-weight: 600;
}

.lang-rtl-subtitle {
  margin-top: 2px;
  font-size: 11.5px;
  color: color-mix(in srgb, var(--brand) 70%, var(--text-secondary));
  line-height: 1.4;
}
</style>
