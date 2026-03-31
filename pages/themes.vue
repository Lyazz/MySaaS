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
  <div class="bg-slate-50 min-h-screen font-sans">
    <!-- Header -->
    <div class="bg-slate-900 pt-32 pb-24 text-center px-4 relative overflow-hidden text-white">
       <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
       <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-600/20 rounded-full blur-[120px]"></div>
       
       <div class="relative z-10 max-w-4xl mx-auto">
         <h1 class="text-5xl md:text-6xl font-black mb-6 tracking-tight">
           Des vitrines
           <span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">magnifiques</span>
         </h1>
         <p class="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
           Trouvez le design parfait pour votre boutique. Tous nos thèmes sont optimisés pour mobile, ultra-rapides et entièrement personnalisables.
         </p>
       </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-20">
      
      <!-- Category Filter -->
      <div class="flex flex-wrap items-center justify-center gap-2 mb-16">
        <button 
          v-for="cat in categories" 
          :key="cat"
          @click="activeCategory = cat"
          class="px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300"
          :class="activeCategory === cat 
            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105' 
            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Themes Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500">
        
        <div 
          v-for="theme in filteredThemes" 
          :key="theme.id" 
          class="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/40 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 flex flex-col"
        >
          <!-- Image Container -->
          <div class="relative aspect-[4/3] overflow-hidden bg-slate-100">
            <img :src="theme.image" :alt="theme.name" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700">
            <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors duration-300"></div>
            
            <!-- Tags -->
            <div class="absolute top-4 left-4 flex gap-2">
              <span class="px-3 py-1 bg-white/90 backdrop-blur-sm shadow-sm rounded-full text-xs font-bold text-slate-900">
                {{ theme.category }}
              </span>
              <span v-if="theme.popular" class="px-3 py-1 bg-teal-500/90 backdrop-blur-sm shadow-sm rounded-full text-xs font-bold text-white flex items-center gap-1">
                <Icon name="lucide:flame" class="w-3 h-3" /> Populaire
              </span>
            </div>
            
            <!-- Hover Overlay Actions -->
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button class="bg-white text-slate-900 font-bold px-6 py-3 rounded-xl shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
                <Icon name="lucide:eye" class="w-4 h-4" /> Aperçu
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="p-6 flex-1 flex flex-col">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xl font-bold text-slate-900">{{ theme.name }}</h3>
              <span class="text-sm font-bold px-2 py-1 rounded" :class="theme.price === 'Gratuit' ? 'text-teal-600 bg-teal-50' : 'text-amber-600 bg-amber-50'">
                {{ theme.price }}
              </span>
            </div>
            <p class="text-slate-500 text-sm leading-relaxed mb-6 flex-1">
              {{ theme.description }}
            </p>
            <div class="border-t border-slate-100 pt-6">
              <NuxtLink to="/register" class="flex items-center justify-center gap-2 w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold rounded-xl transition-colors">
                Utiliser ce thème <Icon name="lucide:arrow-right" class="w-4 h-4" />
              </NuxtLink>
            </div>
          </div>
        </div>

      </div>

      <!-- Empty State -->
      <div v-if="filteredThemes.length === 0" class="text-center py-20">
        <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="lucide:search-X" class="w-8 h-8" />
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-2">Aucun thème trouvé</h3>
        <p class="text-slate-500">Nous n'avons pas encore de thème dans cette catégorie.</p>
        <button @click="activeCategory = 'Tous'" class="mt-6 text-teal-600 font-bold hover:underline">
          Voir tous les thèmes
        </button>
      </div>

    </div>

    <!-- CTA -->
    <section class="py-24 text-center border-t border-slate-200">
       <div class="max-w-2xl mx-auto px-4">
         <h2 class="text-3xl font-bold text-slate-900 mb-6">Prêt à créer votre boutique ?</h2>
         <p class="text-slate-500 mb-8">Commencez avec l'un de nos superbes thèmes et personnalisez-le à votre image.</p>
         <NuxtLink to="/register" class="inline-flex items-center gap-2 px-8 py-4 bg-teal-600 text-white font-bold rounded-xl shadow-xl shadow-teal-600/20 hover:bg-teal-500 transition-all hover:scale-105">
           Commencer gratuitement
         </NuxtLink>
       </div>
    </section>
  </div>
</template>
