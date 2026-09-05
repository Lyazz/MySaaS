<script setup lang="ts">
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'

const { t } = useI18n({ useScope: 'global' })

/*
 * The three info blocks used to print a New York address and a +1 phone number
 * that belonged to no one, and the form popped an alert claiming the message
 * had been sent while dropping it. There is no inbound-message endpoint, so the
 * form composes a mail to the store's own address and only shows when the
 * merchant has published one.
 */
type ContactInfoRow = { id: string; kind: ContactInfoKind; label?: string | null; value: string; isActive?: boolean }
const contactInfos = useState<ContactInfoRow[]>('contactInfos', () => [])
const activeContactInfos = computed(() => (contactInfos.value || []).filter((i) => i && (i.isActive ?? true) !== false))
const rows = computed(() =>
  activeContactInfos.value
    .filter((i) => CONTACT_INFO_DEF_BY_KIND[i.kind].category !== 'social')
    .map((i) => ({ ...i, href: buildContactInfoHref(i.kind, i.value), def: CONTACT_INFO_DEF_BY_KIND[i.kind] }))
)
const isExternalHref = (href?: string | null) => Boolean(href && /^https?:\/\//i.test(href))

const storeEmail = computed(() => activeContactInfos.value.find((i) => i.kind === 'email')?.value || '')

const form = reactive({
    name: '',
    email: '',
    message: ''
})

const mailtoHref = computed(() => {
    if (!storeEmail.value) return ''
    const subject = t('storefront.pages.contact.mailSubject', { name: form.name || '—' })
    const body = [form.message, '', form.name, form.email].filter(Boolean).join('\n')
    return `mailto:${storeEmail.value}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-24 items-start grid grid-cols-1 lg:grid-cols-2 gap-16">
    <!-- Info Section -->
    <div>
      <h1 class="font-street text-7xl md:text-8xl w-full mb-12 uppercase leading-none bg-black text-white p-4 shadow-[12px_12px_0_0_var(--brand)] inline-block">
        {{ t('storefront.templates.street.contact.titlePrefix') }}<br>{{ t('storefront.templates.street.contact.titleAccent') }}
      </h1>

      <div
        v-if="rows.length"
        class="space-y-12 font-mono text-lg uppercase ps-4 border-s-4 border-brand"
      >
        <div
          v-for="info in rows"
          :key="info.id"
        >
          <h3 class="font-bold mb-2 text-gray-400 text-xs">
            {{ info.label || info.def.label }}
          </h3>
          <a
            v-if="info.href"
            :href="info.href"
            class="text-2xl font-bold hover:bg-brand hover:text-black inline-block px-1 break-words"
            :target="isExternalHref(info.href) ? '_blank' : undefined"
            :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
          >{{ info.value }}</a>
          <p
            v-else
            class="text-2xl font-bold break-words"
          >{{ info.value }}</p>
        </div>
      </div>

      <p
        v-else
        class="font-mono text-lg uppercase ps-4 border-s-4 border-brand leading-relaxed text-gray-800"
      >
        {{ t('storefront.pages.contact.placeholder') }}
      </p>
    </div>

    <!-- Contact Form -->
    <div
      v-if="storeEmail"
      class="bg-gray-100 p-8 md:p-12 border-4 border-black shadow-[16px_16px_0_0_#000]"
    >
      <form class="space-y-8">
        <div>
          <label class="block font-street text-2xl uppercase mb-2">{{ t('storefront.templates.street.contact.form.name.label') }}</label>
          <input
            v-model="form.name"
            type="text"
            :placeholder="t('storefront.templates.street.contact.form.name.placeholder')"
            class="w-full bg-white border-2 border-black p-4 font-mono text-lg focus:outline-none focus:shadow-[4px_4px_0_0_var(--brand)] placeholder:text-gray-400"
          >
        </div>

        <div>
          <label class="block font-street text-2xl uppercase mb-2">{{ t('storefront.templates.street.contact.form.email.label') }}</label>
          <input
            v-model="form.email"
            type="email"
            :placeholder="t('storefront.templates.street.contact.form.email.placeholder')"
            class="w-full bg-white border-2 border-black p-4 font-mono text-lg focus:outline-none focus:shadow-[4px_4px_0_0_var(--brand)] placeholder:text-gray-400"
          >
        </div>

        <div>
          <label class="block font-street text-2xl uppercase mb-2">{{ t('storefront.templates.street.contact.form.message.label') }}</label>
          <textarea
            v-model="form.message"
            rows="4"
            :placeholder="t('storefront.templates.street.contact.form.message.placeholder')"
            class="w-full bg-white border-2 border-black p-4 font-mono text-lg focus:outline-none focus:shadow-[4px_4px_0_0_var(--brand)] placeholder:text-gray-400 resize-none"
          />
        </div>

        <a
          :href="mailtoHref"
          class="w-full bg-black text-white font-street text-3xl uppercase py-4 border-2 border-transparent hover:bg-brand hover:text-black hover:border-black transition-colors flex items-center justify-center"
        >
          {{ t('storefront.templates.street.contact.form.send') }}
        </a>
      </form>
    </div>
  </div>
</template>
