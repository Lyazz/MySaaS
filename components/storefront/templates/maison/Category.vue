<script setup lang="ts">
import ProductCard from './ProductCard.vue'

const props = defineProps<{
  category: any
  products: any[]
}>()

const storefrontContent = useStorefrontContent()

const categoriesUrl = useTenantApiUrl('/api/categories')
const { data: allCategories } = await useFetch<any[]>(categoriesUrl, {
  headers: useTenantApiHeaders(),
  lazy: true
})

const categoryProducts = computed(() => {
  const id = props.category.id
  return (props.products ?? []).filter((p: any) => p.isActive && p.stock > 0 && p.categoryId === id)
})
</script>

<template>
  <div class="cat-page">
    <!-- Category header banner -->
    <div class="cat-banner">
      <img
        v-if="category.imageUrl"
        :src="category.imageUrl"
        :alt="category.title"
        class="cat-banner__img"
      >
      <div v-else class="cat-banner__placeholder" />
      <div class="cat-banner__veil" />
      <div class="cat-banner__content">
        <span class="cat-banner__label at-label">{{ storefrontContent.category.label }}</span>
        <h1 class="cat-banner__title">{{ category.title }}</h1>
        <p v-if="category.description" class="cat-banner__desc">{{ category.description }}</p>
      </div>
    </div>

    <div class="cat-body">
      <!-- Sidebar: all categories -->
      <aside class="cat-sidebar">
        <div class="cat-sidebar__inner">
          <span class="at-label" style="display:block;margin-bottom:16px">Collections</span>
          <nav class="cat-sidebar__nav">
            <NuxtLink
              v-for="cat in allCategories"
              :key="cat.id"
              :to="`/c/${cat.slug}`"
              class="cat-sidebar__link"
              :class="cat.id === category.id && 'is-active'"
            >
              <span class="cat-sidebar__num">{{ String((allCategories || []).indexOf(cat) + 1).padStart(2,'0') }}</span>
              {{ cat.title }}
            </NuxtLink>
          </nav>
        </div>
      </aside>

      <!-- Product grid -->
      <div class="cat-main">
        <div v-if="categoryProducts.length === 0" class="cat-empty">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" class="cat-empty__icon">
            <rect x="4" y="4" width="32" height="32" stroke="currentColor" stroke-width="0.75"/>
            <path d="M12 20h16M20 12v16" stroke="currentColor" stroke-width="0.75"/>
          </svg>
          <p class="cat-empty__title">{{ storefrontContent.shop.results.noResults }}</p>
          <p class="cat-empty__sub">{{ storefrontContent.category.emptyHint }}</p>
          <NuxtLink to="/products" class="at-btn-ghost" style="width:auto;padding:12px 24px;display:inline-flex">
            {{ storefrontContent.shop.allProducts }}
          </NuxtLink>
        </div>

        <template v-else>
          <p class="cat-count">{{ categoryProducts.length }} produits</p>
          <div class="cat-grid">
            <ProductCard v-for="product in categoryProducts" :key="product.id" :product="product" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cat-page { min-height: 100vh; }

/* Banner */
.cat-banner {
  position: relative;
  height: clamp(200px, 30vw, 380px);
  overflow: hidden;
  background: var(--at-surface-2);
}
.cat-banner__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.4) saturate(0.7);
}
.cat-banner__placeholder { width: 100%; height: 100%; background: var(--at-surface-2); }
.cat-banner__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(14,13,12,0.7) 0%, rgba(14,13,12,0.1) 70%);
}
.cat-banner__content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: clamp(24px, 5vw, 64px) clamp(20px, 5vw, 80px);
}
.cat-banner__label { margin-bottom: 10px; }
.cat-banner__title {
  font-family: var(--at-f-display);
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 300;
  letter-spacing: -0.02em;
  color: var(--at-cream);
  line-height: 1.0;
  margin-bottom: 8px;
}
.cat-banner__desc {
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: rgba(232,226,217,0.55);
  max-width: 440px;
}

/* Body layout */
.cat-body {
  max-width: 1400px;
  margin: 0 auto;
  padding: clamp(32px, 5vw, 56px) clamp(20px, 5vw, 80px);
  display: flex;
  gap: 40px;
}

/* Sidebar */
.cat-sidebar { display: none; }
@media (min-width: 1024px) {
  .cat-sidebar {
    display: block;
    width: 200px;
    flex-shrink: 0;
  }
}
.cat-sidebar__inner { position: sticky; top: 80px; }
.cat-sidebar__nav { display: flex; flex-direction: column; }
.cat-sidebar__link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  font-family: var(--at-f-mono);
  font-size: 11px;
  font-weight: 300;
  color: var(--at-sub);
  text-decoration: none;
  border-bottom: 1px solid var(--at-border);
  transition: color 0.2s;
}
.cat-sidebar__link:last-child { border-bottom: none; }
.cat-sidebar__link:hover, .cat-sidebar__link.is-active { color: var(--at-gold); }
.cat-sidebar__link.is-active .cat-sidebar__num { color: var(--at-gold); }
.cat-sidebar__num {
  font-family: var(--at-f-mono);
  font-size: 8px;
  color: var(--at-muted);
  font-weight: 300;
  transition: color 0.2s;
}

/* Main */
.cat-main { flex: 1; min-width: 0; }
.cat-count {
  font-family: var(--at-f-mono);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--at-muted);
  margin-bottom: 20px;
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--at-border);
}
@media (min-width: 768px) { .cat-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1280px) { .cat-grid { grid-template-columns: repeat(4, 1fr); } }

.cat-empty {
  border: 1px solid var(--at-border);
  padding: 80px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}
.cat-empty__icon { color: var(--at-muted); margin-bottom: 8px; }
.cat-empty__title {
  font-family: var(--at-f-display);
  font-size: 1.6rem;
  font-weight: 300;
  color: var(--at-text);
}
.cat-empty__sub {
  font-family: var(--at-f-mono);
  font-size: 11px;
  color: var(--at-sub);
  margin-bottom: 8px;
}
</style>
