<script setup lang="ts">
const baseDomain = usePlatformBaseDomain()
const href = computed(() => `https://${baseDomain}`)
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    dir="ltr"
    class="inline-flex items-center gap-1 text-[11px] opacity-70 hover:opacity-100 transition-opacity"
  >
    Powered by <span class="font-semibold">Swekly</span>
  </a>
</template>
