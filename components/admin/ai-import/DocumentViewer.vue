<template>
  <UiCard
    :padded="false"
    class="overflow-hidden"
  >
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-primary">
          {{ t('admin.pages.aiImport.review.originalTitle') }}
        </h3>
        <div class="flex items-center gap-1">
          <UiButton
            variant="ghost"
            size="sm"
            icon="lucide:zoom-out"
            :disabled="zoom <= MIN_ZOOM || isPdf"
            :aria-label="t('admin.pages.aiImport.review.zoomOut')"
            @click="zoom = Math.max(MIN_ZOOM, zoom - 0.25)"
          />
          <span class="w-12 text-center text-mini text-tertiary font-mono-nums">
            {{ Math.round(zoom * 100) }}%
          </span>
          <UiButton
            variant="ghost"
            size="sm"
            icon="lucide:zoom-in"
            :disabled="zoom >= MAX_ZOOM || isPdf"
            :aria-label="t('admin.pages.aiImport.review.zoomIn')"
            @click="zoom = Math.min(MAX_ZOOM, zoom + 0.25)"
          />
          <UiButton
            v-if="url"
            variant="ghost"
            size="sm"
            icon="lucide:external-link"
            :href="url"
            target="_blank"
            rel="noopener"
            :aria-label="t('admin.pages.aiImport.review.openOriginal')"
          />
        </div>
      </div>
    </template>

    <div class="surface-3 max-h-[70vh] overflow-auto p-3">
      <UiEmptyState
        v-if="!url || failed"
        icon="lucide:file-question"
        :title="t('admin.pages.aiImport.review.noPreview')"
        :description="t('admin.pages.aiImport.review.noPreviewHint')"
      />

      <iframe
        v-else-if="isPdf"
        :src="url"
        class="h-[68vh] w-full rounded-xl border border-line"
        :title="t('admin.pages.aiImport.review.originalTitle')"
      />

      <img
        v-else
        :src="url"
        :alt="t('admin.pages.aiImport.review.originalTitle')"
        class="mx-auto rounded-xl border border-line"
        :style="{ width: `${zoom * 100}%` }"
        @error="failed = true"
      >
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{ url: string | null; mimeType: string }>()

const { t } = useI18n({ useScope: 'global' })

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3

// Zoom is a runtime-computed width, which is exactly what :style is for.
const zoom = ref(1)
const isPdf = computed(() => props.mimeType === 'application/pdf')

/**
 * A presigned URL can resolve and still 404 — the object expired, or the local
 * dev file is gone. Without this the merchant sees an empty bordered box with
 * no explanation instead of the "no preview" state.
 */
const failed = ref(false)
watch(() => props.url, () => (failed.value = false))
</script>
