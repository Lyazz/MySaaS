<script setup lang="ts">
import type { StoreLegalPageKey } from '~/shared/storefront/legal-pages'

const tenant = useState<any>('tenant')
const route = useRoute()

const validPages: StoreLegalPageKey[] = ['terms', 'privacy', 'returns', 'contact']

const pageKey = computed<StoreLegalPageKey | null>(() => {
  const raw = String(route.params.page || '').toLowerCase()
  return validPages.includes(raw as StoreLegalPageKey) ? (raw as StoreLegalPageKey) : null
})

const { resolveForPage } = useStoreLegalPageContent()

const pageData = computed(() => {
  if (!pageKey.value) return null
  return resolveForPage(pageKey.value)
})

const toPlainText = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const richContent = computed(() => {
  const raw = pageData.value?.content || ''
  if (!raw) return ''
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw

  const blocks = raw
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  if (!blocks.length) return ''

  return blocks.map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`).join('')
})

const pageDescription = computed(() => {
  const raw = pageData.value?.content || ''
  const plain = toPlainText(raw)
  return plain || pageData.value?.title || ''
})

if (!tenant.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

if (!pageKey.value || !pageData.value?.enabled) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

const requestURL = useRequestURL()
const canonicalUrl = computed(() => `${requestURL.protocol}//${requestURL.host}${route.path}`)
const tenantName = computed(() => tenant.value?.name || '')

useSeoMeta({
  title: () => `${pageData.value?.title || ''} | ${tenantName.value}`,
  description: () => pageDescription.value,
  ogTitle: () => `${pageData.value?.title || ''} | ${tenantName.value}`,
  ogDescription: () => pageDescription.value
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }]
})

definePageMeta({
  layout: false
})
</script>

<template>
  <NuxtLayout name="store">
    <section class="bg-slate-50 min-h-[65vh] py-10 sm:py-14">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <header class="px-6 sm:px-8 py-6 border-b border-slate-100">
            <h1 class="text-2xl sm:text-3xl font-semibold text-slate-900">{{ pageData?.title }}</h1>
          </header>
          <div class="px-6 sm:px-8 py-6 sm:py-8">
            <SafeRichText
              v-if="richContent"
              class="prose prose-slate max-w-none leading-7 text-slate-700"
              :html="richContent"
            />
          </div>
        </article>
      </div>
    </section>
  </NuxtLayout>
</template>
