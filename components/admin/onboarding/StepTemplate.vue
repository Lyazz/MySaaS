<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-primary">
      {{ t('admin.pages.onboarding.template.title') }}
    </h3>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div
        v-for="tpl in templates"
        :key="tpl.key"
        class="group relative rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col overflow-hidden"
        :class="modelValue.templateKey === tpl.key ? '[border-color:var(--brand)] ring-4 [--tw-ring-color:var(--brand)]/20 shadow-md' : ''"
        :style="modelValue.templateKey !== tpl.key ? 'background: var(--surface-2); border-color: var(--surface-border)' : 'background: var(--surface-2)'"
        @click="emit('update:modelValue', { ...modelValue, templateKey: tpl.key })"
      >
        <div
          class="relative w-full border-b overflow-hidden flex flex-col"
          style="height: 200px;"
          :style="{ background: tpl.bg, borderColor: tpl.border }"
        >
          <div class="h-1 w-full shrink-0" :style="{ background: tpl.color }"></div>
          <div class="flex-1 flex items-center justify-center p-4">
            <div
              class="w-full max-w-[140px] overflow-hidden shadow-sm"
              :style="{ background: tpl.cardBg, borderRadius: tpl.radius, border: `1px solid ${tpl.border}` }"
            >
              <div class="w-full flex items-center justify-center text-3xl" style="height: 80px;" :style="{ background: tpl.imgBg }">
                {{ tpl.emoji }}
              </div>
              <div class="px-2.5 py-2" :style="{ fontFamily: tpl.fontStyle }">
                <p class="text-mini font-semibold leading-tight truncate" :style="{ color: tpl.textColor }">{{ tpl.sampleDesc }}</p>
                <p class="text-mini mt-0.5 font-bold" :style="{ color: tpl.color }">{{ tpl.samplePrice }}</p>
                <div class="mt-2 w-full text-center text-micro font-bold py-1 leading-none" :style="{ background: tpl.color, color: tpl.btnText, borderRadius: tpl.radius }">BUY</div>
              </div>
            </div>
          </div>
          <div class="absolute inset-0 z-10 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-end p-3">
            <NuxtLink
 :to="`/admin/preview?template=${tpl.key}`"
 target="_blank"
 class="pointer-events-auto py-2 px-4 backdrop-blur-sm font-medium text-sm rounded-lg shadow flex items-center justify-center gap-2 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300 surface-2 text-primary border border-line"
 
 @click.stop
>
              <Icon name="lucide:external-link" class="w-4 h-4" />
              Prévisualiser
            </NuxtLink>
          </div>
        </div>
        <div class="p-3 flex flex-col gap-2 surface-3 border-t border-line">
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm text-primary" :class="tpl.fontClass">{{ tpl.label }}</span>
            <div v-if="modelValue.templateKey === tpl.key" class="[color:rgba(var(--brand-rgb)/0.85)]">
              <Icon name="lucide:check-circle-2" class="w-5 h-5" />
            </div>
          </div>
          <div class="flex flex-col gap-0.5">
            <p class="text-mini font-medium leading-snug text-secondary">{{ tpl.storeTypes }}</p>
            <p class="text-mini leading-snug text-tertiary">{{ tpl.description }}</p>
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-medium border" :style="{ borderColor: tpl.color + '40', background: tpl.color + '12', color: tpl.color }">
              <span class="w-2 h-2 rounded-full inline-block" :style="{ background: tpl.color }"></span>
              {{ tpl.color.toUpperCase() }}
            </span>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-medium surface-1 border border-line text-tertiary">
              <Icon name="lucide:type" class="w-2.5 h-2.5" />
              {{ tpl.fontName }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface OnboardingForm {
  name: string; logoUrl: string | null; description: string
  templateKey: string; primaryColor: string; language: string
  product: { name: string; price: number | null; imageUrl: string | null }
}

const props = defineProps<{ modelValue: OnboardingForm }>()
const emit = defineEmits<{ 'update:modelValue': [value: OnboardingForm] }>()
const { t } = useI18n({ useScope: 'global' })

/*
 * Each card draws its own specimen with an inline font-family, but four of
 * these faces (Teko, Cormorant, Marcellus, Bodoni Moda) only ship inside the
 * storefront themes that use them. Without this the specimens fall back to a
 * system serif and misrepresent the theme the merchant is picking.
 */
useHead({
  link: [{
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500&family=Cormorant+Garamond:wght@400;500;600&family=Marcellus&family=Teko:wght@400;500;600&display=swap'
  }]
})

const templates = computed(() => [
  { key: 'classic', label: 'Classic', description: t('admin.appearanceSettingsForm.templates.options.classic.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.classic.storeTypes'), fontClass: 'font-serif', fontName: 'Alice', fontStyle: "'Alice', serif", color: '#0f172a', bg: '#f8fafc', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#e2e8f0,#cbd5e1)', border: '#e2e8f0', textColor: '#0f172a', btnText: '#ffffff', radius: '4px', emoji: '🖼️', sampleDesc: 'Élégant & intemporel', samplePrice: '189 DA' },
  { key: 'modern', label: 'Modern', description: t('admin.appearanceSettingsForm.templates.options.modern.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.modern.storeTypes'), fontClass: 'font-sans', fontName: 'Outfit', fontStyle: "'Outfit', ui-sans-serif, system-ui, sans-serif", color: '#0D9488', bg: '#f8fafc', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#CCFBF1,#99F6E4)', border: '#e2e8f0', textColor: '#475569', btnText: '#ffffff', radius: '8px', emoji: '🛍️', sampleDesc: 'Minimaliste & moderne', samplePrice: '129 DA' },
  { key: 'street', label: 'Street', description: t('admin.appearanceSettingsForm.templates.options.street.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.street.storeTypes'), fontClass: 'font-street', fontName: 'Anton', fontStyle: "'Anton', sans-serif", color: '#FACC15', bg: '#ffffff', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#fef9c3,#fde68a)', border: '#FACC15', textColor: '#000000', btnText: '#000000', radius: '0px', emoji: '👟', sampleDesc: 'Limited drop', samplePrice: '99 DA' },
  { key: 'cozy', label: 'Cozy', description: t('admin.appearanceSettingsForm.templates.options.cozy.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.cozy.storeTypes'), fontClass: 'font-cozy', fontName: 'Nunito', fontStyle: "'Nunito', sans-serif", color: '#A4C3B2', bg: '#F5F2EA', cardBg: '#F5F2EA', imgBg: 'linear-gradient(135deg,#d1fae5,#bbf7d0)', border: '#e8f0eb', textColor: '#475569', btnText: '#ffffff', radius: '16px', emoji: '🕯️', sampleDesc: 'Doux & chaleureux', samplePrice: '24 DA' },
  { key: 'cyber', label: 'Cyber', description: t('admin.appearanceSettingsForm.templates.options.cyber.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.cyber.storeTypes'), fontClass: 'font-cyber', fontName: 'Orbitron', fontStyle: "'Orbitron', sans-serif", color: '#F43F5E', bg: '#0d0515', cardBg: '#1a0a2e', imgBg: 'linear-gradient(135deg,#2d1b5e,#1a0a2e)', border: '#F43F5E', textColor: '#e9d5ff', btnText: '#ffffff', radius: '4px', emoji: '🤖', sampleDesc: 'Next-gen tech', samplePrice: '499 DA' },
  { key: 'stationnery', label: 'Stationery', description: t('admin.appearanceSettingsForm.templates.options.stationnery.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.stationnery.storeTypes'), fontClass: 'font-stationery', fontName: 'Merriweather', fontStyle: "'Merriweather', serif", color: '#334155', bg: '#fdfbf7', cardBg: '#fdfbf7', imgBg: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', border: '#cbd5e1', textColor: '#1e293b', btnText: '#fdfbf7', radius: '2px', emoji: '📓', sampleDesc: 'Élégance papeterie', samplePrice: '18 DA' },
  { key: 'food', label: 'Food', description: t('admin.appearanceSettingsForm.templates.options.food.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.food.storeTypes'), fontClass: 'font-food', fontName: 'Nunito', fontStyle: "'Nunito', sans-serif", color: '#ea580c', bg: '#f5f5f4', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#ffedd5,#fed7aa)', border: '#e7e5e4', textColor: '#292524', btnText: '#ffffff', radius: '12px', emoji: '🍕', sampleDesc: 'Saveurs artisanales', samplePrice: '14 DA' },
  { key: 'wellness', label: 'Wellness', description: t('admin.appearanceSettingsForm.templates.options.wellness.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.wellness.storeTypes'), fontClass: 'font-wellnessDisplay', fontName: 'Fraunces', fontStyle: "'Fraunces', 'Solway', ui-serif, Georgia, serif", color: '#84CC16', bg: '#F1F2EC', cardBg: '#FCFCF9', imgBg: 'linear-gradient(135deg,#E3E4DA,#D4D5CB)', border: '#D4D5CB', textColor: '#1B1A16', btnText: '#F1F2EC', radius: '0px', emoji: '🌿', sampleDesc: 'Bio & naturel', samplePrice: '22 DA' },
  { key: 'playful', label: 'Playful', description: t('admin.appearanceSettingsForm.templates.options.playful.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.playful.storeTypes'), fontClass: 'font-playful', fontName: 'Baloo 2', fontStyle: "'Baloo 2', 'Nunito', sans-serif", color: '#ED5A96', bg: '#FFF6FA', cardBg: '#ffffff', imgBg: 'linear-gradient(135deg,#FFE3EE,#EFE7FE)', border: '#F7D8E7', textColor: '#4A2E4D', btnText: '#ffffff', radius: '30px', emoji: '🍬', sampleDesc: 'Candy Kawaii', samplePrice: '15 DA' },
  { key: 'activewear', label: 'Activewear', description: t('admin.appearanceSettingsForm.templates.options.activewear.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.activewear.storeTypes'), fontClass: 'font-activewear', fontName: 'Teko', fontStyle: "'Teko', sans-serif", color: '#EAB308', bg: '#000000', cardBg: '#111111', imgBg: 'linear-gradient(135deg,#1f2937,#000000)', border: '#333333', textColor: '#d1d5db', btnText: '#000000', radius: '0px', emoji: '⚡', sampleDesc: 'High Performance', samplePrice: '89 DA' },
  { key: 'chrono', label: 'Chrono Luxe', description: t('admin.appearanceSettingsForm.templates.options.chrono.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.chrono.storeTypes'), fontClass: 'font-serif', fontName: 'Cormorant Garamond', fontStyle: "'Cormorant Garamond', serif", color: '#A67C52', bg: '#0E1117', cardBg: '#131720', imgBg: 'linear-gradient(135deg,#1A1F2E,#0B0E16)', border: 'rgba(212,197,169,0.18)', textColor: '#E8E0D5', btnText: '#ffffff', radius: '2px', emoji: '⌚', sampleDesc: 'Luxury Accessories', samplePrice: '3 500 DA' },
  { key: 'arena', label: 'Arena', description: t('admin.appearanceSettingsForm.templates.options.arena.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.arena.storeTypes'), fontClass: 'font-sans', fontName: 'Outfit', fontStyle: "'Outfit', ui-sans-serif, system-ui, sans-serif", color: '#00B8FC', bg: '#030508', cardBg: '#0B0F14', imgBg: 'linear-gradient(135deg,#111820,#030508)', border: '#133246', textColor: '#E2E8F0', btnText: '#02060A', radius: '6px', emoji: '🎮', sampleDesc: 'Esports Performance', samplePrice: '399 DA' },
  { key: 'maison', label: 'Pistachio', description: t('admin.appearanceSettingsForm.templates.options.maison.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.maison.storeTypes'), fontClass: 'font-serif', fontName: 'Fraunces', fontStyle: "'Fraunces', serif", color: '#0B4A25', bg: '#FAF2E3', cardBg: '#FFFBF0', imgBg: 'linear-gradient(135deg,#F9EBCE,#EEDCB3)', border: '#E7CE9C', textColor: '#1C2318', btnText: '#FFFBF0', radius: '28px', emoji: '🌰', sampleDesc: 'Pistachio Luxe', samplePrice: '250 DA' },
  { key: 'nour', label: 'Nour Élégance', description: t('admin.appearanceSettingsForm.templates.options.nour.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.nour.storeTypes'), fontClass: 'font-serif', fontName: 'Marcellus', fontStyle: "'Marcellus', serif", color: '#7A3B46', bg: '#FAF3EA', cardBg: '#FFFDF9', imgBg: 'linear-gradient(135deg,#F3E7D8,#E4C58F)', border: '#E4C58F', textColor: '#2E1E20', btnText: '#FFFDF9', radius: '20px', emoji: '🧕', sampleDesc: 'Élégance drapée', samplePrice: '4 500 DA' },
  { key: 'embellir', label: 'Embellir', description: t('admin.appearanceSettingsForm.templates.options.embellir.description'), storeTypes: t('admin.appearanceSettingsForm.templates.options.embellir.storeTypes'), fontClass: 'font-serif', fontName: 'Bodoni Moda', fontStyle: "'Bodoni Moda', Didot, serif", color: '#0E3F3A', bg: '#F2ECE1', cardBg: '#FDFAF4', imgBg: 'linear-gradient(135deg,#E4DACB,#CBBDAB)', border: '#CBBDAB', textColor: '#16211E', btnText: '#FDFAF4', radius: '2px', emoji: '🧴', sampleDesc: 'Beauté & bien-être', samplePrice: '2 400 DA' },
])
</script>
