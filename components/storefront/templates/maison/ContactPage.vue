<script setup lang="ts">
import { CONTACT_INFO_DEF_BY_KIND, buildContactInfoHref, type ContactInfoKind } from '~/shared/contact-infos'

const storefrontContent = useStorefrontContent()
const { t } = useI18n({ useScope: 'global' })
const tenant = useState<any>('tenant')
const tenantName = computed(() => tenant.value?.name || t('storefront.common.storeFallback'))

/*
 * This page was written in French only, printed "Algérie" and another brand's
 * tagline as if they were the merchant's, and its submit popped an alert
 * claiming the message had been sent while dropping it. There is no
 * inbound-message endpoint, so the form composes a mail to the store's own
 * address and only shows when the merchant has published one.
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
  <div class="contact">
    <!-- Page header -->
    <div class="contact__header">
      <div class="contact__header-inner">
        <span class="at-label">{{ t('storefront.footer.contactUs') }}</span>
        <h1 class="contact__title">{{ storefrontContent.nav.contact }}</h1>
      </div>
    </div>

    <div class="contact__body">
      <!-- Info panel -->
      <aside class="contact__info">
        <div class="contact__info-rule" />
        <div>
          <h2 class="contact__info-title">
            <em>{{ t('storefront.pages.contact.heading', { tenant: tenantName }) }}</em>
          </h2>
          <p class="contact__info-desc">
            {{ t('storefront.pages.contact.intro') }}
          </p>

          <div
            v-if="rows.length"
            class="contact__info-items"
          >
            <div
              v-for="info in rows"
              :key="info.id"
              class="contact__info-item"
            >
              <div class="contact__info-icon">
                <Icon
                  :name="info.def.iconName"
                  class="w-3.5 h-3.5"
                />
              </div>
              <a
                v-if="info.href"
                :href="info.href"
                :target="isExternalHref(info.href) ? '_blank' : undefined"
                :rel="isExternalHref(info.href) ? 'noopener noreferrer' : undefined"
              >{{ info.value }}</a>
              <span v-else>{{ info.value }}</span>
            </div>
          </div>

          <p class="contact__info-tagline">{{ tenantName }}</p>
        </div>
      </aside>

      <!-- Form panel -->
      <div
        v-if="storeEmail"
        class="contact__form-panel"
      >
        <form class="contact__form">
          <div class="contact__field">
            <label class="contact__label">{{ t('storefront.pages.contact.form.name.label') }}</label>
            <input
              v-model="form.name"
              type="text"
              :placeholder="t('storefront.pages.contact.form.name.placeholder')"
              class="at-input"
            >
          </div>

          <div class="contact__field">
            <label class="contact__label">{{ t('storefront.pages.contact.form.email.label') }}</label>
            <input
              v-model="form.email"
              type="email"
              :placeholder="t('storefront.pages.contact.form.email.placeholder')"
              class="at-input"
            >
          </div>

          <div class="contact__field">
            <label class="contact__label">{{ t('storefront.pages.contact.form.message.label') }}</label>
            <textarea
              v-model="form.message"
              rows="6"
              :placeholder="t('storefront.pages.contact.form.message.placeholder')"
              class="at-input contact__textarea"
            />
          </div>

          <a
            :href="mailtoHref"
            class="at-btn-solid"
          >
            {{ t('storefront.pages.contact.form.send') }}
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
              <path d="M1 4h12M8 1l5 3-5 3" stroke="currentColor" stroke-width="0.85" />
            </svg>
          </a>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact { min-height: 80vh; }

/* Header */
.contact__header {
  border-bottom: 1px solid var(--at-border);
  background: var(--at-grad-shell);
  padding: clamp(48px, 8vw, 96px) clamp(20px, 6vw, 96px) clamp(32px, 5vw, 56px);
  border-end-end-radius: clamp(40px, 7vw, 110px);
}
.contact__header-inner { max-width: 1400px; margin: 0 auto; }
.contact__title {
  font-family: var(--at-f-display);
  font-size: clamp(3rem, 7vw, 7rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.0;
  color: var(--at-cream);
  margin-top: 10px;
}

/* Body */
.contact__body {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 clamp(20px, 6vw, 96px);
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  background: var(--at-border);
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-lg);
  box-shadow: var(--at-shadow-md);
  overflow: hidden;
  margin-top: clamp(32px, 5vw, 56px);
  margin-bottom: clamp(32px, 5vw, 56px);
}
@media (min-width: 768px) {
  .contact__body { grid-template-columns: 1fr 1.4fr; }
}

/* Info panel */
.contact__info {
  background: var(--at-surface);
  padding: clamp(40px, 6vw, 72px) clamp(24px, 4vw, 56px);
  display: flex;
  align-items: flex-start;
  gap: 28px;
}
.contact__info-rule {
  width: 2px;
  flex-shrink: 0;
  border-radius: 2px;
  background: linear-gradient(to bottom, var(--at-gold), transparent);
  align-self: stretch;
  min-height: 80px;
}
.contact__info-title {
  font-family: var(--at-f-display);
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 600;
  letter-spacing: -0.028em;
  line-height: 1.05;
  color: var(--at-cream);
  margin-bottom: 20px;
}
.contact__info-title em {
  font-style: italic;
  font-weight: 400;
  color: var(--at-gold);
}
.contact__info-desc {
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  line-height: 1.9;
  color: var(--at-sub);
  max-width: 300px;
  margin-bottom: 32px;
}
.contact__info-items {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 40px;
}
.contact__info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: var(--at-sub);
}
.contact__info-icon {
  width: 30px;
  height: 30px;
  background: var(--at-grad-green);
  border-radius: var(--at-r-pill);
  box-shadow: var(--at-shadow-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFBF0;
  flex-shrink: 0;
}
.contact__info-tagline {
  font-family: var(--at-f-mono);
  font-size: 8px;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-muted);
}

/* Form panel */
.contact__form-panel {
  background: var(--at-grad-paper);
  padding: clamp(40px, 6vw, 72px) clamp(24px, 4vw, 56px);
}
.contact__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 560px;
}
.contact__field { display: flex; flex-direction: column; gap: 8px; }
.contact__label {
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--at-sub);
}
.contact__textarea {
  resize: none;
  height: 140px;
}
</style>
