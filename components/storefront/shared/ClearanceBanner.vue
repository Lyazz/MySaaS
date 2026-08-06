<script setup lang="ts">
const { isEnabled, text, isVisible, dismiss } = useClearanceBanner()
const { t } = useI18n({ useScope: 'global' })

const displayText = computed(() => text.value ?? t('storefront.clearance.bannerFallback'))
</script>

<template>
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-full"
  >
    <div
      v-if="isEnabled && isVisible"
      class="relative overflow-hidden z-40 bg-amber-500 text-white"
    >
      <div class="relative max-w-7xl mx-auto flex items-center h-10 px-4">
        <div class="flex-1 flex items-center justify-center gap-2 mx-8 text-sm font-semibold text-center truncate">
          <Icon name="lucide:package-open" class="w-4 h-4 flex-shrink-0" />
          <span class="truncate">{{ displayText }}</span>
        </div>

        <button
          type="button"
          class="absolute right-4 p-1 rounded-full hover:bg-black/10 transition-colors z-50 cursor-pointer"
          :aria-label="t('storefront.announcement.dismissAria')"
          @click="dismiss"
        >
          <Icon name="lucide:x" class="w-4 h-4" />
        </button>
      </div>
    </div>
  </transition>
</template>
