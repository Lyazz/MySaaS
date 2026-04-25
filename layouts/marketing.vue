<template>
  <div class="marketing-shell marketing-shell--cinematic flex min-h-screen flex-col">
    <MarketingCinematicNavCinematic />

    <main class="relative z-10 flex-grow">
      <slot />
    </main>

    <MarketingCinematicFooterCinematic />
  </div>
</template>
