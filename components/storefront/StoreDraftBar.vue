<!--
  Shown only to a signed-in member of the tenant who is looking at their own
  unpublished storefront. Everyone else gets a 404 from server/middleware/tenant.ts
  and never renders this component, so it doubles as the reassurance that the
  store really is private.

  Deliberately not themed with the storefront's palette: it must read as platform
  chrome sitting on top of the store, not as part of the design being reviewed.
-->
<template>
  <div v-if="isDraft" class="swk-draft-bar" role="status">
    <span class="swk-draft-bar__dot" aria-hidden="true" />
    <p class="swk-draft-bar__text">
      <strong>{{ t('storefront.draftBar.title') }}</strong>
      <span class="swk-draft-bar__hint">{{ t('storefront.draftBar.hint') }}</span>
    </p>
    <NuxtLink to="/admin/onboarding?step=publish" class="swk-draft-bar__cta">
      {{ t('storefront.draftBar.cta') }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
const isDraft = useState<boolean>('storefrontDraft', () => false)
</script>

<style scoped>
.swk-draft-bar {
  position: sticky;
  top: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  background: #18181b;
  color: #fafafa;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.8125rem;
  line-height: 1.3;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.08);
}

.swk-draft-bar__dot {
  width: 0.5rem;
  height: 0.5rem;
  flex: none;
  border-radius: 9999px;
  background: #fbbf24;
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.22);
}

.swk-draft-bar__text {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
}

.swk-draft-bar__hint {
  color: rgba(250, 250, 250, 0.66);
}

.swk-draft-bar__cta {
  flex: none;
  padding: 0.3125rem 0.75rem;
  border-radius: 9999px;
  background: #fafafa;
  color: #18181b;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.swk-draft-bar__cta:hover {
  background: #e4e4e7;
}

@media (max-width: 480px) {
  .swk-draft-bar__hint {
    display: none;
  }
}
</style>
