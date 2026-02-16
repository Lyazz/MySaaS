<template>
  <form
    class="bg-white rounded-lg shadow overflow-hidden"
    @submit.prevent="emit('submit')"
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
          <BaseInput
            v-model="form.title"
            label="Product Title"
            :error="errors.title"
            placeholder="Enter product title"
            required
          />

          <BaseInput
            v-model="form.slug"
            label="Product Slug"
            :error="errors.slug"
            placeholder="product-slug"
            hint="URL-friendly version of the title"
            required
            pattern="[a-z0-9-]+"
          />

        <AdminFormField
          label="Mini Description"
          :error="errors.miniDescription"
          hint="Short description for landing page header (optional)"
        >
          <template #default="{ inputId }">
            <textarea
              :id="inputId"
              v-model="form.miniDescription"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter a short summary..."
            />
          </template>
        </AdminFormField>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BaseInput
              v-model.number="form.price"
              label="Price ($)"
              :error="errors.price"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
            />

            <BaseInput
              v-model.number="form.stock"
              label="Stock Quantity"
              :error="errors.stock"
              type="number"
              min="0"
              required
              placeholder="0"
              :disabled="stockLocked"
              :hint="stockLocked ? 'Stock is system-managed (set only at creation).' : undefined"
            />
        </div>

        <BaseSelect
          v-model="form.categoryId"
          label="Category"
          :error="errors.categoryId"
        >
          <option value="">
            Select a category (optional)
          </option>
          <option
            v-for="cat in categories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.title }}
          </option>
        </BaseSelect>

        <ProductImagesUploader v-model="images" />

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
            Product is active and visible to customers
          </label>
        </div>
      </div>

      <!-- Description Tab -->
      <div
        v-if="showDescription"
        v-show="currentTab === 'description'"
        class="space-y-6"
      >
        <AdminFormField
          label="Landing Page Description"
          :error="errors.description"
        >
          <template #default="{ inputId }">
            <RichTextEditor
              :id="inputId"
              v-model="form.description"
              placeholder="Enter product description with rich formatting..."
            />
          </template>
        </AdminFormField>
      </div>

      <!-- Variants Tab -->
      <div
        v-if="showVariants"
        v-show="currentTab === 'variants'"
        class="space-y-6"
      >
        <slot name="variants" />
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="p-4 bg-red-50 border border-red-200 rounded-md mx-6 mb-6"
    >
      <p class="text-sm text-red-800">
        {{ errorMessage }}
      </p>
    </div>

    <!-- Actions Footer -->
    <div class="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
      <NuxtLink
        v-if="cancelTo"
        :to="cancelTo"
        class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </NuxtLink>
      <button
        type="submit"
        :disabled="submitting"
        class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ submitting ? submittingLabel : primaryLabel }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AdminFormField from '~/components/admin/FormField.vue'
import ProductImagesUploader from '~/components/admin/ProductImagesUploader.vue'
import RichTextEditor from '~/components/admin/RichTextEditor.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'
import BaseInput from '~/components/ui/BaseInput.vue'

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

interface ProductFormModel {
  title: string
  slug: string
  miniDescription: string
  description: string | null
  price: number
  stock: number
  categoryId: string | null | ''
  isActive: boolean
}

const form = defineModel<ProductFormModel>({ required: true })
const images = defineModel<ProductImage[]>('images', { required: true })

const props = defineProps<{ 
  categories: Category[]
  errors: Record<string, string>
  submitting?: boolean
  errorMessage?: string
  showVariants?: boolean
  showDescription?: boolean
  autoSlug?: boolean
  stockLocked?: boolean
  primaryLabel?: string
  submittingLabel?: string
  cancelTo?: string
}>()

const emit = defineEmits<{ (e: 'submit'): void }>()

const tabs = computed(() => {
  const base = [{ id: 'general', name: 'General' }]
  if (props.showDescription !== false) {
    base.push({ id: 'description', name: 'Landing Page Description' })
  }
  if (props.showVariants) {
    base.push({ id: 'variants', name: 'Variants' })
  }
  return base
})

const currentTab = ref('general')

const primaryLabel = computed(() => props.primaryLabel || 'Save Product')
const submittingLabel = computed(() => props.submittingLabel || 'Saving...')
const errorMessage = computed(() => props.errorMessage || '')
const showDescription = computed(() => props.showDescription !== false)
const showVariants = computed(() => props.showVariants === true)
const stockLocked = computed(() => props.stockLocked === true)

const lastAutoSlug = ref('')

watch(() => form.value.title, (newTitle) => {
  if (!props.autoSlug) return
  const generated = slugify(newTitle)
  if (!form.value.slug || form.value.slug === lastAutoSlug.value) {
    form.value.slug = generated
    lastAutoSlug.value = generated
  }
})

watch(images, (val) => {
  // Ensure there is always exactly one main image
  if (val.length === 0) return
  const hasMain = val.some(img => img.isMain)
  if (!hasMain) {
    val[0].isMain = true
  }
}, { deep: true })

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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
