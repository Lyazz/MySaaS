<template>
  <div class="max-w-5xl mx-auto">
    <AdminConfirmModal
      v-model="deleteOpen"
      :title="t('admin.confirmModal.defaults.title', 'Are you sure?')"
      :message="t('admin.pages.orders.detail.deleteConfirm', 'Delete this order? Only unconfirmed (PENDING) orders can be deleted.')"
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
              <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle
                  as="h3"
                  class="text-lg font-bold leading-6 text-slate-900 flex justify-between items-center"
                >
                  {{ selectedProductForVariant?.title || t('admin.pages.orders.detail.variantSelect', 'Select Variant') }}
                  <button
                    class="p-1 rounded-full hover:bg-slate-100 text-slate-400"
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
                    class="py-8 text-center text-slate-500"
                  >
                    {{ t('admin.common.loading', 'Loading...') }}
                  </div>
                  <button
                    v-for="v in availableVariantsForSelection"
                    :key="v.id"
                    type="button"
                    class="w-full p-4 rounded-xl border border-slate-100 hover:border-teal-500 hover:bg-teal-50 hover:ring-1 hover:ring-teal-500 transition-all flex justify-between items-center group"
                    @click="onVariantSelected(v)"
                  >
                    <div class="text-left">
                      <div class="font-semibold text-slate-900 group-hover:text-teal-800">
                        {{ v.label }}
                      </div>
                      <div class="text-xs text-slate-500 mt-0.5">
                        {{ v.availableStock }} {{ t('admin.pages.orders.create.inStock', 'in stock') }}
                      </div>
                    </div>
                    <div class="font-bold text-teal-600">
                      {{ formatCurrency(v.price) }}
                    </div>
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Breadcrumb -->
    <nav
      class="flex mb-6"
      aria-label="Breadcrumb"
    >
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink
            to="/admin/orders"
            class="text-gray-700 hover:text-teal-600"
          >
            {{ t('admin.nav.orders') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">{{ t('admin.pages.orders.detail.breadcrumb', { id: orderId.substring(0, 8) }) }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      <p class="mt-2 text-gray-600">
        {{ t('admin.pages.orders.detail.loading') }}
      </p>
    </div>

    <!-- Order Detail -->
    <div
      v-else-if="order"
      class="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      <!-- LEFT COLUMN -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Order Info Card -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ t('admin.pages.orders.detail.sections.orderInfo') }}
            </h2>
            <div class="flex items-center gap-3">
              <button
                v-if="order.status === 'PENDING'"
                type="button"
                class="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100"
                @click="editing ? cancelEdit() : startEdit()"
              >
                <Icon :name="editing ? 'lucide:x' : 'lucide:pencil'" class="w-4 h-4 mr-2" />
                {{ editing ? t('common.cancel', 'Cancel') : t('common.edit', 'Edit') }}
              </button>
              <button
                v-if="order.status === 'PENDING'"
                type="button"
                class="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="editing"
                @click="openDelete"
              >
                <Icon name="lucide:trash-2" class="w-4 h-4 mr-2" />
                {{ t('common.delete', 'Delete') }}
              </button>
              <NuxtLink
                v-if="order.status === 'DELIVERED'"
                :to="`/admin/sales/${order.id}`"
                class="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100"
              >
                <Icon name="lucide:badge-dollar-sign" class="w-4 h-4 mr-2" />
                {{ t('admin.pages.orders.detail.viewSale') }}
              </NuxtLink>
              <button
                v-if="canPrintBordereau"
                type="button"
                class="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100"
                @click="printBordereau"
              >
                <Icon name="lucide:printer" class="w-4 h-4 mr-2" />
                {{ t('admin.pages.orders.detail.printBordereau', 'Print bordereau') }}
              </button>
              <AdminOrderStatusBadge :status="order.status" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-500">
                {{ t('admin.pages.orders.detail.fields.orderId') }}
              </p>
              <div class="mt-1 flex items-center">
                <p class="text-sm text-gray-900 mr-2">{{ order.id }}</p>
                <button @click="copyToClipboard(order.id)" class="text-gray-400 hover:text-teal-600 transition-colors" title="Copy ID">
                  <Icon name="lucide:copy" class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">
                {{ t('admin.pages.orders.detail.fields.orderDate') }}
              </p>
              <p class="mt-1 text-sm text-gray-900">
                {{ formatDate(order.createdAt) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Order Items -->
        <div class="ui-card p-6">
          <div class="flex items-center justify-between gap-3 mb-4">
            <h2 class="text-lg font-semibold text-slate-900">
              {{ t('admin.pages.orders.detail.sections.orderItems') }}
            </h2>
            <div v-if="editing" class="flex items-center gap-2">
              <button
                type="button"
                class="px-3 py-1.5 rounded-md text-sm font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100"
                :disabled="editSaving"
                @click="cancelEdit"
              >
                {{ t('common.cancel', 'Cancel') }}
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-md text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                :disabled="editSaving || cartItems.length === 0"
                @click="saveEdit"
              >
                <span v-if="editSaving" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {{ t('common.save', 'Save') }}
              </button>
            </div>
          </div>

          <div v-if="editing" class="space-y-4">
            <div class="relative">
              <Icon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                v-model="productSearch"
                type="text"
                :placeholder="t('admin.pages.pos.catalog.searchPlaceholder', 'Search products…')"
                class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-sm"
              >

              <div
                v-if="productSearch.trim().length > 0"
                class="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-50 max-h-64 overflow-y-auto"
              >
                <div
                  v-for="product in searchedProducts"
                  :key="product.id"
                  class="p-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer flex items-center gap-3"
                  @click="addProductToCart(product)"
                >
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm text-slate-800 truncate">{{ product.title }}</div>
                    <div class="text-xs text-slate-500">{{ formatCurrency(product.price) }}</div>
                  </div>
                  <Icon name="lucide:plus" class="w-4 h-4 text-slate-400" />
                </div>
                <div v-if="searchedProducts.length === 0" class="p-4 text-center text-sm text-slate-500">
                  {{ t('admin.pages.pos.catalog.noProducts', 'No products found') }}
                </div>
              </div>
            </div>

            <div
              v-if="editErrorMessage"
              class="p-3 bg-red-50 border border-red-200 rounded-md"
            >
              <p class="text-sm text-red-800">
                {{ editErrorMessage }}
              </p>
            </div>

            <div class="space-y-3">
              <div
                v-if="cartItems.length === 0"
                class="text-center text-sm text-slate-500 py-10"
              >
                {{ t('admin.pages.orders.create.emptyCart', 'No items yet') }}
              </div>

              <div
                v-for="(item, index) in cartItems"
                :key="`${item.productId}:${item.variantId || 'default'}:${index}`"
                class="bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-2"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-slate-800 line-clamp-2 leading-tight">
                      {{ item.title }}
                    </div>
                    <div v-if="item.variantLabel" class="text-xs text-slate-500 mt-0.5">
                      {{ item.variantLabel }}
                    </div>
                  </div>
                  <button
                    type="button"
                    class="text-slate-400 hover:text-red-500 p-1 -m-1 transition-colors"
                    @click="removeCartItem(index)"
                    :title="t('common.delete', 'Delete')"
                  >
                    <Icon name="lucide:x" class="w-4 h-4" />
                  </button>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div class="font-semibold text-slate-700">
                    {{ formatCurrency(item.price * item.quantity) }}
                  </div>

                  <div class="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-sm">
                    <button
                      type="button"
                      class="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm disabled:opacity-50 transition-all"
                      @click="item.quantity--"
                      :disabled="item.quantity <= 1"
                    >
                      <Icon name="lucide:minus" class="w-3 h-3" />
                    </button>
                    <input
                      v-model.number="item.quantity"
                      type="number"
                      min="1"
                      class="w-12 text-center text-sm font-semibold text-slate-700 bg-transparent focus:outline-none"
                    >
                    <button
                      type="button"
                      class="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm transition-all"
                      @click="item.quantity++"
                    >
                      <Icon name="lucide:plus" class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-slate-100">
              <div class="text-sm text-slate-500">
                {{ t('admin.common.total', 'Total') }}
              </div>
              <div class="text-lg font-bold text-teal-700">
                {{ formatCurrency(cartTotal) }}
              </div>
            </div>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="ui-table">
              <thead class="ui-thead">
                <tr>
                  <th class="ui-th">
                    {{ t('admin.pages.orders.detail.itemsTable.product') }}
                  </th>
                  <th class="ui-th">
                    {{ t('admin.pages.orders.detail.itemsTable.price') }}
                  </th>
                  <th class="ui-th">
                    {{ t('admin.pages.orders.detail.itemsTable.quantity') }}
                  </th>
                  <th class="ui-th text-right">
                    {{ t('admin.pages.orders.detail.itemsTable.subtotal') }}
                  </th>
                </tr>
              </thead>
              <tbody class="ui-tbody">
                <tr
                  v-for="item in order.items"
                  :key="item.id"
                  class="ui-tr"
                >
                  <td class="ui-td text-sm text-slate-900">
                    <div class="font-medium">
                      {{ item.product?.title || t('admin.pages.orders.detail.itemsTable.fallbackProduct', 'Product') }}
                    </div>
                    <div v-if="variantLabelFromOrderItem(item)" class="text-xs text-slate-500 mt-0.5">
                      {{ variantLabelFromOrderItem(item) }}
                    </div>
                  </td>
                  <td class="ui-td text-sm text-slate-900">
                    {{ formatCurrency(item.price) }}
                  </td>
                  <td class="ui-td text-sm text-slate-900">
                    {{ item.quantity }}
                  </td>
                  <td class="ui-td text-sm text-slate-900 text-right">
                    {{ formatCurrency(item.lineTotal ?? (Number(item.price) * item.quantity)) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colspan="3"
                    class="px-4 py-3 text-sm font-semibold text-gray-900 text-right"
                  >
                    {{ t('admin.pages.orders.detail.itemsTable.total') }}
                  </td>
                  <td class="px-4 py-3 text-sm font-semibold text-teal-600 text-right">
                    {{ formatCurrency(order.totalAmount) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Internal Notes (New) -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            {{ t('admin.pages.orders.detail.sections.internalNotes', 'Internal Notes') }}
          </h2>
          <div class="space-y-3">
            <textarea
              v-model="order.internalNotes"
              rows="4"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
              :disabled="editing"
              :placeholder="t('admin.pages.orders.detail.fields.internalNotesPlaceholder', 'Add private remarks about this order...')"
              @blur="handleUpdateInternalNotes"
            ></textarea>
            <div class="flex justify-end h-5 items-center">
              <span v-if="savingNotes" class="text-xs text-gray-500 flex items-center">
                <div class="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-teal-600 mr-1" />
                {{ t('admin.common.saving', 'Saving...') }}
              </span>
              <span v-else-if="notesSavedMessage" class="text-xs text-green-600 flex items-center">
                <Icon name="lucide:check" class="w-3 h-3 mr-1" />
                {{ notesSavedMessage }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN -->
      <div class="space-y-6">
        <!-- Status Update -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            {{ t('admin.pages.orders.detail.statusUpdate.title') }}
          </h2>
          <div
            v-if="statusLocked"
            class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            {{ t('admin.pages.orders.detail.statusUpdate.lockedByCarrier', 'Status is controlled by the delivery carrier. You cannot change it manually.') }}
          </div>
          <form
            class="space-y-4"
            @submit.prevent="handleStatusUpdate"
          >
            <div>
              <label
                for="status"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                {{ t('admin.pages.orders.detail.statusUpdate.statusLabel') }}
              </label>
              <BaseSelect
                id="status"
                v-model="newStatus"
                :disabled="editing || statusLocked || order.status === 'DELIVERED'"
              >
                <option
                  v-for="s in selectableStatuses"
                  :key="s"
                  :value="s"
                >
                  {{ orderStatusLabel(s) }}
                </option>
              </BaseSelect>
            </div>

            <div
              v-if="errorMessage"
              class="p-3 bg-red-50 border border-red-200 rounded-md"
            >
              <p class="text-sm text-red-800">
                {{ errorMessage }}
              </p>
            </div>

            <div
              v-if="successMessage"
              class="p-3 bg-green-50 border border-green-200 rounded-md"
            >
              <p class="text-sm text-green-800">
                {{ successMessage }}
              </p>
            </div>

            <div class="flex justify-end space-x-3 pt-2">
              <button
                type="submit"
                :disabled="editing || statusLocked || updating || newStatus === order.status || order.status === 'DELIVERED'"
                class="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
              >
                {{ updating ? t('admin.common.updating') : t('admin.pages.orders.detail.statusUpdate.submit') }}
              </button>
            </div>
          </form>
        </div>

        <!-- Delivery Info -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            {{ t('admin.pages.orders.detail.sections.deliveryInfo', 'Delivery') }}
          </h2>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">{{ t('admin.pages.orders.detail.fields.deliveryCompany', 'Company') }}</span>
              <span class="text-gray-900 font-medium">{{ order.shippingProvider || order.shipments?.[0]?.provider || '—' }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">{{ t('admin.pages.orders.detail.fields.deliveryMode', 'Type') }}</span>
              <span class="text-gray-900 font-medium">{{ deliveryModeLabel(order.deliveryMode) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">{{ t('admin.pages.orders.detail.fields.shippingFee', 'Shipping') }}</span>
              <span class="text-gray-900 font-medium">
                {{ order.shippingAmount != null ? formatCurrency(Number(order.shippingAmount)) : '—' }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-500">{{ t('admin.pages.orders.detail.fields.totalWithDelivery', 'Total (with delivery)') }}</span>
              <span class="text-gray-900 font-semibold">{{ formatCurrency(orderTotalWithShipping) }}</span>
            </div>
            <div v-if="order.shippingPickupPoint" class="flex items-center justify-between gap-3">
              <span class="text-gray-500">{{ t('admin.pages.orders.detail.fields.pickupPoint', 'Stop desk') }}</span>
              <span class="text-gray-900 font-medium">{{ order.shippingPickupPoint }}</span>
            </div>
            <div v-if="order.shippingWilayaCode || order.shippingCommuneCode" class="flex items-center justify-between gap-3">
              <span class="text-gray-500">{{ t('admin.pages.orders.detail.fields.wilayaCommune', 'Wilaya/Commune') }}</span>
              <span class="text-gray-900 font-medium">{{ [order.shippingWilayaCode, order.shippingCommuneCode].filter(Boolean).join(' / ') }}</span>
            </div>
          </div>
          <div class="mt-4">
            <button
              v-if="canPrintBordereau"
              type="button"
              class="ui-btn ui-btn--secondary ui-btn--md w-full flex items-center justify-center gap-2"
              @click="printBordereau"
            >
              <Icon name="lucide:printer" class="w-4 h-4" />
              {{ t('admin.pages.orders.detail.printBordereau', 'Print bordereau') }}
            </button>
          </div>
        </div>

        <!-- Customer Info Card -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            {{ t('admin.pages.orders.detail.sections.customerInfo') }}
          </h2>
          <div v-if="editing" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.orders.detail.fields.customerName', 'Customer Name') }}
              </label>
              <BaseInput v-model="editCustomerName" type="text" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.orders.detail.fields.customerPhone', 'Customer Phone') }}
              </label>
              <BaseInput v-model="editCustomerPhone" type="tel" dir="ltr" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('admin.pages.orders.detail.fields.deliveryAddress', 'Address') }}
              </label>
              <BaseInput v-model="editCustomerAddress" type="text" />
            </div>
            <p class="text-xs text-slate-500">
              {{ t('admin.pages.orders.detail.editHint', 'Save from the items section to apply changes.') }}
            </p>
          </div>

          <div v-else class="space-y-3">
            <div>
              <p class="text-sm font-medium text-gray-500">
                {{ t('admin.pages.orders.detail.fields.customerName') }}
              </p>
              <p class="mt-1 text-sm text-gray-900">
                {{ order.customerName }}
              </p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">
                {{ t('admin.pages.orders.detail.fields.customerPhone') }}
              </p>
              <div class="mt-1 flex items-center">
                <a
                  :href="`tel:${order.customerPhone}`"
                  class="text-teal-600 hover:text-teal-800 text-sm mr-2"
                >
                  {{ order.customerPhone }}
                </a>
                <button @click="copyToClipboard(order.customerPhone)" class="text-gray-400 hover:text-teal-600 transition-colors" title="Copy Phone">
                  <Icon name="lucide:copy" class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">
                {{ t('admin.pages.orders.detail.fields.deliveryAddress') }}
              </p>
              <div class="mt-1 flex items-start">
                <p class="text-sm text-gray-900 mr-2 flex-1">
                  {{ order.customerAddress || 'N/A' }}
                </p>
                <button v-if="order.customerAddress" @click="copyToClipboard(order.customerAddress)" class="text-gray-400 hover:text-teal-600 transition-colors mt-0.5" title="Copy Address">
                  <Icon name="lucide:copy" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Contact Trace Toggle -->
          <div class="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span class="text-sm font-medium text-gray-700">{{ t('admin.pages.orders.detail.fields.callStatus', 'Call Status') }}</span>
            <div class="w-48">
              <BaseSelect
                v-model="order.callStatus"
                :disabled="editing"
                @change="handleUpdateCallStatus"
              >
                <option value="not_called">{{ t('admin.pages.orders.detail.fields.callStatusValues.not_called', 'Not Called') }}</option>
                <option value="called">{{ t('admin.pages.orders.detail.fields.callStatusValues.called', 'Called') }}</option>
                <option value="no_answer">{{ t('admin.pages.orders.detail.fields.callStatusValues.no_answer', 'No Answer') }}</option>
                <option value="attempt_1">{{ t('admin.pages.orders.detail.fields.callStatusValues.attempt_1', '1st Attempt') }}</option>
                <option value="attempt_2">{{ t('admin.pages.orders.detail.fields.callStatusValues.attempt_2', '2nd Attempt') }}</option>
                <option value="attempt_3">{{ t('admin.pages.orders.detail.fields.callStatusValues.attempt_3', '3rd Attempt') }}</option>
                <option value="switched_off">{{ t('admin.pages.orders.detail.fields.callStatusValues.switched_off', 'Switched Off') }}</option>
              </BaseSelect>
            </div>
            <div class="flex justify-end h-5 ml-2 items-center min-w-[3rem]">
              <span v-if="savingCallStatus" class="text-xs text-gray-500 flex items-center">
                <div class="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-teal-600 mr-1" />
              </span>
              <span v-else-if="callStatusSavedMessage" class="text-xs text-green-600 flex items-center">
                <Icon name="lucide:check" class="w-3 h-3 mr-1" />
              </span>
            </div>
          </div>
        </div>

        <!-- Security & Fraud Placeholders -->
        <div class="bg-white rounded-lg shadow p-6 border border-red-50">
          <div class="flex items-center gap-2 mb-4">
            <Icon name="lucide:shield-alert" class="w-5 h-5 text-red-500" />
            <h2 class="text-lg font-semibold text-gray-900">
              {{ t('admin.pages.orders.detail.sections.securityAndFraud', 'Security & Fraud') }}
            </h2>
          </div>
          <p class="text-xs text-gray-500 mb-3">{{ t('admin.pages.orders.detail.securityHelp', 'Advanced actions to manage risky behavior.') }}</p>
          <div class="space-y-2">
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-100 transition-colors"
              @click="handleBlacklistPlaceholder('customer')"
            >
              <Icon name="lucide:user-x" class="w-4 h-4 inline mr-2 text-red-500" />
              {{ t('admin.pages.orders.detail.actions.blacklistCustomer', 'Blacklist Customer') }}
            </button>
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-100 transition-colors"
              @click="handleBlacklistPlaceholder('ip')"
            >
              <Icon name="lucide:globe-lock" class="w-4 h-4 inline mr-2 text-red-500" />
              {{ t('admin.pages.orders.detail.actions.blacklistIp', 'Blacklist IP Address') }}
            </button>
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-100 transition-colors"
              @click="handleBlacklistPlaceholder('phone')"
            >
              <Icon name="lucide:phone-off" class="w-4 h-4 inline mr-2 text-red-500" />
              {{ t('admin.pages.orders.detail.actions.blacklistPhone', 'Blacklist Phone Number') }}
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Error State -->
    <div
      v-else
      class="bg-white rounded-lg shadow p-12 text-center"
    >
      <Icon name="lucide:alert-circle" class="mx-auto h-12 w-12 text-red-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">
        {{ t('admin.pages.orders.detail.notFound.title') }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ t('admin.pages.orders.detail.notFound.hint') }}
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/admin/orders"
          class="text-teal-600 hover:text-teal-800"
        >
          {{ t('admin.pages.orders.detail.backToOrders') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import DeliveryPaymentModal from '~/components/cash/DeliveryPaymentModal.vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.orders.detail.metaTitle'
})

const authStore = useAuthStore()
const storeSettings = useState<any>('storeSettings')
const { format: formatCurrency } = useCurrency()
const route = useRoute()
const router = useRouter()
const orderId = route.params.id as string
const { t, locale } = useI18n({ useScope: 'global' })

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

	interface Order {
	  id: string
	  customerName: string
	  customerPhone: string
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
const cashboxes = ref<any[]>([])

const deleteOpen = ref(false)
const deleteError = ref<string | null>(null)

const savingNotes = ref(false)
const notesSavedMessage = ref('')

const savingCallStatus = ref(false)
const callStatusSavedMessage = ref('')

const editing = ref(false)
const editSaving = ref(false)
const editErrorMessage = ref('')

const products = ref<any[]>([])
const productSearch = ref('')
const cartItems = ref<CartItem[]>([])

const editCustomerName = ref('')
const editCustomerPhone = ref('')
const editCustomerAddress = ref('')

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

	const statusLocked = computed(() => {
	  const o = order.value
	  if (!o) return false
	  const hasCarrier = Boolean(o.shippingProvider) || Boolean(o.shipments && o.shipments.length)
	  return hasCarrier && o.status !== 'PENDING'
	})

	const canPrintBordereau = computed(() => {
	  const o = order.value
	  if (!o) return false
	  return Boolean(o.shippingProvider) || Boolean(o.shipments && o.shipments.length)
	})

	function deliveryModeLabel(mode: any) {
	  const raw = typeof mode === 'string' ? mode.trim().toLowerCase() : ''
	  if (raw === 'store') return t('admin.pages.orders.index.deliveryModes.store', 'Store pickup')
	  if (raw === 'pickup' || raw === 'desk' || raw === 'office') return t('admin.pages.orders.index.deliveryModes.pickup', 'Stop desk')
	  return t('admin.pages.orders.index.deliveryModes.home', 'Home delivery')
	}

	async function printBordereau() {
	  if (!order.value) return
	  errorMessage.value = ''
	  try {
	    const blob = await $fetch<Blob>(`/api/admin/orders/${encodeURIComponent(orderId)}/bordereau`, {
	      headers: { Authorization: `Bearer ${authStore.token}` },
	      responseType: 'blob' as any
	    })
	    const url = URL.createObjectURL(blob)
	    window.open(url, '_blank', 'noopener,noreferrer')
	    setTimeout(() => URL.revokeObjectURL(url), 60_000)
	  } catch (e: any) {
	    console.error('Failed to print bordereau', e)
	    errorMessage.value = e?.data?.statusMessage || t('common.error', 'An error occurred. Please try again.')
	  }
	}

function variantLabelFromOrderItem(item: OrderItem): string | undefined {
  const labels =
    item.variant?.optionValues
      ?.map((ov) => ov?.optionValue?.label)
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0) ?? []
  if (labels.length === 0) return undefined
  return labels.join(' / ')
}

const searchedProducts = computed(() => {
  if (!productSearch.value.trim()) return []
  const q = productSearch.value.toLowerCase()
  return products.value
    .filter((p: any) => (p?.title || '').toLowerCase().includes(q) || (p?.sku || '').toLowerCase().includes(q))
    .slice(0, 6)
})

const cartTotal = computed(() => {
  return cartItems.value.reduce((total, item) => total + item.price * item.quantity, 0)
})

async function fetchOrder() {
  loading.value = true
  try {
    const data = await $fetch(`/api/admin/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    order.value = data
    newStatus.value = data.status
    editing.value = false
    editErrorMessage.value = ''
  } catch (error: any) {
    console.error('Failed to fetch order:', error)
    order.value = null
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
  if (order.value.status !== 'PENDING') return

  deleteError.value = null
  try {
    await $fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
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

  cartItems.value = (order.value.items || []).map((i) => ({
    productId: i.productId,
    variantId: i.variantId || undefined,
    title: i.product?.title || t('admin.pages.orders.detail.itemsTable.fallbackProduct', 'Product'),
    variantLabel: variantLabelFromOrderItem(i),
    price: Number(i.price || 0),
    quantity: Number(i.quantity || 1)
  }))

  await ensureProductsLoaded()
}

function cancelEdit() {
  editing.value = false
  editErrorMessage.value = ''
  productSearch.value = ''
  variantModalOpen.value = false
}

async function addProductToCart(product: any) {
  productSearch.value = ''

  if (product?.options && product.options.length > 0) {
    selectedProductForVariant.value = product
    variantModalOpen.value = true
    loadingVariants.value = true
    availableVariantsForSelection.value = []
    try {
      const response = await $fetch(`/api/admin/products/${product.id}`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }) as any

      availableVariantsForSelection.value = (response.variants || []).map((v: any) => {
        const label = v.optionValues
          ? v.optionValues.map((ov: any) => ov.optionValue?.label).join(' / ')
          : 'Default'
        return {
          ...v,
          label,
          availableStock: v.stock - (v.reserved || 0)
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
    existing.quantity++
    return
  }

  cartItems.value.push({
    productId: product.id,
    title: product.title,
    price: Number(product.price || 0),
    quantity: 1
  })
}

function onVariantSelected(variant: any) {
  const product = selectedProductForVariant.value
  if (!product) return

  const existing = cartItems.value.find((i) => i.productId === product.id && i.variantId === variant.id)
  if (existing) {
    existing.quantity++
  } else {
    cartItems.value.push({
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      variantLabel: variant.label,
      price: Number(variant.price || 0),
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

  editErrorMessage.value = ''
  editSaving.value = true

  try {
    const payload = {
      customerName: editCustomerName.value,
      customerPhone: editCustomerPhone.value,
      customerAddress: editCustomerAddress.value,
      shippingAddressLine1: editCustomerAddress.value,
      items: cartItems.value.map((i) => ({
        productId: i.productId,
        variantId: i.variantId || null,
        quantity: i.quantity
      }))
    }

    const updated = await $fetch(`/api/admin/orders/${orderId}`, {
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
    const updated = await $fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        status: newStatus.value
      }
    })

    order.value.status = updated.status
    successMessage.value = t('admin.pages.orders.detail.statusUpdate.success')
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
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
    const updated = await $fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        status: 'DELIVERED',
        cashboxId: payload.cashboxId,
        method: payload.method,
        reference: payload.reference,
        note: payload.note
      }
    })

    order.value.status = updated.status
    newStatus.value = updated.status
    successMessage.value = t('admin.pages.orders.detail.statusUpdate.success')
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    console.error('Failed to mark delivered:', error)
    errorMessage.value = error.data?.statusMessage || t('admin.pages.orders.detail.statusUpdate.errors.updateFailed')
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
    const updated = await $fetch(`/api/admin/orders/${orderId}`, {
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
    const updated = await $fetch(`/api/admin/orders/${orderId}`, {
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
  // Just show an alert acting as a placeholder
  alert(`This is a placeholder for ${type} blacklisting. Feature coming soon!`)
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    // Optional: add a quick toast or alert, or it's implicitly successful
  } catch (err) {
    console.error('Failed to copy text: ', err)
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

onMounted(() => {
  fetchOrder()
})
</script>
