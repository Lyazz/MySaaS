<script setup lang="ts">
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'

const tenant = useState<any>('tenant')
const { t } = useI18n({ useScope: 'global' })
const tenantName = computed(() => tenant.value?.name || t('storefront.common.storeFallback'))

useTenantSeo({
  title: t('storefront.pages.contact.seo.title', { tenant: tenantName.value }),
  description: t('storefront.pages.contact.seo.description', { tenant: tenantName.value })
})

/*
 * These three cards used to hold one real merchant's phone and email, so every
 * classic store published another tenant's contact details. Read the tenant's
 * own rows instead, the way cozy and playful already do.
 */
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
  <div class="max-w-5xl mx-auto px-4 py-20 text-center">
    <h1 class="text-5xl font-serif font-bold text-slate-900 mb-12 tracking-tight">
      {{ t('storefront.pages.contact.classic.heading') }}
    </h1>

    <div
      v-if="rows.length"
      class="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto"
    >
      <div
        v-for="info in rows"
        :key="info.id"
        class="space-y-4"
      >
        <div class="w-12 h-12 bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <Icon
            :name="info.def.iconName"
            class="w-5 h-5 text-slate-900"
          />
        </div>
        <h3 class="font-bold text-xs uppercase tracking-widest text-slate-900">
          {{ info.label || info.def.label }}
        </h3>
        <p class="text-slate-500 text-sm break-words">
          <a
            v-if="info.href"
            :href="info.href"
            class="hover:text-slate-900 transition-colors"
            :target="isExternalHref(info.href) ? '_blank' : undefined"
            :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
          >{{ info.value }}</a>
          <span v-else>{{ info.value }}</span>
        </p>
      </div>
    </div>

    <p
      v-else
      class="text-slate-600 leading-relaxed max-w-2xl mx-auto"
    >
      {{ t('storefront.pages.contact.placeholder') }}
    </p>
  </div>
</template>
