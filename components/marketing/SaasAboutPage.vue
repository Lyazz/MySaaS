<script setup lang="ts">
useSeoMeta({
  title: 'About Swekly',
  description: 'Learn more about Swekly.'
})

const pillars = [
  {
    icon: 'lucide:shield-check',
    title: 'Secure by default',
    text: 'Tenant isolation and guarded data access are built into the core architecture.'
  },
  {
    icon: 'lucide:rocket',
    title: 'Launch fast',
    text: 'Merchants can go live in minutes with storefront templates, checkout, and shipping integrations.'
  },
  {
    icon: 'lucide:line-chart',
    title: 'Scale with clarity',
    text: 'From operations to analytics, Swekly helps teams grow without adding unnecessary complexity.'
  }
]
</script>

<template>
  <div class="about-page min-h-screen pt-24 md:pt-28 pb-20 font-sans">
    <section class="relative overflow-hidden px-4 pt-8 pb-14 text-center">
      <div class="about-page__blob about-page__blob--mint" />
      <div class="about-page__blob about-page__blob--orange" />

      <div class="relative z-10 mx-auto max-w-4xl">
        <p class="text-xs md:text-sm font-bold uppercase tracking-[0.24em] text-[#0D1F1A]/55 mb-5">
          About Swekly
        </p>
        <h1 class="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] text-[#0D1F1A] mb-6">
          Built for ambitious
          <span class="about-page__accent">Algerian merchants</span>
        </h1>
        <p class="mx-auto max-w-2xl text-base md:text-lg leading-relaxed text-[#0D1F1A]/65">
          Swekly helps merchants launch and scale high-converting COD storefronts with multi-tenant isolation,
          fast admin tooling, and SEO-first pages.
        </p>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <article
          v-for="item in pillars"
          :key="item.title"
          class="rounded-3xl border-2 border-[#0D1F1A] bg-[#FFFDF4] p-7 shadow-[6px_6px_0_#0D1F1A]"
        >
          <div class="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#0D1F1A] bg-[#1F9D8E] text-white shadow-[3px_3px_0_#0D1F1A]">
            <Icon :name="item.icon" class="h-5 w-5" />
          </div>
          <h3 class="mb-3 text-2xl font-extrabold tracking-tight text-[#0D1F1A]">
            {{ item.title }}
          </h3>
          <p class="text-[#0D1F1A]/65 leading-relaxed">
            {{ item.text }}
          </p>
        </article>
      </div>
    </section>

    <section class="px-4 pt-16 text-center">
      <div class="mx-auto max-w-3xl rounded-3xl border-2 border-[#0D1F1A] bg-[#FFF1DC] px-8 py-12 text-[#0D1F1A] shadow-[8px_8px_0_#FF7A45]">
        <h2 class="text-3xl font-black tracking-tight mb-4">
          Ready to build your storefront?
        </h2>
        <p class="mx-auto max-w-xl text-[#0D1F1A]/65 mb-7">
          Start with a clean foundation and ship your first products without dealing with infrastructure first.
        </p>
        <NuxtLink
          to="/register"
          class="inline-flex items-center gap-2 rounded-full border-2 border-[#FF7A45] bg-[#FF7A45] px-8 py-3 font-bold text-white transition-transform hover:-translate-y-0.5 hover:border-[#ff8a5d] hover:bg-[#ff8a5d]"
        >
          Start free
          <Icon name="lucide:arrow-up-right" class="h-4 w-4" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  background: #FFF8E7;
  color: #0D1F1A;
}

.about-page__accent {
  color: #FF7A45;
  position: relative;
  display: inline-block;
}

.about-page__accent::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -0.22em;
  width: 100%;
  height: 0.2em;
  background: rgba(244, 192, 78, 0.9);
  border-radius: 999px;
  z-index: -1;
}

.about-page__blob {
  pointer-events: none;
  position: absolute;
  border-radius: 999px;
  filter: blur(80px);
  opacity: 0.35;
}

.about-page__blob--mint {
  width: 300px;
  height: 300px;
  left: -80px;
  top: -80px;
  background: #1F9D8E;
}

.about-page__blob--orange {
  width: 320px;
  height: 320px;
  right: -90px;
  top: -50px;
  background: #FF7A45;
}
</style>
