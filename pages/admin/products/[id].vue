<template>
  <div class="max-w-7xl mx-auto">
    <!-- Breadcrumb -->
    <nav
      class="flex mb-6"
      aria-label="Breadcrumb"
    >
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink
            to="/admin/products"
            class="hover:[color:var(--brand)]" style="color: var(--text-secondary)"
          >
            {{ t('admin.nav.products') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6" style="color: var(--text-tertiary)" />
            <span class="ml-1" style="color: var(--text-tertiary)">
              <span v-if="isNewProduct">{{ t('admin.pages.products.create.title', 'Créer un produit') }}</span>
              <span v-else>{{ t('admin.pages.products.edit.breadcrumbEdit', { title: form.title || t('admin.pages.products.edit.fallbackTitle') }) }}</span>
            </span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="ui-card p-12 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 [border-color:var(--brand)]" />
      <p class="mt-2" style="color: var(--text-secondary)">
        {{ t('admin.pages.products.edit.loading') }}
      </p>
    </div>

    <!-- Form -->
    <div v-else>
      <!-- Header -->
      <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold" style="color: var(--text-primary)">
            <template v-if="isNewProduct">{{ t('admin.pages.products.create.title', 'Créer un produit') }}</template>
            <template v-else>{{ t('admin.pages.products.edit.title') }}</template>
          </h2>
          <p class="mt-1" style="color: var(--text-secondary)">
            <template v-if="isNewProduct">{{ t('admin.pages.products.create.subtitle', 'Configurez les détails de votre nouveau produit') }}</template>
            <template v-else>{{ t('admin.pages.products.edit.subtitle') }}</template>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Public Links -->
          <div class="flex items-center space-x-2 p-1.5 rounded-lg" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
            <span class="text-xs font-medium px-2" style="color: var(--text-tertiary)">{{ t('admin.pages.products.edit.links.label') }}:</span>

            <!-- Product Page -->
            <div class="flex items-center space-x-1 pr-2" style="border-right: 1px solid var(--surface-border)">
              <span class="text-xs" style="color: var(--text-tertiary)">{{ t('admin.pages.products.edit.links.product') }}</span>
              <a
                :href="productUrl"
                target="_blank"
                class="p-1 [color:var(--brand)] hover:[background:rgba(var(--brand-rgb)/0.08)] rounded"
                :title="t('admin.pages.products.edit.links.openProduct')"
              >
                <Icon name="lucide:external-link" class="w-4 h-4" />
              </a>
              <button
                class="p-1 rounded" style="color: var(--text-tertiary)"
                :title="t('admin.pages.products.edit.links.copyProduct')"
                @click="copyUrl(productUrl)"
              >
                <Icon name="lucide:copy" class="w-4 h-4" />
              </button>
            </div>

            <!-- Landing Page -->
            <div class="flex items-center space-x-1 pl-1">
              <span class="text-xs" style="color: var(--text-tertiary)">{{ t('admin.pages.products.edit.links.landing') }}</span>
              <a
                :href="landingUrl"
                target="_blank"
                class="p-1 [color:var(--brand)] hover:[background:rgba(var(--brand-rgb)/0.08)] rounded"
                :title="t('admin.pages.products.edit.links.openLanding')"
              >
                <Icon name="lucide:external-link" class="w-4 h-4" />
              </a>
              <button
                class="p-1 rounded" style="color: var(--text-tertiary)"
                :title="t('admin.pages.products.edit.links.copyLanding')"
                @click="copyUrl(landingUrl)"
              >
                <Icon name="lucide:copy" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <NuxtLink
            to="/admin/products"
            class="px-4 py-2 rounded-md text-sm font-medium" style="border: 1px solid var(--surface-border); color: var(--text-secondary)"
          >
            {{ t('admin.common.cancel') }}
          </NuxtLink>
          <button
            :disabled="submitting"
            class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleSubmit"
          >
            {{ submitting ? t('admin.common.updating') : t('admin.pages.products.edit.submit') }}
          </button>
        </div>
      </div>

      <form
        class="ui-card overflow-hidden"
        @submit.prevent="handleSubmit"
      >
        <!-- Tabs Navigation -->
        <div class="overflow-x-auto custom-scrollbar" style="border-bottom: 1px solid var(--surface-border)">
          <nav
            class="flex -mb-px"
            aria-label="Tabs"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors duration-200"
              :class="[
                currentTab === tab.id
                  ? '[border-color:var(--brand)] [color:var(--brand)]'
                  : 'border-transparent hover:border-white/20 text-[var(--text-tertiary)]'
              ]"
              @click="currentTab = tab.id"
            >
              {{ tab.name }}
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- General Tab -->
          <div
            v-show="currentTab === 'general'"
            class="space-y-6"
          >
            <!-- Active Status -->
            <div
              class="flex items-center justify-between rounded-xl border px-4 py-3"
              style="border-color: var(--surface-border); background: var(--surface-2)"
            >
              <div>
                <p class="text-sm font-medium" style="color: var(--text-primary)">
                  {{ t('admin.forms.product.isActive.label') }}
                </p>
                <p class="text-xs" style="color: var(--text-secondary)">
                  {{ form.isActive ? t('admin.common.active') : t('admin.common.inactive') }}
                </p>
              </div>
              <BaseToggle
                v-model="form.isActive"
                :sr-label="t('admin.forms.product.isActive.label')"
              />
            </div>

            <!-- Title -->
            <!-- Title -->
            <BaseInput
              v-model="form.title"
              :label="t('admin.forms.product.title.label')"
              :error="errors.title"
              :placeholder="t('admin.forms.product.title.placeholder')"
              required
            />

            <!-- Slug -->
            <!-- Slug -->
            <BaseInput
              v-model="form.slug"
              :label="t('admin.forms.product.slug.label')"
              :error="errors.slug"
              :placeholder="t('admin.forms.product.slug.placeholder')"
              :hint="t('admin.forms.product.slug.hintEdit')"
              @change="handleSlugChange"
              @blur="handleSlugChange"
              required
            />

            <!-- Mini Description -->
            <AdminFormField
              :label="t('admin.forms.product.miniDescription.label')"
              :error="errors.miniDescription"
              :hint="t('admin.forms.product.miniDescription.hint')"
            >
              <template #default="{ inputId }">
                <textarea
                  :id="inputId"
                  v-model="form.miniDescription"
                  rows="3"
                  class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:[--tw-ring-color:var(--brand)]" style="border: 1px solid var(--surface-border); background: var(--surface-1); color: var(--text-primary)"
                  :placeholder="t('admin.forms.product.miniDescription.placeholder')"
                />
              </template>
            </AdminFormField>

            <!-- Search Keywords -->
            <div class="space-y-1">
              <label class="block text-sm font-medium" style="color: var(--text-primary)">
                {{ t('admin.forms.product.searchKeywords.label', 'Mots-clés de recherche') }}
              </label>
              <div class="flex flex-wrap items-center gap-2 p-2 rounded-md focus-within:ring-2 focus-within:[--tw-ring-color:var(--brand)]" style="border: 1px solid var(--surface-border); background: var(--surface-1);">
                <span
                  v-for="(keyword, index) in keywordList"
                  :key="index"
                  class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md" style="background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary);"
                >
                  {{ keyword }}
                  <button type="button" class="hover:text-red-500 transition-colors" @click="removeKeyword(index)">
                    <Icon name="lucide:x" class="w-3 h-3" />
                  </button>
                </span>
                <input
                  v-model="newKeyword"
                  type="text"
                  :placeholder="t('admin.forms.product.searchKeywords.placeholder', 'Tapez et appuyez sur Entrée...')"
                  class="flex-1 min-w-[120px] bg-transparent outline-none text-sm" style="color: var(--text-primary)"
                  @keydown.enter.prevent="addKeyword"
                >
              </div>
              <p class="text-xs mt-1" style="color: var(--text-tertiary)">
                {{ t('admin.forms.product.searchKeywords.hint', 'Mots-clés pour aider les clients à trouver ce produit dans la recherche de la boutique.') }}
              </p>
            </div>

            <div
              class="rounded-2xl border p-4 space-y-2"
              style="border-color: var(--surface-border); background: var(--surface-2)"
            >
              <p class="text-sm font-semibold" style="color: var(--text-primary)">
                {{ t('admin.pages.products.edit.generalTab.variantPricingTitle', 'Selling price is managed from Variants') }}
              </p>
              <p class="text-sm" style="color: var(--text-secondary)">
                {{ t('admin.pages.products.edit.generalTab.variantPricingMessage', 'Set the selling price for this product in the Variants tab. Simple products use their default variant, and optioned products use each selectable variant.') }}
              </p>
            </div>

            <!-- Stock -->
            <BaseInput
              v-model.number="form.stock"
              :label="t('admin.forms.product.stock.label')"
              :error="errors.stock"
              type="number"
              min="0"
              required
              :placeholder="t('admin.forms.product.stock.placeholder')"
              disabled
              :hint="t('admin.forms.product.stock.hintSystemManaged')"
            />

            <!-- Low Stock Threshold -->
            <BaseInput
              v-model.number="form.lowStockThreshold"
              :label="t('admin.forms.product.lowStockThreshold.label')"
              :error="errors.lowStockThreshold"
              type="number"
              min="0"
              :placeholder="t('admin.forms.product.lowStockThreshold.placeholder')"
              :hint="t('admin.forms.product.lowStockThreshold.hint')"
            />

            <!-- Categories -->
            <AdminFormField
              :label="t('admin.forms.product.category.label')"
              :error="errors.categoryIds || errors.categoryId"
              :hint="t('admin.forms.product.category.hintMulti', 'Select one or more categories/subcategories')"
            >
              <template #default>
                <div class="max-h-48 overflow-y-auto rounded-md p-3 space-y-2" style="border: 1px solid var(--surface-border); background: var(--surface-1)">
                  <label
                    v-for="cat in sortedCategories"
                    :key="cat.id"
                    class="flex items-center gap-2 text-sm"
                    style="color: var(--text-primary)"
                  >
                    <input
                      type="checkbox"
                      class="admin-checkbox"
                      :checked="form.categoryIds.includes(cat.id)"
                      @change="toggleCategorySelection(cat.id, ($event.target as HTMLInputElement).checked)"
                    >
                    <span>{{ categoryDisplayTitle(cat) }}</span>
                  </label>
                  <p
                    v-if="sortedCategories.length === 0"
                    class="text-xs"
                    style="color: var(--text-tertiary)"
                  >
                    {{ t('admin.pages.products.edit.noCategories', 'No categories available') }}
                  </p>
                </div>
              </template>
            </AdminFormField>

            <!-- Product Images -->
            <ProductImagesUploader v-model="productImages" />
          </div>

          <!-- Promotions Tab -->
          <div
            v-show="currentTab === 'promotions'"
            class="space-y-6"
          >
            <div
              v-if="productHasVariantOptions"
              class="rounded-2xl border p-4 space-y-2"
              style="border-color: var(--surface-border); background: var(--surface-2)"
            >
              <p class="text-sm font-semibold" style="color: var(--text-primary)">
                {{ t('admin.pages.products.edit.promotions.variantPromotionTitle', 'Use variant promotions for this product') }}
              </p>
              <p class="text-sm" style="color: var(--text-secondary)">
                {{ t('admin.pages.products.edit.promotions.variantPromotionMessage', 'This product has selectable variants. Product-level promotions are disabled and each variant now manages its own promotional price, schedule, and countdown state.') }}
              </p>
            </div>
            <template v-else>
              <div class="flex items-center">
                <input
                  id="isPromotionActive"
                  v-model="form.isPromotionActive"
                  type="checkbox"
                  class="admin-checkbox"
                >
                <label
                  for="isPromotionActive"
                  class="ml-2 block text-sm" style="color: var(--text-primary)"
                >
                  {{ t('admin.forms.product.isPromotionActive.label', 'Activer la promotion') }}
                </label>
              </div>

	              <div v-if="form.isPromotionActive" class="space-y-6">
	                <BaseInput
	                  :model-value="form.promotionalPrice ?? undefined"
	                  :label="t('admin.forms.product.promotionalPrice.label', 'Prix promotionnel')"
	                  :error="errors.promotionalPrice"
	                  type="number"
	                  min="0"
	                  step="0.01"
	                  required
	                  :placeholder="t('admin.forms.product.promotionalPrice.placeholder', 'Nouveau prix')"
	                  @update:model-value="form.promotionalPrice = $event === '' || $event == null ? null : Number($event)"
	                />

                <BaseInput
                  v-model="form.promotionStartDate"
                  :label="t('admin.forms.product.promotionStartDate.label', 'Date de début (optionnel)')"
                  :error="errors.promotionStartDate"
                  type="datetime-local"
                />

                <BaseInput
                  v-model="form.promotionEndDate"
                  :label="t('admin.forms.product.promotionEndDate.label', 'Date de fin (requis pour le compte à rebours)')"
                  :error="errors.promotionEndDate"
                  type="datetime-local"
                />

                <div class="flex items-center">
                  <input
                    id="showCountdown"
                    v-model="form.showCountdown"
                    type="checkbox"
                    class="admin-checkbox"
                  >
                  <label
                    for="showCountdown"
                    class="ml-2 block text-sm" style="color: var(--text-primary)"
                  >
                    {{ t('admin.forms.product.showCountdown.label', 'Afficher le compte à rebours') }}
                  </label>
                </div>
              </div>
            </template>
          </div>

          <!-- Landing Page Description Tab -->
          <div
            v-show="currentTab === 'description'"
            class="space-y-6"
          >
            <!-- Description -->
            <AdminFormField
              :label="t('admin.pages.products.edit.descriptionTab.title')"
              :error="errors.description"
            >
              <template #default="{ inputId }">
                <RichTextEditor
                  :id="inputId"
                  v-model="form.description"
                  :placeholder="t('admin.forms.product.description.placeholder')"
                />
              </template>
            </AdminFormField>
          </div>

          <!-- Variants Tab -->
          <div
            v-show="currentTab === 'variants'"
            class="space-y-6"
          >
            <!-- Options & Variants -->
            <div>
              <h2 class="text-xl font-bold mb-4" style="color: var(--text-primary)">
                {{ t('admin.pages.products.edit.variantsTab.title') }}
              </h2>
              <p class="text-sm mb-4" style="color: var(--text-secondary)">
                {{ t('admin.pages.products.edit.variantsTab.pricingHint', 'Manage selling prices, costs, inventory, and per-variant promotions here.') }}
              </p>
              <ProductOptionsEditor 
                :product-id="productId" 
                :options="options" 
                class="mb-8" 
                @refresh="fetchProduct"
              />

              <div
                v-if="stockAllocationRequired && stockAllocationSourceBalance"
                class="mb-6 rounded-2xl border p-4 space-y-4"
                style="border-color: rgba(var(--brand-rgb)/0.3); background: color-mix(in srgb, var(--brand) 7%, var(--surface-2))"
              >
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div class="space-y-1">
                    <p class="text-sm font-semibold" style="color: var(--text-primary)">
                      {{ t('admin.pages.products.edit.variantsTab.allocationTitle', 'Allocate stock before using these variants') }}
                    </p>
                    <p class="text-sm" style="color: var(--text-secondary)">
                      {{ t('admin.pages.products.edit.variantsTab.allocationMessage', 'Existing stock is still parked on the hidden source variant. Split the full stock, reserved stock, and safety stock across active variants to make inventory sellable again.') }}
                    </p>
                    <p class="text-xs" style="color: var(--text-tertiary)">
                      {{ stockAllocationSourceVariantTitle || t('admin.variantsTable.defaultVariant', 'Default') }}:
                      {{ stockAllocationSourceBalance.stock }} {{ t('admin.pages.products.edit.variantsTab.onHandShort', 'on hand') }},
                      {{ stockAllocationSourceBalance.reserved }} {{ t('admin.pages.products.edit.variantsTab.reservedShort', 'reserved') }},
                      {{ stockAllocationSourceBalance.safetyStock }} {{ t('admin.pages.products.edit.variantsTab.safetyShort', 'safety') }}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="ui-btn ui-btn--primary ui-btn--md"
                    :disabled="allocatingStock || !stockAllocationBalanced"
                    @click="allocateVariantStock"
                  >
                    {{ allocatingStock ? t('admin.common.saving', 'Saving...') : t('admin.pages.products.edit.variantsTab.allocateAction', 'Allocate stock') }}
                  </button>
                </div>

                <div class="grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
                  <div class="text-xs font-semibold uppercase tracking-wide" style="color: var(--text-tertiary)">
                    {{ t('admin.variantsTable.columns.variant', 'Variant') }}
                  </div>
                  <div class="text-xs font-semibold uppercase tracking-wide" style="color: var(--text-tertiary)">
                    {{ t('admin.variantsTable.columns.onHand', 'On hand') }}
                  </div>
                  <div class="text-xs font-semibold uppercase tracking-wide" style="color: var(--text-tertiary)">
                    {{ t('admin.variantsTable.columns.reserved', 'Reserved') }}
                  </div>
                  <div class="text-xs font-semibold uppercase tracking-wide" style="color: var(--text-tertiary)">
                    {{ t('admin.variantsTable.columns.safety', 'Safety') }}
                  </div>

                  <template v-for="row in stockAllocationRows" :key="row.variantId">
                    <div class="text-sm font-medium self-center" style="color: var(--text-primary)">
                      {{ row.title }}
                    </div>
                    <BaseInput v-model.number="row.stock" type="number" min="0" step="1" />
                    <BaseInput v-model.number="row.reserved" type="number" min="0" step="1" />
                    <BaseInput v-model.number="row.safetyStock" type="number" min="0" step="1" />
                  </template>
                </div>

                <div class="flex flex-wrap items-center gap-4 text-xs" style="color: var(--text-secondary)">
                  <span>{{ t('admin.pages.products.edit.variantsTab.totalOnHand', 'Allocated on hand') }}: {{ stockAllocationTotals.stock }}/{{ stockAllocationSourceBalance.stock }}</span>
                  <span>{{ t('admin.pages.products.edit.variantsTab.totalReserved', 'Allocated reserved') }}: {{ stockAllocationTotals.reserved }}/{{ stockAllocationSourceBalance.reserved }}</span>
                  <span>{{ t('admin.pages.products.edit.variantsTab.totalSafety', 'Allocated safety') }}: {{ stockAllocationTotals.safetyStock }}/{{ stockAllocationSourceBalance.safetyStock }}</span>
                  <span :style="stockAllocationBalanced ? 'color: var(--success, #059669)' : 'color: var(--danger, #dc2626)'">
                    {{ stockAllocationBalanced
                      ? t('admin.pages.products.edit.variantsTab.allocationBalanced', 'Allocation is balanced')
                      : t('admin.pages.products.edit.variantsTab.allocationUnbalanced', 'Allocation must match the hidden source balances exactly') }}
                  </span>
                </div>
              </div>

              <div class="flex items-center justify-between mb-3">
                <label class="flex items-center gap-2 text-sm" style="color: var(--text-secondary)">
                  <input
                    v-model="showArchivedVariants"
                    type="checkbox"
                    class="admin-checkbox"
                  >
                  {{ t('admin.pages.products.edit.variantsTab.showArchived') }}
                </label>
                <span class="text-xs" style="color: var(--text-tertiary)">
                  {{ t('admin.pages.products.edit.variantsTab.archivedCount', { count: archivedVariantsCount }) }}
                </span>
              </div>
                        
              <ProductVariantsTable 
                :product-id="productId" 
                :variants="variants" 
                :options="options"
                :product-images="productImages"
                :legacy-images="form.images"
                @refresh="fetchProduct" 
              />
            </div>
          </div>

          <!-- Bundles Tab -->
          <div
            v-show="currentTab === 'bundles'"
            class="space-y-6"
          >
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-bold" style="color: var(--text-primary)">
                  {{ t('admin.pages.products.edit.bundlesTab.title') }}
                </h2>
                <p class="text-sm mt-1" style="color: var(--text-secondary)">
                  {{ t('admin.pages.products.edit.bundlesTab.hint') }}
                </p>
              </div>
              <button
                type="button"
                class="ui-btn ui-btn--secondary"
                @click="addBundleDealRow"
              >
                {{ t('admin.pages.products.edit.bundlesTab.addBundle') }}
              </button>
            </div>

            <div
              v-if="bundleDealsError"
              class="p-4 bg-red-50 border border-red-200 rounded-md"
            >
              <p class="text-sm text-red-800">
                {{ bundleDealsError }}
              </p>
            </div>

            <div class="ui-card overflow-hidden">
              <div class="overflow-x-auto">
                <table class="ui-table">
                  <thead class="ui-thead">
                    <tr>
                      <th class="ui-th">{{ t('admin.pages.products.edit.bundlesTab.table.qty') }}</th>
                      <th class="ui-th">{{ t('admin.pages.products.edit.bundlesTab.table.price') }}</th>
                      <th class="ui-th">{{ t('admin.pages.products.edit.bundlesTab.table.tag') }}</th>
                      <th class="ui-th">{{ t('admin.pages.products.edit.bundlesTab.table.active') }}</th>
                      <th class="ui-th text-right">{{ t('admin.pages.products.edit.bundlesTab.table.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody class="ui-tbody">
                    <tr v-if="bundleDeals.length === 0">
                      <td colspan="5" class="px-4 py-6 text-sm" style="color: var(--text-tertiary)">
                        {{ t('admin.pages.products.edit.bundlesTab.table.empty') }}
                      </td>
                    </tr>
                    <tr
                      v-for="(deal, idx) in bundleDeals"
                      :key="deal.id || `new-${idx}`"
                      class="ui-tr"
                    >
                      <td class="ui-td">
                        <input
                          v-model.number="deal.bundleQty"
                          type="number"
                          min="2"
                          class="w-24 px-3 py-2 rounded-lg" style="border: 1px solid var(--surface-border); background: var(--surface-1); color: var(--text-primary)"
                        >
                      </td>
                      <td class="ui-td">
                        <input
                          v-model="deal.bundlePrice"
                          type="number"
                          min="0"
                          step="0.01"
                          class="w-40 px-3 py-2 rounded-lg" style="border: 1px solid var(--surface-border); background: var(--surface-1); color: var(--text-primary)"
                        >
                      </td>
                      <td class="ui-td">
                        <select
                          v-model="deal.tag"
                          class="w-48 px-3 py-2 rounded-lg" style="border: 1px solid var(--surface-border); background: var(--surface-1); color: var(--text-primary)"
                        >
                          <option :value="null">{{ t('admin.pages.products.edit.bundlesTab.tags.none') }}</option>
                          <option value="MOST_POPULAR">{{ t('admin.pages.products.edit.bundlesTab.tags.mostPopular') }}</option>
                          <option value="BEST_VALUE">{{ t('admin.pages.products.edit.bundlesTab.tags.bestValue') }}</option>
                        </select>
                      </td>
                      <td class="ui-td">
                        <label class="inline-flex items-center gap-2">
                          <input
                            v-model="deal.isActive"
                            type="checkbox"
                            class="admin-checkbox"
                          >
                          <span class="text-sm" style="color: var(--text-secondary)">{{ t('admin.common.active') }}</span>
                        </label>
                      </td>
                      <td class="ui-td text-right space-x-2">
                        <button
                          type="button"
                          class="ui-btn ui-btn--primary ui-btn--sm"
                          :disabled="bundleDealsSubmitting"
                          @click="saveBundleDeal(deal)"
                        >
                          {{ t('admin.common.save') }}
                        </button>
                        <button
                          type="button"
                          class="ui-btn ui-btn--danger ui-btn--sm"
                          :disabled="bundleDealsSubmitting"
                          @click="deleteBundleDeal(deal, idx)"
                        >
                          {{ t('admin.common.delete') }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Tracking Tab -->
          <div
            v-show="currentTab === 'tracking'"
            class="space-y-6"
          >
            <div class="rounded-lg p-6" style="border: 1px solid var(--surface-border); background: var(--surface-1)">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-xl font-bold" style="color: var(--text-primary)">{{ t('admin.pages.products.edit.metaPixels.title') }}</h2>
                  <p class="text-sm mt-1" style="color: var(--text-secondary)">{{ t('admin.pages.products.edit.metaPixels.subtitle') }}</p>
                </div>
                <button
                  type="button"
                  class="ui-btn ui-btn--secondary disabled:opacity-50"
                  :disabled="metaPixelsSaving"
                  @click="saveProductMetaPixels"
                >
                  {{ metaPixelsSaving ? 'Saving...' : 'Save Pixels' }}
                </button>
              </div>

              <div v-if="metaPixelsError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                {{ metaPixelsError }}
              </div>

              <div v-if="metaPixelsLoading" class="mt-4 text-sm" style="color: var(--text-secondary)">
                Loading pixels...
              </div>

              <div v-else class="mt-4">
                <div v-if="metaPixels.length === 0" class="text-sm" style="color: var(--text-secondary)">
                  No meta pixels configured yet. Create them in Admin → Integrations → Meta Pixels.
                </div>
                <div v-else class="space-y-3">
                  <label
                    v-for="p in metaPixels"
                    :key="p.id"
                    class="flex items-center justify-between gap-4 rounded-lg px-4 py-3" style="border: 1px solid var(--surface-border)"
                  >
                    <div class="min-w-0">
                      <div class="font-medium truncate" style="color: var(--text-primary)">
                        {{ p.name || '—' }}
                        <span v-if="p.isGlobal" class="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">{{ t('admin.pages.integrations.metaPixels.table.global') }}</span>
                        <span v-if="!p.isActive" class="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" style="background: var(--surface-3); color: var(--text-secondary)">{{ t('admin.common.inactive') }}</span>
                      </div>
                      <div class="text-xs font-mono truncate" style="color: var(--text-secondary)">{{ p.pixelId }}</div>
                    </div>
                    <input
                      type="checkbox"
                      class="admin-checkbox"
                      :value="p.id"
                      v-model="productMetaPixelIds"
                    >
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="p-4 bg-red-50 border border-red-200 rounded-md mx-6 mb-6"
        >
          <p class="text-sm text-red-800">
            {{ errorMessage }}
          </p>
        </div>

        <!-- Actions Footer (Sticky on Mobile if needed, or just bottom) -->
        <div class="px-6 py-4 flex justify-end space-x-3" style="background: var(--surface-2); border-top: 1px solid var(--surface-border)">
          <NuxtLink
            to="/admin/products"
            class="px-4 py-2 rounded-md text-sm font-medium" style="border: 1px solid var(--surface-border); color: var(--text-secondary)"
          >
            {{ t('admin.common.cancel') }}
          </NuxtLink>
          <button
            type="submit"
            :disabled="submitting"
            class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ submitting ? t('admin.common.updating') : t('admin.pages.products.edit.submit') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { toTenantHost, useRequestOrigin } from '~/composables/host'
import { usePlatformBaseDomain } from '~/composables/platformBaseDomain'
import ProductImagesUploader from '~/components/admin/ProductImagesUploader.vue'
import RichTextEditor from '~/components/admin/RichTextEditor.vue'
import ProductOptionsEditor from '~/components/admin/ProductOptionsEditor.vue'
import ProductVariantsTable from '~/components/admin/ProductVariantsTable.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseToggle from '~/components/ui/BaseToggle.vue'
import { CONTENT_SLUG_PATTERN, CONTENT_SLUG_RULE_HINT, normalizeContentSlug } from '~/shared/content-slug'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.products.edit.metaTitle'
})

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const productId = route.params.id as string
const isNewProduct = computed(() => route.query.isNew === 'true')

interface Category {
  id: string
  title: string
  displayTitle?: string
  parentId?: string | null
  parent?: { id: string; title: string } | null
}
type CategoryOption = Category & { depth: number }

interface ProductImage {
  id?: string | null
  url: string
  alt?: string
  position: number
  isMain: boolean
}

interface BundleDeal {
  id?: string
  bundleQty: number
  bundlePrice: number | string
  tag?: string | null
  isActive?: boolean
  startsAt?: string | null
  endsAt?: string | null
  _isNew?: boolean
}

interface StockAllocationBalance {
  stock: number
  reserved: number
  safetyStock: number
}

interface StockAllocationRow extends StockAllocationBalance {
  variantId: string
  title: string
}

function toDateTimeLocal(value: string | Date | null | undefined): string {
  if (!value) return ''
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 16)
}

function createVariantServerState(variant: any) {
  return {
    price: Number(variant?.price ?? 0),
    cost: variant?.cost != null ? Number(variant.cost) : null,
    sku: variant?.sku || '',
    barcode: variant?.barcode || '',
    isActive: variant?.isActive !== false,
    compareAtPrice: variant?.compareAtPrice != null ? Number(variant.compareAtPrice) : null,
    promotionalPrice: variant?.promotionalPrice != null ? Number(variant.promotionalPrice) : null,
    isPromotionActive: variant?.isPromotionActive === true,
    promotionStartDateInput: toDateTimeLocal(variant?.promotionStartDate),
    promotionEndDateInput: toDateTimeLocal(variant?.promotionEndDate),
    showCountdown: variant?.showCountdown === true,
    stock: Number(variant?.stock ?? 0),
    reserved: Number(variant?.reserved ?? 0),
    safetyStock: Number(variant?.safetyStock ?? 0),
    trackInventory: variant?.trackInventory !== false,
    availableStock: Number(variant?.availableStock ?? 0)
  }
}

function mapVariantForEditor(variant: any) {
  const normalized = {
    ...variant,
    price: Number(variant?.price ?? 0),
    cost: variant?.cost != null ? Number(variant.cost) : null,
    compareAtPrice: variant?.compareAtPrice != null ? Number(variant.compareAtPrice) : null,
    promotionalPrice: variant?.promotionalPrice != null ? Number(variant.promotionalPrice) : null,
    promotionStartDateInput: toDateTimeLocal(variant?.promotionStartDate),
    promotionEndDateInput: toDateTimeLocal(variant?.promotionEndDate),
    availableStock: Number(
      variant?.availableStock ??
        Math.max(
          Number(variant?.stock ?? 0) - Number(variant?.reserved ?? 0) - Number(variant?.safetyStock ?? 0),
          0
        )
    )
  }

  return {
    ...normalized,
    __serverState: createVariantServerState(normalized)
  }
}

const form = ref({
  title: '',
  slug: '',
  miniDescription: '',
  searchKeywords: '',
  description: '',
  price: 0,
  stock: 0,
  lowStockThreshold: 5,
  categoryIds: [] as string[],
  isActive: true,
  images: [] as string[], // Legacy field for backwards compatibility
  promotionalPrice: null as number | null,
  isPromotionActive: false,
  promotionStartDate: '',
  promotionEndDate: '',
  showCountdown: false
})

const options = ref<any[]>([])
const allVariants = ref<any[]>([])
const showArchivedVariants = ref(false)
const variants = computed(() => {
  if (showArchivedVariants.value) return allVariants.value
  return allVariants.value.filter((v) => v?.isActive !== false)
})
const archivedVariantsCount = computed(() => allVariants.value.filter((v) => v?.isActive === false).length)
const productHasVariantOptions = computed(() => Array.isArray(options.value) && options.value.length > 0)
const productImages = ref<ProductImage[]>([])
const bundleDeals = ref<BundleDeal[]>([])
const bundleDealsSubmitting = ref(false)
const bundleDealsError = ref('')
const stockAllocationRequired = ref(false)
const stockAllocationSourceVariantId = ref('')
const stockAllocationSourceVariantTitle = ref('')
const stockAllocationSourceBalance = ref<StockAllocationBalance | null>(null)
const stockAllocationRows = ref<StockAllocationRow[]>([])
const allocatingStock = ref(false)

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)
const loading = ref(true)
const categories = ref<Category[]>([])
const lastAutoSlug = ref('')
const slugPattern = CONTENT_SLUG_PATTERN
const slugSuggestionSeq = ref(0)
const { showToast } = useToast()

const newKeyword = ref('')
const keywordList = computed(() => {
  if (!form.value.searchKeywords) return []
  return form.value.searchKeywords.split(',').map(k => k.trim()).filter(k => k)
})

function addKeyword() {
  const kw = newKeyword.value.trim()
  if (kw && !keywordList.value.includes(kw)) {
    const newList = [...keywordList.value, kw]
    form.value.searchKeywords = newList.join(',')
  }
  newKeyword.value = ''
}

function removeKeyword(index: number) {
  const newList = [...keywordList.value]
  newList.splice(index, 1)
  form.value.searchKeywords = newList.join(',')
}

const categoryDisplayTitle = (category: CategoryOption) => {
  return `${'-> '.repeat(category.depth)}${category.title}`
}

const sortedCategories = computed<CategoryOption[]>(() => {
  const byParent = new Map<string | null, Category[]>()
  for (const category of categories.value) {
    const key = category.parentId ?? null
    const group = byParent.get(key) ?? []
    group.push(category)
    byParent.set(key, group)
  }
  for (const group of byParent.values()) {
    group.sort((a, b) => a.title.localeCompare(b.title))
  }

  const ordered: CategoryOption[] = []
  const seen = new Set<string>()
  const visit = (node: Category, depth = 0) => {
    if (seen.has(node.id)) return
    seen.add(node.id)
    ordered.push({ ...node, depth })
    for (const child of byParent.get(node.id) || []) {
      visit(child, depth + 1)
    }
  }

  for (const root of byParent.get(null) || []) {
    visit(root, 0)
  }
  for (const category of categories.value) {
    if (!seen.has(category.id)) visit(category, 0)
  }

  return ordered
})

function toggleCategorySelection(categoryId: string, checked: boolean) {
  const next = new Set(form.value.categoryIds)
  if (checked) next.add(categoryId)
  else next.delete(categoryId)
  form.value.categoryIds = Array.from(next)
}

watch(() => form.value.title, (newTitle) => {
  void syncAutoSlugFromTitle(newTitle)
})

// Tabs configuration
const tabs = computed(() => ([
  { id: 'general', name: t('admin.pages.products.edit.tabs.general') },
  { id: 'promotions', name: t('admin.pages.products.edit.tabs.promotions', 'Promotions') },
  { id: 'description', name: t('admin.pages.products.edit.tabs.description') },
  { id: 'variants', name: t('admin.pages.products.edit.tabs.variants') },
  { id: 'bundles', name: t('admin.pages.products.edit.tabs.bundles') },
  { id: 'tracking', name: 'Tracking' }
]))
const currentTab = ref('general')

const metaPixels = ref<any[]>([])
const productMetaPixelIds = ref<string[]>([])
const metaPixelsLoading = ref(false)
const metaPixelsSaving = ref(false)
const metaPixelsError = ref('')

function getVariantTitle(variant: any): string {
  if (!Array.isArray(variant?.optionValues) || variant.optionValues.length === 0) {
    return t('admin.variantsTable.defaultVariant', 'Default')
  }

  const optionPositions = new Map(options.value.map((option: any) => [option.id, Number(option.position ?? 0)]))
  return [...variant.optionValues]
    .sort((a: any, b: any) => {
      const posA = optionPositions.get(a?.optionValue?.optionId) ?? 999
      const posB = optionPositions.get(b?.optionValue?.optionId) ?? 999
      return posA - posB
    })
    .map((entry: any) => entry?.optionValue?.label)
    .filter((label: unknown): label is string => typeof label === 'string' && label.trim().length > 0)
    .join(' / ')
}

function syncStockAllocationState(data: any) {
  stockAllocationRequired.value = data?.stockAllocationRequired === true
  stockAllocationSourceVariantId.value = data?.stockAllocationSourceVariantId || ''
  stockAllocationSourceVariantTitle.value = data?.stockAllocationSourceVariantTitle || ''
  stockAllocationSourceBalance.value = data?.stockAllocationSourceBalance
    ? {
        stock: Number(data.stockAllocationSourceBalance.stock ?? 0),
        reserved: Number(data.stockAllocationSourceBalance.reserved ?? 0),
        safetyStock: Number(data.stockAllocationSourceBalance.safetyStock ?? 0)
      }
    : null

  const nextRows = (Array.isArray(data?.variants) ? data.variants : [])
    .filter((variant: any) => Array.isArray(variant?.optionValues) && variant.optionValues.length > 0 && variant?.isActive !== false)
    .map((variant: any) => {
      const existing = stockAllocationRows.value.find((row) => row.variantId === variant.id)
      return {
        variantId: variant.id,
        title: getVariantTitle(variant),
        stock: existing?.stock ?? 0,
        reserved: existing?.reserved ?? 0,
        safetyStock: existing?.safetyStock ?? 0
      } satisfies StockAllocationRow
    })

  stockAllocationRows.value = nextRows
}

const stockAllocationTotals = computed(() => {
  return stockAllocationRows.value.reduce(
    (totals, row) => ({
      stock: totals.stock + Number(row.stock || 0),
      reserved: totals.reserved + Number(row.reserved || 0),
      safetyStock: totals.safetyStock + Number(row.safetyStock || 0)
    }),
    { stock: 0, reserved: 0, safetyStock: 0 }
  )
})

const stockAllocationBalanced = computed(() => {
  if (!stockAllocationSourceBalance.value) return false
  return (
    stockAllocationTotals.value.stock === stockAllocationSourceBalance.value.stock &&
    stockAllocationTotals.value.reserved === stockAllocationSourceBalance.value.reserved &&
    stockAllocationTotals.value.safetyStock === stockAllocationSourceBalance.value.safetyStock
  )
})

async function fetchProduct() {
  loading.value = true
  try {
    const data = await $fetch(`/api/admin/products/${productId}`, {
      query: { includeInactiveVariants: '1' },
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    if (isNewProduct.value && data.title === 'Nouveau produit') {
      data.title = ''
    }

    form.value = {
      title: data.title || '',
      slug: data.slug || '',
      miniDescription: data.miniDescription || '',
      searchKeywords: data.searchKeywords || '',
      description: data.description || '',
      price: Number(data.price),
      stock: data.stock,
      lowStockThreshold: data.lowStockThreshold ?? 5,
      categoryIds: Array.isArray(data.categoryIds)
        ? data.categoryIds.filter((id: unknown) => typeof id === 'string' && id.length > 0)
        : (data.categoryId ? [data.categoryId] : []),
      isActive: data.isActive,
      images: data.images || [],
      promotionalPrice: data.promotionalPrice ? Number(data.promotionalPrice) : null,
      isPromotionActive: data.isPromotionActive ?? false,
      promotionStartDate: data.promotionStartDate ? new Date(data.promotionStartDate).toISOString().slice(0, 16) : '',
      promotionEndDate: data.promotionEndDate ? new Date(data.promotionEndDate).toISOString().slice(0, 16) : '',
      showCountdown: data.showCountdown ?? false
    }
    lastAutoSlug.value = slugify(data.slug || data.title || '')

    options.value = data.options || []
    allVariants.value = (data.variants || []).map((variant: any) => mapVariantForEditor(variant))
    syncStockAllocationState(data)
    bundleDeals.value = (data.bundleDeals || []).map((d: any) => ({
      id: d.id,
      bundleQty: Number(d.bundleQty),
      bundlePrice: d.bundlePrice,
      tag: d.tag || null,
      isActive: d.isActive !== false,
      startsAt: d.startsAt || null,
      endsAt: d.endsAt || null
    }))
    
    // Convert productImages from API to our format, or migrate legacy images
    if (data.productImages && data.productImages.length > 0) {
      productImages.value = data.productImages.map((img: any) => ({
        id: img.id,
        url: img.url,
        alt: img.alt || '',
        position: img.position,
        isMain: img.isMain
      }))
    } else if (data.images && data.images.length > 0) {
      // Migrate legacy images array to ProductImage format
      productImages.value = data.images.map((url: string, idx: number) => ({
        id: null,
        url,
        alt: '',
        position: idx,
        isMain: idx === 0 // First image is main by default
      }))
    } else {
      productImages.value = []
    }

  } catch (error) {
    console.error('Failed to fetch product:', error)
    errorMessage.value = t('admin.pages.products.edit.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

async function allocateVariantStock() {
  if (!stockAllocationSourceBalance.value) return

  allocatingStock.value = true
  errorMessage.value = ''

  try {
    await $fetch(`/api/admin/products/${productId}/variants/allocate-stock`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        sourceVariantId: stockAllocationSourceVariantId.value || null,
        allocations: stockAllocationRows.value.map((row) => ({
          variantId: row.variantId,
          stock: Number(row.stock || 0),
          reserved: Number(row.reserved || 0),
          safetyStock: Number(row.safetyStock || 0)
        }))
      }
    })

    await fetchProduct()
    showToast(t('admin.pages.products.edit.variantsTab.allocationSaved', 'Variant stock allocation saved'), 'success')
  } catch (error: any) {
    console.error('Failed to allocate variant stock:', error)
    errorMessage.value = error?.data?.statusMessage || t('admin.pages.products.edit.errors.updateFailed')
  } finally {
    allocatingStock.value = false
  }
}

function slugify(text: string): string {
  return normalizeContentSlug(text)
}

function normalizeSlugInput(): string {
  const normalized = slugify(form.value.slug || '')
  if (form.value.slug !== normalized) {
    form.value.slug = normalized
  }
  return normalized
}

function candidateFromBase(base: string, attempt: number): string {
  return attempt === 0 ? base : `${base}-${attempt + 1}`
}

async function fetchSlugAvailability(slug: string, showError = true): Promise<boolean | null> {
  try {
    const result = await $fetch('/api/admin/products/slug-availability', {
      headers: { Authorization: `Bearer ${authStore.token}` },
      query: { slug, excludeId: productId }
    }) as { slug: string; available: boolean }
    return result.available
  } catch (error: any) {
    if (showError) {
      errors.value.slug = error?.data?.statusMessage || 'Unable to validate slug right now'
    }
    return null
  }
}

async function findAvailableSlug(baseInput: string): Promise<string | null> {
  const base = slugify(baseInput)
  if (!base) return ''

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = candidateFromBase(base, attempt)
    const available = await fetchSlugAvailability(candidate, false)
    if (available === true) return candidate
    if (available === null) return null
  }

  return null
}

async function syncAutoSlugFromTitle(title: string) {
  const shouldAutoManage = !form.value.slug || form.value.slug === lastAutoSlug.value
  if (!shouldAutoManage) return

  const seq = ++slugSuggestionSeq.value
  const base = slugify(title)
  if (!base) {
    form.value.slug = ''
    lastAutoSlug.value = ''
    return
  }

  const suggested = await findAvailableSlug(base)
  if (seq !== slugSuggestionSeq.value) return

  const resolved = suggested || base
  form.value.slug = resolved
  lastAutoSlug.value = resolved
  errors.value.slug = ''
}

async function checkSlugAvailability(): Promise<boolean> {
  errors.value.slug = ''
  const slug = normalizeSlugInput()

  if (!slug) {
    errors.value.slug = 'Slug is required'
    return false
  }
  if (!slugPattern.test(slug)) {
    errors.value.slug = CONTENT_SLUG_RULE_HINT
    return false
  }

  const available = await fetchSlugAvailability(slug, true)
  if (available === true) return true
  if (available === null) return false

  const suggested = await findAvailableSlug(slug)
  if (suggested && suggested !== slug) {
    if (form.value.slug === lastAutoSlug.value) {
      form.value.slug = suggested
      lastAutoSlug.value = suggested
      errors.value.slug = ''
      return true
    }
    errors.value.slug = `This slug is already used in your store. Suggested: ${suggested}`
    return false
  }

  errors.value.slug = 'This slug is already used in your store'
  return false
}

async function handleSlugChange() {
  await checkSlugAvailability()
}

async function fetchCategories() {
  try {
    const data = await $fetch('/api/admin/categories', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    categories.value = data as Category[]
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

async function refreshBundleDeals() {
  bundleDealsError.value = ''
  try {
    const data = await $fetch(`/api/admin/products/${productId}/bundles`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    bundleDeals.value = data.map((d: any) => ({
      id: d.id,
      bundleQty: Number(d.bundleQty),
      bundlePrice: d.bundlePrice,
      tag: d.tag || null,
      isActive: d.isActive !== false,
      startsAt: d.startsAt || null,
      endsAt: d.endsAt || null
    }))
  } catch (error: any) {
    console.error('Failed to fetch bundle deals:', error)
    bundleDealsError.value = error?.data?.statusMessage || t('admin.pages.products.edit.errors.bundlesLoadFailed')
  }
}

function addBundleDealRow() {
  bundleDeals.value.push({
    bundleQty: 2,
    bundlePrice: 0,
    tag: null,
    isActive: true,
    startsAt: null,
    endsAt: null,
    _isNew: true
  })
  currentTab.value = 'bundles'
}

async function saveBundleDeal(deal: BundleDeal) {
  bundleDealsError.value = ''
  bundleDealsSubmitting.value = true
  try {
    const payload = {
      bundleQty: deal.bundleQty,
      bundlePrice: deal.bundlePrice,
      tag: deal.tag || null,
      isActive: deal.isActive !== false,
      startsAt: deal.startsAt || null,
      endsAt: deal.endsAt || null
    }

    if (deal.id) {
      await $fetch(`/api/admin/products/${productId}/bundles/${deal.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authStore.token}`
        },
        body: payload
      })
    } else {
      await $fetch(`/api/admin/products/${productId}/bundles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.token}`
        },
        body: payload
      })
    }

    await refreshBundleDeals()
  } catch (error: any) {
    console.error('Failed to save bundle deal:', error)
    bundleDealsError.value = error?.data?.statusMessage || t('admin.pages.products.edit.errors.bundlesSaveFailed')
  } finally {
    bundleDealsSubmitting.value = false
  }
}

async function deleteBundleDeal(deal: BundleDeal, index: number) {
  bundleDealsError.value = ''
  if (!deal.id) {
    bundleDeals.value.splice(index, 1)
    return
  }

  bundleDealsSubmitting.value = true
  try {
    await $fetch(`/api/admin/products/${productId}/bundles/${deal.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    await refreshBundleDeals()
  } catch (error: any) {
    console.error('Failed to delete bundle deal:', error)
    bundleDealsError.value = error?.data?.statusMessage || t('admin.pages.products.edit.errors.bundlesDeleteFailed')
  } finally {
    bundleDealsSubmitting.value = false
  }
}

async function handleSubmit() {
  errors.value = {}
  errorMessage.value = ''
  submitting.value = true

  try {
    const slugOk = await checkSlugAvailability()
    if (!slugOk) return

    // First update basic product info
    const allowProductPromotion = !productHasVariantOptions.value
    const payload: any = {
      title: form.value.title,
      slug: form.value.slug,
      miniDescription: form.value.miniDescription || null,
      searchKeywords: form.value.searchKeywords || null,
      description: form.value.description || null,
      isActive: form.value.isActive,
      lowStockThreshold: Number(form.value.lowStockThreshold),
      images: productImages.value.map(img => img.url), // Keep legacy images in sync
      promotionalPrice: allowProductPromotion && form.value.isPromotionActive && form.value.promotionalPrice ? Number(form.value.promotionalPrice) : null,
      isPromotionActive: allowProductPromotion && form.value.isPromotionActive,
      promotionStartDate: allowProductPromotion && form.value.isPromotionActive && form.value.promotionStartDate ? new Date(form.value.promotionStartDate).toISOString() : null,
      promotionEndDate: allowProductPromotion && form.value.isPromotionActive && form.value.promotionEndDate ? new Date(form.value.promotionEndDate).toISOString() : null,
      showCountdown: allowProductPromotion && form.value.isPromotionActive && form.value.showCountdown
    }

    payload.categoryIds = form.value.categoryIds
    payload.categoryId = form.value.categoryIds[0] || null

    await $fetch(`/api/admin/products/${productId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: payload
    })

    // Then sync ProductImage records via reorder endpoint
    // This will create/update/delete ProductImage records as needed
    if (productImages.value.length > 0) {
      try {
        await $fetch(`/api/admin/products/${productId}/images/sync`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authStore.token}`
          },
          body: {
            images: productImages.value.map(img => ({
              id: img.id,
              url: img.url,
              alt: img.alt || null,
              position: img.position,
              isMain: img.isMain
            }))
          }
        })
      } catch (imgError) {
        console.error('Failed to sync product images:', imgError)
        // Don't fail the whole save if image sync fails
      }
    }

    // Show success toast instead of redirecting
    showToast(t('admin.common.saved') || 'Product updated successfully', 'success')

  } catch (error: any) {
    console.error('Failed to update product:', error)
    
    if (error.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else {
      errorMessage.value = t('admin.pages.products.edit.errors.updateFailed')
    }
  } finally {
    submitting.value = false
  }
}


// Use same logic as "View Store" button in admin layout
const tenantSlug = computed(() => authStore.user?.tenant?.slug as string | undefined)

const productUrl = computed(() => {
  const slug = tenantSlug.value
  if (!slug) return '/'
  
  const { protocol, host } = useRequestOrigin()
  const platformBaseDomain = usePlatformBaseDomain()
  const tenantHost = toTenantHost(host, slug, { platformBaseDomain })
  return `${protocol}://${tenantHost}/product/${form.value.slug}`
})

const landingUrl = computed(() => {
  const slug = tenantSlug.value
  if (!slug) return '/'
  
  const { protocol, host } = useRequestOrigin()
  const platformBaseDomain = usePlatformBaseDomain()
  const tenantHost = toTenantHost(host, slug, { platformBaseDomain })
  return `${protocol}://${tenantHost}/product/${form.value.slug}?mode=landing`
})

async function copyUrl(url: string) {
    try {
        await navigator.clipboard.writeText(url)
        // You could add a toast notification here
    } catch (err) {
        console.error('Failed to copy link:', err)
    }
}

onMounted(() => {
  fetchProduct()
  fetchCategories()
  fetchMetaPixels()
  fetchProductMetaPixels()
})

async function fetchMetaPixels() {
  metaPixelsLoading.value = true
  metaPixelsError.value = ''
  try {
    const data = await $fetch('/api/admin/meta-pixels', {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    metaPixels.value = Array.isArray(data) ? data : []
  } catch (error: any) {
    console.error('Failed to fetch meta pixels:', error)
    metaPixelsError.value = error?.data?.statusMessage || 'Failed to load meta pixels'
  } finally {
    metaPixelsLoading.value = false
  }
}

async function fetchProductMetaPixels() {
  metaPixelsError.value = ''
  try {
    const data = (await $fetch(`/api/admin/meta-pixels/products/${productId}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })) as { metaPixelIds: string[] }
    productMetaPixelIds.value = Array.isArray(data?.metaPixelIds) ? data.metaPixelIds : []
  } catch (error: any) {
    console.error('Failed to fetch product meta pixels:', error)
    // keep non-blocking
  }
}

async function saveProductMetaPixels() {
  metaPixelsSaving.value = true
  metaPixelsError.value = ''
  try {
    const data = (await $fetch(`/api/admin/meta-pixels/products/${productId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { metaPixelIds: productMetaPixelIds.value }
    })) as { metaPixelIds: string[] }
    productMetaPixelIds.value = Array.isArray(data?.metaPixelIds) ? data.metaPixelIds : productMetaPixelIds.value
  } catch (error: any) {
    console.error('Failed to save product meta pixels:', error)
    metaPixelsError.value = error?.data?.statusMessage || 'Failed to save product meta pixels'
  } finally {
    metaPixelsSaving.value = false
  }
}
</script>

<style scoped>
</style>
