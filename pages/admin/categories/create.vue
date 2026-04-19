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
            <span class="ml-1" style="color: var(--text-tertiary)">{{ t('admin.pages.categories.create.breadcrumb') }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Header -->
    <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold" style="color: var(--text-primary)">
          {{ t('admin.pages.categories.create.title') }}
        </h2>
        <p class="mt-1" style="color: var(--text-secondary)">
          {{ t('admin.pages.categories.create.subtitle') }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <NuxtLink
          to="/admin/categories"
          class="px-4 py-2 rounded-md text-sm font-medium" style="border: 1px solid var(--surface-border); color: var(--text-secondary); background: var(--surface-1)"
        >
          {{ t('admin.common.cancel') }}
        </NuxtLink>
        <button
          form="category-create-form"
          type="submit"
          :disabled="submitting"
          class="px-4 py-2 [background:var(--brand)] text-white rounded-md hover:[background:color-mix(in_srgb,var(--brand)_80%,#000)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
        >
          <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
          {{ submitting ? t('admin.common.creating') : t('admin.pages.categories.create.submit') }}
        </button>
      </div>
    </div>

    <!-- Form -->
    <form
      id="category-create-form"
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
        :hint="t('admin.forms.category.slug.hintCreate')"
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

      <div class="flex justify-end space-x-3 pt-4" style="border-top: 1px solid var(--surface-border)">
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
          {{ submitting ? t('admin.common.creating') : t('admin.pages.categories.create.submit') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SingleImageUploader from '~/components/admin/SingleImageUploader.vue'
import BaseInput from '~/components/ui/BaseInput.vue'
import BaseSelect from '~/components/ui/BaseSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  titleKey: 'admin.pages.categories.create.metaTitle'
})

const authStore = useAuthStore()
const router = useRouter()
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
  parent?: { title: string } | null
}
const categories = ref<Category[]>([])
type CategoryOption = Category & { depth: number }
const availableParents = computed<CategoryOption[]>(() => {
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
const categoryOptionLabel = (category: CategoryOption) => `${'-> '.repeat(category.depth)}${category.title}`

const errors = ref<Record<string, string>>({})
const errorMessage = ref('')
const submitting = ref(false)

watch(() => form.value.title, (newTitle) => {
  if (!form.value.slug || form.value.slug === slugify(form.value.title)) {
    form.value.slug = slugify(newTitle)
  }
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function handleSubmit() {
  errors.value = {}
  errorMessage.value = ''
  submitting.value = true

  try {
    await $fetch('/api/admin/categories', {
      method: 'POST',
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

    router.push('/admin/categories')
  } catch (error: any) {
    console.error('Failed to create category:', error)

    if (error.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else {
      errorMessage.value = t('admin.pages.categories.create.errors.createFailed')
    }
  } finally {
    submitting.value = false
  }
}

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

onMounted(() => {
  fetchCategories()
})
</script>
