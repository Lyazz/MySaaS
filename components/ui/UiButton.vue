<template>
  <component
    :is="tag"
    v-bind="linkProps"
    :class="classes"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
    :type="tag === 'button' ? type : undefined"
  >
    <Icon v-if="loading" name="lucide:loader-circle" class="h-4 w-4 animate-spin" />
    <Icon v-else-if="icon" :name="icon" class="h-4 w-4 shrink-0" />
    <slot />
    <Icon v-if="trailingIcon && !loading" :name="trailingIcon" class="h-4 w-4 shrink-0" />
  </component>
</template>

<script setup lang="ts">
/**
 * The one button. Every variant, size and state resolves to the `.ui-btn*`
 * classes in `assets/css/main.css`, so a button here and a button three
 * screens away are the same object.
 *
 * Renders a `<button>`, or a `<NuxtLink>` when `to` is set, or an `<a>` when
 * `href` is — an action that navigates should still be a link.
 */
import { computed, resolveComponent } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  /** Iconify name rendered before the label, e.g. `lucide:plus`. */
  icon?: string
  /** Iconify name rendered after the label. */
  trailingIcon?: string
  loading?: boolean
  disabled?: boolean
  block?: boolean
  type?: 'button' | 'submit' | 'reset'
  to?: string | Record<string, unknown>
  href?: string
}>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button'
})

const NuxtLinkComponent = resolveComponent('NuxtLink')

const tag = computed(() => {
  if (props.to) return NuxtLinkComponent
  if (props.href) return 'a'
  return 'button'
})

// A link cannot be `disabled`, so a disabled link drops its target instead.
const isDisabled = computed(() => (props.disabled || props.loading) && tag.value === 'button' ? true : undefined)

const linkProps = computed(() => {
  if (props.to) return { to: props.disabled ? undefined : props.to }
  if (props.href) return { href: props.disabled ? undefined : props.href }
  return {}
})

const classes = computed(() => [
  'ui-btn',
  `ui-btn--${props.variant}`,
  props.size === 'sm' ? 'ui-btn--sm' : props.size === 'lg' ? 'ui-btn--lg' : 'ui-btn--md',
  props.block ? 'w-full' : '',
  props.disabled && tag.value !== 'button' ? 'pointer-events-none opacity-40' : ''
])
</script>
