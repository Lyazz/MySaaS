<template>
  <div class="storefront-cat-placeholder" :style="{ background: gradient }">
    <span class="storefront-cat-placeholder__watermark" :style="fontStyle" aria-hidden="true">{{ letter }}</span>
    <span class="storefront-cat-placeholder__name" :style="fontStyle">{{ cleanTitle }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title?: string | null
  fontFamily?: string | null
}>()

const fontStyle = computed(() => (props.fontFamily ? { fontFamily: props.fontFamily } : undefined))

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

const cleanTitle = computed(() => (props.title || '').replace(/^->\s*/, '').trim())

const letter = computed(() => {
  const first = Array.from(cleanTitle.value)[0]
  return first ? first.toUpperCase() : '?'
})

const gradient = computed(() => {
  const hash = hashString(cleanTitle.value || 'category')
  const hue1 = hash % 360
  const hue2 = (hue1 + 42) % 360
  return `linear-gradient(135deg, hsl(${hue1} 60% 40%), hsl(${hue2} 65% 26%))`
})
</script>

<style scoped>
.storefront-cat-placeholder {
  container-type: inline-size;
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 10%;
}

.storefront-cat-placeholder__watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: clamp(56px, 60cqi, 220px);
  line-height: 1;
  color: rgba(255, 255, 255, 0.12);
  user-select: none;
  transform: translateY(4%);
}

.storefront-cat-placeholder__name {
  position: relative;
  z-index: 1;
  max-width: 100%;
  text-align: center;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: clamp(11px, 9cqi, 20px);
  line-height: 1.4;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
