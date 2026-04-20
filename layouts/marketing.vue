<template>
  <div class="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-600">
    <MarketingNavBar />
    <div class="h-20" /> <!-- Spacer for fixed header -->

    <main class="flex-grow">
      <slot />
    </main>

    <MarketingFooter />
  </div>
</template>
