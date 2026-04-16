<script setup lang="ts">
const tenant = useState<any>('tenant')
const storeSettings = useState<any>('storeSettings')
const tenantName = computed(() => tenant.value?.name || 'Maison')
</script>

<template>
  <div class="min-h-[80vh]">
    <!-- Hero -->
    <div class="bg-[#F0EBE3] py-20 md:py-28 text-center mb-16">
      <p class="text-[10px] tracking-[0.3em] uppercase text-[#C17B4E] mb-4">Notre histoire</p>
      <h1 class="font-maison-serif text-5xl md:text-6xl lg:text-7xl font-semibold text-[#2C2420]">
        À propos de<br>{{ tenantName }}
      </h1>
    </div>

    <div class="max-w-4xl mx-auto px-6 pb-24">
      <!-- Description -->
      <div class="bg-white border border-[#E8E0D4] p-10 md:p-14 mb-12">
        <p class="font-maison-serif text-xl md:text-2xl text-[#2C2420] leading-relaxed mb-6">
          {{ storeSettings?.description || 'Une boutique dédiée à l\'art de vivre, à la décoration intérieure et aux accessoires maison soigneusement sélectionnés.' }}
        </p>
        <p class="text-sm text-[#7A6558] leading-relaxed">
          Nous croyons que chaque espace de vie mérite d'être beau, fonctionnel et inspirant. C'est pourquoi nous sélectionnons avec soin chaque produit pour vous offrir le meilleur de la décoration et des accessoires maison.
        </p>
      </div>

      <!-- Values -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        <div class="bg-[#F0EBE3] p-8">
          <div class="w-10 h-10 bg-[#C17B4E]/15 flex items-center justify-center mb-5">
            <Icon name="lucide:leaf" class="w-5 h-5 text-[#C17B4E]" />
          </div>
          <h3 class="font-maison-serif text-lg font-semibold text-[#2C2420] mb-3">Qualité</h3>
          <p class="text-sm text-[#7A6558] leading-relaxed">Des produits sélectionnés pour leur qualité de fabrication et leur durabilité.</p>
        </div>

        <div class="bg-[#2C2420] p-8">
          <div class="w-10 h-10 bg-white/10 flex items-center justify-center mb-5">
            <Icon name="lucide:home" class="w-5 h-5 text-[#C17B4E]" />
          </div>
          <h3 class="font-maison-serif text-lg font-semibold text-white mb-3">Art de vivre</h3>
          <p class="text-sm text-[#A09080] leading-relaxed">Chaque pièce est pensée pour embellir et améliorer votre quotidien.</p>
        </div>

        <div class="bg-[#F0EBE3] p-8">
          <div class="w-10 h-10 bg-[#C17B4E]/15 flex items-center justify-center mb-5">
            <Icon name="lucide:heart" class="w-5 h-5 text-[#C17B4E]" />
          </div>
          <h3 class="font-maison-serif text-lg font-semibold text-[#2C2420] mb-3">Passion</h3>
          <p class="text-sm text-[#7A6558] leading-relaxed">Une équipe passionnée par la décoration intérieure et le design.</p>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center">
        <NuxtLink
          to="/products"
          class="inline-flex items-center gap-3 px-8 py-4 bg-[#2C2420] text-white text-xs tracking-[0.2em] uppercase hover:bg-[#C17B4E] transition-all"
        >
          Découvrir nos produits <Icon name="lucide:arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
