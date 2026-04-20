<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'marketing',
  title: 'Thèmes - Swekly'
})

const categories = ['Tous', 'Mode', 'Électronique', 'Alimentation', 'Beauté', 'Livres']
const activeCategory = ref('Tous')

const themes = [
  { 
    id: 1, 
    name: 'Minimalist', 
    category: 'Mode', 
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=800&auto=format&fit=crop', 
    description: 'Épuré et moderne, parfait pour mettre en valeur vos collections de vêtements.',
    price: 'Gratuit', 
    popular: true 
  },
  { 
    id: 2, 
    name: 'TechPro', 
    category: 'Électronique', 
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=800&auto=format&fit=crop', 
    description: 'Design tech orienté conversion, idéal pour les gadgets et l\'informatique.',
    price: 'Gratuit',
    popular: false
  },
  { 
    id: 3, 
    name: 'Fresh Bite', 
    category: 'Alimentation', 
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop', 
    description: 'Chaleureux et appétissant. Parfait pour la livraison de repas ou l\'épicerie fine.',
    price: 'Premium',
    popular: false
  },
  { 
    id: 4, 
    name: 'Glow Up', 
    category: 'Beauté', 
    image: 'https://images.unsplash.com/photo-1596462502278-27bf85033e5a?q=80&w=800&auto=format&fit=crop', 
    description: 'Doux et élégant. Conçu pour les cosmétiques et les soins personnels.',
    price: 'Gratuit', 
    popular: true 
  },
  { 
    id: 5, 
    name: 'Bookworm', 
    category: 'Livres', 
    image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=800&auto=format&fit=crop', 
    description: 'Mise en page classique et lisible, idéale pour l\'édition et la culture.',
    price: 'Premium',
    popular: false
  },
  { 
    id: 6, 
    name: 'Urban Street', 
    category: 'Mode', 
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop', 
    description: 'Style urbain et audacieux pour le streetwear et les accessoires.',
    price: 'Gratuit',
    popular: true
  },
]

const filteredThemes = computed(() => {
  if (activeCategory.value === 'Tous') return themes
  return themes.filter(t => t.category === activeCategory.value)
})
</script>

<template>
  <div class="themes-page min-h-screen font-sans pt-24 md:pt-28 pb-20">
    <section class="relative overflow-hidden px-4 pt-8 pb-14 text-center">
      <div class="themes-page__blob themes-page__blob--mint" />
      <div class="themes-page__blob themes-page__blob--orange" />

      <div class="relative z-10 max-w-4xl mx-auto">
        <h1 class="text-5xl md:text-6xl font-black tracking-tight mb-6 text-[#0D1F1A]">
          Des vitrines
          <span class="themes-page__accent">magnifiques</span>
        </h1>
        <p class="text-base md:text-xl max-w-2xl mx-auto leading-relaxed text-[#0D1F1A]/65">
          Trouvez le design parfait pour votre boutique. Tous nos thèmes sont optimisés pour mobile, ultra-rapides et entièrement personnalisables.
        </p>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="mb-14 flex flex-wrap items-center justify-center gap-2">
        <button
          v-for="cat in categories"
          :key="cat"
          class="rounded-full border-2 border-[#0D1F1A] px-6 py-2.5 text-sm font-bold transition-all duration-300"
          :class="activeCategory === cat ? 'bg-[#0D1F1A] text-[#FFF8E7]' : 'bg-[#FFFDF4] text-[#0D1F1A]'"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 transition-all duration-500">
        <article
          v-for="theme in filteredThemes"
          :key="theme.id"
          class="group flex flex-col overflow-hidden rounded-3xl border-2 border-[#0D1F1A] bg-[#FFFDF4] shadow-[6px_6px_0_#0D1F1A] transition-all duration-300 hover:-translate-y-1"
        >
          <div class="relative aspect-[4/3] overflow-hidden bg-[#F5EDD3]">
            <img
              :src="theme.image"
              :alt="theme.name"
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            >

            <div class="absolute top-4 left-4 flex gap-2">
              <span class="rounded-full border-2 border-[#0D1F1A] bg-[#FFF8E7] px-3 py-1 text-xs font-bold text-[#0D1F1A]">
                {{ theme.category }}
              </span>
              <span v-if="theme.popular" class="inline-flex items-center gap-1 rounded-full border-2 border-[#0D1F1A] bg-[#FF7A45] px-3 py-1 text-xs font-bold text-white">
                <Icon name="lucide:flame" class="h-3 w-3" />
                Populaire
              </span>
            </div>
          </div>

          <div class="flex flex-1 flex-col p-6">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-xl font-extrabold tracking-tight text-[#0D1F1A]">
                {{ theme.name }}
              </h3>
              <span
                class="rounded-full border-2 border-[#0D1F1A] px-2.5 py-1 text-xs font-bold"
                :class="theme.price === 'Gratuit' ? 'bg-[#1F9D8E] text-white' : 'bg-[#F4C04E] text-[#0D1F1A]'"
              >
                {{ theme.price }}
              </span>
            </div>
            <p class="mb-6 flex-1 text-sm leading-relaxed text-[#0D1F1A]/65">
              {{ theme.description }}
            </p>
            <div class="border-t border-[#0D1F1A]/15 pt-5">
              <NuxtLink to="/register" class="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0D1F1A] bg-[#FFF8E7] py-3 font-bold text-[#0D1F1A] transition-colors hover:bg-[#F5EDD3]">
                Utiliser ce thème
                <Icon name="lucide:arrow-right" class="h-4 w-4" />
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>

      <div v-if="filteredThemes.length === 0" class="py-20 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#0D1F1A] bg-[#FFFDF4] text-[#0D1F1A]/45">
          <Icon name="lucide:search-x" class="h-8 w-8" />
        </div>
        <h3 class="mb-2 text-xl font-bold text-[#0D1F1A]">
          Aucun thème trouvé
        </h3>
        <p class="text-[#0D1F1A]/65">
          Nous n'avons pas encore de thème dans cette catégorie.
        </p>
        <button class="mt-6 font-bold text-[#FF7A45] hover:underline" @click="activeCategory = 'Tous'">
          Voir tous les thèmes
        </button>
      </div>
    </section>

    <section class="px-4 pt-20 text-center">
      <div class="mx-auto max-w-2xl rounded-3xl border-2 border-[#0D1F1A] bg-[#FFF1DC] px-8 py-12 text-[#0D1F1A] shadow-[8px_8px_0_#FF7A45]">
        <h2 class="mb-5 text-3xl font-black tracking-tight">
          Prêt à créer votre boutique ?
        </h2>
        <p class="mb-8 text-[#0D1F1A]/65">
          Commencez avec l'un de nos superbes thèmes et personnalisez-le à votre image.
        </p>
        <NuxtLink to="/register" class="inline-flex items-center gap-2 rounded-full border-2 border-[#FF7A45] bg-[#FF7A45] px-8 py-3 font-bold text-white transition-transform hover:-translate-y-0.5 hover:border-[#ff8a5d] hover:bg-[#ff8a5d]">
          Commencer gratuitement
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.themes-page {
  background: #FFF8E7;
  color: #0D1F1A;
}

.themes-page__accent {
  color: #FF7A45;
  position: relative;
  display: inline-block;
}

.themes-page__accent::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -0.2em;
  width: 100%;
  height: 0.2em;
  background: rgba(244, 192, 78, 0.9);
  border-radius: 999px;
  z-index: -1;
}

.themes-page__blob {
  pointer-events: none;
  position: absolute;
  border-radius: 999px;
  filter: blur(80px);
  opacity: 0.35;
}

.themes-page__blob--mint {
  width: 320px;
  height: 320px;
  top: -100px;
  left: -90px;
  background: #1F9D8E;
}

.themes-page__blob--orange {
  width: 320px;
  height: 320px;
  top: -70px;
  right: -100px;
  background: #FF7A45;
}
</style>
