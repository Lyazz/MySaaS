<script setup lang="ts">
const tenant = useState<any>('tenant')
const storeSettings = useState<any>('storeSettings')
// "Pistachio" was the design reference, not a tenant: never show it to a shopper.
const { t } = useI18n({ useScope: 'global' })
const tenantName = computed(() => tenant.value?.name || t('storefront.common.storeFallback'))
</script>

<template>
  <div class="about">
    <!-- Hero -->
    <div class="about__hero">
      <div class="about__hero-inner">
        <div class="about__hero-rule" />
        <div class="about__hero-text">
          <span class="at-label" style="animation:at-fade-up 0.6s ease forwards">{{ t('storefront.templates.maison.about.kicker') }}</span>
          <h1 class="about__title">
            <em>{{ t('storefront.pages.about.heading', { tenant: tenantName }) }}</em>
          </h1>
        </div>
      </div>
      <!-- decorative circles -->
      <div class="about__hero-orb about__hero-orb--1" />
      <div class="about__hero-orb about__hero-orb--2" />
    </div>

    <div class="about__body">
      <!-- Main description -->
      <section class="about__desc-section">
        <div class="about__desc-num">01</div>
        <div class="about__desc-content">
          <p class="about__desc-lead">
            {{ storeSettings?.description || t('storefront.templates.maison.about.lead') }}
          </p>
          <p class="about__desc-body">
            {{ t('storefront.templates.maison.about.body') }}
          </p>
        </div>
      </section>

      <div class="about__divider" />

      <!-- Values -->
      <section class="about__values-section">
        <div class="about__section-head">
          <div class="about__desc-num">02</div>
          <h2 class="about__section-title">{{ t('storefront.templates.maison.about.valuesTitle') }}</h2>
        </div>

        <div class="about__values-grid">
          <div class="about__value-card">
            <div class="about__value-num">01</div>
            <div class="about__value-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z" stroke="currentColor" stroke-width="0.75"/>
                <path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="0.75"/>
              </svg>
            </div>
            <h3 class="about__value-title">{{ t('storefront.templates.maison.about.values.quality.title') }}</h3>
            <p class="about__value-text">{{ t('storefront.templates.maison.about.values.quality.text') }}</p>
          </div>

          <div class="about__value-card about__value-card--accent">
            <div class="about__value-num">02</div>
            <div class="about__value-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="14" height="14" stroke="currentColor" stroke-width="0.75"/>
                <path d="M7 10h6M10 7v6" stroke="currentColor" stroke-width="0.75"/>
              </svg>
            </div>
            <h3 class="about__value-title">{{ t('storefront.templates.maison.about.values.living.title') }}</h3>
            <p class="about__value-text">{{ t('storefront.templates.maison.about.values.living.text') }}</p>
          </div>

          <div class="about__value-card">
            <div class="about__value-num">03</div>
            <div class="about__value-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 17S3 13 3 7.5A4 4 0 0110 4.7 4 4 0 0117 7.5C17 13 10 17 10 17z" stroke="currentColor" stroke-width="0.75"/>
              </svg>
            </div>
            <h3 class="about__value-title">{{ t('storefront.templates.maison.about.values.passion.title') }}</h3>
            <p class="about__value-text">{{ t('storefront.templates.maison.about.values.passion.text') }}</p>
          </div>
        </div>
      </section>

      <div class="about__divider" />

      <!-- CTA -->
      <section class="about__cta-section">
        <div class="about__desc-num">03</div>
        <div class="about__cta-content">
          <h2 class="about__cta-title">{{ t('storefront.templates.maison.about.ctaTitle') }}<br><em>{{ t('storefront.templates.maison.about.ctaAccent') }}</em></h2>
          <NuxtLink to="/products" class="at-btn-primary" style="width:fit-content">
            <span>{{ t('storefront.templates.maison.about.ctaAction') }}</span>
            <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
              <path d="M1 4h14M10 1l5 3-5 3" stroke="currentColor" stroke-width="0.85"/>
            </svg>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.about { min-height: 80vh; }

/* Hero */
.about__hero {
  position: relative;
  border-bottom: 1px solid var(--at-border);
  padding: clamp(64px, 12vw, 140px) clamp(20px, 6vw, 96px) clamp(48px, 8vw, 96px);
  overflow: hidden;
  background: var(--at-grad-shell);
  border-end-end-radius: clamp(48px, 9vw, 130px);
}
.about__hero-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: clamp(24px, 4vw, 64px);
  position: relative;
  z-index: 1;
}
.about__hero-rule {
  width: 2px;
  height: clamp(80px, 16vw, 180px);
  border-radius: 2px;
  background: linear-gradient(to bottom, transparent, var(--at-gold) 18%, var(--at-cream) 92%);
  flex-shrink: 0;
}
.about__hero-text {}
.about__title {
  font-family: var(--at-f-display);
  font-size: clamp(3.5rem, 8vw, 8rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 0.97;
  color: var(--at-cream);
  margin-top: 12px;
}
.about__title em {
  font-style: italic;
  font-weight: 400;
  color: var(--at-gold);
}

.about__hero-orb {
  position: absolute;
  border: 1px solid var(--at-border-2);
  border-radius: 50%;
  pointer-events: none;
}
.about__hero-orb--1 {
  width: 500px; height: 500px;
  top: -200px; inset-inline-end: -100px;
  opacity: 0.3;
}
.about__hero-orb--2 {
  width: 280px; height: 280px;
  bottom: -120px; inset-inline-end: 120px;
  opacity: 0.2;
}

/* Body */
.about__body {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 clamp(20px, 6vw, 96px);
}
.about__divider {
  height: 1px;
  background: var(--at-grad-hair);
  opacity: 0.7;
}

/* Description section */
.about__desc-section {
  display: flex;
  gap: clamp(24px, 5vw, 80px);
  padding: clamp(48px, 7vw, 96px) 0;
  align-items: flex-start;
}
.about__desc-num {
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 300;
  letter-spacing: 0;
  color: var(--at-muted);
  flex-shrink: 0;
  width: 24px;
  padding-top: 6px;
}
.about__desc-content { flex: 1; max-width: 680px; }
.about__desc-lead {
  font-family: var(--at-f-display);
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--at-cream);
  line-height: 1.4;
  margin-bottom: 20px;
  text-wrap: balance;
}
.about__desc-body {
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  line-height: 1.9;
  color: var(--at-sub);
}

/* Values section */
.about__values-section {
  padding: clamp(48px, 7vw, 96px) 0;
}
.about__section-head {
  display: flex;
  align-items: baseline;
  gap: clamp(24px, 5vw, 80px);
  margin-bottom: 40px;
}
.about__section-title {
  font-family: var(--at-f-display);
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 600;
  color: var(--at-cream);
  letter-spacing: -0.025em;
}

.about__values-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  background: var(--at-border);
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-lg);
  box-shadow: var(--at-shadow-sm);
  overflow: hidden;
}
@media (min-width: 768px) {
  .about__values-grid { grid-template-columns: repeat(3, 1fr); }
}

.about__value-card {
  background: var(--at-surface);
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: background 0.25s;
}
.about__value-card:hover { background: var(--at-surface-2); }
.about__value-card--accent { background: var(--at-surface-2); }

.about__value-num {
  font-family: var(--at-f-mono);
  font-size: 8px;
  letter-spacing: 0;
  color: var(--at-gold);
}
.about__value-icon {
  width: 38px;
  height: 38px;
  background: var(--at-grad-green);
  border-radius: var(--at-r-pill);
  box-shadow: var(--at-shadow-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFBF0;
}
.about__value-title {
  font-family: var(--at-f-display);
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--at-cream);
}
.about__value-text {
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 300;
  line-height: 1.8;
  color: var(--at-sub);
}

/* CTA section */
.about__cta-section {
  display: flex;
  gap: clamp(24px, 5vw, 80px);
  padding: clamp(48px, 7vw, 96px) 0;
  align-items: flex-start;
}
.about__cta-content { flex: 1; }
.about__cta-title {
  font-family: var(--at-f-display);
  font-size: clamp(2.5rem, 5vw, 5rem);
  font-weight: 600;
  letter-spacing: -0.032em;
  line-height: 1.0;
  color: var(--at-cream);
  margin-bottom: 32px;
  text-wrap: balance;
}
.about__cta-title em {
  font-style: italic;
  font-weight: 400;
  color: var(--at-gold);
}
</style>
