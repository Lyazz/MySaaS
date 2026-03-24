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
            class="text-gray-700 hover:text-teal-600"
          >
            {{ t('admin.nav.categories') }}
          </NuxtLink>
        </li>
        <li aria-current="page">
          <div class="flex items-center">
            <Icon name="lucide:chevron-right" class="w-6 h-6 text-gray-400" />
            <span class="ml-1 text-gray-500">{{ t('admin.pages.categories.create.breadcrumb') }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Header -->
    <div class="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">
          {{ t('admin.pages.categories.create.title') }}
        </h2>
        <p class="text-gray-600 mt-1">
          {{ t('admin.pages.categories.create.subtitle') }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <NuxtLink
          to="/admin/categories"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {{ t('admin.common.cancel') }}
        </NuxtLink>
        <button
          form="category-create-form"
          type="submit"
          :disabled="submitting"
          class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
        >
          <Icon v-if="submitting" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
          {{ submitting ? t('admin.common.creating') : t('admin.pages.categories.create.submit') }}
        </button>
      </div>
    </div>

    <!-- Form -->
    <form
      id="category-create-form"
      class="bg-white rounded-lg shadow p-6 space-y-6"
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

      <SingleImageUploader
        v-model="form.imageUrl"
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

      <div class="flex justify-end space-x-3 pt-4 border-t">
        <NuxtLink
          to="/admin/categories"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {{ t('admin.common.cancel') }}
        </NuxtLink>
        <button
          type="submit"
          :disabled="submitting"
          class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
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
  imageUrl: null as string | null
})

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
</script>
