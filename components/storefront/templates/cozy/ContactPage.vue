<script setup lang="ts">
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'

const tenant = useState<any>('tenant')
const { t } = useI18n({ useScope: 'global' })
const tenantName = computed(() => tenant.value?.name || t('storefront.common.storeFallback'))

useTenantSeo({
  title: t('storefront.pages.contact.seo.title', { tenant: tenantName.value }),
  description: t('storefront.pages.contact.seo.description', { tenant: tenantName.value })
})

type ContactInfoRow = { id: string; kind: ContactInfoKind; label?: string | null; value: string; isActive?: boolean }
const contactInfos = useState<ContactInfoRow[]>('contactInfos', () => [])
const rows = computed(() =>
  (contactInfos.value || [])
    .filter((i) => i && (i.isActive ?? true) !== false)
    .map((i) => ({ ...i, href: buildContactInfoHref(i.kind, i.value), def: CONTACT_INFO_DEF_BY_KIND[i.kind] }))
)
const isExternalHref = (href?: string | null) => Boolean(href && /^https?:\/\//i.test(href))
</script>

<template>
  <div class="ed-theme">
    <div class="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 py-14 md:py-24">
      <div class="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        <!-- Marque plate -->
        <div class="lg:col-span-5 order-2 lg:order-1">
          <div class="bg-[#FBF8F2] border border-[#DAD2C4] p-2">
            <div class="aspect-[4/5] bg-[#EFE8DA] flex items-center justify-center">
              <Icon name="lucide:mail" class="w-16 h-16 md:w-24 md:h-24 text-[#C4B8A4]" />
            </div>
          </div>
        </div>

        <!-- Text -->
        <div class="lg:col-span-7 order-1 lg:order-2">
          <p class="ed-kicker mb-6">{{ t('storefront.footer.contact') }}</p>
          <h1 class="ed-display text-4xl md:text-[3.5rem] leading-[1.06] text-[#262019]">
            {{ t('storefront.pages.contact.heading', { tenant: tenantName }) }}
          </h1>
          <span class="block h-px w-24 bg-[#B8532E] my-8" />
          <p class="text-[17px] leading-[1.75] text-[#4A4038] max-w-xl">
            {{ t('storefront.pages.contact.placeholder') }}
          </p>

          <dl v-if="rows.length" class="mt-10 divide-y divide-[#DAD2C4] border-y border-[#DAD2C4]">
            <div v-for="info in rows" :key="info.id" class="py-4 flex items-center gap-4">
              <Icon :name="info.def.iconName" class="w-4 h-4 text-[#B8532E] shrink-0" />
              <dt class="ed-label !mb-0 w-28 shrink-0">{{ info.label || info.def.label }}</dt>
              <dd class="min-w-0">
                <a
                  v-if="info.href"
                  :href="info.href"
                  class="ed-link ed-ui text-sm break-words"
                  :target="isExternalHref(info.href) ? '_blank' : undefined"
                  :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
                >{{ info.value }}</a>
                <span v-else class="ed-ui text-sm text-[#4A4038]">{{ info.value }}</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>
