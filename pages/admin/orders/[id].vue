<template>
  <div class="od-page">
    <AdminConfirmModal
      v-model="deleteOpen"
      :title="t('admin.confirmModal.defaults.title', 'Are you sure?')"
      :message="t('admin.pages.orders.detail.deleteConfirm', 'Delete this order? This cannot be undone. If the order is confirmed with a carrier, it will also be cancelled there.')"
      :confirm-text="t('common.delete', 'Delete')"
      :error="deleteError"
      @confirm="confirmDelete"
      @cancel="deleteError = null"
    />

    <DeliveryPaymentModal
      v-model="deliveryModalOpen"
      :cashboxes="cashboxes"
      :amount="orderTotalWithShipping"
      :loading="updating"
      @confirm="confirmDelivered"
    />

    <OrderPaymentModal
      v-if="order"
      v-model="paymentModalOpen"
      :cashboxes="cashboxes"
      :default-amount="orderTotalWithShipping - (order.paidAmount || 0)"
      :remaining-amount="orderTotalWithShipping - (order.paidAmount || 0)"
      :loading="updating"
      @confirm="confirmPayment"
    />

    <TransitionRoot
      appear
      :show="variantModalOpen"
      as="template"
    >
      <Dialog
        as="div"
        class="relative z-50"
        @close="variantModalOpen = false"
      >
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as="template"
              enter="duration-300 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel
                class="w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-start align-middle shadow-xl transition-all"
                style="background: var(--surface-2); border: 1px solid var(--surface-border)"
              >
                <DialogTitle
                  as="h3"
                  class="od-display text-lg leading-6 flex justify-between items-center"
                  style="color: var(--text-primary)"
                >
                  {{ selectedProductForVariant?.title || t('admin.pages.orders.detail.variantSelect', 'Select Variant') }}
                  <button
                    class="p-1 rounded-full"
                    style="color: var(--text-tertiary)"
                    @click="variantModalOpen = false"
                  >
                    <Icon
                      name="lucide:x"
                      class="w-5 h-5"
                    />
                  </button>
                </DialogTitle>
                <div class="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
                  <div
                    v-if="loadingVariants"
                    class="py-8 text-center"
                    style="color: var(--text-tertiary)"
                  >
                    {{ t('admin.common.loading', 'Loading...') }}
                  </div>
                  <button
                    v-for="v in availableVariantsForSelection"
                    :key="v.id"
                    type="button"
                    class="w-full p-4 rounded-xl hover:[border-color:var(--brand)] hover:[background:rgba(var(--brand-rgb)/0.08)] hover:ring-1 hover:[--tw-ring-color:var(--brand)] transition-all flex justify-between items-center group"
                    style="border: 1px solid var(--surface-border)"
                    @click="onVariantSelected(v)"
                  >
                    <div class="text-start">
                      <div class="font-semibold group-hover:[color:var(--brand)]" style="color: var(--text-primary)">
                        {{ v.label }}
                      </div>
                      <div class="text-xs mt-0.5" style="color: var(--text-tertiary)">
                        {{ v.availableStock }} {{ t('admin.pages.orders.create.inStock', 'in stock') }}
                      </div>
                    </div>
                    <div class="text-end">
                      <div class="font-bold [color:var(--brand)]">
                        {{ formatCurrency(v.displayPrice ?? v.price) }}
                      </div>
                      <div
                        v-if="v.promotionApplied"
                        class="text-[11px]"
                        style="color: var(--text-tertiary)"
                      >
                        <span class="line-through">{{ formatCurrency(v.originalPrice ?? v.price) }}</span>
                        <span
                          v-if="v.promotionDiscountPercent != null"
                          class="ms-1 font-semibold text-emerald-600"
                        >-{{ v.promotionDiscountPercent }}%</span>
                      </div>
                    </div>
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- LOADING -->
    <div v-if="loading" class="od-shell">
      <div class="ui-card p-6">
        <div class="animate-pulse space-y-6">
          <div class="h-8 w-72 max-w-full rounded" style="background: var(--surface-3)" />
          <div class="h-4 w-96 max-w-full rounded" style="background: var(--surface-3)" />
          <div class="h-32 rounded-xl" style="background: var(--surface-3)" />
        </div>
      </div>
    </div>

    <!-- DETAIL -->
    <template v-else-if="order">
      <!-- ═══════ ZONE 1: COMPACT STICKY BAR ═══════ -->
      <header class="od-bar" :class="{ 'od-bar--locked': statusLocked }">
        <div class="od-shell od-bar__inner">
          <!-- Left: back + order ID + badges -->
          <div class="od-bar__left">
            <NuxtLink
              to="/admin/orders"
              class="od-bar__back"
              :aria-label="t('admin.nav.orders')"
            >
              <Icon name="lucide:arrow-left" class="w-4 h-4" />
            </NuxtLink>

            <div class="od-bar__id-group">
              <h1 class="od-bar__id">
                {{ order.publicId || `#${order.id.substring(0, 8).toUpperCase()}` }}
              </h1>
              <button
                type="button"
                class="od-copy"
                :aria-label="t('common.copy', 'Copy')"
                @click="copyToClipboard(order.publicId || order.id)"
              >
                <Icon name="lucide:copy" class="w-3 h-3" />
              </button>
            </div>

            <AdminOrderStatusBadge :status="order.status" />
            <AdminPaymentStatusBadge :status="order.paymentStatus" />

            <span class="od-bar__date hidden md:inline">
              {{ formatDate(order.createdAt) }}
            </span>
          </div>

          <!-- Right: action buttons -->
          <div class="od-bar__right">
            <button
              v-if="canPrintBordereauVisible"
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--md hidden lg:inline-flex"
              @click="printBordereau"
            >
              <Icon name="lucide:printer" class="w-4 h-4" />
              <span class="hidden xl:inline">{{ t('admin.pages.orders.detail.printBordereau', 'Imprimer le bordereau') }}</span>
            </button>
            <button
              v-if="order.paymentStatus !== 'PAID'"
              type="button"
              class="ui-btn ui-btn--primary ui-btn--md hidden lg:inline-flex"
              @click="openPaymentModal"
            >
              <Icon name="lucide:banknote" class="w-4 h-4" />
              <span class="hidden xl:inline">{{ t('admin.pages.orders.modals.payment.title', 'Enregistrer le paiement') }}</span>
            </button>
            <AdminOrdersOrderDetailNBA
              :model="nbaModel"
              :busy="updating"
              @action="applyNBAAction"
            />
          </div>
        </div>

        <!-- Carrier-locked banner -->
        <div v-if="statusLocked" class="od-bar__locked-note od-shell">
          <Icon name="lucide:lock" class="w-3.5 h-3.5" />
          <span>{{ t('admin.pages.orders.detail.statusUpdate.lockedByCarrier', 'Status is controlled by the delivery carrier. You cannot change it manually.') }}</span>
        </div>
      </header>

      <!-- ═══════ ZONE 2: COMMAND CENTER ═══════ -->
      <div class="od-shell od-command">
        <!-- KPI Cards Row -->
        <div class="od-kpi-row">
          <div class="od-kpi">
            <div class="od-kpi__icon"><Icon name="lucide:receipt" class="w-4 h-4" /></div>
            <div class="od-kpi__data">
              <span class="od-kpi__label">{{ t('admin.common.total', 'Total') }}</span>
              <span class="od-kpi__value">{{ formatCurrency(order.totalAmount) }}</span>
            </div>
          </div>

          <div class="od-kpi">
            <div class="od-kpi__icon"><Icon name="lucide:truck" class="w-4 h-4" /></div>
            <div class="od-kpi__data">
              <span class="od-kpi__label">{{ t('admin.pages.orders.detail.fields.shippingFee', 'Shipping') }}</span>
              <span class="od-kpi__value">{{ order.shippingAmount != null ? formatCurrency(Number(order.shippingAmount)) : '—' }}</span>
            </div>
          </div>

          <div class="od-kpi od-kpi--accent">
            <div class="od-kpi__icon"><Icon name="lucide:wallet" class="w-4 h-4" /></div>
            <div class="od-kpi__data">
              <span class="od-kpi__label">{{ t('admin.pages.orders.detail.fields.totalWithDelivery', 'Total (with delivery)') }}</span>
              <span class="od-kpi__value">{{ formatCurrency(orderTotalWithShipping) }}</span>
            </div>
          </div>

          <div v-if="order.paidAmount > 0" class="od-kpi od-kpi--success">
            <div class="od-kpi__icon"><Icon name="lucide:check-circle" class="w-4 h-4" /></div>
            <div class="od-kpi__data">
              <span class="od-kpi__label">{{ t('admin.common.paid', 'Paid') }}</span>
              <span class="od-kpi__value">{{ formatCurrency(order.paidAmount) }}</span>
            </div>
          </div>

          <div v-if="order.paidAmount > 0" class="od-kpi od-kpi--warn">
            <div class="od-kpi__icon"><Icon name="lucide:clock" class="w-4 h-4" /></div>
            <div class="od-kpi__data">
              <span class="od-kpi__label">{{ t('admin.common.remaining', 'Remaining') }}</span>
              <span class="od-kpi__value">{{ formatCurrency(orderTotalWithShipping - order.paidAmount) }}</span>
            </div>
          </div>

          <div class="od-kpi">
            <div class="od-kpi__icon"><Icon name="lucide:package" class="w-4 h-4" /></div>
            <div class="od-kpi__data">
              <span class="od-kpi__label">{{ t('admin.pages.orders.detail.sections.orderItems') }}</span>
              <span class="od-kpi__value">{{ order.items?.length ?? 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Customer + Call Panel Row -->
        <div class="od-cockpit-row">
          <!-- Customer Card -->
          <div class="od-customer-card">
            <div class="od-customer-card__header">
              <Icon name="lucide:user" class="w-4 h-4" style="color: var(--text-tertiary)" />
              <span class="od-customer-card__name">{{ order.customerName }}</span>
            </div>
            <div v-if="order.customerPhone" class="mt-3 space-y-2">
              <div class="flex gap-2">
                <a
                  :href="`tel:${order.customerPhone}`"
                  class="ui-btn ui-btn--sm flex-1 flex justify-center items-center gap-2"
                  style="color: #0369a1; background-color: #f0f9ff; border: 1px solid #bae6fd;"
                  dir="ltr"
                >
                  <Icon name="lucide:phone" class="w-4 h-4" />
                  <span class="font-bold tracking-wide">{{ order.customerPhone }}</span>
                </a>
                <button
                  type="button"
                  class="ui-btn ui-btn--sm ui-btn--secondary px-3"
                  :aria-label="t('common.copy', 'Copy')"
                  @click="copyToClipboard(order.customerPhone)"
                >
                  <Icon name="lucide:copy" class="w-4 h-4" />
                </button>
              </div>
              
              <button
                type="button"
                :disabled="generatingWhatsapp"
                @click="generateAndSendWhatsapp"
                class="ui-btn ui-btn--sm w-full flex justify-center items-center gap-2"
                style="color: #16a34a; background-color: #f0fdf4; border: 1px solid #bbf7d0;"
              >
                <Icon v-if="generatingWhatsapp" name="lucide:loader" class="w-4 h-4 animate-spin" />
                <Icon v-else name="lucide:message-circle" class="w-4 h-4" />
                <span class="font-bold">{{ generatingWhatsapp ? t('admin.common.loading', 'Loading...') : t('admin.pages.orders.detail.sendWhatsapp', 'Send WhatsApp') }}</span>
              </button>
            </div>
            <div v-if="order.customerAddress" class="od-customer-card__address">
              <Icon name="lucide:map-pin" class="w-3 h-3" style="color: var(--text-tertiary); flex-shrink: 0" />
              <span>{{ order.customerAddress }}</span>
            </div>
            <div v-if="order.shippingWilayaCode || order.shippingCommuneCode" class="od-customer-card__geo">
              <Icon name="lucide:navigation" class="w-3 h-3" style="color: var(--text-tertiary); flex-shrink: 0" />
              <span>{{ shippingWilayaCommuneLabel }}</span>
            </div>
          </div>

          <!-- Call Panel + Notes -->
          <div class="od-call-card">
            <div class="od-call-card__header">
              <Icon name="lucide:phone-call" class="w-3.5 h-3.5" style="color: var(--text-tertiary)" />
              <span>{{ t('admin.pages.orders.detail.sections.callPanel', 'Call panel') }}</span>
              <Transition name="od-fade">
                <span v-if="savingCallStatus || callStatusSavedMessage" class="od-saved">
                  <Icon
                    :name="savingCallStatus ? 'lucide:loader' : 'lucide:check'"
                    class="w-3 h-3"
                    :class="savingCallStatus ? 'animate-spin' : ''"
                  />
                  {{ savingCallStatus ? t('admin.common.saving', 'Saving') : t('admin.common.saved', 'Saved') }}
                </span>
              </Transition>
            </div>
            <AdminOrdersOrderDetailCallPills
              v-model="order.callStatus"
              :disabled="editing"
              :saving="savingCallStatus ? order.callStatus : null"
              @change="handleUpdateCallStatus"
            />
            <textarea
              v-model="order.internalNotes"
              :placeholder="t('admin.pages.orders.detail.fields.internalNotesPlaceholder', 'Add private remarks about this order...')"
              rows="2"
              class="od-notes"
              :disabled="editing"
              @blur="handleUpdateInternalNotes"
            />
            <p class="od-hint">
              <Icon name="lucide:eye-off" class="w-3 h-3" />
              {{ t('admin.pages.orders.detail.internalNotesHelp', 'Notes are only visible to your team.') }}
              <Transition name="od-fade">
                <span v-if="savingNotes || notesSavedMessage" class="od-saved ms-auto">
                  <Icon
                    :name="savingNotes ? 'lucide:loader' : 'lucide:check'"
                    class="w-3 h-3"
                    :class="savingNotes ? 'animate-spin' : ''"
                  />
                  {{ savingNotes ? t('admin.common.saving', 'Saving') : t('admin.common.saved', 'Saved') }}
                </span>
              </Transition>
            </p>
          </div>
        </div>

        <!-- Mobile action row (visible below lg) -->
        <div class="od-mobile-actions lg:hidden">
          <button
            v-if="canPrintBordereauVisible"
            type="button"
            class="ui-btn ui-btn--secondary ui-btn--sm flex-1"
            @click="printBordereau"
          >
            <Icon name="lucide:printer" class="w-4 h-4" />
            {{ t('admin.pages.orders.detail.printBordereau', 'Imprimer le bordereau') }}
          </button>
          <button
            v-if="order.paymentStatus !== 'PAID'"
            type="button"
            class="ui-btn ui-btn--primary ui-btn--sm flex-1"
            @click="openPaymentModal"
          >
            <Icon name="lucide:banknote" class="w-4 h-4" />
            {{ t('admin.pages.orders.modals.payment.title', 'Enregistrer le paiement') }}
          </button>
        </div>
      </div>

      <!-- ═══════ ZONE 3: TABBED DETAIL ZONE ═══════ -->
      <div class="od-shell od-tabs-zone">
        <!-- Tab Bar -->
        <nav class="od-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="od-tab"
            :class="{ 'od-tab--active': activeTab === 'items' }"
            :aria-selected="activeTab === 'items'"
            @click="activeTab = 'items'"
          >
            <Icon name="lucide:package" class="w-4 h-4" />
            <span>{{ t('admin.pages.orders.detail.sections.orderItems') }}</span>
            <span class="od-tab__badge">{{ editing ? cartItems.length : (order.items?.length ?? 0) }}</span>
          </button>
          <button
            type="button"
            role="tab"
            class="od-tab"
            :class="{ 'od-tab--active': activeTab === 'delivery' }"
            :aria-selected="activeTab === 'delivery'"
            @click="activeTab = 'delivery'"
          >
            <Icon name="lucide:truck" class="w-4 h-4" />
            <span>{{ t('admin.pages.orders.detail.sections.deliveryAndCustomer', 'Delivery & customer') }}</span>
          </button>
          <button
            type="button"
            role="tab"
            class="od-tab"
            :class="{ 'od-tab--active': activeTab === 'history' }"
            :aria-selected="activeTab === 'history'"
            @click="activeTab = 'history'"
          >
            <Icon name="lucide:history" class="w-4 h-4" />
            <span>{{ t('admin.pages.orders.detail.sections.previousOrders', 'Previous orders') }}</span>
            <span v-if="previousOrders.length > 0" class="od-tab__badge od-tab__badge--highlight">{{ previousOrders.length }}</span>
          </button>
        </nav>

        <!-- ── TAB PANEL: ITEMS ── -->
        <div v-show="activeTab === 'items'" class="od-panel" role="tabpanel">
          <section class="od-section" :class="{ 'od-section--editing': editing }">
            <header class="od-section__header">
              <div class="od-section__title">
                <Icon name="lucide:package" class="w-3.5 h-3.5" />
                <span>{{ t('admin.pages.orders.detail.sections.orderItems') }}</span>
                <span class="od-section__count">{{ editing ? cartItems.length : (order.items?.length ?? 0) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <template v-if="editing">
                  <button
                    type="button"
                    class="ui-btn ui-btn--ghost ui-btn--sm"
                    :disabled="editSaving"
                    @click="cancelEdit"
                  >
                    {{ t('common.cancel', 'Cancel') }}
                  </button>
                  <button
                    type="button"
                    class="ui-btn ui-btn--primary ui-btn--sm"
                    :disabled="editSaving || cartItems.length === 0"
                    @click="saveEdit"
                  >
                    <span
                      v-if="editSaving"
                      class="inline-block animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"
                    />
                    {{ t('common.save', 'Save') }}
                  </button>
                </template>
                <button
                  v-else-if="order.status === 'PENDING'"
                  type="button"
                  class="ui-btn ui-btn--ghost ui-btn--sm"
                  :disabled="editingCustomer"
                  @click="startEdit"
                >
                  <Icon name="lucide:pencil" class="w-3.5 h-3.5" />
                  {{ t('common.edit', 'Edit') }}
                </button>
              </div>
            </header>

            <!-- EDIT MODE -->
            <div v-if="editing" class="od-section__body space-y-4">
              <div class="relative">
                <Icon
                  name="lucide:search"
                  class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style="color: var(--text-tertiary)"
                />
                <input
                  v-model="productSearch"
                  type="text"
                  :placeholder="t('admin.pages.pos.catalog.searchPlaceholder', 'Search products…')"
                  class="od-input od-input--search"
                >
                <div
                  v-if="productSearch.trim().length > 0"
                  class="od-search-results"
                >
                  <div
                    v-for="product in searchedProducts"
                    :key="product.id"
                    class="od-search-result"
                    @click="addProductToCart(product)"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate" style="color: var(--text-primary)">
                        {{ product.title }}
                      </div>
                      <div class="mt-0.5 text-xs">
                        <span class="font-semibold [color:var(--brand)]">{{ formatCurrency(product.effectivePrice) }}</span>
                        <template v-if="product.promotionApplied">
                          <span class="line-through ms-2" style="color: var(--text-tertiary)">{{ formatCurrency(product.originalPrice) }}</span>
                          <span
                            v-if="product.promotionDiscountPercent != null"
                            class="ms-1 font-semibold text-emerald-600"
                          >-{{ product.promotionDiscountPercent }}%</span>
                        </template>
                      </div>
                    </div>
                    <Icon name="lucide:plus" class="w-4 h-4" style="color: var(--text-tertiary)" />
                  </div>
                  <div
                    v-if="searchedProducts.length === 0"
                    class="p-4 text-center text-sm"
                    style="color: var(--text-tertiary)"
                  >
                    {{ t('admin.pages.pos.catalog.noProducts', 'No products found') }}
                  </div>
                </div>
              </div>

              <div v-if="editErrorMessage" class="od-alert od-alert--error">
                {{ editErrorMessage }}
              </div>

              <div v-if="cartItems.length === 0" class="od-empty">
                <Icon name="lucide:package-x" class="w-6 h-6 mb-2" />
                {{ t('admin.pages.orders.create.emptyCart', 'No items yet') }}
              </div>

              <ul v-else class="od-cart">
                <li
                  v-for="(item, index) in cartItems"
                  :key="`${item.productId}:${item.variantId || 'default'}:${index}`"
                  class="od-cart__row"
                >
                  <div class="flex-1 min-w-0">
                    <div class="font-medium leading-tight" style="color: var(--text-primary)">{{ item.title }}</div>
                    <div v-if="item.variantLabel" class="od-cart__variant">{{ item.variantLabel }}</div>
                  </div>
                  <div class="od-qty">
                    <button
                      type="button"
                      class="od-qty__btn"
                      :disabled="item.quantity <= 1"
                      @click="item.quantity--"
                    >
                      <Icon name="lucide:minus" class="w-3 h-3" />
                    </button>
                    <input
                      v-model.number="item.quantity"
                      type="number"
                      min="1"
                      class="od-qty__input"
                    >
                    <button
                      type="button"
                      class="od-qty__btn"
                      @click="item.quantity++"
                    >
                      <Icon name="lucide:plus" class="w-3 h-3" />
                    </button>
                  </div>
                  <div class="od-cart__price">{{ formatCurrency(item.price * item.quantity) }}</div>
                  <button
                    type="button"
                    class="od-cart__remove"
                    :title="t('common.delete', 'Delete')"
                    @click="removeCartItem(index)"
                  >
                    <Icon name="lucide:x" class="w-4 h-4" />
                  </button>
                </li>
              </ul>

              <div class="od-cart__total">
                <span>{{ t('admin.common.total', 'Total') }}</span>
                <span class="od-display">{{ formatCurrency(cartTotal) }}</span>
              </div>
            </div>

            <!-- READ MODE -->
            <ul v-else class="od-items">
              <li
                v-for="item in order.items"
                :key="item.id"
                class="od-items__row"
              >
                <div class="od-items__product">
                  <div class="od-items__title">{{ item.product?.title || t('admin.pages.orders.detail.itemsTable.fallbackProduct', 'Product') }}</div>
                  <div v-if="variantLabelFromOrderItem(item)" class="od-items__variant">{{ variantLabelFromOrderItem(item) }}</div>
                </div>
                <div class="od-items__price">{{ formatCurrency(item.price) }}</div>
                <div class="od-items__qty">×{{ item.quantity }}</div>
                <div class="od-items__line">{{ formatCurrency(item.lineTotal ?? (Number(item.price) * item.quantity)) }}</div>
              </li>
              <li class="od-items__sub">
                <span class="od-items__sub-label">{{ t('admin.pages.orders.detail.itemsTable.total') }}</span>
                <span class="od-items__sub-value od-display">{{ formatCurrency(order.totalAmount) }}</span>
              </li>
            </ul>
          </section>
        </div>

        <!-- ── TAB PANEL: DELIVERY ── -->
        <div v-show="activeTab === 'delivery'" class="od-panel" role="tabpanel">
          <!-- Delivery & Customer section -->
          <section class="od-section">
            <header class="od-section__header">
              <div class="od-section__title">
                <Icon name="lucide:truck" class="w-3.5 h-3.5" />
                <span>{{ t('admin.pages.orders.detail.sections.deliveryAndCustomer', 'Delivery & customer') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="order.status === 'PENDING' && !editing && !editingCustomer"
                  type="button"
                  class="ui-btn ui-btn--ghost ui-btn--sm"
                  @click="startEditCustomer"
                >
                  <Icon name="lucide:pencil" class="w-3.5 h-3.5" />
                  {{ t('common.edit', 'Edit') }}
                </button>
              </div>
            </header>

            <div class="od-section__body">
              <!-- EDIT FORM -->
              <div v-if="editing || editingCustomer" class="space-y-3">
                <div>
                  <label class="ui-label mb-1">{{ t('admin.pages.orders.detail.fields.customerName', 'Customer Name') }}</label>
                  <BaseInput v-model="editCustomerName" type="text" />
                </div>
                <div>
                  <label class="ui-label mb-1">{{ t('admin.pages.orders.detail.fields.customerPhone', 'Customer Phone') }}</label>
                  <BaseInput v-model="editCustomerPhone" type="tel" dir="ltr" />
                </div>
                <div>
                  <label class="ui-label mb-1">{{ t('admin.pages.orders.detail.fields.deliveryAddress', 'Address') }}</label>
                  <BaseInput v-model="editCustomerAddress" type="text" />
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="ui-label mb-1">{{ t('admin.pages.orders.create.shippingProvider', 'Shipping provider') }}</label>
                    <BaseSelect
                      v-model="editShippingProvider"
                      :disabled="editCompaniesLoading"
                      @update:model-value="onEditShippingProviderChange"
                    >
                      <option value="">{{ t('admin.common.noneSelected', 'None') }}</option>
                      <option v-for="company in editVisibleCompanies" :key="company.code" :value="company.code">{{ company.name }}</option>
                    </BaseSelect>
                    <p v-if="editCompaniesError" class="mt-1 text-xs text-amber-700">{{ editCompaniesError }}</p>
                  </div>
                  <div>
                    <label class="ui-label mb-1">{{ t('admin.pages.orders.create.deliveryMode', 'Delivery mode') }}</label>
                    <BaseSelect
                      v-model="editDeliveryChoice"
                      :disabled="!editShippingProvider"
                      @update:model-value="onEditDeliveryChoiceChange"
                    >
                      <option value="home">{{ t('admin.pages.orders.create.modes.home', 'Home delivery') }} ({{ editHomePriceLabel }})</option>
                      <option value="stopDesk">{{ t('admin.pages.orders.index.deliveryModes.pickup', 'Stop desk') }} ({{ editOfficePriceLabel }})</option>
                      <option v-if="isEditMaystroShipping" value="pickupPoint">{{ t('admin.pages.orders.detail.fields.pickupPoint', 'Pickup point') }} ({{ editOfficePriceLabel }})</option>
                    </BaseSelect>
                  </div>
                </div>
                <div
                  v-if="editPriceLoading || editPriceError"
                  class="rounded-lg border px-3 py-2 text-xs"
                  :class="editPriceError ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'"
                >
                  <span v-if="editPriceLoading">{{ t('admin.common.loading', 'Loading...') }}</span>
                  <span v-else>{{ editPriceError }}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="ui-label mb-1">{{ t('admin.pages.orders.create.wilaya', 'Wilaya') }}</label>
                    <BaseSelect v-model="editShippingWilayaCode" @update:model-value="onEditWilayaChange">
                      <option value="">{{ t('admin.common.noneSelected', 'None') }}</option>
                      <option v-for="w in DZ_WILAYAS" :key="w.code" :value="w.code">{{ w.name }}</option>
                    </BaseSelect>
                  </div>
                  <div>
                    <label class="ui-label mb-1">{{ t('admin.pages.orders.create.commune', 'Commune') }}</label>
                    <BaseSelect
                      v-if="isEditMaystroShipping"
                      v-model="editShippingCommuneCode"
                      :disabled="!editShippingWilayaCode || editMaystroCommunesLoading"
                      @update:model-value="onEditCommuneChange"
                    >
                      <option value="">
                        {{
                          !editShippingWilayaCode
                            ? t('admin.pages.orders.create.wilaya', 'Wilaya')
                            : editMaystroCommunesLoading
                              ? t('admin.common.loading', 'Loading...')
                              : t('admin.common.noneSelected', 'None')
                        }}
                      </option>
                      <option v-for="c in editMaystroCommunes" :key="String(c.id)" :value="String(c.id)">{{ c.id }} - {{ c.name }}</option>
                    </BaseSelect>
                    <BaseInput
                      v-else
                      v-model="editShippingCommuneCode"
                      type="text"
                      @update:model-value="onEditCommuneChange"
                    />
                    <p v-if="isEditMaystroShipping && editMaystroCommunesError" class="mt-1 text-xs text-amber-700">{{ editMaystroCommunesError }}</p>
                  </div>
                </div>

                <div v-if="isEditMaystroShipping && editDeliveryChoice === 'pickupPoint'">
                  <label class="ui-label mb-1">{{ t('admin.pages.orders.detail.fields.pickupPoint', 'Pickup point') }}</label>
                  <BaseSelect
                    v-model="editShippingPickupPoint"
                    :disabled="!editShippingCommuneCode || editMaystroPickupPointsLoading"
                  >
                    <option value="">
                      {{
                        !editShippingCommuneCode
                          ? t('admin.pages.orders.create.commune', 'Commune')
                          : editMaystroPickupPointsLoading
                            ? t('admin.common.loading', 'Loading...')
                            : t('admin.common.noneSelected', 'None')
                      }}
                    </option>
                    <option v-for="p in editMaystroPickupPoints" :key="String(p.pickup_point)" :value="String(p.pickup_point)">{{ p.pickup_point }} - {{ p.name || p.name_lt || p.name_ar || `Point ${p.pickup_point}` }}</option>
                  </BaseSelect>
                  <p v-if="editMaystroPickupPointsError" class="mt-1 text-xs text-amber-700">{{ editMaystroPickupPointsError }}</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="ui-label mb-1">{{ t('admin.pages.orders.detail.fields.shippingFee', 'Shipping fee') }}</label>
                    <BaseInput v-model="editShippingAmountInput" type="number" min="0" step="1" inputmode="decimal" dir="ltr" readonly />
                  </div>
                  <div>
                    <label class="ui-label mb-1">{{ t('admin.pages.orders.detail.fields.currency', 'Currency') }}</label>
                    <BaseInput v-model="editShippingCurrency" type="text" maxlength="8" />
                  </div>
                </div>

                <template v-if="editingCustomer">
                  <div v-if="customerSaveError" class="od-alert od-alert--error">{{ customerSaveError }}</div>
                  <div class="flex gap-2 pt-1">
                    <button
                      type="button"
                      class="ui-btn ui-btn--ghost ui-btn--sm flex-1"
                      :disabled="savingCustomer"
                      @click="cancelEditCustomer"
                    >
                      {{ t('common.cancel', 'Cancel') }}
                    </button>
                    <button
                      type="button"
                      class="ui-btn ui-btn--primary ui-btn--sm flex-1"
                      :disabled="savingCustomer"
                      @click="saveCustomerInfo"
                    >
                      <span v-if="savingCustomer" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      {{ t('common.save', 'Save') }}
                    </button>
                  </div>
                </template>
                <p v-else class="od-hint">{{ t('admin.pages.orders.detail.editHint', 'Save from the items section to apply changes.') }}</p>
              </div>

              <!-- READ -->
              <dl v-else class="od-dl">
                <div class="od-dl__row">
                  <dt>{{ t('admin.pages.orders.detail.fields.customerName') }}</dt>
                  <dd>{{ order.customerName }}</dd>
                </div>
                <div class="od-dl__row">
                  <dt>{{ t('admin.pages.orders.detail.fields.customerPhone') }}</dt>
                  <dd>
                    <a :href="`tel:${order.customerPhone}`" dir="ltr" class="od-tel">{{ order.customerPhone }}</a>
                    <button
                      type="button"
                      class="od-copy"
                      :aria-label="t('common.copy', 'Copy')"
                      @click="copyToClipboard(order.customerPhone)"
                    >
                      <Icon name="lucide:copy" class="w-3.5 h-3.5" />
                    </button>
                  </dd>
                </div>
                <div class="od-dl__row">
                  <dt>{{ t('admin.pages.orders.detail.fields.deliveryAddress') }}</dt>
                  <dd>{{ order.customerAddress || '—' }}</dd>
                </div>
                <div class="od-dl__row">
                  <dt>{{ t('admin.pages.orders.detail.fields.deliveryCompany', 'Provider') }}</dt>
                  <dd>{{ order.shippingProvider || order.shipments?.[0]?.provider || '—' }}</dd>
                </div>
                <div class="od-dl__row">
                  <dt>{{ t('admin.pages.orders.detail.fields.deliveryMode', 'Mode') }}</dt>
                  <dd>{{ deliveryModeLabel(order.deliveryMode) }}</dd>
                </div>
                <div v-if="order.shippingPickupPoint" class="od-dl__row">
                  <dt>{{ t('admin.pages.orders.detail.fields.pickupPoint', 'Stop desk') }}</dt>
                  <dd>{{ order.shippingPickupPoint }}</dd>
                </div>
                <div v-if="order.shippingWilayaCode || order.shippingCommuneCode" class="od-dl__row">
                  <dt>{{ t('admin.pages.orders.detail.fields.wilayaCommune', 'Wilaya / Commune') }}</dt>
                  <dd>{{ shippingWilayaCommuneLabel }}</dd>
                </div>
              </dl>

              <button
                v-if="canRetryMaystro && !editing && !editingCustomer"
                type="button"
                :disabled="updating"
                class="ui-btn ui-btn--secondary ui-btn--md w-full mt-4"
                @click="retryMaystro"
              >
                <Icon name="lucide:send" class="w-4 h-4" />
                {{ t('admin.pages.orders.detail.nba.pushToMaystro', 'Push to Maystro') }}
              </button>
            </div>
          </section>

          <!-- Status Update section -->
          <section class="od-section mt-4">
            <header class="od-section__header">
              <div class="od-section__title">
                <Icon name="lucide:circle-dashed" class="w-3.5 h-3.5" />
                <span>{{ t('admin.pages.orders.detail.statusUpdate.title') }}</span>
              </div>
            </header>
            <div class="od-section__body">
              <form class="space-y-3" @submit.prevent="handleStatusUpdate">
                <BaseSelect
                  id="status"
                  v-model="newStatus"
                  :disabled="editing || statusLocked || order.status === 'DELIVERED'"
                >
                  <option v-for="s in selectableStatuses" :key="s" :value="s">{{ orderStatusLabel(s) }}</option>
                </BaseSelect>
                <div v-if="errorMessage" class="od-alert od-alert--error">{{ errorMessage }}</div>
                <div v-if="successMessage" class="od-alert od-alert--success">{{ successMessage }}</div>
                <button
                  type="submit"
                  :disabled="editing || statusLocked || updating || newStatus === order.status || order.status === 'DELIVERED'"
                  class="ui-btn ui-btn--secondary ui-btn--md w-full"
                >
                  {{ updating ? t('admin.common.updating') : t('admin.pages.orders.detail.statusUpdate.submit') }}
                </button>
              </form>
            </div>
          </section>
        </div>

        <!-- ── TAB PANEL: HISTORY ── -->
        <div v-show="activeTab === 'history'" class="od-panel" role="tabpanel">
          <section class="od-section">
            <header class="od-section__header">
              <div class="od-section__title">
                <Icon name="lucide:history" class="w-3.5 h-3.5" />
                <span>{{ t('admin.pages.orders.detail.sections.previousOrders', 'Previous orders') }}</span>
                <span class="od-section__count">{{ previousOrders.length }}</span>
              </div>
            </header>
            <div class="od-section__body">
              <p class="od-history__match">
                <Icon name="lucide:shield-check" class="w-3.5 h-3.5" />
                {{ previousOrdersMatchLabel }}
              </p>

              <div v-if="previousOrders.length > 0" class="od-history">
                <NuxtLink
                  v-for="historyOrder in previousOrders"
                  :key="historyOrder.id"
                  :to="`/admin/orders/${historyOrder.id}`"
                  class="od-history__row"
                >
                  <div class="od-history__top">
                    <span class="od-history__id">{{ historyOrder.publicId || `#${historyOrder.id.substring(0, 8).toUpperCase()}` }}</span>
                    <AdminOrderStatusBadge :status="historyOrder.status" />
                  </div>
                  <div class="od-history__meta">
                    <span>{{ formatDate(historyOrder.createdAt) }}</span>
                    <span>{{ callStatusLabel(historyOrder.callStatus) }}</span>
                  </div>
                  <div class="od-history__items">
                    {{ formatPreviousOrderItems(historyOrder) }}
                  </div>
                  <div class="od-history__foot">
                    <span>{{ deliveryModeLabel(historyOrder.deliveryMode) }}</span>
                    <strong>{{ formatCurrency(previousOrderTotal(historyOrder)) }}</strong>
                  </div>
                </NuxtLink>
              </div>

              <div v-else class="od-history__empty">
                <Icon name="lucide:shield-check" class="w-5 h-5" />
                <span>{{ previousOrdersEmptyLabel }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- MOBILE STICKY ACTION BAR -->
      <div class="od-mobile-bar lg:hidden">
        <OrdersOrderDetailNBA
          :model="nbaModel"
          :busy="updating"
          :full-width="true"
          :menu-up="true"
          @action="applyNBAAction"
        />
      </div>
    </template>

    <!-- ERROR -->
    <div v-else class="od-shell">
      <div class="ui-card p-12 text-center">
        <Icon name="lucide:alert-circle" class="mx-auto h-10 w-10 text-red-400" />
        <h3 class="mt-2 text-sm font-medium" style="color: var(--text-primary)">{{ t('admin.pages.orders.detail.notFound.title') }}</h3>
        <p class="mt-1 text-sm" style="color: var(--text-tertiary)">{{ t('admin.pages.orders.detail.notFound.hint') }}</p>
        <NuxtLink to="/admin/orders" class="mt-6 inline-block [color:var(--brand)] hover:[color:var(--brand)] font-medium">{{ t('admin.pages.orders.detail.backToOrders') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import DeliveryPaymentModal from '~/components/cash/DeliveryPaymentModal.vue'
import OrderPaymentModal from '~/components/admin/orders/OrderPaymentModal.vue'
import { DZ_WILAYAS } from '~/shared/geo/dz'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { getVariantAvailableStock, PRODUCT_INFINITE_STOCK } from '~/shared/inventory/variant-availability'
import { buildProductPricing, buildScopedProductPricing, toFiniteNumber } from '~/shared/pricing/product-pricing'
import { useOrderNBA, type NBAAction } from '~/composables/admin/useOrderNBA'
import { useOrderUnreadCount } from '~/composables/useOrderUnreadCount'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.orders.detail.metaTitle'
})

const authStore = useAuthStore()
const { showToast } = useToast()
const { format: formatCurrency } = useCurrency()
const route = useRoute()
const router = useRouter()
const orderId = computed(() => String(route.params.id || ''))
const { t, locale } = useI18n({ useScope: 'global' })
const { markOrderAsRead } = useOrderUnreadCount()

interface OrderItem {
  id: string
  productId: string
  variantId?: string | null
  quantity: number
  price: number
  lineTotal?: number
  product?: {
    title: string
  }
  variant?: {
    optionValues?: Array<{ optionValue?: { label?: string | null } | null }> | null
  } | null
}

interface PreviousOrderItem {
  id: string
  productId: string
  variantId?: string | null
  quantity: number
  price: number
  lineTotal?: number | null
  product?: {
    title: string
  } | null
  variant?: {
    optionValues?: Array<{ optionValue?: { label?: string | null } | null }> | null
  } | null
}

interface PreviousOrder {
  id: string
  publicId?: string | null
  status: string
  callStatus?: string | null
  customerName: string
  customerPhone: string
  totalAmount: number
  totalWithShippingAmount?: number | null
  shippingAmount?: number | null
  shippingProvider?: string | null
  deliveryMode?: string | null
  createdAt: string
  updatedAt: string
  items?: PreviousOrderItem[]
}

type PreviousOrdersMatch =
  | { type: 'customer'; customerId: string; phoneNormalized?: string | null }
  | { type: 'phone'; customerId?: null; phoneNormalized: string }
  | { type: 'none'; customerId?: string | null; phoneNormalized?: string | null }

  interface Order {
    id: string
    publicId?: string | null
    customerId?: string | null
    paidAmount: number
    paymentStatus: string
    customerName: string
    customerPhone: string
    customerPhoneNormalized?: string | null
    customerAddress: string | null
    totalAmount: number
    totalWithShippingAmount?: number | null
    shippingAmount?: number | null
    shippingCurrency?: string | null
    shippingProvider?: string | null
    deliveryMode?: string | null
    shippingServiceLevel?: string | null
    shippingPickupPoint?: number | null
    shippingWilayaCode?: string | null
    shippingCommuneCode?: string | null
    shippingAddressLine1?: string | null
    shippingNotes?: string | null
    shipments?: Array<{
      id: string
      provider: string
      providerShipmentId?: string | null
      status: string
      serviceLevel?: string | null
      createdAt: string
    }>
    status: string
    callStatus: string
    internalNotes: string | null
    createdAt: string
    items: OrderItem[]
    previousOrders?: PreviousOrder[]
    previousOrdersMatch?: PreviousOrdersMatch
  }

type CartItem = {
  productId: string
  variantId?: string
  title: string
  variantLabel?: string
  price: number
  quantity: number
}

const loading = ref(true)
const updating = ref(false)
const order = ref<Order | null>(null)
const newStatus = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const deliveryModalOpen = ref(false)
const paymentModalOpen = ref(false)
const cashboxes = ref<any[]>([])
const activeTab = ref<'items' | 'delivery' | 'history'>('items')

async function openPaymentModal() {
  try {
    const data = await $fetch('/api/admin/cashboxes', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    cashboxes.value = data as any[]
    paymentModalOpen.value = true
  } catch (e) {
    console.error('Failed to load cashboxes:', e)
    errorMessage.value = t('admin.pages.orders.detail.statusUpdate.errors.loadCashboxesFailed')
  }
}

const deleteOpen = ref(false)
const deleteError = ref<string | null>(null)

const savingNotes = ref(false)
const notesSavedMessage = ref('')

const savingCallStatus = ref(false)
const callStatusSavedMessage = ref('')

const editing = ref(false)
const editSaving = ref(false)
const editErrorMessage = ref('')

const editingCustomer = ref(false)
const savingCustomer = ref(false)
const customerSaveError = ref('')

const products = ref<any[]>([])
const productSearch = ref('')
const cartItems = ref<CartItem[]>([])

const editCustomerName = ref('')
const editCustomerPhone = ref('')
const editCustomerAddress = ref('')
const editShippingProvider = ref('')
const editAvailableCompanies = ref<Array<{ code: string; name: string }>>([])
const editLocationAvailableProviders = ref<string[] | null>(null)
const editCompaniesLoading = ref(false)
const editCompaniesError = ref('')
const editDeliveryMode = ref<'home' | 'pickup' | 'store'>('home')
const editDeliveryChoice = ref<'home' | 'stopDesk' | 'pickupPoint'>('home')
const editShippingWilayaCode = ref('')
const editShippingCommuneCode = ref('')
const editShippingPickupPoint = ref('')
const editShippingAmountInput = ref('')
const editShippingCurrency = ref('DZD')
const editShippingServiceLevel = ref<string | null>(null)
const editMaystroCommunes = ref<Array<{ id?: number | string; name?: string }>>([])
const editMaystroCommunesLoading = ref(false)
const editMaystroCommunesError = ref('')
const editMaystroPickupPoints = ref<Array<{ pickup_point: number; commune: number; name?: string; name_lt?: string; name_ar?: string }>>([])
const editMaystroPickupPointsLoading = ref(false)
const editMaystroPickupPointsError = ref('')
const editHomePrice = ref<number | null>(null)
const editOfficePrice = ref<number | null>(null)
const editPriceLoading = ref(false)
const editPriceError = ref('')
const editQuoteCurrency = ref('DZD')
let editMaystroCommunesResolveId = 0
let editMaystroPickupPointsResolveId = 0
let editPriceResolveId = 0

const variantModalOpen = ref(false)
const loadingVariants = ref(false)
const selectedProductForVariant = ref<any>(null)
const availableVariantsForSelection = ref<any[]>([])

const statusLabelKeyByCode: Record<string, string> = {
  PENDING: 'admin.orderStatus.pending',
  CONFIRMED: 'admin.orderStatus.confirmed',
  SHIPPED: 'admin.orderStatus.shipped',
  DELIVERED: 'admin.orderStatus.delivered',
  CANCELLED: 'admin.orderStatus.cancelled',
  RETURNED: 'admin.orderStatus.returned'
}

function orderStatusLabel(code: string) {
  const key = statusLabelKeyByCode[code]
  return key ? t(key) : code
}

  const selectableStatuses = computed(() => {
  const current = order.value?.status
  if (!current) return []

  const next = (() => {
    if (current === 'PENDING') return ['CONFIRMED', 'CANCELLED']
    if (current === 'CONFIRMED') return ['SHIPPED', 'CANCELLED']
    if (current === 'SHIPPED') return ['DELIVERED', 'RETURNED']
    return []
  })()

  return Array.from(new Set([current, ...next]))
  })

  const orderTotalWithShipping = computed(() => {
    const o = order.value
    if (!o) return 0
    if (o.totalWithShippingAmount != null && Number.isFinite(Number(o.totalWithShippingAmount))) {
      return Number(o.totalWithShippingAmount)
    }
    const shipping = o.shippingAmount == null ? 0 : Number(o.shippingAmount)
    return Number(o.totalAmount || 0) + (Number.isFinite(shipping) ? shipping : 0)
  })

  const generatingWhatsapp = ref(false)

  async function generateAndSendWhatsapp() {
    if (generatingWhatsapp.value) return
    const o = order.value
    if (!o || !o.customerPhone) return

    // iOS Safari blocks window.open if it occurs after an await.
    // Opening it synchronously first prevents this.
    let newWin: Window | null = null
    if (typeof window !== 'undefined') {
      newWin = window.open('about:blank', '_blank')
    }

    generatingWhatsapp.value = true
    try {
      const [res, settings]: [any, any] = await Promise.all([
        $fetch(`/api/admin/orders/${o.id}/generate-confirmation`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authStore.token}` }
        }),
        $fetch('/api/admin/store-settings', {
          headers: { Authorization: `Bearer ${authStore.token}` }
        }).catch(() => null)
      ])

      const productsRecap = (o.items || [])
        .map((item: any) => `- ${item.quantity}x ${item.product?.title || 'Produit'} (${formatCurrency(item.price)})`)
        .join('\n')

      const total = formatCurrency(orderTotalWithShipping.value)
      
      const addrParts = []
      if (o.customerAddress) addrParts.push(o.customerAddress)
      if (shippingWilayaCommuneLabel.value) addrParts.push(shippingWilayaCommuneLabel.value)
      const fullAddress = addrParts.join(', ')
      
      let confirmLink = ''
      if (typeof window !== 'undefined') {
        const platformBaseDomain = usePlatformBaseDomain()
        const slug = authStore.user?.tenant?.slug
        if (slug) {
          const tenantHost = toTenantHost(window.location.host, slug, { platformBaseDomain })
          confirmLink = `${window.location.protocol}//${tenantHost}/confirm-order/${res.token}`
        }
      }

      let text = ''
      if (settings?.whatsappConfirmationTemplate) {
        text = settings.whatsappConfirmationTemplate
          .replace(/{customerName}/g, o.customerName || '')
          .replace(/{productsRecap}/g, productsRecap)
          .replace(/{total}/g, total)
          .replace(/{payment}/g, formatCurrency(o.paidAmount || 0))
          .replace(/{remaining}/g, formatCurrency(orderTotalWithShipping.value - (o.paidAmount || 0)))
          .replace(/{address}/g, fullAddress)
          .replace(/{confirmLink}/g, confirmLink)
      } else {
        text = `Bonjour ${o.customerName || ''},
Merci pour votre commande !
Voici un récapitulatif :
${productsRecap}

Total : ${total}
Versement : ${formatCurrency(o.paidAmount || 0)}
Reste à payer : ${formatCurrency(orderTotalWithShipping.value - (o.paidAmount || 0))}
Veuillez cliquer ici pour confirmer votre commande :
${confirmLink}`
      }

      let phone = o.customerPhone.replace(/\D/g, '')
      if (phone.startsWith('0')) {
        phone = '213' + phone.substring(1)
      }

      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      
      if (newWin) {
        newWin.location.href = whatsappUrl
      } else if (typeof window !== 'undefined') {
        window.location.href = whatsappUrl
      }
      
      if (order.value && order.value.callStatus !== 'whatsapp_sms_sent' && order.value.callStatus !== 'whatsapp_link_confirmed') {
        order.value.callStatus = 'whatsapp_sms_sent'
        await handleUpdateCallStatus()
      }
    } catch (err: any) {
      if (newWin) newWin.close()
      console.error('Failed to generate WhatsApp link', err)
      alert(t('admin.common.error', 'An error occurred'))
    } finally {
      generatingWhatsapp.value = false
    }
  }

  const previousOrders = computed(() => order.value?.previousOrders ?? [])

  const previousOrdersMatchLabel = computed(() => {
    const match = order.value?.previousOrdersMatch
    if (match?.type === 'customer') {
      return t('admin.pages.orders.detail.previousOrders.matchCustomer', 'Matched by linked customer record.')
    }
    if (match?.type === 'phone') {
      return t('admin.pages.orders.detail.previousOrders.matchPhone', 'Matched by normalized phone number.')
    }
    return t('admin.pages.orders.detail.previousOrders.matchNone', 'Phone could not be normalized.')
  })

  const previousOrdersEmptyLabel = computed(() => {
    const match = order.value?.previousOrdersMatch
    if (match?.type === 'customer') {
      return t('admin.pages.orders.detail.previousOrders.emptyCustomer', 'No previous orders for this customer.')
    }
    if (match?.type === 'phone') {
      return t('admin.pages.orders.detail.previousOrders.emptyPhone', 'No previous orders for this phone.')
    }
    return t('admin.pages.orders.detail.previousOrders.emptyNone', 'Phone could not be normalized.')
  })

  const statusLocked = computed(() => {
    const o = order.value
    if (!o) return false
    
    const provider = String(o.shippingProvider || (o.shipments && o.shipments.length ? o.shipments[0].provider : '') || '').toUpperCase()
    const hasApiCarrier = Boolean(provider) && provider !== 'SELF'
    
    return hasApiCarrier && o.status !== 'PENDING'
  })

  const canPrintBordereau = computed(() => {
    const o = order.value
    if (!o) return false
    return Boolean(o.shippingProvider) || Boolean(o.shipments && o.shipments.length)
  })

  // Show "Push to Maystro" retry button when order is confirmed with Maystro but no shipment was created yet
  const canRetryMaystro = computed(() => {
    const o = order.value
    if (!o) return false
    return o.shippingProvider === 'MAYSTRO' && o.status === 'CONFIRMED' && (!o.shipments || o.shipments.length === 0)
  })

  const isEditMaystroShipping = computed(() => String(editShippingProvider.value || '').toUpperCase() === 'MAYSTRO')

  const wilayaNameByCode = new Map(DZ_WILAYAS.map((w) => [w.code, w.name]))
  const communeNameCache = useState<Record<string, string>>('admin-order-commune-names', () => ({}))
  const shippingCommuneLabel = ref('')
  let shippingLocationResolveId = 0

  const normalizeWilayaCode = (value: unknown): string => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (/^\d+$/.test(raw)) return raw.padStart(2, '0')
    return raw
  }

  const shippingWilayaLabel = computed(() => {
    const raw = String(order.value?.shippingWilayaCode || '').trim()
    if (!raw) return ''
    return wilayaNameByCode.get(normalizeWilayaCode(raw)) || raw
  })

  const shippingWilayaCommuneLabel = computed(() => {
    const parts = [shippingWilayaLabel.value, shippingCommuneLabel.value].filter(Boolean)
    if (parts.length > 0) return parts.join(' / ')
    return [order.value?.shippingWilayaCode, order.value?.shippingCommuneCode].filter(Boolean).join(' / ')
  })

  watch(
    () => [order.value?.shippingWilayaCode ?? '', order.value?.shippingCommuneCode ?? ''] as const,
    async ([wilayaCode, communeCode]) => {
      const currentResolveId = ++shippingLocationResolveId

      const communeRaw = String(communeCode || '').trim()
      if (!communeRaw) {
        shippingCommuneLabel.value = ''
        return
      }

      if (!/^\d+$/.test(communeRaw)) {
        shippingCommuneLabel.value = communeRaw
        return
      }

      const normalizedWilayaCode = String(wilayaCode || '').trim()
      if (!normalizedWilayaCode) {
        shippingCommuneLabel.value = communeRaw
        return
      }

      const cacheKey = `${normalizeWilayaCode(normalizedWilayaCode)}:${communeRaw}`
      const cached = communeNameCache.value[cacheKey]
      if (cached) {
        shippingCommuneLabel.value = cached
        return
      }

      try {
        const communes = await $fetch('/api/delivery/maystro/communes', {
          query: { wilaya: normalizedWilayaCode }
        }) as Array<{ id?: number | string; name?: string }>

        if (currentResolveId !== shippingLocationResolveId) return

        const matched = Array.isArray(communes)
          ? communes.find((c) => String(c?.id ?? '').trim() === communeRaw)
          : null
        const resolved = typeof matched?.name === 'string' && matched.name.trim().length > 0
          ? matched.name.trim()
          : communeRaw

        communeNameCache.value[cacheKey] = resolved
        shippingCommuneLabel.value = resolved
      } catch {
        if (currentResolveId !== shippingLocationResolveId) return
        shippingCommuneLabel.value = communeRaw
      }
    },
    { immediate: true }
  )

  const normalizeOptionalText = (value: unknown): string | null => {
    const raw = String(value ?? '').trim()
    return raw.length > 0 ? raw : null
  }

  const normalizeDeliveryModeValue = (value: unknown): 'home' | 'pickup' | 'store' => {
    const raw = String(value || '').trim().toLowerCase()
    if (raw === 'store') return 'store'
    if (raw === 'pickup' || raw === 'desk' || raw === 'office') return 'pickup'
    return 'home'
  }

  const formatQuoteLabel = (price: number | null, currency = 'DZD') => {
    if (price == null || !Number.isFinite(price)) return '—'
    return `${price} ${currency || 'DZD'}`
  }

  const editHomePriceLabel = computed(() => formatQuoteLabel(editHomePrice.value, editQuoteCurrency.value))
  const editOfficePriceLabel = computed(() => formatQuoteLabel(editOfficePrice.value, editQuoteCurrency.value))
  const editVisibleCompanies = computed(() => {
    const allowed = editAvailableCompanies.value
    const locationAvailable = editLocationAvailableProviders.value
    if (!locationAvailable || locationAvailable.length === 0) return allowed
    const allowedSet = new Set(locationAvailable)
    const selected = String(editShippingProvider.value || '').trim().toUpperCase()
    return allowed.filter((c) => allowedSet.has(c.code) || (selected.length > 0 && c.code === selected))
  })

  async function loadEditAvailableCompanies() {
    editCompaniesLoading.value = true
    editCompaniesError.value = ''
    try {
      const companies = await $fetch('/api/delivery/companies', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }) as Array<{ code?: string; name?: string }>

      editAvailableCompanies.value = Array.isArray(companies)
        ? companies
          .map((c) => ({
            code: String(c?.code || '').trim().toUpperCase(),
            name: String(c?.name || '').trim()
          }))
          .filter((c) => c.code.length > 0 && c.name.length > 0)
        : []
    } catch (error: any) {
      editAvailableCompanies.value = []
      editCompaniesError.value = error?.data?.statusMessage || error?.data?.message || t('common.error', 'An error occurred. Please try again.')
    } finally {
      editCompaniesLoading.value = false
    }
  }

  async function loadEditLocationAvailableProviders() {
    const wilayaCode = normalizeWilayaCode(editShippingWilayaCode.value)
    const communeCode = String(editShippingCommuneCode.value || '').trim()

    if (!wilayaCode) {
      editLocationAvailableProviders.value = null
      return
    }

    try {
      const [homeQuotes, officeQuotes] = await Promise.all([
        $fetch('/api/delivery/options', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authStore.token}` },
          body: {
            deliveryMode: 'home',
            destination: { wilayaCode, communeCode: communeCode || undefined }
          }
        }) as Promise<Array<{ provider?: string }>>,
        $fetch('/api/delivery/options', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authStore.token}` },
          body: {
            deliveryMode: 'office',
            destination: { wilayaCode, communeCode: communeCode || undefined }
          }
        }) as Promise<Array<{ provider?: string }>>
      ])

      const providers = new Set<string>()
      for (const q of [...(homeQuotes || []), ...(officeQuotes || [])]) {
        const code = String((q as any)?.provider || '').trim().toUpperCase()
        if (code) providers.add(code)
      }
      editLocationAvailableProviders.value = Array.from(providers)
    } catch {
      editLocationAvailableProviders.value = null
    }
  }

  async function loadEditMaystroCommunes(wilayaCode: string) {
    const normalized = normalizeWilayaCode(wilayaCode)
    const requestId = ++editMaystroCommunesResolveId
    editMaystroCommunesError.value = ''

    if (!isEditMaystroShipping.value || !normalized) {
      editMaystroCommunesLoading.value = false
      editMaystroCommunes.value = []
      return
    }

    editMaystroCommunesLoading.value = true
    try {
      const communes = await $fetch('/api/delivery/maystro/communes', {
        query: { wilaya: normalized }
      }) as Array<{ id?: number | string; name?: string }>
      if (requestId !== editMaystroCommunesResolveId) return
      editMaystroCommunes.value = Array.isArray(communes) ? communes : []
    } catch (error: any) {
      if (requestId !== editMaystroCommunesResolveId) return
      editMaystroCommunes.value = []
      editMaystroCommunesError.value = error?.data?.statusMessage || t('common.error', 'An error occurred. Please try again.')
    } finally {
      if (requestId === editMaystroCommunesResolveId) {
        editMaystroCommunesLoading.value = false
      }
    }
  }

  async function loadEditProviderPrices() {
    const requestId = ++editPriceResolveId
    editPriceError.value = ''
    editHomePrice.value = null
    editOfficePrice.value = null

    const provider = String(editShippingProvider.value || '').trim().toUpperCase()
    const wilayaCode = normalizeWilayaCode(editShippingWilayaCode.value)
    const communeCode = String(editShippingCommuneCode.value || '').trim()

    if (!provider || !wilayaCode) {
      editPriceLoading.value = false
      return
    }

    if (provider === 'MAYSTRO' && !communeCode) {
      editPriceLoading.value = false
      return
    }

    const fetchBestQuote = async (deliveryMode: 'home' | 'office') => {
      const quotes = await $fetch('/api/delivery/options', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: {
          provider,
          deliveryMode,
          destination: {
            wilayaCode,
            communeCode: communeCode || undefined
          }
        }
      }) as Array<{ price?: number; currency?: string; serviceLevel?: string }>

      if (!Array.isArray(quotes) || quotes.length === 0) return null
      const normalized = quotes
        .map((q) => ({
          price: Number(q?.price),
          currency: String(q?.currency || '').trim(),
          serviceLevel: String(q?.serviceLevel || '').trim()
        }))
        .filter((q) => Number.isFinite(q.price))

      if (normalized.length === 0) return null
      return normalized.reduce((best, current) => (current.price < best.price ? current : best))
    }

    editPriceLoading.value = true
    try {
      const [homeQuote, officeQuote] = await Promise.all([
        fetchBestQuote('home'),
        fetchBestQuote('office')
      ])
      if (requestId !== editPriceResolveId) return
      editHomePrice.value = homeQuote?.price ?? null
      editOfficePrice.value = officeQuote?.price ?? null
      editQuoteCurrency.value =
        homeQuote?.currency ||
        officeQuote?.currency ||
        editShippingCurrency.value ||
        'DZD'
    } catch (error: any) {
      if (requestId !== editPriceResolveId) return
      editPriceError.value = error?.data?.statusMessage || error?.data?.message || t('common.error', 'An error occurred. Please try again.')
    } finally {
      if (requestId === editPriceResolveId) {
        editPriceLoading.value = false
      }
    }
  }

  async function loadEditMaystroPickupPoints() {
    const requestId = ++editMaystroPickupPointsResolveId
    editMaystroPickupPointsError.value = ''
    editMaystroPickupPoints.value = []

    const wilayaCode = normalizeWilayaCode(editShippingWilayaCode.value)
    const communeCode = String(editShippingCommuneCode.value || '').trim()
    const needsPickupPoint = isEditMaystroShipping.value && editDeliveryChoice.value === 'pickupPoint'

    if (!needsPickupPoint || !wilayaCode || !communeCode) {
      editMaystroPickupPointsLoading.value = false
      return
    }

    editMaystroPickupPointsLoading.value = true
    try {
      const points = await $fetch(`/api/delivery/maystro/pickup-points?commune=${encodeURIComponent(communeCode)}&wilaya=${encodeURIComponent(wilayaCode)}&deliveryType=3&nearby=true`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }) as any[]

      if (requestId !== editMaystroPickupPointsResolveId) return
      editMaystroPickupPoints.value = Array.isArray(points)
        ? points
          .map((p: any) => ({
            pickup_point: Number(p?.pickup_point),
            commune: Number(p?.commune),
            name: p?.name ? String(p.name) : undefined,
            name_lt: p?.name_lt ? String(p.name_lt) : undefined,
            name_ar: p?.name_ar ? String(p.name_ar) : undefined
          }))
          .filter((p) => Number.isFinite(p.pickup_point) && p.pickup_point > 0)
        : []
    } catch (error: any) {
      if (requestId !== editMaystroPickupPointsResolveId) return
      editMaystroPickupPoints.value = []
      editMaystroPickupPointsError.value = error?.data?.statusMessage || error?.data?.message || t('common.error', 'An error occurred. Please try again.')
    } finally {
      if (requestId === editMaystroPickupPointsResolveId) {
        editMaystroPickupPointsLoading.value = false
      }
    }
  }

  function applyEditDeliveryChoice() {
    if (editDeliveryChoice.value === 'home') {
      editDeliveryMode.value = 'home'
      editShippingServiceLevel.value = 'home'
      editShippingPickupPoint.value = ''
      editShippingAmountInput.value = editHomePrice.value != null ? String(editHomePrice.value) : ''
    } else if (editDeliveryChoice.value === 'stopDesk') {
      editDeliveryMode.value = 'pickup'
      editShippingServiceLevel.value = 'office'
      editShippingPickupPoint.value = ''
      editShippingAmountInput.value = editOfficePrice.value != null ? String(editOfficePrice.value) : ''
    } else {
      editDeliveryMode.value = 'pickup'
      editShippingServiceLevel.value = 'office'
      editShippingAmountInput.value = editOfficePrice.value != null ? String(editOfficePrice.value) : ''
    }

    if (editQuoteCurrency.value) {
      editShippingCurrency.value = editQuoteCurrency.value
    }
  }

  function onEditDeliveryChoiceChange(nextValue: unknown) {
    const next = String(nextValue || '').trim()
    if (next === 'home' || next === 'stopDesk' || next === 'pickupPoint') {
      editDeliveryChoice.value = next
    } else {
      editDeliveryChoice.value = 'home'
    }

    if (!isEditMaystroShipping.value && editDeliveryChoice.value === 'pickupPoint') {
      editDeliveryChoice.value = 'stopDesk'
    }
    applyEditDeliveryChoice()
    void loadEditMaystroPickupPoints()
  }

  async function onEditShippingProviderChange(nextValue: unknown) {
    const nextProvider = String(nextValue || '').trim().toUpperCase()
    editShippingProvider.value = nextProvider

    if (normalizeDeliveryModeValue(editDeliveryMode.value) === 'pickup') {
      editDeliveryChoice.value = editShippingPickupPoint.value ? 'pickupPoint' : 'stopDesk'
    } else {
      editDeliveryChoice.value = 'home'
    }

    if (!isEditMaystroShipping.value && editDeliveryChoice.value === 'pickupPoint') {
      editDeliveryChoice.value = 'stopDesk'
    }

    if (isEditMaystroShipping.value) {
      await loadEditMaystroCommunes(editShippingWilayaCode.value)
    } else {
      editMaystroCommunes.value = []
      editMaystroCommunesError.value = ''
    }

    await loadEditProviderPrices()
    applyEditDeliveryChoice()
    await loadEditMaystroPickupPoints()
  }

  async function onEditCommuneChange() {
    await loadEditLocationAvailableProviders()
    if (editShippingProvider.value && !editVisibleCompanies.value.some((c) => c.code === editShippingProvider.value)) {
      editShippingProvider.value = ''
    }
    await loadEditProviderPrices()
    applyEditDeliveryChoice()
    await loadEditMaystroPickupPoints()
  }

  function setEditLocationFieldsFromOrder() {
    const currentProvider = String(order.value?.shippingProvider || '').trim().toUpperCase()
    if (currentProvider && !editAvailableCompanies.value.some((c) => c.code === currentProvider)) {
      editAvailableCompanies.value = [...editAvailableCompanies.value, { code: currentProvider, name: currentProvider }]
    }
    editShippingProvider.value = currentProvider
    editDeliveryMode.value = normalizeDeliveryModeValue(order.value?.deliveryMode)
    editShippingServiceLevel.value = normalizeOptionalText(order.value?.shippingServiceLevel)
    editShippingPickupPoint.value =
      order.value?.shippingPickupPoint != null && Number(order.value?.shippingPickupPoint) > 0
        ? String(order.value?.shippingPickupPoint)
        : ''
    editShippingAmountInput.value =
      order.value?.shippingAmount != null && Number.isFinite(Number(order.value.shippingAmount))
        ? String(Number(order.value.shippingAmount))
        : ''
    editShippingCurrency.value = String(order.value?.shippingCurrency || 'DZD').trim().toUpperCase()

    if (editDeliveryMode.value === 'pickup') {
      editDeliveryChoice.value = editShippingPickupPoint.value ? 'pickupPoint' : 'stopDesk'
    } else {
      editDeliveryChoice.value = 'home'
    }

    editShippingWilayaCode.value = normalizeWilayaCode(order.value?.shippingWilayaCode)
    editShippingCommuneCode.value = String(order.value?.shippingCommuneCode || '').trim()
    editMaystroCommunesError.value = ''
    editMaystroCommunes.value = []
    if (isEditMaystroShipping.value && editShippingWilayaCode.value) {
      void loadEditMaystroCommunes(editShippingWilayaCode.value)
    }
    void loadEditLocationAvailableProviders()
    void loadEditProviderPrices()
    void loadEditMaystroPickupPoints()
  }

  async function onEditWilayaChange(nextValue: unknown) {
    const normalized = normalizeWilayaCode(nextValue)
    // With BaseSelect + v-model, the model can already be updated before this
    // handler runs. Do not early-return here or communes/prices won't refresh.
    editShippingWilayaCode.value = normalized
    editShippingCommuneCode.value = ''
    if (isEditMaystroShipping.value) {
      await loadEditMaystroCommunes(normalized)
    } else {
      editMaystroCommunes.value = []
      editMaystroCommunesError.value = ''
    }
    await loadEditLocationAvailableProviders()
    if (editShippingProvider.value && !editVisibleCompanies.value.some((c) => c.code === editShippingProvider.value)) {
      editShippingProvider.value = ''
    }
    await loadEditProviderPrices()
    applyEditDeliveryChoice()
    await loadEditMaystroPickupPoints()
  }

  function buildEditShippingPayload() {
    const normalizedWilaya = normalizeWilayaCode(editShippingWilayaCode.value)
    const provider = normalizeOptionalText(editShippingProvider.value?.toUpperCase())
    const deliveryMode =
      provider === 'MAYSTRO'
        ? (editDeliveryChoice.value === 'home' ? 'home' : 'pickup')
        : normalizeOptionalText(editDeliveryMode.value)

    const shippingAmountRaw = String(editShippingAmountInput.value || '').trim()
    let shippingAmount: number | null = null
    if (shippingAmountRaw.length > 0) {
      const parsed = Number(shippingAmountRaw)
      shippingAmount = Number.isFinite(parsed) ? parsed : null
    }

    const shippingPickupPoint =
      provider === 'MAYSTRO' && editDeliveryChoice.value === 'pickupPoint'
        ? normalizeOptionalText(editShippingPickupPoint.value)
        : null

    return {
      deliveryMode,
      shippingProvider: provider,
      shippingWilayaCode: normalizeOptionalText(normalizedWilaya),
      shippingCommuneCode: normalizeOptionalText(editShippingCommuneCode.value),
      shippingServiceLevel:
        provider === 'MAYSTRO'
          ? (editDeliveryChoice.value === 'home' ? 'home' : 'office')
          : normalizeOptionalText(editShippingServiceLevel.value),
      shippingAmount,
      shippingCurrency: normalizeOptionalText(editShippingCurrency.value?.toUpperCase()),
      shippingPickupPoint
    }
  }

  function validateEditShippingSelection() {
    if (isEditMaystroShipping.value && editDeliveryChoice.value === 'pickupPoint' && !normalizeOptionalText(editShippingPickupPoint.value)) {
      return t('admin.pages.orders.detail.fields.pickupPoint', 'Pickup point')
    }

    const shippingAmountRaw = String(editShippingAmountInput.value || '').trim()
    if (!shippingAmountRaw) return null
    const parsed = Number(shippingAmountRaw)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return t('admin.pages.orders.detail.fields.shippingFee', 'Shipping fee')
    }
    return null
  }

  function deliveryModeLabel(mode: any) {
    const raw = typeof mode === 'string' ? mode.trim().toLowerCase() : ''
    if (raw === 'store') return t('admin.pages.orders.index.deliveryModes.store', 'Store pickup')
    if (raw === 'pickup' || raw === 'desk' || raw === 'office') return t('admin.pages.orders.index.deliveryModes.pickup', 'Stop desk')
    return t('admin.pages.orders.index.deliveryModes.home', 'Home delivery')
  }

  function previousOrderTotal(historyOrder: PreviousOrder) {
    if (historyOrder.totalWithShippingAmount != null && Number.isFinite(Number(historyOrder.totalWithShippingAmount))) {
      return Number(historyOrder.totalWithShippingAmount)
    }
    const shipping = historyOrder.shippingAmount == null ? 0 : Number(historyOrder.shippingAmount)
    return Number(historyOrder.totalAmount || 0) + (Number.isFinite(shipping) ? shipping : 0)
  }

  function callStatusLabel(status: any) {
    const value = String(status || 'not_called')
    return t(`admin.pages.orders.detail.fields.callStatusValues.${value}`, value)
  }

  function formatPreviousOrderItems(historyOrder: PreviousOrder) {
    const items = Array.isArray(historyOrder.items) ? historyOrder.items : []
    if (items.length === 0) return t('admin.pages.orders.detail.previousOrders.noItems', 'No items')

    const visible = items.slice(0, 2).map((item) => {
      const title = item.product?.title || t('admin.pages.orders.detail.itemsTable.fallbackProduct', 'Product')
      const variantLabel = variantLabelFromOrderItem(item)
      const label = variantLabel ? `${title} (${variantLabel})` : title
      return `${label} x${item.quantity}`
    })
    const remaining = items.length - visible.length
    if (remaining > 0) {
      visible.push(t('admin.pages.orders.detail.previousOrders.moreItems', { count: remaining }))
    }
    return visible.join(' · ')
  }

  async function retryMaystro() {
    if (!order.value) return
    errorMessage.value = ''
    successMessage.value = ''
    updating.value = true
    try {
      const o = order.value as any
      await $fetch('/api/shipments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: {
          provider: 'MAYSTRO',
          orderId: o.id,
          contactName: o.customerName,
          contactPhone: o.customerPhone,
          wilayaCode: o.shippingWilayaCode,
          communeCode: o.shippingCommuneCode,
          addressLine1: o.shippingAddressLine1 || o.customerAddress,
          notes: o.shippingNotes,
          deliveryMode: o.deliveryMode === 'pickup' ? 'office' : 'home',
          metadata: o.shippingPickupPoint ? { pickupPoint: o.shippingPickupPoint } : undefined
        }
      })
      successMessage.value = 'Order pushed to Maystro successfully'
      setTimeout(() => { successMessage.value = '' }, 3000)
      await fetchOrder()
    } catch (e: any) {
      console.error('Maystro retry failed', e)
      errorMessage.value = e?.data?.statusMessage || e?.data?.message || 'Failed to push to Maystro'
    } finally {
      updating.value = false
    }
  }

  async function printBordereau() {
    if (!order.value) return
    errorMessage.value = ''
    try {
      const blob = await $fetch(`/api/admin/orders/${encodeURIComponent(orderId.value)}/bordereau`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
        responseType: 'blob' as any
      }) as unknown as Blob
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e: any) {
      console.error('Failed to print bordereau', e)
      errorMessage.value = e?.data?.statusMessage || t('common.error', 'An error occurred. Please try again.')
    }
  }

function variantLabelFromOrderItem(item: OrderItem | PreviousOrderItem): string | undefined {
  const labels =
    item.variant?.optionValues
      ?.map((ov) => ov?.optionValue?.label)
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0) ?? []
  if (labels.length === 0) return undefined
  return labels.join(' / ')
}

function applyPromotionPricingToCartItems() {
  cartItems.value = cartItems.value.map((item) => {
    const orderItem = order.value?.items?.find(
      (entry) => entry.productId === item.productId && (entry.variantId || undefined) === (item.variantId || undefined)
    )
    if (item.variantId && orderItem?.variant) {
      const pricing = buildScopedProductPricing(
        { ...(products.value.find((p: any) => p?.id === item.productId) || {}), ...(orderItem.product || {}), hasVariants: true },
        orderItem.variant as any
      )
      return { ...item, price: pricing.effectivePrice }
    }
    const product = products.value.find((p: any) => p?.id === item.productId)
    if (!product) return item
    const pricing = buildScopedProductPricing(product)
    return { ...item, price: pricing.effectivePrice }
  })
}

const searchedProducts = computed(() => {
  if (!productSearch.value.trim()) return []
  const q = productSearch.value.toLowerCase()
  return products.value
    .filter((p: any) => (p?.title || '').toLowerCase().includes(q) || (p?.sku || '').toLowerCase().includes(q))
    .map((product: any) => ({
      ...product,
      ...buildProductPricing(product)
    }))
    .slice(0, 6)
})

const cartTotal = computed(() => {
  return cartItems.value.reduce((total, item) => total + item.price * item.quantity, 0)
})

async function fetchOrder() {
  if (!order.value) loading.value = true
  try {
    const data = await $fetch(`/api/admin/orders/${orderId.value}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    order.value = data
    newStatus.value = data.status
    editing.value = false
    editErrorMessage.value = ''
    try {
      await markOrderAsRead(orderId.value)
    } catch (markReadError) {
      console.error('Failed to mark order as read:', markReadError)
    }
  } catch (error: any) {
    console.error('Failed to fetch order:', error)
    if (!order.value) {
      order.value = null
    }
  } finally {
    loading.value = false
  }
}

function openDelete() {
  deleteError.value = null
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!order.value) return
  if (order.value.status !== 'PENDING' && order.value.status !== 'CONFIRMED') return

  deleteError.value = null
  try {
    await $fetch(`/api/admin/orders/${encodeURIComponent(orderId.value)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    deleteOpen.value = false
    await router.push('/admin/orders')
  } catch (error: any) {
    console.error('Failed to delete order:', error)
    deleteError.value = error?.data?.statusMessage || t('common.error', 'An error occurred. Please try again.')
  }
}

async function ensureProductsLoaded() {
  if (products.value.length > 0) return
  try {
    const prodRes = await $fetch('/api/admin/products', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query: { limit: 200 }
    })
    products.value = prodRes as any[]
  } catch (e) {
    console.error('Failed to load products for order edit:', e)
  }
}

async function startEdit() {
  if (!order.value) return
  if (order.value.status !== 'PENDING') return
  if (updating.value) return

  editing.value = true
  editSaving.value = false
  editErrorMessage.value = ''
  productSearch.value = ''

  editCustomerName.value = order.value.customerName || ''
  editCustomerPhone.value = order.value.customerPhone || ''
  editCustomerAddress.value = order.value.customerAddress || ''
  setEditLocationFieldsFromOrder()

  cartItems.value = (order.value.items || []).map((i) => ({
    productId: i.productId,
    variantId: i.variantId || undefined,
    title: i.product?.title || t('admin.pages.orders.detail.itemsTable.fallbackProduct', 'Product'),
    variantLabel: variantLabelFromOrderItem(i),
    price: Number(i.price || 0),
    quantity: Number(i.quantity || 1)
  }))

  await ensureProductsLoaded()
  applyPromotionPricingToCartItems()
}

function cancelEdit() {
  editing.value = false
  editErrorMessage.value = ''
  productSearch.value = ''
  variantModalOpen.value = false
  editingCustomer.value = false
  customerSaveError.value = ''
  editMaystroCommunesLoading.value = false
  editMaystroCommunesError.value = ''
  editMaystroPickupPointsLoading.value = false
  editMaystroPickupPointsError.value = ''
  editPriceLoading.value = false
  editPriceError.value = ''
}

async function addProductToCart(product: any) {
  productSearch.value = ''
  const pricing = buildScopedProductPricing(product)

  if (product?.options && product.options.length > 0) {
    selectedProductForVariant.value = product
    variantModalOpen.value = true
    loadingVariants.value = true
    availableVariantsForSelection.value = []
    try {
      const response = await $fetch(`/api/admin/products/${product.id}`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }) as any

      selectedProductForVariant.value = response

      availableVariantsForSelection.value = (response.variants || []).map((v: any) => {
        const variantPricing = buildScopedProductPricing(response, v)
        const label = v.optionValues
          ? v.optionValues.map((ov: any) => ov.optionValue?.label).join(' / ')
          : 'Default'
        return {
          ...v,
          label,
          availableStock: Number(
            v.availableStock ?? getVariantAvailableStock(v, { infiniteValue: PRODUCT_INFINITE_STOCK })
          ),
          originalPrice: variantPricing.originalPrice,
          displayPrice: variantPricing.effectivePrice,
          promotionApplied: variantPricing.promotionApplied,
          promotionDiscountPercent: variantPricing.promotionDiscountPercent
        }
      })
    } catch (e) {
      console.error(e)
      variantModalOpen.value = false
    } finally {
      loadingVariants.value = false
    }
    return
  }

  const existing = cartItems.value.find((i) => i.productId === product.id && !i.variantId)
  if (existing) {
    existing.price = pricing.effectivePrice
    existing.quantity++
    return
  }

  cartItems.value.push({
    productId: product.id,
    title: product.title,
    price: pricing.effectivePrice,
    quantity: 1
  })
}

function onVariantSelected(variant: any) {
  const product = selectedProductForVariant.value
  if (!product) return
  const unitPrice = toFiniteNumber(variant.displayPrice ?? variant.price)

  const existing = cartItems.value.find((i) => i.productId === product.id && i.variantId === variant.id)
  if (existing) {
    existing.price = unitPrice
    existing.quantity++
  } else {
    cartItems.value.push({
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      variantLabel: variant.label,
      price: unitPrice,
      quantity: 1
    })
  }

  variantModalOpen.value = false
}

function removeCartItem(index: number) {
  cartItems.value.splice(index, 1)
}

async function saveEdit() {
  if (!order.value) return
  if (order.value.status !== 'PENDING') return
  if (cartItems.value.length === 0) return

  const shippingValidationError = validateEditShippingSelection()
  if (shippingValidationError) {
    editErrorMessage.value = `${shippingValidationError} ${t('common.invalid', 'is invalid')}`
    return
  }

  editErrorMessage.value = ''
  editSaving.value = true

  try {
    const payload = {
      customerName: editCustomerName.value,
      customerPhone: editCustomerPhone.value,
      customerAddress: editCustomerAddress.value,
      shippingAddressLine1: editCustomerAddress.value,
      ...buildEditShippingPayload(),
      items: cartItems.value.map((i) => ({
        productId: i.productId,
        variantId: i.variantId || null,
        quantity: i.quantity
      }))
    }

    const updated = await $fetch(`/api/admin/orders/${orderId.value}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: payload
    }) as any

    order.value = updated
    newStatus.value = updated.status
    editing.value = false
  } catch (error: any) {
    console.error('Failed to update order:', error)
    editErrorMessage.value = error?.data?.statusMessage || t('common.error', 'An error occurred. Please try again.')
  } finally {
    editSaving.value = false
  }
}

function startEditCustomer() {
  if (!order.value || order.value.status !== 'PENDING' || editing.value) return
  editCustomerName.value = order.value.customerName || ''
  editCustomerPhone.value = order.value.customerPhone || ''
  editCustomerAddress.value = order.value.customerAddress || ''
  setEditLocationFieldsFromOrder()
  customerSaveError.value = ''
  editingCustomer.value = true
}

function cancelEditCustomer() {
  editingCustomer.value = false
  customerSaveError.value = ''
  editMaystroCommunesLoading.value = false
  editMaystroCommunesError.value = ''
  editMaystroPickupPointsLoading.value = false
  editMaystroPickupPointsError.value = ''
  editPriceLoading.value = false
  editPriceError.value = ''
}

async function saveCustomerInfo() {
  if (!order.value || order.value.status !== 'PENDING') return
  const shippingValidationError = validateEditShippingSelection()
  if (shippingValidationError) {
    customerSaveError.value = `${shippingValidationError} ${t('common.invalid', 'is invalid')}`
    return
  }
  customerSaveError.value = ''
  savingCustomer.value = true
  try {
    const updated = await $fetch(`/api/admin/orders/${orderId.value}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        customerName: editCustomerName.value,
        customerPhone: editCustomerPhone.value,
        customerAddress: editCustomerAddress.value,
        shippingAddressLine1: editCustomerAddress.value,
        ...buildEditShippingPayload()
      }
    }) as any
    order.value = updated
    newStatus.value = updated.status
    editingCustomer.value = false
    showToast(t('admin.common.saved', 'Saved'), 'success')
  } catch (error: any) {
    customerSaveError.value = error?.data?.statusMessage || t('common.error', 'An error occurred. Please try again.')
  } finally {
    savingCustomer.value = false
  }
}

async function handleStatusUpdate() {
  if (!order.value) return
  if (editing.value) return
  if (newStatus.value === 'DELIVERED') {
    errorMessage.value = ''
    successMessage.value = ''

    try {
      const data = await $fetch('/api/admin/cashboxes', {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
      cashboxes.value = data as any[]
    } catch (e) {
      console.error('Failed to load cashboxes:', e)
      errorMessage.value = t('admin.pages.orders.detail.statusUpdate.errors.loadCashboxesFailed')
      return
    }

    deliveryModalOpen.value = true
    return
  }
  
  errorMessage.value = ''
  successMessage.value = ''
  updating.value = true

  try {
    const updated = await $fetch(`/api/admin/orders/${orderId.value}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        status: newStatus.value
      }
    }) as any

    order.value = { ...order.value, ...updated }
    newStatus.value = updated.status

    if (updated._maystroError) {
      errorMessage.value = `Order confirmed but Maystro submission failed: ${updated._maystroError}`
    } else {
      successMessage.value = t('admin.pages.orders.detail.statusUpdate.success')
      setTimeout(() => { successMessage.value = '' }, 3000)
    }
  } catch (error: any) {
    console.error('Failed to update order:', error)
    errorMessage.value = error.data?.statusMessage || t('admin.pages.orders.detail.statusUpdate.errors.updateFailed')
  } finally {
    updating.value = false
  }
}

async function confirmDelivered(payload: { cashboxId: string; method: string; reference: string | null; note: string | null }) {
  if (!order.value) return
  if (editing.value) return
  errorMessage.value = ''
  successMessage.value = ''
  updating.value = true

  try {
    const updated = await $fetch(`/api/v1/admin/orders/${route.params.id}`, {
      method: 'PATCH',
      body: {
        status: 'DELIVERED',
        cashboxId: payload.cashboxId,
        method: payload.method,
        reference: payload.reference,
        note: payload.note
      }
    })

    order.value = updated as unknown as Order
    newStatus.value = updated.status
    successMessage.value = t('admin.pages.orders.detail.statusUpdate.success')
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
    deliveryModalOpen.value = false
  } catch (error: any) {
    console.error('Failed to mark delivered:', error)
    errorMessage.value = error.data?.statusMessage || t('admin.pages.orders.detail.statusUpdate.errors.updateFailed')
  } finally {
    updating.value = false
  }
}

async function confirmPayment(payload: { amount: number; cashboxId: string; method: string; reference: string | null; note: string | null }) {
  updating.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch(`/api/admin/orders/${route.params.id}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: payload
    })
    // Reload order to get new paidAmount and paymentStatus
    await fetchOrder()
    successMessage.value = t('admin.pages.orders.detail.paymentRecorded', 'Payment recorded')
    paymentModalOpen.value = false
  } catch (err: any) {
    console.error('Record payment error:', err)
    errorMessage.value = err.data?.statusMessage || err.message || 'Échec de l\'enregistrement du paiement'
  } finally {
    updating.value = false
  }
}

async function handleUpdateCallStatus() {
  if (!order.value) return
  if (editing.value) return
  savingCallStatus.value = true
  callStatusSavedMessage.value = ''
  
  try {
    const updated = await $fetch(`/api/admin/orders/${orderId.value}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { callStatus: order.value.callStatus }
    })
    order.value.callStatus = updated.callStatus
    callStatusSavedMessage.value = t('admin.common.saved', 'Saved')
    setTimeout(() => {
      callStatusSavedMessage.value = ''
    }, 2000)
  } catch (e: any) {
    console.error('Update call status failed:', e)
  } finally {
    savingCallStatus.value = false
  }
}

async function handleUpdateInternalNotes() {
  if (!order.value) return
  if (editing.value) return
  savingNotes.value = true
  notesSavedMessage.value = ''
  try {
    const updated = await $fetch(`/api/admin/orders/${orderId.value}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { internalNotes: order.value.internalNotes }
    })
    order.value.internalNotes = updated.internalNotes
    notesSavedMessage.value = t('admin.common.saved', 'Saved')
    setTimeout(() => {
      notesSavedMessage.value = ''
    }, 2000)
  } catch (e: any) {
    console.error('Update notes failed:', e)
  } finally {
    savingNotes.value = false
  }
}

function handleBlacklistPlaceholder(type: string) {
  const target =
    type === 'customer'
      ? t('admin.pages.orders.detail.actions.blacklistCustomer', 'Blacklist Customer')
      : type === 'ip'
        ? t('admin.pages.orders.detail.actions.blacklistIp', 'Blacklist IP Address')
        : t('admin.pages.orders.detail.actions.blacklistPhone', 'Blacklist Phone Number')

  showToast(`${target}: ${t('common.comingSoon', 'Coming soon')}`, 'info')
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast(t('common.copied', 'Copied'), 'success')
  } catch (err) {
    console.error('Failed to copy text: ', err)
    showToast(t('common.error', 'An error occurred. Please try again.'), 'error')
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const intlLocale = locale.value === 'fr' ? 'fr-FR' : locale.value === 'ar' ? 'ar-DZ' : 'en-US'
  return date.toLocaleDateString(intlLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ── Redesign: NBA model + tabbed detail zone ──

// Only show bordereau when the order has been confirmed (or beyond).
const canPrintBordereauVisible = computed(() => {
  const o = order.value
  if (!o) return false
  const s = String(o.status || '').toUpperCase()
  if (s !== 'CONFIRMED' && s !== 'SHIPPED' && s !== 'DELIVERED') return false
  return canPrintBordereau.value
})

const nbaModel = computed(() => useOrderNBA(order.value as any, t as any))

async function applyNBAAction(action: NBAAction) {
  if (!order.value) return
  switch (action.id) {
    case 'confirm': {
      newStatus.value = 'CONFIRMED'
      await handleStatusUpdate()
      return
    }
    case 'cancel': {
      newStatus.value = 'CANCELLED'
      await handleStatusUpdate()
      return
    }
    case 'updateStatus': {
      // Pick the first non-current selectable status as the suggested next step
      const next = selectableStatuses.value.find((s) => s !== order.value?.status)
      if (next) {
        newStatus.value = next
        await handleStatusUpdate()
      } else {
        activeTab.value = 'delivery'
      }
      return
    }
    case 'markShipped': {
      newStatus.value = 'SHIPPED'
      await handleStatusUpdate()
      return
    }
    case 'markDelivered': {
      newStatus.value = 'DELIVERED'
      await handleStatusUpdate()
      return
    }
    case 'blacklistCustomer': {
      handleBlacklistPlaceholder('customer')
      return
    }
    case 'blacklistPhone': {
      handleBlacklistPlaceholder('phone')
      return
    }
    case 'blacklistIp': {
      handleBlacklistPlaceholder('ip')
      return
    }
    case 'pushProvider': {
      await retryMaystro()
      return
    }
    case 'printBordereau': {
      await printBordereau()
      return
    }
    case 'editItems': {
      activeTab.value = 'items'
      await startEdit()
      return
    }
    case 'editCustomer': {
      startEditCustomer()
      activeTab.value = 'delivery'
      return
    }
    case 'delete': {
      openDelete()
      return
    }
    case 'markAttempt': {
      // Cycle to the next attempt-style call status
      const cur = String(order.value.callStatus || 'not_called')
      const next = cur === 'no_answer' ? 'attempt_1'
        : cur === 'attempt_1' ? 'attempt_2'
        : cur === 'attempt_2' ? 'attempt_3'
        : 'no_answer'
      order.value.callStatus = next
      await handleUpdateCallStatus()
      return
    }
    case 'reopen': {
      newStatus.value = 'PENDING'
      await handleStatusUpdate()
      return
    }
    default:
      return
  }
}

onMounted(() => {
  void Promise.all([
    loadEditAvailableCompanies(),
    fetchOrder()
  ])
})

watch(
  () => route.params.id,
  () => {
    void fetchOrder()
  }
)
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   Operations Cockpit — Order Detail
   3-zone layout: Compact Bar → Command Center → Tabs
   ══════════════════════════════════════════════════ */

.od-page {
  min-height: 100%;
  padding-bottom: 96px;
}
@media (min-width: 1024px) {
  .od-page { padding-bottom: 32px; }
}

.od-shell {
  max-width: 1280px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 16px;
  padding-right: 16px;
}
@media (min-width: 640px) { .od-shell { padding-left: 24px; padding-right: 24px; } }
@media (min-width: 1024px) { .od-shell { padding-left: 32px; padding-right: 32px; } }

.od-display {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* ── ZONE 1: Compact Sticky Bar ── */
.od-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--surface-1);
  border-bottom: 1px solid var(--surface-border);
  backdrop-filter: saturate(140%);
}

.od-bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.od-bar__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
}

.od-bar__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 150ms ease;
  flex-shrink: 0;
}
.od-bar__back:hover {
  color: var(--brand);
  background: var(--surface-2);
}

.od-bar__id-group {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.od-bar__id {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-feature-settings: "ss01", "lnum";
  margin: 0;
}

.od-bar__date {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.od-bar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.od-bar__locked-note {
  padding: 6px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgb(180 83 9);
  background: rgb(245 158 11 / 0.06);
  border-top: 1px solid rgb(245 158 11 / 0.15);
}
:global(.dark) .od-bar__locked-note { color: rgb(252 211 77); }

/* ── ZONE 2: Command Center ── */
.od-command {
  padding-top: 16px;
  padding-bottom: 8px;
}

/* KPI Cards */
.od-kpi-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.od-kpi {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  min-width: 0;
  flex: 1 1 120px;
  max-width: 220px;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.od-kpi:hover {
  border-color: rgb(var(--brand-rgb, 99 102 241) / 0.3);
  box-shadow: 0 2px 8px rgb(var(--brand-rgb, 99 102 241) / 0.06);
}

.od-kpi__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.od-kpi--accent .od-kpi__icon {
  background: rgb(var(--brand-rgb, 99 102 241) / 0.1);
  color: var(--brand);
}
.od-kpi--success .od-kpi__icon {
  background: rgb(16 185 129 / 0.1);
  color: rgb(5 150 105);
}
.od-kpi--warn .od-kpi__icon {
  background: rgb(245 158 11 / 0.1);
  color: rgb(180 83 9);
}
:global(.dark) .od-kpi--success .od-kpi__icon { color: rgb(110 231 183); }
:global(.dark) .od-kpi--warn .od-kpi__icon { color: rgb(252 211 77); }

.od-kpi__data {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.od-kpi__label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  color: var(--text-tertiary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.od-kpi__value {
  font-family: 'Geist Mono', 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.od-kpi--accent .od-kpi__value { color: var(--brand); }
.od-kpi--success .od-kpi__value { color: rgb(5 150 105); }
.od-kpi--warn .od-kpi__value { color: rgb(180 83 9); }
:global(.dark) .od-kpi--success .od-kpi__value { color: rgb(110 231 183); }
:global(.dark) .od-kpi--warn .od-kpi__value { color: rgb(252 211 77); }

/* Cockpit Row: Customer + Call */
.od-cockpit-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 768px) {
  .od-cockpit-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  }
}

/* Customer Card */
.od-customer-card {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.od-customer-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.od-customer-card__name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.od-customer-card__phone {
  display: flex;
  align-items: center;
  gap: 6px;
}

.od-customer-card__address,
.od-customer-card__geo {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* Call Panel Card */
.od-call-card {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--surface-border);
  background: var(--surface-1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.od-call-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}

/* Mobile actions */
.od-mobile-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

/* ── ZONE 3: Tabbed Detail Zone ── */
.od-tabs-zone {
  padding-top: 16px;
}

.od-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid var(--surface-border);
  padding: 0;
  margin-bottom: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.od-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
  border: none;
  background: none;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 150ms ease;
}
.od-tab:hover {
  color: var(--text-primary);
  background: var(--surface-2);
  border-radius: 8px 8px 0 0;
}
.od-tab--active {
  color: var(--brand);
  border-bottom-color: var(--brand);
  font-weight: 600;
}
.od-tab--active:hover {
  color: var(--brand);
  background: transparent;
}

.od-tab__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--text-secondary);
  font-size: 10px;
  font-family: 'Geist Mono', monospace;
  font-weight: 600;
}
.od-tab--active .od-tab__badge {
  background: rgb(var(--brand-rgb, 99 102 241) / 0.12);
  color: var(--brand);
}
.od-tab__badge--highlight {
  background: rgb(245 158 11 / 0.12);
  color: rgb(180 83 9);
}
:global(.dark) .od-tab__badge--highlight { color: rgb(252 211 77); }

.od-panel {
  padding-top: 16px;
  padding-bottom: 16px;
}

/* ── Section card ── */
.od-section {
  background: var(--surface-1);
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 200ms ease;
}
.od-section--editing {
  border-color: rgb(99 102 241 / 0.4);
  box-shadow: 0 0 0 3px rgb(99 102 241 / 0.06);
}

.od-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--surface-border);
  user-select: none;
}

.od-section__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}
.od-section__title :deep(svg) { color: var(--text-tertiary); }

.od-section__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--text-secondary);
  font-size: 10px;
  font-family: 'Geist Mono', monospace;
  letter-spacing: 0;
}

.od-section__body {
  padding: 18px;
}

/* ── Common elements ── */
.od-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  color: var(--text-tertiary);
  background: transparent;
  transition: all 150ms ease;
}
.od-copy:hover {
  color: var(--brand);
  background: var(--surface-2);
}

.od-tel {
  color: var(--brand);
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
}
.od-tel:hover { text-decoration: underline; }

.od-saved {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgb(5 150 105);
}
:global(.dark) .od-saved { color: rgb(110 231 183); }

.od-notes {
  width: 100%;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--surface-border);
  color: var(--text-primary);
  padding: 8px 12px;
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.od-notes:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgb(var(--brand-rgb, 99 102 241) / 0.1);
}
.od-notes:disabled { opacity: 0.6; }

.od-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-tertiary);
}

/* ── Items ── */
.od-items {
  list-style: none;
  margin: 0;
  padding: 0;
}
.od-items__row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 16px;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--surface-border);
  font-size: 14px;
}
.od-items__row:last-of-type { border-bottom: 1px dashed var(--surface-border); }
@media (max-width: 640px) {
  .od-items__row {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "product line"
      "qty     price";
    gap: 6px 16px;
  }
  .od-items__product { grid-area: product; }
  .od-items__line { grid-area: line; }
  .od-items__price { grid-area: price; }
  .od-items__qty { grid-area: qty; }
}
.od-items__title { color: var(--text-primary); font-weight: 500; }
.od-items__variant {
  color: var(--text-tertiary);
  font-size: 12px;
  margin-top: 2px;
}
.od-items__price, .od-items__qty {
  font-family: 'Geist Mono', monospace;
  color: var(--text-secondary);
  font-size: 13px;
}
.od-items__line {
  font-family: 'Geist Mono', monospace;
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;
}
.od-items__sub {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 16px 18px;
  background: var(--surface-2);
}
.od-items__sub-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: var(--text-tertiary);
}
.od-items__sub-value {
  font-size: 22px;
  color: var(--brand);
}

/* ── Editor / cart ── */
.od-input {
  width: 100%;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--surface-border);
  color: var(--text-primary);
  padding: 10px 12px;
  font-size: 14px;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.od-input--search { padding-left: 38px; }
.od-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgb(var(--brand-rgb, 99 102 241) / 0.1);
}

.od-search-results {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: var(--surface-1);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.08);
  max-height: 280px;
  overflow-y: auto;
  z-index: 30;
}
.od-search-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--surface-border);
  transition: background 120ms ease;
}
.od-search-result:hover { background: var(--surface-2); }
.od-search-result:last-child { border-bottom: 0; }

.od-cart {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.od-cart__row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--surface-2);
  border: 1px solid var(--surface-border);
  border-radius: 10px;
}
@media (max-width: 640px) {
  .od-cart__row {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "title   remove"
      "qty     price";
    gap: 8px;
  }
  .od-cart__row > div:nth-child(1) { grid-area: title; }
  .od-cart__row > .od-qty { grid-area: qty; }
  .od-cart__row > .od-cart__price { grid-area: price; }
  .od-cart__row > .od-cart__remove { grid-area: remove; align-self: start; }
}
.od-cart__variant {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.od-cart__price {
  font-family: 'Geist Mono', monospace;
  font-weight: 600;
  color: var(--text-primary);
}
.od-cart__remove {
  color: var(--text-tertiary);
  padding: 4px;
  border-radius: 6px;
  transition: all 150ms ease;
}
.od-cart__remove:hover { color: rgb(244 63 94); background: rgb(244 63 94 / 0.08); }

.od-qty {
  display: inline-flex;
  align-items: center;
  background: var(--surface-1);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 2px;
}
.od-qty__btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--text-secondary);
  transition: all 120ms ease;
}
.od-qty__btn:hover:not(:disabled) { background: var(--surface-2); color: var(--text-primary); }
.od-qty__btn:disabled { opacity: 0.4; }
.od-qty__input {
  width: 38px;
  text-align: center;
  background: transparent;
  border: none;
  font-size: 13px;
  font-family: 'Geist Mono', monospace;
  font-weight: 600;
  color: var(--text-primary);
}
.od-qty__input:focus { outline: none; }
.od-qty__input::-webkit-inner-spin-button { display: none; }

.od-cart__total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 14px 0 4px;
  border-top: 1px dashed var(--surface-border);
  margin-top: 8px;
}
.od-cart__total > :first-child {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  font-weight: 600;
}
.od-cart__total > :last-child {
  font-size: 22px;
  color: var(--brand);
}

.od-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-tertiary);
  font-size: 13px;
  border: 1px dashed var(--surface-border);
  border-radius: 10px;
}

/* ── Description list ── */
.od-dl { display: flex; flex-direction: column; gap: 0; }
.od-dl__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 0;
  border-bottom: 1px dashed var(--surface-border);
  gap: 16px;
}
.od-dl__row:last-child { border-bottom: 0; }
.od-dl__row > dt {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.od-dl__row > dd {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

/* ── Previous orders / History ── */
.od-history__match {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-tertiary);
}

.od-history {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.od-history__row {
  display: block;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--surface-border);
  background: var(--surface-2);
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}
.od-history__row:hover {
  border-color: rgb(var(--brand-rgb, 99 102 241) / 0.42);
  background: rgb(var(--brand-rgb, 99 102 241) / 0.05);
  transform: translateY(-1px);
}

.od-history__top,
.od-history__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.od-history__id {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}

.od-history__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.od-history__items {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-secondary);
}

.od-history__foot {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--surface-border);
  font-size: 11px;
  color: var(--text-tertiary);
}
.od-history__foot strong {
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
}

.od-history__empty {
  min-height: 86px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 10px;
  border: 1px dashed var(--surface-border);
  background: var(--surface-2);
  color: var(--text-tertiary);
  text-align: center;
  font-size: 12px;
  line-height: 1.4;
}

/* ── Alerts ── */
.od-alert {
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  border: 1px solid;
}
.od-alert--error {
  background: rgb(244 63 94 / 0.06);
  border-color: rgb(244 63 94 / 0.25);
  color: rgb(190 18 60);
}
.od-alert--success {
  background: rgb(16 185 129 / 0.06);
  border-color: rgb(16 185 129 / 0.25);
  color: rgb(5 150 105);
}
:global(.dark) .od-alert--error { color: rgb(253 164 175); }
:global(.dark) .od-alert--success { color: rgb(110 231 183); }

/* ── Mobile bottom action bar ── */
.od-mobile-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  background: var(--surface-1);
  border-top: 1px solid var(--surface-border);
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 24px rgb(0 0 0 / 0.06);
}

/* ── Transitions ── */
.od-fade-enter-active, .od-fade-leave-active { transition: opacity 200ms ease; }
.od-fade-enter-from, .od-fade-leave-to { opacity: 0; }

/* ── RTL ── */
[dir="rtl"] .od-items__line { text-align: left; }
[dir="rtl"] .od-dl__row > dd { text-align: left; justify-content: flex-start; }

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
</style>
