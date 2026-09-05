<script setup lang="ts">
import { platformLegalLinks, PLATFORM_LEGAL_PAGES } from '~/shared/platform/legal-pages'

const tenant = useState<any>('tenant')

if (tenant.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

useSeoMeta({
  title: 'Policies | Swekly',
  description: 'Swekly legal policies for platform terms, privacy, cookies, billing, and subscriptions.',
  ogTitle: 'Policies | Swekly',
  ogDescription: 'Swekly legal policies for platform terms, privacy, cookies, billing, and subscriptions.'
})

const requestURL = useRequestURL()
const canonicalUrl = computed(() => `${requestURL.protocol}//${requestURL.host}/legal`)

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }]
})

definePageMeta({
  layout: false
})
</script>

<template>
  <NuxtLayout name="default">
    <section class="cinematic-container !max-w-[72rem] px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <header class="max-w-4xl">
        <p class="cinematic-eyebrow mb-4">
          Policies
        </p>
        <h1 class="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
          Policies
        </h1>
        <p class="mt-4 text-base leading-7 text-[color:var(--m-text-dim)]">
          Platform terms, privacy information, cookie details, billing, and subscription terms for Swekly.
        </p>
      </header>

      <div class="mt-10 grid gap-4 md:grid-cols-2">
        <NuxtLink
          v-for="link in platformLegalLinks"
          :key="link.to"
          :to="link.to"
          class="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition hover:border-lime-neon/40 hover:bg-white/[0.05]"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-white">
                {{ PLATFORM_LEGAL_PAGES[link.key].title }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-[color:var(--m-text-dim)]">
                {{ PLATFORM_LEGAL_PAGES[link.key].description }}
              </p>
            </div>
            <Icon
              name="lucide:arrow-up-right"
              class="mt-1 h-4 w-4 text-lime-neon opacity-70 transition group-hover:opacity-100"
            />
          </div>
        </NuxtLink>
      </div>
    </section>
  </NuxtLayout>
</template>
