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
            class="text-gray-700 hover:text-teal-600"
          >
            {{ t('admin.nav.products') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">
              {{ t('admin.pages.products.edit.breadcrumbEdit', { title: form.title || t('admin.pages.products.edit.fallbackTitle') }) }}
            </span>
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
        {{ t('admin.pages.products.edit.loading') }}
      </p>
    </div>

    <!-- Form -->
    <div v-else>
      <!-- Header -->
      <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">
            {{ t('admin.pages.products.edit.title') }}
          </h2>
          <p class="text-gray-600 mt-1">
            {{ t('admin.pages.products.edit.subtitle') }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <!-- Public Links -->
          <div class="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <span class="text-xs font-medium text-gray-500 px-2">{{ t('admin.pages.products.edit.links.label') }}:</span>
                
            <!-- Product Page -->
            <div class="flex items-center space-x-1 border-r border-gray-300 pr-2">
              <span class="text-xs text-gray-400">{{ t('admin.pages.products.edit.links.product') }}</span>
              <a
                :href="productUrl"
                target="_blank"
                class="p-1 text-teal-600 hover:bg-teal-50 rounded"
                :title="t('admin.pages.products.edit.links.openProduct')"
              >
                <Icon name="lucide:external-link" class="w-4 h-4" />
              </a>
              <button
                class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                :title="t('admin.pages.products.edit.links.copyProduct')"
                @click="copyUrl(productUrl)"
              >
                <Icon name="lucide:copy" class="w-4 h-4" />
              </button>
            </div>

            <!-- Landing Page -->
            <div class="flex items-center space-x-1 pl-1">
              <span class="text-xs text-gray-400">{{ t('admin.pages.products.edit.links.landing') }}</span>
              <a
                :href="landingUrl"
                target="_blank"
                class="p-1 text-teal-600 hover:bg-teal-50 rounded"
                :title="t('admin.pages.products.edit.links.openLanding')"
              >
                <Icon name="lucide:external-link" class="w-4 h-4" />
              </a>
              <button
                class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                :title="t('admin.pages.products.edit.links.copyLanding')"
                @click="copyUrl(landingUrl)"
              >
                <Icon name="lucide:copy" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <NuxtLink
            to="/admin/products"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
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
        class="bg-white rounded-lg shadow overflow-hidden"
        @submit.prevent="handleSubmit"
      >
        <!-- Tabs Navigation -->
        <div class="border-b border-gray-200 overflow-x-auto custom-scrollbar">
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
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
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

            <!-- Category -->
            <BaseSelect
              v-model="form.categoryId"
              :label="t('admin.forms.product.category.label')"
              :error="errors.categoryId"
            >
              <option value="">
                {{ t('admin.forms.product.category.placeholder') }}
              </option>
              <option
                v-for="cat in categories"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.title }}
              </option>
            </BaseSelect>

            <!-- Product Images -->
            <ImageUploader v-model="productImages" />

            <!-- Active Status -->
            <div class="flex items-center">
              <input
                id="isActive"
                v-model="form.isActive"
                type="checkbox"
                class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              >
              <label
                for="isActive"
                class="ml-2 block text-sm text-gray-900"
              >
                {{ t('admin.forms.product.isActive.label') }}
              </label>
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
              <h2 class="text-xl font-bold text-gray-800 mb-4">
                {{ t('admin.pages.products.edit.variantsTab.title') }}
              </h2>
              <ProductOptionsEditor 
                :product-id="productId" 
                :options="options" 
                class="mb-8" 
                @refresh="fetchProduct"
              />
                        
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
                <h2 class="text-xl font-bold text-gray-800">
                  {{ t('admin.pages.products.edit.bundlesTab.title') }}
                </h2>
                <p class="text-sm text-gray-600 mt-1">
                  {{ t('admin.pages.products.edit.bundlesTab.hint') }}
                </p>
              </div>
              <button
                type="button"
                class="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
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

            <div class="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-white">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('admin.pages.products.edit.bundlesTab.table.qty') }}</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('admin.pages.products.edit.bundlesTab.table.price') }}</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('admin.pages.products.edit.bundlesTab.table.tag') }}</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('admin.pages.products.edit.bundlesTab.table.active') }}</th>
                      <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{{ t('admin.pages.products.edit.bundlesTab.table.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-if="bundleDeals.length === 0">
                      <td colspan="5" class="px-4 py-6 text-sm text-gray-500">
                        {{ t('admin.pages.products.edit.bundlesTab.table.empty') }}
                      </td>
                    </tr>
                    <tr
                      v-for="(deal, idx) in bundleDeals"
                      :key="deal.id || `new-${idx}`"
                    >
                      <td class="px-4 py-3">
                        <input
                          v-model.number="deal.bundleQty"
                          type="number"
                          min="2"
                          class="w-24 px-3 py-2 border border-gray-300 rounded-md"
                        >
                      </td>
                      <td class="px-4 py-3">
                        <input
                          v-model="deal.bundlePrice"
                          type="number"
                          min="0"
                          step="0.01"
                          class="w-40 px-3 py-2 border border-gray-300 rounded-md"
                        >
                      </td>
                      <td class="px-4 py-3">
                        <select
                          v-model="deal.tag"
                          class="w-48 px-3 py-2 border border-gray-300 rounded-md bg-white"
                        >
                          <option :value="null">{{ t('admin.pages.products.edit.bundlesTab.tags.none') }}</option>
                          <option value="MOST_POPULAR">{{ t('admin.pages.products.edit.bundlesTab.tags.mostPopular') }}</option>
                          <option value="BEST_VALUE">{{ t('admin.pages.products.edit.bundlesTab.tags.bestValue') }}</option>
                        </select>
                      </td>
                      <td class="px-4 py-3">
                        <label class="inline-flex items-center gap-2">
                          <input
                            v-model="deal.isActive"
                            type="checkbox"
                            class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                          >
                          <span class="text-sm text-gray-700">{{ t('admin.common.active') }}</span>
                        </label>
                      </td>
                      <td class="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          class="px-3 py-2 text-sm rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                          :disabled="bundleDealsSubmitting"
                          @click="saveBundleDeal(deal)"
                        >
                          {{ t('admin.common.save') }}
                        </button>
                        <button
                          type="button"
                          class="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
            <div class="rounded-lg border border-gray-200 bg-white p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-xl font-bold text-gray-800">{{ t('admin.pages.products.edit.metaPixels.title') }}</h2>
                  <p class="text-sm text-gray-600 mt-1">{{ t('admin.pages.products.edit.metaPixels.subtitle') }}</p>
                </div>
                <button
                  type="button"
                  class="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
                  :disabled="metaPixelsSaving"
                  @click="saveProductMetaPixels"
                >
                  {{ metaPixelsSaving ? 'Saving...' : 'Save Pixels' }}
                </button>
              </div>

              <div v-if="metaPixelsError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                {{ metaPixelsError }}
              </div>

              <div v-if="metaPixelsLoading" class="mt-4 text-sm text-gray-600">
                Loading pixels...
              </div>

              <div v-else class="mt-4">
                <div v-if="metaPixels.length === 0" class="text-sm text-gray-600">
                  No meta pixels configured yet. Create them in Admin → Integrations → Meta Pixels.
                </div>
                <div v-else class="space-y-3">
                  <label
                    v-for="p in metaPixels"
                    :key="p.id"
                    class="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3"
                  >
                    <div class="min-w-0">
                      <div class="font-medium text-gray-900 truncate">
                        {{ p.name || '—' }}
                        <span v-if="p.isGlobal" class="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">{{ t('admin.pages.integrations.metaPixels.table.global') }}</span>
                        <span v-if="!p.isActive" class="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{{ t('admin.common.inactive') }}</span>
                      </div>
                      <div class="text-xs font-mono text-gray-600 truncate">{{ p.pixelId }}</div>
                    </div>
                    <input
                      type="checkbox"
                      class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
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
        <div class="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
          <NuxtLink
            to="/admin/products"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
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
import ImageUploader from '~/components/admin/ImageUploader.vue'
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

interface Category {
  id: string
  title: string
}

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
  categoryId: '',
  isActive: true,
  images: [] as string[] // Legacy field for backwards compatibility
})

const options = ref<any[]>([])
const variants = ref<any[]>([])
const productImages = ref<ProductImage[]>([])
const bundleDeals = ref<BundleDeal[]>([])
const bundleDealsSubmitting = ref(false)
const bundleDealsError = ref('')

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)
const loading = ref(true)
const categories = ref<Category[]>([])

// Tabs configuration
const tabs = computed(() => ([
  { id: 'general', name: t('admin.pages.products.edit.tabs.general') },
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
    const data = await $fetch<any>(`/api/admin/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    form.value = {
      title: data.title,
      slug: data.slug,
      miniDescription: data.miniDescription || '',
      description: data.description || '',
      price: Number(data.price),
      stock: data.stock,
      categoryId: data.categoryId || '',
      isActive: data.isActive,
      images: data.images || []
    }

    options.value = data.options || []
    variants.value = data.variants || []
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
    const data = await $fetch<Category[]>('/api/admin/categories', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    categories.value = data
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

async function refreshBundleDeals() {
  bundleDealsError.value = ''
  try {
    const data = await $fetch<any[]>(`/api/admin/products/${productId}/bundles`, {
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
	      images: productImages.value.map(img => img.url) // Keep legacy images in sync
	    }

    if (form.value.categoryId) {
      payload.categoryId = form.value.categoryId
    }

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

    // Redirect to products list
    router.push('/admin/products')
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
  const tenantHost = toTenantHost(host, slug)
  return `${protocol}://${tenantHost}/p/${form.value.slug}`
})

const landingUrl = computed(() => {
  const slug = tenantSlug.value
  if (!slug) return '/'
  
  const { protocol, host } = useRequestOrigin()
  const tenantHost = toTenantHost(host, slug)
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
    const data = await $fetch<any[]>('/api/admin/meta-pixels', {
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
    const data = await $fetch<{ metaPixelIds: string[] }>(`/api/admin/meta-pixels/products/${productId}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
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
    const data = await $fetch<{ metaPixelIds: string[] }>(`/api/admin/meta-pixels/products/${productId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: { metaPixelIds: productMetaPixelIds.value }
    })
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
.custom-scrollbar::-webkit-scrollbar {
    height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c7c7cc;
    border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a1a1aa;
}
</style>
