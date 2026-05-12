<script setup lang="ts">
import type { StoreLegalPageKey } from '~/shared/storefront/legal-pages'
import { getPlatformLegalPage } from '~/shared/platform/legal-pages'

const tenant = useState<any>('tenant')
const route = useRoute()

const validPages: StoreLegalPageKey[] = ['terms', 'privacy', 'returns', 'contact']
const rawPage = computed(() => String(route.params.page || '').toLowerCase())

const pageKey = computed<StoreLegalPageKey | null>(() => {
  return validPages.includes(rawPage.value as StoreLegalPageKey) ? (rawPage.value as StoreLegalPageKey) : null
})

const { resolveForPage } = useStoreLegalPageContent()

const pageData = computed(() => {
  if (!pageKey.value) return null
  return resolveForPage(pageKey.value)
})

const platformPage = computed(() => {
  if (tenant.value) return null
  return getPlatformLegalPage(rawPage.value)
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
  if (platformPage.value) return platformPage.value.description
  const raw = pageData.value?.content || ''
  const plain = toPlainText(raw)
  return plain || pageData.value?.title || ''
})

if (!tenant.value && !platformPage.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

if (tenant.value && (!pageKey.value || !pageData.value?.enabled)) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

const requestURL = useRequestURL()
const canonicalUrl = computed(() => `${requestURL.protocol}//${requestURL.host}${route.path}`)
const pageTitle = computed(() => platformPage.value?.title || pageData.value?.title || '')
const titleSuffix = computed(() => tenant.value?.name || 'Swekly')

useSeoMeta({
  title: () => `${pageTitle.value} | ${titleSuffix.value}`,
  description: () => pageDescription.value,
  ogTitle: () => `${pageTitle.value} | ${titleSuffix.value}`,
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
  <NuxtLayout
    v-if="platformPage"
    name="default"
  >
    <section class="cinematic-container !max-w-[72rem] px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div class="mb-8">
        <NuxtLink
          to="/"
          class="cinematic-link inline-flex items-center gap-2 text-sm"
        >
          <Icon
            name="lucide:arrow-left"
            class="h-4 w-4"
          />
          Back to Swekly
        </NuxtLink>
      </div>

      <article class="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
        <header class="border-b border-white/[0.08] pb-8">
          <p class="cinematic-eyebrow mb-4">
            Policy
          </p>
          <h1 class="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            {{ platformPage.title }}
          </h1>
          <p class="mt-4 max-w-3xl text-base leading-7 text-[color:var(--m-text-dim)]">
            {{ platformPage.description }}
          </p>
          <p class="mt-5 text-sm text-[color:var(--m-text-muted)]">
            Last updated: {{ platformPage.updatedAt }}
          </p>
        </header>

        <div class="divide-y divide-white/[0.08]">
          <section
            v-for="section in platformPage.sections"
            :key="section.heading"
            class="py-7"
          >
            <h2 class="text-xl font-semibold text-white">
              {{ section.heading }}
            </h2>
            <div class="mt-4 space-y-4 text-[15px] leading-7 text-[color:var(--m-text-dim)]">
              <p
                v-for="paragraph in section.paragraphs"
                :key="paragraph"
              >
                {{ paragraph }}
              </p>
              <ul
                v-if="section.bullets?.length"
                class="space-y-2 pl-5"
              >
                <li
                  v-for="bullet in section.bullets"
                  :key="bullet"
                  class="list-disc"
                >
                  {{ bullet }}
                </li>
              </ul>
            </div>
          </section>
        </div>
      </article>
    </section>
  </NuxtLayout>

  <NuxtLayout
    v-else
    name="store"
  >
    <section class="bg-slate-50 min-h-[65vh] py-10 sm:py-14">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <header class="px-6 sm:px-8 py-6 border-b border-slate-100">
            <h1 class="text-2xl sm:text-3xl font-semibold text-slate-900">
              {{ pageData?.title }}
            </h1>
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
