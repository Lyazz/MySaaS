<script setup lang="ts">
import type { TemplateKey } from '~/components/storefront/templates/registry'

const props = defineProps<{
  keywords: string
  templateKey: TemplateKey
}>()

const { t } = useI18n({ useScope: 'global' })

const parsedKeywords = computed(() =>
  props.keywords
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0)
)

// ─── Per-template configuration ──────────────────────────────────────────────
type TagTheme = {
  wrapper: string       // outer container
  inner: string         // inner flex container
  label: string         // section heading
  tag: string           // individual tag pill/badge
  icon?: string         // optional icon name (lucide)
  iconClass?: string    // icon classes
}

const themeMap: Record<TemplateKey, TagTheme> = {
  // ── Modern (brand accent, rounded pills)
  modern: {
    wrapper: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-0',
    inner: 'border-t border-slate-100 pt-8',
    label: 'text-xs font-bold uppercase tracking-widest text-slate-500 mb-4',
    tag: 'inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 hover:border-brand-400 transition-colors',
    icon: 'lucide:tag',
    iconClass: 'w-3 h-3 mr-1.5 opacity-60',
  },

  // ── Classic (serif, understated)
  classic: {
    wrapper: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-0',
    inner: 'border-t border-slate-100 pt-8',
    label: 'text-xs font-bold uppercase tracking-widest text-slate-500 mb-5',
    tag: 'inline-flex items-center px-4 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:border-slate-900 hover:text-slate-900 transition-all duration-200',
    icon: 'lucide:hash',
    iconClass: 'w-3 h-3 mr-1 opacity-50',
  },

  // ── Street (bold, uppercase, raw neo-brutalist)
  street: {
    wrapper: 'max-w-7xl mx-auto px-4 py-8 mt-0',
    inner: 'border-t-4 border-black pt-8',
    label: 'font-street text-xs uppercase tracking-widest text-gray-700 mb-4',
    tag: 'inline-flex items-center px-4 py-1.5 text-xs font-black uppercase tracking-wide bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-colors font-mono',
    icon: 'lucide:hash',
    iconClass: 'w-3 h-3 mr-1',
  },

  // ── Cozy (warm, soft rounded)
  cozy: {
    wrapper: 'max-w-6xl mx-auto px-4 py-8 mt-0',
    inner: 'border-t border-slate-100 pt-6',
    label: 'font-cozy text-sm text-slate-500 font-medium mb-4',
    tag: 'inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors shadow-sm border border-brand-100',
    icon: 'lucide:tag',
    iconClass: 'w-3.5 h-3.5 mr-1.5',
  },

  // ── Cyber / Synthwave (neon glow effect)
  cyber: {
    wrapper: 'relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-0 bg-[#0d0515]',
    inner: 'border-t border-pink-500/20 pt-8',
    label: 'font-mono text-xs uppercase tracking-widest text-purple-300/70 mb-5',
    tag: 'inline-flex items-center px-4 py-1.5 text-xs font-bold font-mono border border-pink-500/50 text-pink-400 bg-[#1a0a2e]/80 hover:border-pink-400 hover:text-pink-300 hover:shadow-[0_0_10px_rgba(255,45,149,0.4)] transition-all duration-200 backdrop-blur-sm',
    icon: 'lucide:hash',
    iconClass: 'w-3 h-3 mr-1',
  },

  // ── Stationnery (papyrus, pen-sketch vibe)
  stationnery: {
    wrapper: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-0 font-stationery',
    inner: 'border-t border-stone-200 pt-8',
    label: 'text-xs font-medium uppercase tracking-widest text-slate-500 mb-4',
    tag: 'inline-flex items-center px-4 py-1.5 rounded-sm text-xs font-medium border border-brand-200 text-brand-700 bg-brand-50/60 hover:bg-brand-50 hover:border-brand-400 transition-colors',
    icon: 'lucide:pen-line',
    iconClass: 'w-3 h-3 mr-1.5 opacity-60',
  },

  // ── Food (organic, farm-fresh)
  food: {
    wrapper: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-0',
    inner: 'border-t-2 border-dashed border-stone-200 pt-8',
    label: 'text-xs font-bold uppercase tracking-widest text-stone-500 mb-4',
    tag: 'inline-flex items-center px-4 py-2 rounded-full text-xs font-bold bg-white text-brand-700 border-2 border-brand-200 hover:bg-brand-50 hover:border-brand-400 transition-all duration-200 shadow-sm',
    icon: 'lucide:leaf',
    iconClass: 'w-3 h-3 mr-1.5 text-brand-500',
  },

  // ── Wellness (nature-inspired, sage greens)
  wellness: {
    wrapper: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-0 font-wellness',
    inner: 'border-t border-stone-100 pt-8',
    label: 'text-xs italic text-stone-400 uppercase tracking-widest mb-5',
    tag: 'inline-flex items-center px-5 py-1.5 rounded-full text-sm font-medium text-brand-800 bg-brand-50/80 border border-brand-100 hover:bg-brand-100/80 hover:border-brand-200 transition-colors',
    icon: 'lucide:sparkles',
    iconClass: 'w-3 h-3 mr-1.5 text-brand-500',
  },

  // ── Playful (bold violet, chunky rounded)
  playful: {
    wrapper: 'px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-10 mt-0',
    inner: 'border-t-4 border-violet-100 pt-8',
    label: 'text-sm font-black text-stone-700 mb-5',
    tag: 'inline-flex items-center px-4 py-2 rounded-2xl text-sm font-black bg-violet-100 text-violet-800 border-3 border-violet-200 hover:bg-violet-200 hover:border-violet-400 transition-all shadow-[2px_2px_0_0_#8b5cf6] hover:shadow-[1px_1px_0_0_#8b5cf6] hover:translate-x-px hover:translate-y-px',
    icon: 'lucide:star',
    iconClass: 'w-3.5 h-3.5 mr-1.5 text-amber-400',
  },

  // ── Activewear (performance, dark athletic)
  activewear: {
    wrapper: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-0',
    inner: 'border-t border-slate-100 pt-8',
    label: 'text-xs font-bold uppercase tracking-widest text-slate-500 mb-4',
    tag: 'inline-flex items-center px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wide bg-brand-600 text-white hover:bg-brand-700 transition-colors',
    icon: 'lucide:zap',
    iconClass: 'w-3 h-3 mr-1.5',
  },

  // ── Chrono (dark luxury watch aesthetic)
  chrono: {
    wrapper: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-0',
    inner: 'border-t pt-8',
    label: 'text-[10px] font-medium uppercase tracking-[0.25em] mb-5',
    tag: 'inline-flex items-center px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] border transition-all duration-200',
    icon: 'lucide:hash',
    iconClass: 'w-2.5 h-2.5 mr-1.5',
  },

  // ── Maison (luxury haute-couture dark)
  maison: {
    wrapper: 'max-w-[1400px] mx-auto px-[clamp(20px,5vw,80px)] py-10 mt-0',
    inner: 'border-t pt-8',
    label: 'font-mono text-[9px] uppercase font-light tracking-widest mb-5',
    tag: 'inline-flex items-center px-4 py-1.5 text-[10px] font-light uppercase tracking-wider border transition-all duration-200',
    icon: 'lucide:hash',
    iconClass: 'w-2.5 h-2.5 mr-1.5',
  },

  // ── Arena (esports HUD, dark + brand neon)
  arena: {
    wrapper: 'max-w-[1400px] mx-auto px-5 lg:px-10 py-8 mt-0',
    inner: 'border-t border-white/[0.06] pt-8',
    label: 'text-[10px] font-black uppercase tracking-[0.32em] text-brand-500 mb-5',
    tag: 'inline-flex items-center px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] border border-white/[0.06] bg-[#0b0f14] text-slate-300 hover:border-brand-500/50 hover:text-brand-400 transition-colors',
    icon: 'lucide:zap',
    iconClass: 'w-3 h-3 mr-1 text-brand-500',
  },
}

// Special inline-style overrides for dark-mode templates (Chrono, Maison)
const theme = computed<TagTheme>(() => themeMap[props.templateKey] ?? themeMap.modern)
const isChronoTheme = computed(() => props.templateKey === 'chrono')
const isMaisonTheme = computed(() => props.templateKey === 'maison')

// Inline styles for dark templates that use CSS vars / non-Tailwind colors
const wrapperInlineStyle = computed(() => {
  if (isChronoTheme.value) return 'background-color:#0E1117; font-family:\'Cormorant Garamond\',serif;'
  if (isMaisonTheme.value) return ''
  return ''
})

const innerInlineStyle = computed(() => {
  if (isChronoTheme.value) return 'border-color:rgba(212,197,169,0.08);'
  if (isMaisonTheme.value) return 'border-color:var(--at-border);'
  return ''
})

const labelInlineStyle = computed(() => {
  if (isChronoTheme.value) return 'color:#A67C52;'
  if (isMaisonTheme.value) return 'color:var(--at-muted); font-family:var(--at-f-mono);'
  return ''
})

const tagInlineStyle = computed(() => {
  if (isChronoTheme.value)
    return 'background-color:#1A1F2E; border-color:rgba(212,197,169,0.2); color:#A67C52;'
  if (isMaisonTheme.value)
    return 'background-color:var(--at-surface); border-color:var(--at-border); color:var(--at-sub); font-family:var(--at-f-mono);'
  return ''
})
</script>

<template>
  <div :class="theme.wrapper" :style="wrapperInlineStyle">
    <div :class="theme.inner" :style="innerInlineStyle">
      <!-- Section label -->
      <p :class="theme.label" :style="labelInlineStyle">
        <Icon
          v-if="theme.icon"
          :name="theme.icon"
          :class="theme.iconClass"
          class="inline"
        />
        {{ t('storefront.search.keywords') || 'Related Keywords' }}
      </p>

      <!-- Tags cloud -->
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          v-for="keyword in parsedKeywords"
          :key="keyword"
          :to="`/products?q=${encodeURIComponent(keyword)}`"
          :class="theme.tag"
          :style="tagInlineStyle"
        >
          <Icon
            v-if="theme.icon"
            :name="theme.icon"
            :class="theme.iconClass"
            class="flex-shrink-0"
          />
          {{ keyword }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
