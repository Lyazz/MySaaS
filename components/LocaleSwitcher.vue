<script setup lang="ts">
import { computed } from 'vue'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'

const props = withDefaults(
  defineProps<{
    class?: string
    showLabels?: boolean
  }>(),
  {
    showLabels: false
  }
)

const i18n = useI18n({ useScope: 'global' })

const locales = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'ar', label: 'العربية', short: 'AR' }
]

const currentLocale = computed(() => {
  return locales.find(l => l.code === i18n.locale.value) || locales[0]
})

const switchLocale = async (code: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const composer = i18n as any
  if (typeof composer.setLocale === 'function') {
    await composer.setLocale(code)
  } else if (composer.locale && typeof composer.locale === 'object' && 'value' in composer.locale) {
    composer.locale.value = code
  }

  if (process.client) {
    document.cookie = `i18n_redirected=${code}; Path=/; SameSite=Lax`
  }
}
</script>

<template>
  <Menu as="div" class="relative inline-block text-left" data-testid="locale-switcher">
    <div>
      <MenuButton
        class="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-150"
        :class="props.class"
        style="color: var(--text-secondary); border: 1px solid var(--surface-border); background: transparent"
        @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }"
        @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }"
      >
        <Icon name="lucide:languages" class="h-3.5 w-3.5 sm:h-3 sm:w-3 opacity-70" aria-hidden="true" />
        <span v-if="showLabels" class="hidden sm:inline-block">{{ currentLocale.label }}</span>
        <span v-if="showLabels" class="inline-block sm:hidden">{{ currentLocale.short }}</span>
        <span v-else class="hidden sm:inline">{{ currentLocale.short }}</span>
        <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50 hidden sm:block" aria-hidden="true" />
      </MenuButton>
    </div>

    <transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="transform opacity-0 scale-95 translate-y-[-4px]"
      enter-to-class="transform opacity-100 scale-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="transform opacity-100 scale-100 translate-y-0"
      leave-to-class="transform opacity-0 scale-95 translate-y-[-4px]"
    >
      <MenuItems
        class="absolute right-0 z-50 mt-2 w-40 origin-top-right overflow-hidden rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-200/50 ring-1 ring-black/5 focus:outline-none"
      >
        <div class="p-1.5">
          <MenuItem
            v-for="locale in locales"
            :key="locale.code"
            v-slot="{ active }"
          >
            <button
              type="button"
              :class="[
                active ? 'bg-slate-100/80 text-teal-700' : 'text-slate-600',
                i18n.locale.value === locale.code ? 'font-semibold bg-teal-50/50 text-teal-700' : '',
                'group flex w-full items-center rounded-md px-3 py-2 text-sm text-left transition-all duration-150'
              ]"
              @click="switchLocale(locale.code)"
            >
              <span class="flex-1">{{ locale.label }}</span>
              <Icon 
                v-if="i18n.locale.value === locale.code"
                name="lucide:check" 
                class="ml-2 h-4 w-4 text-teal-600" 
              />
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>
