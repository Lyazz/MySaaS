<template>
  <div
    class="relative overflow-hidden"
    @mouseenter="targetSpeed = slowSpeed"
    @mouseleave="targetSpeed = baseSpeed"
  >
    <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[color:var(--m-bg)] to-transparent" />
    <div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[color:var(--m-bg)] to-transparent" />
    <div ref="viewport" class="overflow-hidden">
      <div ref="track" class="flex w-max will-change-transform">
        <div ref="originalSet" class="flex shrink-0">
          <slot />
        </div>
        <div
          v-for="i in cloneCount"
          :key="i"
          class="flex shrink-0"
          aria-hidden="true"
          v-html="cloneHtml"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  duration?: number
  direction?: 'normal' | 'reverse'
  speed?: number
}>(), {
  duration: 45,
  direction: 'normal',
  speed: 60
})

const track = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const originalSet = ref<HTMLElement | null>(null)

const baseSpeed = props.speed
const slowSpeed = Math.max(6, props.speed * 0.23)
const targetSpeed = ref(baseSpeed)
const currentSpeed = ref(baseSpeed)

const cloneCount = ref(0)
const cloneHtml = ref('')

let offset = 0
let setWidth = 0
let rafId: number | null = null
let lastTs = 0

const measure = () => {
  if (!originalSet.value || !viewport.value) return
  setWidth = originalSet.value.offsetWidth
  if (setWidth > 0) {
    cloneHtml.value = originalSet.value.innerHTML
    const needed = Math.ceil(viewport.value.offsetWidth / setWidth) + 2
    if (needed !== cloneCount.value) cloneCount.value = needed
  }
}

const tick = (ts: number) => {
  if (!track.value) return
  const dt = lastTs ? (ts - lastTs) / 1000 : 0
  lastTs = ts

  currentSpeed.value += (targetSpeed.value - currentSpeed.value) * Math.min(1, dt * 4)

  const dir = props.direction === 'reverse' ? -1 : 1
  offset += currentSpeed.value * dt * dir

  if (setWidth > 0) {
    offset = ((offset % setWidth) + setWidth) % setWidth
  }

  track.value.style.transform = `translate3d(${-offset}px, 0, 0)`
  rafId = requestAnimationFrame(tick)
}

let ro: ResizeObserver | null = null
onMounted(() => {
  measure()
  ro = new ResizeObserver(() => measure())
  if (viewport.value) ro.observe(viewport.value)
  if (originalSet.value) ro.observe(originalSet.value)
  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  if (rafId) cancelAnimationFrame(rafId)
})
</script>
