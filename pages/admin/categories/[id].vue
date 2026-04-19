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
            to="/admin/categories"
            class="hover:[color:var(--brand)]" style="color: var(--text-secondary)"
          >
            {{ t('admin.nav.categories') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6" style="color: var(--text-tertiary)" />
            <span class="ml-1" style="color: var(--text-tertiary)">{{ t('admin.pages.categories.edit.breadcrumb') }}</span>
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
        {{ t('admin.pages.categories.edit.loading') }}
      </p>
    </div>

    <div v-else>
      <!-- Header -->
      <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold" style="color: var(--text-primary)">
            {{ t('admin.pages.categories.edit.title') }}
          </h2>
          <p class="mt-1" style="color: var(--text-secondary)">
            {{ t('admin.pages.categories.edit.subtitle') }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center space-x-2 p-1.5 rounded-lg" style="background: var(--surface-2); border: 1px solid var(--surface-border)">
            <span class="text-xs font-medium px-2" style="color: var(--text-tertiary)">{{ t('admin.pages.categories.edit.links.label') }}:</span>
            <a
              :href="categoryUrl"
              target="_blank"
              class="p-1 [color:var(--brand)] hover:[background:rgba(var(--brand-rgb)/0.08)] rounded"
              :title="t('admin.pages.categories.edit.links.openCategory')"
            >
              <Icon name="lucide:external-link" class="w-4 h-4" />
            </a>
            <button
              class="p-1 rounded" style="color: var(--text-tertiary)"
              :title="t('admin.pages.categories.edit.links.copyCategory')"
              @click="copyUrl(categoryUrl)"
            >
              <Icon name="lucide:copy" class="w-4 h-4" />
            </button>
          </div>

          <NuxtLink
            to="/admin/categories"
            class="px-4 py-2 rounded-md text-sm font-medium" style="border: 1px solid var(--surface-border); color: var(--text-secondary); background: var(--surface-1)"
          >
            {{ t('admin.common.cancel') }}
          </NuxtLink>
          <button
            form="category-edit-form"
            type="submit"
            :disabled="submitting || loading"
            class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
          >
            <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
            {{ submitting ? t('admin.common.updating') : t('admin.pages.categories.edit.submit') }}
          </button>
        </div>
      </div>

      <form
        id="category-edit-form"
        class="ui-card p-6 space-y-6"
        @submit.prevent="handleSubmit"
      >
        <BaseInput
          v-model="form.title"
          :label="t('admin.forms.category.title.label')"
          :error="errors.title"
          :placeholder="t('admin.forms.category.title.placeholder')"
          required
        />

        <BaseInput
          v-model="form.slug"
          :label="t('admin.forms.category.slug.label')"
          :error="errors.slug"
          :placeholder="t('admin.forms.category.slug.placeholder')"
          :hint="t('admin.forms.category.slug.hintEdit')"
          required
          pattern="[a-z0-9-]+"
        />

        <BaseSelect
          v-model="form.parentId"
          :label="t('admin.forms.category.parent.label', 'Parent Category')"
          :hint="t('admin.forms.category.parent.hint', 'Optional: choose a parent to create a subcategory')"
        >
          <option value="">
            {{ t('admin.forms.category.parent.none', 'No parent (top-level category)') }}
          </option>
          <option
            v-for="cat in availableParents"
            :key="cat.id"
            :value="cat.id"
          >
            {{ categoryOptionLabel(cat) }}
          </option>
        </BaseSelect>

        <SingleImageUploader
          v-model="form.imageUrl"
          mode="generic"
          :label="t('admin.forms.category.image.label')"
          :hint="t('admin.forms.category.image.hint')"
        />

        <div
          v-if="errorMessage"
          class="p-4 bg-red-50 border border-red-200 rounded-md"
        >
          <p class="text-sm text-red-800">
            {{ errorMessage }}
          </p>
        </div>

        <div class="flex justify-between items-center pt-4" style="border-top: 1px solid var(--surface-border)">
          <button
            type="button"
            class="text-red-600 hover:text-red-700 text-sm font-medium"
            @click="showDeleteModal = true"
          >
            {{ t('admin.pages.categories.edit.deleteLink') }}
          </button>
          <div class="space-x-3">
            <NuxtLink
              to="/admin/categories"
              class="px-4 py-2 rounded-md text-sm font-medium" style="border: 1px solid var(--surface-border); color: var(--text-secondary); background: var(--surface-1)"
            >
              {{ t('admin.common.cancel') }}
            </NuxtLink>
            <button
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
            >
              <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
              {{ submitting ? t('admin.common.updating') : t('admin.pages.categories.edit.submit') }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <AdminConfirmModal
      v-model="showDeleteModal"
      :title="t('admin.pages.categories.edit.deleteModal.title')"
      :message="confirmMessage"
      :confirm-text="t('admin.common.delete')"
      :cancel-text="t('admin.common.cancel')"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { toTenantHost, useRequestOrigin } from '~/composables/host'
import { usePlatformBaseDomain } from '~/composables/platformBaseDomain'
import SingleImageUploader from '~/components/admin/SingleImageUploader.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.categories.edit.metaTitle'
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n({ useScope: 'global' })

const form = ref({
  title: '',
  slug: '',
  parentId: '',
  imageUrl: null as string | null
})

type Category = {
  id: string
  title: string
  displayTitle?: string
  isSubcategory?: boolean
  parentId?: string | null
  parent?: { id: string; title: string } | null
}
const categories = ref<Category[]>([])

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)
const loading = ref(true)
const showDeleteModal = ref(false)
const lastAutoSlug = ref('')

const tenantSlug = computed(() => authStore.user?.tenant?.slug as string | undefined)
type CategoryOption = Category & { depth: number }
const availableParents = computed<CategoryOption[]>(() => {
  const source = categories.value.filter((category) => category.id !== String(route.params.id))
  const byParent = new Map<string | null, Category[]>()
  for (const category of source) {
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
  for (const category of source) {
    if (!seen.has(category.id)) visit(category, 0)
  }

  return ordered
})
const categoryOptionLabel = (category: CategoryOption) => `${'-> '.repeat(category.depth)}${category.title}`
const confirmMessage = computed(() => {
  if (form.value.title) {
    return t('admin.pages.categories.edit.deleteModal.messageWithTitle', { title: form.value.title })
  }
  return t('admin.pages.categories.edit.deleteModal.message')
})

const categoryUrl = computed(() => {
  const tenantSlugValue = tenantSlug.value
  if (!tenantSlugValue || !form.value.slug) return '/'
  const { protocol, host } = useRequestOrigin()
  const platformBaseDomain = usePlatformBaseDomain()
  const tenantHost = toTenantHost(host, tenantSlugValue, { platformBaseDomain })
  return `${protocol}://${tenantHost}/c/${form.value.slug}`
})

watch(() => form.value.title, (newTitle) => {
  const generated = slugify(newTitle)
  if (!form.value.slug || form.value.slug === lastAutoSlug.value) {
    form.value.slug = generated
    lastAutoSlug.value = generated
  }
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fetchCategory() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await $fetch(`/api/admin/categories/${route.params.id}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })

    form.value.title = data.title
    form.value.slug = data.slug
    form.value.parentId = data.parentId || ''
    form.value.imageUrl = data.imageUrl ?? null
    lastAutoSlug.value = slugify(data.title)
  } catch (error: any) {
    console.error('Failed to load category:', error)
    errorMessage.value = error.data?.statusMessage || t('admin.pages.categories.edit.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  errors.value = {}
  errorMessage.value = ''
  submitting.value = true

  try {
    await $fetch(`/api/admin/categories/${route.params.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      },
      body: {
        title: form.value.title,
        slug: form.value.slug,
        parentId: form.value.parentId || null,
        imageUrl: form.value.imageUrl
      }
    })
  } catch (error: any) {
    console.error('Failed to update category:', error)
    errorMessage.value = error.data?.statusMessage || t('admin.pages.categories.edit.errors.updateFailed')
  } finally {
    submitting.value = false
  }
}

async function handleDelete() {
  try {
    await $fetch(`/api/admin/categories/${route.params.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    router.push('/admin/categories')
  } catch (error) {
    console.error('Failed to delete category:', error)
    alert(t('admin.pages.categories.edit.errors.deleteFailed'))
  }
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
  } catch (err) {
    console.error('Failed to copy link:', err)
  }
}

onMounted(() => {
  fetchCategories()
  fetchCategory()
})

async function fetchCategories() {
  try {
    const data = await $fetch('/api/admin/categories', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    categories.value = Array.isArray(data) ? (data as Category[]) : []
  } catch (error) {
    console.error('Failed to fetch categories for parent selection:', error)
  }
}
</script>
