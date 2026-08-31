<script setup lang="ts">
const props = defineProps<{
  images: string[]
  title: string
}>()

const { onPointerMove, onPointerLeave, zoomStyle } = useImageHoverZoom()

/*
 * Desktop stacks every plate down the page — no thumbnail strip, no switcher.
 * The zoom composable holds one shared transform, so it is only bound to the
 * plate actually under the pointer.
 */
const hoveredIndex = ref<number | null>(null)
const enterPlate = (event: MouseEvent, index: number) => {
  hoveredIndex.value = index
  onPointerMove(event)
}
const leavePlate = () => {
  hoveredIndex.value = null
  onPointerLeave()
}

/* Mobile swipes through them instead, with a folio that follows the scroll. */
const strip = ref<HTMLElement | null>(null)
const mobileIndex = ref(0)
const onStripScroll = () => {
  const el = strip.value
  if (!el || el.clientWidth === 0) return
  mobileIndex.value = Math.round(el.scrollLeft / el.clientWidth)
}

watch(() => props.images, () => {
  hoveredIndex.value = null
  mobileIndex.value = 0
  if (strip.value) strip.value.scrollLeft = 0
}, { deep: true })

const hasImages = computed(() => Array.isArray(props.images) && props.images.length > 0)
</script>

<template>
  <div>
    <!-- Mobile: one plate at a time, swiped -->
    <div class="md:hidden relative">
      <div
        v-if="hasImages"
        ref="strip"
        class="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide border border-[#DAD2C4] bg-[#FBF8F2]"
        @scroll.passive="onStripScroll"
      >
        <div
          v-for="(image, index) in images"
          :key="index"
          class="snap-start shrink-0 w-full aspect-[4/5]"
        >
          <img :src="image" :alt="`${title} — ${index + 1}`" class="w-full h-full object-cover">
        </div>
      </div>
      <div v-else class="aspect-[4/5] border border-[#DAD2C4] bg-[#FBF8F2] flex items-center justify-center text-[#C4B8A4]">
        <Icon name="lucide:image" class="w-12 h-12" />
      </div>

      <div
        v-if="hasImages && images.length > 1"
        class="absolute bottom-3 end-3 ed-ui text-[11px] tabular-nums bg-[#F4EFE6]/90 border border-[#C4B8A4] text-[#4A4038] px-2.5 py-1"
      >
        {{ String(mobileIndex + 1).padStart(2, '0') }} / {{ String(images.length).padStart(2, '0') }}
      </div>
    </div>

    <!-- Desktop: the plates run down the page -->
    <div class="hidden md:flex flex-col gap-5">
      <template v-if="hasImages">
        <figure
          v-for="(image, index) in images"
          :key="index"
          class="relative border border-[#DAD2C4] bg-[#FBF8F2] overflow-hidden cursor-zoom-in"
          @mousemove="enterPlate($event, index)"
          @mouseleave="leavePlate"
        >
          <img
            :src="image"
            :alt="`${title} — ${index + 1}`"
            class="w-full h-auto object-cover transition-transform duration-500"
            :style="hoveredIndex === index ? zoomStyle : undefined"
          >
          <figcaption
            v-if="images.length > 1"
            class="absolute top-3 start-3 ed-ui text-[11px] tabular-nums bg-[#F4EFE6]/90 border border-[#C4B8A4] text-[#4A4038] px-2.5 py-1"
          >{{ String(index + 1).padStart(2, '0') }}</figcaption>
        </figure>
      </template>
      <div v-else class="aspect-[4/5] border border-[#DAD2C4] bg-[#FBF8F2] flex items-center justify-center text-[#C4B8A4]">
        <Icon name="lucide:image" class="w-16 h-16" />
      </div>
    </div>
  </div>
</template>
