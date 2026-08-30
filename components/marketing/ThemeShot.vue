<script setup lang="ts">
/**
 * A theme's demo storefront, as a photograph of the real page.
 *
 * The image is captured from the running app by `scripts/capture-theme-shots.mjs`
 * and committed to `public/themes/`, so the gallery shows the storefront a
 * merchant actually gets rather than an illustration of it, and stays up
 * whether or not the demo stores are reachable.
 *
 * Framed in browser chrome carrying the demo host: it says at a glance that
 * this is a live store, and it is the same address the card's "view the demo
 * store" link opens.
 */
defineProps<{
  /** Path under `public/`, e.g. `/themes/modern.webp`. */
  src: string
  /** Host shown in the address bar, e.g. `modern.swekly.com`. */
  host: string
  alt: string
}>()
</script>

<template>
  <div class="shot">
    <div class="shot-chrome">
      <span class="shot-dot" />
      <span class="shot-dot" />
      <span class="shot-dot" />
      <span class="shot-url">{{ host }}</span>
    </div>
    <!--
      Fifteen storefronts on one page: every shot below the fold waits until it
      is scrolled to, and each declares its own size so nothing reflows when it
      lands.
    -->
    <img
      :src="src"
      :alt="alt"
      class="shot-img"
      width="1152"
      height="864"
      loading="lazy"
      decoding="async"
    >
  </div>
</template>

<style scoped>
.shot {
  position: relative;
  background: #0b0f12;
}

.shot-chrome {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  height: 28px;
  background: rgba(255, 255, 255, 0.04);
  border-block-end: 1px solid rgba(255, 255, 255, 0.06);
}

.shot-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
}

.shot-url {
  margin-inline-start: 8px;
  font-size: 10px;
  letter-spacing: 0.02em;
  color: var(--m-text-faint);
  /* The host is an address, so it reads left-to-right even under Arabic. */
  direction: ltr;
  unicode-bidi: isolate;
}

.shot-img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  object-position: top center;
  background: rgba(255, 255, 255, 0.03);
}
</style>
