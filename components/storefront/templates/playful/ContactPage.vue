<script setup lang="ts">
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'

const tenant = useState<any>('tenant')
const { t } = useI18n({ useScope: 'global' })
const storefrontContent = useStorefrontContent()
const tenantName = computed(() => tenant.value?.name || t('storefront.common.storeFallback'))

type ContactInfoRow = { id: string; kind: ContactInfoKind; label?: string | null; value: string; isActive?: boolean }
const contactInfos = useState<ContactInfoRow[]>('contactInfos', () => [])
const activeContactInfos = computed(() => (contactInfos.value || []).filter((i) => i && (i.isActive ?? true) !== false))
const kindDef = (kind: ContactInfoKind) => CONTACT_INFO_DEF_BY_KIND[kind]
const hrefFor = (info: ContactInfoRow) => buildContactInfoHref(info.kind, info.value)
const isExternalHref = (href: string) => /^https?:\/\//i.test(href)

const tints = ['var(--kw-pink-soft)', 'var(--kw-sky-soft)', 'var(--kw-lemon-soft)', 'var(--kw-mint-soft)', 'var(--kw-lilac-soft)']

useTenantSeo({
  title: t('storefront.pages.contact.seo.title', { tenant: tenantName.value }),
  description: t('storefront.pages.contact.seo.description', { tenant: tenantName.value })
})
</script>

<template>
  <div class="bg-[var(--kw-cream)] min-h-screen pb-20">
    <section class="kw-band-sky kw-scallop pt-12 pb-16 md:pt-16 md:pb-20">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <span
          class="kw-blob kw-float w-20 h-20 mx-auto mb-7 flex items-center justify-center"
          style="background: linear-gradient(140deg, var(--kw-sky), var(--kw-mint))"
        >
          <Icon
            name="lucide:message-circle"
            class="w-9 h-9 text-white"
          />
        </span>
        <p class="kw-kicker mb-3">
          {{ storefrontContent.footer.contact }}
        </p>
        <h1 class="kw-display text-3xl md:text-[3rem]">
          {{ t('storefront.pages.contact.heading', { tenant: tenantName }) }}
        </h1>
      </div>
    </section>

    <div class="max-w-3xl mx-auto px-4 sm:px-6 -mt-6">
      <div class="kw-card p-8 md:p-10">
        <p class="kw-lede text-center mb-9">
          {{ t('storefront.pages.contact.placeholder') }}
        </p>

        <div
          v-if="activeContactInfos.length"
          class="grid gap-3 sm:grid-cols-2"
        >
          <component
            :is="hrefFor(info) ? 'a' : 'div'"
            v-for="(info, index) in activeContactInfos"
            :key="info.id"
            :href="hrefFor(info) || undefined"
            :target="hrefFor(info) && isExternalHref(hrefFor(info)!) ? '_blank' : undefined"
            :rel="hrefFor(info) && isExternalHref(hrefFor(info)!) ? 'noopener noreferrer' : undefined"
            class="kw-card-flat flex items-center gap-3.5 p-4 transition-transform duration-300 hover:-translate-y-1"
          >
            <span
              class="w-11 h-11 kw-blob flex items-center justify-center flex-shrink-0"
              :style="{ background: tints[index % tints.length] }"
            >
              <Icon
                :name="kindDef(info.kind).iconName"
                class="w-5 h-5 text-[var(--kw-ink)]"
              />
            </span>
            <span class="min-w-0">
              <span
                v-if="info.label"
                class="block text-xs font-extrabold text-[var(--kw-ink-faint)]"
              >{{ info.label }}</span>
              <span class="block kw-title text-sm truncate">{{ info.value }}</span>
            </span>
          </component>
        </div>
      </div>
    </div>
  </div>
</template>
