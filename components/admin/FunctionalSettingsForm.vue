<template>
  <div class="functional-form">
    <SettingsPageHeader
      :title="pageTitle"
      :subtitle="pageSubtitle"
    />

    <SettingsStatus
      :message="successMessage || errorMessage"
      :type="errorMessage ? 'error' : 'success'"
    />

    <form @submit.prevent="save" class="functional-sections">
      <!-- Features -->
      <SettingsSection
        v-show="visibleAnchors.includes('features')"
        :bare="isSoleSection"
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
        v-show="visibleAnchors.includes('checkout')"
        :bare="isSoleSection"
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
        v-show="visibleAnchors.includes('messaging')"
        :bare="isSoleSection"
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
            <code>{payment}</code> - {{ t('admin.functionalSettingsForm.messaging.whatsappTemplate.keywords.payment', 'Payment') }}<br>
            <code>{remaining}</code> - {{ t('admin.functionalSettingsForm.messaging.whatsappTemplate.keywords.remaining', 'Remaining') }}<br>
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

      <!-- Sales invoices -->
      <SettingsSection
        v-show="visibleAnchors.includes('invoices')"
        :bare="isSoleSection"
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

      <!-- Announcement bar -->
      <SettingsSection
        v-show="visibleAnchors.includes('announcement')"
        :bare="isSoleSection"
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
        v-show="visibleAnchors.includes('loyalty')"
        :bare="isSoleSection"
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

      <!-- Clearance (destockage) -->
      <SettingsSection
        v-show="visibleAnchors.includes('clearance')"
        :bare="isSoleSection"
        anchor-id="clearance"
        icon="lucide:package-open"
        :title="t('admin.functionalSettingsForm.clearance.title') || 'Clearance (destockage)'"
        :subtitle="t('admin.functionalSettingsForm.clearance.subtitle') || 'Reward customers who buy in bulk from your clearance products.'"
      >
        <div class="toggle-list">
          <div class="toggle-row">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:package-open" class="w-4 h-4" />
              </div>
              <div>
                <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.clearance.enable') || 'Enable clearance module' }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.clearance.enableSubtitle') || 'Give a discount equal to the cheapest items once a quantity threshold is reached.' }}</p>
              </div>
            </div>
            <BaseToggle v-model="form.clearanceEnabled" :sr-label="t('admin.functionalSettingsForm.clearance.enable') || 'Enable clearance module'" />
          </div>

          <Transition name="reveal">
            <div v-if="form.clearanceEnabled" class="reveal-block">
              <div class="field-grid">
                <div class="field">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.clearance.multiple') || 'Quantity threshold' }}</label>
                  <input v-model.number="form.clearanceMultiple" type="number" min="1" step="1" class="field-input" placeholder="6" >
                  <p class="field-hint">{{ t('admin.functionalSettingsForm.clearance.multipleHint') || 'Reached every N clearance items bought (e.g. 6).' }}</p>
                </div>
                <div class="field">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.clearance.divisor') || 'Divisor' }}</label>
                  <input v-model.number="form.clearanceDivisor" type="number" min="1" step="1" class="field-input" placeholder="3" >
                  <p class="field-hint">{{ t('admin.functionalSettingsForm.clearance.divisorHint') || 'The cheapest quantity/divisor items become free (e.g. 6/3 = 2 free).' }}</p>
                </div>
              </div>
              <p class="field-hint">{{ t('admin.functionalSettingsForm.clearance.scopeHint') || 'Tag eligible products from their product page. If no product is tagged, the offer applies to your whole catalog.' }}</p>

              <div class="toggle-row compact" style="margin-top: 8px;">
                <div class="toggle-row-info">
                  <div class="toggle-row-icon">
                    <Icon name="lucide:megaphone" class="w-4 h-4" />
                  </div>
                  <div>
                    <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.clearance.banner') || 'Show homepage banner' }}</p>
                    <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.clearance.bannerSubtitle') || 'Display a banner announcing the clearance offer.' }}</p>
                  </div>
                </div>
                <BaseToggle v-model="form.clearanceBannerEnabled" :sr-label="t('admin.functionalSettingsForm.clearance.banner') || 'Show homepage banner'" />
              </div>

              <Transition name="reveal">
                <div v-if="form.clearanceBannerEnabled" class="field" style="margin-top: 8px;">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.clearance.bannerText') || 'Banner text' }}</label>
                  <input
                    v-model="form.clearanceBannerText"
                    type="text"
                    maxlength="300"
                    class="field-input"
                    :placeholder="t('admin.functionalSettingsForm.clearance.bannerTextPlaceholder') || 'Big clearance sale — buy more, save more!'"
                  >
                </div>
              </Transition>
            </div>
          </Transition>
        </div>
      </SettingsSection>

      <!-- Fraud prevention -->
      <SettingsSection
        v-show="visibleAnchors.includes('fraud')"
        :bare="isSoleSection"
        anchor-id="fraud"
        icon="lucide:shield-ban"
        :title="t('admin.functionalSettingsForm.fraud.title') || 'Fraud prevention'"
        :subtitle="t('admin.functionalSettingsForm.fraud.subtitle') || 'Block fake orders from blacklisted contacts and throttle duplicate orders.'"
      >
        <div class="toggle-list">
          <div class="toggle-row">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:shield-ban" class="w-4 h-4" />
              </div>
              <div>
                <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.fraud.blacklist.title') || 'Enable blacklist' }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.fraud.blacklist.subtitle') || 'Block checkout for blacklisted phone numbers, IPs and customers.' }}</p>
              </div>
            </div>
            <BaseToggle v-model="form.blacklistEnabled" :sr-label="t('admin.functionalSettingsForm.fraud.blacklist.title') || 'Enable blacklist'" />
          </div>

          <NuxtLink to="/admin/orders/blacklist" class="fraud-manage-link">
            <Icon name="lucide:list-checks" class="w-3.5 h-3.5" />
            {{ t('admin.functionalSettingsForm.fraud.blacklist.manageLink') || 'Manage blacklisted entries' }}
          </NuxtLink>

          <div class="toggle-row" style="margin-top: 8px;">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:copy-x" class="w-4 h-4" />
              </div>
              <div>
                <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.fraud.duplicate.title') || 'Limit duplicate orders' }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.fraud.duplicate.subtitle') || 'Block checkout once a phone number has placed too many orders in a short time.' }}</p>
              </div>
            </div>
            <BaseToggle v-model="form.duplicateOrderLimitEnabled" :sr-label="t('admin.functionalSettingsForm.fraud.duplicate.title') || 'Limit duplicate orders'" />
          </div>

          <Transition name="reveal">
            <div v-if="form.duplicateOrderLimitEnabled" class="reveal-block">
              <div class="field-grid">
                <div class="field">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.fraud.duplicate.limit') || 'Max orders' }}</label>
                  <input v-model.number="form.duplicateOrderLimit" type="number" min="1" step="1" class="field-input" placeholder="3" >
                </div>
                <div class="field">
                  <label class="field-label">{{ t('admin.functionalSettingsForm.fraud.duplicate.window') || 'Time window (hours)' }}</label>
                  <input v-model.number="form.duplicateOrderWindowHours" type="number" min="1" step="1" class="field-input" placeholder="24" >
                </div>
              </div>
              <p class="field-hint">{{ t('admin.functionalSettingsForm.fraud.duplicate.hint') || 'Once a phone number reaches this many orders within the time window, further checkouts are blocked.' }}</p>
            </div>
          </Transition>
        </div>
      </SettingsSection>

      <!-- Currency -->
      <SettingsSection
        v-show="visibleAnchors.includes('currency')"
        :bare="isSoleSection"
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

      <!-- Maintenance mode -->
      <SettingsSection
        v-show="visibleAnchors.includes('maintenance')"
        :bare="isSoleSection"
        anchor-id="maintenance"
        icon="lucide:power-off"
        :title="t('admin.functionalSettingsForm.maintenance.title') || 'Maintenance mode'"
        :subtitle="t('admin.functionalSettingsForm.maintenance.subtitle') || 'Temporarily close your storefront to customers.'"
      >
        <div class="toggle-list">
          <div class="toggle-row">
            <div class="toggle-row-info">
              <div class="toggle-row-icon">
                <Icon name="lucide:power-off" class="w-4 h-4" />
              </div>
              <div>
                <p class="toggle-row-title">{{ t('admin.functionalSettingsForm.maintenance.enable.title') || 'Close store for maintenance' }}</p>
                <p class="toggle-row-subtitle">{{ t('admin.functionalSettingsForm.maintenance.enable.subtitle') || 'Customers will see a maintenance page instead of your storefront. The admin panel stays accessible.' }}</p>
              </div>
            </div>
            <BaseToggle
              v-model="form.maintenanceMode"
              :sr-label="t('admin.functionalSettingsForm.maintenance.enable.toggle') || 'Enable maintenance mode'"
            />
          </div>

          <div v-if="form.maintenanceMode" class="maintenance-warning">
            <Icon name="lucide:alert-triangle" class="w-4 h-4" />
            <p>{{ t('admin.functionalSettingsForm.maintenance.warning') || "Your storefront is unreachable by customers while this is on. Don't forget to turn it back off." }}</p>
          </div>

          <Transition name="reveal">
            <div v-if="form.maintenanceMode" class="reveal-block">
              <label class="field-label">{{ t('admin.functionalSettingsForm.maintenance.message.label') || 'Message shown to customers (optional)' }}</label>
              <textarea
                v-model="form.maintenanceMessage"
                rows="3"
                maxlength="300"
                class="field-input"
                :placeholder="t('admin.functionalSettingsForm.maintenance.message.placeholder') || 'We are performing scheduled maintenance and will be back soon.'"
              />
            </div>
          </Transition>
        </div>
      </SettingsSection>

      <!-- Localization -->
      <SettingsSection
        v-show="visibleAnchors.includes('localization')"
        :bare="isSoleSection"
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
import SettingsStatus from './settings/SettingsStatus.vue'
import SettingsSection from './settings/SettingsSection.vue'
import SettingsSaveBar from './settings/SettingsSaveBar.vue'
import { SETTINGS_NAV_GROUPS } from '~/shared/admin/settings-navigation'

const props = withDefaults(defineProps<{ section?: string }>(), { section: 'checkout' })

const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const SECTION_GROUPS: Record<string, string[]> = {
  checkout: ['features', 'checkout'],
  fraud: ['fraud'],
  loyalty: ['loyalty'],
  clearance: ['clearance'],
  invoices: ['invoices'],
  announcement: ['announcement'],
  messaging: ['messaging'],
  maintenance: ['maintenance'],
  localization: ['currency', 'localization']
}

const visibleAnchors = computed(() => SECTION_GROUPS[props.section] || SECTION_GROUPS.checkout)
// Most sections are shown alone; only Checkout pairs two of them, and there
// the per-section headings are what tells them apart.
const isSoleSection = computed(() => visibleAnchors.value.length === 1)

// Section headings come from the nav, so a destination is called the same
// thing in the sidebar, the topbar and the page title. Only the descriptive
// line below it is section-specific.
const SECTION_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  SETTINGS_NAV_GROUPS.flatMap((group) => group.items.map((item) => [item.key, item.labelKey]))
)

const SECTION_SUBTITLES: Record<string, () => string> = {
  checkout: () => t('admin.functionalSettingsForm.checkoutRules.subtitle'),
  fraud: () => t('admin.functionalSettingsForm.fraud.subtitle'),
  loyalty: () => t('admin.functionalSettingsForm.loyalty.subtitle'),
  clearance: () => t('admin.functionalSettingsForm.clearance.subtitle'),
  invoices: () => t('admin.functionalSettingsForm.invoices.subtitle'),
  announcement: () => t('admin.appearanceSettingsForm.announcement.subtitle'),
  messaging: () => t('admin.functionalSettingsForm.messaging.subtitle'),
  maintenance: () => t('admin.functionalSettingsForm.maintenance.subtitle'),
  localization: () => t('admin.functionalSettingsForm.currency.subtitle')
}

const pageTitle = computed(() =>
  t(SECTION_LABEL_KEYS[props.section] || SECTION_LABEL_KEYS.checkout)
)
const pageSubtitle = computed(() => (SECTION_SUBTITLES[props.section] || SECTION_SUBTITLES.checkout)())

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
Versement : {payment}
Reste à payer : {remaining}
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
  clearanceEnabled: false,
  clearanceMultiple: 6,
  clearanceDivisor: 3,
  clearanceBannerEnabled: false,
  clearanceBannerText: '',
  blacklistEnabled: true,
  duplicateOrderLimitEnabled: false,
  duplicateOrderLimit: 3,
  duplicateOrderWindowHours: 24,
  orderIdPrefix: 'ORDR',
  minimumOrderAmountDzd: 1000,
  hideOptionalAddress: true,
  salesInvoiceEnabled: false,
  invoiceNumberPrefix: 'INV',
  invoiceFooterText: '',
  invoiceShowLogo: true,
  whatsappConfirmationTemplate: defaultWhatsappTemplate,
  maintenanceMode: false,
  maintenanceMessage: ''
})

const initialFormString = ref(JSON.stringify(form))
const isDirty = computed(() => initialFormString.value !== JSON.stringify(form))

const whatsappTemplatePreview = computed(() => {
  const tpl = form.whatsappConfirmationTemplate || defaultWhatsappTemplate
  return tpl
    .replace(/{customerName}/g, 'Amine')
    .replace(/{productsRecap}/g, '- 1x AirPods Pro (35,000 DZD)\n- 2x Coque Silicone (3,000 DZD)')
    .replace(/{total}/g, '38,600 DZD')
    .replace(/{payment}/g, '10,000 DZD')
    .replace(/{remaining}/g, '28,600 DZD')
    .replace(/{address}/g, '123 Rue de la Liberté, Alger Centre, Alger')
    .replace(/{confirmLink}/g, 'https://store.swekly.com/confirm-order/abc123xyz')
})

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
  form.clearanceEnabled = data.clearanceEnabled ?? false
  form.clearanceMultiple = Number(data.clearanceMultiple ?? 6)
  form.clearanceDivisor = Number(data.clearanceDivisor ?? 3)
  form.clearanceBannerEnabled = data.clearanceBannerEnabled ?? false
  form.clearanceBannerText = data.clearanceBannerText || ''
  form.blacklistEnabled = data.blacklistEnabled ?? true
  form.duplicateOrderLimitEnabled = data.duplicateOrderLimitEnabled ?? false
  form.duplicateOrderLimit = Number(data.duplicateOrderLimit ?? 3)
  form.duplicateOrderWindowHours = Number(data.duplicateOrderWindowHours ?? 24)
  form.minimumOrderAmountDzd = Number(data.minimumOrderAmountDzd ?? 1000)
  form.hideOptionalAddress = data.hideOptionalAddress ?? true
  form.salesInvoiceEnabled = data.salesInvoiceEnabled ?? false
  form.invoiceNumberPrefix = data.invoiceNumberPrefix || 'INV'
  form.invoiceFooterText = data.invoiceFooterText || ''
  form.invoiceShowLogo = data.invoiceShowLogo ?? true
  form.whatsappConfirmationTemplate = data.whatsappConfirmationTemplate || defaultWhatsappTemplate
  form.maintenanceMode = data.maintenanceMode ?? false
  form.maintenanceMessage = data.maintenanceMessage || ''
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
        clearanceEnabled: form.clearanceEnabled,
        clearanceMultiple: form.clearanceMultiple,
        clearanceDivisor: form.clearanceDivisor,
        clearanceBannerEnabled: form.clearanceBannerEnabled,
        clearanceBannerText: form.clearanceBannerText,
        blacklistEnabled: form.blacklistEnabled,
        duplicateOrderLimitEnabled: form.duplicateOrderLimitEnabled,
        duplicateOrderLimit: form.duplicateOrderLimit,
        duplicateOrderWindowHours: form.duplicateOrderWindowHours,
        minimumOrderAmountDzd: form.minimumOrderAmountDzd,
        hideOptionalAddress: form.hideOptionalAddress,
        salesInvoiceEnabled: form.salesInvoiceEnabled,
        invoiceNumberPrefix: form.invoiceNumberPrefix,
        invoiceFooterText: form.invoiceFooterText,
        invoiceShowLogo: form.invoiceShowLogo,
        whatsappConfirmationTemplate: form.whatsappConfirmationTemplate,
        maintenanceMode: form.maintenanceMode,
        maintenanceMessage: form.maintenanceMessage
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
  fetchSettings()
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

onMounted(() => {
  fetchCurrencies()
  fetchSettings()
})
</script>

<style scoped>

.functional-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toggle-row-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.fraud-manage-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--brand);
  width: fit-content;
}

.fraud-manage-link:hover {
  text-decoration: underline;
}

.maintenance-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 10px;
  color: #f87171;
  font-size: 12.5px;
  line-height: 1.5;
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
