<template>
  <div
    v-if="model.primary || model.secondary.length"
    class="flex items-stretch gap-2"
    :class="fullWidth ? 'w-full' : ''"
  >
    <component
      :is="primaryTag"
      v-if="model.primary"
      :to="primaryTo"
      :href="primaryHref"
      type="button"
      :disabled="model.primary.disabled || busy"
      :class="[primaryClasses, fullWidth ? 'flex-1' : '', model.pulse && !model.primary.disabled ? 'nba-pulse' : '']"
      :title="model.primary.hint || ''"
      @click="onPrimary"
    >
      <span
        v-if="busy"
        class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current"
      />
      <Icon
        v-else
        :name="model.primary.icon"
        class="w-4 h-4"
      />
      <span>{{ model.primary.label }}</span>
    </component>

    <Menu
      v-if="model.secondary.length"
      as="div"
      class="relative"
    >
      <MenuButton
        type="button"
        class="ui-btn ui-btn--secondary ui-btn--md"
        :class="model.primary ? '' : (fullWidth ? 'w-full' : '')"
        :aria-label="t('common.moreActions', 'More actions')"
      >
        <Icon
          name="lucide:more-horizontal"
          class="w-4 h-4"
        />
        <span v-if="!model.primary">{{ t('common.actions', 'Actions') }}</span>
      </MenuButton>
      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <MenuItems
          :class="['absolute right-0 w-60 rounded-xl shadow-lg ring-1 focus:outline-none z-30 overflow-hidden', menuDirection]"
          style="background: var(--surface-1); border: 1px solid var(--surface-border); --tw-ring-color: var(--surface-border)"
        >
          <div
            v-if="model.lockedNote"
            class="px-3 py-2 text-xs"
            style="color: var(--text-tertiary); background: var(--surface-2); border-bottom: 1px solid var(--surface-border)"
          >
            <Icon
              name="lucide:lock"
              class="w-3 h-3 inline-block mr-1 -mt-0.5"
            />
            {{ model.lockedNote }}
          </div>
          <div class="py-1">
            <MenuItem
              v-for="action in model.secondary"
              :key="action.id"
              v-slot="{ active, disabled }"
              :disabled="action.disabled"
            >
              <component
                :is="action.href && !action.href.startsWith('tel:') && !action.href.startsWith('http') ? 'NuxtLink' : (action.href ? 'a' : 'button')"
                :to="action.href && !action.href.startsWith('tel:') && !action.href.startsWith('http') ? action.href : undefined"
                :href="action.href && (action.href.startsWith('tel:') || action.href.startsWith('http')) ? action.href : undefined"
                :type="!action.href ? 'button' : undefined"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
                :class="[
                  active ? 'bg-[var(--surface-2)]' : '',
                  disabled ? 'opacity-50 cursor-not-allowed' : '',
                  action.tone === 'danger' ? 'text-red-600' : ''
                ]"
                :style="action.tone === 'danger' ? '' : 'color: var(--text-primary)'"
                @click="onSecondary(action, $event)"
              >
                <Icon
                  :name="action.icon"
                  class="w-4 h-4"
                  :class="action.tone === 'danger' ? 'text-red-500' : ''"
                />
                <span>{{ action.label }}</span>
              </component>
            </MenuItem>
          </div>
        </MenuItems>
      </transition>
    </Menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import type { NBAModel, NBAAction } from '~/composables/admin/useOrderNBA'

const props = defineProps<{
  model: NBAModel
  busy?: boolean
  fullWidth?: boolean
  /** When in a bottom-fixed bar, open the menu upward */
  menuUp?: boolean
}>()

const menuDirection = computed(() =>
  props.menuUp ? 'bottom-full mb-2 origin-bottom-right' : 'mt-2 origin-top-right'
)

const emit = defineEmits<{
  (e: 'action', action: NBAAction): void
}>()

const { t } = useI18n({ useScope: 'global' })

const primaryClasses = computed(() => {
  const tone = props.model.primary?.tone || 'primary'
  const map: Record<string, string> = {
    primary: 'ui-btn ui-btn--primary ui-btn--md',
    success: 'ui-btn ui-btn--success ui-btn--md',
    secondary: 'ui-btn ui-btn--secondary ui-btn--md',
    danger: 'ui-btn ui-btn--danger ui-btn--md',
    ghost: 'ui-btn ui-btn--ghost ui-btn--md'
  }
  return map[tone] || map.primary
})

const primaryHref = computed(() => {
  const href = props.model.primary?.href
  if (!href) return undefined
  if (href.startsWith('tel:') || href.startsWith('http')) return href
  return undefined
})

const primaryTo = computed(() => {
  const href = props.model.primary?.href
  if (!href) return undefined
  if (href.startsWith('tel:') || href.startsWith('http')) return undefined
  return href
})

const primaryTag = computed(() => {
  if (primaryTo.value) return 'NuxtLink'
  if (primaryHref.value) return 'a'
  return 'button'
})

function onPrimary(ev: Event) {
  if (!props.model.primary) return
  if (props.model.primary.href) {
    // Native navigation handles tel: and external links
    return
  }
  ev.preventDefault()
  emit('action', props.model.primary)
}

function onSecondary(action: NBAAction, ev: Event) {
  if (action.href) return
  ev.preventDefault()
  emit('action', action)
}
</script>

<style scoped>
@keyframes nba-pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(var(--brand-rgb, 99 102 241) / 0.5); }
  70% { box-shadow: 0 0 0 8px rgba(var(--brand-rgb, 99 102 241) / 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--brand-rgb, 99 102 241) / 0); }
}
.nba-pulse {
  animation: nba-pulse-ring 1.8s ease-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .nba-pulse { animation: none; }
}
</style>
