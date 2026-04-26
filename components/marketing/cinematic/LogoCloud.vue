<template>
  <div
    class="relative overflow-hidden"
    @mouseenter="targetSpeed = slowSpeed"
    @mouseleave="targetSpeed = baseSpeed"
  >
    <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[color:var(--m-bg)] to-transparent" />
    <div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[color:var(--m-bg)] to-transparent" />
    <div ref="viewport" class="py-2 overflow-hidden">
      <div ref="track" class="flex w-max will-change-transform">
        <div
          v-for="(logo, i) in repeated"
          :key="logo.name + '-' + i"
          :ref="(el) => { if (i === 0 && el) firstSetMarker = el as HTMLElement }"
          class="mx-10 flex shrink-0 items-center gap-2 text-[color:var(--m-text-dim)] hover:text-white transition-colors"
        >
          <Icon :name="logo.icon" class="h-5 w-5" />
          <span class="font-mono text-sm uppercase tracking-[0.22em]">{{ logo.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  logos: Array<{ name: string; icon: string }>
  reverse?: boolean
}>(), { reverse: false })

const track = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const firstSetMarker = ref<HTMLElement | null>(null)

const baseSpeed = 60
const slowSpeed = 14
const targetSpeed = ref(baseSpeed)
const currentSpeed = ref(baseSpeed)

const copies = ref(4)
const repeated = computed(() => {
  const out: typeof props.logos = []
  for (let i = 0; i < copies.value; i++) out.push(...props.logos)
  return out
})

let offset = 0
let setWidth = 0
let rafId: number | null = null
let lastTs = 0

const measure = async () => {
  if (!track.value || !viewport.value) return
  await nextTick()
  // Measure width of one set by summing first N children
  const children = track.value.children
  const n = props.logos.length
  let w = 0
  for (let i = 0; i < n && i < children.length; i++) {
    const el = children[i] as HTMLElement
    const style = getComputedStyle(el)
    w += el.offsetWidth + parseFloat(style.marginLeft) + parseFloat(style.marginRight)
  }
  setWidth = w
  // Ensure we have enough copies: viewport + 2 sets
  if (setWidth > 0) {
    const needed = Math.ceil(viewport.value.offsetWidth / setWidth) + 2
    if (needed > copies.value) {
      copies.value = needed
      await nextTick()
    }
  }
}

const tick = (ts: number) => {
  if (!track.value) return
  const dt = lastTs ? (ts - lastTs) / 1000 : 0
  lastTs = ts

  currentSpeed.value += (targetSpeed.value - currentSpeed.value) * Math.min(1, dt * 4)

  const dir = props.reverse ? -1 : 1
  offset += currentSpeed.value * dt * dir

  if (setWidth > 0) {
    offset = ((offset % setWidth) + setWidth) % setWidth
  }

  track.value.style.transform = `translate3d(${-offset}px, 0, 0)`
  rafId = requestAnimationFrame(tick)
}

let ro: ResizeObserver | null = null
onMounted(async () => {
  await measure()
  ro = new ResizeObserver(() => { measure() })
  if (viewport.value) ro.observe(viewport.value)
  if (track.value) ro.observe(track.value)
  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  if (rafId) cancelAnimationFrame(rafId)
})
</script>
