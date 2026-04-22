<template>
  <div class="marketing-shell flex min-h-screen flex-col font-sans">
    <MarketingNavBar />

    <main class="relative z-10 flex-grow">
      <slot />
    </main>

    <MarketingFooter />
  </div>
</template>
