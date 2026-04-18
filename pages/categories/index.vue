<script setup lang="ts">
const categoriesUrl = useTenantApiUrl('/api/categories')
const { t } = useI18n({ useScope: 'global' })

type Category = {
  id: string
  title: string
  displayTitle?: string
  parentId?: string | null
  slug: string
  imageUrl?: string | null
  parent?: { id: string; title: string } | null
}

const categoryDisplayTitle = (category: Category): string => {
  return category.parentId ? `-> ${category.title}` : category.title
}

const { data: categories, error } = await useFetch<Category[]>(categoriesUrl, {
  headers: useTenantApiHeaders()
})

if (error.value) {
  throw createError({ statusCode: 500, statusMessage: t('storefront.pages.categories.errors.loadFailed') })
}

useTenantSeo({
  title: t('storefront.pages.categories.seo.title'),
  description: t('storefront.pages.categories.seo.description')
})

definePageMeta({
  middleware: 'tenant-only',
  layout: 'store'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-12">
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight sm:text-4xl font-sans">
          {{ t('storefront.pages.categories.title') }}
        </h1>
        <p class="mt-4 text-lg text-gray-500 font-sans">
          {{ t('storefront.pages.categories.subtitle') }}
        </p>
      </div>

      <!-- Categories Grid -->
      <div
        v-if="categories && categories.length > 0"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <NuxtLink
          v-for="category in categories"
          :key="category.id"
          :to="`/c/${category.slug}`"
          class="group bg-white rounded-xl border border-gray-200 flex flex-col hover:shadow-lg hover:border-brand-300 transition-all duration-300 relative overflow-hidden"
        >
          <div class="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
            <img
              v-if="category.imageUrl"
              :src="category.imageUrl"
              :alt="categoryDisplayTitle(category)"
              class="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 bg-white"
            >
            <div
              v-else
              class="w-full h-full bg-gradient-to-br from-slate-100 via-white to-slate-50"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
            <div class="absolute inset-0 flex items-end p-6">
              <div class="text-left">
                <h3 class="text-xl font-bold text-white drop-shadow font-sans">
                  {{ categoryDisplayTitle(category) }}
                </h3>
                <div class="mt-3 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/90 text-brand-700 shadow-sm">
                  {{ t('storefront.pages.categories.card.viewCollection') }}
                  <span class="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
                </div>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="text-center py-24 bg-white rounded-xl border border-dashed border-gray-300"
      >
        <h3 class="mt-2 text-sm font-medium text-gray-900 font-sans">
          {{ t('storefront.pages.categories.empty.title') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500 font-sans">
          {{ t('storefront.pages.categories.empty.subtitle') }}
        </p>
      </div>
    </div>
  </div>
</template>
