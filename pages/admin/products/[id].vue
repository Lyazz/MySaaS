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
            class="hover:text-teal-600" style="color: var(--text-secondary)"
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
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
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
                class="p-1 text-teal-600 hover:bg-teal-50 rounded"
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
                class="p-1 text-teal-600 hover:bg-teal-50 rounded"
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
            class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  ? 'border-teal-500 text-teal-600'
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
              required
              pattern="[a-z0-9-]+"
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
                  class="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" style="border: 1px solid var(--surface-border); background: var(--surface-1); color: var(--text-primary)"
                  :placeholder="t('admin.forms.product.miniDescription.placeholder')"
                />
              </template>
            </AdminFormField>

            <!-- Price and Stock Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Price -->
              <!-- Price -->
            <BaseInput
              v-model.number="form.price"
              :label="t('admin.forms.product.price.label')"
              :error="errors.price"
              type="number"
              min="0"
              step="0.01"
              required
              :placeholder="t('admin.forms.product.price.placeholder')"
            />

              <!-- Stock -->
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
            </div>

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
                      class="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                      style="border-color: var(--surface-border); background: var(--surface-3)"
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

            <!-- Active Status -->
            <div class="flex items-center">
              <input
                id="isActive"
                v-model="form.isActive"
                type="checkbox"
                class="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                style="border-color: var(--surface-border); background: var(--surface-3)"
              >
              <label
                for="isActive"
                class="ml-2 block text-sm" style="color: var(--text-primary)"
              >
                {{ t('admin.forms.product.isActive.label') }}
              </label>
            </div>
          </div>

          <!-- Promotions Tab -->
          <div
            v-show="currentTab === 'promotions'"
            class="space-y-6"
          >
            <!-- Active Status -->
            <div class="flex items-center">
              <input
                id="isPromotionActive"
                v-model="form.isPromotionActive"
                type="checkbox"
                class="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                style="border-color: var(--surface-border); background: var(--surface-3)"
              >
              <label
                for="isPromotionActive"
                class="ml-2 block text-sm" style="color: var(--text-primary)"
              >
                {{ t('admin.forms.product.isPromotionActive.label', 'Activer la promotion') }}
              </label>
            </div>

            <!-- Promotional Price -->
            <div v-if="form.isPromotionActive" class="space-y-6">
              <BaseInput
                v-model.number="form.promotionalPrice"
                :label="t('admin.forms.product.promotionalPrice.label', 'Prix promotionnel')"
                :error="errors.promotionalPrice"
                type="number"
                min="0"
                step="0.01"
                required
                :placeholder="t('admin.forms.product.promotionalPrice.placeholder', 'Nouveau prix')"
              />

              <!-- Start Date -->
              <BaseInput
                v-model="form.promotionStartDate"
                :label="t('admin.forms.product.promotionStartDate.label', 'Date de début (optionnel)')"
                :error="errors.promotionStartDate"
                type="datetime-local"
              />

              <!-- End Date -->
              <BaseInput
                v-model="form.promotionEndDate"
                :label="t('admin.forms.product.promotionEndDate.label', 'Date de fin (requis pour le compte à rebours)')"
                :error="errors.promotionEndDate"
                type="datetime-local"
              />

              <!-- Show Countdown -->
              <div class="flex items-center">
                <input
                  id="showCountdown"
                  v-model="form.showCountdown"
                  type="checkbox"
                  class="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                  style="border-color: var(--surface-border); background: var(--surface-3)"
                >
                <label
                  for="showCountdown"
                  class="ml-2 block text-sm" style="color: var(--text-primary)"
                >
                  {{ t('admin.forms.product.showCountdown.label', 'Afficher le compte à rebours') }}
                </label>
              </div>
            </div>
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
              <ProductOptionsEditor 
                :product-id="productId" 
                :options="options" 
                class="mb-8" 
                @refresh="fetchProduct"
              />

              <div class="flex items-center justify-between mb-3">
                <label class="flex items-center gap-2 text-sm" style="color: var(--text-secondary)">
                  <input
                    v-model="showArchivedVariants"
                    type="checkbox"
                    class="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                    style="border-color: var(--surface-border); background: var(--surface-3)"
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
                            class="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                            style="border-color: var(--surface-border); background: var(--surface-3)"
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
                      class="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                      style="border-color: var(--surface-border); background: var(--surface-3)"
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
            class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

const form = ref({
  title: '',
  slug: '',
  miniDescription: '',
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
const productImages = ref<ProductImage[]>([])
const bundleDeals = ref<BundleDeal[]>([])
const bundleDealsSubmitting = ref(false)
const bundleDealsError = ref('')

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)
const loading = ref(true)
const categories = ref<Category[]>([])

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
      title: data.title,
      slug: data.slug,
      miniDescription: data.miniDescription || '',
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

    options.value = data.options || []
    allVariants.value = data.variants || []
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
    // First update basic product info
    const payload: any = {
      title: form.value.title,
      slug: form.value.slug,
      miniDescription: form.value.miniDescription || null,
      description: form.value.description || null,
      price: form.value.price,
      isActive: form.value.isActive,
      lowStockThreshold: Number(form.value.lowStockThreshold),
      images: productImages.value.map(img => img.url), // Keep legacy images in sync
      promotionalPrice: form.value.isPromotionActive && form.value.promotionalPrice ? Number(form.value.promotionalPrice) : null,
      isPromotionActive: form.value.isPromotionActive,
      promotionStartDate: form.value.isPromotionActive && form.value.promotionStartDate ? new Date(form.value.promotionStartDate).toISOString() : null,
      promotionEndDate: form.value.isPromotionActive && form.value.promotionEndDate ? new Date(form.value.promotionEndDate).toISOString() : null,
      showCountdown: form.value.isPromotionActive && form.value.showCountdown
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
    const { showToast } = useToast()
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
  return `${protocol}://${tenantHost}/p/${form.value.slug}`
})

const landingUrl = computed(() => {
  const slug = tenantSlug.value
  if (!slug) return '/'
  
  const { protocol, host } = useRequestOrigin()
  const platformBaseDomain = usePlatformBaseDomain()
  const tenantHost = toTenantHost(host, slug, { platformBaseDomain })
  return `${protocol}://${tenantHost}/p/${form.value.slug}?mode=landing`
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
